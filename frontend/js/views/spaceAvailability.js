/*
  FILE: spaceAvailability.js

  What does this file do?
  Lets a WSpacer+ block off dates/times on one of their own spaces, so
  guests can't request a booking that falls inside that window. Lists
  the blocks already set (POST/GET/DELETE /api/spaces/:id/blocks), with
  a form to add a new one and a button to remove each one.
*/

async function renderSpaceAvailabilityView(container, params) {
  requireHostRole(async () => {
    const spaceId = params.id;

    let space;
    try {
      space = await fetchSpaceById(spaceId);
    } catch (error) {
      container.innerHTML = `<div class="container empty-state"><p>${error.message}</p></div>`;
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser || space.ownerId !== currentUser.id) {
      showToast(t('availability.notOwner'));
      navigateTo('/my-spaces');
      return;
    }

    container.innerHTML = `
      <div class="container section" style="max-width:600px;">
        <h1 class="section-title" data-i18n="availability.title">Disponibilidad del espacio</h1>
        <p class="mt-md" data-i18n="availability.subtitle">Bloquea fechas u horarios en los que este espacio no esté disponible para reservar</p>
        <p class="mt-md"><strong>${space.name}</strong></p>

        <form id="block-form" class="mt-lg">
          <div class="form-group">
            <label data-i18n="availability.startLabel">Desde</label>
            <input type="datetime-local" id="block-start" required>
          </div>
          <div class="form-group">
            <label data-i18n="availability.endLabel">Hasta</label>
            <input type="datetime-local" id="block-end" required>
          </div>
          <div class="form-group">
            <label data-i18n="availability.reasonLabel">Motivo (opcional)</label>
            <input type="text" id="block-reason" data-i18n-placeholder="availability.reasonPlaceholder" placeholder="Ej. Mantenimiento, uso personal">
          </div>
          <button type="submit" class="btn btn-primary" data-i18n="availability.addCta">Agregar bloqueo</button>
        </form>

        <div id="blocks-list" class="mt-lg"></div>

        <a href="/my-spaces" data-link class="btn btn-outline mt-lg" data-i18n="availability.backCta">Volver a mis espacios</a>
      </div>
    `;
    applyTranslations();

    document.getElementById('block-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        await createSpaceBlock(spaceId, {
          startDate: document.getElementById('block-start').value,
          endDate: document.getElementById('block-end').value,
          reason: document.getElementById('block-reason').value || undefined
        });
        showToast(t('availability.addedToast'));
        document.getElementById('block-form').reset();
        await loadBlocks(spaceId);
      } catch (error) {
        showToast(error.message);
      }
    });

    await loadBlocks(spaceId);
  });
}

// Fetches and (re-)renders this space's block list. Kept separate so
// adding/removing a block can refresh the list without a full navigation.
async function loadBlocks(spaceId) {
  const list = document.getElementById('blocks-list');
  try {
    const blocks = await fetchSpaceBlocks(spaceId);
    list.innerHTML = blocks.length
      ? blocks.map(renderBlockRow).join('')
      : `<div class="empty-state"><p data-i18n="availability.empty">No tienes bloqueos configurados para este espacio</p></div>`;
    applyTranslations();
    attachBlockDeleteEvents(spaceId);
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
  }
}

function renderBlockRow(block) {
  // timeZone: 'UTC' is intentional here, not a default left in place: the
  // backend stores the date/time digits the host typed as literal UTC
  // (see parseDateTimeLocalAsUTC in blocksController.ts), precisely so
  // they never get silently re-interpreted through whichever timezone the
  // viewer's own browser happens to be set to. Without this, the exact
  // same block could display a different hour depending on who's looking.
  const formatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
  const range = `${formatter.format(new Date(block.startDate))} — ${formatter.format(new Date(block.endDate))}`;

  return `
    <div class="price-breakdown-row mb-md">
      <span>${range}${block.reason ? ` · ${block.reason}` : ''}</span>
      <button class="btn btn-outline" data-delete-block="${block.id}" data-i18n="availability.deleteCta">Eliminar</button>
    </div>
  `;
}

function attachBlockDeleteEvents(spaceId) {
  document.querySelectorAll('[data-delete-block]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await deleteSpaceBlock(spaceId, btn.dataset.deleteBlock);
        showToast(t('availability.deletedToast'));
        await loadBlocks(spaceId);
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}
