/**
 * theme.js — Syncs --nav-height CSS variable to the rendered navbar height.
 * Loaded synchronously in <head> so the variable is available before first paint.
 */
(function () {
    function _syncNavHeight() {
        var nav = document.querySelector('.navbar');
        if (!nav) return;
        var h = nav.getBoundingClientRect().height;
        if (h > 0) {
            document.documentElement.style.setProperty('--nav-height', Math.ceil(h) + 'px');
        }
    }

    var _resizeTimer;
    function _onResize() {
        cancelAnimationFrame(_resizeTimer);
        _resizeTimer = requestAnimationFrame(function () {
            requestAnimationFrame(_syncNavHeight);
        });
    }

    function _bindNavHeightSync() {
        _syncNavHeight();
        window.addEventListener('resize', _onResize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bindNavHeightSync);
    } else {
        _bindNavHeightSync();
    }
})();
