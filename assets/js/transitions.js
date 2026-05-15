/**
 * Page Transition System
 * Cream curtain: slides up to cover on exit, slides up to reveal on entry
 * 500ms each phase. Uses GSAP.
 *
 * prefers-reduced-motion: curtain is skipped entirely; navigation is instant.
 */
(function () {
  const DURATION = 0.5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Curtain ───────────────────────────────────────────────────────────────
  const curtain = document.getElementById('page-curtain');
  if (!curtain) return;

  // Style curtain
  Object.assign(curtain.style, {
    position:   'fixed',
    inset:      '0',
    background: '#FCFAF6',
    zIndex:     '99999',
    transform:  'translateY(100%)',
    pointerEvents: 'none',
    willChange: 'transform',
  });

  // ── Entry animation (new page loads, curtain already covering) ────────────
  function runEntry() {
    // If arriving from a transition, curtain is at translateY(0)
    // Otherwise (direct load) it's at translateY(100%) and we skip
    const stored = sessionStorage.getItem('pt-navigating');
    if (stored === '1') {
      sessionStorage.removeItem('pt-navigating');

      if (reducedMotion) {
        // Skip curtain animation — just ensure it's off-screen and resume scroll
        gsap.set(curtain, { y: '100%' });
        resumeLenis();
      } else {
        // Start fully covering, slide up to reveal
        gsap.set(curtain, { y: '0%' });
        gsap.to(curtain, {
          y: '-100%',
          duration: DURATION,
          ease: 'power3.inOut',
          onStart: () => {
            curtain.style.pointerEvents = 'none';
            resumeLenis();
          },
          onComplete: () => {
            gsap.set(curtain, { y: '100%' }); // reset to off-screen bottom for next exit
          }
        });
      }
    } else {
      // Direct load — no curtain, just ensure it's off-screen
      gsap.set(curtain, { y: '100%' });
      resumeLenis();
    }
  }

  // ── Exit animation then navigate ──────────────────────────────────────────
  function runExit(href) {
    if (reducedMotion || typeof gsap === 'undefined') {
      // Skip curtain — navigate immediately (also handles GSAP CDN failure)
      sessionStorage.setItem('pt-navigating', '1');
      window.location.href = href;
      return;
    }
    pauseLenis();
    gsap.set(curtain, { y: '100%' });
    curtain.style.pointerEvents = 'all';
    gsap.to(curtain, {
      y: '0%',
      duration: DURATION,
      ease: 'power3.inOut',
      onComplete: () => {
        sessionStorage.setItem('pt-navigating', '1');
        window.location.href = href;
      }
    });
  }

  // ── Lenis helpers ─────────────────────────────────────────────────────────
  function pauseLenis() {
    if (window.__lenis) {
      try { window.__lenis.stop(); } catch(e) {}
    }
    document.body.style.overflow = 'hidden';
  }
  function resumeLenis() {
    if (window.__lenis) {
      try { window.__lenis.start(); } catch(e) {}
    }
    document.body.style.overflow = '';
  }

  // ── Link interception ─────────────────────────────────────────────────────
  function shouldSkip(a) {
    if (!a || !a.href) return true;
    const href = a.href;
    const origin = window.location.origin;

    // External
    if (!href.startsWith(origin)) return true;
    // mailto / tel
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
    // Hash only
    if (a.getAttribute('href') && a.getAttribute('href').startsWith('#')) return true;
    // New tab
    if (a.target === '_blank') return true;
    // checkout.html — don't intercept to avoid breaking Razorpay flow
    if (href.includes('checkout.html')) return true;
    // Non .html same-page hrefs (e.g. anchors resolved to same page)
    const pathname = new URL(href).pathname;
    if (!pathname.endsWith('.html') && pathname !== '/' && !pathname.endsWith('/')) return true;
    // Same page — also normalise / ↔ /index.html so logo on home never re-fires
    const normPathname = (p) => (p === '/' ? '/index.html' : p);
    if (normPathname(pathname) === normPathname(window.location.pathname)) return true;

    return false;
  }

  document.addEventListener('click', function (e) {
    const a = e.target.closest('a');
    if (!a) return;
    if (shouldSkip(a)) return;
    // Don't intercept if modifier key held
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    // Avoid double-firing
    if (curtain.style.pointerEvents === 'all') return;
    runExit(a.href);
  }, false);

  // ── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runEntry);
  } else {
    runEntry();
  }

})();

/* ── Back to top ─────────────────────────────────────────────────────────── */
(function () {
    var btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 11V2M6.5 2L2 6.5M6.5 2L11 6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(btn);

    window.addEventListener('scroll', function () {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', function () {
        if (window.__lenis) {
            window.__lenis.scrollTo(0, { duration: 1.2 });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
})();
