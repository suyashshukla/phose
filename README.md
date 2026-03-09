# Phose — Local Face Search

A fully client-side face search application built with Angular and TensorFlow.js.
**Images never leave your device.** All face detection and recognition runs entirely in the browser.

---

## Quick Start

```bash
npm install
ng serve
```

Open **http://localhost:4200** in Chrome or Edge (required for the File System Access API).

---

## How It Works

1. **Upload or capture a query image** — must contain exactly one face.
2. **Select a local folder** — the app recursively scans all subfolders for images.
3. **Results appear** sorted by similarity — click any result to open a full preview.

Face detection models are served directly from the `@vladmandic/face-api` npm package (no manual download required).

---

## Features

| Feature | Detail |
|---|---|
| Face detection | TinyFaceDetector (fast, browser-optimised) |
| Face recognition | 128-d descriptor via FaceRecognitionNet |
| Similarity metric | Euclidean distance (threshold 0.55) |
| Directory traversal | File System Access API — recursive |
| Supported formats | JPEG, PNG, WebP |
| Caching | IndexedDB — embeddings cached per file |
| Privacy | Zero network requests for images |
| Camera capture | `getUserMedia` — live capture |

---

## Browser Support

| Browser | Supported |
|---|---|
| Chrome 86+ | ✅ |
| Edge 86+ | ✅ |
| Firefox | ❌ (no `showDirectoryPicker`) |
| Safari | ❌ (no `showDirectoryPicker`) |

---

## Performance Tips

- First run is slower — models (~6 MB) are loaded once and cached by the browser.
- Subsequent scans of the same folder are fast — embeddings are cached in IndexedDB.
- Tested with 1 000+ images without browser crashes (batch size = 10).

---

## Project Structure

```
src/app/
  components/
    query-image/         # Upload or camera-capture the query face
    folder-selector/     # Directory picker + batch scanner
    search-results/      # Result grid + lightbox
    image-grid/          # Thumbnail grid
    progress-bar/        # Scan progress indicator
  services/
    face-detection.ts    # Model loading, face detection
    face-embedding.ts    # Descriptor extraction, query validation
    face-search.ts       # Similarity comparison, result ranking
    file-system.ts       # Directory picker, recursive file walk
    image-processing.ts  # Image loading utilities
    cache.ts             # IndexedDB embedding cache
  models/
    face-embedding.model.ts
    search-result.model.ts
  utils/
    similarity.ts        # Euclidean distance, cosine similarity
    image-utils.ts       # File → HTMLImageElement helpers
```

---

## Building for Production

```bash
ng build
```

Artefacts are written to `dist/phose/browser/`. Serve with any static file server.

```bash
npx serve dist/phose/browser
```
