import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle, Sparkles } from 'lucide-react';
import { decodeQRFromImageFile } from '../utils/qrParser';
import QRCode from 'qrcode';

interface ImageScannerProps {
  onScan: (text: string) => void;
}

export default function ImageScanner({ onScan }: ImageScannerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file (.png, .jpg, .jpeg, .webp)');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);

    try {
      const decodedText = await decodeQRFromImageFile(file);
      if (decodedText && decodedText.trim().length > 0) {
        onScan(decodedText);
      } else {
        setErrorMessage('No QR code detected in this image. Please ensure the image is clear and try again.');
      }
    } catch {
      setErrorMessage('Failed to process image. Please try another image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Quick sample generator for instant testing
  const testSample = async (sampleData: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const dataUrl = await QRCode.toDataURL(sampleData, {
        width: 360,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      });
      setPreviewImage(dataUrl);

      // Convert data URL to Blob to test decode
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'sample_qr.png', { type: 'image/png' });
      const decoded = await decodeQRFromImageFile(file);
      if (decoded) {
        onScan(decoded);
      }
    } catch {
      setErrorMessage('Failed to generate sample QR code.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="image-scanner-wrapper" className="flex flex-col gap-5">
      {/* Drag and drop area */}
      <div
        id="image-dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[380px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]'
            : 'border-zinc-700 hover:border-emerald-500/60 bg-zinc-900/60 hover:bg-zinc-900/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {previewImage && !isProcessing && (
          <div className="absolute inset-0 p-4 flex items-center justify-center">
            <img
              src={previewImage}
              alt="QR Preview"
              className="max-h-full max-w-full rounded-lg object-contain border border-zinc-800 shadow-md"
            />
            <div className="absolute inset-0 bg-black/40 hover:bg-black/60 transition-colors rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 text-white text-xs font-medium">
              Click to select another image
            </div>
          </div>
        )}

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-200 text-sm font-medium">Scanning image...</span>
          </div>
        ) : !previewImage ? (
          <div className="flex flex-col items-center max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-emerald-400 mb-4 shadow-sm group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-zinc-100 font-semibold text-base mb-1">
              Upload or drag & drop an image
            </h4>
            <p className="text-zinc-400 text-xs mb-3">
              Select any screenshot or QR code photo (PNG, JPG, WebP)
            </p>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors">
              <ImageIcon className="w-3.5 h-3.5" />
              Choose File
            </span>
          </div>
        ) : null}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div
          id="image-scan-error"
          className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Test Samples */}
      <div id="quick-test-section" className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/80">
        <div className="flex items-center gap-2 mb-2.5 text-xs text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick test samples:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            id="sample-btn-website"
            type="button"
            onClick={() => testSample('https://www.google.com')}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-lg text-xs font-medium transition-colors border border-zinc-700/60"
          >
            🌐 Website URL
          </button>
          <button
            id="sample-btn-wifi"
            type="button"
            onClick={() => testSample('WIFI:T:WPA;S:Home_Broadband_5G;P:SecurePass9988;;')}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-lg text-xs font-medium transition-colors border border-zinc-700/60"
          >
            📶 Wi-Fi Network
          </button>
          <button
            id="sample-btn-text"
            type="button"
            onClick={() => testSample('Welcome! Your QR scanner is working smoothly and perfectly.')}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-lg text-xs font-medium transition-colors border border-zinc-700/60"
          >
            📝 Plain Text
          </button>
        </div>
      </div>
    </div>
  );
}
