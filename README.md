# 🪞 MirrorAI — AI-Powered Virtual Try-On Platform

> **Built for TrialShoppy Technical Assessment** | AI/ML · Computer Vision · AR/VR Internship

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10-FF6F00?logo=google&logoColor=white)](https://mediapipe.dev)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

MirrorAI is a full-stack AI virtual try-on platform that allows users to see how clothing, eyewear, and accessories look on them — without physically trying them on. Upload a photo, pick a product, and AI does the rest.

---

## ✨ Features

- 📸 **Photo Upload** — Drag & drop or browse your photo
- 👕 **Clothing Try-On** — AI detects 33 body landmarks with MediaPipe Pose and overlays clothing
- 🕶️ **Eyewear Try-On** — 468 face landmarks for precise glasses placement with MediaPipe Face Mesh
- 🎒 **Accessories** — Hats, necklaces, watches overlaid using pose/face detection
- ✂️ **Background Removal** — Product backgrounds auto-removed with rembg (U2Net model)
- 🎨 **Image Compositing** — OpenCV perspective warping + alpha blending
- 💾 **Download Result** — Save your try-on image
- 🌐 **Beautiful UI** — Premium dark glassmorphism design with animations

---

## 🏗️ Architecture

```
User Photo (Upload)
       ↓
  FastAPI Backend (localhost:8000)
       ↓
  MediaPipe ── Pose Detection (Clothing) → 33 body landmarks
            └─ Face Mesh (Eyewear)      → 468 face landmarks
       ↓
  rembg ── Remove product background (U2Net)
       ↓
  OpenCV ── Perspective warp + Alpha blend
       ↓
  Pillow ── Final composite image
       ↓
  Result JPG → Served to Frontend
```

---

## 🛠️ Tech Stack

| Component | Technology | Cost |
|---|---|---|
| Frontend | HTML, CSS (Glassmorphism), Vanilla JS | Free |
| Backend | Python + FastAPI | Free |
| Pose Detection | MediaPipe Pose (Google) | Free |
| Face Mesh | MediaPipe Face Mesh (Google) | Free |
| Background Removal | rembg + U2Net model | Free |
| Image Processing | OpenCV + Pillow | Free |
| Fonts | Google Fonts (Outfit, Inter) | Free |

> **Zero paid APIs** — everything runs locally on your machine.

---

## 📁 Project Structure

```
mirriorai/
├── frontend/
│   ├── index.html          ← Landing page
│   ├── catalog.html        ← Product catalog
│   ├── tryon.html          ← Main try-on app
│   ├── about.html          ← About + architecture
│   ├── css/
│   │   ├── main.css        ← Global design system
│   │   ├── catalog.css     ← Catalog styles
│   │   └── tryon.css       ← Try-on app styles
│   └── js/
│       ├── main.js         ← Global JS (nav, animations)
│       ├── catalog.js      ← Product catalog + filtering
│       └── tryon.js        ← Try-on logic + API calls
├── backend/
│   └── main.py             ← FastAPI app (AI pipeline)
├── products/
│   ├── clothing/           ← Product images
│   └── eyewear/
├── uploads/                ← User uploaded photos (auto-created)
├── results/                ← Generated try-on results (auto-created)
├── requirements.txt        ← Python dependencies
└── README.md
```

---

## 🚀 Setup & Running

### Prerequisites
- Python 3.10+
- Node.js (optional, just for local server)
- Git

### Step 1 — Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/mirriorai.git
cd mirriorai
```

### Step 2 — Install Python Dependencies
```bash
pip install -r requirements.txt
```

> **Note:** `mediapipe` and `rembg` may take a few minutes to download their models on first run (~300MB). This is one-time only.

### Step 3 — Start the Backend
```bash
cd backend
python main.py
```

The API will be available at: `http://localhost:8000`

You can verify it's running by visiting: `http://localhost:8000/api/health`

### Step 4 — Open the Frontend

**Option A — Direct open (simplest):**
Open `frontend/index.html` directly in your browser.

**Option B — Local server (recommended for full features):**
```bash
# From project root
python -m http.server 3000 --directory frontend
# Then open: http://localhost:3000
```

**Option C — VS Code Live Server:**
Right-click `frontend/index.html` → Open with Live Server

---

## 🖥️ Usage

1. Open `index.html` (or `http://localhost:3000`)
2. Click **"Start Try-On"**
3. **Step 1:** Upload a clear, front-facing photo
4. **Step 2:** Browse and select a product (clothing, eyewear, or accessory)
5. **Step 3:** Click **"Generate Try-On"** — AI processes your image
6. **Step 4:** View your result, compare before/after, and download!

---

## 🤖 AI Models Used

| Model | Purpose | Source |
|---|---|---|
| MediaPipe Pose | Body landmark detection (33 points) | Google MediaPipe |
| MediaPipe Face Mesh | Face landmark detection (468 points) | Google MediaPipe |
| U2Net (via rembg) | Semantic background removal | rembg library |
| OpenCV DNN | Image warping and compositing | OpenCV |

---

## ⚠️ Known Limitations

1. **Photo requirements:** Best results with front-facing, well-lit photos. Side angles reduce accuracy.
2. **Realism:** This is an overlay-based approach, not diffusion-based generation. GPU-based models (IDM-VTON, OOTDiffusion) would produce more photorealistic results but require significant compute.
3. **Product images:** Demo uses generated silhouettes. Real product photos significantly improve results.
4. **Full-body clothing:** Works best for upper-body garments. Lower-body requires additional leg landmark mapping.
5. **Speed:** Processing time is 1–5 seconds on CPU. GPU acceleration would improve this dramatically.

---

## 🔮 Future Improvements

- [ ] Diffusion-based try-on (IDM-VTON / OOTDiffusion) for photorealistic results
- [ ] Real-time webcam AR mode using WebRTC
- [ ] E-commerce plugin (Shopify, WooCommerce integration)
- [ ] Body measurement estimation from photo (size recommendation)
- [ ] User accounts with try-on history
- [ ] Mobile app (React Native / Flutter)

---

## 📋 API Reference

### `POST /api/tryon`
Main virtual try-on endpoint.

**Form Data:**
- `photo` (file) — User's photo (JPG/PNG/WEBP, max 10MB)
- `product_id` (string) — Product ID (e.g., `c1`, `e1`, `a2`)
- `product_name` (string) — Product name
- `category` (string) — `clothing` | `eyewear` | `accessories`

**Response:**
```json
{
  "success": true,
  "result_url": "http://localhost:8000/results/tryon_abc12345.jpg",
  "result_id": "abc12345",
  "landmarks_count": 33,
  "processing_time": 1.24,
  "mediapipe_used": true,
  "rembg_used": true
}
```

### `GET /api/health`
Returns server health and dependency status.

### `GET /api/products`
Returns the full product catalog as JSON.

---

## 📸 Screenshots

> Run the application and open the browser to see the full UI.

Pages:
- **Landing Page** (`index.html`) — Hero section, how-it-works, features, CTA
- **Catalog** (`catalog.html`) — Filterable product grid with search and modal
- **Try-On** (`tryon.html`) — 4-step guided try-on flow
- **About** (`about.html`) — Architecture, tech stack, AI pipeline, limitations

---

## 👨‍💻 Technical Report

See [`TECHNICAL_REPORT.md`](TECHNICAL_REPORT.md) for the full implementation write-up.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ using open-source AI tools. No paid APIs. No data shared externally.*
