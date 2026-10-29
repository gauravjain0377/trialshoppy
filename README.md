# 🪞 MirrorAI — Virtual Try-On Platform

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose%20%26%20Face-FF6F00?logo=google&logoColor=white)](https://mediapipe.dev)
[![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

MirrorAI is an end-to-end Virtual Try-On (VTON) platform featuring dual operational paradigms:
1. **Interactive Static Photo Try-On**: A 4-step wizard that detects anatomical keypoints, processes garment transparency masks, and performs alignment with server-side OpenCV/rembg or instant client fallbacks.
2. **Live AR Camera Try-On**: Real-time browser-based camera feed leveraging MediaPipe BlazePose (33 landmarks) at 30+ FPS, incorporating shoulder angle tilting, dynamic skeletal scaling, and exponential landmark jitter filtering.

---

## 📑 Assessment Deliverables Checklist

- [x] **Source Code**: Fully documented, runnable repository.
- [x] **Requirements & Dependencies**: Provided in [`requirements.txt`](requirements.txt).
- [x] **Setup & Execution Instructions**: Detailed below for Windows, macOS, and Linux.
- [x] **Architecture Diagram**: End-to-end dataflow documented.
- [x] **Technical Report**: Comprehensive deep-dive in [`TECHNICAL_REPORT.md`](TECHNICAL_REPORT.md).
- [x] **Attributions & Models**: Full list of open-source models, libraries, and cascades.
- [x] **Limitations & Future Improvements**: Candidly documented per evaluation guidelines.

---

## 🏗️ System Architecture

```
                                [ User Client ]
                                /              \
                               /                \
                    (Photo Upload)            (Live Camera AR)
                          |                          |
                          v                          v
                  [FastAPI Backend]          [MediaPipe BlazePose]
                  - OpenCV Cascades          - 33 Body Landmarks
                  - rembg (U2-Net)           - EMA Jitter Filter
                  - Alpha Matting            - Affine Rotate & Translate
                          |                          |
                          v                          v
                  [Composite Image]          [Real-Time Canvas2D]
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python 3.10+**
- Modern Web Browser (Google Chrome or Microsoft Edge recommended for MediaPipe WebAssembly support)
- Working Webcam (for Live AR mode)

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/trialshoppy.git
cd trialshoppy

# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Launching the Backend (API Server)
```bash
cd backend
python main.py
```
- API will start at: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 4. Running the Frontend
In a new terminal window:
```bash
# From the project root directory:
python -m http.server 3000 --directory frontend
```
Now navigate to: **`http://localhost:3000`** in your browser.

- **Main Landing**: `http://localhost:3000/index.html`
- **Photo Try-On App**: `http://localhost:3000/tryon.html`
- **Live AR Camera**: `http://localhost:3000/camera.html`
- **Catalog Explorer**: `http://localhost:3000/catalog.html`

---

## 🤖 AI Models, Datasets & Libraries Used

| Component | Library / Framework | Model / Method | Purpose |
|---|---|---|---|
| **Pose Tracking** | MediaPipe (WASM/JS) | BlazePose (33 keypoints) | Real-time skeletal body tracking & shoulder span measurement |
| **Face Landmark** | MediaPipe / OpenCV | Haar Cascades & Face Mesh | Eye line alignment for sunglasses & eyewear fitting |
| **Background Matting** | `rembg` | U2-Net | Automated product background removal |
| **Image Transform** | OpenCV (`cv2`) & Pillow | Affine Transform & Alpha Matting | Rigid alignment & compositing |
| **Web Service** | FastAPI + Uvicorn | ASGI Async Pipeline | Try-On endpoint servicing |

---

## ⚠️ Known Limitations & Candid Assessment Notes

Per the assessment instruction (*"Clearly mention any incomplete features, limitations, or mocked components"*):

1. **2D Affine vs. True 3D Volumetric Deformation**:
   - Current live AR utilizes real-time 2D planar projection (translating, rotating, and scaling transparent garment assets to track the shoulder vector).
   - *Limitation*: When a user turns their body sideways, raises their arms, or pulls on their collar, a 2D planar asset cannot deform into natural 3D folds, creases, or perspective foreshortening. An experimental quad-strip warp created unacceptable slice artifacts and was deprecated in favor of stable affine tracking.
2. **Dynamic Occlusion (Arms & Hands in Front of Garment)**:
   - When a person holds their collar or crosses their arms, simple canvas layering draws the garment over the hands. A complete commercial solution requires real-time per-pixel depth segmentation masks.
3. **Asset Dependency**:
   - The visual fidelity relies directly on clean, front-facing transparent flat-lay PNGs. Images containing dual views (front + back) or model photography degrade realism.

---

## 🔮 Roadmap to Enterprise-Grade AR (Amazon / Snapchat Level)

1. **Phase 1: Generative AI Diffusion Pipeline (IDM-VTON / OOTDiffusion)**
   - Connect photo upload to a DensePose-guided latent diffusion model running on an asynchronous GPU task queue (Celery/Redis) to produce photorealistic drapery, wrinkles, and shadows.
2. **Phase 2: Three.js 3D Garment Mesh Engine**
   - Replace flat 2D PNG overlays with 3D rigged glTF meshes.
   - Bind MediaPipe skeletal joints to 3D bones using inverse kinematics (IK) for 360-degree rotation.
3. **Phase 3: Multi-modal Hand & Gesture Interaction**
   - Concurrently deploy MediaPipe Hands to detect pinch and pull gestures near collar coordinates, triggering reactive cloth blend-shapes.

---

## 📄 Documentation Links
- Detailed Technical Analysis: [`TECHNICAL_REPORT.md`](TECHNICAL_REPORT.md)
- REST API Reference: `http://localhost:8000/docs`

---
