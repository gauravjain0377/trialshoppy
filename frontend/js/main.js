// MirrorAI — Main JS
// Handles navbar scroll, animations, hamburger, scroll reveal

document.addEventListener('DOMContentLoaded', () => {

  // ── Page Loader ──────────────────────────────────────
  const loader = document.createElement('div');
  loader.className = 'page-loader';
  loader.innerHTML = '<div class="loader-ring"></div>';
  document.body.appendChild(loader);

  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('hidden'), 300);
  });

  // ── Navbar Scroll Effect ──────────────────────────────
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // ── Hamburger Menu ────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close on link click
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        hamburger.classList.remove('active');
      });
    });
  }

  // ── Scroll Reveal ─────────────────────────────────────
  const revealElements = document.querySelectorAll(
    '.step-card, .feature-card, .stat, .hero-badge, .cta-card, .float-card'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, entry.target.dataset.delay || 0);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // Stagger cards in grids
  document.querySelectorAll('.steps-grid .step-card').forEach((el, i) => {
    el.dataset.delay = i * 120;
  });
  document.querySelectorAll('.features-grid .feature-card').forEach((el, i) => {
    el.dataset.delay = i * 80;
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ── Active nav link highlight ─────────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // ── Smooth hover on floating cards ───────────────────
  const floatCards = document.querySelectorAll('.float-card');
  floatCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.06) translateY(-4px)';
      card.style.boxShadow = '0 20px 40px rgba(168,85,247,0.3)';
      card.style.borderColor = 'rgba(168,85,247,0.5)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.borderColor = '';
    });
  });

  // ── Button click ripple effect ────────────────────────
  document.querySelectorAll('.btn-primary, .btn-cta').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      ripple.style.cssText = `
        position:absolute; border-radius:50%; background:rgba(255,255,255,0.25);
        width:4px; height:4px;
        left:${e.clientX - rect.left - 2}px;
        top:${e.clientY - rect.top - 2}px;
        transform:scale(0); animation:rippleExpand 0.5s ease forwards;
        pointer-events:none; z-index:10;
      `;
      if (getComputedStyle(this).position === 'static') {
        this.style.position = 'relative';
      }
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    });
  });

  // Ripple keyframe
  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
      @keyframes rippleExpand {
        to { transform: scale(60); opacity: 0; }
      }
      .nav-links.mobile-open {
        display: flex !important;
        flex-direction: column;
        position: fixed;
        top: 70px; left: 0; right: 0;
        background: rgba(7,7,15,0.97);
        backdrop-filter: blur(20px);
        padding: 20px 24px 32px;
        gap: 4px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        z-index: 999;
        animation: slideDown 0.3s ease;
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .hamburger.active span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      .hamburger.active span:nth-child(2) { opacity: 0; }
      .hamburger.active span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
    `;
    document.head.appendChild(style);
  }

});
