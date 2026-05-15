/**
 * image-follow.js
 * A floating image preview that lerp-follows the cursor on hover
 * over .work-item, .product-card, .shop-preview-card, .work-card,
 * and .cinema-panel.
 * Disabled on touch devices and prefers-reduced-motion.
 */
(function () {
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* ─── Inject styles ───────────────────────────────────────── */
    const style = document.createElement('style');
    style.textContent = `
        #img-follower {
            position: fixed;
            top: 0; left: 0;
            width: 240px;
            aspect-ratio: 3 / 4;
            overflow: hidden;
            pointer-events: none;
            z-index: 9990;
            background: #111;
            opacity: 0;
            transition: opacity 0.3s ease;
            will-change: transform;
        }
        #img-follower img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    `;
    document.head.appendChild(style);

    /* ─── Create element ──────────────────────────────────────── */
    const follower = document.createElement('div');
    follower.id = 'img-follower';
    const fImg = document.createElement('img');
    fImg.alt = '';
    follower.appendChild(fImg);
    document.body.appendChild(follower);

    /* ─── State ───────────────────────────────────────────────── */
    const LERP   = 0.09;
    const LERP_S = 0.1;          // scale lerp
    const OFFSET_X = 32;         // px right of cursor
    const OFFSET_Y = 0;          // vertically centered on cursor

    let mx = -400, my = -400;    // raw mouse
    let cx = mx,   cy = my;      // lerp position
    let scaleCurrent = 0.82, scaleTarget = 0.82;
    let active = false;
    let currentSrc = '';

    /* ─── rAF lerp loop ───────────────────────────────────────── */
    (function loop() {
        cx += (mx - cx) * LERP;
        cy += (my - cy) * LERP;
        scaleCurrent += (scaleTarget - scaleCurrent) * LERP_S;

        follower.style.transform =
            `translate(${(cx + OFFSET_X).toFixed(2)}px, ` +
            `calc(${(cy + OFFSET_Y).toFixed(2)}px - 50%)) ` +
            `scale(${scaleCurrent.toFixed(4)})`;

        requestAnimationFrame(loop);
    })();

    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
    });

    /* ─── Hover targets ───────────────────────────────────────── */
    const SELECTORS = [
        '.work-item',
        '.product-card',
        '.shop-preview-card',
        '.work-card',
        '.cinema-panel'
    ].join(', ');

    function show(src) {
        if (!src || src === currentSrc) { return; }
        currentSrc = src;
        // Swap image — fade through black
        fImg.style.opacity = '0';
        setTimeout(() => {
            fImg.src = src;
            fImg.style.opacity = '1';
            fImg.style.transition = 'opacity 0.25s ease';
        }, src === currentSrc ? 0 : 80);

        follower.style.opacity = '1';
        scaleTarget = 1.0;
        active = true;
    }

    function hide() {
        follower.style.opacity = '0';
        scaleTarget = 0.82;
        active = false;
        currentSrc = '';
    }

    document.addEventListener('mouseover', e => {
        const card = e.target.closest(SELECTORS);
        if (!card) return;
        const img = card.querySelector('img');
        if (!img || !img.src) return;
        show(img.src);
    });

    document.addEventListener('mouseout', e => {
        const card = e.target.closest(SELECTORS);
        if (!card) return;
        // Only hide if leaving the card entirely
        if (e.relatedTarget && card.contains(e.relatedTarget)) return;
        hide();
    });

    /* Hide when cursor leaves window */
    document.addEventListener('mouseleave', hide);
})();
