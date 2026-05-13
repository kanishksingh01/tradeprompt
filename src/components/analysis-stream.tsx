'use client';

import { useCompletion } from '@ai-sdk/react';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, AlertCircle } from 'lucide-react';

interface AnalysisStreamProps {
  ticker: string;
}

export function AnalysisStream({ ticker }: AnalysisStreamProps) {
  const { completion, complete, isLoading, error } = useCompletion({
    api: `/api/analyze/${ticker}`,
    streamProtocol: 'text',
  });

  useEffect(() => {
    complete('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const sections = parseAnalysis(completion);

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-emerald-400" />
          AI Trading Brief
          {isLoading ? (
            <span className="ml-2 text-xs text-zinc-500 font-normal animate-pulse">Analyzing…</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.message || 'Analysis failed — check your API keys'}
          </div>
        ) : isLoading && !completion ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 bg-zinc-800" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        ) : sections.length > 0 ? (
          sections.map((s, i) => <Section key={i} title={s.title} body={s.body} />)
        ) : completion ? (
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">{completion}</pre>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 75 ? 'text-emerald-400 border-emerald-700 bg-emerald-950/40' :
    score >= 55 ? 'text-blue-400 border-blue-700 bg-blue-950/40' :
    score >= 35 ? 'text-amber-400 border-amber-700 bg-amber-950/40' :
    'text-red-400 border-red-700 bg-red-950/40';

  const barColor =
    score >= 75 ? 'bg-emerald-500' :
    score >= 55 ? 'bg-blue-500' :
    score >= 35 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${color}`}>
      <div className="w-20 bg-zinc-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      {score}/100 — {label}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  // Split body into paragraphs and detect CONFIDENCE lines
  const paragraphs = body.trim().split(/\n\n+/);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">{title}</h3>
      <div className="space-y-3">
        {paragraphs.map((para, i) => {
          const confMatch = para.match(/CONFIDENCE:\s*(\d+)\/100\s*[—–-]\s*(.+)/i);
          const textPart = para.replace(/CONFIDENCE:.*$/im, '').trim();
          return (
            <div key={i}>
              {textPart ? (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{textPart}</p>
              ) : null}
              {confMatch ? (
                <ConfidenceBadge score={parseInt(confMatch[1])} label={confMatch[2].trim()} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseAnalysis(text: string): { title: string; body: string }[] {
  if (!text) return [];
  const sectionRegex = /\*\*([^*]+)\*\*\n([\s\S]*?)(?=\n\*\*|$)/g;
  const sections: { title: string; body: string }[] = [];
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    sections.push({ title: match[1].trim(), body: match[2].trim() });
  }
  return sections;
}
