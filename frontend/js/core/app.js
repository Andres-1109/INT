/*
  FILE: app.js

  What does this file do?
  It's the starting point of the whole page. When someone opens WSPACE,
  this is the first code that runs, and it takes care of three things:
  1. Telling the router which routes exist and which screen to show for each
  2. Starting the language system, the navbar, and the router
  3. Showing the welcome pop-up (if applicable)
*/

// Here we register ALL the routes the application has, and which
// screen (view) should be shown for each one
function registerAllRoutes() {
  registerRoute('/', renderHomeView);
  registerRoute('/spaces', renderSpacesListView);
  registerRoute('/space/:id', renderSpaceDetailView);
  registerRoute('/my-bookings', renderMyBookingsView);
  registerRoute('/favorites', renderFavoritesView);
  registerRoute('/profile', renderProfileView);
  registerRoute('/verification-documents', renderVerificationDocumentsView);
  registerRoute('/notifications', renderNotificationsView);
  registerRoute('/dashboard', renderDashboardView);
  registerRoute('/my-spaces', renderMySpacesView);
  registerRoute('/my-spaces/new', renderPublishSpaceView);
  registerRoute('/my-spaces/:id/edit', renderEditSpaceView);
  registerRoute('/my-spaces/:id/availability', renderSpaceAvailabilityView);
  registerRoute('/my-spaces/bookings', renderHostBookingsView);
  registerRoute('/my-spaces/reviews', renderHostReviewsView);
  registerRoute('/terms', renderLegalTermsView);
  registerRoute('/privacy-policy', renderLegalPrivacyView);
  registerRoute('/about', renderAboutView);
  registerRoute('/admin/spaces', renderAdminSpacesView);

  // This route is used when someone without an account clicks "publish
  // your space" from Home: it opens the registration window directly
  registerRoute('/host-signup', (container) => {
    openLoginModal('register');
    renderHomeView(container);
  });
}

// Main function that starts everything, in the right order
async function startApp() {
  await initI18n();          // load the language first
  registerAllRoutes();       // then register which routes exist
  renderNavbar();            // render the top navigation bar
  renderFooter();            // render the footer
  initRouter();              // start the router (this renders the initial screen)
  maybeShowWelcomeModal();   // show the welcome pop-up, if applicable
}

// Tells the browser: "once you finish loading the whole page,
// run the startApp function"
document.addEventListener('DOMContentLoaded', startApp);
