/*
  FILE: spaceDetail.js

  What does this file do?
  Renders the detail screen for ONE specific space: its photos,
  description, amenities, and the panel where the person picks a date
  and time to book, seeing the calculated price live as they choose.
*/

async function renderSpaceDetailView(container, params) {
  container.innerHTML = '<div class="container"><p>Cargando...</p></div>';

  // Ask the server for this specific space's data (using its id)
  let space;
  try {
    space = await fetchSpaceById(params.id);
  } catch (error) {
    container.innerHTML = `<div class="container empty-state"><p>${error.message}</p></div>`;
    return;
  }

  const categoryLabel = CATEGORY_LABELS[space.type] ? CATEGORY_LABELS[space.type][getCurrentLang()] : space.type;
  const amenityKeys = space.amenities || [];

  container.innerHTML = `
    <div class="container section">
      <div id="photo-gallery"></div>

      <div class="mt-lg" style="display:grid; grid-template-columns: 1fr; gap:24px;">
        <div>
          <h1>${space.name}</h1>
          <p class="mt-md">${categoryLabel} · ${space.neighborhood}, ${space.city} · Capacidad ${space.capacity}</p>
          <p class="mt-md">${space.description || ''}</p>

          <h3 class="mt-lg mb-md">Amenidades</h3>
          <div id="amenities-preview" style="display:grid; grid-template-columns: repeat(2,1fr); gap:8px;"></div>
          <button class="btn btn-outline mt-md" id="toggle-amenities-btn" data-i18n="spaces.viewAllAmenities">Ver todas las amenidades</button>
        </div>

        <div class="price-breakdown" id="booking-panel"></div>
      </div>
    </div>
  `;

  renderPhotoGallery(space);
  renderAmenities(amenityKeys);
  renderBookingPanel(space);
}

// Renders the hero photo plus a thumbnail strip for the rest of the
// space's photos (space.photos can have more than one, coming from the
// space_photos table). Clicking a thumbnail swaps the hero image,
// instead of only ever showing the first uploaded photo.
function renderPhotoGallery(space) {
  const gallery = document.getElementById('photo-gallery');
  const photos = space.photos && space.photos.length ? space.photos : ['https://via.placeholder.com/900x400?text=WSPACE'];

  gallery.innerHTML = `
    <img id="gallery-hero" src="${photos[0]}"
         style="width:100%; height:280px; object-fit:cover; border-radius:16px;" alt="${space.name}">
    ${photos.length > 1 ? `
      <div class="mt-md" style="display:flex; gap:8px; overflow-x:auto;">
        ${photos.map((url, index) => `
          <img src="${url}" data-thumb="${index}"
               style="width:80px; height:60px; object-fit:cover; border-radius:8px; cursor:pointer; flex-shrink:0; opacity:${index === 0 ? '1' : '0.6'};"
               alt="${space.name} ${index + 1}">
        `).join('')}
      </div>
    ` : ''}
  `;

  if (photos.length > 1) {
    const hero = document.getElementById('gallery-hero');
    document.querySelectorAll('[data-thumb]').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        hero.src = photos[Number(thumb.dataset.thumb)];
        document.querySelectorAll('[data-thumb]').forEach((t) => { t.style.opacity = '0.6'; });
        thumb.style.opacity = '1';
      });
    });
  }
}

// Renders the list of amenities (wifi, drum kit, coffee, etc.) with
// their icon. At first only the first 6 are shown, and the "view all"
// button expands the rest, to avoid overwhelming the screen with a long list
function renderAmenities(amenityKeys) {
  const preview = document.getElementById('amenities-preview');
  let expanded = false;

  function draw() {
    const visibleKeys = expanded ? amenityKeys : amenityKeys.slice(0, 6);
    preview.innerHTML = visibleKeys.map((key) => {
      const label = AMENITY_LABELS[key];
      if (!label) return '';
      return `<div>✓ ${label.icon} ${label[getCurrentLang()]}</div>`;
    }).join('');
  }

  draw();

  const toggleBtn = document.getElementById('toggle-amenities-btn');
  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    draw();
  });
}

// Renders the panel where the person picks a date/time and requests
// the booking, showing the price (with fee and tax) calculated live
function renderBookingPanel(space) {
  const panel = document.getElementById('booking-panel');

  panel.innerHTML = `
    <h3 class="mb-md">${formatPrice(space.pricePerHour)} <span data-i18n="spaces.perHour">/ hora</span></h3>
    <div class="form-group">
      <label data-i18n="home.date">Fecha</label>
      <input type="date" id="booking-date">
    </div>
    <div class="form-group">
      <label data-i18n="home.startTime">Hora inicio</label>
      <input type="time" id="booking-startTime">
    </div>
    <div class="form-group">
      <label data-i18n="home.endTime">Hora fin</label>
      <input type="time" id="booking-endTime">
    </div>
    <div id="booking-price-preview"></div>
    <div class="form-error hidden" id="booking-error"></div>
    <button class="btn btn-primary btn-block mt-md" id="request-booking-btn" data-i18n="booking.requestCta">Pagar y reservar</button>
  `;
  applyTranslations();

  const startInput = document.getElementById('booking-startTime');
  const endInput = document.getElementById('booking-endTime');

  // Every time the person changes the start or end time, recalculate
  // the total price instantly, so they see what they'll pay before confirming
  function updatePricePreview() {
    const hours = calculateHours(startInput.value || '00:00', endInput.value || '00:00');
    const preview = document.getElementById('booking-price-preview');

    if (hours <= 0) {
      preview.innerHTML = '';
      return;
    }

    const breakdown = calculateBookingPrice(space.pricePerHour, hours);
    preview.innerHTML = `
      <div class="notice-box">
        <div class="price-breakdown-row"><span data-i18n="booking.basePrice">Precio del espacio</span><span>${formatPrice(breakdown.basePrice)}</span></div>
        <div class="price-breakdown-row"><span data-i18n="booking.serviceFee">Comisión de servicio WSPACE</span><span>${formatPrice(breakdown.serviceFee)}</span></div>
        <div class="price-breakdown-row"><span data-i18n="booking.iva">IVA sobre la comisión (19%)</span><span>${formatPrice(breakdown.taxOnFee)}</span></div>
        <div class="price-breakdown-row total"><span data-i18n="booking.total">Total a pagar</span><span>${formatPrice(breakdown.total)}</span></div>
      </div>
    `;
    applyTranslations();
  }

  startInput.addEventListener('input', updatePricePreview);
  endInput.addEventListener('input', updatePricePreview);

  // What happens when the person clicks "Request booking"
  document.getElementById('request-booking-btn').addEventListener('click', () => {
    // If they're not logged in, first ask them to log in or sign up
    requireAuth(async () => {
      const date = document.getElementById('booking-date').value;
      const startTime = startInput.value;
      const endTime = endInput.value;
      const errorBox = document.getElementById('booking-error');

      if (!date || !startTime || !endTime || calculateHours(startTime, endTime) <= 0) {
        errorBox.textContent = 'Revisa la fecha y el horario seleccionado';
        errorBox.classList.remove('hidden');
        return;
      }

      try {
        const booking = await createBooking({
          spaceId: space.id,
          date,
          startTime,
          endTime
        });
        showToast('Pago realizado. Solicitud enviada, el anfitrión debe confirmarla.');
        navigateTo(`/my-bookings`);
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove('hidden');
      }
    });
  });
}

// Calculates what the WSpacer will pay: base price + 12% service fee +
// 19% tax on that fee (NOT on the full price, only on the fee that
// goes to WSPACE)
function calculateBookingPrice(pricePerHour, hours) {
  const basePrice = pricePerHour * hours;
  const serviceFee = basePrice * 0.12;
  const taxOnFee = serviceFee * 0.19;
  const total = basePrice + serviceFee + taxOnFee;
  return { basePrice, serviceFee, taxOnFee, total };
}
