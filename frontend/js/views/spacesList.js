/*
  FILE: spacesList.js

  What does this file do?
  Renders the search results screen: the list of spaces matching what
  the person searched for. The filters (city, type, date, time) are
  read directly from the URL, so a search can be shared or bookmarked
  as a link.
*/

async function renderSpacesListView(container, params, query) {
  container.innerHTML = `
    <div class="container">
      <div class="section">
        ${renderSearchBar()}
      </div>
      <div id="spaces-results" class="spaces-grid"></div>
    </div>
  `;

  attachSearchBarEvents();
  prefillSearchBar(query); // leave the search bar filled with whatever was already searched

  const resultsContainer = document.getElementById('spaces-results');
  resultsContainer.innerHTML = '<p>Cargando...</p>';

  try {
    const spaces = await fetchSpaces(query);

    if (spaces.length === 0) {
      resultsContainer.innerHTML = `<div class="empty-state"><p data-i18n="spaces.noResults">${t('spaces.noResults')}</p></div>`;
      return;
    }

    resultsContainer.innerHTML = spaces.map((s) => renderSpaceCard(s)).join('');
    attachFavoriteToggleEvents();
    await markFavoritedCardsIfLoggedIn();
  } catch (error) {
    resultsContainer.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
  }
}

// Fills in the search bar fields with the filters that came from the
// URL, so the person can see what they searched for
function prefillSearchBar(query) {
  if (query.city) document.getElementById('search-city').value = query.city;
  if (query.type) document.getElementById('search-type').value = query.type;
  if (query.date) document.getElementById('search-date').value = query.date;
  if (query.startTime) document.getElementById('search-startTime').value = query.startTime;
}
