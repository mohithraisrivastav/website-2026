/**
 * currency.js — Multi-currency display for shop and cart.
 *
 * Base currency is INR (all product prices are stored in INR).
 * Exchange rates are fixed approximations — update RATES when needed.
 *
 * Exposes globals:
 *   formatPrice(inrAmount)  → formatted string in active currency
 *   getCurrency()           → active currency code, e.g. "USD"
 *   setCurrency(code)       → switch currency, persist, re-render
 *
 * Injects a <div id="currencyPicker"> into the navbar (before .cart-icon).
 * Dispatches CustomEvent "currencychange" on document when switched.
 *
 * Static price elements: add  data-inr="125000"  attribute — this module
 * will fill + update the textContent automatically.
 */

(function () {

    /* ── Rates: 1 INR = X of foreign currency ──────────────────────────── */
    var RATES = {
        INR: 1,
        USD: 0.01190,   /* ≈ ₹84 / USD  — update periodically */
        EUR: 0.01098,   /* ≈ ₹91 / EUR  */
        GBP: 0.00935,   /* ≈ ₹107 / GBP */
        AED: 0.04367,   /* ≈ ₹23 / AED  — UAE dirham          */
        SGD: 0.01607,   /* ≈ ₹62 / SGD  — Singapore dollar    */
    };

    /* ── Symbols and locale hints ────────────────────────────────────────── */
    var META = {
        INR: { symbol: '₹',    locale: 'en-IN', decimals: 0 },
        USD: { symbol: '$',    locale: 'en-US', decimals: 0 },
        EUR: { symbol: '€',    locale: 'de-DE', decimals: 0 },
        GBP: { symbol: '£',    locale: 'en-GB', decimals: 0 },
        AED: { symbol: 'AED ', locale: 'ar-AE', decimals: 0 },
        SGD: { symbol: 'S$',   locale: 'en-SG', decimals: 0 },
    };

    /* ── State ────────────────────────────────────────────────────────────── */
    var _current = localStorage.getItem('site-currency') || 'INR';
    if (!RATES[_current]) _current = 'INR';  // guard stale value

    /* ── Public API ──────────────────────────────────────────────────────── */

    window.getCurrency = function () { return _current; };

    /**
     * Format an INR amount in the active currency.
     * @param  {number} inrAmount  Raw price in Indian Rupees
     * @return {string}            e.g. "₹1,25,000"  or  "$1,488"
     */
    window.formatPrice = function (inrAmount) {
        var m = META[_current];
        if (_current === 'INR') {
            return '₹' + Math.round(inrAmount).toLocaleString('en-IN');
        }
        var converted = inrAmount * RATES[_current];
        return m.symbol + Math.round(converted).toLocaleString(m.locale, {
            minimumFractionDigits: m.decimals,
            maximumFractionDigits: m.decimals
        });
    };

    /**
     * Switch active currency, persist to localStorage, re-render everything.
     * @param {string} code  e.g. "USD"
     */
    window.setCurrency = function (code) {
        if (!RATES[code]) return;
        _current = code;
        localStorage.setItem('site-currency', code);
        _updateStaticPrices();
        _updatePickerLabel();
        document.dispatchEvent(new CustomEvent('currencychange', { detail: { currency: code } }));
    };

    /* ── Static price elements ([data-inr]) ─────────────────────────────── */

    function _updateStaticPrices() {
        document.querySelectorAll('[data-inr]').forEach(function (el) {
            var inr = parseInt(el.getAttribute('data-inr'), 10);
            if (!isNaN(inr)) el.textContent = window.formatPrice(inr);
        });
    }

    /* ── Picker UI ───────────────────────────────────────────────────────── */

    var CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

    function _buildPicker() {
        /* Inject styles */
        var style = document.createElement('style');
        style.textContent = [
            '.currency-picker{position:relative;display:inline-flex;align-items:center;}',
            '.currency-btn{',
            '  appearance:none;background:transparent;border:1px solid rgba(110,123,67,0.35);',
            '  color:inherit;padding:5px 10px;font-size:0.75rem;font-weight:700;letter-spacing:1.5px;',
            '  text-transform:uppercase;cursor:pointer;display:flex;align-items:center;gap:5px;',
            '  transition:border-color 0.2s ease,color 0.2s ease;white-space:nowrap;',
            '}',
            '.currency-btn:hover{border-color:#B85C38;color:#B85C38;}',
            '.currency-btn svg{width:10px;height:10px;flex-shrink:0;transition:transform 0.2s ease;}',
            '.currency-picker.open .currency-btn svg{transform:rotate(180deg);}',
            '.currency-drop{',
            '  position:absolute;top:calc(100% + 6px);right:0;',
            '  background:#FCFAF6;border:1px solid rgba(110,123,67,0.3);',
            '  min-width:110px;z-index:9999;',
            '  opacity:0;visibility:hidden;transform:translateY(-4px);',
            '  transition:opacity 0.15s ease,transform 0.15s ease,visibility 0.15s;',
            '}',
            '.currency-picker.open .currency-drop{opacity:1;visibility:visible;transform:translateY(0);}',
            '.currency-opt{',
            '  display:block;width:100%;padding:9px 14px;',
            '  font-size:0.75rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;',
            '  background:transparent;border:none;color:#4A3A33;cursor:pointer;text-align:left;',
            '  transition:background 0.15s ease,color 0.15s ease;',
            '}',
            '.currency-opt:hover{background:rgba(184,92,56,0.06);color:#B85C38;}',
            '.currency-opt.active{color:#B85C38;}',
            /* Dark-background pages */
            'body[style*="0a0a0a"] .currency-drop,',
            '.currency-drop.dark{background:#111;border-color:rgba(110,123,67,0.35);}',
            'body[style*="0a0a0a"] .currency-opt,',
            '.currency-drop.dark .currency-opt{color:#D8C9AE;}',
            'body[style*="0a0a0a"] .currency-opt:hover,',
            '.currency-drop.dark .currency-opt:hover{background:rgba(184,92,56,0.1);color:#F5F1E8;}',
        ].join('');
        document.head.appendChild(style);

        /* Build element */
        var wrap = document.createElement('div');
        wrap.id = 'currencyPicker';
        wrap.className = 'currency-picker';
        wrap.setAttribute('aria-label', 'Currency selector');

        var btn = document.createElement('button');
        btn.className = 'currency-btn';
        btn.setAttribute('aria-haspopup', 'listbox');
        btn.setAttribute('aria-expanded', 'false');
        btn.id = 'currencyBtn';
        btn.innerHTML = '<span id="currencyBtnLabel">' + _current + '</span>' +
            '<svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l4 4 4-4"/></svg>';

        var drop = document.createElement('div');
        drop.className = 'currency-drop';
        drop.setAttribute('role', 'listbox');

        CURRENCIES.forEach(function (code) {
            var opt = document.createElement('button');
            opt.className = 'currency-opt' + (code === _current ? ' active' : '');
            opt.setAttribute('role', 'option');
            opt.setAttribute('data-code', code);
            opt.textContent = code + '  ' + META[code].symbol.trim();
            opt.addEventListener('click', function (e) {
                e.stopPropagation();
                window.setCurrency(code);
                _closeDropdown(wrap, btn);
            });
            drop.appendChild(opt);
        });

        wrap.appendChild(btn);
        wrap.appendChild(drop);

        /* Toggle on button click */
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = wrap.classList.contains('open');
            _closeAllDropdowns();
            if (!isOpen) {
                wrap.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
                /* dark-drop detection */
                var bodyBg = document.body.style.backgroundColor || '';
                if (bodyBg.indexOf('0a0a0a') !== -1 || bodyBg.indexOf('#111') !== -1) {
                    drop.classList.add('dark');
                }
            }
        });

        /* Close on outside click / Escape */
        document.addEventListener('click', function () { _closeAllDropdowns(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') _closeAllDropdowns();
        });

        /* Inject before .cart-icon if present, else before .nav-cart, else into nav */
        var anchor = document.querySelector('.cart-icon')
            || document.querySelector('.nav-cart')
            || document.querySelector('.nav-links');

        if (anchor) {
            anchor.parentNode.insertBefore(wrap, anchor);
        } else {
            /* Fallback: append to navbar */
            var navbar = document.querySelector('.navbar');
            if (navbar) navbar.appendChild(wrap);
        }
    }

    function _closeDropdown(wrap, btn) {
        wrap.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function _closeAllDropdowns() {
        document.querySelectorAll('.currency-picker.open').forEach(function (w) {
            w.classList.remove('open');
            var b = w.querySelector('.currency-btn');
            if (b) b.setAttribute('aria-expanded', 'false');
        });
    }

    function _updatePickerLabel() {
        var lbl = document.getElementById('currencyBtnLabel');
        if (lbl) lbl.textContent = _current;
        /* Update active state on options */
        document.querySelectorAll('.currency-opt').forEach(function (opt) {
            opt.classList.toggle('active', opt.getAttribute('data-code') === _current);
        });
    }

    /* ── Re-render on currencychange (cart sidebar) ──────────────────────── */
    document.addEventListener('currencychange', function () {
        /* cart.js re-renders via its own currencychange listener */
        /* Static [data-inr] elements are already handled by setCurrency */
    });

    /* ── Init ────────────────────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            _buildPicker();
            _updateStaticPrices();
        });
    } else {
        _buildPicker();
        _updateStaticPrices();
    }

}());
