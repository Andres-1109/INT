/*
  FILE: notifications.js

  What does this file do?
  Renders the notifications screen: alerts about the status of a
  booking (requested, confirmed, rejected, cancelled), created by the
  backend at the relevant points in bookingsController.ts. In-app only —
  no email/push/WebSockets, see docs/GUIDE.md.
*/

async function renderNotificationsView(container) {
  requireAuth(async () => {
    container.innerHTML = `
      <div class="container section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h1 class="section-title" data-i18n="nav.notifications">Notificaciones</h1>
          <button class="btn btn-outline" id="mark-all-read-btn" data-i18n="notifications.markAllRead">Marcar todas como leídas</button>
        </div>
        <div id="notifications-list" class="mt-md"></div>
      </div>
    `;
    applyTranslations();

    document.getElementById('mark-all-read-btn').addEventListener('click', async () => {
      try {
        await markAllNotificationsRead();
        showToast(t('notifications.markAllReadToast'));
        await loadNotifications();
      } catch (error) {
        showToast(error.message);
      }
    });

    await loadNotifications();
  });
}

async function loadNotifications() {
  const list = document.getElementById('notifications-list');
  try {
    const notifications = await fetchNotifications();
    list.innerHTML = notifications.length
      ? notifications.map(renderNotificationRow).join('')
      : `<div class="empty-state"><p data-i18n="notifications.empty">No tienes notificaciones nuevas</p></div>`;
    applyTranslations();
    attachNotificationEvents();
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
  }
}

function renderNotificationRow(notification) {
  const typeLabel = t(`notifications.type.${notification.type}`) || notification.type;
  const createdAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt));

  return `
    <div class="price-breakdown mb-md" style="${notification.read ? 'opacity:0.6;' : ''}">
      <div class="price-breakdown-row">
        <span class="badge">${typeLabel}</span>
        <span>${createdAt}</span>
      </div>
      <div class="price-breakdown-row">
        <span>${notification.message}</span>
        ${!notification.read ? `<button class="btn btn-outline" data-mark-read="${notification.id}">✓</button>` : ''}
      </div>
    </div>
  `;
}

function attachNotificationEvents() {
  document.querySelectorAll('[data-mark-read]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await markNotificationRead(btn.dataset.markRead);
        await loadNotifications();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}
