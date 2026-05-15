/**
 * Image Reveal System — Step 3
 * Clip-path wipe from bottom on scroll entry.
 * Targets: .img-wrap img, .product-image img, .card-img
 * Each wrapper must have overflow:hidden (already set in CSS).
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined') return;

  // Register ScrollTrigger if not already done
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  const DURATION = 1.2;
  const EASE     = 'power4.out';
  const START    = 'top 88%';

  /**
   * Reveal a single image element with clip-path wipe.
   * @param {Element} img  - the img/element to animate
   * @param {Element} trigger - ScrollTrigger trigger element (parent wrapper)
   * @param {number}  delay - stagger offset in seconds
   */
  function revealImg(img, trigger, delay) {
    // Ensure the wrapper clips overflow
    const wrapper = img.parentElement;
    if (wrapper && getComputedStyle(wrapper).overflow === 'visible') {
      wrapper.style.overflow = 'hidden';
    }

    gsap.set(img, { clipPath: 'inset(100% 0 0 0)', scale: 1.08 });

    gsap.to(img, {
      clipPath: 'inset(0% 0 0 0)',
      scale: 1.0,
      duration: DURATION,
      ease: EASE,
      delay: delay || 0,
      scrollTrigger: {
        trigger: trigger || img,
        start: START,
        toggleActions: 'play none none none',
      },
    });
  }

  // ── .img-wrap img  (index.html shop preview) ──────────────────────────────
  document.querySelectorAll('.img-wrap img').forEach(function (img, i) {
    const card = img.closest('.shop-preview-card') || img.parentElement;
    // Stagger cards in same row: offset by position within siblings
    const siblings = card.parentElement
      ? Array.from(card.parentElement.children).filter(c => c.classList.contains('shop-preview-card'))
      : [];
    const idx = siblings.indexOf(card);
    revealImg(img, card, idx >= 0 ? idx * 0.12 : 0);
  });

  // ── .product-image img  (shop.html) ───────────────────────────────────────
  document.querySelectorAll('.product-image img').forEach(function (img, i) {
    const card = img.closest('.product-card') || img.parentElement;
    const siblings = card.parentElement
      ? Array.from(card.parentElement.children).filter(c => c.classList.contains('product-card'))
      : [];
    const idx = siblings.indexOf(card);
    revealImg(img, card, idx >= 0 ? (idx % 3) * 0.1 : 0);
  });

  // ── .card-img  (work.html masonry) ────────────────────────────────────────
  document.querySelectorAll('.card-img').forEach(function (img) {
    const card = img.closest('.work-card') || img.parentElement;
    // The card itself already gets a y/opacity reveal from work.html's GSAP.
    // We add clip-path to the img inside — a secondary layer of motion.
    gsap.set(img, { clipPath: 'inset(100% 0 0 0)', scale: 1.08 });
    gsap.to(img, {
      clipPath: 'inset(0% 0 0 0)',
      scale: 1.0,
      duration: DURATION,
      ease: EASE,
      scrollTrigger: {
        trigger: card,
        start: 'top 92%',
        toggleActions: 'play none none none',
      },
    });
  });

})();
