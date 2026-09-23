import { useState } from 'react';
import {
  History,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Wifi,
  Mail,
  Phone,
  FileText,
  X,
  Search,
} from 'lucide-react';
import { ScannedResult } from '../types';
import { playClickFeedback, triggerHaptic } from '../utils/qrParser';

interface ScanHistoryProps {
  isOpen: boolean;
  history: ScannedResult[];
  onClose: () => void;
  onSelectResult: (result: ScannedResult) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export default function ScanHistory({
  isOpen,
  history,
  onClose,
  onSelectResult,
  onDeleteItem,
  onClearHistory,
}: ScanHistoryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleCopyItem = async (e: React.MouseEvent, item: ScannedResult) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.rawText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Fallback
    }
  };

  const getIcon = (type: ScannedResult['type']) => {
    switch (type) {
      case 'url':
        return <Globe className="w-4 h-4 text-sky-400" />;
      case 'wifi':
        return <Wifi className="w-4 h-4 text-emerald-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-purple-400" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      const isToday = new Date().toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Today, ${timeStr}`;
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return '';
    }
  };

  const filteredHistory = history.filter((item) =>
    item.rawText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="scan-history-modal-overlay"
      className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="scan-history-container"
        className="w-full sm:max-w-[420px] max-h-[85vh] h-[80vh] bg-zinc-950 border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Scan History</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                  {history.length}
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">All previously scanned QR codes</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {history.length > 0 && !showClearConfirm && (
              <button
                id="btn-trigger-clear-history"
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1"
                title="Clear all scan history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <button
              id="btn-close-history"
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Prompt */}
        {showClearConfirm && (
          <div className="px-5 py-3 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between gap-3 text-xs">
            <span className="text-rose-300 font-medium">Clear all scan history?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px]"
              >
                Yes, Clear
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search bar when history > 3 items */}
        {history.length > 3 && (
          <div className="px-4 py-2.5 border-b border-zinc-900 bg-zinc-950">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-300">No Scan History</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">
                QR codes you scan with camera or gallery photos will be stored here.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No matching results found.
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
                className="group p-3 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-emerald-500/40 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                  <div className="p-2.5 rounded-xl bg-zinc-800/90 border border-zinc-700/40 shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-zinc-200 text-xs font-medium truncate group-hover:text-emerald-400 transition-colors">
                      {item.rawText}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-semibold text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Copy, Link, Delete Item */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopyItem(e, item)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/60 rounded-xl transition-colors"
                    title="Copy"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {item.type === 'url' && (
                    <a
                      href={item.rawText.startsWith('http') ? item.rawText : `https://${item.rawText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/60 rounded-xl transition-colors"
                      title="Open Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Individual Delete Item button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
