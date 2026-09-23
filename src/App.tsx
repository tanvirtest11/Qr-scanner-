import { useState, useEffect, useCallback } from 'react';
import { QrCode, Volume2, VolumeX, History, RotateCcw } from 'lucide-react';
import CameraScanner from './components/CameraScanner';
import CameraErrorBoundary from './components/CameraErrorBoundary';
import ResultDisplay from './components/ResultDisplay';
import ScanHistory from './components/ScanHistory';
import { ScannedResult } from './types';
import { parseQRContent, playSuccessBeep, playClickFeedback, triggerHaptic, decodeQRFromImageFile } from './utils/qrParser';

const SOUND_KEY = 'qr_scanner_sound_enabled';
const HISTORY_KEY = 'qr_scanner_scan_history';

export default function App() {
  const [currentResult, setCurrentResult] = useState<ScannedResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [cameraSessionKey, setCameraSessionKey] = useState<number>(0);

  // Force reset handler to clear and rebuild camera DOM state
  const handleForceResetCamera = useCallback(() => {
    playClickFeedback();
    triggerHaptic(40);
    setCameraSessionKey((prev) => prev + 1);
  }, []);

  // Scan History state persisted in localStorage
  const [history, setHistory] = useState<ScannedResult[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save history on changes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Load sound preference from localStorage
  useEffect(() => {
    try {
      const savedSound = localStorage.getItem(SOUND_KEY);
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSound = () => {
    playClickFeedback();
    triggerHaptic(20);
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    try {
      localStorage.setItem(SOUND_KEY, String(nextState));
    } catch {
      // ignore
    }
  };

  // When a QR is detected
  const handleScanSuccess = useCallback((rawText: string) => {
    if (!rawText || rawText.trim().length === 0) return;

    if (soundEnabled) {
      playSuccessBeep();
    }
    triggerHaptic(60);

    const parsed = parseQRContent(rawText);
    const newResult: ScannedResult = {
      id: `${Date.now()}`,
      rawText,
      type: parsed.type,
      timestamp: Date.now(),
      metadata: parsed.metadata,
    };

    setCurrentResult(newResult);

    // Save to history (newest at top, remove old duplicate)
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.rawText !== rawText);
      return [newResult, ...filtered].slice(0, 100);
    });
  }, [soundEnabled]);

  // Global clipboard paste support (paste image from clipboard or screenshot)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const decoded = await decodeQRFromImageFile(file);
            if (decoded) {
              handleScanSuccess(decoded);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleScanSuccess]);

  const handleReset = () => {
    playClickFeedback();
    triggerHaptic(20);
    setCurrentResult(null);
  };

  // Delete individual item from history
  const handleDeleteHistoryItem = (id: string) => {
    playClickFeedback();
    triggerHaptic(30);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all history items
  const handleClearAllHistory = () => {
    playClickFeedback();
    triggerHaptic(50);
    setHistory([]);
  };

  return (
    <div id="app-viewport-wrapper" className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-0 sm:p-4 selection:bg-emerald-500/30">
      {/* Smartphone Container (Centered Portrait Form Factor) */}
      <div
        id="phone-device-frame"
        className="relative w-full max-w-[420px] h-[100dvh] sm:h-[840px] sm:max-h-[94vh] bg-zinc-950 sm:rounded-[44px] sm:border-[7px] sm:border-zinc-800 shadow-[0_20px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
      >
        {/* Subtle Phone Speaker Pill */}
        <div className="hidden sm:flex justify-center pt-2.5 pb-1 z-30">
          <div className="w-24 h-3.5 bg-zinc-900 rounded-full border border-zinc-800/80" />
        </div>

        {/* Clean, Non-Distracting Header with History & Sound */}
        <header id="phone-app-header" className="relative px-4 sm:px-5 py-3 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-md shadow-emerald-950">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
                QR Scanner
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium">
                Fast & Direct Scanner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* History Button with Counter Badge */}
            <button
              id="btn-open-history"
              type="button"
              onClick={() => {
                playClickFeedback();
                triggerHaptic(20);
                setIsHistoryOpen(true);
              }}
              className="relative p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all border border-zinc-800/80"
              title="View Scan History"
            >
              <History className="w-4 h-4" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[16px] h-4 bg-emerald-500 text-zinc-950 font-bold text-[9px] rounded-full flex items-center justify-center shadow-sm">
                  {history.length > 99 ? '99+' : history.length}
                </span>
              )}
            </button>

            {/* Force Reset Camera Button */}
            <button
              id="btn-force-reset-camera-header"
              type="button"
              onClick={handleForceResetCamera}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all border border-zinc-800/80 active:rotate-180"
              title="Force Reset Camera Feed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Sound toggle button */}
            <button
              id="btn-sound-toggle-header"
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl transition-all border border-zinc-800/80 active:scale-95 ${
                soundEnabled
                  ? 'text-emerald-400 bg-zinc-900 hover:bg-zinc-800'
                  : 'text-zinc-500 bg-zinc-900/60 hover:bg-zinc-800'
              }`}
              title={soundEnabled ? 'Mute Beep' : 'Unmute Beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Main Scanner Body */}
        <main id="phone-app-main" className="relative flex-1 w-full h-full flex flex-col overflow-hidden bg-black">
          {/* Active Camera Viewport protected by React Error Boundary */}
          <CameraErrorBoundary key={cameraSessionKey} onReset={handleForceResetCamera}>
            <CameraScanner
              key={`camera-scanner-instance-${cameraSessionKey}`}
              onScan={handleScanSuccess}
              isPaused={Boolean(currentResult) || isHistoryOpen}
            />
          </CameraErrorBoundary>

          {/* Scanned Result Bottom Sheet Overlay with subtle slide up animation */}
          {currentResult && (
            <div className="absolute inset-x-0 bottom-0 max-h-[85%] flex flex-col z-30 animate-in fade-in slide-in-from-bottom-6 duration-250 ease-out">
              <ResultDisplay
                result={currentResult}
                onReset={handleReset}
              />
            </div>
          )}

          {/* Scan History Slide-over / Modal with slide-in animation */}
          <ScanHistory
            isOpen={isHistoryOpen}
            history={history}
            onClose={() => {
              playClickFeedback();
              setIsHistoryOpen(false);
            }}
            onSelectResult={(item) => {
              playClickFeedback();
              triggerHaptic(20);
              setCurrentResult(item);
            }}
            onDeleteItem={handleDeleteHistoryItem}
            onClearHistory={handleClearAllHistory}
          />
        </main>

        {/* Mobile Navigation Indicator Bar */}
        <div className="w-full py-2 bg-zinc-950 flex justify-center z-30">
          <div className="w-28 h-1 bg-zinc-700/60 rounded-full" />
        </div>
      </div>
    </div>
  );
}
