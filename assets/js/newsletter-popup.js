// Newsletter Popup — triggered by GSAP ScrollTrigger in index.html

(function() {
  const MODAL_ID  = 'nlPopupModal';
  const FORM_ID   = 'nlPopupForm';
  const INPUT_ID  = 'nlPopupEmail';
  const STORE_KEY = 'nlPopupShown_v2';

  // Check if already shown in last 24h
  function alreadyShown() {
    const ts = localStorage.getItem(STORE_KEY);
    if (!ts) return false;
    return (Date.now() - parseInt(ts)) / 36e5 < 24;
  }

  window.nlShowPopup = function() {
    if (alreadyShown()) return;
    var modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.add('show');
      localStorage.setItem(STORE_KEY, Date.now().toString());
    }
  };

  function closeModal() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('show');
  }

  function init() {
    // Close button
    var btn = document.querySelector('#' + MODAL_ID + ' .nl-close-btn');
    if (btn) btn.addEventListener('click', closeModal);

    // Form submit
    var form = document.getElementById(FORM_ID);
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById(INPUT_ID).value;
        if (!email) return;
        closeModal();
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
