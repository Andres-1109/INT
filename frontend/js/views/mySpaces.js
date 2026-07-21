/*
  FILE: mySpaces.js

  What does this file do?
  Renders the list of every space the current WSpacer+ has published,
  with a button to publish a new one, and per-space actions to edit its
  details or temporarily activate/deactivate it.
*/

async function renderMySpacesView(container) {
  requireHostRole(async () => {
    container.innerHTML = `
      <div class="container section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h1 class="section-title" data-i18n="nav.mySpaces">Mis espacios</h1>
          <a href="/my-spaces/new" data-link class="btn btn-primary">+ Publicar</a>
        </div>
        <div id="my-spaces-list" class="spaces-grid mt-md"></div>
      </div>
    `;

    await loadMySpaces();
  });
}

// Fetches and (re-)renders the owner's spaces. Kept as its own function so
// the toggle-active button can refresh the list without a full navigation.
async function loadMySpaces() {
  const list = document.getElementById('my-spaces-list');
  try {
    const spaces = await fetchMySpaces();
    list.innerHTML = spaces.length
      ? spaces.map(renderMySpaceCard).join('')
      : '<div class="empty-state"><p>Todavía no has publicado ningún espacio</p></div>';
    applyTranslations();
    attachMySpaceCardEvents();
  } catch (error) {
    showToast(error.message);
  }
}

// Same visual shape as the public space-card (spaceCard.js), but with an
// owner-only status badge and the edit/activate-deactivate actions. Kept
// separate from renderSpaceCard so those actions never leak into the
// public search results.
function renderMySpaceCard(space) {
  const photo = space.photos && space.photos[0] ? space.photos[0] : 'https://via.placeholder.com/400x260?text=WSPACE';
  const categoryLabel = CATEGORY_LABELS[space.type] ? CATEGORY_LABELS[space.type][getCurrentLang()] : space.type;

  const publicationStatusLabels = {
    pending_approval: t('mySpaces.statusPending'),
    approved: t('mySpaces.statusApproved'),
    rejected: t('mySpaces.statusRejected')
  };

  return `
    <div class="space-card">
      <a href="/space/${space.id}" data-link>
        <img src="${photo}" alt="${space.name}">
      </a>
      <div class="space-card-body">
        <div class="space-card-title">${space.name}</div>
        <div class="space-card-location">${categoryLabel} · ${space.neighborhood}, ${space.city}</div>
        <div class="space-card-price">${formatPrice(space.pricePerHour)} <span data-i18n="spaces.perHour">/ hora</span></div>
        <div class="mt-md" style="display:flex; gap:8px; flex-wrap:wrap;">
          <span class="badge">${publicationStatusLabels[space.publicationStatus] || space.publicationStatus}</span>
          <span class="badge">${space.active ? t('mySpaces.statusActive') : t('mySpaces.statusInactive')}</span>
        </div>
        <div class="mt-md" style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="/my-spaces/${space.id}/edit" data-link class="btn btn-outline" data-i18n="mySpaces.editCta">Editar</a>
          <a href="/my-spaces/${space.id}/availability" data-link class="btn btn-outline" data-i18n="nav.availability">Disponibilidad</a>
          <button class="btn btn-outline" data-toggle-active="${space.id}">
            ${space.active ? t('mySpaces.deactivateCta') : t('mySpaces.activateCta')}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Wires up the "Activate"/"Deactivate" button on every card in the list
function attachMySpaceCardEvents() {
  document.querySelectorAll('[data-toggle-active]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const result = await toggleSpaceActive(btn.dataset.toggleActive);
        showToast(result.active ? t('mySpaces.activatedToast') : t('mySpaces.deactivatedToast'));
        await loadMySpaces();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}
