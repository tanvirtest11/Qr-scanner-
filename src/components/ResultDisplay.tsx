import { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Globe,
  Wifi,
  Mail,
  Phone,
  FileText,
  RotateCcw,
  Share2,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  ShieldAlert,
  Hash,
} from 'lucide-react';
import { ScannedResult } from '../types';
import { playClickFeedback, triggerHaptic } from '../utils/qrParser';

interface ResultDisplayProps {
  result: ScannedResult;
  onReset: () => void;
}

export default function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const rawLower = result.rawText.toLowerCase().trim();
  const isDangerousScheme = rawLower.startsWith('javascript:') || rawLower.startsWith('data:');
  const isInsecureHttp = result.type === 'url' && rawLower.startsWith('http://');
  const isNumericOnly = /^\d+$/.test(result.rawText.trim());
  const isDummyCode =
    ['test', 'dummy', 'demo', 'sample', 'asdf', '1234', '12345'].includes(rawLower) ||
    (result.type === 'text' && result.rawText.trim().length <= 3);

  const handleCopy = async (text: string) => {
    playClickFeedback();
    triggerHaptic(20);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    playClickFeedback();
    triggerHaptic(25);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'QR Code Result',
          text: result.rawText,
        });
      } catch {
        // Cancelled
      }
    } else {
      handleCopy(result.rawText);
    }
  };

  const getDestinationUrl = () => {
    if (result.type === 'url') {
      if (isDangerousScheme) return '#';
      return result.rawText.startsWith('http') ? result.rawText : `https://${result.rawText}`;
    }
    return '';
  };

  const typeDetails = {
    url: { label: 'Website Link', icon: Globe, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    wifi: { label: 'Wi-Fi Network', icon: Wifi, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    email: { label: 'Email Address', icon: Mail, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    phone: { label: 'Phone Number', icon: Phone, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    text: {
      label: isNumericOnly ? 'Numeric Serial Code' : 'Plain Text / Data',
      icon: isNumericOnly ? Hash : FileText,
      color: 'text-zinc-300 bg-zinc-800/80 border-zinc-700',
    },
  }[result.type] || { label: 'Information', icon: FileText, color: 'text-zinc-300 bg-zinc-800/80 border-zinc-700' };

  const TypeIcon = typeDetails.icon;

  return (
    <div id="result-card-container" className="w-full flex-1 flex flex-col justify-between p-5 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="flex flex-col gap-4">
        {/* Top Type Indicator Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl border ${typeDetails.color}`}>
              <TypeIcon className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold block">
                QR Code Scanned
              </span>
              <h2 className="text-base font-semibold text-white">
                {typeDetails.label}
              </h2>
            </div>
          </div>

          <button
            id="btn-share-scanned"
            type="button"
            onClick={handleShare}
            className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Dummy / Test QR Warning Note if detected */}
        {isDummyCode && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Sample / Test Code:</strong> This QR code appears to contain placeholder or test content rather than an active service.
            </span>
          </div>
        )}

        {/* Dangerous Script Warning if detected */}
        {isDangerousScheme && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              <strong>Security Alert:</strong> This QR code contains an unsafe script or data URL scheme. Direct opening has been blocked for your device safety.
            </span>
          </div>
        )}

        {/* Non-SSL warning if applicable */}
        {isInsecureHttp && !isDangerousScheme && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>This link uses unencrypted HTTP instead of secure HTTPS.</span>
          </div>
        )}

        {/* Content Box */}
        {result.type === 'url' && (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 break-all select-all">
              {isDangerousScheme ? (
                <span className="text-red-400 font-mono text-sm break-all">{result.rawText}</span>
              ) : (
                <a
                  href={getDestinationUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-medium text-sm hover:underline"
                >
                  {result.rawText}
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {!isDangerousScheme ? (
                <a
                  id="btn-action-open-link"
                  href={getDestinationUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Link
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="py-3 px-4 bg-zinc-800 text-zinc-500 cursor-not-allowed rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-zinc-800"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Unsafe Link
                </button>
              )}

              <button
                id="btn-action-copy-link"
                type="button"
                onClick={() => handleCopy(result.rawText)}
                className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700/80"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}

        {result.type === 'wifi' && (
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-400 text-xs">Network Name (SSID):</span>
                <span className="text-white font-semibold">
                  {result.metadata?.ssid || 'Unknown'}
                </span>
              </div>

              {result.metadata?.password && (
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="text-zinc-400 text-xs">Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono font-medium">
                      {showPassword ? result.metadata.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Security:</span>
                <span className="text-zinc-300 font-medium">
                  {result.metadata?.authType || 'WPA/WPA2'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {result.metadata?.password ? (
                <button
                  id="btn-copy-wifi-password"
                  type="button"
                  onClick={() => handleCopy(result.metadata?.password || '')}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Password'}
                </button>
              ) : null}

              <button
                id="btn-copy-all-wifi-data"
                type="button"
                onClick={() => handleCopy(result.rawText)}
                className={`py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700/80 ${
                  !result.metadata?.password ? 'col-span-2' : ''
                }`}
              >
                <Copy className="w-4 h-4" />
                Copy Config
              </button>
            </div>
          </div>
        )}

        {result.type === 'email' && (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-sm text-white select-all break-all">
              {result.metadata?.emailAddress || result.rawText}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                id="btn-send-email-link"
                href={`mailto:${result.metadata?.emailAddress || result.rawText}`}
                className="py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </a>
              <button
                id="btn-copy-email-address"
                type="button"
                onClick={() => handleCopy(result.metadata?.emailAddress || result.rawText)}
                className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700/80"
              >
                {copied ? <Check className="w-4 h-4 text-purple-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {result.type === 'phone' && (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-base font-semibold text-white select-all">
              {result.metadata?.phoneNumber || result.rawText}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                id="btn-call-phone-link"
                href={`tel:${result.metadata?.phoneNumber || result.rawText}`}
                className="py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Number
              </a>
              <button
                id="btn-copy-phone-num"
                type="button"
                onClick={() => handleCopy(result.metadata?.phoneNumber || result.rawText)}
                className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700/80"
              >
                {copied ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {result.type === 'text' && (
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 max-h-44 overflow-y-auto select-all">
              <p className="text-zinc-100 text-sm whitespace-pre-wrap leading-relaxed">
                {result.rawText}
              </p>
            </div>
            <button
              id="btn-copy-full-text"
              type="button"
              onClick={() => handleCopy(result.rawText)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Text'}
            </button>
          </div>
        )}
      </div>

      {/* Scan Again Button */}
      <button
        id="btn-scan-again"
        type="button"
        onClick={() => {
          playClickFeedback();
          triggerHaptic(25);
          onReset();
        }}
        className="w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 active:scale-98"
      >
        <RotateCcw className="w-4 h-4" />
        Scan Another QR Code
      </button>
    </div>
  );
}
