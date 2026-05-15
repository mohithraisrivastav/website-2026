/**
 * preloader.js
 * First-visit preloader: logo + 00→100 counter + clip-path exit.
 * Fires once per session; skips on page-to-page transitions.
 */
(function () {
    // Skip if already shown this session or if arriving via page transition
    if (sessionStorage.getItem('site-loaded') || sessionStorage.getItem('pt-navigating')) return;

    // Honour reduced motion — skip animation entirely but still mark loaded
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
        sessionStorage.setItem('site-loaded', '1');
        return;
    }

    // Resolve logo path — Work/ subpages need one level up
    const inSubfolder = /\/Work\//i.test(window.location.href);
    const logoSrc = (inSubfolder ? '../' : '') + 'images/Mohith LOGO.png';

    /* ─── Styles ──────────────────────────────────────────────── */
    const css = document.createElement('style');
    css.textContent = `
        #preloader {
            position: fixed;
            inset: 0;
            background: #FCFAF6;
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 28px;
            will-change: clip-path;
            pointer-events: all;
            clip-path: inset(0% 0% 0% 0%);
        }
        #preloader.pl-exit {
            clip-path: inset(0% 0% 100% 0%);
            transition: clip-path 0.9s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .pl-logo {
            height: clamp(48px, 8vw, 80px);
            opacity: 0;
            transform: translateY(16px);
            transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .pl-logo.pl-visible {
            opacity: 1;
            transform: translateY(0);
        }
        .pl-counter {
            font-family: 'Inter', sans-serif;
            font-size: clamp(10px, 1.1vw, 11px);
            font-weight: 700;
            letter-spacing: 6px;
            color: #4A3A33;
            text-transform: uppercase;
            user-select: none;
            min-width: 3ch;
            text-align: center;
        }
        .pl-bar {
            width: clamp(80px, 10vw, 120px);
            height: 1px;
            background: rgba(21,0,0,0.12);
            overflow: hidden;
        }
        .pl-bar-fill {
            height: 100%;
            width: 0%;
            background: #B85C38;
            transition: width 0.05s linear;
        }
    `;
    document.head.appendChild(css);

    /* ─── DOM ─────────────────────────────────────────────────── */
    const el = document.createElement('div');
    el.id = 'preloader';
    el.innerHTML = `
        <img class="pl-logo" src="${logoSrc}" alt="Mohith Rai Srivastav">
        <div class="pl-bar"><div class="pl-bar-fill" id="plBarFill"></div></div>
        <div class="pl-counter" id="plCount">00</div>
    `;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    /* ─── Logo entrance ───────────────────────────────────────── */
    requestAnimationFrame(() => {
        el.querySelector('.pl-logo').classList.add('pl-visible');
    });

    /* ─── Counter rAF loop ────────────────────────────────────── */
    const countEl = document.getElementById('plCount');
    const barFill = document.getElementById('plBarFill');
    const DURATION = 1600; // ms
    let startTime = null;

    function tick(ts) {
        if (!startTime) startTime = ts;
        const raw = Math.min((ts - startTime) / DURATION, 1);
        const eased = 1 - Math.pow(1 - raw, 3);
        const value = Math.floor(eased * 100);
        countEl.textContent = value.toString().padStart(2, '0');
        barFill.style.width = value + '%';

        if (raw < 1) {
            requestAnimationFrame(tick);
        } else {
            countEl.textContent = '100';
            barFill.style.width = '100%';
            setTimeout(exit, 180);
        }
    }

    setTimeout(() => requestAnimationFrame(tick), 400);

    /* ─── Exit ────────────────────────────────────────────────── */
    function finish() {
        el.remove();
        css.remove();
        document.body.style.overflow = '';
        sessionStorage.setItem('site-loaded', '1');
    }
    function exit() {
        el.classList.add('pl-exit');
        // Fallback: always restore scroll after max animation time
        var fallback = setTimeout(finish, 1100);
        el.addEventListener('transitionend', function done(ev) {
            if (ev.propertyName !== 'clip-path') return;
            clearTimeout(fallback);
            el.removeEventListener('transitionend', done);
            finish();
        }, { once: false });
    }
})();
