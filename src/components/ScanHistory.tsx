import { useState } from 'react';
import {
  History,
  Trash2,
  Copy,
  Check,
  Globe,
  Wifi,
  Mail,
  Phone,
  FileText,
  X,
  Search,
  Download,
  User,
  CreditCard,
  MapPin,
  Coins,
} from 'lucide-react';
import { ScannedResult, ScanContentType } from '../types';
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | ScanContentType>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleCopyItem = async (e: React.MouseEvent, item: ScannedResult) => {
    e.stopPropagation();
    playClickFeedback();
    triggerHaptic(20);
    try {
      await navigator.clipboard.writeText(item.rawText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Fallback
    }
  };

  const handleExportCSV = () => {
    playClickFeedback();
    triggerHaptic(25);
    if (history.length === 0) return;

    const headers = ['ID', 'Date', 'Type', 'Content'];
    const rows = history.map((item) => [
      `"${item.id}"`,
      `"${new Date(item.timestamp).toISOString()}"`,
      `"${item.type}"`,
      `"${item.rawText.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-scan-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      case 'vcard':
        return <User className="w-4 h-4 text-indigo-400" />;
      case 'upi':
        return <CreditCard className="w-4 h-4 text-teal-400" />;
      case 'geo':
        return <MapPin className="w-4 h-4 text-rose-400" />;
      case 'crypto':
        return <Coins className="w-4 h-4 text-amber-400" />;
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

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.rawText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || item.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      id="scan-history-modal-overlay"
      className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="scan-history-container"
        className="w-full sm:max-w-[440px] max-h-[88vh] h-[82vh] bg-zinc-950 border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
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
              <p className="text-[10px] text-zinc-400">All saved & scanned items</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <button
                id="btn-export-history-csv"
                type="button"
                onClick={handleExportCSV}
                className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                title="Export history as CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {history.length > 0 && !showClearConfirm && (
              <button
                id="btn-trigger-clear-history"
                type="button"
                onClick={() => {
                  playClickFeedback();
                  setShowClearConfirm(true);
                }}
                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Clear all scan history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              id="btn-close-history"
              type="button"
              onClick={() => {
                playClickFeedback();
                onClose();
              }}
              className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Prompt */}
        {showClearConfirm && (
          <div className="px-5 py-3 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <span className="text-rose-300 font-medium">Clear all scan history?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickFeedback();
                  triggerHaptic(30);
                  onClearHistory();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px]"
              >
                Yes, Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickFeedback();
                  setShowClearConfirm(false);
                }}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-zinc-850 bg-zinc-900/30 flex flex-col gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
            {(['all', 'url', 'wifi', 'vcard', 'text'] as const).map((filterType) => (
              <button
                key={filterType}
                type="button"
                onClick={() => {
                  playClickFeedback();
                  setSelectedFilter(filterType);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize shrink-0 transition-all ${
                  selectedFilter === filterType
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {filterType === 'all' ? 'All' : filterType === 'url' ? 'Links' : filterType === 'vcard' ? 'Contacts' : filterType}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y-0">
          {filteredHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <History className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium text-zinc-400">
                {searchQuery ? 'No matching scan results' : 'No scan history yet'}
              </p>
              <p className="text-[11px] text-zinc-600 mt-1 max-w-[200px]">
                {searchQuery
                  ? 'Try a different search query or clear the filter.'
                  : 'QR codes you scan will appear here automatically.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  playClickFeedback();
                  triggerHaptic(20);
                  onSelectResult(item);
                }}
                className="group relative flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700/80 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50 shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                      {item.rawText}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatTime(item.timestamp)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
                        {item.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopyItem(e, item)}
                    className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
                    title="Copy content"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playClickFeedback();
                      triggerHaptic(20);
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
