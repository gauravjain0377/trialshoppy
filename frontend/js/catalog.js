// MirrorAI — Catalog JS
// Product data, filtering, search, modal

const PRODUCTS = [
  // ── Clothing ──────────────────────────────────────────
  {
    id: 'c1',
    name: 'Classic White Tee',
    category: 'clothing',
    emoji: '👕',
    bg: 'bg-purple-soft',
    desc: 'A timeless white cotton t-shirt with a relaxed fit. Perfect for everyday wear.',
    tags: ['Casual', 'Unisex', 'Cotton', 'Relaxed Fit'],
    ai: 'Pose Detection + Warping',
    filename: 'white_tee.png'
  },
  {
    id: 'c2',
    name: 'Denim Jacket',
    category: 'clothing',
    emoji: '🧥',
    bg: 'bg-indigo-soft',
    desc: 'A classic blue denim jacket. Rugged, stylish, and versatile for any season.',
    tags: ['Denim', 'Jacket', 'Casual', 'Layering'],
    ai: 'Pose Detection + Warping',
    filename: 'denim_jacket.png'
  },
  {
    id: 'c3',
    name: 'Formal Blazer',
    category: 'clothing',
    emoji: '🥋',
    bg: 'bg-violet-soft',
    desc: 'A sharp black formal blazer. Ideal for meetings, events, and professional settings.',
    tags: ['Formal', 'Business', 'Black', 'Slim Fit'],
    ai: 'Pose Detection + Warping',
    filename: 'blazer.png'
  },
  {
    id: 'c4',
    name: 'Hoodie Sweatshirt',
    category: 'clothing',
    emoji: '🫶',
    bg: 'bg-blue-soft',
    desc: 'A cozy pullover hoodie in a soft grey tone. Great for casual days and cold weather.',
    tags: ['Hoodie', 'Casual', 'Comfort', 'Winter'],
    ai: 'Pose Detection + Warping',
    filename: 'hoodie.png'
  },
  {
    id: 'c5',
    name: 'Summer Floral Shirt',
    category: 'clothing',
    emoji: '🌺',
    bg: 'bg-pink-soft',
    desc: 'A vibrant floral print shirt perfect for beach days and summer outings.',
    tags: ['Summer', 'Floral', 'Casual', 'Lightweight'],
    ai: 'Pose Detection + Warping',
    filename: 'floral_shirt.png'
  },

  // ── Eyewear ───────────────────────────────────────────
  {
    id: 'e1',
    name: 'Classic Aviators',
    category: 'eyewear',
    emoji: '🕶️',
    bg: 'bg-indigo-soft',
    desc: 'Timeless gold-frame aviator sunglasses with dark tinted lenses. A forever style.',
    tags: ['Aviator', 'Sunglasses', 'Gold Frame', 'UV400'],
    ai: 'Face Mesh + Landmark',
    filename: 'aviators.png'
  },
  {
    id: 'e2',
    name: 'Round Tortoise Frames',
    category: 'eyewear',
    emoji: '👓',
    bg: 'bg-violet-soft',
    desc: 'Stylish round tortoiseshell prescription frames for a retro-modern look.',
    tags: ['Round', 'Tortoise', 'Prescription', 'Retro'],
    ai: 'Face Mesh + Landmark',
    filename: 'tortoise_rounds.png'
  },
  {
    id: 'e3',
    name: 'Wayfarer Sunglasses',
    category: 'eyewear',
    emoji: '😎',
    bg: 'bg-purple-soft',
    desc: 'Iconic black wayfarer sunglasses. Bold, confident, and universally flattering.',
    tags: ['Wayfarer', 'Sunglasses', 'Black', 'Iconic'],
    ai: 'Face Mesh + Landmark',
    filename: 'wayfarer.png'
  },

  // ── Accessories ───────────────────────────────────────
  {
    id: 'a1',
    name: 'Leather Baseball Cap',
    category: 'accessories',
    emoji: '🧢',
    bg: 'bg-blue-soft',
    desc: 'A sleek all-black leather baseball cap with an adjustable strap.',
    tags: ['Cap', 'Leather', 'Adjustable', 'Streetwear'],
    ai: 'Face Mesh + Head Pose',
    filename: 'baseball_cap.png'
  },
  {
    id: 'a2',
    name: 'Chunky Chain Necklace',
    category: 'accessories',
    emoji: '📿',
    bg: 'bg-violet-soft',
    desc: 'A bold gold chunky chain necklace. Statement jewelry for any outfit.',
    tags: ['Necklace', 'Gold', 'Statement', 'Bold'],
    ai: 'Pose + Neck Landmark',
    filename: 'chain_necklace.png'
  },
  {
    id: 'a3',
    name: 'Watch — Minimalist',
    category: 'accessories',
    emoji: '⌚',
    bg: 'bg-pink-soft',
    desc: 'A clean, minimalist watch with a white dial and black leather strap.',
    tags: ['Watch', 'Minimalist', 'Leather', 'Timeless'],
    ai: 'Wrist Landmark Detection',
    filename: 'watch.png'
  }
];

let activeFilter = 'all';
let searchQuery = '';

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const noResults = document.getElementById('no-results');

  let filtered = PRODUCTS.filter(p => {
    const matchFilter = activeFilter === 'all' || p.category === activeFilter;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.tags.some(t => t.toLowerCase().includes(searchQuery));
    return matchFilter && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';

  grid.innerHTML = filtered.map((p, i) => `
    <div class="product-card" data-id="${p.id}" id="product-${p.id}" style="animation-delay:${i * 60}ms" role="button" tabindex="0" aria-label="View ${p.name}">
      <div class="product-card-overlay"></div>
      <div class="product-card-img ${p.bg}">
        <span class="product-emoji" role="img" aria-label="${p.name}">${p.emoji}</span>
        <div class="product-card-badge badge-${p.category}">${p.category}</div>
      </div>
      <div class="product-card-body">
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-desc">${p.desc.substring(0, 72)}...</div>
        <div class="product-card-footer">
          <div class="try-on-chip">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 10c0-2.209 1.791-4 4-4s4 1.791 4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Try On
          </div>
          <span class="product-ai-tag">${p.ai}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Add click + keyboard listeners
  grid.querySelectorAll('.product-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('click', () => openModal(id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openModal(id);
    });
  });
}

function openModal(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  document.getElementById('modal-img').textContent = product.emoji;
  document.getElementById('modal-category').textContent = product.category.charAt(0).toUpperCase() + product.category.slice(1);
  document.getElementById('modal-title').textContent = product.name;
  document.getElementById('modal-desc').textContent = product.desc;
  document.getElementById('modal-tags').innerHTML = product.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');

  // Set try-on link with product info
  const tryOnBtn = document.getElementById('modal-tryon-btn');
  tryOnBtn.href = `tryon.html?product=${id}&name=${encodeURIComponent(product.name)}&emoji=${encodeURIComponent(product.emoji)}&category=${product.category}`;

  const modal = document.getElementById('product-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Store selected product in sessionStorage
  sessionStorage.setItem('selectedProduct', JSON.stringify(product));
}

function closeModal() {
  document.getElementById('product-modal').style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeFilter = this.dataset.filter;
      renderProducts();
    });
  });

  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      searchQuery = this.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('product-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
