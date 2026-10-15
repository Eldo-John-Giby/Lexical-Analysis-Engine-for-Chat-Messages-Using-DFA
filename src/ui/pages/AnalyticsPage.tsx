import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../state/store';
import { profileTokens } from '../../engine/analysis/profile';
import { PRESETS } from '../../data/presets';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  Smile,
  AlertTriangle,
  Clock,
  Download,
  FileText,
  Zap,
} from 'lucide-react';

const KIND_COLORS: Record<string, string> = {
  TEXT: '#94A3B8',
  ENTITY: '#60A5FA',
  EMOTIVE: '#FBBF24',
  NUMERIC: '#34D399',
  FORMAT: '#E879F9',
  PUNCT: '#64748B',
  SPACE: '#334155',
  ERROR: '#EF4444',
};

export const AnalyticsPage: React.FC = () => {
  const { engine, playgroundText, lexResult } = useAppStore();
  const [dataSource, setDataSource] = useState<'playground' | 'preset-all' | 'phishing'>('playground');

  const { activeTokens, lexTimeMs } = useMemo(() => {
    if (dataSource === 'playground') {
      const t0 = performance.now();
      const res = engine.lex(playgroundText);
      const t1 = performance.now();
      return { activeTokens: res.tokens, lexTimeMs: Math.round((t1 - t0) * 100) / 100 };
    }
    if (dataSource === 'phishing') {
      const phishing = PRESETS.find((p) => p.id === 'phishing')!;
      const t0 = performance.now();
      const res = engine.lex(phishing.text);
      const t1 = performance.now();
      return { activeTokens: res.tokens, lexTimeMs: Math.round((t1 - t0) * 100) / 100 };
    }
    // Preset all combined
    const combined = PRESETS.map((p) => p.text).join('\n\n');
    const t0 = performance.now();
    const res = engine.lex(combined);
    const t1 = performance.now();
    return { activeTokens: res.tokens, lexTimeMs: Math.round((t1 - t0) * 100) / 100 };
  }, [dataSource, playgroundText, engine]);

  const profile = useMemo(() => profileTokens(activeTokens), [activeTokens]);

  const pieData = useMemo(() => {
    return Object.entries(profile.kindCounts)
      .filter(([_, count]) => count > 0)
      .map(([kind, count]) => ({
        name: kind,
        value: count,
        color: KIND_COLORS[kind] || '#94A3B8',
      }));
  }, [profile]);

  const typeBarData = useMemo(() => {
    return Object.entries(profile.typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [profile]);

  const exportMarkdownReport = () => {
    const report = `# LexiChat DFA Analytics Report
Generated on: ${new Date().toISOString()}

## Summary Statistics
- Total Tokens: ${profile.totalTokens}
- Unique Lexemes: ${profile.uniqueTokens}
- Lexical Errors: ${profile.errorCount}
- Average Token Length: ${profile.avgTokenLength.toFixed(1)} characters
- Processing Time: ${lexTimeMs} ms
- Emoji Count: ${profile.emojiCount}
- Slang Occurrences: ${profile.slangCount}
- Elongated Words: ${profile.elongatedCount}
- Urgency Caps: ${profile.allCapsCount}

## Token Kinds Breakdown
${Object.entries(profile.kindCounts)
  .map(([kind, count]) => `- ${kind}: ${count}`)
  .join('\n')}

## Top Lexemes
${profile.topLexemes.map((l) => `- "${l.lexeme}" (${l.type}): ${l.count} occurrences`).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexichat-analytics-${Date.now()}.md`;
    a.click();
  };

  return (
    <div className="p-4 max-w-[1600px] mx-auto flex flex-col space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl shadow-lg">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-[#7C5CFF]" />
          <span className="text-xs font-semibold text-[#E6EAF5]">Data Source:</span>
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value as any)}
            className="bg-[#141C33] border border-[#1F2A4A] text-xs text-[#E6EAF5] rounded-lg px-3 py-1.5 outline-none focus:border-[#7C5CFF]"
          >
            <option value="playground">Playground Editor Buffer</option>
            <option value="preset-all">Combined Preset Corpus (All 8 Presets)</option>
            <option value="phishing">Phishing Attempt Corpus</option>
          </select>
        </div>

        <button
          onClick={exportMarkdownReport}
          className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#7C5CFF] hover:bg-[#6846FF] text-white font-medium shadow transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Markdown Report</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3.5 rounded-xl">
          <div className="text-[11px] text-[#8A94B2]">Total Tokens</div>
          <div className="text-xl font-bold text-[#E6EAF5] mt-1">{profile.totalTokens}</div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3.5 rounded-xl">
          <div className="text-[11px] text-[#8A94B2]">Unique Lexemes</div>
          <div className="text-xl font-bold text-[#22D3EE] mt-1">{profile.uniqueTokens}</div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3.5 rounded-xl">
          <div className="text-[11px] text-[#8A94B2]">Lexing Duration</div>
          <div className="text-xl font-bold text-[#34D399] mt-1">{lexTimeMs} ms</div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3.5 rounded-xl">
          <div className="text-[11px] text-[#8A94B2]">Emoji Density</div>
          <div className="text-xl font-bold text-[#FBBF24] mt-1">{profile.emojiCount}</div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3.5 rounded-xl">
          <div className="text-[11px] text-[#8A94B2]">Slang & Elongation</div>
          <div className="text-xl font-bold text-[#A78BFA] mt-1">
            {profile.slangCount + profile.elongatedCount}
          </div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3.5 rounded-xl">
          <div className="text-[11px] text-[#8A94B2]">Lexical Errors</div>
          <div className="text-xl font-bold text-[#EF4444] mt-1">{profile.errorCount}</div>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Token Kind Donut Chart */}
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-4 rounded-xl shadow-lg flex flex-col h-[340px]">
          <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-[#1F2A4A]">
            <PieIcon className="w-4 h-4 text-[#7C5CFF]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E6EAF5]">
              Token Kind Distribution
            </h3>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141C33',
                    borderColor: '#1F2A4A',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Token Types Bar Chart */}
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-4 rounded-xl shadow-lg flex flex-col h-[340px]">
          <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-[#1F2A4A]">
            <BarChart3 className="w-4 h-4 text-[#22D3EE]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E6EAF5]">
              Top Token Types Frequency
            </h3>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeBarData}>
                <XAxis dataKey="type" stroke="#8A94B2" fontSize={10} />
                <YAxis stroke="#8A94B2" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141C33',
                    borderColor: '#1F2A4A',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#7C5CFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
