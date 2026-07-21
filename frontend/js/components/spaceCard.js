/*
  FILE: spaceCard.js

  What does this file do?
  Renders the small "card" that represents a space (with its photo,
  name, location, and price). This same card is reused in several
  places: search results, "featured", "most booked", etc. This avoids
  repeating the same code five times over.
*/

// isFavorited controls the heart's initial state. Callers that don't know
// (e.g. an anonymous visitor) can omit it — it just defaults to "not
// favorited", which is always a safe default.
function renderSpaceCard(space, isFavorited = false) {
  const photo = space.photos && space.photos[0] ? space.photos[0] : 'https://via.placeholder.com/400x260?text=WSPACE';
  const categoryLabel = CATEGORY_LABELS[space.type] ? CATEGORY_LABELS[space.type][getCurrentLang()] : space.type;

  return `
    <div class="space-card">
      <button class="favorite-toggle-btn" data-favorite-toggle="${space.id}" data-favorited="${isFavorited}" aria-label="Favorito">${isFavorited ? '♥' : '♡'}</button>
      <a href="/space/${space.id}" data-link>
        <img src="${photo}" alt="${space.name}">
        <div class="space-card-body">
          ${space.featured ? '<span class="badge">Destacado</span>' : ''}
          <div class="space-card-title">${space.name}</div>
          <div class="space-card-location">${categoryLabel} · ${space.neighborhood}, ${space.city}</div>
          <div class="space-card-price">${formatPrice(space.pricePerHour)} <span data-i18n="spaces.perHour">/ hora</span></div>
        </div>
      </a>
    </div>
  `;
}

// Wires up every heart button currently on screen. Call this after
// injecting any HTML built with renderSpaceCard(). Not logged in? Clicking
// opens the login modal (same requireAuth() pattern used everywhere else)
// instead of silently failing.
function attachFavoriteToggleEvents() {
  document.querySelectorAll('[data-favorite-toggle]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      requireAuth(async () => {
        const spaceId = btn.dataset.favoriteToggle;
        const isFavorited = btn.dataset.favorited === 'true';

        try {
          if (isFavorited) {
            await removeFavorite(spaceId);
            btn.dataset.favorited = 'false';
            btn.textContent = '♡';
            showToast(t('favorites.removedToast'));
            // On the favorites page itself, an un-favorited card should
            // disappear from the list rather than just show an outline heart
            if (btn.closest('#favorites-list')) {
              btn.closest('.space-card').remove();
            }
          } else {
            await addFavorite(spaceId);
            btn.dataset.favorited = 'true';
            btn.textContent = '♥';
            showToast(t('favorites.addedToast'));
          }
        } catch (error) {
          showToast(error.message);
        }
      });
    });
  });
}

// Marks the given space ids as favorited on every heart button currently
// on screen — used right after fetching the viewer's favorites list, so
// cards that are already saved show a filled heart instead of an outline
function markFavoritedCards(favoritedSpaceIds) {
  const favoritedSet = new Set(favoritedSpaceIds.map(String));
  document.querySelectorAll('[data-favorite-toggle]').forEach((btn) => {
    if (favoritedSet.has(btn.dataset.favoriteToggle)) {
      btn.dataset.favorited = 'true';
      btn.textContent = '♥';
    }
  });
}

// Convenience for views that show public space cards (home.js,
// spacesList.js): if someone's logged in, fetches their favorites and
// marks the matching cards. Does nothing for an anonymous visitor —
// there's nothing to fetch, and every heart already defaults to "not
// favorited".
async function markFavoritedCardsIfLoggedIn() {
  if (!isAuthenticated()) return;
  try {
    const favorites = await fetchFavorites();
    markFavoritedCards(favorites.map((space) => space.id));
  } catch (error) {
    console.error(error);
  }
}
