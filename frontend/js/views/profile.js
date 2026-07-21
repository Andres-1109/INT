/*
  FILE: profile.js

  What does this file do?
  Renders the "My profile" screen, where the user can view and edit
  their personal data (first name, last name, phone).

  PENDING: for now, saving changes only shows a success message but
  doesn't actually save anything anywhere. A PATCH /users/me endpoint
  still needs to be built on the backend to save the real changes.
*/

async function renderProfileView(container) {
  requireAuth(() => {
    const user = getCurrentUser();
    container.innerHTML = `
      <div class="container section" style="max-width:480px;">
        <h1 class="section-title" data-i18n="nav.profile">Mi perfil</h1>
        <form id="profile-form">
          <div class="form-group">
            <label data-i18n="auth.firstName">Nombre</label>
            <input type="text" id="profile-firstName" value="${user.firstName}">
          </div>
          <div class="form-group">
            <label data-i18n="auth.lastName">Apellido</label>
            <input type="text" id="profile-lastName" value="${user.lastName}">
          </div>
          <div class="form-group">
            <label data-i18n="auth.email">Correo electrónico</label>
            <input type="email" id="profile-email" value="${user.email}" disabled>
          </div>
          <div class="form-group">
            <label data-i18n="auth.phone">Teléfono</label>
            <input type="tel" id="profile-phone" value="${user.phone || ''}">
          </div>
          <button type="submit" class="btn btn-primary">Guardar cambios</button>
        </form>

        <a href="/verification-documents" data-link class="btn btn-outline btn-block mt-lg" data-i18n="verification.navLink">Documentos de verificación</a>
      </div>
    `;

    document.getElementById('profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      // There's still no real place to save this (see note above)
      showToast('Perfil actualizado (simulado, falta conectar backend real)');
    });
  });
}
