# WSPACE — Backlog Detallado (actualizado)

> **Nota de cambio (2ª revisión, 2026-07-17):** este documento fue verificado historia por historia contra el código real (`backend/src`, `backend/prisma/schema.prisma`, `frontend/js`), no contra lo que se documentó en `docs/GUIDE.md` o en la versión anterior de este backlog. Las reglas de negocio (comisiones, plazos, categorías) se confirmaron contra las constantes reales en `bookingsController.ts` y los enums de `schema.prisma` — **todas coincidían con lo ya documentado**, así que esa tabla no cambió de fondo. Lo que sí cambió: varias historias que la versión anterior daba por "completas" en realidad tienen el backend listo pero **cero frontend conectado** (HU-16, HU-20), y una historia que se creía "solo le falta un paso de verificación" en realidad no tiene ningún código escrito (HU-14). También se corrige HU-05 (el buscador no filtra por fecha/hora, solo lo aparenta) y HU-17 (el backend no tiene ningún endpoint para bloqueos, no solo falta la vista).
>
> **Nota de cambio (3ª revisión, Fase 1 de implementación, 2026-07-17):** se conectó el frontend que faltaba para HU-16, HU-20 y HU-08 (los tres endpoints ya existían en el backend; solo faltaba usarlos). Las tres se probaron de punta a punta en navegador contra el backend real (login → acción → verificación de estado). Dos bugs de infraestructura preexistentes que se encontraron y corrigieron en el camino (no específicos de ninguna historia) quedaron documentados aparte en `docs/resolved-bugs.md`.
>
> **Nota de cambio (4ª revisión, Fase 2 de implementación, 2026-07-17):** se corrigió lógica de negocio incompleta en tres historias. HU-05: la búsqueda ahora sí excluye espacios ocupados en el momento buscado. HU-06: el detalle de espacio ahora muestra todas las fotos, no solo la portada. HU-22: se implementó la transición a `completed` que no existía — **decisión de negocio confirmada con el equipo:** el WSpacer+ marca manualmente una reserva confirmada como cumplida una vez ya pasó (no hay job automático). Las tres se probaron de punta a punta.
>
> **Nota de cambio (5ª revisión, Fase 3 de implementación, 2026-07-17):** se construyeron de cero las tres historias que no tenían ningún frontend: HU-24/25/26 (panel de administración — la brecha más grande del proyecto), HU-17 (disponibilidad/bloqueos, backend **y** frontend, ya que no existía ninguno de los dos) y HU-14 (documentos de verificación WSpacer+). De paso se encontraron y corrigieron dos bugs preexistentes más, documentados en `docs/resolved-bugs.md`: un desfase de un día completo en todo cálculo de fecha+hora del backend (dependía de la zona horaria del proceso — bug #4), descubierto al probar HU-17, y un mensaje de error que mostraba `undefined` en vez del campo duplicado en cualquier violación de restricción única que no tuviera chequeo previo (bug #5), descubierto al probar HU-14. También se corrigió `respondBooking`, que no validaba el estado de la reserva antes de cambiarlo (bug #3, corregido a pedido explícito entre la Fase 2 y la Fase 3). Las tres historias nuevas se probaron de punta a punta.
>
> **Nota de cambio (6ª revisión, entre Fase 3 y Fase 4, 2026-07-17):** el equipo reportó que publicar un espacio no exigía tener los documentos de verificación de HU-14 en regla — se confirmó, se documentó como bug #6, y se corrigió: `createSpace` ahora rechaza con `403` si faltan `nationalId`/`nationalIdDocUrl`/`bankCertificateUrl`.
>
> **Nota de cambio (7ª revisión, Fase 4 de implementación, 2026-07-17):** se construyeron desde cero las tres últimas historias "Could have" — HU-12 (favoritos), HU-13 (notificaciones), HU-23 (reseñas) — ninguna tenía tabla, endpoint ni frontend real. Se agregaron tres modelos nuevos a `schema.prisma` (`Favorite`, `Notification`, `Review`). Para que HU-13 y HU-23 tuvieran datos reales que mostrar (y no quedaran vacías para siempre, el mismo problema que tenía el dashboard de HU-22 antes de la Fase 2), se conectó la creación de notificaciones en los 4 puntos del ciclo de vida de una reserva donde la otra parte debe enterarse, y se agregó un endpoint mínimo para que el WSpacer deje una reseña sobre una reserva `completed` — el backlog original solo documentaba el lado del WSpacer+ ("ver reseñas recibidas"), no quién las crea. Las tres se probaron de punta a punta.

---

## Reglas de negocio confirmadas (referencia rápida — verificada contra código)

| Regla | Detalle | Verificado contra |
|---|---|---|
| Nombre de marca | WSPACE | `frontend/index.html`, `docs/GUIDE.md` |
| Roles | WSpacer (reserva) / WSpacer+ (publica) — misma cuenta puede tener ambos, `isHost` en `users` decide el modo. Cambiar de modo navega dentro de la misma pestaña (`data-link`) — 🔄 cambiada el 2026-07-17 a pedido del equipo, antes abría una pestaña nueva (`target="_blank"`) | `schema.prisma:User.isHost`, `navbar.js:renderProfileMenu` |
| Comisión WSpacer (guest) | `GUEST_FEE_RATE = 0.12` (12% del `basePrice`) + IVA `TAX_RATE = 0.19` sobre esa comisión | `bookingsController.ts:31-33` |
| Comisión WSpacer+ (host) | `HOST_FEE_RATE = 0.06` (6% del `basePrice`) + IVA 19% sobre esa comisión, deducido del `hostNet` | `bookingsController.ts:32,145-147` |
| Responsabilidad de IVA | WSPACE declara solo el IVA de su propia comisión; el IVA del alquiler es responsabilidad del WSpacer+ | Comentario en `bookingsController.ts:17-20`, aviso en `publish.taxNotice` (i18n) |
| Beneficio de bienvenida | Primera reserva (`freeBookingsUsed === 0`): se descuenta **1 hora** (`pricePerHour`) del `basePrice` antes de calcular comisiones | `applyFirstBookingDiscount()` en `bookingsController.ts:46-49` |
| Categorías de espacio | Enum de 5 valores: `private_office`, `meeting_room`, `coworking`, `creative_space`, `rehearsal_room` | `schema.prisma:SpaceCategory`, replicado en `spaceValidators.ts` y `utils.js:CATEGORY_LABELS` |
| Confirmación de reserva | Todas las reservas nacen en `pending_approval`, sin auto-confirmación por categoría | `bookingsController.createBooking:166` |
| Plazo de respuesta del WSpacer+ | `RESPONSE_WINDOW_HOURS = 24` | `bookingsController.ts:34,149` |
| Idioma | ES/EN con selector, diccionarios `i18n/es.json` / `i18n/en.json`, persistido en `localStorage` bajo `wspace_lang` | `i18n.js` |
| Fotos | Subida real vía Cloudinary, **directo desde el navegador** (el backend nunca recibe el archivo, solo la URL resultante vía `photos: z.array(z.string().url())`) | `frontend/js/core/upload.js`, `spaceValidators.ts:25` |
| Documentos de verificación (cédula/certificado bancario) | `PATCH /api/users/me/verification-documents` guarda `nationalId`/`nationalIdDocUrl`/`bankCertificateUrl`. Desde el 2026-07-17, publicar un espacio (`POST /api/spaces`) **exige** tener los tres guardados — sin ellos, `403`. Publicar sigue siendo lo que activa `isHost = true` (no cambió), solo que ahora requiere haber pasado primero por este paso | `usersController.submitVerificationDocuments()`, `spacesController.createSpace()` — ver `docs/resolved-bugs.md` bug #6 |
| Precio del espacio | Solo `pricePerHour` (Decimal), no hay precio por día | `schema.prisma:Space.pricePerHour` |
| Dirección | El modelo `Space` ni siquiera tiene un campo de dirección exacta — solo `city` y `neighborhood` | `schema.prisma:Space` |
| Duración de reserva | Sin mínimo/máximo: `hoursBetween()` solo exige que el resultado sea `> 0` | `bookingsController.ts:40-44,96` |
| Cancelación del WSpacer | No permitida con menos de `GUEST_CANCEL_MIN_HOURS_BEFORE = 12` horas de anticipación | `bookingsController.ts:35,249-253` |
| Cancelación del WSpacer+ | Si cancela con menos de `HOST_LATE_CANCEL_WINDOW_HOURS = 24` horas: multa `20%` al host (`host_penalty`) y compensación `10%` al guest (`guest_compensation`), dos filas en `booking_penalties` | `bookingsController.ts:36-38,289-297` |
| Espacio rechazado por admin | `rejectSpace` exige `reason` y deja `publicationStatus = 'rejected'`; no existe ningún endpoint para reabrirlo — el WSpacer+ debe crear una publicación nueva | `adminController.ts:45-60` |
| Pago | Pasarela 100% simulada, tasa de éxito del 95% (`Math.random() > 0.05`). 🔄 Cambio de regla el 2026-07-19: el pago ya **no** es un paso aparte — es obligatorio y ocurre dentro de `POST /api/bookings`; si falla, la reserva ni se crea. Ya no existe `POST /api/payments/simulate`. Si el host rechaza una reserva ya pagada, no hay reembolso automático — queda `rejected` con su `paymentReference` visible para que el guest pida un reembolso manual | `bookingsController.ts` (`simulatePaymentAttempt`, dentro de `createBooking`) — ver `docs/resolved-bugs.md`, bug #7 |
| Zona horaria | Asumida Colombia por producto. El código no hace conversión real de offset (no hay ninguna librería de zonas horarias), pero desde la Fase 3 sí es **consistente**: toda fecha+hora (reservas, bloqueos) se interpreta como los mismos dígitos literales sin importar en qué zona horaria corra el proceso de Node — antes dependía silenciosamente de la TZ del servidor y por eso tenía un bug real (ver `docs/resolved-bugs.md`, bug #4) | `combineDateAndTime()` en `bookingsController.ts`, `parseDateTimeLocalAsUTC()` en `blocksController.ts` |
| Seguridad | bcrypt (`cost 12`), JWT (`expiresIn: '2h'`), middleware `authMiddleware` + `requireAdmin` por rol (`systemRole`) | `authController.ts:62`, `authMiddleware.ts:45-75` |
| Suspensión de cuenta | El modelo tiene `accountStatus` (`"active"` / `"inactive"`) pero **no hay ningún endpoint ni chequeo en `login` que lo use** — campo muerto en la práctica | `schema.prisma:78`, ausente en `authController.login` — 🆕 gap no documentado antes |
| Reserva cumplida (`completed`) | Transición **manual**: el WSpacer+ la marca desde `PATCH /api/bookings/:id/complete` una vez ya pasó (`confirmed` + fecha/hora de fin ya transcurrida). No hay job automático — decisión de negocio confirmada con el equipo el 2026-07-17 | `bookingsController.completeBooking()` — 🆕 implementado en la Fase 2, antes no existía ninguna transición a `completed` |

---

## ROL: WSpacer (usuario que reserva)

### HU-01 — Registro de cuenta
**Como** visitante, **quiero** crear una cuenta con mis datos personales, **para** poder buscar y reservar espacios.
**Estado:** ✅ Completa.

**Campos:** nombre, apellido, correo, contraseña (mínimo 8 caracteres), confirmación de contraseña, teléfono (10 dígitos), checkbox único de aceptación de Términos y Política de Datos.

**Tareas:**
- [Frontend] `loginModal.js:renderRegisterTab` + `auth.js:validateRegisterForm` — validación en tiempo real de cada campo (correo con `isValidEmail`, longitud de contraseña, coincidencia con `confirmPassword`, teléfono con `isValidPhone`, checkbox `acceptTerms`).
- [Backend] `POST /api/auth/register` (`authController.register`), valida con `registerSchema` (zod), correo único (`findUnique` por `email`, en minúsculas), contraseña hasheada con `bcrypt.hash(password, 12)` antes de guardar.
- [BD] Tabla `users`: `id`, `firstName`, `lastName`, `email` (único), `passwordHash`, `phone`, `nationalId` (opcional, único), `nationalIdDocUrl` (opcional, sin uso todavía — ver HU-14), `bankCertificateUrl` (opcional, sin uso todavía), `systemRole`, `isHost`, `freeBookingsUsed`, `accountStatus` (sin uso — ver tabla de reglas), `acceptedDataPolicy`, `createdAt`.

*Nota de implementación: `register()` guarda `acceptedDataPolicy: true` de forma fija en vez de pasar el valor real de `acceptTerms` — en la práctica da igual porque el registro solo llega a ese punto si `acceptTerms` ya fue validado como `true`, pero vale la pena saberlo si se agrega algún flujo que permita registrar sin aceptar.*

### HU-02 — Inicio de sesión
**Como** usuario registrado, **quiero** iniciar sesión con correo y contraseña, **para** acceder a mi cuenta.
**Estado:** ✅ Completa.

**Tareas:**
- [Backend] `POST /api/auth/login` (`authController.login`), genera JWT con `signToken()`, expira en 2 horas (`expiresIn: '2h'`).
- [Frontend] `loginModal.js:renderLoginTab` — modal (no página aparte), `auth.js:loginUser` guarda `token` y `user` en `localStorage` (`wspace_token`, `wspace_user`) para compartir sesión entre pestañas.

### HU-03 — Cambiar entre modo WSpacer y modo WSpacer+
**Como** usuario con ambos roles, **quiero** un botón para cambiar de modo, **para** ver mi panel de anfitrión sin cerrar sesión.
**Estado:** ✅ Completa.

**Tareas:**
- [Frontend] `navbar.js:renderProfileMenu` — enlace en el menú de perfil (`data-link`) que navega a `/dashboard` o `/spaces` según el modo actual, dentro de la misma pestaña, reutilizando el token en `localStorage`.

🔄 **Cambio de regla de negocio (2026-07-17, a pedido del equipo):** hasta ahora este enlace abría siempre una pestaña nueva del navegador (`target="_blank"`), tal como especificaba el backlog original. Se cambió a navegación interna de la SPA (`data-link`, sin `target="_blank"`) porque, sirviendo el frontend con un servidor sin *fallback* de SPA configurado (ver `docs/resolved-bugs.md`, bug #2), abrir `/dashboard` en una pestaña nueva significa una carga completa desde cero — y sin ese fallback, el servidor devuelve un 404 real en vez de la aplicación. La navegación interna nunca depende de eso, porque el router de la SPA ya tiene la página cargada en memoria.
- **Trade-off aceptado:** ya no se puede tener la vista de WSpacer y la de WSpacer+ abiertas al mismo tiempo en pestañas separadas — cambiar de modo ahora reemplaza la pantalla actual. La sesión no se ve afectada de ninguna forma (el token sigue en `localStorage`, no atado a una pestaña).
- Probado de punta a punta en navegador: cambiar de modo en ambas direcciones (WSpacer → WSpacer+ y de vuelta) navega dentro de la misma pestaña, sin abrir ninguna pestaña nueva, y sin recargar la página completa.

### HU-04 — Cambiar idioma de la plataforma
**Como** usuario, **quiero** cambiar el idioma entre español e inglés, **para** usar la plataforma en el que prefiera.
**Estado:** ✅ Completa.

**Tareas:**
- [Frontend] `i18n.js:toggleLanguage` — botón ES/EN en `navbar.js`, carga `i18n/es.json` / `i18n/en.json` y aplica `applyTranslations()` sobre todo `[data-i18n]` y `[data-i18n-placeholder]`, sin recargar la página.
- [Frontend] Persistencia en `localStorage` (`wspace_lang`), con fallback a `'es'` en `initI18n()`.

### HU-05 — Buscar y filtrar espacios
**Como** WSpacer, **quiero** buscar espacios con filtros, **para** encontrar uno que se ajuste a mi necesidad.
**Estado:** ✅ Completa (corregida en la Fase 2 de implementación, 2026-07-17). Probada de punta a punta con `curl`: con una reserva `pending_approval` de 09:00 a 11:00 sobre un espacio, buscar `date=...&startTime=09:30` excluye ese espacio de los resultados; buscar `startTime=08:00` (fuera del rango) lo incluye.

**Filtros mostrados en el frontend:** ciudad/barrio (un campo de texto), categoría, fecha, hora de inicio (`home.js:renderSearchBar`, reflejados en la URL vía `buildUrlWithParams`).

**Tareas:**
- [Frontend] `spacesList.js` + `home.js:attachSearchBarEvents` — envía `{ city, type, date, startTime }` como query params a `GET /api/spaces` y los refleja en la URL. Sin cambios.
- [Backend] `GET /api/spaces` (`spacesController.searchSpaces`) — ahora, cuando llegan `date` **y** `startTime` juntos, aplica `buildAvailabilityFilter()`: excluye espacios con una reserva activa (`pending_approval`/`confirmed`) o un `SpaceBlock` que cubra exactamente ese instante.
- ⚠️ **Nota de diseño, no un bug:** la barra de búsqueda solo pide fecha + hora de inicio (no hora de fin, a diferencia del formulario de reserva), así que el filtro solo puede verificar "¿está libre este espacio *empezando* a esta hora?", no un rango completo de duración. Si más adelante se agrega un campo de "hora fin" a la búsqueda, `buildAvailabilityFilter()` tendría que ajustarse para comparar el rango completo (igual que `createBooking` ya hace).

### HU-06 — Ver detalle de un espacio
**Como** WSpacer, **quiero** ver el detalle completo de un espacio, **para** decidir si lo reservo.
**Estado:** ✅ Completa (corregida en la Fase 2 de implementación, 2026-07-17). Probada de punta a punta: espacio con 3 fotos muestra 3 miniaturas, hacer clic en cada una cambia la foto principal.

**Tareas:**
- [Frontend] `spaceDetail.js` — categoría, capacidad, barrio/ciudad, descripción, amenidades con ícono (lista truncada a 6 con botón "ver todas", `AMENITY_LABELS`/`AMENITIES_BY_CATEGORY` en `utils.js`).
- [Backend] `GET /api/spaces/:id` (`spacesController.getSpaceById`). Sin cambios.
- [Frontend] `spaceDetail.js:renderPhotoGallery()` — muestra `space.photos[0]` como foto principal (`#gallery-hero`) y, si hay más de una foto, una fila de miniaturas debajo; hacer clic en una miniatura cambia la foto principal sin recargar. Si el espacio no tiene fotos, usa el mismo placeholder que ya se usaba antes.

### HU-07 — Reservar un espacio con calculadora de precio en vivo
**Como** WSpacer, **quiero** elegir fecha y horario, y ver el precio total (incluyendo la comisión de WSPACE y el IVA) antes de confirmar, **para** saber exactamente cuánto voy a pagar.
**Estado:** ✅ Completa.

**Desglose mostrado:** `basePrice` (precio/hora × horas, con el descuento de bienvenida ya aplicado si corresponde) + `guestFee` (12%) + `guestFeeTax` (19% sobre `guestFee`) = `total`.

**Tareas:**
- [Frontend] `spaceDetail.js:renderBookingPanel` — inputs de fecha/hora inicio/fin, recalcula con `calculateBookingPrice()` en cada cambio (`input` en ambos campos), sin recargar.
- [Backend] `POST /api/bookings` (`bookingsController.createBooking`) — doble validación de solapamiento: contra `booking` activos (`pending_approval`/`confirmed`, comparando `startTime`/`endTime` en ambos extremos) y contra `spaceBlock` (bloqueos manuales del host).
- [Backend] Toda reserva nace `pending_approval`, ninguna se autoconfirma.
- [Backend] Si `freeBookingsUsed === 0`, descuenta 1 hora del `basePrice` (`applyFirstBookingDiscount`) y luego incrementa el contador.
- [BD] Tabla `bookings`: `basePrice`, `guestFee`, `guestFeeTax`, `hostFee`, `hostFeeTax`, `total`, `hostNet`, `usedFreeBooking`, `status`, `responseDeadline`, `paymentReference` — coincide exactamente con el modelo real.

### HU-08 — Ver estado de mi solicitud
**Como** WSpacer, **quiero** ver si mi solicitud está pendiente, confirmada o rechazada, y cuánto tiempo le queda al anfitrión para responder, **para** saber si debo esperar o buscar otra opción.
**Estado:** ✅ Completa (conectada en la Fase 1 de implementación, 2026-07-17). Probada de punta a punta: reserva pendiente de Ana en `/my-bookings` muestra "Tiempo restante para respuesta: 23h 59m", actualizándose solo.

**Tareas:**
- [Backend] `mapBooking()` en `bookingsController.ts` expone `status` y `responseDeadline` en toda respuesta de reserva. Sin cambios.
- [Frontend] `myBookings.js:renderBookingRow` muestra la etiqueta de estado (`statusLabels`) y, si `status === 'pending_approval'`, un contador (`#countdown-{id}`).
- [Frontend] `myBookings.js:attachDeadlineCountdowns()` / `startCountdown()` — arranca un contador por cada reserva pendiente, que se recalcula cada minuto con `utils.js:formatTimeRemaining()` y se detiene solo cuando su elemento ya no está en pantalla (evita temporizadores huérfanos al navegar a otra vista). Si el plazo ya venció, muestra "Plazo vencido" en vez de un número negativo — recordar que no hay job que auto-rechace la solicitud (ver HU-19), así que una reserva puede quedar "vencida" indefinidamente hasta que el host responda.

### HU-09 — Pagar una reserva al solicitarla
**Como** WSpacer, **quiero** que mi reserva quede pagada al solicitarla, **para** garantizar mi lugar mientras espero la aprobación del anfitrión.
**Estado:** ✅ Completa. 🔄 **Redefinida el 2026-07-19** — ya no es "pagar una reserva aprobada" (ese enunciado quedó obsoleto): ahora el pago ocurre al solicitar, no después de la aprobación. Decisión de negocio explícita: el dinero queda "retenido" (nunca se cuenta en el dashboard de ingresos del host hasta que la reserva llega a `completed`, ver HU-22), y si el host rechaza, no hay reembolso automático — es una simplificación intencional, no un gap.

**Tareas:**
- [Backend] `POST /api/bookings` (`bookingsController.createBooking`) — corre `simulatePaymentAttempt()` (95% de éxito simulado) antes de crear la reserva; si el pago falla, no se crea nada y el guest recibe `402`. Si tiene éxito, la reserva nace `pending_approval` con `paymentReference` ya asignado. Ya no existe `POST /api/payments/simulate` como endpoint aparte — ver `docs/resolved-bugs.md`, bug #7, para el porqué de este cambio (corrigió una inconsistencia real: antes, pagar por separado podía confirmar una reserva sin que el host la hubiera aprobado).
- [Frontend] `spaceDetail.js` — el botón para solicitar reserva ahora dice "Pagar y reservar" (antes "Solicitar reserva"), y el toast de éxito lo refleja ("Pago realizado. Solicitud enviada..."). `myBookings.js` ya no tiene botón de pago aparte; en su lugar muestra la referencia de pago (`booking.paymentReference`) en cualquier reserva que la tenga, incluidas las `rejected`, para que el guest la use si necesita pedir un reembolso manual.

### HU-10 — Ver historial de reservas
**Como** WSpacer, **quiero** ver todas mis reservas pasadas y futuras, **para** hacer seguimiento.
**Estado:** ✅ Completa.

**Tareas:**
- [Backend] `GET /api/bookings/mine` (`bookingsController.getMyBookings`).
- [Frontend] `myBookings.js` — listado con estado visual de cada una.

### HU-11 — Cancelar una reserva
**Como** WSpacer, **quiero** cancelar una reserva confirmada, **para** liberar el espacio si cambian mis planes.
**Estado:** ✅ Completa.

**Regla:** no permitida con menos de 12 horas de anticipación (`GUEST_CANCEL_MIN_HOURS_BEFORE`).

**Tareas:**
- [Backend] `PATCH /api/bookings/:id/cancel` (`bookingsController.cancelBooking`), valida la ventana contra `combineDateAndTime(booking.date, booking.startTime)`.
- [Frontend] Botón "Cancelar reserva" en `myBookings.js` (visible si `status === 'confirmed'`).

### HU-12 — Guardar espacios como favoritos
**Como** WSpacer, **quiero** marcar espacios como favoritos, **para** encontrarlos fácilmente después.
**Estado:** ✅ Completa (construida en la Fase 4 de implementación, 2026-07-17). Probada de punta a punta: agregar/quitar por `curl` (incluyendo que sea idempotente), y en navegador — el corazón cambia de contorno a relleno al hacer clic, la vista `/favorites` muestra las tarjetas guardadas, y quitar un favorito ahí lo hace desaparecer de la lista al instante.

**Tareas:**
- [BD] Modelo `Favorite` nuevo (`favorites`): `userId` + `spaceId` únicos juntos (`@@unique([userId, spaceId])`), para que no pueda existir el mismo favorito dos veces.
- [Backend] `favoritesController.ts` (nuevo): `GET /api/favorites` (lista, reutiliza `mapSpace()` de `spacesController.ts`, ahora exportado), `POST /api/favorites` (agrega — idempotente vía `upsert`, no falla si ya estaba favorito), `DELETE /api/favorites/:spaceId` (quita — también idempotente vía `deleteMany`). Montadas en `server.ts` bajo `/api/favorites`.
- [Frontend] `spaceCard.js:renderSpaceCard()` ahora recibe un segundo parámetro opcional `isFavorited` y dibuja un botón de corazón (contorno/relleno) posicionado sobre la tarjeta — separado del `<a>` que lleva al detalle, para que el clic en el corazón no dispare la navegación. `attachFavoriteToggleEvents()` / `markFavoritedCardsIfLoggedIn()` (nuevas) conectan el toggle y pintan el estado inicial correcto en `home.js` y `spacesList.js`.
- [Frontend] `favorites.js` reescrito — ya no es un placeholder, lista los espacios favoritos reales con el mismo `spaceCard`.
- ⚠️ **Bug corregido en el camino, no relacionado con esta historia:** varias vistas llamaban `array.map(renderSpaceCard)` directamente. Como `Array.map` pasa el índice como segundo argumento, y `renderSpaceCard` ahora usa un segundo parámetro (`isFavorited`), eso habría marcado como favorita cualquier tarjeta en una posición distinta de `0` (índice `1`, `2`... son *truthy*). Se corrigió a `array.map((s) => renderSpaceCard(s))` en `home.js` y `spacesList.js`.

### HU-13 — Recibir notificaciones
**Como** usuario, **quiero** recibir notificaciones sobre el estado de mis solicitudes y reservas, **para** enterarme sin tener que revisar manualmente cada sección.
**Estado:** ✅ Completa (construida en la Fase 4 de implementación, 2026-07-17). Solo en la app — sin correo, push ni WebSockets (sigue fuera de alcance, ver "Historias fuera de alcance"). Probada de punta a punta: crear una reserva genera la notificación al anfitrión en tiempo real (verificado consultando `GET /api/notifications` justo después), visible en `/notifications` con su botón de marcar como leída.

**Tareas:**
- [BD] Modelo `Notification` nuevo (`notifications`): `type` (enum `booking_requested`/`booking_confirmed`/`booking_rejected`/`booking_cancelled`), `message`, `read`.
- [Backend] `notificationsController.ts` (nuevo): `notify(userId, type, message)` — no es un endpoint, es un helper que otros controllers llaman directo. `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`. Montadas bajo `/api/notifications`.
- [Backend] `bookingsController.ts` ahora llama `notify()` en los 4 puntos donde la otra parte debe enterarse: `createBooking` → notifica al host (`booking_requested`); `respondBooking` → notifica al guest (`booking_confirmed`/`booking_rejected`); `cancelBooking` (cancela el guest) → notifica al host (`booking_cancelled`); `hostCancelBooking` → notifica al guest (`booking_cancelled`). Sin esto, la tabla habría quedado vacía para siempre, igual que le pasaba a `completed` antes de la Fase 2 (ver HU-22).
- [Frontend] `notifications.js` reescrito — lista real con badge por tipo, botón individual de "marcar como leída" y uno de "marcar todas".

---

## ROL: WSpacer+ (usuario que publica espacios)

### HU-14 — Solicitar el rol de WSpacer+
**Como** WSpacer, **quiero** enviar mi cédula y un certificado bancario, **para** habilitar la publicación de espacios y el cobro de reservas.
**Estado:** ✅ Completa (construida en la Fase 3 de implementación, 2026-07-17). Probada de punta a punta contra el backend real (la carga a Cloudinary en sí no se pudo probar en este entorno porque `upload.js` sigue usando `CLOUDINARY_CLOUD_NAME = 'TU_CLOUD_NAME'` — un placeholder que ya existía, no algo agregado ahora; ver nota abajo).

**Tareas:**
- [Backend] `PATCH /api/users/me/verification-documents` (`usersController.submitVerificationDocuments`, nuevo, montado en `server.ts` bajo `/api/users`), valida con `verificationDocumentsSchema` (zod: `nationalId` mínimo 5 caracteres, `nationalIdDocUrl`/`bankCertificateUrl` como URLs), guarda los tres campos en el usuario logueado.
- [Frontend] `verificationDocuments.js` (vista nueva, ruta `/verification-documents`) — un campo de texto para el número de cédula y dos `<input type="file">` conectados a `upload.js:attachFileUploader` (el mismo patrón que ya usa `publishSpace.js` para las fotos del espacio), con validación de que los dos archivos hayan terminado de subirse antes de habilitar el envío. Enlazada desde `/profile`.
- ✅ **Decisión de negocio resuelta (confirmada con el equipo el 2026-07-17):** publicar un espacio, incluso el primero, **sí exige** tener estos documentos guardados. `spacesController.createSpace` rechaza con `403` si falta `nationalId`, `nationalIdDocUrl` o `bankCertificateUrl`; `authController.mapUser()` expone `hasVerificationDocuments` en el login para que `publishSpace.js` muestre un aviso en vez del formulario si aún faltan. Ver `docs/resolved-bugs.md`, bug #6, para el detalle completo (incluye por qué se le agregaron documentos de prueba a Carlos en `seed.ts`).
- *Nota:* `upload.js` sigue teniendo `CLOUDINARY_CLOUD_NAME = 'TU_CLOUD_NAME'` como placeholder — es una limitación preexistente (ya la tenía `publishSpace.js` para las fotos), no algo que esta historia haya introducido. Sin una cuenta real de Cloudinary configurada, la subida de archivos no puede probarse de punta a punta en ningún flujo del proyecto, este incluido.

### HU-15 — Publicar un espacio con calculadora de ingresos en vivo
**Como** WSpacer+, **quiero** registrar un espacio nuevo y ver cuánto voy a recibir neto mientras defino el precio, **para** tomar una decisión de precio informada.
**Estado:** ✅ Completa.

**Campos:** `name`, `type` (enum de 5: `private_office`, `meeting_room`, `coworking`, `creative_space`, `rehearsal_room`), `city`, `neighborhood`, `capacity`, `pricePerHour` (mínimo 1000), `description` (opcional), `photos` (URLs de Cloudinary), `amenities` (lista dependiente de la categoría vía `AMENITIES_BY_CATEGORY`).

**Tareas:**
- [Frontend] `publishSpace.js:updatePriceCalculator` — recalcula en vivo con cada tecla en el campo de precio: lo que pagaría el WSpacer (base + 12% + IVA) y lo que recibe neto el WSpacer+ (base − 6% − IVA).
- [Backend] `POST /api/spaces` (`spacesController.createSpace`), validado con `createSpaceSchema`; el espacio nace `pending_approval`. Crea/reutiliza amenidades por nombre (`prisma.amenity.upsert`).
- [BD] `spaces` (con `type` como enum de 5 valores), `space_photos`, `amenities`, `space_amenity` — normalizado, coincide con el modelo real.
- 🆕 **Precondición agregada el 2026-07-17 (ver HU-14):** `createSpace` ahora exige que el usuario ya tenga sus documentos de verificación guardados; `publishSpace.js` muestra un aviso con enlace a `/verification-documents` en vez del formulario si todavía faltan.

### HU-16 — Editar o desactivar temporalmente un espacio
**Como** WSpacer+, **quiero** editar los datos de mi espacio o desactivarlo temporalmente, **para** mantenerlo actualizado o pausarlo sin borrarlo.
**Estado:** ✅ Completa (conectada en la Fase 1 de implementación, 2026-07-17). Probada de punta a punta: editar el precio de un espacio de Carlos vía `/my-spaces/1/edit` y verificar que el nuevo precio se refleja en `/my-spaces`; desactivar un espacio y verificar que su badge cambia a "Inactivo".

**Tareas:**
- [Backend] `PATCH /api/spaces/:id` (`spacesController.updateSpace`) y `PATCH /api/spaces/:id/toggle-active` (`spacesController.toggleActive`), ambos verifican `existing.ownerId !== req.user.id` antes de permitir el cambio. Sin cambios de lógica; solo se agregaron `active`, `publicationStatus` y `rejectionReason` al `mapSpace()` compartido, para que el dueño pueda ver el estado real de su espacio (antes esos tres campos ni siquiera se devolvían al frontend).
- [Frontend] `api.js:updateSpace()` / `api.js:toggleSpaceActive()` — nuevas funciones que llaman a los dos endpoints de arriba.
- [Frontend] `mySpaces.js:renderMySpaceCard()` — tarjeta propia del dueño (separada de la pública `spaceCard.js`) con badges de estado (`Aprobado`/`Pendiente de aprobación`/`Rechazado`, `Activo`/`Inactivo`) y botones "Editar" / "Activar"·"Desactivar".
- [Frontend] `editSpace.js` (vista nueva) + ruta `/my-spaces/:id/edit` registrada en `app.js` — formulario precargado con los datos actuales, valida que `space.ownerId` sea el usuario logueado antes de mostrarlo, y guarda con `updateSpace()`. Solo edita los campos que el backend realmente persiste (`name`, `type`, `city`, `neighborhood`, `capacity`, `pricePerHour`, `description`) — el endpoint no toca fotos ni amenidades todavía, así que el formulario tampoco las ofrece para no prometer algo que no se guarda.

### HU-17 — Configurar disponibilidad
**Como** WSpacer+, **quiero** bloquear fechas u horarios específicos, **para** evitar reservas cuando el espacio no está disponible.
**Estado:** ✅ Completa (backend y frontend construidos desde cero en la Fase 3 de implementación, 2026-07-17). Probada de punta a punta, incluyendo el caso que importa de verdad: un bloqueo creado desde la vista efectivamente hace que `POST /api/bookings` rechace una reserva que caiga dentro de esa ventana (`"El anfitrión bloqueó ese horario"`), y que `GET /api/spaces` (HU-05) excluya el espacio al buscar en ese horario.

**Tareas:**
- [Backend] `blocksController.ts` (nuevo): `GET /api/spaces/:id/blocks` (lista, solo el dueño), `POST /api/spaces/:id/blocks` (crea, valida con `createBlockSchema` que `endDate` sea posterior a `startDate`), `DELETE /api/spaces/:id/blocks/:blockId` — las tres restringidas al dueño del espacio (`assertOwnsSpace`), registradas en `routes/spaces.ts`.
- [Frontend] `spaceAvailability.js` reescrito por completo — formulario con `Desde`/`Hasta` (`<input type="datetime-local">`) y motivo opcional, lista de bloqueos existentes con botón "Eliminar" en cada uno. Enlazada desde `mySpaces.js` con un botón "Disponibilidad" por espacio (antes no existía ningún punto de entrada a esta vista, aunque la ruta ya estaba registrada).
- [Frontend] `api.js:fetchSpaceBlocks()` / `createSpaceBlock()` / `deleteSpaceBlock()` — nuevas funciones.
- ⚠️ **Bug encontrado y corregido en el camino:** el primer intento de esta historia reveló un bug de zona horaria preexistente que desfasaba un día completo el cálculo de fecha+hora en `bookingsController.ts` (afectaba también HU-11, HU-20 y HU-22) — ver `docs/resolved-bugs.md`, bug #4.

### HU-18 — Publicación pendiente de aprobación del admin
**Como** WSpacer+, **quiero** que mi espacio nuevo quede visible solo tras la aprobación del admin, **para** cumplir el estándar de calidad de la plataforma.
**Estado:** ✅ Completa.

**Tareas:**
- [Backend] `searchSpaces` solo devuelve espacios con `publicationStatus: 'approved'` y `active: true` (`spacesController.ts:60-62`).

### HU-19 — Aprobar o rechazar solicitudes de reserva
**Como** WSpacer+, **quiero** aprobar o rechazar cada solicitud dentro de un plazo, **para** decidir quién accede a mi espacio.
**Estado:** ⚠️ Parcial — endpoint y vista completos, el job automático sigue sin existir.

**Regla:** 24 horas para responder (`RESPONSE_WINDOW_HOURS`).

**Tareas:**
- [Backend] `PATCH /api/bookings/:id/respond` (`bookingsController.respondBooking`), body `{ status: 'confirmed' | 'rejected' }`, valida que el solicitante sea el dueño del espacio.
- [Frontend] `hostBookings.js` — panel de solicitudes con botones "Aprobar"/"Rechazar", visibles solo si `status === 'pending_approval'`.
- ⚠️ **Confirmado que sigue sin existir:** no hay ninguna dependencia de cron/scheduler en `package.json` (no hay `node-cron`, `node-schedule`, etc.) ni ningún archivo de job en el proyecto. El auto-rechazo de solicitudes vencidas a las 24 horas no está implementado — una solicitud vencida se queda `pending_approval` indefinidamente hasta que el host responda manualmente.

### HU-20 — Cancelar una reserva confirmada
**Como** WSpacer+, **quiero** poder cancelar una reserva confirmada ante un imprevisto, **para** liberar el espacio cuando sea necesario.
**Estado:** ✅ Completa (conectada en la Fase 1 de implementación, 2026-07-17). Probada de punta a punta: reserva creada por Ana, aprobada por Carlos, cancelada por Carlos desde `/my-spaces/bookings` — el estado pasa a `cancelled_by_host` y el botón desaparece de la tarjeta.

**Regla:** si cancela con menos de 24 horas de anticipación (`HOST_LATE_CANCEL_WINDOW_HOURS`), multa del 20% al WSpacer+ y compensación del 10% al WSpacer. Regla sin tocar, solo se conectó el botón.

**Tareas:**
- [Backend] `PATCH /api/bookings/:id/host-cancel` (`bookingsController.hostCancelBooking`) — calcula la ventana, y si aplica, registra dos filas en `booking_penalties` dentro de una transacción (`prisma.$transaction`): una `host_penalty` (20% del `total`) y una `guest_compensation` (10% del `total`). Sin cambios.
- [Frontend] `api.js:hostCancelBooking()` — nueva función que llama al endpoint de arriba.
- [Frontend] `hostBookings.js` — botón "Cancelar reserva" visible solo si `status === 'confirmed'`; al hacer clic, muestra un toast distinto según `latePenaltyApplied` (con o sin aviso de multa/compensación) para que el host sepa si aplicó la penalización de la ventana de 24h.

### HU-21 — Ver reservas recibidas
**Como** WSpacer+, **quiero** ver todas las reservas de mis espacios, **para** gestionar mi ocupación.
**Estado:** ✅ Completa.

**Tareas:**
- [Backend] `GET /api/bookings/host` (`bookingsController.getHostBookings`).
- [Frontend] `hostBookings.js`.

### HU-22 — Ver panel de ingresos (dashboard)
**Como** WSpacer+, **quiero** ver un resumen de espacios publicados, solicitudes pendientes e ingresos, **para** entender mi actividad como anfitrión de un vistazo.
**Estado:** ✅ Completa (corregida en la Fase 2 de implementación, 2026-07-17). Probada de punta a punta: reserva confirmada con fecha pasada → botón "Marcar como cumplida" → dashboard pasa de $0 a mostrar el `hostNet` real de esa reserva.

**Tareas:**
- [Frontend] `dashboard.js` — 3 métricas: espacios publicados (`fetchMySpaces().length`), reservas pendientes (`bookings.filter(status === 'pending_approval').length`), e ingresos históricos (`bookings.filter(status === 'completed').reduce(...hostNet)`). Sin cambios — ya esperaba reservas `completed`, solo que nada las producía.
- [Backend] **Decisión de negocio confirmada con el equipo (2026-07-17): la transición a `completed` es manual, la hace el WSpacer+**, no un job automático. Nuevo endpoint `PATCH /api/bookings/:id/complete` (`bookingsController.completeBooking`): exige que quien llama sea el dueño del espacio, que la reserva esté `confirmed`, y que `date`+`endTime` ya hayan pasado (`combineDateAndTime(booking.date, booking.endTime) <= now`) — no se puede marcar como cumplida una reserva que todavía no ocurrió.
- [Frontend] `api.js:completeBooking()` + botón "Marcar como cumplida" en `hostBookings.js`, visible solo si la reserva está `confirmed` **y** ya pasó su hora de fin (`utils.js:isPastDateTime()`), para no ofrecer una acción que el backend igual rechazaría.

### HU-23 — Ver reseñas recibidas
**Como** WSpacer+, **quiero** ver las calificaciones y comentarios que han dejado sobre mis espacios, **para** entender cómo se percibe mi servicio.
**Estado:** ✅ Completa (construida en la Fase 4 de implementación, 2026-07-17). Probada de punta a punta: reserva completada → Ana deja una reseña de 5 estrellas con comentario → aparece en `/my-spaces/reviews` de Carlos con el nombre del huésped, la fecha y el comentario; intentar reseñar la misma reserva dos veces se rechaza (`409`).

**Tareas:**
- [BD] Modelo `Review` nuevo (`reviews`): `bookingId` único (una reseña por reserva, no por espacio en general — así un huésped solo puede reseñar una reserva que de verdad tuvo), `rating` (1-5), `comment` opcional.
- [Backend] `reviewsController.ts` (nuevo): `listHostReviews()` — `GET /api/reviews/host`, todas las reseñas de los espacios del usuario logueado. `createReview()` — `POST /api/bookings/:id/review`, exige que la reserva sea del usuario que llama, que esté `completed`, y que no exista ya una reseña para esa reserva (`409` si ya existe).
- [Frontend] `hostReviews.js` reescrito — lista real con nombre del espacio, estrellas (`★`/`☆`), nombre del huésped, fecha y comentario.
- 🆕 **Pieza agregada que no estaba en el backlog original, necesaria para que esta historia funcionara de verdad:** el backlog solo documentaba el lado del WSpacer+ ("ver reseñas recibidas"); no había ninguna historia para que el WSpacer *dejara* una reseña. Sin eso, esta vista habría quedado vacía para siempre — mismo problema que tenía el dashboard de ingresos antes de la Fase 2. Se agregó un formulario compacto (calificación + comentario opcional) en `myBookings.js`, visible solo en reservas `completed` sin reseña todavía (`booking.hasReview`, nuevo campo en `bookingsController.mapBooking()`).

---

## ROL: ADMINISTRADOR

*Actualizado en la Fase 3 de implementación (2026-07-17): las 3 historias están completas — se construyó el panel de administración que faltaba en el frontend, la brecha más grande del proyecto hasta este punto.*

### HU-24 — Revisar espacios pendientes
**Estado:** ✅ Completa.
**Tareas:** `GET /api/admin/spaces/pending` (`adminController.listPendingSpaces`), protegido con `authMiddleware` + `requireAdmin` (exige `req.user.role === 'admin'`). Devuelve los espacios `pending_approval` con datos del dueño (`firstName`, `lastName`, `email`). [Frontend] `adminSpaces.js` (vista nueva, ruta `/admin/spaces`) lista cada espacio pendiente con foto, categoría, ubicación, precio y datos del dueño.

### HU-25 — Aprobar publicación
**Estado:** ✅ Completa.
**Tareas:** `PATCH /api/admin/spaces/:id/approve` (`adminController.approveSpace`) — pone `publicationStatus: 'approved'` y limpia `rejectionReason`. [Frontend] botón "Aprobar" en `adminSpaces.js`, refresca la lista al confirmar.

### HU-26 — Rechazar publicación con motivo
**Estado:** ✅ Completa.
**Tareas:** `PATCH /api/admin/spaces/:id/reject` (`adminController.rejectSpace`) — exige `reason` no vacío (si falta, `400`), pone `publicationStatus: 'rejected'` guardando el motivo. La publicación rechazada no tiene forma de reabrirse (no hay endpoint que la regrese a `pending_approval`); el WSpacer+ debe crear una nueva. [Frontend] campo de texto + botón "Rechazar" en `adminSpaces.js`, con validación en el cliente que impide enviar sin motivo (además de la validación del backend).

**Tareas transversales que hicieron falta para que el panel funcionara:**
- [Backend] `authController.mapUser()` **nunca exponía `systemRole`** en la respuesta de login — el frontend no tenía ninguna forma de saber si el usuario logueado era admin. Se agregó `systemRole: user.systemRole` a la respuesta.
- [Frontend] `auth.js:isAdmin()` / `requireAdminRole()` (nuevas, mismo patrón que `isHost()`/`requireHostRole()`).
- [Frontend] `navbar.js:renderProfileMenu` — nuevo enlace "Panel de administración" en el menú de perfil, visible solo si `user.systemRole === 'admin'`.

✅ **Ya no es la brecha más grande:** los 3 endpoints ya se pueden usar desde `/admin/spaces` con la cuenta sembrada `admin@wspace.com`. Probado de punta a punta: publicar un espacio nuevo → verlo en el panel de admin → rechazarlo con motivo (y confirmar que el motivo se guardó) → publicar otro → aprobarlo → confirmar que pasa a estar visible en la búsqueda pública.

---

## Historias fuera de alcance / futuro documentado

Confirmado en `docs/GUIDE.md` sección 3 y 6 — sin cambios respecto a la versión anterior:

- Login con Google (OAuth).
- Recuperación de contraseña por correo.
- Integración real con una pasarela de pago (ePayco u otra) — actualmente 100% simulada.
- Notificaciones en tiempo real (WebSockets).
- Chat interno ligado a una reserva específica.
- Motor de impuestos completo (retenciones, facturación electrónica DIAN).

---

## Reglas de negocio transversales (verificadas)

### Cálculo de comisiones e IVA
- [Backend] Servicio de cálculo dentro de `bookingsController.createBooking`: 12%+IVA (guest) y 6%+IVA (host), calculado y **guardado** en la reserva al crearla — no se recalcula después aunque cambien las constantes (`GUEST_FEE_RATE`, `HOST_FEE_RATE`, `TAX_RATE`) más adelante. No es un "servicio central" reutilizable ni un archivo separado — las constantes y la lógica viven directamente en `bookingsController.ts`; si se necesita el mismo cálculo en otro lugar (p. ej. para agregar el filtro de disponibilidad en `searchSpaces`, o para reportes de admin), hoy tocaría duplicarlo.
- [Backend] Contador `freeBookingsUsed` en `users`, incrementado solo en la primera reserva.

### Autenticación y protección de rutas
- [Backend] `authMiddleware` (verifica JWT) + `requireAdmin` (verifica `role === 'admin'`) — se aplican por grupo de rutas (`router.use(authMiddleware, requireAdmin)` en `admin.ts`, o por ruta individual en `spaces.ts`/`bookings.ts`).

### Internacionalización
- [Frontend] `i18n/es.json` / `i18n/en.json`, selector persistido en `localStorage`.

### Responsive
- [Frontend] Variables CSS centralizadas en `frontend/css/variables.css` (tipografía Montserrat, colores teal `#0f6e56` / magenta `#a55086`, confirmado contra `docs/GUIDE.md` sección 3).

---

## Resumen de historias por prioridad (actualizado tras Fase 4 de implementación, 2026-07-17)

**Completas (✅):** HU-01 a HU-18, HU-20 a HU-26 — es decir, **todas las 26 historias del backlog original excepto una**.
**Parcial — funciona pero con un gap real de lógica (⚠️):** HU-19 (aprobar/rechazar solicitudes) — el endpoint y la vista están completos y probados; solo falta el job de auto-rechazo a las 24h, que nunca se pidió explícitamente en ninguna de las cuatro fases de esta implementación.

Con la Fase 4, las tres historias "Could have" que quedaban (HU-12 favoritos, HU-13 notificaciones, HU-23 reseñas) también quedaron completas y probadas de punta a punta — ninguna tenía tabla, endpoint ni frontend real antes de esta sesión. Todas las historias **Must have** y **Should have** ya estaban completas desde la Fase 3.

**Bugs encontrados y corregidos en el camino (documentados en `docs/resolved-bugs.md`):**
- Bug #3 — `respondBooking` no validaba el estado de la reserva antes de transicionarla (permitía revivir una reserva ya cancelada).
- Bug #4 — `combineDateAndTime` desfasaba un día completo el cálculo de fecha+hora dependiendo de la zona horaria del servidor (afectaba HU-11, HU-17, HU-20, HU-22).
- Bug #5 — el mensaje de error de "valor duplicado" mostraba `undefined` en vez del campo real, por un cambio en la forma del error de Prisma 7 con el driver adapter `@prisma/adapter-pg`.
- Bug #6 — `createSpace` no exigía tener los documentos de verificación de HU-14 antes de publicar. A diferencia de los otros, este no era un defecto de código preexistente — era la decisión de negocio que HU-14 había dejado explícitamente pendiente en la Fase 3; el equipo la resolvió el mismo día (publicar sí debe exigirlo) y se implementó de inmediato.

**Lo único que queda pendiente en todo el proyecto** es el job de auto-rechazo de HU-19 — una tarea automatizada (cron/scheduler) que ninguna de las cuatro fases de esta implementación tocó porque nunca se pidió explícitamente.
