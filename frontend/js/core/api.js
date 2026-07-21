/*
  FILE: api.js

  What does this file do?
  It is the "messenger" between the page and the server (backend). Every
  time we need to request information (e.g. the list of spaces) or send
  information (e.g. create a booking), the call goes through a function
  in this file.

  Why keep all of this in one place?
  Because if the real backend (built by the rest of the team) changes
  a path or a name down the line, it only needs to be fixed HERE, in a
  single file, instead of hunting through every screen one by one.
*/

// Where the server lives. Update this when connecting the team's real
// backend (see GUIDE.md, section 4.1)
const API_BASE_URL = 'http://localhost:3000/api';

// ----- Spaces -----

// Asks the server for the list of spaces, optionally filtered
// (e.g. only "coworking" type spaces in the city "Cali")
async function fetchSpaces(filters = {}) {
  const url = buildUrlWithParams(`${API_BASE_URL}/spaces`, filters);
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudieron cargar los espacios');
  return response.json();
}

// Asks the server for the full details of a specific space, by id
async function fetchSpaceById(id) {
  const response = await fetch(`${API_BASE_URL}/spaces/${id}`);
  if (!response.ok) throw new Error('No se encontró el espacio');
  return response.json();
}

// Sends the server the data for a new space a WSpacer+ wants to publish
async function createSpace(spaceData) {
  const response = await authFetch('/spaces', {
    method: 'POST',
    body: JSON.stringify(spaceData)
  });
  if (!response.ok) throw new Error('No se pudo publicar el espacio');
  return response.json();
}

// Asks the server for the spaces that belong to the currently logged-in user
async function fetchMySpaces() {
  const response = await authFetch('/spaces/mine');
  if (!response.ok) throw new Error('No se pudieron cargar tus espacios');
  return response.json();
}

// Saves changes to a space the current user owns
async function updateSpace(spaceId, spaceData) {
  const response = await authFetch(`/spaces/${spaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(spaceData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo actualizar el espacio');
  return data;
}

// Flips a space between active and inactive (temporarily hides it from
// search without deleting it)
async function toggleSpaceActive(spaceId) {
  const response = await authFetch(`/spaces/${spaceId}/toggle-active`, { method: 'PATCH' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo cambiar el estado del espacio');
  return data;
}

// ----- Availability blocks -----

// Asks the server for every block the owner has set on this space
async function fetchSpaceBlocks(spaceId) {
  const response = await authFetch(`/spaces/${spaceId}/blocks`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar los bloqueos');
  return data;
}

// Creates a new block (a date/time range where the space can't be booked)
async function createSpaceBlock(spaceId, blockData) {
  const response = await authFetch(`/spaces/${spaceId}/blocks`, {
    method: 'POST',
    body: JSON.stringify(blockData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo crear el bloqueo');
  return data;
}

// Removes a block, freeing that date/time range up for booking again
async function deleteSpaceBlock(spaceId, blockId) {
  const response = await authFetch(`/spaces/${spaceId}/blocks/${blockId}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'No se pudo eliminar el bloqueo');
  }
}

// ----- Bookings -----

// Sends the server a new booking request (date, time, which space)
async function createBooking(bookingData) {
  const response = await authFetch('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo crear la reserva');
  return data;
}

// Asks the server for the bookings the current user has made (as a WSpacer)
async function fetchMyBookings() {
  const response = await authFetch('/bookings/mine');
  if (!response.ok) throw new Error('No se pudieron cargar tus reservas');
  return response.json();
}

// Asks the server for the booking requests the current user has received
// on their published spaces (as a WSpacer+)
async function fetchHostBookings() {
  const response = await authFetch('/bookings/host');
  if (!response.ok) throw new Error('No se pudieron cargar las reservas recibidas');
  return response.json();
}

// The host (WSpacer+) uses this to approve or reject a booking request
async function respondBooking(bookingId, decision) {
  // decision can be "confirmada" (confirmed) or "rechazada" (rejected)
  const response = await authFetch(`/bookings/${bookingId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ status: decision })
  });
  if (!response.ok) throw new Error('No se pudo actualizar la reserva');
  return response.json();
}

// The WSpacer uses this to cancel a booking they had already made
async function cancelBooking(bookingId) {
  const response = await authFetch(`/bookings/${bookingId}/cancel`, { method: 'PATCH' });
  if (!response.ok) throw new Error('No se pudo cancelar la reserva');
  return response.json();
}

// The host (WSpacer+) uses this to cancel a booking they had already
// confirmed. The server applies the late-cancellation penalty/compensation
// automatically if it's within the 24h window, and reports it back via
// "latePenaltyApplied"
async function hostCancelBooking(bookingId) {
  const response = await authFetch(`/bookings/${bookingId}/host-cancel`, { method: 'PATCH' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo cancelar la reserva');
  return data;
}

// The host marks a confirmed booking as fulfilled once it has already
// taken place. This is what makes the booking count towards the host's
// income metric on the dashboard (see dashboard.js)
async function completeBooking(bookingId) {
  const response = await authFetch(`/bookings/${bookingId}/complete`, { method: 'PATCH' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo marcar la reserva como cumplida');
  return data;
}

// Leaves a rating (1-5) + optional comment on a booking that's already
// completed
async function submitReview(bookingId, reviewData) {
  const response = await authFetch(`/bookings/${bookingId}/review`, {
    method: 'POST',
    body: JSON.stringify(reviewData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo enviar la reseña');
  return data;
}

// ----- Reviews -----

// Every review left on any of the current user's spaces (HU-23)
async function fetchHostReviews() {
  const response = await authFetch('/reviews/host');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las reseñas');
  return data;
}

// ----- Favorites -----

// Every space the current user has favorited
async function fetchFavorites() {
  const response = await authFetch('/favorites');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar tus favoritos');
  return data;
}

// Marks a space as favorite (idempotent — see favoritesController.ts)
async function addFavorite(spaceId) {
  const response = await authFetch('/favorites', {
    method: 'POST',
    body: JSON.stringify({ spaceId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo agregar a favoritos');
  return data;
}

// Un-favorites a space
async function removeFavorite(spaceId) {
  const response = await authFetch(`/favorites/${spaceId}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'No se pudo quitar de favoritos');
  }
}

// ----- Notifications -----

async function fetchNotifications() {
  const response = await authFetch('/notifications');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las notificaciones');
  return data;
}

async function markNotificationRead(notificationId) {
  const response = await authFetch(`/notifications/${notificationId}/read`, { method: 'PATCH' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo actualizar la notificación');
  return data;
}

async function markAllNotificationsRead() {
  const response = await authFetch('/notifications/read-all', { method: 'PATCH' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'No se pudieron actualizar las notificaciones');
  }
}

// ----- Users -----

// Saves the national ID number + the two verification document URLs
// (already uploaded to Cloudinary) needed to receive payouts as a WSpacer+
async function submitVerificationDocuments(documentsData) {
  const response = await authFetch('/users/me/verification-documents', {
    method: 'PATCH',
    body: JSON.stringify(documentsData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudieron guardar los documentos');
  return data;
}

// ----- Admin -----

// Asks the server for every space still waiting for admin approval
async function fetchPendingAdminSpaces() {
  const response = await authFetch('/admin/spaces/pending');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar los espacios pendientes');
  return data;
}

// Approves a pending space, making it visible in public search
async function approveAdminSpace(spaceId) {
  const response = await authFetch(`/admin/spaces/${spaceId}/approve`, { method: 'PATCH' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo aprobar el espacio');
  return data;
}

// Rejects a pending space with a mandatory reason
async function rejectAdminSpace(spaceId, reason) {
  const response = await authFetch(`/admin/spaces/${spaceId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo rechazar el espacio');
  return data;
}
