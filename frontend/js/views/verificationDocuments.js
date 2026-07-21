/*
  FILE: verificationDocuments.js

  What does this file do?
  Lets a WSpacer submit their national ID number, a scan of their ID,
  and a bank certificate — the documents needed to receive payouts as a
  WSpacer+. Reuses the same Cloudinary upload pattern already used for
  space photos (see upload.js / publishSpace.js).

  Note: submitting these documents does NOT by itself turn the account
  into a WSpacer+ — that still happens automatically the moment the
  first space gets published (see spacesController.createSpace). Whether
  publishing should require these documents on file first is an open
  question for the team (see docs/WSPACE_Backlog_Detallado.md, HU-14) —
  this view only builds the piece that was completely missing: an actual
  place to submit them.
*/

async function renderVerificationDocumentsView(container) {
  requireAuth(() => {
    container.innerHTML = `
      <div class="container section" style="max-width:480px;">
        <h1 class="section-title" data-i18n="verification.title">Documentos de verificación</h1>
        <p class="mt-md" data-i18n="verification.subtitle">Necesarios para habilitar el cobro de tus reservas como WSpacer+</p>

        <form id="verification-form" class="mt-lg">
          <div class="form-group">
            <label data-i18n="verification.nationalId">Número de cédula</label>
            <input type="text" id="verification-nationalId" required>
          </div>

          <div class="form-group">
            <label data-i18n="verification.nationalIdDoc">Foto o escaneo de tu cédula</label>
            <input type="file" id="verification-nationalIdDoc-input" accept="image/*,.pdf" required>
            <div id="nationalIdDoc-preview" class="mt-md"></div>
          </div>

          <div class="form-group">
            <label data-i18n="verification.bankCertificate">Certificado bancario</label>
            <input type="file" id="verification-bankCertificate-input" accept="image/*,.pdf" required>
            <div id="bankCertificate-preview" class="mt-md"></div>
          </div>

          <div class="form-error hidden" id="verification-error"></div>
          <button type="submit" class="btn btn-primary btn-block mt-md" data-i18n="verification.submitCta">Enviar documentos</button>
        </form>
      </div>
    `;
    applyTranslations();

    // Set once each file finishes uploading to Cloudinary — the form
    // can't be submitted until both are ready
    let nationalIdDocUrl = null;
    let bankCertificateUrl = null;

    attachFileUploader(document.getElementById('verification-nationalIdDoc-input'), (url) => {
      nationalIdDocUrl = url;
      document.getElementById('nationalIdDoc-preview').innerHTML = `<span data-i18n="verification.fileReady">Archivo listo ✓</span>`;
      applyTranslations();
    });

    attachFileUploader(document.getElementById('verification-bankCertificate-input'), (url) => {
      bankCertificateUrl = url;
      document.getElementById('bankCertificate-preview').innerHTML = `<span data-i18n="verification.fileReady">Archivo listo ✓</span>`;
      applyTranslations();
    });

    document.getElementById('verification-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const errorBox = document.getElementById('verification-error');
      const nationalId = document.getElementById('verification-nationalId').value.trim();

      if (!nationalId || !nationalIdDocUrl || !bankCertificateUrl) {
        errorBox.textContent = t('verification.missingFiles');
        errorBox.classList.remove('hidden');
        return;
      }

      try {
        await submitVerificationDocuments({ nationalId, nationalIdDocUrl, bankCertificateUrl });
        // Update the cached user immediately so publishSpace.js's guard
        // (requires hasVerificationDocuments) doesn't need a fresh login
        // to see that this account can now publish
        updateStoredUser({ ...getCurrentUser(), hasVerificationDocuments: true });
        showToast(t('verification.submittedToast'));
        navigateTo('/profile');
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove('hidden');
      }
    });
  });
}
