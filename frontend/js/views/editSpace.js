/*
  FILE: editSpace.js

  What does this file do?
  Renders the form to edit a space the current WSpacer+ already owns.
  Mirrors publishSpace.js, but pre-filled with the space's current data
  and calling updateSpace() (PATCH) instead of createSpace() (POST).

  Note: the backend's updateSpace endpoint only persists the scalar
  fields below (name, type, city, neighborhood, capacity, pricePerHour,
  description) — it does not touch photos or amenities yet, so this
  form doesn't offer to change those either.
*/

async function renderEditSpaceView(container, params) {
  requireHostRole(async () => {
    container.innerHTML = '<div class="container"><p>Cargando...</p></div>';

    let space;
    try {
      space = await fetchSpaceById(params.id);
    } catch (error) {
      container.innerHTML = `<div class="container empty-state"><p>${error.message}</p></div>`;
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser || space.ownerId !== currentUser.id) {
      showToast(t('editSpace.notOwner'));
      navigateTo('/my-spaces');
      return;
    }

    const categoryOptions = Object.entries(CATEGORY_LABELS)
      .map(([key, labels]) => `<option value="${key}" ${key === space.type ? 'selected' : ''}>${labels[getCurrentLang()]}</option>`)
      .join('');

    container.innerHTML = `
      <div class="container section" style="max-width:600px;">
        <h1 class="section-title" data-i18n="editSpace.title">Editar espacio</h1>
        <form id="edit-space-form">
          <div class="form-group">
            <label data-i18n="publish.name">Nombre del espacio</label>
            <input type="text" id="edit-name" value="${space.name}" required>
          </div>
          <div class="form-group">
            <label data-i18n="publish.type">Tipo de espacio</label>
            <select id="edit-type" required>${categoryOptions}</select>
          </div>
          <div class="form-group">
            <label data-i18n="editSpace.city">Ciudad</label>
            <input type="text" id="edit-city" value="${space.city}" required>
          </div>
          <div class="form-group">
            <label data-i18n="editSpace.neighborhood">Barrio</label>
            <input type="text" id="edit-neighborhood" value="${space.neighborhood}" required>
          </div>
          <div class="form-group">
            <label data-i18n="editSpace.capacity">Capacidad</label>
            <input type="number" id="edit-capacity" min="1" value="${space.capacity}" required>
          </div>
          <div class="form-group">
            <label data-i18n="publish.pricePerHour">Precio por hora</label>
            <input type="number" id="edit-price" min="1000" value="${space.pricePerHour}" required>
          </div>
          <div class="form-group">
            <label data-i18n="editSpace.description">Descripción</label>
            <textarea id="edit-description">${space.description || ''}</textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block mt-md" data-i18n="editSpace.saveCta">Guardar cambios</button>
        </form>
      </div>
    `;
    applyTranslations();

    document.getElementById('edit-space-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        await updateSpace(space.id, {
          name: document.getElementById('edit-name').value,
          type: document.getElementById('edit-type').value,
          city: document.getElementById('edit-city').value,
          neighborhood: document.getElementById('edit-neighborhood').value,
          capacity: Number(document.getElementById('edit-capacity').value),
          pricePerHour: Number(document.getElementById('edit-price').value),
          description: document.getElementById('edit-description').value
        });
        showToast(t('editSpace.saved'));
        navigateTo('/my-spaces');
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}
