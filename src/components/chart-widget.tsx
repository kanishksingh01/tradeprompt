'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: any;
    tvScriptLoadingPromise?: Promise<void>;
  }
}

export function ChartWidget({ ticker }: { ticker: string }) {
  const containerId = `tv_${ticker}`;
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    function createWidget() {
      if (!document.getElementById(containerId) || !('TradingView' in window)) return;
      if (widgetRef.current) return;
      widgetRef.current = new window.TradingView.widget({
        container_id: containerId,
        symbol: ticker,
        interval: 'D',
        timezone: 'America/New_York',
        theme: 'dark',
        style: '1',
        locale: 'en',
        width: '100%',
        height: 500,
        studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        toolbar_bg: '#09090b',
        backgroundColor: '#09090b',
        gridColor: 'rgba(63,63,70,0.3)',
      });
    }

    if (!window.tvScriptLoadingPromise) {
      window.tvScriptLoadingPromise = new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    window.tvScriptLoadingPromise.then(createWidget);

    return () => { widgetRef.current = null; };
  }, [ticker, containerId]);

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
      <div id={containerId} style={{ height: 500 }} />
    </div>
  );
}
