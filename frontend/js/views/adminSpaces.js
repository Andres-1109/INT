/*
  FILE: adminSpaces.js

  What does this file do?
  Renders the admin panel: the list of spaces waiting for approval, with
  buttons to approve or reject each one. The three endpoints this talks
  to (GET/PATCH /api/admin/spaces/...) already existed in the backend —
  this view is what was missing to actually use them.
*/

async function renderAdminSpacesView(container) {
  requireAdminRole(async () => {
    container.innerHTML = `
      <div class="container section">
        <h1 class="section-title" data-i18n="admin.title">Panel de administración</h1>
        <p class="mt-md" data-i18n="admin.subtitle">Espacios pendientes de aprobación</p>
        <div id="admin-pending-list" class="mt-md"></div>
      </div>
    `;

    await loadPendingAdminSpaces();
  });
}

// Fetches and (re-)renders the pending-approval list. Kept as its own
// function so approving/rejecting a space can refresh the list without
// a full navigation.
async function loadPendingAdminSpaces() {
  const list = document.getElementById('admin-pending-list');
  try {
    const spaces = await fetchPendingAdminSpaces();
    list.innerHTML = spaces.length
      ? spaces.map(renderAdminSpaceRow).join('')
      : `<div class="empty-state"><p data-i18n="admin.empty">No hay espacios pendientes de aprobación</p></div>`;
    applyTranslations();
    attachAdminSpaceEvents();
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
  }
}

function renderAdminSpaceRow(space) {
  const categoryLabel = CATEGORY_LABELS[space.type] ? CATEGORY_LABELS[space.type][getCurrentLang()] : space.type;
  const photo = space.photos && space.photos[0] ? space.photos[0] : 'https://via.placeholder.com/160x120?text=WSPACE';

  return `
    <div class="price-breakdown mb-md" style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
      <img src="${photo}" style="width:120px; height:90px; object-fit:cover; border-radius:8px; flex-shrink:0;" alt="${space.name}">
      <div style="flex:1; min-width:240px;">
        <strong>${space.name}</strong>
        <div>${categoryLabel} · ${space.neighborhood}, ${space.city} · ${formatPrice(space.pricePerHour)} / hora</div>
        <div class="mt-md"><span data-i18n="admin.owner">Publicado por</span> ${space.owner.firstName} ${space.owner.lastName} · ${space.owner.email}</div>

        <div class="mt-md" style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
          <button class="btn btn-primary" data-approve-space="${space.id}" data-i18n="admin.approveCta">Aprobar</button>
          <div class="form-group" style="flex:1; min-width:200px; margin-bottom:0;">
            <label data-i18n="admin.reasonLabel">Motivo del rechazo</label>
            <input type="text" id="reject-reason-${space.id}" data-i18n-placeholder="admin.reasonPlaceholder" placeholder="Explica por qué se rechaza este espacio">
          </div>
          <button class="btn btn-outline" data-reject-space="${space.id}" data-i18n="admin.rejectCta">Rechazar</button>
        </div>
      </div>
    </div>
  `;
}

function attachAdminSpaceEvents() {
  document.querySelectorAll('[data-approve-space]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await approveAdminSpace(btn.dataset.approveSpace);
        showToast(t('admin.approvedToast'));
        await loadPendingAdminSpaces();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelectorAll('[data-reject-space]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const spaceId = btn.dataset.rejectSpace;
      const reasonInput = document.getElementById(`reject-reason-${spaceId}`);
      const reason = reasonInput.value.trim();

      if (!reason) {
        showToast(t('admin.reasonRequired'));
        return;
      }

      try {
        await rejectAdminSpace(spaceId, reason);
        showToast(t('admin.rejectedToast'));
        await loadPendingAdminSpaces();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}
