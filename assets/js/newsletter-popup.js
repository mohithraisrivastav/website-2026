// Newsletter Popup — robust trigger via IntersectionObserver
// Fires when the Shop Preview section enters the viewport.
// No dependency on GSAP / Lenis / requestAnimationFrame timing.

(function() {
  var MODAL_ID  = 'nlPopupModal';
  var FORM_ID   = 'nlPopupForm';
  var INPUT_ID  = 'nlPopupEmail';
  var STORE_KEY = 'nlPopupShown_v3';        // bumped: ignores stale v2 keys
  var TRIGGER   = '#shop-preview';          // section ~36% down the page
  var fired     = false;

  function alreadyShown() {
    var ts = localStorage.getItem(STORE_KEY);
    if (!ts) return false;
    return (Date.now() - parseInt(ts, 10)) / 36e5 < 24; // once per 24h
  }

  function show() {
    if (fired) return;
    var m = document.getElementById(MODAL_ID);
    if (!m || alreadyShown()) return;
    fired = true;
    m.classList.add('show');
    localStorage.setItem(STORE_KEY, Date.now().toString());
  }
  // Exposed so other code (or manual testing) can trigger it
  window.nlShowPopup = show;

  function close() {
    var m = document.getElementById(MODAL_ID);
    if (m) m.classList.remove('show');
  }

  function setupTrigger() {
    var el = document.querySelector(TRIGGER);
    if (!el) return;

    // Primary: IntersectionObserver — robust, no animation-frame dependency
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            show();
            io.disconnect();
            break;
          }
        }
      }, { root: null, rootMargin: '0px 0px -15% 0px', threshold: 0.01 });
      io.observe(el);
    }

    // Fallback + catch-already-scrolled-past-on-load: simple scroll check
    function onScroll() {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        show();
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // in case the section is already in view at load
  }

  function init() {
    setupTrigger();

    var btn = document.querySelector('#' + MODAL_ID + ' .nl-close-btn');
    if (btn) btn.addEventListener('click', close);

    var form = document.getElementById(FORM_ID);
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById(INPUT_ID).value;
        if (!email) return;
        close();
        form.reset();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
