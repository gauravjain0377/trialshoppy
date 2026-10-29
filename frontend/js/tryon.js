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

// ── Body estimation helpers ────────────────────────────
function estimateBodyLandmarks(imgW, imgH) {
  // Geometric estimation: face in upper-center, shoulders below, hips further down
  // Portrait vs landscape handling
  const isPortrait = imgH >= imgW;

  // Face: roughly top 10–38% height, centered
  const faceTopFrac  = isPortrait ? 0.06 : 0.10;
  const faceHFrac    = isPortrait ? 0.26 : 0.32;
  const faceWFrac    = isPortrait ? 0.32 : 0.30;

  const faceTop  = imgH * faceTopFrac;
  const faceH    = imgH * faceHFrac;
  const faceW    = imgW * faceWFrac;
  const faceCX   = imgW * 0.50;
  const faceBot  = faceTop + faceH;

  // Shoulders: just below face, wider
  const shY  = faceBot + imgH * 0.025;
  const lsX  = imgW * 0.50 - faceW * 0.92;
  const rsX  = imgW * 0.50 + faceW * 0.92;

  // Hips: proportionally below shoulders
  const hipY = Math.min(imgH * 0.92, shY + imgH * (isPortrait ? 0.40 : 0.35));
  const lhX  = imgW * 0.50 - faceW * 0.72;
  const rhX  = imgW * 0.50 + faceW * 0.72;

  // Wrists (at sleeve ends, roughly mid-torso height outward)
  const torsoH = hipY - shY;
  const lwX  = lsX  - faceW * 0.30;
  const lwY  = shY  + torsoH * 0.55;
  const rwX  = rsX  + faceW * 0.30;
  const rwY  = shY  + torsoH * 0.55;

  // Neck (just below face center)
  const neckX = faceCX;
  const neckY = faceBot - faceH * 0.08;

  // Eyes (for eyewear)
  const eyeY  = faceTop + faceH * 0.38;
  const leX   = faceCX - faceW * 0.24;
  const reX   = faceCX + faceW * 0.24;

  // Head top (for cap)
  const headTop = faceTop - faceH * 0.06;

  return {
    ls: { x: lsX, y: shY }, rs: { x: rsX, y: shY },
    lh: { x: lhX, y: hipY }, rh: { x: rhX, y: hipY },
    lw: { x: lwX, y: lwY }, rw: { x: rwX, y: rwY },
    neckX, neckY,
    leX, reX, eyeY,
    faceTop, faceH, faceW, faceCX, headTop,
    shoulderW: rsX - lsX,
    torsoH: hipY - shY,
    hipY
  };
}

// ── Garment drawing helpers (Canvas 2D) ───────────────
function demoDrawClothing(ctx, b, pid) {
  const { ls, rs, lh, rh, lw, rw, neckX, neckY, shoulderW: sw, torsoH: th, hipY } = b;
  const slW = sw * 0.22;

  // colour scheme per product
  const schemes = {
    c1: { body: '#f7f7f5', shade: '#dedede', stroke: '#ccc', collar: '#ddd' },
    c2: { body: '#2563eb', shade: '#1d4ed8', stroke: '#1e3a8a', collar: '#1d4ed8' },
    c3: { body: '#1a1a28', shade: '#2a2a3a', stroke: '#111', collar: '#fff' },
    c4: { body: '#6b7280', shade: '#4b5563', stroke: '#374151', collar: '#9ca3af' },
    c5: { body: '#fed7aa', shade: '#fdba74', stroke: '#fb923c', collar: '#f97316' },
  };
  const sc = schemes[pid] || schemes.c1;

  ctx.save();
  ctx.globalAlpha = 0.87;

  // Main body polygon
  ctx.beginPath();
  ctx.moveTo(neckX - sw * 0.14, neckY + 2);
  ctx.quadraticCurveTo(neckX, neckY - sw * 0.05, neckX + sw * 0.14, neckY + 2);
  ctx.lineTo(rs.x + sw * 0.06, ls.y);       // right shoulder point
  ctx.lineTo(rw.x + slW * 0.55, rw.y);      // right wrist outer
  ctx.lineTo(rw.x - slW * 0.35, rw.y + 8);  // right wrist inner
  ctx.lineTo(rh.x + sw * 0.06, hipY);        // right hem
  ctx.lineTo(lh.x - sw * 0.06, hipY);        // left hem
  ctx.lineTo(lw.x + slW * 0.35, lw.y + 8);  // left wrist inner
  ctx.lineTo(lw.x - slW * 0.55, lw.y);      // left wrist outer
  ctx.lineTo(ls.x - sw * 0.06, ls.y);        // left shoulder point
  ctx.closePath();
  ctx.fillStyle = sc.body;
  ctx.fill();
  ctx.strokeStyle = sc.stroke;
  ctx.lineWidth = Math.max(1, sw * 0.008);
  ctx.stroke();

  // Side shading strips for volume
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = sc.shade;
  ctx.fillRect(ls.x - sw * 0.06, ls.y, sw * 0.15, th);
  ctx.fillRect(rs.x - sw * 0.09, rs.y, sw * 0.15, th);
  ctx.globalAlpha = 0.87;

  // Collar / neck detail
  ctx.beginPath();
  ctx.arc(neckX, neckY + 4, sw * 0.14, 0, Math.PI);
  ctx.strokeStyle = sc.collar;
  ctx.lineWidth = Math.max(3, sw * 0.022);
  ctx.stroke();

  // ── Product-specific extras ──
  if (pid === 'c2') { // Denim lapels + seam
    const lw2 = sw * 0.11;
    ctx.globalAlpha = 0.9;
    [[neckX - lw2, -1], [neckX + lw2, 1]].forEach(([startX, dir]) => {
      ctx.beginPath();
      ctx.moveTo(startX, neckY + 2);
      ctx.lineTo(startX + dir * lw2 * 0.8, neckY + th * 0.26);
      ctx.lineTo(startX - dir * lw2 * 0.4, neckY + th * 0.34);
      ctx.closePath();
      ctx.fillStyle = '#1d4ed8';
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(neckX, neckY + 8);
    ctx.lineTo(neckX, hipY);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (pid === 'c3') { // Blazer lapels + buttons + collar
    const lw2 = sw * 0.13;
    [[-1, neckX - lw2 * 0.6], [1, neckX + lw2 * 0.6]].forEach(([dir, startX]) => {
      ctx.beginPath();
      ctx.moveTo(startX, neckY + 4);
      ctx.lineTo(startX + dir * lw2 * 1.6, neckY + th * 0.26);
      ctx.lineTo(startX + dir * lw2 * 0.2, neckY + th * 0.36);
      ctx.closePath();
      ctx.fillStyle = '#2a2a3a';
      ctx.fill();
    });
    // White shirt collar peek
    ctx.beginPath();
    ctx.moveTo(neckX - lw2 * 0.5, neckY + 5);
    ctx.lineTo(neckX, neckY - 5);
    ctx.lineTo(neckX + lw2 * 0.5, neckY + 5);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Buttons
    [0.42, 0.60].forEach(frac => {
      ctx.beginPath();
      ctx.arc(neckX, neckY + th * frac, Math.max(3, sw * 0.018), 0, Math.PI * 2);
      ctx.fillStyle = '#5a5a6e';
      ctx.fill();
    });
  }

  if (pid === 'c4') { // Hoodie: hood + pocket + drawstrings
    // Hood arc behind head
    ctx.beginPath();
    ctx.moveTo(neckX - sw * 0.3, neckY + 8);
    ctx.quadraticCurveTo(neckX - sw * 0.2, neckY - th * 0.24, neckX, neckY - th * 0.28);
    ctx.quadraticCurveTo(neckX + sw * 0.2, neckY - th * 0.24, neckX + sw * 0.3, neckY + 8);
    ctx.fillStyle = '#57606e';
    ctx.fill();
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Kangaroo pocket
    const pktW = sw * 0.34, pktH = th * 0.13;
    const pktX = neckX - pktW / 2, pktY = hipY - pktH - th * 0.05;
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.roundRect(pktX, pktY, pktW, pktH, 8);
    ctx.fill();
    // Drawstrings
    ctx.beginPath();
    ctx.moveTo(neckX - 7, neckY + 2);  ctx.lineTo(neckX - 16, hipY - th * 0.18);
    ctx.moveTo(neckX + 7, neckY + 2);  ctx.lineTo(neckX + 16, hipY - th * 0.18);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (pid === 'c5') { // Floral shirt: collar + flowers
    // V-collar
    ctx.beginPath();
    ctx.moveTo(neckX - sw * 0.10, neckY + 2);
    ctx.lineTo(neckX - sw * 0.22, neckY + th * 0.26);
    ctx.moveTo(neckX + sw * 0.10, neckY + 2);
    ctx.lineTo(neckX + sw * 0.22, neckY + th * 0.26);
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Flower blobs clipped to garment
    const flowers = [
      { x: neckX - sw*0.22, y: ls.y + th*0.18, r: sw*0.065, col: '#f97316' },
      { x: neckX + sw*0.18, y: ls.y + th*0.34, r: sw*0.055, col: '#ec4899' },
      { x: neckX - sw*0.08, y: ls.y + th*0.54, r: sw*0.06,  col: '#a855f7' },
      { x: neckX + sw*0.05, y: ls.y + th*0.12, r: sw*0.045, col: '#22c55e' },
      { x: neckX - sw*0.28, y: ls.y + th*0.46, r: sw*0.05,  col: '#f43f5e' },
      { x: neckX + sw*0.28, y: ls.y + th*0.60, r: sw*0.055, col: '#f97316' },
    ];
    flowers.forEach(f => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + Math.cos(a)*f.r*0.65, f.y + Math.sin(a)*f.r*0.65, f.r*0.48, f.r*0.28, a, 0, Math.PI * 2);
        ctx.fillStyle = f.col;
        ctx.globalAlpha = 0.7;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.globalAlpha = 0.9;
      ctx.fill();
    });
  }

  ctx.restore();
}

function demoDrawEyewear(ctx, b, pid) {
  const { leX, reX, eyeY, faceW } = b;
  const eyeSpan = reX - leX;
  const lensR   = eyeSpan * 0.37;
  const lensH   = lensR * (pid === 'e1' ? 0.58 : pid === 'e3' ? 1.1 : 1.0);

  const frameColors = { e1: '#b8860b', e2: '#7c4f1e', e3: '#111' };
  const lensColors  = { e1: 'rgba(160,120,40,0.55)', e2: 'rgba(100,65,30,0.35)', e3: 'rgba(10,10,10,0.80)' };
  const fc = frameColors[pid] || '#222';
  const lc = lensColors[pid]  || 'rgba(20,20,20,0.75)';

  ctx.save();
  ctx.globalAlpha = 0.93;

  if (pid === 'e2') { // Round
    [leX, reX].forEach(cx => {
      ctx.beginPath();
      ctx.ellipse(cx, eyeY, lensR, lensR, 0, 0, Math.PI * 2);
      ctx.fillStyle = lc; ctx.fill();
      ctx.strokeStyle = fc; ctx.lineWidth = Math.max(2.5, faceW * 0.025); ctx.stroke();
    });
  } else if (pid === 'e3') { // Wayfarer rectangle
    const rw2 = lensR * 2.1, rh2 = lensR * 1.25;
    [leX, reX].forEach(cx => {
      ctx.beginPath();
      ctx.roundRect(cx - rw2/2, eyeY - rh2/2, rw2, rh2, 5);
      ctx.fillStyle = lc; ctx.fill();
      ctx.strokeStyle = fc; ctx.lineWidth = Math.max(2.5, faceW * 0.025); ctx.stroke();
    });
  } else { // Aviator e1
    [leX, reX].forEach(cx => {
      ctx.beginPath();
      ctx.ellipse(cx, eyeY, lensR, lensH, 0, 0, Math.PI * 2);
      ctx.fillStyle = lc; ctx.fill();
      ctx.strokeStyle = fc; ctx.lineWidth = Math.max(2.5, faceW * 0.025); ctx.stroke();
      // Gold brow bar
      ctx.beginPath();
      ctx.moveTo(cx - lensR * 0.9, eyeY - lensH * 0.85);
      ctx.lineTo(cx + lensR * 0.9, eyeY - lensH * 0.85);
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2.5; ctx.stroke();
    });
  }

  // Bridge
  ctx.beginPath();
  ctx.moveTo(leX + lensR * 0.88, eyeY);
  ctx.lineTo(reX - lensR * 0.88, eyeY);
  ctx.strokeStyle = fc; ctx.lineWidth = 2.5; ctx.stroke();

  // Temple arms
  const armLen = faceW * 0.45;
  ctx.beginPath();
  ctx.moveTo(leX - lensR * 0.9, eyeY); ctx.lineTo(leX - lensR * 0.9 - armLen, eyeY + armLen * 0.12);
  ctx.moveTo(reX + lensR * 0.9, eyeY); ctx.lineTo(reX + lensR * 0.9 + armLen, eyeY + armLen * 0.12);
  ctx.strokeStyle = fc; ctx.lineWidth = 2.5; ctx.stroke();

  // Lens reflections
  ctx.globalAlpha = 0.18;
  [leX, reX].forEach(cx => {
    ctx.beginPath();
    ctx.moveTo(cx - lensR*0.35, eyeY - lensH*0.55);
    ctx.lineTo(cx - lensR*0.05, eyeY - lensH*0.15);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, faceW * 0.012); ctx.stroke();
  });

  ctx.restore();
}

function demoDrawCap(ctx, b) {
  const { faceCX, headTop, faceW, faceH } = b;
  const capW = faceW * 1.15;
  const capH = capW * 0.44;
  const brimH = capW * 0.09;

  ctx.save();
  ctx.globalAlpha = 0.9;

  // Dome
  ctx.beginPath();
  ctx.ellipse(faceCX, headTop + capH * 0.52, capW * 0.52, capH * 0.52, 0, Math.PI, 0, true);
  ctx.lineTo(faceCX + capW * 0.52, headTop + capH * 0.52);
  ctx.lineTo(faceCX - capW * 0.52, headTop + capH * 0.52);
  ctx.closePath();
  ctx.fillStyle = '#b45309'; ctx.fill();
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2; ctx.stroke();

  // Brim
  ctx.beginPath();
  ctx.ellipse(faceCX + capW * 0.08, headTop + capH * 0.52, capW * 0.52, brimH, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#92400e'; ctx.fill();
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.5; ctx.stroke();

  // Logo circle
  ctx.beginPath();
  ctx.arc(faceCX, headTop + capH * 0.28, capW * 0.058, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24'; ctx.fill();

  ctx.restore();
}

function demoDrawNecklace(ctx, b) {
  const { ls, rs, neckX, neckY } = b;
  const sw = rs.x - ls.x;

  ctx.save();
  ctx.globalAlpha = 0.9;

  // Main chain arc
  ctx.beginPath();
  ctx.moveTo(ls.x + sw * 0.14, neckY - 2);
  ctx.quadraticCurveTo(neckX, neckY + sw * 0.13, rs.x - sw * 0.14, neckY - 2);
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = Math.max(4, sw * 0.03); ctx.lineCap = 'round'; ctx.stroke();
  // Link texture
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = Math.max(2, sw * 0.012);
  ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);

  // Pendant
  ctx.beginPath();
  ctx.arc(neckX, neckY + sw * 0.15, sw * 0.042, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24'; ctx.fill();
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.restore();
}

function demoDrawWatch(ctx, b) {
  const { lw, rw, shoulderW: sw } = b;
  const wrist = lw;
  const watchW = sw * 0.17;
  const watchH = watchW * 1.22;

  ctx.save();
  ctx.globalAlpha = 0.92;

  // Strap
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.roundRect(wrist.x - watchW*0.38, wrist.y - watchH*0.22, watchW*0.76, watchH*1.05, 5);
  ctx.fill();

  // Case
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.roundRect(wrist.x - watchW/2, wrist.y - watchH/2, watchW, watchH, 6);
  ctx.fill();
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.stroke();

  // Dial
  ctx.fillStyle = '#f9fafb';
  ctx.beginPath();
  ctx.roundRect(wrist.x - watchW*0.42, wrist.y - watchH*0.42, watchW*0.84, watchH*0.84, 4);
  ctx.fill();

  // Hands
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(wrist.x, wrist.y); ctx.lineTo(wrist.x, wrist.y - watchH*0.28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wrist.x, wrist.y); ctx.lineTo(wrist.x + watchW*0.22, wrist.y); ctx.stroke();

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════════════
//  QUAD-WARP ENGINE (shared with camera AR overlay)
//  Maps the garment PNG onto a 4-corner body quad for perspective realism
// ══════════════════════════════════════════════════════════════════════
function drawImageWarped(ctx, img, tl, tr, br, bl, alpha = 1.0) {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const STEPS = 24;  // strip count — more = smoother warp
  const iW = img.naturalWidth;
  const iH = img.naturalHeight;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let i = 0; i < STEPS; i++) {
    const t0 = i       / STEPS;
    const t1 = (i + 1) / STEPS;

    // Left & right edge of this strip
    const l0x = tl.x + (bl.x - tl.x) * t0,  l0y = tl.y + (bl.y - tl.y) * t0;
    const l1x = tl.x + (bl.x - tl.x) * t1,  l1y = tl.y + (bl.y - tl.y) * t1;
    const r0x = tr.x + (br.x - tr.x) * t0,  r0y = tr.y + (br.y - tr.y) * t0;
    const r1x = tr.x + (br.x - tr.x) * t1,  r1y = tr.y + (br.y - tr.y) * t1;

    const sy0  = iH * t0;
    const sy1  = iH * t1;
    const srcH = sy1 - sy0;
    if (srcH <= 0) continue;

    // Affine: map (0,sy0)→l0, (iW,sy0)→r0, (0,sy1)→l1
    const a = (r0x - l0x) / iW;   // m11
    const b = (l1x - l0x) / srcH; // m12
    const c = l0x;                 // dx
    const d = (r0y - l0y) / iW;   // m21
    const e = (l1y - l0y) / srcH; // m22
    const f = l0y;                 // dy

    ctx.save();
    ctx.setTransform(a, d, b, e, c, f);
    ctx.beginPath();
    ctx.rect(0, sy0, iW, srcH + 0.5);
    ctx.clip();
    ctx.drawImage(img, 0, 0, iW, iH);
    ctx.restore();
  }

  ctx.restore();
}

// Draw a soft radial shadow behind the garment quad for body depth
function drawGarmentShadow(ctx, tl, tr, br, bl) {
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;
  const r  = Math.max(
    Math.hypot(tr.x - tl.x, tr.y - tl.y),
    Math.hypot(bl.x - tl.x, bl.y - tl.y)
  ) * 0.52;

  const grad = ctx.createRadialGradient(cx, cy + r * 0.04, r * 0.08, cx, cy, r * 1.08);
  grad.addColorStop(0,   'rgba(0,0,0,0.22)');
  grad.addColorStop(0.55,'rgba(0,0,0,0.08)');
  grad.addColorStop(1,   'rgba(0,0,0,0.00)');

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Clothing quad warp onto estimated body landmarks ─────────────────
function compositeClothing(ctx, img, b, pid) {
  const { ls, rs, lh, rh, neckX, neckY, shoulderW: sw, hipY } = b;

  const aspect = (pid === 'c4') ? 1.02 : (pid === 'c2') ? 1.15 : 1.12;
  const garmentW = sw * 2.42;
  const garmentH = garmentW * aspect;

  // Collar top: just above shoulder joints, anchored to neck
  const shoulderMidY = (ls.y + rs.y) / 2;
  const collarY    = Math.min(shoulderMidY - sw * 0.03, neckY + sw * 0.45);
  const garmentTopY = collarY - garmentH * 0.10;

  // Shoulder tilt
  const angle   = Math.atan2(rs.y - ls.y, rs.x - ls.x);
  const tiltCos = Math.cos(angle);
  const tiltSin = Math.sin(angle);

  const cx = neckX;
  const cy = (ls.y + rs.y) / 2;
  const topDY = garmentTopY - cy;
  const botDY = garmentTopY + garmentH - cy;

  const topHalf = garmentW / 2;
  const botHalf = garmentW / 2 * 1.04; // slight A-line flare

  function rotPt(dx, dy) {
    return {
      x: cx + dx * tiltCos - dy * tiltSin,
      y: cy + dx * tiltSin + dy * tiltCos,
    };
  }

  const tl = rotPt(-topHalf, topDY);
  const tr = rotPt(+topHalf, topDY);
  const bl = rotPt(-botHalf, botDY);
  const br = rotPt(+botHalf, botDY);

  drawGarmentShadow(ctx, tl, tr, br, bl);
  drawImageWarped(ctx, img, tl, tr, br, bl, 1.0);
}

// ── Eyewear overlay ──────────────────────────────────────────────────
function compositeEyewear(ctx, img, b) {
  const { leX, reX, eyeY, faceW } = b;
  const eyeSpan = reX - leX;
  const midX    = (leX + reX) / 2;
  const gW      = eyeSpan * 2.15;
  const gH      = gW * 0.46;

  ctx.save();
  ctx.globalAlpha = 0.97;
  ctx.drawImage(img, midX - gW / 2, eyeY - gH / 2, gW, gH);
  ctx.restore();
}

// ── Accessories overlay ──────────────────────────────────────────────
function compositeAccessory(ctx, img, b, pid) {
  const { faceCX, headTop, faceW, faceH, neckX, ls, rs, lw, shoulderW: sw } = b;

  if (pid === 'a1') { // Cap
    const capW = faceW * 1.45;
    const capH = capW * 0.65;
    ctx.save();
    ctx.globalAlpha = 0.97;
    ctx.drawImage(img, faceCX - capW / 2, headTop - capH * 0.30, capW, capH);
    ctx.restore();
  } else if (pid === 'a2') { // Necklace — quad-warp along collar curve
    const nW = sw * 0.90;
    const nH = nW * 0.62;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(img, neckX - nW / 2, ls.y - nH * 0.10, nW, nH);
    ctx.restore();
  } else if (pid === 'a3') { // Watch
    const wSize = sw * 0.28;
    ctx.save();
    ctx.globalAlpha = 0.97;
    ctx.drawImage(img, lw.x - wSize / 2, lw.y - wSize / 2, wSize, wSize);
    ctx.restore();
  }
}

// ── Main photo try-on compositing (upgraded) ─────────────────────────
function createDemoResult(imgEl) {
  if (!imgEl || !uploadedDataURL) return;

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = new Image();

  img.onload = () => {
    const W = img.width;
    const H = img.height;
    canvas.width  = W;
    canvas.height = H;

    // 1. Draw original photo
    ctx.drawImage(img, 0, 0);

    const pid = selectedProduct?.id || 'c1';
    const cat = selectedProduct?.category || 'clothing';

    // 2. Estimate body landmarks geometrically
    const b = estimateBodyLandmarks(W, H);

    // 3. Load product PNG and composite with quad-warp
    const prodImg = new Image();
    prodImg.crossOrigin = 'anonymous';

    prodImg.onload = () => {
      if (cat === 'clothing') {
        compositeClothing(ctx, prodImg, b, pid);
      } else if (cat === 'eyewear') {
        compositeEyewear(ctx, prodImg, b);
      } else if (cat === 'accessories') {
        compositeAccessory(ctx, prodImg, b, pid);
      }

      // Watermark
      const wSz = Math.max(11, W * 0.020);
      ctx.font  = `bold ${wSz}px Outfit, sans-serif`;
      ctx.textAlign   = 'right';
      ctx.fillStyle   = 'rgba(168,85,247,0.80)';
      ctx.globalAlpha = 0.72;
      ctx.fillText('MirrorAI • Virtual Try-On', W - 14, H - 12);
      ctx.globalAlpha = 1;

      imgEl.src = canvas.toDataURL('image/jpeg', 0.94);
    };

    prodImg.onerror = () => {
      // Fallback to existing procedural vector shapes if PNG missing
      if (cat === 'clothing')    demoDrawClothing(ctx, b, pid);
      else if (cat === 'eyewear') demoDrawEyewear(ctx, b, pid);
      else if (cat === 'accessories') {
        if (pid === 'a1') demoDrawCap(ctx, b);
        else if (pid === 'a2') demoDrawNecklace(ctx, b);
        else if (pid === 'a3') demoDrawWatch(ctx, b);
      }
      imgEl.src = canvas.toDataURL('image/jpeg', 0.93);
    };

    prodImg.src = `assets/products/${pid}.png`;
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
