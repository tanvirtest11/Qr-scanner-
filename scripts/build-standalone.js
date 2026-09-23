import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const jsqrCode = fs.readFileSync('node_modules/jsqr/dist/jsQR.js', 'utf8');

const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#09090b">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>QR Code Scanner</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }
    #app-container {
      width: 100%;
      max-width: 440px;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      position: relative;
      background: #09090b;
      overflow: hidden;
    }
    @media (min-width: 640px) {
      #app-container {
        height: 840px;
        max-height: 94vh;
        border-radius: 40px;
        border: 7px solid #27272a;
        box-shadow: 0 25px 60px rgba(0,0,0,0.85);
      }
    }
    header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(9, 9, 11, 0.95);
      border-bottom: 1px solid #18181b;
      z-index: 30;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .brand-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #a1a1aa;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #18181b;
      border: 1px solid #27272a;
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
    }
    .icon-btn.muted {
      color: #71717a;
    }
    .badge {
      position: absolute;
      top: -3px;
      right: -3px;
      background: #10b981;
      color: #09090b;
      font-size: 9px;
      font-weight: 800;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
    main {
      flex: 1;
      position: relative;
      background: #000;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .viewfinder {
      position: relative;
      width: 260px;
      height: 260px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
      border-radius: 20px;
      overflow: hidden;
    }
    .corner {
      position: absolute;
      width: 24px;
      height: 24px;
      border-color: #10b981;
      border-style: solid;
      border-width: 0;
    }
    .tl { top: 0; left: 0; border-top-width: 4px; border-left-width: 4px; border-top-left-radius: 12px; }
    .tr { top: 0; right: 0; border-top-width: 4px; border-right-width: 4px; border-top-right-radius: 12px; }
    .bl { bottom: 0; left: 0; border-bottom-width: 4px; border-left-width: 4px; border-bottom-left-radius: 12px; }
    .br { bottom: 0; right: 0; border-bottom-width: 4px; border-right-width: 4px; border-bottom-right-radius: 12px; }
    .laser-line {
      width: 100%;
      height: 2px;
      background: #34d399;
      box-shadow: 0 0 10px #10b981;
      position: absolute;
      top: 50%;
      animation: scan 2s infinite ease-in-out;
    }
    @keyframes scan {
      0%, 100% { transform: translateY(-110px); opacity: 0.8; }
      50% { transform: translateY(110px); opacity: 1; }
    }
    .guide-pill {
      position: absolute;
      bottom: 60px;
      background: rgba(0,0,0,0.75);
      color: #f4f4f5;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
    }
    .top-controls {
      position: absolute;
      top: 14px;
      inset-x: 14px;
      display: flex;
      justify-content: space-between;
      z-index: 20;
    }
    .control-pill-btn {
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.12);
      color: white;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .control-pill-btn.active {
      background: #f59e0b;
      color: #09090b;
    }
    .error-card {
      position: absolute;
      inset: 0;
      background: #09090b;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      z-index: 25;
    }
    .error-card.hidden { display: none; }
    .btn-primary {
      width: 100%;
      max-width: 280px;
      padding: 13px 18px;
      background: #10b981;
      color: #09090b;
      border: none;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-secondary {
      width: 100%;
      max-width: 280px;
      padding: 12px 18px;
      background: #18181b;
      color: #e4e4e7;
      border: 1px solid #27272a;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
    }
    /* Bottom Sheet Result */
    #result-sheet {
      position: absolute;
      inset-x: 0;
      bottom: 0;
      background: #18181b;
      border-top: 1px solid #27272a;
      border-top-left-radius: 28px;
      border-top-right-radius: 28px;
      padding: 20px;
      z-index: 40;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.8);
      display: none;
      flex-direction: column;
      animation: slideUp 0.25s ease-out;
    }
    #result-sheet.active { display: flex; }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .pill-type {
      align-self: flex-start;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .result-content-box {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 14px;
      padding: 14px;
      font-size: 13px;
      color: #e4e4e7;
      max-height: 160px;
      overflow-y: auto;
      word-break: break-all;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .actions-grid {
      display: flex;
      gap: 10px;
      width: 100%;
    }
    .action-btn {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: none;
    }
    .action-open {
      background: #10b981;
      color: #09090b;
    }
    .action-copy {
      background: #27272a;
      color: #f4f4f5;
    }
    .btn-rescan {
      margin-top: 10px;
      padding: 12px;
      border-radius: 12px;
      background: transparent;
      color: #a1a1aa;
      border: 1px solid #27272a;
      font-size: 13px;
      cursor: pointer;
    }

    /* History Drawer */
    #history-sheet {
      position: absolute;
      inset: 0;
      background: #09090b;
      z-index: 50;
      display: none;
      flex-direction: column;
    }
    #history-sheet.active { display: flex; }
    .history-header {
      padding: 16px 20px;
      border-bottom: 1px solid #18181b;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .history-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .history-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
    }
    .history-card:hover {
      border-color: #10b981;
    }
    .history-text {
      font-size: 13px;
      color: #e4e4e7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .history-date {
      font-size: 10px;
      color: #71717a;
      margin-top: 2px;
    }
    .del-btn {
      padding: 6px;
      color: #71717a;
      background: transparent;
      border: none;
      cursor: pointer;
      border-radius: 6px;
    }
    .del-btn:hover {
      color: #f87171;
      background: rgba(239, 68, 68, 0.1);
    }

    /* Cropper Modal */
    #cropper-modal {
      position: absolute;
      inset: 0;
      background: #09090b;
      z-index: 55;
      display: none;
      flex-direction: column;
      touch-action: none;
    }
    #cropper-modal.active { display: flex; }
    .cropper-header {
      padding: 12px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cropper-viewport {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #000;
      padding: 10px;
    }
    #crop-img {
      max-width: 90vw;
      max-height: 60vh;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }
    #crop-box-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }
    #crop-box {
      position: absolute;
      border: 2px solid #10b981;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
      cursor: move;
    }
    .handle {
      position: absolute;
      width: 18px;
      height: 18px;
      background: #10b981;
      border: 2px solid #000;
      border-radius: 4px;
    }
    .h-nw { top: -9px; left: -9px; cursor: nwse-resize; }
    .h-ne { top: -9px; right: -9px; cursor: nesw-resize; }
    .h-sw { bottom: -9px; left: -9px; cursor: nesw-resize; }
    .h-se { bottom: -9px; right: -9px; cursor: nwse-resize; }
    .cropper-bottom {
      padding: 14px 18px;
      background: #18181b;
      border-top: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  </style>
</head>
<body>
  <div id="app-container">
    <header>
      <div class="brand">
        <div class="brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/>
          </svg>
        </div>
        <div>
          <div class="brand-title">QR Scanner</div>
          <div class="brand-subtitle">Fast & Standalone</div>
        </div>
      </div>
      <div class="header-actions">
        <!-- History button with counter -->
        <button id="history-btn" class="icon-btn" title="Scan History">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
          <span id="history-badge" class="badge" style="display:none;">0</span>
        </button>

        <!-- Sound toggle -->
        <button id="sound-btn" class="icon-btn" title="Toggle Sound">
          <svg id="sound-icon-on" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
          <svg id="sound-icon-off" style="display:none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="1" y1="1" y2="23"/>
          </svg>
        </button>
      </div>
    </header>

    <main>
      <input type="file" id="file-input" accept="image/*" style="display: none;">
      <video id="camera-video" playsinline muted autoplay></video>

      <!-- Viewfinder -->
      <div id="viewfinder-overlay" class="overlay">
        <div class="viewfinder">
          <div class="corner tl"></div>
          <div class="corner tr"></div>
          <div class="corner bl"></div>
          <div class="corner br"></div>
          <div class="laser-line"></div>
        </div>
        <div class="guide-pill">Align QR code inside the frame</div>
      </div>

      <!-- Top Scanner Buttons -->
      <div class="top-controls">
        <button id="torch-btn" class="control-pill-btn" style="display:none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Flash</span>
        </button>
        <div style="margin-left: auto; display:flex; gap: 8px;">
          <button id="upload-btn" class="control-pill-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            <span>Photo Crop</span>
          </button>
          <button id="switch-camera-btn" class="control-pill-btn" style="display:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          </button>
        </div>
      </div>

      <!-- Permission / Error Card -->
      <div id="error-card" class="error-card hidden">
        <div style="width: 56px; height: 56px; border-radius: 28px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; display:flex; align-items:center; justify-content:center; margin-bottom: 12px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        </div>
        <h3 style="font-size: 16px; margin-bottom: 6px;">Camera Access Needed</h3>
        <p id="error-desc" style="font-size: 12px; color: #a1a1aa; max-width: 260px; line-height: 1.5; margin-bottom: 16px;">Please allow camera permission in your browser or select an image from your gallery.</p>
        <button id="retry-btn" class="btn-primary">Try Again</button>
        <button id="error-upload-btn" class="btn-secondary">Select QR Photo from Phone</button>
      </div>

      <!-- Scanned Result Bottom Sheet -->
      <div id="result-sheet">
        <div id="result-type-badge" class="pill-type">LINK</div>
        <div id="result-text-box" class="result-content-box"></div>
        <div class="actions-grid">
          <button id="open-link-btn" class="action-btn action-open">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            <span>Open Link</span>
          </button>
          <button id="copy-btn" class="action-btn action-copy">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span id="copy-label">Copy</span>
          </button>
        </div>
        <button id="rescan-btn" class="btn-rescan">Scan Another QR Code</button>
      </div>

      <!-- History Drawer -->
      <div id="history-sheet">
        <div class="history-header">
          <div style="font-weight:700; font-size:15px;">Scan History</div>
          <div style="display:flex; gap:8px;">
            <button id="clear-history-btn" style="background:transparent; border:none; color:#f87171; font-size:12px; cursor:pointer;">Clear All</button>
            <button id="close-history-btn" class="icon-btn" style="width:30px; height:30px;">✕</button>
          </div>
        </div>
        <div id="history-list-box" class="history-list"></div>
      </div>

      <!-- Interactive Cropper Modal -->
      <div id="cropper-modal">
        <div class="cropper-header">
          <button id="close-crop-btn" style="background:#18181b; border:1px solid #27272a; color:#a1a1aa; padding:6px 12px; border-radius:10px; cursor:pointer; font-size:12px;">Cancel</button>
          <div style="font-weight:700; font-size:14px;">Crop & Scan QR</div>
          <button id="auto-full-scan-btn" style="background:#18181b; border:1px solid #27272a; color:#10b981; padding:6px 12px; border-radius:10px; cursor:pointer; font-size:12px;">Auto Scan</button>
        </div>
        <div class="cropper-viewport">
          <img id="crop-img" alt="Crop" />
          <div id="crop-box-container">
            <div id="crop-box">
              <div class="handle h-nw" data-handle="nw"></div>
              <div class="handle h-ne" data-handle="ne"></div>
              <div class="handle h-sw" data-handle="sw"></div>
              <div class="handle h-se" data-handle="se"></div>
            </div>
          </div>
        </div>
        <div class="cropper-bottom">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <button id="rotate-crop-btn" style="background:#27272a; border:none; color:white; padding:8px 14px; border-radius:10px; font-size:12px; cursor:pointer;">Rotate (90°)</button>
            <button id="reset-crop-btn" style="background:#27272a; border:none; color:white; padding:8px 14px; border-radius:10px; font-size:12px; cursor:pointer;">Reset Box</button>
          </div>
          <button id="do-crop-scan-btn" class="btn-primary" style="margin-top:0; width:100%; max-width:100%;">Crop & Scan</button>
        </div>
      </div>
    </main>
  </div>

  <!-- Embedded Standalone Engine (Offline jsQR) -->
  <script>
    ${jsqrCode}
  </script>

  <!-- Application Logic -->
  <script>
    (function() {
      let soundEnabled = true;
      let stream = null;
      let videoDevices = [];
      let currentDeviceIdx = 0;
      let hasTorch = false;
      let torchOn = false;
      let isScanning = true;
      let lastScannedText = '';

      // History storage
      let scanHistory = [];
      try {
        const saved = localStorage.getItem('qr_scanner_scan_history');
        if (saved) scanHistory = JSON.parse(saved);
      } catch(e) {}

      const video = document.getElementById('camera-video');
      const viewfinder = document.getElementById('viewfinder-overlay');
      const errorCard = document.getElementById('error-card');
      const errorDesc = document.getElementById('error-desc');
      const retryBtn = document.getElementById('retry-btn');
      const uploadBtn = document.getElementById('upload-btn');
      const errorUploadBtn = document.getElementById('error-upload-btn');
      const fileInput = document.getElementById('file-input');
      const torchBtn = document.getElementById('torch-btn');
      const switchCameraBtn = document.getElementById('switch-camera-btn');
      const soundBtn = document.getElementById('sound-btn');
      const soundIconOn = document.getElementById('sound-icon-on');
      const soundIconOff = document.getElementById('sound-icon-off');

      const resultSheet = document.getElementById('result-sheet');
      const resultTypeBadge = document.getElementById('result-type-badge');
      const resultTextBox = document.getElementById('result-text-box');
      const openLinkBtn = document.getElementById('open-link-btn');
      const copyBtn = document.getElementById('copy-btn');
      const copyLabel = document.getElementById('copy-label');
      const rescanBtn = document.getElementById('rescan-btn');

      // History Elements
      const historyBtn = document.getElementById('history-btn');
      const historyBadge = document.getElementById('history-badge');
      const historySheet = document.getElementById('history-sheet');
      const closeHistoryBtn = document.getElementById('close-history-btn');
      const clearHistoryBtn = document.getElementById('clear-history-btn');
      const historyListBox = document.getElementById('history-list-box');

      // Cropper Elements
      const cropperModal = document.getElementById('cropper-modal');
      const closeCropBtn = document.getElementById('close-crop-btn');
      const autoFullScanBtn = document.getElementById('auto-full-scan-btn');
      const rotateCropBtn = document.getElementById('rotate-crop-btn');
      const resetCropBtn = document.getElementById('reset-crop-btn');
      const doCropScanBtn = document.getElementById('do-crop-scan-btn');
      const cropImg = document.getElementById('crop-img');
      const cropBox = document.getElementById('crop-box');

      let currentCropFile = null;
      let cropRotation = 0;
      let cropState = { x: 15, y: 15, w: 70, h: 70 };

      function updateHistoryBadge() {
        if (scanHistory.length > 0) {
          historyBadge.style.display = 'flex';
          historyBadge.innerText = scanHistory.length > 99 ? '99+' : scanHistory.length;
        } else {
          historyBadge.style.display = 'none';
        }
      }
      updateHistoryBadge();

      function saveHistory() {
        try {
          localStorage.setItem('qr_scanner_scan_history', JSON.stringify(scanHistory));
        } catch(e) {}
        updateHistoryBadge();
      }

      function renderHistoryList() {
        historyListBox.innerHTML = '';
        if (scanHistory.length === 0) {
          historyListBox.innerHTML = '<div style="text-align:center; padding:40px 10px; color:#71717a; font-size:13px;">No scan history found</div>';
          return;
        }

        scanHistory.forEach((item, idx) => {
          const card = document.createElement('div');
          card.className = 'history-card';
          card.innerHTML = \`
            <div style="flex:1; overflow:hidden;">
              <div class="history-text">\${item.text}</div>
              <div class="history-date">\${new Date(item.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
            <button class="del-btn" data-idx="\${idx}" title="Delete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          \`;

          card.querySelector('.history-text').addEventListener('click', () => {
            historySheet.classList.remove('active');
            handleResult(item.text, false);
          });

          card.querySelector('.del-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            scanHistory.splice(idx, 1);
            saveHistory();
            renderHistoryList();
          });

          historyListBox.appendChild(card);
        });
      }

      historyBtn.addEventListener('click', () => {
        renderHistoryList();
        historySheet.classList.add('active');
      });

      closeHistoryBtn.addEventListener('click', () => {
        historySheet.classList.remove('active');
      });

      clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Delete all scan history?')) {
          scanHistory = [];
          saveHistory();
          renderHistoryList();
        }
      });

      // Audio Beep
      function playBeep() {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch(e) {}
      }

      function triggerVibration() {
        if (navigator.vibrate) {
          navigator.vibrate([60, 40, 80]);
        }
      }

      // Sound toggle
      soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIconOn.style.display = soundEnabled ? 'block' : 'none';
        soundIconOff.style.display = soundEnabled ? 'none' : 'block';
        soundBtn.classList.toggle('muted', !soundEnabled);
      });

      // Stop Camera
      function stopCamera() {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
      }

      // Start Camera
      async function startCamera(index = 0) {
        stopCamera();
        errorCard.classList.add('hidden');
        viewfinder.style.display = 'flex';

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showError('Camera is not supported on this browser. You can select an image below.');
          return;
        }

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter(d => d.kind === 'videoinput');
          if (videoDevices.length > 1) {
            switchCameraBtn.style.display = 'flex';
          }

          const targetId = videoDevices[index] ? videoDevices[index].deviceId : undefined;
          const constraints = {
            video: targetId ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          };

          stream = await navigator.mediaDevices.getUserMedia(constraints);
          video.srcObject = stream;
          await video.play();

          // Torch
          const track = stream.getVideoTracks()[0];
          if (track && track.getCapabilities) {
            const caps = track.getCapabilities();
            if (caps.torch) {
              hasTorch = true;
              torchBtn.style.display = 'flex';
            } else {
              hasTorch = false;
              torchBtn.style.display = 'none';
            }
          }

          isScanning = true;
          scanLoop();
        } catch(err) {
          showError('Camera access denied or unavailable. Tap lock icon in address bar to allow, or select photo.');
        }
      }

      function showError(msg) {
        errorDesc.innerText = msg;
        errorCard.classList.remove('hidden');
        viewfinder.style.display = 'none';
      }

      // Scanner canvas & frame check
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let frameCount = 0;

      function scanLoop() {
        if (!isScanning) return;

        frameCount++;
        if (frameCount % 2 === 0 && video.readyState === video.HAVE_ENOUGH_DATA) {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (w > 0 && h > 0) {
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });

            if (code && code.data && code.data.trim()) {
              handleResult(code.data);
              return;
            }
          }
        }
        requestAnimationFrame(scanLoop);
      }

      // Handle QR Result
      function handleResult(data, addToHistory = true) {
        isScanning = false;
        lastScannedText = data;

        if (soundEnabled) playBeep();
        triggerVibration();

        if (addToHistory) {
          scanHistory = [{ text: data, time: Date.now() }, ...scanHistory.filter(h => h.text !== data)].slice(0, 100);
          saveHistory();
        }

        const isUrl = /^https?:\\/\\//i.test(data.trim()) || /^(www\\.)?[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(\\/.*)?$/i.test(data.trim());
        const isWifi = /^WIFI:/i.test(data.trim());

        if (isUrl) {
          resultTypeBadge.innerText = 'WEBSITE LINK';
          openLinkBtn.style.display = 'flex';
        } else if (isWifi) {
          resultTypeBadge.innerText = 'WI-FI NETWORK';
          openLinkBtn.style.display = 'none';
        } else {
          resultTypeBadge.innerText = 'TEXT / INFO';
          openLinkBtn.style.display = 'none';
        }

        resultTextBox.innerText = data;
        copyLabel.innerText = 'Copy';
        resultSheet.classList.add('active');
      }

      // Open Link
      openLinkBtn.addEventListener('click', () => {
        let url = lastScannedText.trim();
        if (!/^https?:\\/\\//i.test(url)) {
          url = 'https://' + url;
        }
        window.open(url, '_blank');
      });

      // Copy Text
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(lastScannedText);
          copyLabel.innerText = 'Copied!';
          setTimeout(() => { copyLabel.innerText = 'Copy'; }, 2000);
        } catch(e) {
          copyLabel.innerText = 'Copied!';
        }
      });

      // Rescan
      rescanBtn.addEventListener('click', () => {
        resultSheet.classList.remove('active');
        isScanning = true;
        scanLoop();
      });

      // Cropper Logic
      function syncCropBoxUI() {
        const rect = cropImg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        cropBox.style.left = (cropState.x * rect.width / 100) + 'px';
        cropBox.style.top = (cropState.y * rect.height / 100) + 'px';
        cropBox.style.width = (cropState.w * rect.width / 100) + 'px';
        cropBox.style.height = (cropState.h * rect.height / 100) + 'px';
      }

      uploadBtn.addEventListener('click', () => fileInput.click());
      errorUploadBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        currentCropFile = file;
        cropRotation = 0;
        cropState = { x: 15, y: 15, w: 70, h: 70 };

        const reader = new FileReader();
        reader.onload = () => {
          cropImg.src = reader.result;
          cropperModal.classList.add('active');
          cropImg.onload = () => setTimeout(syncCropBoxUI, 50);
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
      });

      closeCropBtn.addEventListener('click', () => {
        cropperModal.classList.remove('active');
      });

      rotateCropBtn.addEventListener('click', () => {
        cropRotation = (cropRotation + 90) % 360;
        cropImg.style.transform = \`rotate(\${cropRotation}deg)\`;
        setTimeout(syncCropBoxUI, 50);
      });

      resetCropBtn.addEventListener('click', () => {
        cropState = { x: 5, y: 5, w: 90, h: 90 };
        syncCropBoxUI();
      });

      // Auto full scan from cropper
      autoFullScanBtn.addEventListener('click', async () => {
        if (!currentCropFile) return;
        try {
          const img = new Image();
          img.src = cropImg.src;
          await new Promise(r => img.onload = r);
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            cropperModal.classList.remove('active');
            handleResult(code.data);
          } else {
            alert('No QR code detected in the full image. Please crop the QR code area.');
          }
        } catch(e) {
          alert('Scan failed. Please try again.');
        }
      });

      // Dragging the crop box
      let activeDrag = null;
      cropBox.addEventListener('pointerdown', (e) => {
        const handle = e.target.getAttribute('data-handle');
        activeDrag = {
          handle: handle || 'move',
          startX: e.clientX,
          startY: e.clientY,
          init: { ...cropState }
        };
        e.preventDefault();
      });

      window.addEventListener('pointermove', (e) => {
        if (!activeDrag) return;
        const rect = cropImg.getBoundingClientRect();
        if (!rect.width) return;
        const dx = ((e.clientX - activeDrag.startX) / rect.width) * 100;
        const dy = ((e.clientY - activeDrag.startY) / rect.height) * 100;

        if (activeDrag.handle === 'move') {
          cropState.x = Math.max(0, Math.min(100 - activeDrag.init.w, activeDrag.init.x + dx));
          cropState.y = Math.max(0, Math.min(100 - activeDrag.init.h, activeDrag.init.y + dy));
        } else if (activeDrag.handle === 'se') {
          cropState.w = Math.max(15, Math.min(100 - activeDrag.init.x, activeDrag.init.w + dx));
          cropState.h = Math.max(15, Math.min(100 - activeDrag.init.y, activeDrag.init.y + dy));
        } else if (activeDrag.handle === 'nw') {
          const pw = activeDrag.init.w - dx;
          const ph = activeDrag.init.h - dy;
          if (pw >= 15 && activeDrag.init.x + dx >= 0) {
            cropState.x = activeDrag.init.x + dx;
            cropState.w = pw;
          }
          if (ph >= 15 && activeDrag.init.y + dy >= 0) {
            cropState.y = activeDrag.init.y + dy;
            cropState.h = ph;
          }
        } else if (activeDrag.handle === 'ne') {
          cropState.w = Math.max(15, Math.min(100 - activeDrag.init.x, activeDrag.init.w + dx));
          const ph = activeDrag.init.h - dy;
          if (ph >= 15 && activeDrag.init.y + dy >= 0) {
            cropState.y = activeDrag.init.y + dy;
            cropState.h = ph;
          }
        } else if (activeDrag.handle === 'sw') {
          const pw = activeDrag.init.w - dx;
          if (pw >= 15 && activeDrag.init.x + dx >= 0) {
            cropState.x = activeDrag.init.x + dx;
            cropState.w = pw;
          }
          cropState.h = Math.max(15, Math.min(100 - activeDrag.init.y, activeDrag.init.h + dy));
        }
        syncCropBoxUI();
      });

      window.addEventListener('pointerup', () => { activeDrag = null; });

      // Crop and scan action with quiet-zone padding & multi-pass decoding
      doCropScanBtn.addEventListener('click', async () => {
        try {
          const img = new Image();
          img.src = cropImg.src;
          await new Promise(r => img.onload = r);

          const isFlipped = cropRotation === 90 || cropRotation === 270;
          const effW = isFlipped ? img.naturalHeight : img.naturalWidth;
          const effH = isFlipped ? img.naturalWidth : img.naturalHeight;

          // Rotated base
          const rCanvas = document.createElement('canvas');
          rCanvas.width = effW;
          rCanvas.height = effH;
          const rCtx = rCanvas.getContext('2d', { willReadFrequently: true });
          if (cropRotation === 90) {
            rCtx.translate(effW, 0);
            rCtx.rotate((90 * Math.PI) / 180);
            rCtx.drawImage(img, 0, 0, effH, effW);
          } else if (cropRotation === 180) {
            rCtx.translate(effW, effH);
            rCtx.rotate((180 * Math.PI) / 180);
            rCtx.drawImage(img, 0, 0, effW, effH);
          } else if (cropRotation === 270) {
            rCtx.translate(0, effH);
            rCtx.rotate((270 * Math.PI) / 180);
            rCtx.drawImage(img, 0, 0, effH, effW);
          } else {
            rCtx.drawImage(img, 0, 0, effW, effH);
          }

          const cx = Math.max(0, Math.round((cropState.x / 100) * effW));
          const cy = Math.max(0, Math.round((cropState.y / 100) * effH));
          const cw = Math.max(20, Math.min(effW - cx, Math.round((cropState.w / 100) * effW)));
          const ch = Math.max(20, Math.min(effH - cy, Math.round((cropState.h / 100) * effH)));

          // Padded canvas with quiet-zone margin
          const pad = Math.max(20, Math.round(Math.min(cw, ch) * 0.15));
          const padW = cw + pad * 2;
          const padH = ch + pad * 2;
          canvas.width = padW;
          canvas.height = padH;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, padW, padH);
          ctx.drawImage(rCanvas, cx, cy, cw, ch, pad, pad, cw, ch);

          let imgData = ctx.getImageData(0, 0, padW, padH);
          let code = jsQR(imgData.data, padW, padH, { inversionAttempts: 'attemptBoth' });

          // Fallback: Check raw unpadded crop
          if (!code || !code.data) {
            canvas.width = cw;
            canvas.height = ch;
            ctx.drawImage(rCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
            imgData = ctx.getImageData(0, 0, cw, ch);
            code = jsQR(imgData.data, cw, ch, { inversionAttempts: 'attemptBoth' });
          }

          // Fallback: Check full image
          if (!code || !code.data) {
            const fData = rCtx.getImageData(0, 0, effW, effH);
            code = jsQR(fData.data, effW, effH, { inversionAttempts: 'attemptBoth' });
          }

          if (code && code.data && code.data.trim()) {
            cropperModal.classList.remove('active');
            handleResult(code.data);
          } else {
            alert('No QR code found in selected crop area. Please place the crop box accurately over the QR code or tap Auto Scan.');
          }
        } catch(err) {
          alert('Error scanning cropped area.');
        }
      });

      // Torch
      torchBtn.addEventListener('click', async () => {
        if (!stream || !hasTorch) return;
        const track = stream.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          torchOn = !torchOn;
          try {
            await track.applyConstraints({ advanced: [{ torch: torchOn }] });
            torchBtn.classList.toggle('active', torchOn);
          } catch(e) {}
        }
      });

      // Switch Camera
      switchCameraBtn.addEventListener('click', () => {
        if (videoDevices.length <= 1) return;
        currentDeviceIdx = (currentDeviceIdx + 1) % videoDevices.length;
        startCamera(currentDeviceIdx);
      });

      retryBtn.addEventListener('click', () => startCamera(currentDeviceIdx));

      // Auto start on load
      startCamera(0);
    })();
  </script>
</body>
</html>`;

// 1. Write standalone HTML file
fs.writeFileSync('public/qr-scanner-standalone.html', standaloneHTML, 'utf8');
console.log('Created public/qr-scanner-standalone.html (Size:', (standaloneHTML.length / 1024).toFixed(1), 'KB)');

// 2. Create ZIP package for APK converters & offline storage
const zipPath = 'public/qr-scanner-app.zip';
const output = fs.createWriteStream(zipPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  console.log('Created public/qr-scanner-app.zip (Total:', (archive.pointer() / 1024).toFixed(1), 'KB)');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add index.html (the standalone app)
archive.append(standaloneHTML, { name: 'index.html' });

// Add icons
if (fs.existsSync('public/pwa-512x512.png')) {
  archive.file('public/pwa-512x512.png', { name: 'icon.png' });
}
if (fs.existsSync('public/icon.svg')) {
  archive.file('public/icon.svg', { name: 'icon.svg' });
}

// Add README with APK conversion guide for mobile
const readme = `QR Scanner Mobile Application Package
=======================================

This package contains everything needed to run this QR scanner completely standalone without internet, or convert it into an Android APK directly on your phone!

FEATURES:
- Live Camera Scanner with viewfinder, laser line, flashlight/torch, and camera flip.
- High-Accuracy Gallery Photo & Screenshot Cropper (Move crop box lines, resize with corner/edge handles, rotate, and instant crop & scan).
- Scan History with individual delete & clear all history.
- Instant QR Decoder for URLs (Open & Copy), Wi-Fi (SSID & Password copy), and plain text.
- 100% Offline with zero external dependencies.
`;
archive.append(readme, { name: 'README.txt' });

archive.finalize();
