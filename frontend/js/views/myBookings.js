/*
  FILE: myBookings.js

  What does this file do?
  Renders the "My bookings" screen, where a WSpacer sees every booking
  they've made, along with its status (pending, confirmed, etc.), and
  can cancel as needed.

  Business rule changed 2026-07-19: payment is no longer a separate step
  the guest takes here — it's mandatory and happens automatically when
  the booking is requested (see bookingsController.createBooking). This
  view just shows the payment reference for transparency, including on
  a rejected booking, since the money isn't refunded automatically (see
  docs/WSPACE_Backlog_Detallado.md) — the guest can use that reference to
  request a manual refund.
*/

async function renderMyBookingsView(container) {
  // If no one is logged in, ask them to log in first
  requireAuth(async () => {
    container.innerHTML = `
      <div class="container section">
        <h1 class="section-title" data-i18n="nav.myBookings">Mis reservas</h1>
        <div id="bookings-list"></div>
      </div>
    `;

    const list = document.getElementById('bookings-list');
    try {
      const bookings = await fetchMyBookings();

      if (bookings.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Todavía no tienes reservas</p></div>';
        return;
      }

      list.innerHTML = bookings.map(renderBookingRow).join('');
      applyTranslations();
      attachBookingActions();
      attachDeadlineCountdowns(bookings);
      attachReviewEvents();
    } catch (error) {
      list.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
    }
  });
}

// Renders a row with a booking's details: space, date, price, and
// whichever buttons apply based on its current status
function renderBookingRow(booking) {
  const statusLabels = {
    pending_approval: t('booking.pending'),
    confirmed: t('booking.confirmed'),
    rejected: t('booking.rejected'),
    cancelled_by_guest: t('booking.cancelled'),
    cancelled_by_host: t('booking.cancelledByHost'),
    completed: t('booking.completed')
  };

  return `
    <div class="price-breakdown mb-md">
      <div class="price-breakdown-row">
        <strong>${booking.spaceName}</strong>
        <span class="badge">${statusLabels[booking.status] || booking.status}</span>
      </div>
      <div class="price-breakdown-row">
        <span>${booking.date} · ${booking.startTime} - ${booking.endTime}</span>
        <span>${formatPrice(booking.total)}</span>
      </div>
      ${booking.status === 'pending_approval' ? `
        <div class="price-breakdown-row">
          <span data-i18n="booking.timeLeft">Tiempo restante para respuesta</span>
          <span id="countdown-${booking.id}"></span>
        </div>
      ` : ''}
      ${booking.paymentReference ? `
        <div class="price-breakdown-row">
          <span data-i18n="booking.paymentRef">Referencia de pago</span>
          <span>${booking.paymentReference}</span>
        </div>
      ` : ''}
      ${booking.status === 'confirmed' ? `<button class="btn btn-outline mt-md" data-cancel="${booking.id}">Cancelar reserva</button>` : ''}
      ${booking.status === 'completed' ? renderReviewSection(booking) : ''}
    </div>
  `;
}

// For a completed booking: either a compact form to leave a review, or a
// note that one was already left (reviewsController.createReview only
// allows one per booking, see HU-23)
function renderReviewSection(booking) {
  if (booking.hasReview) {
    return `<p class="mt-md" data-i18n="reviews.alreadyReviewed">Ya dejaste una reseña para esta reserva</p>`;
  }

  return `
    <div class="mt-md">
      <strong data-i18n="reviews.leaveTitle">Deja tu reseña</strong>
      <div class="form-group mt-md">
        <label data-i18n="reviews.ratingLabel">Calificación</label>
        <select id="review-rating-${booking.id}">
          <option value="5">★★★★★</option>
          <option value="4">★★★★☆</option>
          <option value="3">★★★☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="1">★☆☆☆☆</option>
        </select>
      </div>
      <div class="form-group">
        <label data-i18n="reviews.commentLabel">Comentario (opcional)</label>
        <textarea id="review-comment-${booking.id}" data-i18n-placeholder="reviews.commentPlaceholder" placeholder="¿Cómo fue tu experiencia?"></textarea>
      </div>
      <button class="btn btn-outline" data-submit-review="${booking.id}" data-i18n="reviews.submitCta">Enviar reseña</button>
    </div>
  `;
}

function attachReviewEvents() {
  document.querySelectorAll('[data-submit-review]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const bookingId = btn.dataset.submitReview;
      const rating = Number(document.getElementById(`review-rating-${bookingId}`).value);
      const comment = document.getElementById(`review-comment-${bookingId}`).value.trim();

      try {
        await submitReview(bookingId, { rating, comment: comment || undefined });
        showToast(t('reviews.submittedToast'));
        renderCurrentRoute();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

// Starts a live countdown to responseDeadline for every pending booking.
// Each one updates itself independently every minute, and stops as soon
// as its element is no longer on screen (e.g. after navigating away).
function attachDeadlineCountdowns(bookings) {
  bookings
    .filter((booking) => booking.status === 'pending_approval')
    .forEach((booking) => startCountdown(booking.id, booking.responseDeadline));
}

function startCountdown(bookingId, deadlineIso) {
  const el = document.getElementById(`countdown-${bookingId}`);
  if (!el) return;

  function tick() {
    const target = document.getElementById(`countdown-${bookingId}`);
    if (!target) {
      clearInterval(intervalId);
      return;
    }
    const remaining = formatTimeRemaining(deadlineIso);
    target.textContent = remaining || t('booking.deadlineExpired');
  }

  tick();
  const intervalId = setInterval(tick, 60000);
}

// Wires up each booking's "Cancel" button
function attachBookingActions() {
  document.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await cancelBooking(btn.dataset.cancel);
      showToast('Reserva cancelada');
      renderCurrentRoute(); // re-render the screen so the change is visible
    });
  });
}
