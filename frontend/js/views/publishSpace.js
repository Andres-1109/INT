/*
  FILE: publishSpace.js

  What does this file do?
  Renders the form to publish a new space. It has a "calculator" that
  updates on its own while the WSpacer+ types the price per hour,
  showing how much the person who books will pay (fee and tax included)
  and how much the host will receive net.

  Business rule confirmed 2026-07-17: publishing (even a WSpacer's very
  first space, which is what turns the account into a WSpacer+) requires
  the account to already have its verification documents on file — see
  verificationDocuments.js. The check below is a convenience so the user
  isn't shown a form they can't submit; the backend enforces the same
  rule regardless (spacesController.createSpace), so this is not the
  only thing standing in the way.
*/

async function renderPublishSpaceView(container) {
  requireAuth(() => {
    const user = getCurrentUser();
    if (!user.hasVerificationDocuments) {
      container.innerHTML = `
        <div class="container section" style="max-width:480px;">
          <h1 class="section-title" data-i18n="publish.title">Publicar espacio</h1>
          <p class="notice-box mt-md" data-i18n="publish.verificationRequired">Antes de publicar un espacio necesitas enviar tus documentos de verificación (cédula y certificado bancario).</p>
          <a href="/verification-documents" data-link class="btn btn-primary btn-block mt-md" data-i18n="verification.navLink">Documentos de verificación</a>
        </div>
      `;
      applyTranslations();
      return;
    }

    const categoryOptions = Object.entries(CATEGORY_LABELS)
      .map(([key, labels]) => `<option value="${key}">${labels[getCurrentLang()]}</option>`)
      .join('');

    container.innerHTML = `
      <div class="container section" style="max-width:600px;">
        <h1 class="section-title" data-i18n="publish.title">Publicar espacio</h1>
        <form id="publish-form">
          <div class="form-group">
            <label data-i18n="publish.name">Nombre del espacio</label>
            <input type="text" id="pub-name" required>
          </div>
          <div class="form-group">
            <label data-i18n="publish.type">Tipo de espacio</label>
            <select id="pub-type" required>${categoryOptions}</select>
          </div>
          <div class="form-group">
            <label>Ciudad</label>
            <input type="text" id="pub-city" required>
          </div>
          <div class="form-group">
            <label>Barrio</label>
            <input type="text" id="pub-neighborhood" required>
          </div>
          <div class="form-group">
            <label>Capacidad</label>
            <input type="number" id="pub-capacity" min="1" required>
          </div>
          <div class="form-group">
            <label data-i18n="publish.pricePerHour">Precio por hora</label>
            <input type="number" id="pub-price" min="1000" required>
          </div>

          <div id="price-calculator" class="notice-box hidden"></div>

          <div class="form-group mt-md">
            <label>Fotos del espacio</label>
            <input type="file" id="pub-photos" accept="image/*" multiple>
            <div id="photos-preview" class="mt-md" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
          </div>

          <div class="form-group">
            <label>Amenidades</label>
            <div id="amenities-checkboxes"></div>
          </div>

          <button type="submit" class="btn btn-primary btn-block mt-md">Publicar espacio</button>
        </form>
      </div>
    `;

    // Store the photo links here as they get uploaded to Cloudinary
    const uploadedPhotoUrls = [];

    // Every time the price changes, refresh the calculator shown below
    document.getElementById('pub-price').addEventListener('input', updatePriceCalculator);

    // Every time the space type changes, update which amenities can be
    // picked (e.g. "rehearsal room" shows drum kit and microphone, not coffee point)
    document.getElementById('pub-type').addEventListener('change', updateAmenitiesCheckboxes);
    updateAmenitiesCheckboxes();

    // Connect the "choose photos" field to the automatic Cloudinary upload
    attachFileUploader(document.getElementById('pub-photos'), (url) => {
      uploadedPhotoUrls.push(url);
      const preview = document.getElementById('photos-preview');
      preview.innerHTML += `<img src="${url}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;">`;
    });

    // What happens when clicking "Publish space"
    document.getElementById('publish-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const selectedAmenities = Array.from(document.querySelectorAll('#amenities-checkboxes input:checked'))
        .map((input) => input.value);

      try {
        await createSpace({
          name: document.getElementById('pub-name').value,
          type: document.getElementById('pub-type').value,
          city: document.getElementById('pub-city').value,
          neighborhood: document.getElementById('pub-neighborhood').value,
          capacity: Number(document.getElementById('pub-capacity').value),
          pricePerHour: Number(document.getElementById('pub-price').value),
          photos: uploadedPhotoUrls,
          amenities: selectedAmenities
        });
        showToast('Espacio publicado con éxito');
        navigateTo('/my-spaces');
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

// Calculates and shows live, as the user types the price:
// - What the person booking would pay (price + 12% fee + tax)
// - What the host would receive, after their 6% fee is deducted
function updatePriceCalculator() {
  const basePrice = Number(document.getElementById('pub-price').value) || 0;
  const box = document.getElementById('price-calculator');

  if (basePrice <= 0) {
    box.classList.add('hidden');
    return;
  }

  // What we'd charge the WSpacer who books (12% fee + its tax)
  const guestFee = basePrice * 0.12;
  const guestFeeTax = guestFee * 0.19;
  const guestTotal = basePrice + guestFee + guestFeeTax;

  // What gets deducted from the host (6% fee + its tax)
  const hostFee = basePrice * 0.06;
  const hostFeeTax = hostFee * 0.19;
  const netForHost = basePrice - hostFee - hostFeeTax;

  box.classList.remove('hidden');
  box.innerHTML = `
    <strong data-i18n="publish.calcTitle">Así lo verá quien reserve</strong>
    <div class="price-breakdown-row mt-md"><span data-i18n="booking.basePrice">Precio del espacio</span><span>${formatPrice(basePrice)}</span></div>
    <div class="price-breakdown-row"><span data-i18n="booking.serviceFee">Comisión de servicio WSPACE</span><span>${formatPrice(guestFee)}</span></div>
    <div class="price-breakdown-row"><span data-i18n="booking.iva">IVA sobre la comisión (19%)</span><span>${formatPrice(guestFeeTax)}</span></div>
    <div class="price-breakdown-row total"><span data-i18n="booking.total">Total a pagar</span><span>${formatPrice(guestTotal)}</span></div>
    <div class="price-breakdown-row mt-md"><span data-i18n="publish.calcYouReceive">Tú recibirás (neto)</span><strong>${formatPrice(netForHost)}</strong></div>
    <p class="mt-md" data-i18n="publish.taxNotice">${t('publish.taxNotice')}</p>
  `;
  applyTranslations();
}

// Changes the list of amenities available to check, based on the space
// type chosen in the form
function updateAmenitiesCheckboxes() {
  const type = document.getElementById('pub-type').value;
  const relevantKeys = AMENITIES_BY_CATEGORY[type] || [];
  const container = document.getElementById('amenities-checkboxes');

  container.innerHTML = relevantKeys.map((key) => {
    const label = AMENITY_LABELS[key];
    return `
      <label style="display:flex; align-items:center; gap:8px; font-weight:400; margin-bottom:6px;">
        <input type="checkbox" value="${key}" style="width:auto;">
        ${label.icon} ${label[getCurrentLang()]}
      </label>
    `;
  }).join('');
}
