// MirrorAI — Try-On JS
// Handles: file upload, product selection, AI processing (calls backend),
// step navigation, result display, download

let currentStep = 1;
let uploadedFile = null;
let uploadedDataURL = null;
let selectedProduct = null;
let processStartTime = null;

const STEPS_COUNT = 4;

// ── Step Navigation ───────────────────────────────────
function goToStep(n) {
  document.querySelectorAll('.tryon-step').forEach(s => s.classList.add('hidden'));
  document.getElementById(`step-${n}`).classList.remove('hidden');
  currentStep = n;
  updateStepIndicator(n);
  window.scrollTo({ top: 60, behavior: 'smooth' });
}

function updateStepIndicator(active) {
  for (let i = 1; i <= STEPS_COUNT; i++) {
    const indicator = document.getElementById(`step-${i}-indicator`);
    if (!indicator) continue;
    indicator.classList.remove('active', 'completed');
    if (i < active) indicator.classList.add('completed');
    if (i === active) indicator.classList.add('active');
  }
  // Animate lines
  for (let i = 1; i < STEPS_COUNT; i++) {
    const line = document.getElementById(`line-${i}-${i + 1}`);
    if (line) {
      line.classList.toggle('active', i < active);
    }
  }
}

// ── File Upload ───────────────────────────────────────
function initUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('photo-input');
  const trigger = document.getElementById('upload-trigger');
  const preview = document.getElementById('upload-preview');
  const previewImg = document.getElementById('preview-img');
  const changeBtn = document.getElementById('preview-change');
  const nextBtn = document.getElementById('step1-next');

  if (!area) return;

  // Click to open file picker
  trigger.addEventListener('click', () => input.click());

  // Change photo
  if (changeBtn) {
    changeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      input.click();
    });
  }

  // File selected
  input.addEventListener('change', (e) => handleFile(e.target.files[0]));

  // Drag & Drop
  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('drag-over');
  });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG, PNG, WEBP)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10MB', 'error');
      return;
    }

    uploadedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedDataURL = e.target.result;
      previewImg.src = uploadedDataURL;
      trigger.style.display = 'none';
      preview.style.display = 'block';
      nextBtn.disabled = false;
      nextBtn.classList.add('ready');

      // Simulate AI scan
      simulateAIScan();
    };
    reader.readAsDataURL(file);
  }
}

function simulateAIScan() {
  const overlay = document.getElementById('ai-scan-overlay');
  const scanText = document.getElementById('scan-text');
  const landmarks = document.getElementById('ai-landmarks');

  overlay.style.display = 'block';

  const steps = [
    'Detecting pose...',
    'Finding body landmarks...',
    'Mapping key points...',
    '33 landmarks detected ✓'
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (scanText) scanText.textContent = steps[i] || steps[steps.length - 1];
    i++;
    if (i >= steps.length) {
      clearInterval(interval);
      // Add landmark dots
      if (landmarks) addLandmarkDots(landmarks);
      setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
      }, 2500);
    }
  }, 700);
}

function addLandmarkDots(container) {
  container.innerHTML = '';
  // Simulate body landmark positions (percentage based)
  const points = [
    [50, 12], [50, 20], [50, 30], [50, 40], [50, 50],
    [38, 28], [62, 28], [35, 45], [65, 45],
    [38, 62], [62, 62], [40, 75], [60, 75],
    [42, 88], [58, 88]
  ];

  points.forEach(([x, y]) => {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute; width:5px; height:5px;
      background:#a855f7; border-radius:50%;
      box-shadow:0 0 8px #a855f7;
      left:${x}%; top:${y}%;
      transform:translate(-50%,-50%);
      animation: aiPulse 1.5s ease infinite;
    `;
    container.appendChild(dot);
  });
}

// ── Product Selector ───────────────────────────────────
function initProductSelector() {
  const grid = document.getElementById('selector-grid');
  const tabs = document.querySelectorAll('.sel-tab');
  const nextBtn = document.getElementById('step2-next');
  const selectedBar = document.getElementById('selected-bar');
  const clearBtn = document.getElementById('clear-selection');

  if (!grid) return;

  let activeTab = 'clothing';

  function renderSelectorItems(category) {
    const items = PRODUCTS.filter(p => p.category === category);
    grid.innerHTML = items.map(p => `
      <div class="sel-item ${selectedProduct?.id === p.id ? 'selected' : ''}" data-id="${p.id}" id="sel-${p.id}" role="button" tabindex="0" aria-label="Select ${p.name}">
        <span class="sel-emoji" role="img">${p.emoji}</span>
        <div class="sel-name">${p.name}</div>
        <div class="sel-ai">${p.ai}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.sel-item').forEach(item => {
      item.addEventListener('click', () => selectProduct(item.dataset.id));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') selectProduct(item.dataset.id);
      });
    });
  }

  function selectProduct(id) {
    selectedProduct = PRODUCTS.find(p => p.id === id);
    renderSelectorItems(activeTab);
    updateSelectedBar();
    nextBtn.disabled = false;
  }

  function updateSelectedBar() {
    if (!selectedProduct) {
      selectedBar.style.display = 'none';
      nextBtn.disabled = true;
      return;
    }
    selectedBar.style.display = 'flex';
    document.getElementById('selected-emoji').textContent = selectedProduct.emoji;
    document.getElementById('selected-name').textContent = selectedProduct.name;
    document.getElementById('selected-ai').textContent = `AI: ${selectedProduct.ai}`;
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      selectedProduct = null;
      renderSelectorItems(activeTab);
      updateSelectedBar();
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      activeTab = this.dataset.tab;
      renderSelectorItems(activeTab);
    });
  });

  renderSelectorItems(activeTab);

  // Check if product was pre-selected from catalog
  const savedProduct = sessionStorage.getItem('selectedProduct');
  if (savedProduct) {
    try {
      const p = JSON.parse(savedProduct);
      selectedProduct = PRODUCTS.find(prod => prod.id === p.id);
      if (selectedProduct) {
        // Switch to correct tab
        activeTab = selectedProduct.category;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
        renderSelectorItems(activeTab);
        updateSelectedBar();
        nextBtn.disabled = false;
        sessionStorage.removeItem('selectedProduct');
      }
    } catch (e) {}
  }

  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('product');
  if (productId) {
    const p = PRODUCTS.find(prod => prod.id === productId);
    if (p) {
      selectedProduct = p;
      activeTab = p.category;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
      renderSelectorItems(activeTab);
      updateSelectedBar();
      nextBtn.disabled = false;
    }
  }
}

// ── Processing Simulation / API Call ──────────────────
async function startProcessing() {
  processStartTime = Date.now();
  goToStep(3);

  const procDesc = document.getElementById('processing-desc');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const steps = ['ps-1', 'ps-2', 'ps-3', 'ps-4'];

  // Animate steps
  const stepDescriptions = [
    'Detecting body landmarks with MediaPipe...',
    'Removing product background with rembg...',
    'Applying perspective transform...',
    'Compositing and blending final result...'
  ];

  let currentProcStep = 0;

  function setProgress(pct) {
    progressFill.style.width = pct + '%';
    progressLabel.textContent = Math.round(pct) + '%';
  }

  function activateStep(idx) {
    steps.forEach((sid, i) => {
      const el = document.getElementById(sid);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (i < idx) el.classList.add('done');
      if (i === idx) el.classList.add('active');
    });
    if (procDesc) procDesc.textContent = stepDescriptions[idx] || 'Finalizing...';
  }

  // Simulate progress
  const timeline = [
    { pct: 15, step: 0, delay: 400 },
    { pct: 35, step: 1, delay: 1200 },
    { pct: 65, step: 2, delay: 2200 },
    { pct: 88, step: 3, delay: 3400 },
    { pct: 100, step: 3, delay: 4400 }
  ];

  let apiCallDone = false;
  let apiResult = null;

  // Start the real API call
  const apiPromise = callTryOnAPI();

  // Animate progress in parallel
  for (const t of timeline) {
    await new Promise(r => setTimeout(r, t.delay - (timeline.indexOf(t) > 0 ? timeline[timeline.indexOf(t)-1].delay : 0)));
    setProgress(t.pct);
    activateStep(t.step);
  }

  // Wait for API (if faster, show result immediately; if slower, wait)
  try {
    apiResult = await apiPromise;
  } catch (err) {
    console.error('API error:', err);
    apiResult = null;
  }

  // Mark all done
  steps.forEach(sid => {
    const el = document.getElementById(sid);
    if (el) el.classList.replace('active', 'done') || el.classList.add('done');
    if (el) el.classList.remove('active');
  });

  const elapsed = ((Date.now() - processStartTime) / 1000).toFixed(1);

  setTimeout(() => showResult(apiResult, elapsed), 500);
}

async function callTryOnAPI() {
  if (!uploadedFile || !selectedProduct) return null;

  const formData = new FormData();
  formData.append('photo', uploadedFile);
  formData.append('product_id', selectedProduct.id);
  formData.append('product_name', selectedProduct.name);
  formData.append('category', selectedProduct.category);
  formData.append('emoji', selectedProduct.emoji);

  try {
    const res = await fetch('http://localhost:8000/api/tryon', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Backend not available, using demo mode:', err.message);
    return null; // Will use demo mode
  }
}

// ── Show Result ────────────────────────────────────────
function showResult(apiData, elapsed) {
  const originalImg = document.getElementById('original-preview');
  const resultImg = document.getElementById('result-preview');
  const productBadge = document.getElementById('result-product-badge');
  const procTime = document.getElementById('proc-time');

  // Original photo
  if (originalImg) originalImg.src = uploadedDataURL;

  // Result image
  if (apiData && apiData.result_url) {
    // Use real API result
    if (resultImg) resultImg.src = apiData.result_url;
  } else {
    // Demo mode: create a canvas composite
    createDemoResult(resultImg);
  }

  if (productBadge) {
    productBadge.textContent = `${selectedProduct.emoji} ${selectedProduct.name}`;
  }

  if (procTime) procTime.textContent = `${elapsed}s`;

  if (apiData && apiData.landmarks_count) {
    const lc = document.getElementById('ai-landmarks-count');
    if (lc) lc.textContent = `${apiData.landmarks_count} landmarks detected`;
  }

  goToStep(4);
}

function createDemoResult(imgEl) {
  if (!imgEl || !uploadedDataURL) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw original
    ctx.drawImage(img, 0, 0);

    // Overlay product emoji as watermark / indicator
    const emoji = selectedProduct?.emoji || '👕';
    const category = selectedProduct?.category || 'clothing';

    // Colored tinted overlay for clothing
    if (category === 'clothing') {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
      ctx.fillRect(0, img.height * 0.25, img.width, img.height * 0.5);
    } else if (category === 'eyewear') {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.07)';
      ctx.fillRect(0, img.height * 0.12, img.width, img.height * 0.2);
    }

    // Draw emoji overlay
    const fontSize = Math.floor(img.width * 0.15);
    ctx.font = `${fontSize}px serif`;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = 'center';

    let emojiY;
    if (category === 'clothing') emojiY = img.height * 0.48;
    else if (category === 'eyewear') emojiY = img.height * 0.3;
    else emojiY = img.height * 0.4;

    ctx.fillText(emoji, img.width / 2, emojiY);
    ctx.globalAlpha = 1;

    // AI processing text stamp
    ctx.fillStyle = 'rgba(168,85,247,0.7)';
    ctx.font = `bold ${Math.floor(img.width * 0.025)}px Outfit, sans-serif`;
    ctx.globalAlpha = 0.6;
    ctx.fillText('MirrorAI • Virtual Try-On', img.width / 2, img.height - 20);
    ctx.globalAlpha = 1;

    imgEl.src = canvas.toDataURL('image/jpeg', 0.92);
  };

  img.src = uploadedDataURL;
}

// ── Download ───────────────────────────────────────────
function initDownload() {
  const btn = document.getElementById('download-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const resultImg = document.getElementById('result-preview');
    if (!resultImg || !resultImg.src) return;

    const a = document.createElement('a');
    a.href = resultImg.src;
    a.download = `mirriorai_tryon_${selectedProduct?.name.replace(/\s+/g, '_') || 'result'}.jpg`;
    a.click();
    showToast('Result downloaded!', 'success');
  });
}

// ── Toast Notification ────────────────────────────────
function showToast(message, type = 'info') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  const colors = {
    success: 'rgba(74,222,128,0.15)', border: { success: 'rgba(74,222,128,0.4)', error: 'rgba(248,113,113,0.4)', info: 'rgba(168,85,247,0.4)' },
    error: 'rgba(248,113,113,0.15)',
    info: 'rgba(168,85,247,0.15)'
  };
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  toast.style.cssText = `
    position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
    display:flex; align-items:center; gap:10px; padding:12px 24px;
    background:${colors[type] || colors.info};
    border:1px solid ${colors.border[type] || colors.border.info};
    border-radius:999px; font-size:0.87rem; font-weight:600;
    color:#f0f0ff; z-index:9999; backdrop-filter:blur(12px);
    animation:toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
    font-family:'Outfit',sans-serif;
    box-shadow:0 8px 32px rgba(0,0,0,0.3);
  `;

  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(16px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes toastOut { to { opacity:0; transform:translateX(-50%) translateY(16px); } }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Init Everything ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  goToStep(1);
  initUpload();
  initProductSelector();
  initDownload();

  // Step 1 → 2
  const step1Next = document.getElementById('step1-next');
  if (step1Next) step1Next.addEventListener('click', () => {
    if (!uploadedFile) { showToast('Please upload a photo first', 'error'); return; }
    goToStep(2);
  });

  // Step 2 → 3 (processing)
  const step2Next = document.getElementById('step2-next');
  if (step2Next) step2Next.addEventListener('click', () => {
    if (!selectedProduct) { showToast('Please select a product', 'error'); return; }
    startProcessing();
  });

  // Back buttons
  const step2Back = document.getElementById('step2-back');
  if (step2Back) step2Back.addEventListener('click', () => goToStep(1));

  // Try another product
  const tryAnotherBtn = document.getElementById('try-another-product');
  if (tryAnotherBtn) tryAnotherBtn.addEventListener('click', () => {
    selectedProduct = null;
    goToStep(2);
    // Reset selector
    document.querySelectorAll('.sel-item').forEach(i => i.classList.remove('selected'));
    const selectedBar = document.getElementById('selected-bar');
    if (selectedBar) selectedBar.style.display = 'none';
    const nextBtn = document.getElementById('step2-next');
    if (nextBtn) nextBtn.disabled = true;
  });

  // New photo
  const newPhotoBtn = document.getElementById('try-new-photo');
  if (newPhotoBtn) newPhotoBtn.addEventListener('click', () => {
    uploadedFile = null;
    uploadedDataURL = null;
    const trigger = document.getElementById('upload-trigger');
    const preview = document.getElementById('upload-preview');
    if (trigger) trigger.style.display = 'flex';
    if (preview) preview.style.display = 'none';
    const nextBtn = document.getElementById('step1-next');
    if (nextBtn) nextBtn.disabled = true;
    goToStep(1);
  });
});
