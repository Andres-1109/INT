/*
  FILE: dashboard.js

  What does this file do?
  Renders the main panel a WSpacer+ sees as soon as they enter "host
  mode": a quick summary of how many spaces they have, how many
  booking requests are pending, and how much they've earned.
*/

async function renderDashboardView(container) {
  // Only a WSpacer+ can see this screen
  requireHostRole(async () => {
    container.innerHTML = `
      <div class="container section">
        <h1 class="section-title" data-i18n="nav.dashboard">Dashboard</h1>
        <div id="dashboard-metrics" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px;"></div>
        <div class="mt-lg">
          <a href="/my-spaces/new" data-link class="btn btn-primary">+ Publicar nuevo espacio</a>
        </div>
      </div>
    `;

    try {
      const [spaces, bookings] = await Promise.all([fetchMySpaces(), fetchHostBookings()]);
      const pendingCount = bookings.filter((b) => b.status === 'pending_approval').length;
      const monthIncome = bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + (b.hostNet || 0), 0);

      document.getElementById('dashboard-metrics').innerHTML = `
        <div class="price-breakdown"><strong>${spaces.length}</strong><p>Espacios publicados</p></div>
        <div class="price-breakdown"><strong>${pendingCount}</strong><p>Reservas pendientes</p></div>
        <div class="price-breakdown"><strong>${formatPrice(monthIncome)}</strong><p>Ingresos (histórico simulado)</p></div>
      `;
    } catch (error) {
      showToast(error.message);
    }
  });
}
