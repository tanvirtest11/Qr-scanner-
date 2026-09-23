import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Upload,
  AlertCircle,
  ImageIcon,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Flashlight,
} from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';
import { playClickFeedback, triggerHaptic } from '../utils/qrParser';

interface CameraScannerProps {
  onScan: (text: string) => void;
  isPaused: boolean;
}

export default function CameraScanner({ onScan, isPaused }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const settingsGuideRef = useRef<HTMLDivElement | null>(null);
  const camerasRef = useRef<MediaDeviceInfo[]>([]);
  const isStartingRef = useRef<boolean>(false);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isLowLight, setIsLowLight] = useState<boolean>(false);
  const [showSettingsGuide, setShowSettingsGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'chrome' | 'safari' | 'desktop'>('chrome');

  // Gallery image crop modal state
  const [selectedCropFile, setSelectedCropFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);

  // Stop media tracks cleanly
  const stopCamera = useCallback(() => {
    console.group('CameraScanner: stopCamera');
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      console.log(`Stopping ${tracks.length} active tracks...`);
      tracks.forEach((track) => {
        try {
          track.stop();
          console.log(`Track ${track.id} (${track.kind}) stopped. ReadyState: ${track.readyState}`);
        } catch (err) {
          console.warn('Error stopping track:', err);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    console.groupEnd();
  }, []);

  // Start camera stream safely without triggering recreation loops
  const startCamera = useCallback(async (targetIndex?: number) => {
    if (isStartingRef.current) {
      console.log('Camera initialization already in progress, skipping duplicate call.');
      return;
    }
    isStartingRef.current = true;
    setIsRetrying(true);
    setHasPermission(null);
    setErrorMessage(null);

    console.group('CameraScanner: startCamera Lifecycle');
    console.log('Target device index:', targetIndex ?? currentCameraIndex);

    // 1. Teardown any existing active media stream tracks
    stopCamera();

    // 2. Check navigator.mediaDevices support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('navigator.mediaDevices.getUserMedia is unavailable in this environment.');
      setHasPermission(false);
      setPermissionState('denied');
      setIsRetrying(false);
      isStartingRef.current = false;
      setErrorMessage('Camera is not supported on this browser or environment.');
      console.groupEnd();
      return;
    }

    try {
      const activeCameras = camerasRef.current;
      const indexToUse = targetIndex !== undefined ? targetIndex : currentCameraIndex;
      let targetDeviceId: string | undefined;

      if (activeCameras.length > 0 && activeCameras[indexToUse]?.deviceId) {
        targetDeviceId = activeCameras[indexToUse].deviceId;
      }

      console.log('Target device ID:', targetDeviceId || 'None (using environment facingMode fallback)');

      let stream: MediaStream | null = null;

      // Primary Attempt: Request Ultra-HD / Full-HD crisp video with continuous autofocus for QR scanning
      try {
        const primaryConstraints: MediaStreamConstraints = {
          video: targetDeviceId
            ? {
                deviceId: { exact: targetDeviceId },
                width: { ideal: 1920, max: 3840, min: 1280 },
                height: { ideal: 1080, max: 2160, min: 720 },
                frameRate: { ideal: 30, min: 15 },
                // Advanced autofocus & exposure constraints supported by modern browsers
                // @ts-expect-error standard advanced autofocus constraint
                focusMode: { ideal: 'continuous' },
                // @ts-expect-error exposure mode
                exposureMode: { ideal: 'continuous' },
                // @ts-expect-error white balance
                whiteBalanceMode: { ideal: 'continuous' },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920, max: 3840, min: 1280 },
                height: { ideal: 1080, max: 2160, min: 720 },
                frameRate: { ideal: 30, min: 15 },
                // @ts-expect-error standard advanced autofocus constraint
                focusMode: { ideal: 'continuous' },
                // @ts-expect-error exposure mode
                exposureMode: { ideal: 'continuous' },
                // @ts-expect-error white balance
                whiteBalanceMode: { ideal: 'continuous' },
              },
          audio: false,
        };
        console.log('Attempting getUserMedia with Ultra-HD autofocus constraints:', primaryConstraints);
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (firstErr) {
        console.warn('Ultra-HD constraint failed, falling back to standard 1080p/720p...', firstErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              // @ts-expect-error standard advanced autofocus constraint
              focusMode: { ideal: 'continuous' },
            },
            audio: false,
          });
        } catch (secondErr) {
          console.warn('FacingMode constraint failed, falling back to basic video: true...', secondErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('Failed to acquire a video stream.');
      }

      console.log('MediaStream successfully obtained:', stream.id);
      streamRef.current = stream;

      // Apply continuous auto-focus & exposure hardware capability if supported by mobile sensor
      const videoTracks = stream.getVideoTracks();
      const primaryTrack = videoTracks[0];
      if (primaryTrack && typeof primaryTrack.getCapabilities === 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const capabilities = primaryTrack.getCapabilities() as any;
          console.log('Camera hardware capabilities:', capabilities);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const advancedConstraints: any[] = [];
          if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
            advancedConstraints.push({ focusMode: 'continuous' });
          }
          if (capabilities.exposureMode && Array.isArray(capabilities.exposureMode) && capabilities.exposureMode.includes('continuous')) {
            advancedConstraints.push({ exposureMode: 'continuous' });
          }
          if (capabilities.whiteBalanceMode && Array.isArray(capabilities.whiteBalanceMode) && capabilities.whiteBalanceMode.includes('continuous')) {
            advancedConstraints.push({ whiteBalanceMode: 'continuous' });
          }

          if (advancedConstraints.length > 0 && typeof (primaryTrack as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints === 'function') {
            await (primaryTrack as unknown as {
              applyConstraints: (c: { advanced: unknown[] }) => Promise<void>;
            }).applyConstraints({
              advanced: advancedConstraints,
            });
            console.log('High-resolution continuous autofocus & exposure enabled on hardware.');
          }
        } catch (focusErr) {
          console.warn('Hardware advanced constraint apply warning:', focusErr);
        }
      }

      // Bind track lifecycle listeners
      console.log(`Discovered ${videoTracks.length} video tracks.`);
      videoTracks.forEach((track) => {
        console.log(`Track info - Label: "${track.label}", Muted: ${track.muted}, ReadyState: ${track.readyState}`);
        track.onended = () => {
          console.warn(`Video track ${track.id} (${track.label}) ended unexpectedly.`);
        };
        track.onmute = () => {
          console.warn(`Video track ${track.id} was muted by system.`);
        };
        track.onunmute = () => {
          console.log(`Video track ${track.id} unmuted.`);
        };
      });

      // Bind to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        try {
          await videoRef.current.play();
          console.log('Video element playback started successfully.');
        } catch (playErr) {
          console.warn('Video.play() warning (may require user tap):', playErr);
        }
      }

      setHasPermission(true);
      setPermissionState('granted');
      setIsRetrying(false);
      isStartingRef.current = false;

      // Enumerate devices once stream is active and sort back/environment cameras first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        console.log('Discovered available video inputs:', videoInputs.length);

        // Sort so that back / rear / environment cameras always appear first (index 0)
        const sortedCameras = [...videoInputs].sort((a, b) => {
          const aLabel = (a.label || '').toLowerCase();
          const bLabel = (b.label || '').toLowerCase();
          const aIsBack = aLabel.includes('back') || aLabel.includes('rear') || aLabel.includes('environment');
          const bIsBack = bLabel.includes('back') || bLabel.includes('rear') || bLabel.includes('environment');
          if (aIsBack && !bIsBack) return -1;
          if (!aIsBack && bIsBack) return 1;
          return 0;
        });

        camerasRef.current = sortedCameras;
        setCameras(sortedCameras);
      } catch (enumErr) {
        console.warn('Device enumeration failed:', enumErr);
      }

      // Check flashlight/torch capability
      if (primaryTrack && typeof primaryTrack.getCapabilities === 'function') {
        const capabilities = primaryTrack.getCapabilities() as { torch?: boolean };
        console.log('Track capabilities torch:', capabilities.torch);
        setHasTorch(Boolean(capabilities.torch));
      } else {
        setHasTorch(false);
      }

      console.groupEnd();
    } catch (err: unknown) {
      isStartingRef.current = false;
      setIsRetrying(false);
      setHasPermission(false);
      const e = err as Error;
      console.error('Camera initialization failed:', e);

      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage(
          'Camera access was blocked by your browser settings. You can allow it in site settings, tap Reload Page, or scan directly from your gallery.'
        );
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device found on this system. You can still scan images from device storage below.');
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another app or browser tab. Please close other camera apps and tap Try Again.');
      } else {
        setErrorMessage('Could not start camera: ' + (e.message || 'Unknown error'));
      }
      console.groupEnd();
    }
  }, [stopCamera, currentCameraIndex]);

  // Mount lifecycle: start camera on mount and teardown cleanly on unmount
  useEffect(() => {
    startCamera(0);
    return () => {
      stopCamera();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flip camera
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    startCamera(nextIndex);
  };

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const next = !torchOn;
        await (track as unknown as {
          applyConstraints: (c: { advanced: [{ torch: boolean }] }) => Promise<void>;
        }).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchOn(next);
      } catch {
        // Torch error
      }
    }
  };

  // Open interactive cropper when user selects image file (immediately pause camera to free up CPU & GPU)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    stopCamera();

    setSelectedCropFile(file);
    setShowCropModal(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Resume camera automatically whenever isPaused becomes false or Crop modal is closed
  useEffect(() => {
    if (!isPaused && !showCropModal) {
      // If stream was stopped or is not active, re-initialize camera automatically
      const isStreamActive = streamRef.current && streamRef.current.active && streamRef.current.getVideoTracks().some(t => t.readyState === 'live');
      if (!isStreamActive) {
        startCamera(currentCameraIndex);
      } else if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, showCropModal, startCamera, currentCameraIndex]);

  // Optimized scan loop with throttled frame processing to guarantee fluid 60fps UI
  useEffect(() => {
    if (isPaused || !hasPermission || showCropModal) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    // Initialize Native BarcodeDetector once if available (Chrome Android / modern browsers)
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    // @ts-expect-error Native BarcodeDetector constructor
    const nativeDetector = hasBarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;

    // Small off-screen canvas for frame capture (max 360px dimension to drastically cut CPU & battery draw)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let lastScanTimestamp = 0;
    // Process every ~80ms (12-15 FPS scanning) for instant auto-detection the moment QR is in view
    const THROTTLE_INTERVAL_MS = 80;
    let isProcessingFrame = false;
    let isMounted = true;

    // Track the last consecutive detected QR values and confirmation duration
    const recentDetections: string[] = [];
    let consistentCode: string | null = null;
    let consistentStartTime: number | null = null;
    const REQUIRED_CONSISTENT_DURATION_MS = 500; // 500ms continuous lock
    const REQUIRED_MIN_DETECTIONS = 3; // At least 3 consistent readings

    const handleDetectedCode = (detectedText: string, currentTimestamp: number) => {
      const trimmed = detectedText.trim();
      if (!trimmed) return;

      // Maintain buffer of last 3 detections
      recentDetections.push(trimmed);
      if (recentDetections.length > 3) {
        recentDetections.shift();
      }

      // Check if current detected code matches previous consistent code
      if (consistentCode === trimmed) {
        if (consistentStartTime === null) {
          consistentStartTime = currentTimestamp;
        }

        const elapsedDuration = currentTimestamp - consistentStartTime;
        const allMatchLast3 =
          recentDetections.length >= REQUIRED_MIN_DETECTIONS &&
          recentDetections.every((val) => val === trimmed);

        // If consistent for >= 500ms and validated across last 3 samples, trigger success scan
        if (elapsedDuration >= REQUIRED_CONSISTENT_DURATION_MS && allMatchLast3) {
          onScan(trimmed);
          return true;
        }
      } else {
        // Reset consistency tracker for new QR code
        consistentCode = trimmed;
        consistentStartTime = currentTimestamp;
      }
      return false;
    };

    const processFrame = async (timestamp: number) => {
      if (!isMounted) return;

      const video = videoRef.current;

      // Only attempt frame capture if video is playing, ready, and throttle interval has passed
      if (
        video &&
        video.readyState >= 2 &&
        !isPaused &&
        !isProcessingFrame &&
        timestamp - lastScanTimestamp >= THROTTLE_INTERVAL_MS
      ) {
        lastScanTimestamp = timestamp;
        isProcessingFrame = true;

        try {
          // Priority 1: Native Hardware BarcodeDetector (instant hardware acceleration on Chrome Android)
          if (nativeDetector) {
            const barcodes = await nativeDetector.detect(video);
            if (isMounted && barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const triggered = handleDetectedCode(barcodes[0].rawValue, timestamp);
              if (triggered) return;
            } else {
              // Reset if no code detected in current frame
              recentDetections.length = 0;
              consistentCode = null;
              consistentStartTime = null;
            }
          } else if (ctx) {
            // Priority 2: High-definition 720px canvas jsQR parsing for ultra sharp scanning of tiny/dense QR codes
            const vWidth = video.videoWidth || 1280;
            const vHeight = video.videoHeight || 720;

            const maxDimension = 720;
            const scale = Math.min(1, maxDimension / Math.max(vWidth, vHeight));
            const cWidth = Math.max(1, Math.round(vWidth * scale));
            const cHeight = Math.max(1, Math.round(vHeight * scale));

            if (canvas.width !== cWidth || canvas.height !== cHeight) {
              canvas.width = cWidth;
              canvas.height = cHeight;
            }

            ctx.drawImage(video, 0, 0, cWidth, cHeight);
            const imageData = ctx.getImageData(0, 0, cWidth, cHeight);
            const data = imageData.data;

            // Compute sample average luminance across pixels
            let totalLum = 0;
            const step = Math.max(1, Math.floor(data.length / (4 * 100))); // sample ~100 points
            let sampleCount = 0;
            for (let i = 0; i < data.length; i += 4 * step) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Standard perceptual luminance formula
              totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
              sampleCount++;
            }
            const avgLum = sampleCount > 0 ? totalLum / sampleCount : 128;
            // If average luminance is below 38 out of 255, ambient view is too dark for optical QR scan
            const isDark = avgLum < 38;
            if (isMounted) {
              setIsLowLight(isDark);
            }

            const code = jsQR(data, cWidth, cHeight, {
              inversionAttempts: 'attemptBoth',
            });

            if (isMounted && code && code.data && code.data.trim().length > 0) {
              const triggered = handleDetectedCode(code.data, timestamp);
              if (triggered) return;
            } else {
              // Reset if no code detected in current frame
              recentDetections.length = 0;
              consistentCode = null;
              consistentStartTime = null;
            }
          }
        } catch {
          // Gracefully continue scanning loop on transient errors
        } finally {
          isProcessingFrame = false;
        }
      }

      if (isMounted) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPaused, hasPermission, showCropModal, onScan]);

  // Handler for Try Again button click
  const handleTryAgain = async () => {
    setIsRetrying(true);
    try {
      await startCamera(currentCameraIndex);
    } catch {
      setShowSettingsGuide(true);
    } finally {
      setIsRetrying(false);
    }
  };

  // Direct user to open settings guide
  const handleDirectToSettings = () => {
    setShowSettingsGuide(true);
    setTimeout(() => {
      settingsGuideRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div id="camera-viewport-card" className="relative w-full h-full flex-1 bg-black overflow-hidden flex items-center justify-center">
      {/* Hidden file input for uploading an image QR code */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Video stream element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hasPermission ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Camera loading state */}
      {hasPermission === null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-300 gap-3 z-20">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide">Starting Camera...</p>
        </div>
      )}

      {/* Initial 'Request Camera' UI if browser is in prompt state and user hasn't granted yet */}
      {hasPermission === false && permissionState === 'prompt' && (
        <div id="camera-request-prompt-card" className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center z-20 overflow-y-auto">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Camera className="w-8 h-8" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-75" />
          </div>

          <h3 className="text-white text-lg font-bold mb-1.5">Camera Access Needed</h3>
          <p className="text-zinc-400 text-xs mb-6 max-w-xs leading-relaxed">
            To scan QR codes and barcodes in real-time, please allow camera access when prompted by your browser.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              id="btn-request-camera-permission"
              type="button"
              disabled={isRetrying}
              onClick={() => startCamera(currentCameraIndex)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
            >
              <Camera className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Requesting Permission...' : 'Allow Camera Access'}</span>
            </button>

            <button
              id="btn-scan-gallery-prompt"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-zinc-800"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Scan QR from Gallery Instead</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera error or permission denied */}
      {hasPermission === false && permissionState !== 'prompt' && (
        <div id="camera-permission-fallback" className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-5 text-center z-20 overflow-y-auto">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3 shrink-0 shadow-lg shadow-red-950/40">
            <AlertCircle className="w-7 h-7" />
          </div>

          <h3 className="text-white text-base font-bold mb-1">Camera Permission Blocked</h3>
          <p className="text-zinc-400 text-xs mb-4 max-w-xs leading-relaxed">
            {errorMessage || 'Camera access was blocked by your browser settings.'}
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-col gap-2.5 w-full max-w-xs mb-4">
            {/* 1. Request / Try Again button with active loading feedback */}
            <button
              id="btn-retry-camera-access"
              type="button"
              disabled={isRetrying}
              onClick={() => startCamera(currentCameraIndex)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-zinc-700 shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRetrying ? 'Requesting Camera...' : 'Try Again'}</span>
            </button>

            {/* 2. Reload Page button (essential on mobile browsers once permission is toggled in site settings) */}
            <button
              id="btn-reload-page"
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-zinc-800 shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-sky-400" />
              <span>Reload Page</span>
            </button>

            {/* 3. Direct Storage / Gallery fallback - 100% works without camera permission */}
            <button
              id="btn-upload-photo-fallback"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Scan QR from Gallery (No Camera Needed)</span>
            </button>
          </div>

          {/* Expandable Step-by-Step Settings Guide */}
          <div className="w-full max-w-xs bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 text-left text-xs">
            <button
              type="button"
              onClick={() => setShowSettingsGuide(!showSettingsGuide)}
              className="w-full flex items-center justify-between text-zinc-300 font-semibold text-[12px] hover:text-white transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span>⚙️</span>
                <span>How to allow camera in browser</span>
              </span>
              <span className="text-zinc-500 font-mono">{showSettingsGuide ? '▲' : '▼'}</span>
            </button>

            {showSettingsGuide && (
              <div className="mt-3 pt-3 border-t border-zinc-800 text-zinc-400 space-y-2.5">
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('chrome')}
                    className={`flex-1 py-1 text-[11px] rounded-lg font-medium transition-colors ${
                      activeGuideTab === 'chrome'
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Android / Chrome
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('safari')}
                    className={`flex-1 py-1 text-[11px] rounded-lg font-medium transition-colors ${
                      activeGuideTab === 'safari'
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    iPhone / Safari
                  </button>
                </div>

                {activeGuideTab === 'chrome' ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-zinc-300">
                    <li>Tap the <strong>Lock (🔒) or Tune</strong> icon in the address bar at the top.</li>
                    <li>Tap <strong>Permissions</strong> or <strong>Site settings</strong>.</li>
                    <li>Toggle <strong>Camera</strong> to <strong>Allow</strong>.</li>
                    <li>Tap the <strong>Reload Page</strong> button above.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-zinc-300">
                    <li>Tap the <strong>"aA" or Lock</strong> icon on the left of the address bar.</li>
                    <li>Tap <strong>Website Settings</strong>.</li>
                    <li>Set <strong>Camera</strong> to <strong>Allow</strong>.</li>
                    <li>Tap <strong>Reload Page</strong> above.</li>
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Viewfinder Overlay with corner markers & scan line */}
      {hasPermission && !isPaused && (
        <div id="viewfinder-overlay" className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {/* Subtle dim border */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Central QR Target Box */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center overflow-hidden">
            {/* 4 Crisp Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

            {/* Dynamic Sweeping Laser Beam with Emerald Glow */}
            <div className="absolute inset-x-0 w-full animate-laser-sweep pointer-events-none">
              {/* Laser core line */}
              <div className="w-full h-[2.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981]" />
              {/* Diffuse laser gradient aura */}
              <div className="w-full h-8 bg-gradient-to-b from-emerald-500/25 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Low Light Warning & Torch Shortcut Notification */}
          {isLowLight && !torchOn && hasTorch && (
            <div className="absolute top-20 inset-x-6 flex justify-center pointer-events-auto z-30 animate-in fade-in slide-in-from-top-2 duration-300">
              <button
                type="button"
                onClick={() => {
                  playClickFeedback();
                  triggerHaptic(30);
                  handleToggleTorch();
                }}
                className="px-3.5 py-1.5 rounded-full bg-amber-500/90 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xl flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all"
              >
                <Moon className="w-3.5 h-3.5 fill-current" />
                <span>Too dark to scan? Tap for Flashlight</span>
                <Zap className="w-3.5 h-3.5 fill-current text-zinc-950" />
              </button>
            </div>
          )}

          {/* Instructional text & Quick Select Gallery Button */}
          <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-2.5 z-10 px-4 pointer-events-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white/90 text-xs font-medium tracking-wide shadow-lg border border-white/10">
              Align QR code within frame
            </span>

            {/* Direct File Picker Trigger Button to select QR image from storage */}
            <button
              id="btn-select-image-storage-bottom"
              type="button"
              onClick={() => {
                playClickFeedback();
                triggerHaptic(25);
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 bg-zinc-900/90 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 border border-zinc-700/80 rounded-full text-xs font-semibold backdrop-blur-md shadow-xl flex items-center gap-2 transition-all active:scale-95 hover:border-emerald-500/40"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scan QR from Gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Controls at Top (Flashlight, Flip, Upload Image) - Only rendered when camera is active */}
      {hasPermission && (
        <div id="floating-scanner-controls" className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-auto z-20">
          {/* Flashlight toggle */}
          {hasTorch ? (
            <button
              id="btn-torch-toggle"
              type="button"
              onClick={() => {
                playClickFeedback();
                triggerHaptic(25);
                handleToggleTorch();
              }}
              className={`p-3 rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 ${
                torchOn
                  ? 'bg-amber-400 text-zinc-950 ring-2 ring-amber-300'
                  : 'bg-black/60 hover:bg-black/80 text-white'
              }`}
              title="Toggle Flash"
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-11" />
          )}

          {/* Action Controls: File Picker & Switch Camera */}
          <div className="flex items-center gap-2">
            {/* File picker button with label & icon to select image from storage */}
            <button
              id="btn-upload-image-scan"
              type="button"
              onClick={() => {
                playClickFeedback();
                triggerHaptic(25);
                fileInputRef.current?.click();
              }}
              className="px-3.5 py-2.5 bg-black/70 hover:bg-black/90 active:bg-zinc-800 text-white rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 flex items-center gap-2 text-xs font-semibold active:scale-95"
              title="Select image from device storage"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Gallery</span>
            </button>

            {/* Switch front/back camera if multiple exist */}
            {cameras.length > 1 && (
              <button
                id="btn-switch-camera"
                type="button"
                onClick={() => {
                  playClickFeedback();
                  triggerHaptic(35);
                  handleSwitchCamera();
                }}
                className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 active:rotate-180"
                title="Switch Camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Image Cropper Modal for Screenshots & Photos */}
      <ImageCropperModal
        imageFile={selectedCropFile}
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedCropFile(null);
          startCamera(currentCameraIndex);
        }}
        onScanSuccess={(decoded) => {
          setShowCropModal(false);
          setSelectedCropFile(null);
          onScan(decoded);
        }}
      />
    </div>
  );
}
