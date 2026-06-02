// Newsletter Popup - Side drawer, triggers at 57% scroll depth

(function() {
  const MODAL_ID = 'nlPopupModal';
  const FORM_ID = 'nlPopupForm';
  const INPUT_ID = 'nlPopupEmail';
  const STORAGE_KEY = 'nlPopupShown';

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

  // Trigger at 57% scroll depth — all devices
  function setupScrollTrigger() {
    window.addEventListener('scroll', function onScroll() {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrolled >= 0.57) {
        window.removeEventListener('scroll', onScroll);
        showModal();
      }
    }, { passive: true });
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
