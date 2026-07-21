/*
  FILE: welcomeModal.js

  What does this file do?
  Shows the pop-up that welcomes first-time visitors, offering a
  discount on their first booking.

  Rules to keep it from being annoying:
  - Only appears once per visit (if you close it and come back in the
    same session, it won't show again)
  - Never appears if the user has already used their free booking before
*/

const WELCOME_SHOWN_KEY = 'wspace_welcome_shown';

// Checks whether the pop-up should be shown, and if so, shows it after
// a second and a half (so it doesn't feel invasive right on arrival)
function maybeShowWelcomeModal() {
  const alreadyShown = sessionStorage.getItem(WELCOME_SHOWN_KEY);
  const user = getCurrentUser();
  const alreadyUsedFreeBooking = user && user.freeBookingsUsed > 0;

  if (alreadyShown || alreadyUsedFreeBooking) return;

  setTimeout(() => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'welcome-modal';
    overlay.innerHTML = `
      <div class="modal-box text-center">
        <button class="modal-close" id="welcome-close-btn">✕</button>
        <h2 data-i18n="welcome.title">¡Bienvenido a WSPACE!</h2>
        <p class="mt-md" data-i18n="welcome.text">Reserva hoy y obtén tu primera hora gratis.</p>
        <button class="btn btn-secondary btn-block mt-lg" id="welcome-cta-btn" data-i18n="welcome.cta">Reservar ahora</button>
      </div>
    `;
    document.body.appendChild(overlay);
    applyTranslations();

    document.getElementById('welcome-close-btn').addEventListener('click', closeWelcomeModal);
    document.getElementById('welcome-cta-btn').addEventListener('click', () => {
      closeWelcomeModal();
      navigateTo('/spaces');
    });

    // Mark it as shown, so we don't bother the user again during this same visit
    sessionStorage.setItem(WELCOME_SHOWN_KEY, 'true');
  }, 1500);
}

// Closes (removes from the screen) the welcome window
function closeWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) modal.remove();
}
