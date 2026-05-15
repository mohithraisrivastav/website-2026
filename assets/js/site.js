/**
 * site.js — global page utilities
 * Newsletter form handler (runs on all pages via <script> tag)
 */

/* ── Accessibility: fix non-button interactive elements ─────────────────── */
(function fixNavA11y() {
    function addKeyboardSupport(el, label) {
        if (!el) return;
        if (el.tagName === 'BUTTON' || el.tagName === 'A') return;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        if (label) el.setAttribute('aria-label', label);
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        /* Hamburger */
        var hamburger = document.getElementById('hamburgerBtn');
        if (hamburger) {
            addKeyboardSupport(hamburger, 'Open navigation menu');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-controls', 'mobileMenu');

            var mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                new MutationObserver(function () {
                    var open = mobileMenu.classList.contains('active');
                    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
                    hamburger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
                }).observe(mobileMenu, { attributes: true, attributeFilter: ['class'] });
            }
        }

        /* Cart icon divs (index.html / shop.html variant) */
        document.querySelectorAll('.cart-icon').forEach(function (el) {
            addKeyboardSupport(el, 'View shopping cart');
        });

        /* Close cart button */
        var closeCart = document.querySelector('.close-cart');
        addKeyboardSupport(closeCart, 'Close cart');

        /* Nav dropdown — make keyboard-openable */
        document.querySelectorAll('.nav-has-dropdown > a').forEach(function (link) {
            link.setAttribute('aria-haspopup', 'true');
            link.setAttribute('aria-expanded', 'false');
            link.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var expanded = link.getAttribute('aria-expanded') === 'true';
                    link.setAttribute('aria-expanded', !expanded ? 'true' : 'false');
                    var dropdown = link.parentElement.querySelector('.nav-dropdown');
                    if (dropdown) {
                        dropdown.style.opacity     = !expanded ? '1' : '';
                        dropdown.style.visibility  = !expanded ? 'visible' : '';
                        dropdown.style.pointerEvents = !expanded ? 'auto' : '';
                        dropdown.style.transform   = !expanded ? 'translateX(-50%) translateY(0)' : '';
                    }
                }
                if (e.key === 'Escape') {
                    link.setAttribute('aria-expanded', 'false');
                    var dropdown = link.parentElement.querySelector('.nav-dropdown');
                    if (dropdown) {
                        dropdown.style.opacity = '';
                        dropdown.style.visibility = '';
                        dropdown.style.pointerEvents = '';
                        dropdown.style.transform = '';
                    }
                }
            });
        });

        /* Mobile menu — trap focus inside while open */
        var mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            mobileMenu.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    var burger = document.getElementById('hamburgerBtn');
                    if (burger) burger.click();
                }
            });
        }
    });
})();

/* ── Mobile nav accordion ───────────────────────────────────────────────── */
window.toggleMobileDropdown = function (btn) {
    var isOpen = btn.classList.toggle('open');
    var children = btn.nextElementSibling;
    if (children) children.classList.toggle('open', isOpen);
};

/* ── Auto active-state detection ────────────────────────────────────────── */
(function setNavActive() {
    var page   = (window.location.pathname.split('/').pop() || 'index.html');
    var inWork = window.location.pathname.indexOf('/Work/') !== -1;

    document.querySelectorAll('.nav-links a, .nav-dropdown a').forEach(function (a) {
        var href = (a.getAttribute('href') || '').split('/').pop();
        if (href === page) a.classList.add('active');
        /* All Work sub-pages map to Photography (work.html) */
        if (inWork && href === 'work.html') a.classList.add('active');
    });

    /* Bubble active up to parent dropdown trigger */
    document.querySelectorAll('.nav-has-dropdown').forEach(function (li) {
        if (li.querySelector('.nav-dropdown a.active')) {
            var parent = li.querySelector(':scope > a');
            if (parent) parent.classList.add('active');
        }
    });
})();

/* ── Back button (Guides / Assets pages) ────────────────────────────────── */
(function injectBackButton() {
    var page = (location.pathname.split('/').pop() || '').toLowerCase();
    var shopPages = ['assets.html'];
    if (shopPages.indexOf(page) === -1) return;

    var btn = document.createElement('button');
    btn.className = 'page-back-btn';
    btn.setAttribute('aria-label', 'Go to previous page');
    btn.innerHTML =
        '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Back';

    btn.addEventListener('click', function () {
        if (history.length > 1) {
            history.back();
        } else {
            location.href = 'index.html';
        }
    });

    /* Shop pages — insert before the tab nav */
    var tabNav = document.querySelector('.tab-nav');
    if (tabNav) {
        tabNav.parentNode.insertBefore(btn, tabNav);
        return;
    }

    /* Assets page — insert at the top of .assets-main */
    var main = document.querySelector('.assets-main');
    if (main) {
        main.insertBefore(btn, main.firstChild);
    }
})();

(function () {
    var form     = document.getElementById('sfForm');
    var ok       = document.getElementById('sfFormOk');
    var _loaded  = Date.now();
    if (!form || !ok) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        /* Timing check: real users take >2 s to fill in an email */
        if (Date.now() - _loaded < 2000) return;
        form.style.transition = 'opacity 0.3s ease';
        form.style.opacity    = '0';
        setTimeout(function () {
            form.style.display  = 'none';
            ok.style.display    = 'block';
        }, 320);
    });
})();

/* Modal footer newsletter form */
(function () {
    var form    = document.getElementById('sfFormModal');
    var ok      = document.getElementById('sfFormModalOk');
    var _loaded = Date.now();
    if (!form || !ok) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (Date.now() - _loaded < 2000) return;
        form.style.transition = 'opacity 0.3s ease';
        form.style.opacity    = '0';
        setTimeout(function () {
            form.style.display = 'none';
            ok.style.display   = 'block';
        }, 320);
    });
})();
