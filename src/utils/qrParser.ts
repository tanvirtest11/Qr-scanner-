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
  const lower = trimmed.toLowerCase();

  // 1. Wi-Fi: WIFI:T:WPA;S:MyNetwork;P:password;;
  if (lower.startsWith('wifi:')) {
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

  // 2. UPI Payment: upi://pay?pa=...&pn=...&am=...
  if (lower.startsWith('upi://pay') || lower.startsWith('upi:')) {
    try {
      const url = new URL(trimmed.startsWith('upi://') ? trimmed : `upi://${trimmed.replace(/^upi:/, '')}`);
      const pa = url.searchParams.get('pa') || '';
      const pn = url.searchParams.get('pn') || '';
      const am = url.searchParams.get('am') || '';

      return {
        type: 'upi',
        metadata: {
          upiId: pa,
          upiPayee: pn ? decodeURIComponent(pn) : undefined,
          upiAmount: am ? am : undefined,
        },
      };
    } catch {
      const paMatch = trimmed.match(/[?&]pa=([^&]+)/i);
      const pnMatch = trimmed.match(/[?&]pn=([^&]+)/i);
      const amMatch = trimmed.match(/[?&]am=([^&]+)/i);
      return {
        type: 'upi',
        metadata: {
          upiId: paMatch ? decodeURIComponent(paMatch[1]) : undefined,
          upiPayee: pnMatch ? decodeURIComponent(pnMatch[1]) : undefined,
          upiAmount: amMatch ? amMatch[1] : undefined,
        },
      };
    }
  }

  // 3. vCard / Contact Card (BEGIN:VCARD ... END:VCARD or MECARD:...)
  if (lower.includes('begin:vcard') || lower.startsWith('mecard:')) {
    let name: string | undefined;
    let phone: string | undefined;
    let email: string | undefined;
    let org: string | undefined;
    let title: string | undefined;
    let url: string | undefined;

    if (lower.includes('begin:vcard')) {
      const fnMatch = trimmed.match(/FN:(.+)/i);
      const nMatch = trimmed.match(/N:(.+)/i);
      name = fnMatch ? fnMatch[1].trim() : (nMatch ? nMatch[1].replace(/;/g, ' ').trim() : undefined);

      const telMatch = trimmed.match(/TEL(?:;[^:]+)?:(.+)/i);
      phone = telMatch ? telMatch[1].trim() : undefined;

      const emailMatch = trimmed.match(/EMAIL(?:;[^:]+)?:(.+)/i);
      email = emailMatch ? emailMatch[1].trim() : undefined;

      const orgMatch = trimmed.match(/ORG:(.+)/i);
      org = orgMatch ? orgMatch[1].trim() : undefined;

      const titleMatch = trimmed.match(/TITLE:(.+)/i);
      title = titleMatch ? titleMatch[1].trim() : undefined;

      const urlMatch = trimmed.match(/URL:(.+)/i);
      url = urlMatch ? urlMatch[1].trim() : undefined;
    } else {
      // MECARD format: MECARD:N:Name;TEL:12345;EMAIL:test@test.com;;
      const nMatch = trimmed.match(/N:([^;]+)/i);
      const telMatch = trimmed.match(/TEL:([^;]+)/i);
      const emailMatch = trimmed.match(/EMAIL:([^;]+)/i);
      const orgMatch = trimmed.match(/ORG:([^;]+)/i);

      name = nMatch ? nMatch[1] : undefined;
      phone = telMatch ? telMatch[1] : undefined;
      email = emailMatch ? emailMatch[1] : undefined;
      org = orgMatch ? orgMatch[1] : undefined;
    }

    return {
      type: 'vcard',
      metadata: {
        contactName: name || 'Contact',
        contactPhone: phone,
        contactEmail: email,
        contactOrg: org,
        contactTitle: title,
        contactUrl: url,
      },
    };
  }

  // 4. Geo location: geo:37.786971,-122.399677 or Google Maps URL
  if (lower.startsWith('geo:')) {
    const coords = trimmed.replace(/^geo:/i, '').split('?')[0].split(',');
    if (coords.length >= 2) {
      return {
        type: 'geo',
        metadata: {
          latitude: coords[0].trim(),
          longitude: coords[1].trim(),
        },
      };
    }
  }

  // 5. Crypto addresses: bitcoin:, ethereum:, solana:
  if (lower.startsWith('bitcoin:') || lower.startsWith('ethereum:') || lower.startsWith('solana:') || /^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    const isBtc = lower.startsWith('bitcoin:');
    const isEth = lower.startsWith('ethereum:') || /^0x[a-fA-F0-9]{40}$/.test(trimmed);
    const isSol = lower.startsWith('solana:');

    let address = trimmed;
    if (isBtc) address = trimmed.replace(/^bitcoin:/i, '').split('?')[0];
    if (isEth) address = trimmed.replace(/^ethereum:/i, '').split('?')[0];
    if (isSol) address = trimmed.replace(/^solana:/i, '').split('?')[0];

    return {
      type: 'crypto',
      metadata: {
        cryptoCurrency: isBtc ? 'Bitcoin (BTC)' : (isEth ? 'Ethereum (ETH)' : (isSol ? 'Solana (SOL)' : 'Crypto')),
        cryptoAddress: address,
      },
    };
  }

  // 6. URLs
  const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s]*)$/i;
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
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

  // 7. Mailto
  if (lower.startsWith('mailto:')) {
    const email = trimmed.replace(/^mailto:/i, '').split('?')[0];
    return {
      type: 'email',
      metadata: {
        emailAddress: email,
      },
    };
  }

  // 8. Tel / Phone
  if (lower.startsWith('tel:') || lower.startsWith('telprompt:')) {
    const phone = trimmed.replace(/^(tel|telprompt):/i, '');
    return {
      type: 'phone',
      metadata: {
        phoneNumber: phone,
      },
    };
  }

  // Default: Plain Text
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
