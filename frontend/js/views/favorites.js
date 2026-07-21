/*
  FILE: favorites.js

  What does this file do?
  Renders the list of spaces the current WSpacer has saved as favorites.
  Reuses the same space-card component as the search results, so a
  favorited space looks and behaves exactly the same everywhere.
*/

async function renderFavoritesView(container) {
  requireAuth(async () => {
    container.innerHTML = `
      <div class="container section">
        <h1 class="section-title" data-i18n="nav.favorites">Favoritos</h1>
        <div id="favorites-list" class="spaces-grid mt-md"></div>
      </div>
    `;

    const list = document.getElementById('favorites-list');
    try {
      const spaces = await fetchFavorites();
      list.innerHTML = spaces.length
        ? spaces.map((space) => renderSpaceCard(space, true)).join('')
        : `<div class="empty-state"><p data-i18n="favorites.empty">Todavía no has guardado espacios favoritos</p></div>`;
      applyTranslations();
      attachFavoriteToggleEvents();
    } catch (error) {
      list.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
    }
  });
}
