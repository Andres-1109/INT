/*
  FILE: router.js

  What does this file do?
  It is the "brain" that makes the page behave like a modern app
  (SPA = Single Page Application), instead of an old-style website.

  What's the difference?
  On an old-style website, every time you click a link, the browser
  reloads the ENTIRE page from scratch (it flashes white for a second
  and reappears). That's slow and feels outdated.

  Here, instead, we intercept those clicks: rather than letting the
  browser reload everything, we change only the screen's content
  ourselves (for example, from "Home" to "Spaces list"), without
  reloading anything. It feels much faster and more modern.

  Technical note for the team: since we use "real" paths (e.g.
  /spaces, not #spaces), the server hosting the page (Vercel, etc.)
  needs to be configured so that if someone navigates directly to one
  of these paths, it still serves the main page. This is explained in
  GUIDE.md.
*/

// Stores the list of "routes" that exist on the site, and which
// function is responsible for rendering each one
const routes = {};

// Used to tell the router: "this route exists, and when someone
// visits it, use this function to render what should be shown"
function registerRoute(path, renderFunction) {
  routes[path] = renderFunction;
}

// Finds which of the registered routes matches the one the user is
// currently visiting. It also understands routes with dynamic parts,
// like "/space/123" (where 123 can be any number)
function matchRoute(pathname) {
  for (const routePath in routes) {
    const paramNames = [];
    const regexPattern = routePath.replace(/:[^/]+/g, (match) => {
      paramNames.push(match.slice(1));
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexPattern}$`);
    const match = pathname.match(regex);

    if (match) {
      const params = {};
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
      return { renderFunction: routes[routePath], params };
    }
  }
  return null;
}

// Renders the view that corresponds to the browser's current path
async function renderCurrentRoute() {
  // If someone opens the page as ".../index.html" instead of just "/"
  // (happens often with Live Server), we treat it exactly the same as "/"
  let pathname = window.location.pathname;
  if (pathname.endsWith('/index.html')) {
    pathname = pathname.replace('/index.html', '/');
  }

  const matched = matchRoute(pathname);

  const appContainer = document.getElementById('app-view');

  if (!matched) {
    appContainer.innerHTML = '<div class="empty-state"><h2>Page not found</h2></div>';
    return;
  }

  appContainer.innerHTML = '';
  await matched.renderFunction(appContainer, matched.params, getQueryParams());

  // Every time we switch screens, translations need to be reapplied,
  // because the new content may bring untranslated text with it
  applyTranslations();

  window.scrollTo(0, 0);
  updateNavbarState();
}

// Switches screens WITHOUT reloading the page. This is what's used
// throughout the code whenever we want to "go to another view"
function navigateTo(path) {
  window.history.pushState({}, '', path);
  renderCurrentRoute();
}

// "Listens" for clicks anywhere on the page. If the click was on a link
// marked as internal (data-link), it prevents the browser from
// reloading everything, and instead navigates within the SPA
function setupLinkInterception() {
  document.body.addEventListener('click', (event) => {
    const link = event.target.closest('[data-link]');
    if (link) {
      event.preventDefault();
      navigateTo(link.getAttribute('href'));
    }
  });
}

// Runs once, when the page first loads.
// Sets up everything needed for the router to start working
function initRouter() {
  setupLinkInterception();

  // Detects when the user uses the browser's "back" or "forward" button
  window.addEventListener('popstate', renderCurrentRoute);

  renderCurrentRoute();
}
