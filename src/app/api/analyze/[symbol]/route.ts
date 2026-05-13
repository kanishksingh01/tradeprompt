import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { getQuote, getHistory } from '@/lib/polygon';
import { getOptionsChain } from '@/lib/yahoo-finance';
import { getEarnings, getNewsSentiment } from '@/lib/alpha-vantage';
import { computeTechnicals } from '@/lib/technicals';
import { scoreOptions } from '@/lib/options-screener';
import { computeVolMetrics, generateSyntheticOptions } from '@/lib/vol-analysis';
import type { ScoredOption, Technicals } from '@/types/trading';

export const runtime = 'nodejs';

function buildPrompt(
  ticker: string,
  price: number,
  changePct: number,
  volume: number,
  tech: Technicals,
  options: ScoredOption[],
  isSynthetic: boolean,
  volMetrics: { hv10: number; hv30: number; expectedDailyMove: number; expectedDailyMovePct: number } | null,
  nextEarnings: string | undefined,
  recentEarnings: { fiscalDateEnding: string; reportedEPS?: number; estimatedEPS?: number; surprisePercentage?: number }[],
  news: { title: string; source: string; sentimentScore: number; overallSentiment: string }[],
  avgNewsSentiment: number,
  newsSentimentLabel: string,
): string {
  const rsiLabel = tech.rsi > 70 ? 'overbought' : tech.rsi < 30 ? 'oversold' : 'neutral';

  const optionLines = options.length > 0
    ? options.map((o, i) =>
        `${i + 1}. ${o.type.toUpperCase()} $${o.strike} exp ${o.expiry} (${o.daysToExpiry}d) | Mid: $${o.midPrice} | Cost/contract: $${o.pricePerContract} | Delta: ${o.delta} | IV: ${o.impliedVolatility}%${isSynthetic ? ' (model-estimated from HV)' : ''} | Breakeven: $${o.breakeven}`,
      ).join('\n')
    : 'No options data available.';

  const earningsLines = recentEarnings.slice(0, 4)
    .map((e) =>
      `${e.fiscalDateEnding}: EPS ${e.reportedEPS ?? 'N/A'} vs ${e.estimatedEPS ?? 'N/A'} est${e.surprisePercentage != null ? ` (${e.surprisePercentage > 0 ? '+' : ''}${e.surprisePercentage.toFixed(1)}% surprise)` : ''}`,
    ).join('\n');

  const newsLines = news.slice(0, 6)
    .map((n) => `- [${n.overallSentiment}] ${n.title} (${n.source})`)
    .join('\n');

  const volLine = volMetrics
    ? `- HV10: ${volMetrics.hv10}% | HV30: ${volMetrics.hv30}% | Expected next-day move: ±$${volMetrics.expectedDailyMove} (±${volMetrics.expectedDailyMovePct}%)`
    : '';

  return `You are a professional options trader and technical analyst. The user wants a NEXT-DAY trading brief for ${ticker} — they will buy calls or puts before today's close and trade out tomorrow.

## Market Data
- Price: $${price} (${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}% vs prior close)
- Volume: ${volume.toLocaleString()}
- Trend bias: ${tech.trend.toUpperCase()}
- RSI(14): ${tech.rsi} — ${rsiLabel}
- MACD: ${tech.macdLine} | Signal: ${tech.macdSignal} | Hist: ${tech.macdHist}
- SMA20: $${tech.sma20} | SMA50: $${tech.sma50} | SMA200: $${tech.sma200}
- Support: $${tech.support} | Resistance: $${tech.resistance}
${volLine}
${nextEarnings ? `- Next Earnings (estimated): ${nextEarnings}` : ''}

## Options Picks${isSynthetic ? ' (⚠ Model-estimated — no live options feed; prices derived from historical volatility)' : ' (Live data)'}
${optionLines}

## Recent News Sentiment (avg score: ${avgNewsSentiment > 0 ? '+' : ''}${avgNewsSentiment} — ${newsSentimentLabel})
${newsLines || 'No recent news available.'}

## Earnings History
${earningsLines || 'No earnings data.'}

---

Write exactly these four sections. Be specific and use real numbers from the data above:

**CHART BREAKDOWN**
Current trend, SMA positioning, RSI + MACD signal, key support/resistance for tomorrow. Call out continuation vs reversal setup. 3–4 sentences.

**OPTIONS FLOW & VOLATILITY**
Interpret IV level vs historical vol${isSynthetic ? ' (model-estimated)' : ''}. Is premium cheap or rich for a next-day play given the expected ±$${volMetrics?.expectedDailyMove ?? '?'} move? What does the options positioning suggest about directional bias? 2–3 sentences.

**OPTIONS TRADE RECOMMENDATIONS**
For EACH pick listed above, write one paragraph covering: exact entry (mid or limit price), next-day price target to take profit, max dollar loss per contract, and exit strategy (take profit at open / hold / set limit). End each pick with a confidence score on this exact line:
CONFIDENCE: [0-100]/100 — [one-word label: Very High/High/Moderate/Low/Very Low]
Base confidence on: technical signal strength, news sentiment alignment, earnings proximity risk, and whether IV/vol supports the directional bet.

**EARNINGS CATALYST**
Beat/miss track record, next earnings risk, whether to close before or hold through. 2 sentences.`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const ticker = symbol.toUpperCase();

  try {
    const [quote, history, optionsChain, earningsData, newsData] = await Promise.allSettled([
      getQuote(ticker),
      getHistory(ticker, 250),
      getOptionsChain(ticker),
      getEarnings(ticker),
      getNewsSentiment(ticker),
    ]);

    const q = quote.status === 'fulfilled' ? quote.value : null;
    const bars = history.status === 'fulfilled' ? history.value : [];
    const yfData = optionsChain.status === 'fulfilled'
      ? optionsChain.value
      : { contracts: [], currentPrice: 0, expirationDates: [] };
    const earnings = earningsData.status === 'fulfilled' ? earningsData.value : { recent: [] };
    const news = newsData.status === 'fulfilled' ? newsData.value : { articles: [], avgSentiment: 0, sentimentLabel: 'Neutral' };

    if (!q) {
      return new Response('Ticker not found or API key missing', { status: 404 });
    }

    const tech = bars.length >= 20 ? computeTechnicals(bars) : ({
      rsi: 50, macdLine: 0, macdSignal: 0, macdHist: 0,
      sma20: q.price, sma50: q.price, sma200: q.price,
      trend: 'neutral' as const, support: q.low, resistance: q.high,
    });

    const livePrice = yfData.currentPrice || q.price;
    const liveOptions = scoreOptions(yfData.contracts, livePrice, tech.trend);
    const volMetrics = bars.length >= 20 ? computeVolMetrics(bars, livePrice) : null;
    const isSynthetic = liveOptions.length === 0;

    const topOptions: ScoredOption[] = liveOptions.length > 0
      ? liveOptions
      : volMetrics
        ? generateSyntheticOptions(livePrice, volMetrics, tech.trend).map((s) => ({
            strike: s.strike, expiry: s.expiry, type: s.type,
            bid: s.estimatedMid * 0.95, ask: s.estimatedMid * 1.05,
            midPrice: s.estimatedMid, volume: 0, openInterest: 0,
            impliedVolatility: s.impliedVolatility, delta: s.delta,
            score: 0, pricePerContract: s.pricePerContract,
            breakeven: s.breakeven, breakevenPct: s.breakevenPct,
            daysToExpiry: s.daysToExpiry, isSynthetic: true, rationale: s.rationale,
          }))
        : [];

    const prompt = buildPrompt(
      ticker, q.price, q.changePct, q.volume,
      tech, topOptions, isSynthetic, volMetrics,
      earnings.nextEarnings, earnings.recent,
      news.articles, news.avgSentiment, news.sentimentLabel,
    );

    const result = streamText({
      model: 'anthropic/claude-sonnet-4.6',
      prompt,
      maxOutputTokens: 1500,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[analyze/${ticker}]`, msg);
    return new Response(msg, { status: 500 });
  }
}
