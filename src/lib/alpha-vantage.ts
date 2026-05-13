import type { EarningsRecord } from '@/types/trading';

const BASE = 'https://www.alphavantage.co/query';

async function get(params: Record<string, string>) {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error('ALPHA_VANTAGE_API_KEY not set');
  const qs = new URLSearchParams({ ...params, apikey: key }).toString();
  const res = await fetch(`${BASE}?${qs}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);
  return res.json();
}

export async function getEarnings(ticker: string): Promise<{
  recent: EarningsRecord[];
  nextEarnings?: string;
}> {
  try {
    const data = await get({ function: 'EARNINGS', symbol: ticker.toUpperCase() });
    const quarterly: any[] = data.quarterlyEarnings || [];

    const recent: EarningsRecord[] = quarterly.slice(0, 8).map((q) => ({
      fiscalDateEnding: q.fiscalDateEnding,
      reportedDate: q.reportedDate,
      reportedEPS: parseFloat(q.reportedEPS) || undefined,
      estimatedEPS: parseFloat(q.estimatedEPS) || undefined,
      surprise: parseFloat(q.surprise) || undefined,
      surprisePercentage: parseFloat(q.surprisePercentage) || undefined,
    }));

    // Estimate next earnings ~90 days after most recent reported date
    let nextEarnings: string | undefined;
    if (recent[0]?.reportedDate) {
      const last = new Date(recent[0].reportedDate);
      const next = new Date(last.getTime() + 90 * 86400000);
      if (next > new Date()) {
        nextEarnings = next.toISOString().split('T')[0];
      }
    }

    return { recent, nextEarnings };
  } catch {
    return { recent: [] };
  }
}

export async function getCompanyOverview(ticker: string): Promise<{ name?: string; sector?: string; industry?: string }> {
  try {
    const data = await get({ function: 'OVERVIEW', symbol: ticker.toUpperCase() });
    return {
      name: data.Name,
      sector: data.Sector,
      industry: data.Industry,
    };
  } catch {
    return {};
  }
}

export interface NewsSentiment {
  title: string;
  source: string;
  timePublished: string;
  overallSentiment: 'Bullish' | 'Somewhat-Bullish' | 'Neutral' | 'Somewhat-Bearish' | 'Bearish';
  sentimentScore: number;  // -1 to +1
  relevanceScore: number;  // 0 to 1
}

export async function getNewsSentiment(ticker: string): Promise<{
  articles: NewsSentiment[];
  avgSentiment: number;
  sentimentLabel: string;
}> {
  try {
    const data = await get({
      function: 'NEWS_SENTIMENT',
      tickers: ticker.toUpperCase(),
      limit: '10',
      sort: 'LATEST',
    });

    const feed: any[] = data.feed || [];
    const articles: NewsSentiment[] = feed.slice(0, 8).map((item) => {
      const tickerSentiment = (item.ticker_sentiment || []).find(
        (t: any) => t.ticker === ticker.toUpperCase(),
      );
      const score = parseFloat(tickerSentiment?.ticker_sentiment_score ?? item.overall_sentiment_score ?? '0');
      const relevance = parseFloat(tickerSentiment?.relevance_score ?? '0.5');
      return {
        title: item.title,
        source: item.source,
        timePublished: item.time_published,
        overallSentiment: item.overall_sentiment_label as NewsSentiment['overallSentiment'],
        sentimentScore: Math.round(score * 1000) / 1000,
        relevanceScore: Math.round(relevance * 1000) / 1000,
      };
    });

    const relevant = articles.filter((a) => a.relevanceScore > 0.1);
    const avgSentiment = relevant.length > 0
      ? relevant.reduce((sum, a) => sum + a.sentimentScore * a.relevanceScore, 0) /
        relevant.reduce((sum, a) => sum + a.relevanceScore, 0)
      : 0;

    const sentimentLabel =
      avgSentiment > 0.25 ? 'Bullish' :
      avgSentiment > 0.05 ? 'Somewhat-Bullish' :
      avgSentiment < -0.25 ? 'Bearish' :
      avgSentiment < -0.05 ? 'Somewhat-Bearish' : 'Neutral';

    return { articles, avgSentiment: Math.round(avgSentiment * 1000) / 1000, sentimentLabel };
  } catch {
    return { articles: [], avgSentiment: 0, sentimentLabel: 'Neutral' };
  }
}
