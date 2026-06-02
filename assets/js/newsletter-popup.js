// Newsletter Popup - Exit Intent (Desktop) + Time Delay (Mobile)

(function() {
  const MODAL_ID = 'nlPopupModal';
  const FORM_ID = 'nlPopupForm';
  const INPUT_ID = 'nlPopupEmail';
  const STORAGE_KEY = 'nlPopupShown';

  let exitIntentShown = false;
  const isMobile = () => window.innerWidth < 768;
  const isDesktop = () => window.innerWidth >= 768;

  // Check if modal already shown today
  function shouldShowModal() {
    const shown = localStorage.getItem(STORAGE_KEY);
    if (!shown) return true;
    const timestamp = parseInt(shown);
    const now = Date.now();
    const hours = (now - timestamp) / (1000 * 60 * 60);
    return hours > 24;
  }

  function setModalShown() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }

  // Show modal
  function showModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.add('show');
      setModalShown();
      localStorage.setItem(STORAGE_KEY + '_loaded', Date.now().toString());
    }
  }

  // Close modal
  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.remove('show');
    }
  }

  // Exit intent listener (desktop only)
  function setupExitIntent() {
    if (isDesktop()) {
      document.addEventListener('mousemove', function(e) {
        // Trigger when cursor moves to top of page (within 5px of top)
        if (e.clientY <= 5 && !exitIntentShown && shouldShowModal()) {
          exitIntentShown = true;
          showModal();
        }
      });
    }
  }

  // Time delay trigger (mobile only)
  function setupTimeDelay() {
    if (isMobile() && shouldShowModal()) {
      setTimeout(() => {
        showModal();
      }, 4000);
    }
  }

  // Form submission
  function setupFormSubmit() {
    const form = document.getElementById(FORM_ID);
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById(INPUT_ID).value;

        // Timing check: real users take >2s to fill in email
        if (Date.now() - parseInt(localStorage.getItem(STORAGE_KEY + '_loaded') || 0) < 2000) {
          return;
        }

        if (email) {
          // Close modal and show success
          closeModal();
          form.reset();
        }
      });
    }
  }

  // Modal overlay close
  function setupOverlayClose() {
    const overlay = document.getElementById(MODAL_ID);
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal();
        }
      });
    }
  }

  // Close button
  function setupCloseButton() {
    const closeBtn = document.querySelector(`#${MODAL_ID} .nl-close-btn`);
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
  }

  // Initialize on DOM ready
  function init() {
    setupExitIntent();
    setupTimeDelay();
    setupFormSubmit();
    setupOverlayClose();
    setupCloseButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
