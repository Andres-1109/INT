/*
  FILE: navbar.js

  What does this file do?
  Renders the top navigation bar. It doesn't always look the same: it
  changes depending on whether someone is logged in, and whether that
  person is a WSpacer (looking for spaces) or a WSpacer+ (publishing spaces).
*/


// Renders the whole navbar from scratch
function renderNavbar() {
  const navbarContainer = document.getElementById('navbar');
  const user = getCurrentUser();

  navbarContainer.innerHTML = `
    <div class="navbar">
      <a href="/" data-link>
        <img src="/photos/logo.png" alt="WSPACE" style="height: 35px;">
      </a>

      <div class="navbar-links">
        <a href="/spaces" data-link class="btn btn-outline" style="color: #0B5443;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align: -3px; margin-right: 4px;">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span data-i18n="nav.search" style="text-transform: uppercase;">Buscar espacios</span>
        </a>
        ${user ? renderLoggedLinks(user) : ''}
      </div>

      <div class="navbar-actions">
        <button id="lang-toggle-btn" class="btn btn-outline" style="padding:8px 12px;">
          ${getCurrentLang() === 'es' ? 'EN' : 'ES'}
        </button>

        ${user ? renderProfileMenu(user) : renderGuestActions()}

        <button class="navbar-menu-toggle" id="mobile-menu-btn" aria-label="Menú">☰</button>
      </div>
    </div>
  `;

  attachNavbarEvents();

  // FIX: every time the navbar is re-rendered (e.g. right after switching
  // language), its content needs to be re-translated. This used to be
  // missing here, so after tapping the ES/EN button the navbar was left
  // half-translated until the user navigated to another screen
  applyTranslations();
}

// Decides which links to show when someone is logged in: if they're in
// the host area, show host links; otherwise, show guest/search links
function renderLoggedLinks(user) {
  if (user.role === 'wspacer_plus' && window.location.pathname.startsWith('/dashboard')) {
    return `
      <a href="/dashboard" data-link data-i18n="nav.dashboard">Dashboard</a>
      <a href="/my-spaces" data-link data-i18n="nav.mySpaces">Mis espacios</a>
      <a href="/my-spaces/bookings" data-link data-i18n="nav.hostBookings">Reservas recibidas</a>
    `;
  }
  return `
    <a href="/my-bookings" data-link data-i18n="nav.myBookings">Mis reservas</a>
    <a href="/favorites" data-link data-i18n="nav.favorites">Favoritos</a>
  `;
}

// If NO ONE is logged in, show only the "Log in" button
function renderGuestActions() {
  return `<button id="open-login-btn" class="btn btn-primary" style="background: #0f6e56;" data-i18n="nav.login">Iniciar sesión</button>`;
}

// Renders the menu that appears when clicking the user's name (top
// right), with the profile, notifications, etc. options
function renderProfileMenu(user) {
  const isInHostArea = window.location.pathname.startsWith('/dashboard') ||
                        window.location.pathname.startsWith('/my-spaces');

  // This block decides which text and link to show for "switch mode"
  // (from WSpacer to WSpacer+ or vice versa). Business rule changed
  // 2026-07-17 at the team's request: this used to always open a new
  // browser tab (target="_blank"); now it navigates inside the same SPA
  // via the router (data-link), same as every other internal link. The
  // session itself is unaffected either way — the token lives in
  // localStorage, not tied to a particular tab.
  let switchLinkHtml = '';

  if (isInHostArea) {
    switchLinkHtml = `<a href="/spaces" data-link data-i18n="nav.guestMode">Ir a modo WSpacer</a>`;
  } else if (user.role === 'wspacer_plus') {
    switchLinkHtml = `<a href="/dashboard" data-link data-i18n="nav.hostMode">Ir a modo anfitrión</a>`;
  } else {
    switchLinkHtml = `<a href="/my-spaces/new" data-link data-i18n="nav.becomeHost">Convertirme en WSpacer+</a>`;
  }

  // The admin panel link only shows up for the seeded admin account
  // (user.systemRole === 'admin') — see adminSpaces.js
  const adminLinkHtml = user.systemRole === 'admin'
    ? `<a href="/admin/spaces" data-link data-i18n="admin.navLink">Panel de administración</a><hr>`
    : '';

  return `
    <div class="profile-menu">
      <button id="profile-menu-btn" class="btn btn-outline">👤 ${user.firstName}</button>
      <div class="profile-dropdown" id="profile-dropdown">
        ${adminLinkHtml}
        <a href="/profile" data-link data-i18n="nav.profile">Mi perfil</a>
        <a href="/notifications" data-link data-i18n="nav.notifications">Notificaciones</a>
        <hr>
        ${switchLinkHtml}
        <hr>
        <a href="/terms" data-link>Términos y condiciones</a>
        <a href="/privacy-policy" data-link>Política de datos</a>
        <hr>
        <button id="logout-btn" data-i18n="nav.logout">Cerrar sesión</button>
      </div>
    </div>
  `;
}

// Wires up the navbar's buttons with what they should do on click
function attachNavbarEvents() {
  // Language toggle button (ES/EN)
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.addEventListener('click', async () => {
      await toggleLanguage();
      renderNavbar(); // re-render the bar so the button's own text updates too
    });
  }

  // "Log in" button
  const loginBtn = document.getElementById('open-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', openLoginModal);
  }

  // Button with the user's name, which opens/closes the dropdown menu
  const profileBtn = document.getElementById('profile-menu-btn');
  const dropdown = document.getElementById('profile-dropdown');
  if (profileBtn && dropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    // If the user clicks anywhere else on the screen, close the menu
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  // "Log out" button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
  }

  // Hamburger button (☰): on mobile, opens/closes the link list that's
  // always visible on large screens. This button previously had no
  // action wired to it, which is why nothing happened when tapping it
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.navbar-links');
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('mobile-open');
    });
    // If the user taps anywhere else on the screen, close the menu
    document.addEventListener('click', () => navLinks.classList.remove('mobile-open'));
  }
}

// Called every time the user switches screens, so the navbar updates
// itself (e.g. if they entered the host area)
function updateNavbarState() {
  renderNavbar();
}
