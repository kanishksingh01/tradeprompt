export interface YFContract {
  contractSymbol: string;
  strike: number;
  expiration: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  optionType: 'call' | 'put';
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Module-level crumb cache (lives for the duration of the server process)
let crumbCache: { crumb: string; cookie: string; expiresAt: number } | null = null;

async function getCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && Date.now() < crumbCache.expiresAt) {
    return crumbCache;
  }

  try {
    // Step 1: Obtain session cookie from fc.yahoo.com
    const initRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      redirect: 'follow',
    });

    const rawCookies: string[] =
      typeof initRes.headers.getSetCookie === 'function'
        ? initRes.headers.getSetCookie()
        : [];
    const cookie = rawCookies.map((c) => c.split(';')[0]).join('; ');

    // Step 2: Exchange cookie for a crumb
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    if (!crumbRes.ok) return null;
    const crumb = await crumbRes.text();
    if (!crumb || crumb.startsWith('{')) return null;

    crumbCache = { crumb, cookie, expiresAt: Date.now() + 6 * 3600_000 };
    return crumbCache;
  } catch {
    return null;
  }
}

async function yfFetch(url: string, auth: { crumb: string; cookie: string }): Promise<any> {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}crumb=${encodeURIComponent(auth.crumb)}`, {
    headers: { 'User-Agent': UA, Cookie: auth.cookie, Accept: 'application/json' },
    next: { revalidate: 900 },
  });
  if (!res.ok) return null;
  return res.json();
}

function parseContracts(raw: any[], type: 'call' | 'put'): YFContract[] {
  return raw.map((c) => ({
    contractSymbol: c.contractSymbol ?? '',
    strike: c.strike ?? 0,
    expiration: c.expiration ?? 0,
    lastPrice: c.lastPrice ?? 0,
    bid: c.bid ?? 0,
    ask: c.ask ?? 0,
    volume: c.volume,
    openInterest: c.openInterest,
    impliedVolatility: c.impliedVolatility ?? 0,
    inTheMoney: c.inTheMoney ?? false,
    optionType: type,
  }));
}

async function fetchExpiry(
  ticker: string,
  auth: { crumb: string; cookie: string },
  date?: number,
): Promise<YFContract[]> {
  const base = `https://query2.finance.yahoo.com/v7/finance/options/${ticker}`;
  const url = date ? `${base}?date=${date}` : base;
  const json = await yfFetch(url, auth);
  const opts = json?.optionChain?.result?.[0]?.options?.[0];
  if (!opts) return [];
  return [
    ...parseContracts(opts.calls ?? [], 'call'),
    ...parseContracts(opts.puts ?? [], 'put'),
  ];
}

export async function getOptionsChain(ticker: string): Promise<{
  contracts: YFContract[];
  currentPrice: number;
  expirationDates: number[];
}> {
  const sym = ticker.toUpperCase();
  const empty = { contracts: [], currentPrice: 0, expirationDates: [] };

  const auth = await getCrumb();
  if (!auth) return empty;

  const base = `https://query2.finance.yahoo.com/v7/finance/options/${sym}`;
  const json = await yfFetch(base, auth);
  const result = json?.optionChain?.result?.[0];
  if (!result) return empty;

  const currentPrice: number = result.quote?.regularMarketPrice ?? 0;
  const expirationDates: number[] = result.expirationDates ?? [];

  const firstOpts = result.options?.[0];
  const first: YFContract[] = firstOpts ? [
    ...parseContracts(firstOpts.calls ?? [], 'call'),
    ...parseContracts(firstOpts.puts ?? [], 'put'),
  ] : [];

  // Fetch next 2 expiries in parallel (covers this week + next week for weeklies)
  const extra = await Promise.allSettled(
    expirationDates.slice(1, 3).map((d) => fetchExpiry(sym, auth, d)),
  );
  const extraContracts = extra.flatMap((r) => r.status === 'fulfilled' ? r.value : []);

  return { contracts: [...first, ...extraContracts], currentPrice, expirationDates };
}
