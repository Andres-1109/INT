/*
  FILE: home.js

  What does this file do?
  Renders the WSPACE main screen (Home), the first one anyone sees when
  they visit. From top to bottom it has: the big search bar, a promo
  banner, the space categories, featured spaces, the most booked ones,
  and the banner inviting people to publish a space.
*/

async function renderHomeView(container) {
  container.innerHTML = `
    <section class="hero">
      <h1 data-i18n="home.tagline">El espacio que necesitas, cuando lo necesitas</h1>
      ${renderSearchBar()}
    </section>

    <div class="container">
      <section class="section">
        <h2 class="section-title" data-i18n="home.categoriesTitle">Explora por categoría</h2>
        <div class="categories-grid" id="categories-grid"></div>
      </section>

      <div class="promo-carousel" id="promo-carousel">
       <img alt="Promoción 1" class="promo-slide active" data-slide="1">
       <img alt="Promoción 2" class="promo-slide" data-slide="2">
       <img alt="Promoción 3" class="promo-slide" data-slide="3">
      </div>

      <section class="section">
        <h2 class="section-title" data-i18n="home.featuredTitle">Espacios destacados</h2>
        <div class="spaces-grid" id="featured-spaces"></div>
      </section>

      <section class="section">
        <h2 class="section-title" data-i18n="home.popularTitle">Más reservados</h2>
        <div class="spaces-grid" id="popular-spaces"></div>
      </section>

      <div id="host-banner-container"></div>
    </div>
  `;

  attachSearchBarEvents();
  renderCategoriesGrid();
  renderHostBanner();
  startPromoCarousel();

  // Ask the server for the list of spaces to fill the "featured" and
  // "most booked" sections
  try {
    const allSpaces = await fetchSpaces();
    document.getElementById('featured-spaces').innerHTML =
      allSpaces.filter((s) => s.featured).map((s) => renderSpaceCard(s)).join('') || '<p>Próximamente</p>';
    document.getElementById('popular-spaces').innerHTML =
      allSpaces.slice(0, 6).map((s) => renderSpaceCard(s)).join('');
    applyTranslations();
    attachFavoriteToggleEvents();
    await markFavoritedCardsIfLoggedIn();
  } catch (error) {
    console.error(error);
  }
}

// Renders the big search bar (location, type, date, time).
// Reused both on Home and on the search results screen
function renderSearchBar() {
  const categoryOptions = Object.entries(CATEGORY_LABELS)
    .map(([key, labels]) => `<option value="${key}">${labels[getCurrentLang()]}</option>`)
    .join('');

  return `
    <div class="search-bar">
      <div class="form-group">
        <label data-i18n="home.location">Ubicación</label>
        <input type="text" id="search-city" placeholder="Ciudad o barrio">
      </div>
      <div class="form-group">
        <label data-i18n="home.spaceType">Tipo de espacio</label>
        <select id="search-type">
          <option value="">Todos</option>
          ${categoryOptions}
        </select>
      </div>
      <div class="form-group">
        <label data-i18n="home.date">Fecha</label>
        <input type="date" id="search-date">
      </div>
      <div class="form-group">
        <label data-i18n="home.startTime">Hora inicio</label>
        <input type="time" id="search-startTime">
      </div>
      <button class="btn btn-primary" id="search-submit-btn" style="background: #a55086;" data-i18n="home.searchCta">Buscar</button>
    </div>
  `;
}

// When the person clicks "Search", we take whatever they typed/picked
// and send them to the results screen with those filters already applied
function attachSearchBarEvents() {
  const btn = document.getElementById('search-submit-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const filters = {
      city: document.getElementById('search-city').value,
      type: document.getElementById('search-type').value,
      date: document.getElementById('search-date').value,
      startTime: document.getElementById('search-startTime').value
    };
    navigateTo(buildUrlWithParams('/spaces', filters));
  });
}

// Renders the 5 category tiles (office, meeting room, coworking, etc.)
function renderCategoriesGrid() {
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = Object.entries(CATEGORY_LABELS).map(([key, labels]) => `
    <a href="${buildUrlWithParams('/spaces', { type: key })}" data-link class="category-card">
      <div class="icon">${labels.icon}</div>
      <div class="label">${labels[getCurrentLang()]}</div>
    </a>
  `).join('');
}

// Renders the "publish your space" banner at the bottom of Home.
// The text and link change depending on who's looking at the page:
// - If no one is logged in: invites them to sign up
// - If it's a WSpacer who hasn't published anything yet: invites them to upgrade to WSpacer+
// - If already a WSpacer+: invites them to publish ANOTHER space
function renderHostBanner() {
  const container = document.getElementById('host-banner-container');
  const user = getCurrentUser();

  let title, cta, link;

  if (!user) {
    title = t('home.hostBannerGuestTitle');
    cta = t('home.hostBannerGuestCta');
    link = '/host-signup';
  } else if (user.role === 'wspacer_plus') {
    title = t('home.hostBannerActiveTitle');
    cta = t('home.hostBannerActiveCta');
    link = '/my-spaces/new';
  } else {
    title = t('home.hostBannerUpgradeTitle');
    cta = t('home.hostBannerUpgradeCta');
    link = '/my-spaces/new';
  }

  container.innerHTML = `
    <div class="banner banner-host">
      <h3>🏢 ${title}</h3>
      <p data-i18n="home.hostBannerGuestText">Publícalo en WSPACE y empieza a generar ingresos con tus horas libres.</p>
      <a href="${link}" data-link class="btn btn-secondary">${cta}</a>
    </div>
  `;
}

// Makes the promo carousel images cycle on their own, and picks the
// right image set for the active language (es/en)
function startPromoCarousel() {
  const slides = document.querySelectorAll('#promo-carousel .promo-slide');
  if (slides.length === 0) return;

  function updateSlideImages() {
    const lang = getCurrentLang();
    slides.forEach((slide) => {
      const slideNumber = slide.getAttribute('data-slide');
      slide.src = `/photos/promo${slideNumber}-${lang}.jpg`;
    });
  }

  updateSlideImages();

  let currentIndex = 0;
  setInterval(() => {
    slides[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add('active');
  }, 4500);

  window.addEventListener('wspace:languageChanged', updateSlideImages);
}
