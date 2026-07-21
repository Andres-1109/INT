/*
  FILE: hostBookings.js

  What does this file do?
  Renders the list of booking requests the WSpacer+ has received on
  their spaces, with buttons to Approve or Reject each one.
*/

async function renderHostBookingsView(container) {
  requireHostRole(async () => {
    container.innerHTML = `
      <div class="container section">
        <h1 class="section-title" data-i18n="nav.hostBookings">Reservas recibidas</h1>
        <div id="host-bookings-list"></div>
      </div>
    `;

    const list = document.getElementById('host-bookings-list');
    try {
      const bookings = await fetchHostBookings();

      if (bookings.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No tienes solicitudes por ahora</p></div>';
        return;
      }

      list.innerHTML = bookings.map((booking) => `
        <div class="price-breakdown mb-md">
          <div class="price-breakdown-row">
            <strong>${booking.spaceName}</strong>
            <span class="badge">${booking.status}</span>
          </div>
          <div class="price-breakdown-row">
            <span>${booking.guestName} · ${booking.date} · ${booking.startTime}-${booking.endTime}</span>
          </div>
          ${booking.status === 'pending_approval' ? `
            <div class="mt-md" style="display:flex; gap:8px;">
              <button class="btn btn-primary" data-approve="${booking.id}">Aprobar</button>
              <button class="btn btn-outline" data-reject="${booking.id}">Rechazar</button>
            </div>
          ` : ''}
          ${booking.status === 'confirmed' ? `
            <div class="mt-md" style="display:flex; gap:8px;">
              <button class="btn btn-outline" data-host-cancel="${booking.id}" data-i18n="hostBookings.cancelCta">Cancelar reserva</button>
              ${isPastDateTime(booking.date, booking.endTime) ? `
                <button class="btn btn-primary" data-complete="${booking.id}" data-i18n="hostBookings.completeCta">Marcar como cumplida</button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `).join('');
      applyTranslations();

      // "Approve" button: changes the booking's status to "confirmada"
      document.querySelectorAll('[data-approve]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await respondBooking(btn.dataset.approve, 'confirmed');
          showToast('Reserva aprobada');
          renderCurrentRoute();
        });
      });

      // "Reject" button: changes the booking's status to "rechazada"
      document.querySelectorAll('[data-reject]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await respondBooking(btn.dataset.reject, 'rejected');
          showToast('Reserva rechazada');
          renderCurrentRoute();
        });
      });

      // "Cancel booking" button: the host cancels a booking they had
      // already confirmed. The server applies the late-cancellation
      // penalty/compensation automatically when it's within 24h of the
      // booking's start (see HOST_LATE_CANCEL_WINDOW_HOURS in
      // bookingsController.ts), and reports it via latePenaltyApplied.
      document.querySelectorAll('[data-host-cancel]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const result = await hostCancelBooking(btn.dataset.hostCancel);
            showToast(result.latePenaltyApplied ? t('hostBookings.cancelledPenaltyToast') : t('hostBookings.cancelledToast'));
            renderCurrentRoute();
          } catch (error) {
            showToast(error.message);
          }
        });
      });

      // "Mark as fulfilled" button: only shown once the booking's end
      // time has already passed (see isPastDateTime in utils.js). This
      // is what makes a booking count towards the dashboard's income
      // metric, since nothing marks it "completed" automatically.
      document.querySelectorAll('[data-complete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await completeBooking(btn.dataset.complete);
            showToast(t('hostBookings.completedToast'));
            renderCurrentRoute();
          } catch (error) {
            showToast(error.message);
          }
        });
      });
    } catch (error) {
      list.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
    }
  });
}
