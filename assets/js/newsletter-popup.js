// Newsletter Popup - Side drawer, triggers at 57% scroll depth

(function() {
  const MODAL_ID = 'nlPopupModal';
  const FORM_ID = 'nlPopupForm';
  const INPUT_ID = 'nlPopupEmail';
  const STORAGE_KEY = 'nlPopupShown_v2';

  let shown = false;

  function shouldShow() {
    if (shown) return false;
    const ts = localStorage.getItem(STORAGE_KEY);
    if (!ts) return true;
    return (Date.now() - parseInt(ts)) / 36e5 > 24;
  }

  function showModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || !shouldShow()) return;
    shown = true;
    modal.classList.add('show');
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    localStorage.setItem(STORAGE_KEY + '_loaded', Date.now().toString());
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('show');
  }

  // Trigger at 57% scroll depth — hooks into Lenis if available, else native scroll
  function setupScrollTrigger() {
    function checkScroll(scrollY) {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      if (scrollY / maxScroll >= 0.36) {
        showModal();
        // Detach from Lenis
        if (window.__lenis) window.__lenis.off('scroll', onLenisScroll);
      }
    }

    function onLenisScroll({ scroll }) {
      checkScroll(scroll);
    }

    // Wait for Lenis to be ready (it's initialised slightly after this script loads)
    function attachLenis() {
      if (window.__lenis) {
        window.__lenis.on('scroll', onLenisScroll);
      } else {
        // Fallback: retry until Lenis is ready
        setTimeout(attachLenis, 200);
      }
    }

    attachLenis();
  }

  // Form submit
  function setupForm() {
    const form = document.getElementById(FORM_ID);
    if (!form) return;
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById(INPUT_ID).value;
      if (!email) return;
      if (Date.now() - parseInt(localStorage.getItem(STORAGE_KEY + '_loaded') || 0) < 2000) return;
      closeModal();
      form.reset();
    });
  }

  function init() {
    setupScrollTrigger();
    setupForm();

    // Close button
    const btn = document.querySelector('#' + MODAL_ID + ' .nl-close-btn');
    if (btn) btn.addEventListener('click', closeModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
