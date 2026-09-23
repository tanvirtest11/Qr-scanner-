import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
  X,
  Check,
  RotateCw,
  RefreshCw,
  AlertCircle,
  Loader2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { decodeQRFromCanvas, decodeQRFromImageFile, playClickFeedback, triggerHaptic } from '../utils/qrParser';

interface ImageCropperModalProps {
  imageFile: File | null;
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

/**
 * Creates an HTMLCanvasElement containing the cropped & rotated image region.
 * Uses the preloaded HTMLImageElement directly without CORS overhead on local blobs.
 */
function getCroppedImgCanvas(
  image: HTMLImageElement,
  pixelCrop: Area,
  rotation = 0
): HTMLCanvasElement {
  const imgWidth = image.naturalWidth || image.width;
  const imgHeight = image.naturalHeight || image.height;

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = calculateRotatedBox(
    imgWidth,
    imgHeight,
    rotation
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bBoxWidth));
  canvas.height = Math.max(1, Math.round(bBoxHeight));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas context could not be created');
  }

  // Draw rotated image centered
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotRad);
  ctx.translate(-imgWidth / 2, -imgHeight / 2);
  ctx.drawImage(image, 0, 0);

  // Extract pixel crop safely even if dragged outside canvas
  const cropW = Math.max(1, Math.round(pixelCrop.width));
  const cropH = Math.max(1, Math.round(pixelCrop.height));

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });
  if (!croppedCtx) {
    throw new Error('Cropped canvas context could not be created');
  }

  // White background for quiet-zone safety
  croppedCtx.fillStyle = '#ffffff';
  croppedCtx.fillRect(0, 0, cropW, cropH);

  // Draw region from full rotated canvas to crop canvas
  croppedCtx.drawImage(
    canvas,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  return croppedCanvas;
}

function calculateRotatedBox(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

export default function ImageCropperModal({
  imageFile,
  isOpen,
  onClose,
  onScanSuccess,
}: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(1); // 1:1 square by default like uCrop
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);

  // Instant Image Loading from File via ObjectURL with FileReader backup
  useEffect(() => {
    if (!imageFile || !isOpen) {
      setImageSrc(null);
      setLoadedImg(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setErrorMessage(null);
      setIsImageLoading(false);
      return;
    }

    let isSubscribed = true;
    setIsImageLoading(true);
    setErrorMessage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(1);

    let blobUrl: string | null = null;
    try {
      blobUrl = URL.createObjectURL(imageFile);
      setImageSrc(blobUrl);

      const testImg = new Image();
      testImg.onload = () => {
        if (!isSubscribed) return;
        setLoadedImg(testImg);
        setIsImageLoading(false);
      };
      testImg.onerror = () => {
        // Fallback to FileReader if objectURL fails on certain mobile memory constraints
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!isSubscribed) return;
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            setImageSrc(dataUrl);
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              if (isSubscribed) {
                setLoadedImg(fallbackImg);
                setIsImageLoading(false);
              }
            };
            fallbackImg.src = dataUrl;
          }
        };
        reader.onerror = () => {
          if (isSubscribed) {
            setIsImageLoading(false);
            setErrorMessage('Could not load image from gallery. Please try another photo.');
          }
        };
        reader.readAsDataURL(imageFile);
      };
      testImg.src = blobUrl;
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!isSubscribed) return;
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setImageSrc(dataUrl);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            if (isSubscribed) {
              setLoadedImg(fallbackImg);
              setIsImageLoading(false);
            }
          };
          fallbackImg.src = dataUrl;
        }
      };
      reader.readAsDataURL(imageFile);
    }

    return () => {
      isSubscribed = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageFile, isOpen]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setErrorMessage(null);
  };

  // Reset Zoom & Pan
  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(1);
    setErrorMessage(null);
  };

  // Toggle Free Aspect / Square
  const handleToggleAspect = () => {
    setAspect((prev) => (prev === 1 ? undefined : 1));
  };

  // Auto Scan Full Image
  const handleAutoScanFull = async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const decoded = await decodeQRFromImageFile(imageFile);
      if (decoded && decoded.trim().length > 0) {
        onScanSuccess(decoded);
      } else {
        setErrorMessage('No QR code detected in this entire image. Please select an image containing a valid QR code.');
      }
    } catch {
      setErrorMessage('Could not scan image. Please try another photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Crop & Scan execution
  const handleCropAndScan = async () => {
    if (!imageFile || !croppedAreaPixels) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Ensure image element is ready
      let activeImg = loadedImg;
      if (!activeImg && imageSrc) {
        activeImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
          img.src = imageSrc;
        });
      }

      if (!activeImg) {
        throw new Error('Image not loaded yet');
      }

      // 1. Generate cropped canvas exactly at pixelCrop coordinates
      const croppedCanvas = getCroppedImgCanvas(
        activeImg,
        croppedAreaPixels,
        rotation
      );

      // 2. Decode with multi-pass QR engine (including quiet-zone padding & contrast boosts)
      let decoded = await decodeQRFromCanvas(croppedCanvas);

      // 3. Fallback: If not decoded from tight crop, try expanding bounds by 20%
      if (!decoded) {
        try {
          const expW = Math.round(croppedAreaPixels.width * 1.25);
          const expH = Math.round(croppedAreaPixels.height * 1.25);
          const expX = Math.max(0, Math.round(croppedAreaPixels.x - croppedAreaPixels.width * 0.12));
          const expY = Math.max(0, Math.round(croppedAreaPixels.y - croppedAreaPixels.height * 0.12));
          const expandedCrop: Area = {
            x: expX,
            y: expY,
            width: expW,
            height: expH,
          };
          const expCanvas = getCroppedImgCanvas(activeImg, expandedCrop, rotation);
          decoded = await decodeQRFromCanvas(expCanvas);
        } catch {
          // ignore
        }
      }

      // 4. Fallback: If still not decoded, scan original file directly
      if (!decoded) {
        decoded = await decodeQRFromImageFile(imageFile);
      }

      if (decoded && decoded.trim().length > 0) {
        onScanSuccess(decoded);
      } else {
        setErrorMessage(
          'No QR code found in this image or selected area. Please choose an image with a valid QR code.'
        );
      }
    } catch (err: unknown) {
      console.error('Crop error:', err);
      setErrorMessage(
        'No QR code found in this image. Please select a photo containing a clear QR code.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageFile || !imageSrc) return null;

  return (
    <div
      id="ucrop-cropper-modal-overlay"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between items-center select-none animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top Header */}
      <header className="w-full max-w-[440px] px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between z-20">
        <button
          id="btn-close-cropper"
          type="button"
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-all active:scale-95"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold text-white leading-tight">Crop & Scan QR</h2>
          <p className="text-[10px] text-zinc-400">Pinch or drag to position QR code</p>
        </div>

        <button
          id="btn-auto-full-scan"
          type="button"
          onClick={handleAutoScanFull}
          disabled={isProcessing || isImageLoading}
          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          title="Scan entire image automatically"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto Scan</span>
        </button>
      </header>

      {/* Main Cropper Container (Powered by react-easy-crop, exactly like uCrop) */}
      <main className="flex-1 w-full max-w-[440px] relative overflow-hidden bg-black flex items-center justify-center">
        {isImageLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/80 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-zinc-400">Loading photo from gallery...</p>
          </div>
        )}

        <div className="absolute inset-0">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            showGrid={true}
            cropSize={aspect === 1 ? { width: 260, height: 260 } : undefined}
            minZoom={0.5}
            maxZoom={10}
            zoomSpeed={0.8}
            restrictPosition={false}
            style={{
              containerStyle: { backgroundColor: '#09090b', touchAction: 'none' },
              cropAreaStyle: {
                borderColor: '#10b981',
                borderWidth: '2px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
              },
            }}
          />
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            id="cropper-error-banner"
            className="absolute bottom-4 inset-x-4 p-3 bg-rose-950/95 border border-rose-800 rounded-xl flex items-center gap-2.5 text-xs text-rose-200 z-40 shadow-2xl animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="flex-1 leading-relaxed">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>

      {/* Bottom Controls */}
      <footer className="w-full max-w-[440px] p-4 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-3 z-20">
        {/* Zoom Slider Control */}
        <div className="flex items-center gap-3 px-2 py-1 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
          <ZoomOut className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="range"
            min={0.5}
            max={6}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            title="Zoom"
          />
          <ZoomIn className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="text-[11px] font-mono text-zinc-400 w-9 text-right">
            {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center justify-between gap-2">
          {/* Rotate 90° */}
          <button
            id="btn-cropper-rotate"
            type="button"
            onClick={() => {
              playClickFeedback();
              triggerHaptic(20);
              handleRotate();
            }}
            disabled={isProcessing}
            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Rotate image 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rotate 90°</span>
          </button>

          {/* Aspect Ratio Toggle (1:1 Square vs Free) */}
          <button
            id="btn-cropper-aspect"
            type="button"
            onClick={() => {
              playClickFeedback();
              triggerHaptic(20);
              handleToggleAspect();
            }}
            disabled={isProcessing}
            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Toggle Square / Free ratio"
          >
            <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>{aspect === 1 ? 'Square (1:1)' : 'Free Ratio'}</span>
          </button>

          {/* Reset */}
          <button
            id="btn-cropper-reset"
            type="button"
            onClick={() => {
              playClickFeedback();
              triggerHaptic(20);
              handleReset();
            }}
            disabled={isProcessing}
            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Reset position and zoom"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reset</span>
          </button>
        </div>

        {/* Primary Action Button: Crop & Scan */}
        <button
          id="btn-confirm-crop-scan"
          type="button"
          onClick={() => {
            playClickFeedback();
            triggerHaptic(30);
            handleCropAndScan();
          }}
          disabled={isProcessing || isImageLoading}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-98 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Crop...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Crop & Scan</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
