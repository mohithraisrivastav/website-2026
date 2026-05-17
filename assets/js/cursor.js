/**
 * cursor.js — Awwwards-level custom cursor
 * Two-element: dot (instant) + ring (lerp 0.12)
 * Labels: VIEW on work/gallery images, BUY on shop/product cards, OPEN on links/buttons
 * blend-mode: difference on image hover
 * Click spring: scale 0.6 → spring back
 * Disabled on touch devices & prefers-reduced-motion.
 */
(function () {
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* ─── Inject CSS ──────────────────────────────────────────── */
    const style = document.createElement('style');
    style.textContent = `
        body.custom-cursor-active,
        body.custom-cursor-active * { cursor: none !important; }

        #c-dot {
            position: fixed;
            top: 0; left: 0;
            width: 7px; height: 7px;
            border-radius: 50%;
            background: #1A1612;
            pointer-events: none;
            z-index: 999999;
            transform: translate(-50%, -50%) scale(1);
            will-change: transform;
            transition: width 0.18s ease, height 0.18s ease, opacity 0.18s ease;
        }
        #c-dot.img-hover {
            width: 5px; height: 5px;
            background: #1A1612;
        }
        #c-dot.link-hover { opacity: 0; }

        #c-ring {
            position: fixed;
            top: 0; left: 0;
            width: 36px; height: 36px;
            border-radius: 50%;
            border: 1.5px solid #1A1612;
            pointer-events: none;
            z-index: 999998;
            transform: translate(-50%, -50%);
            will-change: transform;
            display: flex; align-items: center; justify-content: center;
            transition: width 0.12s ease,
                        height 0.12s ease,
                        opacity 0.12s ease,
                        border-color 0.12s ease;
        }
        #c-ring.img-hover {
            width: 80px; height: 80px;
            border-color: #1A1612;
        }
        #c-ring.link-hover {
            width: 22px; height: 22px;
            border-color: #CFA246;
        }
        #c-ring.hidden { opacity: 0; }

        #c-label {
            font-family: 'Inter', sans-serif;
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #1A1612;
            opacity: 0;
            transition: opacity 0.1s ease;
            user-select: none;
            line-height: 1;
            pointer-events: none;
        }
        #c-label.visible { opacity: 1; }
    `;
    document.head.appendChild(style);

    /* ─── Elements ────────────────────────────────────────────── */
    const dot   = document.createElement('div');  dot.id  = 'c-dot';
    const ring  = document.createElement('div');  ring.id = 'c-ring';
    const label = document.createElement('span'); label.id = 'c-label';

    ring.appendChild(label);
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('custom-cursor-active');

    /* ─── Position state ──────────────────────────────────────── */
    let mx = -200, my = -200;
    let rx = mx,   ry = my;
    const LERP = 0.35;

    /* Dot follows instantly */
    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        dot.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%)) scale(${dotScale})`;
    });

    /* Ring lerp rAF */
    let dotScale = 1;
    (function loop() {
        rx += (mx - rx) * LERP;
        ry += (my - ry) * LERP;
        ring.style.transform = `translate(calc(${rx}px - 50%), calc(${ry}px - 50%))`;
        requestAnimationFrame(loop);
    })();

    /* ─── Click spring ────────────────────────────────────────── */
    document.addEventListener('mousedown', () => {
        dotScale = 0.5;
        dot.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%)) scale(0.5)`;
        dot.style.transition = 'width 0.18s ease, height 0.18s ease, opacity 0.18s ease, transform 0.1s ease';
    });

    document.addEventListener('mouseup', () => {
        dotScale = 1;
        dot.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%)) scale(1)`;
        dot.style.transition = 'width 0.18s ease, height 0.18s ease, opacity 0.18s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        // Reset to no-transition after spring settles
        setTimeout(() => {
            dot.style.transition = 'width 0.18s ease, height 0.18s ease, opacity 0.18s ease, mix-blend-mode 0s';
        }, 400);
    });

    /* ─── Hover state helpers ─────────────────────────────────── */
    function setDefault() {
        dot.classList.remove('img-hover', 'link-hover');
        ring.classList.remove('img-hover', 'link-hover', 'hidden');
        label.classList.remove('visible');
        label.textContent = '';
    }

    function setImageHover(text) {
        dot.classList.add('img-hover');
        dot.classList.remove('link-hover');
        ring.classList.add('img-hover');
        ring.classList.remove('link-hover', 'hidden');
        label.textContent = text;
        label.classList.add('visible');
    }

    function setLinkHover(text) {
        dot.classList.add('link-hover');
        dot.classList.remove('img-hover');
        ring.classList.add('link-hover');
        ring.classList.remove('img-hover', 'hidden');
        if (text) {
            label.textContent = text;
            label.classList.add('visible');
        } else {
            label.classList.remove('visible');
            label.textContent = '';
        }
    }

    function setHidden() {
        ring.classList.add('hidden');
        dot.classList.remove('img-hover', 'link-hover');
    }

    /* ─── Hover detection ─────────────────────────────────────── */
    document.addEventListener('mouseover', e => {
        const t = e.target;

        // Viewfinder — hide both
        if (t.closest('.viewfinder')) {
            setHidden(); return;
        }

        // Shop / product BUY areas
        if (
            t.closest('.product-card') ||
            t.closest('.shop-preview-card') ||
            t.closest('.cart-item')
        ) {
            setImageHover('BUY'); return;
        }

        // Work / gallery VIEW areas
        if (
            t.closest('.work-item') ||
            t.closest('.project-card') ||
            t.closest('.track-item') ||
            t.closest('[data-lightbox]')
        ) {
            setImageHover('VIEW'); return;
        }

        // Blog / film / journal cards → OPEN
        if (
            t.closest('.concept') ||
            t.closest('.film-card') ||
            t.closest('.blog-card') ||
            t.closest('.workshop-card')
        ) {
            setLinkHover('OPEN'); return;
        }

        // Generic links and buttons
        if (t.closest('a') || t.closest('button') || t.closest('[role="button"]')) {
            setLinkHover(''); return;
        }

        setDefault();
    });

    document.addEventListener('mouseout', e => {
        if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
            setDefault();
        }
    });

    /* Hide on leave, restore on enter */
    document.addEventListener('mouseleave', () => {
        dot.style.opacity = '0';
        ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
        dot.style.opacity = '';
        ring.style.opacity = '';
    });
})();
