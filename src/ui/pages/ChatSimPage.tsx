import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../state/store';
import { PRESETS, PresetChat } from '../../data/presets';
import { Token } from '../../engine/types';
import {
  MessageSquare,
  Send,
  Eye,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Activity,
  Flame,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  time: string;
  text: string;
  isUser?: boolean;
  tokens: Token[];
  lexTimeMs: number;
}

export const ChatSimPage: React.FC = () => {
  const { engine } = useAppStore();
  const [activePreset, setActivePreset] = useState<PresetChat>(PRESETS[0]!);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return (PRESETS[0]!.messages || []).map((m, i) => {
      const t0 = performance.now();
      const res = engine.lex(m.text);
      const t1 = performance.now();
      return {
        id: `m_${i}`,
        sender: m.sender,
        time: m.time,
        text: m.text,
        isUser: m.isUser,
        tokens: res.tokens,
        lexTimeMs: Math.round((t1 - t0) * 100) / 100,
      };
    });
  });

  const [inputMsg, setInputMsg] = useState('');
  const [xRayMode, setXRayMode] = useState<Record<string, boolean>>({});

  const loadPresetChat = (preset: PresetChat) => {
    setActivePreset(preset);
    const newMsgs = (preset.messages || []).map((m, i) => {
      const t0 = performance.now();
      const res = engine.lex(m.text);
      const t1 = performance.now();
      return {
        id: `m_${i}`,
        sender: m.sender,
        time: m.time,
        text: m.text,
        isUser: m.isUser,
        tokens: res.tokens,
        lexTimeMs: Math.round((t1 - t0) * 100) / 100,
      };
    });
    setMessages(newMsgs);
  };

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    const t0 = performance.now();
    const res = engine.lex(inputMsg);
    const t1 = performance.now();

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      sender: 'You',
      time: timeStr,
      text: inputMsg,
      isUser: true,
      tokens: res.tokens,
      lexTimeMs: Math.round((t1 - t0) * 100) / 100,
    };

    setMessages([...messages, newMsg]);
    setInputMsg('');
  };

  // Cumulative symbols across conversation
  const cumulativeSymbols = useMemo(() => {
    const mentions = new Map<string, number>();
    const hashtags = new Map<string, number>();
    const urls: string[] = [];

    for (const msg of messages) {
      for (const t of msg.tokens) {
        if (t.type === 'MENTION') {
          mentions.set(t.lexeme, (mentions.get(t.lexeme) || 0) + 1);
        } else if (t.type === 'HASHTAG') {
          hashtags.set(t.lexeme, (hashtags.get(t.lexeme) || 0) + 1);
        } else if (t.type === 'URL') {
          urls.push(t.lexeme);
        }
      }
    }

    return {
      mentions: Array.from(mentions.entries()).sort((a, b) => b[1] - a[1]),
      hashtags: Array.from(hashtags.entries()).sort((a, b) => b[1] - a[1]),
      urls,
    };
  }, [messages]);

  // Risk Signals Widget: pure token heuristic
  const riskAnalysis = useMemo(() => {
    let score = 0;
    const reasons: string[] = [];

    let urgencyCapsCount = 0;
    let emphasisCount = 0;
    let broadcastCount = 0;
    let hasPhone = false;
    let hasCurrency = false;
    let suspiciousUrls = 0;

    for (const msg of messages) {
      for (const t of msg.tokens) {
        if (t.flags.includes('ALL_CAPS') && t.lexeme.length >= 4) {
          urgencyCapsCount++;
        }
        if (t.type === 'EMPHASIS' && t.lexeme.length >= 2) {
          emphasisCount++;
        }
        if (t.flags.includes('BROADCAST')) {
          broadcastCount++;
        }
        if (t.type === 'PHONE') {
          hasPhone = true;
        }
        if (t.type === 'CURRENCY') {
          hasCurrency = true;
        }
        if (t.type === 'URL') {
          // Heuristic: URL with raw IP or length > 60
          if (t.lexeme.includes('192.168.') || t.lexeme.includes('10.') || t.lexeme.length > 60) {
            suspiciousUrls++;
          }
        }
      }
    }

    if (broadcastCount > 0) {
      score += 25;
      reasons.push(`Broadcast mention detected (${broadcastCount}x @everyone/@here)`);
    }
    if (urgencyCapsCount >= 2) {
      score += 20;
      reasons.push(`Urgency all-caps keywords detected (${urgencyCapsCount} instances)`);
    }
    if (suspiciousUrls > 0) {
      score += 35;
      reasons.push(`Suspicious URL structure (${suspiciousUrls}x long path or raw IP host)`);
    }
    if (hasPhone && hasCurrency) {
      score += 20;
      reasons.push('Co-occurrence of telephone number and monetary currency');
    }
    if (emphasisCount >= 2) {
      score += 15;
      reasons.push(`High emphasis density (${emphasisCount}x consecutive exclamation marks)`);
    }

    score = Math.min(100, score);
    return { score, reasons };
  }, [messages]);

  return (
    <div className="p-4 max-w-[1600px] mx-auto flex flex-col space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-[#7C5CFF]" />
          <span className="text-xs font-semibold text-[#E6EAF5]">Preset Conversation:</span>
          <select
            value={activePreset.id}
            onChange={(e) => {
              const p = PRESETS.find((x) => x.id === e.target.value);
              if (p) loadPresetChat(p);
            }}
            className="bg-[#141C33] border border-[#1F2A4A] text-xs text-[#E6EAF5] rounded-lg px-3 py-1.5 outline-none focus:border-[#7C5CFF]"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => loadPresetChat(activePreset)}
          className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>Replay Chat</span>
        </button>
      </div>

      {/* Main Grid: Chat Window + Analytics Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat Window (2 cols on large) */}
        <div className="lg:col-span-2 bg-[#0E1424] border border-[#1F2A4A] rounded-xl flex flex-col h-[620px] shadow-xl overflow-hidden">
          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.map((msg) => {
              const isXRay = xRayMode[msg.id] ?? false;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-2 text-[11px] text-[#8A94B2] mb-1 px-1">
                    <span className="font-semibold text-[#E6EAF5]">{msg.sender}</span>
                    <span>{msg.time}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#141C33] text-[9px] font-mono text-[#34D399]">
                      lexed in {msg.lexTimeMs} ms
                    </span>
                    <button
                      onClick={() =>
                        setXRayMode((prev) => ({ ...prev, [msg.id]: !isXRay }))
                      }
                      className={`p-1 rounded text-[10px] flex items-center space-x-1 transition-colors ${
                        isXRay ? 'text-[#7C5CFF] font-bold' : 'hover:text-[#E6EAF5]'
                      }`}
                      title="Toggle X-ray token view"
                    >
                      <Eye className="w-3 h-3" />
                      <span>X-Ray</span>
                    </button>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed border transition-all ${
                      msg.isUser
                        ? 'bg-[#7C5CFF]/15 border-[#7C5CFF]/40 text-[#E6EAF5] rounded-tr-sm'
                        : 'bg-[#141C33] border-[#1F2A4A] text-[#E6EAF5] rounded-tl-sm'
                    }`}
                  >
                    {isXRay ? (
                      <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                        {msg.tokens.map((token, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10"
                            title={`${token.type} | Flags: ${token.flags.join(', ')}`}
                          >
                            <span className="text-[#7C5CFF] font-semibold">
                              {token.type}:
                            </span>
                            <span className="ml-1 text-white">{token.lexeme}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-[#1F2A4A] bg-[#141C33]/50 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type message as 'You' to test live lexing..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-[#0E1424] border border-[#1F2A4A] rounded-xl px-3.5 py-2 text-xs text-[#E6EAF5] placeholder-[#8A94B2] outline-none focus:border-[#7C5CFF]"
            />
            <button
              onClick={handleSend}
              className="px-3.5 py-2 rounded-xl bg-[#7C5CFF] hover:bg-[#6846FF] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-[#7C5CFF]/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Sidebar: Risk Signals & Cumulative Symbol Table */}
        <div className="flex flex-col space-y-4">
          {/* Risk Signals Widget */}
          <div className="bg-[#0E1424] border border-[#1F2A4A] p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1F2A4A]">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E6EAF5]">
                  Phishing & Risk Signal Heuristics
                </h3>
              </div>
              <span className="text-[10px] text-[#8A94B2]">Token Rules Only (No ML)</span>
            </div>

            {/* Score Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A94B2]">Risk Meter:</span>
                <span
                  className={`font-mono font-bold ${
                    riskAnalysis.score >= 50 ? 'text-[#EF4444]' : 'text-[#34D399]'
                  }`}
                >
                  {riskAnalysis.score} / 100
                </span>
              </div>
              <div className="w-full h-2 bg-[#141C33] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    riskAnalysis.score >= 50 ? 'bg-[#EF4444]' : 'bg-[#34D399]'
                  }`}
                  style={{ width: `${riskAnalysis.score}%` }}
                />
              </div>
            </div>

            {/* Contributing Reasons */}
            <div className="mt-3.5 space-y-1.5">
              {riskAnalysis.reasons.length === 0 ? (
                <p className="text-xs text-[#34D399]">No suspicious signals detected.</p>
              ) : (
                riskAnalysis.reasons.map((r, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 text-[11px] text-[#F87171]"
                  >
                    &bull; {r}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cumulative Symbol Trends */}
          <div className="bg-[#0E1424] border border-[#1F2A4A] p-4 rounded-xl shadow-lg flex-1">
            <div className="flex items-center space-x-2 pb-2 mb-3 border-b border-[#1F2A4A]">
              <TrendingUp className="w-4 h-4 text-[#22D3EE]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E6EAF5]">
                Cumulative Chat Symbols
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-[#8A94B2]">Top Mentions:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cumulativeSymbols.mentions.map(([m, c]) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-[#60A5FA]/20 text-[#60A5FA] font-mono text-[11px]"
                    >
                      {m} &times;{c}
                    </span>
                  ))}
                  {cumulativeSymbols.mentions.length === 0 && (
                    <span className="text-[#8A94B2] italic text-[11px]">None</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#8A94B2]">Trending Hashtags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cumulativeSymbols.hashtags.map(([h, c]) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 rounded bg-[#A78BFA]/20 text-[#A78BFA] font-mono text-[11px]"
                    >
                      {h} &times;{c}
                    </span>
                  ))}
                  {cumulativeSymbols.hashtags.length === 0 && (
                    <span className="text-[#8A94B2] italic text-[11px]">None</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#8A94B2]">Shared Links:</span>
                <div className="space-y-1 mt-1 max-h-24 overflow-y-auto font-mono text-[11px]">
                  {cumulativeSymbols.urls.map((u, i) => (
                    <div key={i} className="text-[#22D3EE] truncate">
                      {u}
                    </div>
                  ))}
                  {cumulativeSymbols.urls.length === 0 && (
                    <span className="text-[#8A94B2] italic text-[11px]">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
