# 📷 Fast & Smart QR Code Scanner

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-10B981?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A privacy-focused, high-performance web-based QR & Barcode Scanner with camera autofocus, quiet-zone recovery, image cropper, smart type decoding (vCard, UPI, Wi-Fi, Geo, Crypto, URLs), and scan history with CSV export.

---

## ✨ Features

- ⚡ **Instant Real-Time Scanning**: Powered by hardware-accelerated `BarcodeDetector` API with fallback to `jsQR`.
- 🔒 **Privacy-First Camera Lifecycle**: Camera stream and hardware sensors only activate when the user explicitly taps **"Start Scanner"** and automatically tear down upon navigating away or pausing.
- 🖼️ **Interactive Image Cropper**: Scan QR codes from screenshot files with precision rotation, zoom, and aspect ratio controls.
- 📋 **Clipboard Paste Support (`Ctrl + V`)**: Paste any copied screenshot or image directly into the app on desktop or tablets to decode instantly without opening the camera.
- 🧠 **Smart Content Parsing**:
  - **Wi-Fi Networks**: Connect, view SSID, toggle password visibility, or copy credentials.
  - **vCard / Contacts**: Extracts name, phone, email, and organization with one-tap `.vcf` download.
  - **UPI Payments**: Decodes Payee, UPI ID (VPA), and Amount with direct payment app links.
  - **Geo Location**: Parses latitude/longitude with one-tap Google Maps navigation.
  - **Crypto Addresses**: Identifies Bitcoin, Ethereum, and Solana wallet addresses.
  - **Websites & URLs**: Security checks against unsafe script schemes and unencrypted HTTP warnings.
- 📜 **Scan History & CSV Export**: Searchable local history with filter chips and one-click `.csv` file export.
- 📱 **Progressive Web App (PWA)**: Full offline support and installable on Android, iOS, Windows, and macOS.
- 🔦 **Low-Light Detection**: Suggests flashlight activation automatically when ambient light is low.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm, pnpm, or bun

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/qr-code-scanner.git
   cd qr-code-scanner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```
   The production-ready assets will be generated in the `dist/` directory.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **QR Decoding**: [jsQR](https://github.com/cozmo/jsQR) & Web Standard `BarcodeDetector`
- **Image Cropper**: [react-easy-crop](https://github.com/ValentinH/react-easy-crop)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🌐 Deploying to Production

### Deploy to GitHub Pages:
1. In `vite.config.ts`, ensure `base: './'` or `base: '/<repo-name>/'`.
2. Run `npm run build`.
3. Push the `dist` folder to your `gh-pages` branch or configure GitHub Actions.

### Deploy to Vercel / Netlify:
- Simply import the GitHub repository into [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
- Build command: `npm run build`
- Output directory: `dist`

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
