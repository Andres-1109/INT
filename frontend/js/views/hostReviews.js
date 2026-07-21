/*
  FILE: hostReviews.js

  What does this file do?
  Shows the ratings and comments WSpacers have left on any of the
  current WSpacer+'s spaces (GET /api/reviews/host).
*/

async function renderHostReviewsView(container) {
  requireHostRole(async () => {
    container.innerHTML = `
      <div class="container section">
        <h1 class="section-title" data-i18n="reviews.title">Reseñas recibidas</h1>
        <div id="host-reviews-list" class="mt-md"></div>
      </div>
    `;
    applyTranslations();

    const list = document.getElementById('host-reviews-list');
    try {
      const reviews = await fetchHostReviews();
      list.innerHTML = reviews.length
        ? reviews.map(renderHostReviewRow).join('')
        : `<div class="empty-state"><p data-i18n="reviews.empty">Todavía no tienes reseñas</p></div>`;
      applyTranslations();
    } catch (error) {
      list.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
    }
  });
}

function renderHostReviewRow(review) {
  const createdAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(review.createdAt));

  return `
    <div class="price-breakdown mb-md">
      <div class="price-breakdown-row">
        <strong>${review.spaceName}</strong>
        <span>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
      </div>
      <div class="price-breakdown-row">
        <span>${review.guestName} · ${createdAt}</span>
      </div>
      ${review.comment ? `<p class="mt-md">${review.comment}</p>` : ''}
    </div>
  `;
}
