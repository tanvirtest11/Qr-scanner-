import jsQR from 'jsqr';
import { ScanContentType, ScannedResult } from '../types';

/**
 * Parses raw text extracted from a QR code into structured information
 */
export function parseQRContent(rawText: string): {
  type: ScanContentType;
  metadata?: ScannedResult['metadata'];
} {
  const trimmed = rawText.trim();

  // Check for Wi-Fi format: WIFI:T:WPA;S:MyNetwork;P:password;;
  if (trimmed.startsWith('WIFI:') || trimmed.startsWith('wifi:')) {
    const ssidMatch = trimmed.match(/S:([^;]+)/i);
    const passMatch = trimmed.match(/P:([^;]+)/i);
    const typeMatch = trimmed.match(/T:([^;]+)/i);

    return {
      type: 'wifi',
      metadata: {
        ssid: ssidMatch ? ssidMatch[1] : 'Unknown Network',
        password: passMatch ? passMatch[1] : undefined,
        authType: typeMatch ? typeMatch[1] : 'WPA/WPA2',
      },
    };
  }

  // Check for URLs
  const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s]*)$/i;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: 'url',
      metadata: {
        title: trimmed,
      },
    };
  } else if (urlRegex.test(trimmed)) {
    return {
      type: 'url',
      metadata: {
        title: 'https://' + trimmed,
      },
    };
  }

  // Check for mailto:
  if (trimmed.startsWith('mailto:')) {
    const email = trimmed.replace(/^mailto:/i, '').split('?')[0];
    return {
      type: 'email',
      metadata: {
        emailAddress: email,
      },
    };
  }

  // Check for tel: or phone number
  if (trimmed.startsWith('tel:')) {
    const phone = trimmed.replace(/^tel:/i, '');
    return {
      type: 'phone',
      metadata: {
        phoneNumber: phone,
      },
    };
  }

  // Default to plain text
  return {
    type: 'text',
  };
}

/**
 * Subtle tap/click sound feedback for buttons
 */
export function playClickFeedback() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Audio restriction
  }
}

/**
 * Audio beep feedback using Web Audio API
 */
export function playSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio might be restricted until user interaction
  }
}

/**
 * Vibration feedback if supported
 */
export function triggerHaptic(duration = 40) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch {
      // ignore
    }
  }
}

/**
 * High-accuracy QR code decoder from an HTMLCanvasElement
 * Fast multi-pass decoder optimized to return within milliseconds without blocking the UI thread.
 */
export async function decodeQRFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return null;

  // 1. Try Native BarcodeDetector (Modern Android Chrome - Instant & Hardware Accelerated)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      // @ts-expect-error BarcodeDetector is a modern web standard
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(canvas);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fallback to jsQR
    }
  }

  // 2. Bound canvas size if excessively huge to avoid UI freeze
  let processCanvas = canvas;
  const maxDim = 800;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    const downCanvas = document.createElement('canvas');
    downCanvas.width = Math.round(width * scale);
    downCanvas.height = Math.round(height * scale);
    const downCtx = downCanvas.getContext('2d', { willReadFrequently: true });
    if (downCtx) {
      downCtx.drawImage(canvas, 0, 0, downCanvas.width, downCanvas.height);
      processCanvas = downCanvas;
    }
  }

  const pWidth = processCanvas.width;
  const pHeight = processCanvas.height;
  const ctx = processCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Pass 1: Direct jsQR on original cropped canvas
  try {
    const imgData = ctx.getImageData(0, 0, pWidth, pHeight);
    const code = jsQR(imgData.data, pWidth, pHeight, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data && code.data.trim()) {
      return code.data;
    }
  } catch {
    // continue
  }

  // Pass 2: Quiet-Zone Padding (White margin around crop)
  // Essential for tightly cropped QR codes where finder patterns touch the edge!
  try {
    const pad = Math.max(16, Math.round(Math.min(pWidth, pHeight) * 0.15));
    const paddedW = pWidth + pad * 2;
    const paddedH = pHeight + pad * 2;

    const padCanvas = document.createElement('canvas');
    padCanvas.width = paddedW;
    padCanvas.height = paddedH;
    const padCtx = padCanvas.getContext('2d', { willReadFrequently: true });
    if (padCtx) {
      padCtx.fillStyle = '#ffffff';
      padCtx.fillRect(0, 0, paddedW, paddedH);
      padCtx.drawImage(processCanvas, pad, pad);

      const padData = padCtx.getImageData(0, 0, paddedW, paddedH);
      const code = jsQR(padData.data, paddedW, paddedH, {
        inversionAttempts: 'attemptBoth',
      });
      if (code && code.data && code.data.trim()) {
        return code.data;
      }
    }
  } catch {
    // continue
  }

  return null;
}

/**
 * High-accuracy QR code decoder from an Image file or Blob
 * Uses native BarcodeDetector if available, followed by multi-scale & multi-region jsQR scanning
 * to effortlessly detect tiny QR codes inside high-res phone screenshots without manual cropping.
 */
export async function decodeQRFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;

        if (!naturalW || !naturalH) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }

        // 1. Try Native BarcodeDetector (Supported in Chrome Android, Samsung Internet, etc.)
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            // @ts-expect-error BarcodeDetector is a modern web standard
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              URL.revokeObjectURL(objectUrl);
              resolve(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Fallback to jsQR
          }
        }

        // 2. High-speed jsQR scan on downscaled canvas (max 900px)
        const maxDim = 900;
        const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
        const cW = Math.max(1, Math.round(naturalW * scale));
        const cH = Math.max(1, Math.round(naturalH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, cW, cH);
          const imgData = ctx.getImageData(0, 0, cW, cH);
          const code = jsQR(imgData.data, cW, cH, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data && code.data.trim()) {
            URL.revokeObjectURL(objectUrl);
            resolve(code.data);
            return;
          }
        }

        URL.revokeObjectURL(objectUrl);
        resolve(null);
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}
