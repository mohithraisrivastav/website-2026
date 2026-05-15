/**
 * cart.js — Single source of truth for cart state and UI.
 * Loaded on every page via <script src="assets/js/cart.js"></script>
 * (or "../assets/js/cart.js" for pages in sub-directories).
 *
 * Exposes globals:  cart, saveCart, toggleCart, removeFromCart,
 *                   updateCartUI, addToCart, showToast, buyNow, goToCheckout
 *
 * Accessibility:
 *   - Cart sidebar gets role="dialog" aria-modal="true" aria-label on open
 *   - Focus trap: Tab/Shift+Tab cycle within sidebar, Escape closes
 *   - Focus returns to trigger element on close
 *
 * Shop pages that call addToCart / buyNow keep their page-specific wrappers
 * (e.g. addBookToCart, updateBookUI) inline — those are not cart logic.
 */

(function () {

    /* ── State ─────────────────────────────────────────────────────────────── */

    window.cart = JSON.parse(localStorage.getItem('cart') || '[]');

    /* ── Persistence ────────────────────────────────────────────────────────── */

    window.saveCart = function () {
        localStorage.setItem('cart', JSON.stringify(window.cart));
    };

    /* ── Focus trap helpers ─────────────────────────────────────────────────── */

    var _lastFocusedElement = null;
    var _focusTrapHandler   = null;

    var FOCUSABLE_SELECTORS = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function getFocusable(container) {
        return Array.prototype.slice.call(
            container.querySelectorAll(FOCUSABLE_SELECTORS)
        ).filter(function (el) {
            return el.offsetParent !== null;          /* skip hidden elements */
        });
    }

    /* ── Sidebar toggle (with ARIA + focus trap) ────────────────────────────── */

    window.toggleCart = function () {
        var sidebar = document.getElementById('cartSidebar');
        var overlay = document.getElementById('cartOverlay');
        if (!sidebar) return;

        var isOpening = !sidebar.classList.contains('open');
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
        document.body.style.overflow = isOpening ? 'hidden' : '';

        if (isOpening) {

            /* ── ARIA: mark as open dialog ─────────────────────────────────── */
            sidebar.setAttribute('role', 'dialog');
            sidebar.setAttribute('aria-modal', 'true');
            sidebar.setAttribute('aria-label', 'Shopping cart');

            /* ── Save the element that triggered the open ──────────────────── */
            _lastFocusedElement = document.activeElement;

            /* ── Move focus into sidebar (wait one frame for CSS transition) ── */
            requestAnimationFrame(function () {
                var focusable = getFocusable(sidebar);
                if (focusable.length) {
                    focusable[0].focus();
                } else {
                    sidebar.focus();            /* sidebar itself as fallback */
                }
            });

            /* ── Install focus trap ────────────────────────────────────────── */
            _focusTrapHandler = function (e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    window.toggleCart();
                    return;
                }
                if (e.key !== 'Tab') return;

                var focusable = getFocusable(sidebar);
                if (!focusable.length) { e.preventDefault(); return; }

                var first = focusable[0];
                var last  = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    /* Shift+Tab: wrap backwards */
                    if (document.activeElement === first || !sidebar.contains(document.activeElement)) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    /* Tab: wrap forwards */
                    if (document.activeElement === last || !sidebar.contains(document.activeElement)) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            };
            document.addEventListener('keydown', _focusTrapHandler);

        } else {

            /* ── ARIA: remove dialog role when closed ──────────────────────── */
            sidebar.removeAttribute('role');
            sidebar.removeAttribute('aria-modal');
            sidebar.removeAttribute('aria-label');

            /* ── Remove focus trap ─────────────────────────────────────────── */
            if (_focusTrapHandler) {
                document.removeEventListener('keydown', _focusTrapHandler);
                _focusTrapHandler = null;
            }

            /* ── Restore focus to the element that opened the cart ─────────── */
            if (_lastFocusedElement && typeof _lastFocusedElement.focus === 'function') {
                _lastFocusedElement.focus();
                _lastFocusedElement = null;
            }
        }
    };

    /* ── Item removal ───────────────────────────────────────────────────────── */

    window.removeFromCart = function (index) {
        window.cart.splice(index, 1);
        window.saveCart();
        window.updateCartUI();
    };

    /* ── Image path resolver ────────────────────────────────────────────────── */

    function cartImgSrc(raw) {
        if (!raw) return '';
        if (raw.startsWith('http') || raw.startsWith('images/') || raw.startsWith('/')) return raw;
        return 'images/' + raw;
    }

    /* ── Render cart ────────────────────────────────────────────────────────── */
    /*
     * Builds the full cart HTML in one pass (avoids innerHTML+= re-parsing
     * which resets image loads on every item append).
     * Each Remove button gets role="button" for screen readers.
     */

    window.updateCartUI = function () {
        var list         = document.getElementById('cartItemsList');
        var counts       = document.querySelectorAll('.cart-count');
        var totalDisplay = document.getElementById('cartTotalDisplay');
        if (!list) return;

        var total = 0;
        var html  = window.cart.map(function (item, index) {
            total += item.price;
            var priceStr = (typeof window.formatPrice === 'function')
                ? window.formatPrice(item.price)
                : ('&#8377;' + item.price.toLocaleString());
            return '<div class="cart-item">'
                + '<img src="' + cartImgSrc(item.img) + '" alt="' + (item.title || '') + '" loading="lazy">'
                + '<div><h4>' + item.title + '</h4>'
                + '<p>' + priceStr + '</p></div>'
                + '<button class="remove-item" onclick="removeFromCart(' + index + ')"'
                + ' aria-label="Remove ' + (item.title || 'item') + ' from cart">Remove</button>'
                + '</div>';
        }).join('');

        list.innerHTML = html;

        counts.forEach(function (el) {
            el.textContent = window.cart.length;
            el.classList.toggle('zero', window.cart.length === 0);
        });

        if (totalDisplay) totalDisplay.textContent = (typeof window.formatPrice === 'function')
            ? window.formatPrice(total)
            : ('₹' + total.toLocaleString());
    };

    /* ── Toast notification (shop pages) ───────────────────────────────────── */

    window.showToast = function (msg) {
        var t = document.getElementById('cartToast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._cartToastTimer);
        t._cartToastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    };

    /* ── Add to cart (shop pages) ───────────────────────────────────────────── */

    window.addToCart = function (title, price, img) {
        window.cart.push({ title: title, price: price, img: img });
        window.saveCart();
        window.updateCartUI();
        window.showToast('Added to cart — ' + title);

        /* Cart icon bounce — skip if user prefers reduced motion */
        if (typeof gsap !== 'undefined'
                && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.fromTo('.cart-icon svg', { scale: 0.8 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
        }
    };

    /* ── Buy now: add + redirect to checkout (shop pages) ──────────────────── */

    window.buyNow = function (title, price, img) {
        window.addToCart(title, price, img);
        window.location.href = 'checkout.html';
    };

    /* ── Go to checkout: validates cart not empty (shop pages) ─────────────── */

    window.goToCheckout = function () {
        if (window.cart.length === 0) {
            window.showToast('Cart is empty — add an edition first');
            return;
        }
        window.location.href = 'checkout.html';
    };

    /* ── Re-render on currency switch ──────────────────────────────────────── */

    document.addEventListener('currencychange', function () {
        window.updateCartUI();
    });

    /* ── Cross-tab sync ─────────────────────────────────────────────────────── */

    window.addEventListener('storage', function (e) {
        if (e.key === 'cart') {
            window.cart = JSON.parse(localStorage.getItem('cart') || '[]');
            window.updateCartUI();
        }
    });

    /* ── Init ───────────────────────────────────────────────────────────────── */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.updateCartUI);
    } else {
        window.updateCartUI();
    }

}());
