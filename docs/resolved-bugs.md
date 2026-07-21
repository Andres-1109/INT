# WSPACE — Bugs resueltos

Este documento registra bugs preexistentes que se encontraron y corrigieron mientras se implementaba el backlog (ver `docs/WSPACE_Backlog_Detallado.md`), pero que **no son específicos de ninguna historia de usuario** — son fallas de infraestructura, tipado o lógica de estados que afectaban al proyecto de forma transversal, no una funcionalidad nueva que faltara construir. Se documentan aparte para no mezclar "trabajo de negocio" con "arreglos técnicos", siguiendo el mismo criterio que ya usa `docs/GUIDE.md` en su sección 5 ("What changed in the merge").

---

## 1. Tipo `BookingWithRelations` roto contra Prisma Client v7.8.0

**Dónde:** `backend/src/controllers/bookingsController.ts`

**Síntoma:** `npx tsc --noEmit` fallaba con varios errores en `bookingsController.ts`, entre ellos:

```
error TS2344: Type '{ include: {...} }' does not satisfy the constraint 'BookingFindUniqueArgs<DefaultArgs>'.
  Property 'where' is missing...
error TS2551: Property 'space' does not exist on type '{...}'. Did you mean 'spaceId'?
```

**Causa:** el código extraía el tipo de una reserva con sus relaciones usando este patrón:

```ts
type BookingWithRelations = NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique<{ include: typeof BOOKING_INCLUDE }>>>>;
```

Es decir, pasarle un tipo genérico directamente a `findUnique<...>()` sin invocar el método con argumentos reales, apoyándose en cómo Prisma resuelve el *overload* del método. Esto es un patrón conocido pero frágil: dejó de resolver correctamente con los tipos que genera Prisma Client v7.8.0 (la versión realmente instalada vía `npm install`, ver `package.json`), y TypeScript terminaba infiriendo el tipo por defecto (`BookingFindUniqueArgs<DefaultArgs>`) en vez del tipo real con las relaciones incluidas.

**Cómo se detectó:** no por revisar el código a propósito, sino al correr `npx tsc --noEmit` por primera vez con `node_modules` instalado y el cliente de Prisma generado — algo que, a juzgar por el estado del repo (sin `node_modules`, sin `.env`), nadie había podido ejecutar de punta a punta hasta ahora.

**Corrección:** se reemplazó el patrón frágil por la forma estándar y documentada de Prisma para este caso, `Prisma.XGetPayload<...>`:

```ts
import type { Prisma } from '@prisma/client';
// ...
type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;
```

**Impacto:** ninguno en tiempo de ejecución — es un cambio puramente de tipos, `mapBooking()` y el resto de la lógica de negocio de reservas no se tocaron. Antes de este fix, el archivo funcionaba igual en runtime (JavaScript no valida tipos), pero cualquier build con `tsc` en modo estricto (por ejemplo en CI) habría fallado.

---

## 2. Rutas relativas rompían la app al entrar directo a cualquier vista anidada

**Dónde:** `frontend/index.html`, `frontend/js/core/i18n.js`, `frontend/js/components/navbar.js`, `frontend/js/views/home.js`

**Síntoma:** al navegar directamente a una URL con más de un segmento (por ejemplo `/space/2` o la nueva `/my-spaces/1/edit` construida en la Fase 1), la página cargaba completamente en blanco — sin navbar, sin footer, sin ningún error visible en consola.

**Causa:** el proyecto es una SPA con *routing* real (`history.pushState`, sin `#`), como explica el propio comentario en `router.js`. Pero `index.html` cargaba todos sus `<script>` y `<link>` con rutas **relativas** (`js/core/i18n.js`, `css/styles.css`, `photos/logo.png`), igual que `i18n.js` (`fetch('i18n/${lang}.json')`), `navbar.js` (`src="photos/logo.png"`) y `home.js` (`slide.src = 'photos/promo...'`).

Una ruta relativa se resuelve contra la URL actual del documento, no contra la raíz del sitio. Si el navegador carga la página completa estando en `/`, `js/core/i18n.js` resuelve correctamente a `/js/core/i18n.js`. Pero si el navegador carga la página completa estando en `/my-spaces/1/edit` (por ejemplo, porque alguien pega ese link, lo agrega a favoritos, o simplemente refresca la página con F5 mientras está ahí), ese mismo `js/core/i18n.js` resuelve a `/my-spaces/1/js/core/i18n.js` — una ruta que no existe. Con un servidor estático configurado para SPA (como `serve -s`, que responde con el HTML de `index.html` ante cualquier ruta no encontrada — configuración que el propio `router.js` pide explícitamente en su comentario), esa petición no da 404: devuelve el HTML de `index.html`, pero con `Content-Type` de una página, no de un script. El navegador intenta parsear ese HTML como JavaScript y falla silenciosamente en cada uno de los ~25 `<script>` de la aplicación, así que ninguno llega a ejecutarse — de ahí la pantalla en blanco sin errores visibles.

**Por qué no se había notado antes:** el flujo normal de uso de la app (entrar por `/`, y navegar solo haciendo clic en links con `data-link`, que usan `pushState` sin recargar la página) nunca dispara este bug, porque los `<script>` ya están cargados una sola vez al inicio y no se vuelven a pedir. Solo se manifiesta al cargar la página completa (recarga con F5, o entrar por link directo) estando en una ruta de más de un nivel — algo que probablemente nadie había probado todavía, ya que ni siquiera había una forma de correr el proyecto localmente con `node_modules` instalados antes de esta sesión.

**Corrección:** se cambiaron todas las rutas relativas de assets a rutas absolutas (con `/` inicial), para que siempre resuelvan contra la raíz del sitio sin importar en qué URL esté parado el navegador al cargar la página:

| Archivo | Antes | Después |
|---|---|---|
| `index.html` | `href="css/styles.css"`, `src="js/core/i18n.js"`, etc. (~28 referencias) | `href="/css/styles.css"`, `src="/js/core/i18n.js"`, etc. |
| `i18n.js` | `fetch(\`i18n/${lang}.json\`)` | `fetch(\`/i18n/${lang}.json\`)` |
| `navbar.js` | `src="photos/logo.png"` | `src="/photos/logo.png"` |
| `home.js` | `slide.src = \`photos/promo${n}-${lang}.jpg\`` | `slide.src = \`/photos/promo${n}-${lang}.jpg\`` |

**Impacto:** ninguno en la lógica de negocio — es exclusivamente una corrección de rutas de assets estáticos. Sí es un cambio necesario para que la app sea usable en producción y para poder probar cualquier ruta anidada durante el desarrollo (deep-linking, recargar la página, compartir un link a un espacio o una reserva específica).

**Nota para el equipo:** al servir el frontend en local, sigue haciendo falta un servidor con *fallback* de SPA (que responda `index.html` ante cualquier ruta no encontrada), tal como ya advertía `router.js`. Con `npx serve`, eso es la bandera `-s` (`npx serve -s frontend`). Sin esa bandera, entrar directo a una ruta anidada sigue dando un 404 real del servidor — ese problema es aparte de las rutas relativas y no se soluciona con este fix.

---

## 3. `respondBooking` no validaba el estado actual de la reserva antes de cambiarlo

**Dónde:** `backend/src/controllers/bookingsController.ts` (`respondBooking`), endpoint `PATCH /api/bookings/:id/respond`.

**Síntoma:** el endpoint que el WSpacer+ usa para aprobar o rechazar una solicitud (`PATCH /api/bookings/:id/respond` con `{ status: 'confirmed' | 'rejected' }`) aceptaba la petición sin importar el estado en el que estuviera la reserva. En la práctica, esto permitía cosas como volver a poner `confirmed` una reserva que ya estaba `cancelled_by_host`, o `rejected` una que ya estaba `completed` — se detectó al probar manualmente el flujo de HU-22 (marcar como cumplida) durante la Fase 2, al intentar reutilizar por error una reserva que ya había sido cancelada.

**Causa:** el controlador solo verificaba que la reserva existiera y que quien llamaba fuera el dueño del espacio (`booking.space.ownerId !== req.user!.id`), pero nunca comprobaba `booking.status` antes de sobrescribirlo:

```ts
const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { space: true } });
if (!booking) throw AppError.notFound('Reserva no encontrada');
if (booking.space.ownerId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre esta reserva');

const updated = await prisma.booking.update({
  where: { id: bookingId },
  data: { status },   // se aplicaba sin importar el estado anterior
  include: BOOKING_INCLUDE
});
```

Los demás endpoints que cambian el estado de una reserva sí tienen su propia protección de una forma u otra (`cancelBooking` exige que sea el guest dueño de la reserva y respeta la ventana de 12h; `completeBooking`, agregado en la Fase 2, exige `status === 'confirmed'` y que la reserva ya haya terminado), pero a `respondBooking` — que es el endpoint más antiguo de los cuatro, ya existía desde antes de la fusión de los dos repos — se le había quedado sin ese chequeo.

**Corrección:** se agregó la validación que faltaba, exigiendo que la reserva esté `pending_approval` antes de aprobarla o rechazarla:

```ts
if (booking.status !== 'pending_approval') {
  throw AppError.badRequest('Esta solicitud ya fue respondida y no se puede volver a cambiar');
}
```

**Impacto:** sin este chequeo, cualquier solicitud HTTP directa al endpoint (sin pasar por los botones "Aprobar"/"Rechazar" del frontend, que ya solo se muestran para reservas `pending_approval`) podía revivir o invalidar una reserva que ya había sido cancelada, rechazada o completada, saltándose las reglas de negocio asociadas a esos otros estados (por ejemplo, "confirmar" de nuevo una reserva ya `cancelled_by_host` no revierte la multa/compensación que ya se haya registrado en `booking_penalties`, dejando esos datos inconsistentes con el estado real de la reserva).

**Verificación:** probado con `curl` — responder a una reserva `confirmed` con `{"status":"confirmed"}` ahora devuelve `400` con el mensaje de error; responder a una reserva realmente `pending_approval` sigue funcionando igual que antes.

---

## 4. `combineDateAndTime` desplazaba un día completo el cálculo de fecha+hora, dependiendo de la zona horaria del servidor

**Dónde:** `backend/src/controllers/bookingsController.ts` (`combineDateAndTime`), `backend/src/controllers/spacesController.ts` (`buildAvailabilityFilter`), `backend/src/controllers/blocksController.ts` (`createBlock`).

**Síntoma:** se detectó al probar HU-17 (bloqueos de disponibilidad) recién construida en la Fase 3: se creó un bloqueo de 9am a 12m el 2026-08-02 sobre un espacio, y una reserva de 10am a 11am ese mismo día — que debería chocar directamente con el bloqueo — se aceptó sin ningún error.

**Causa:** el servidor de desarrollo corre con `TZ=America/Bogota` (UTC-5, confirmado con `Intl.DateTimeFormat().resolvedOptions().timeZone`). `combineDateAndTime(date, time)` recibía un `date` que siempre es medianoche UTC (viene de `new Date("YYYY-MM-DD")`, y ese formato de fecha-sin-hora **siempre** se interpreta como UTC según la especificación de JavaScript), pero después le aplicaba `date.setHours(h, m, 0, 0)` — y `setHours` (a diferencia de `setUTCHours`) lee y escribe el **día calendario local** del objeto `Date`, no el día UTC. Para una medianoche UTC, el día calendario local en cualquier zona horaria al oeste de UTC (como Bogotá, UTC-5) es el día **anterior** (`2026-08-02T00:00:00Z` equivale a `2026-08-01T19:00` hora de Bogotá). Entonces `setHours(10, 0, 0, 0)` no ponía "10am del 2 de agosto": ponía "10am del **1** de agosto" en hora de Bogotá, que al volver a UTC es un día completo antes de lo esperado.

El mismo patrón (`new Date(stringSinOffset)`, que también depende de la zona horaria del proceso) se repetía en dos lugares más, agregados durante esta misma sesión:
- `buildAvailabilityFilter()` en `spacesController.ts` (el filtro de fecha/hora de HU-05, Fase 2), con `momentToCheck.setHours(...)`.
- `createBlock()` en `blocksController.ts` (HU-17, Fase 3), con `new Date(data.startDate)` / `new Date(data.endDate)` sobre un valor `"YYYY-MM-DDTHH:MM"` (lo que envía un `<input type="datetime-local">`, sin offset de zona horaria) — que la especificación de JavaScript interpreta como hora **local del proceso**, no UTC.

**Por qué no se notó antes:** el choque contra reservas existentes (`overlappingBooking` en `createBooking`) compara `startTime`/`endTime` como texto plano (`"10:00" < "11:00"`) sobre la misma columna `date`, sin pasar por `combineDateAndTime` — ese camino nunca tuvo el bug. Solo lo tenían los cálculos que sí necesitan una fecha+hora real como objeto `Date`: el choque contra bloqueos, las ventanas de cancelación de 12h/24h, y (agregado en esta sesión) la validación de "ya terminó" para marcar una reserva como cumplida. Como `SpaceBlock` no tenía ningún endpoint para crearse hasta esta misma Fase 3 (ver HU-17 en el backlog), nunca antes hubo un bloqueo real contra el cual probar ese camino del código.

**Corrección:** se cambió `setHours` por `setUTCHours` en los dos sitios que ya tenían un `Date` en mano, y se agregó un parser dedicado (`parseDateTimeLocalAsUTC`) para el valor crudo del formulario de bloqueos, que interpreta los dígitos escritos como UTC de forma explícita en vez de depender de la zona horaria ambiente del proceso:

```ts
// bookingsController.ts y spacesController.ts
combined.setUTCHours(h, m, 0, 0);   // antes: combined.setHours(h, m, 0, 0);

// blocksController.ts
function parseDateTimeLocalAsUTC(value: string): Date {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}
```

Con esto, los mismos dígitos de fecha/hora producen siempre el mismo instante interno sin importar en qué zona horaria esté configurado el proceso de Node — la aplicación completa opera con una sola zona horaria de referencia (ver la regla "Zona horaria: Solo Colombia" en la tabla de reglas de negocio), así que no se necesitaba una librería de zonas horarias ni conversión real de offset, solo dejar de depender de la configuración ambiente del servidor. En `spaceAvailability.js`, el listado de bloqueos ahora formatea las fechas con `timeZone: 'UTC'` explícito en `Intl.DateTimeFormat`, para que la hora mostrada en pantalla sea siempre la misma que se escribió, sin importar la zona horaria del navegador de quien la esté viendo.

**Impacto:** sin este fix, cualquier reserva, cancelación o bloqueo calculado con fecha+hora real (no solo comparación de texto) quedaba corrido un día completo hacia atrás en cualquier servidor que no corriera exactamente en UTC — lo que incluye, irónicamente, el propio servidor de desarrollo (Bogotá). Esto comprometía directamente la integridad de HU-17 (un bloqueo no bloqueaba el día correcto), la ventana de cancelación de 12h del WSpacer (HU-11), la ventana de 24h con multa del WSpacer+ (HU-20), y la validación de "ya terminó" al marcar una reserva como cumplida (HU-22, agregada en la Fase 2 de esta misma sesión).

**Verificación:** probado con `curl` — un bloqueo de 9am a 12m el 2026-08-02 ahora sí rechaza una reserva de 10am-11am ese día (`"El anfitrión bloqueó ese horario"`) y sigue aceptando una reserva a las 4pm ese mismo día (fuera del bloqueo); el filtro de búsqueda de HU-05 replica el mismo comportamiento correcto.

---

## 5. El mensaje de error de "valor duplicado" mostraba `undefined` en vez del campo real

**Dónde:** `backend/src/middleware/errorHandler.ts` (`handlePrismaError`).

**Síntoma:** se detectó al probar HU-14 (documentos de verificación) en la Fase 3: enviar dos veces el mismo número de cédula (que tiene restricción única en `users.nationalId`) debía devolver un mensaje claro, pero devolvía literalmente `"Ya existe un registro con ese valor: undefined"`.

**Causa:** el proyecto migró a Prisma 7 usando el driver adapter `@prisma/adapter-pg` (ver el comentario en `config/db.ts`: "PrismaClient can no longer open a database connection on its own — it requires an explicit driver adapter"). Ese adapter cambió la forma en la que Prisma reporta el error P2002 (violación de restricción única): en vez del `error.meta.target` "clásico" (un arreglo plano con los nombres de columna), el nombre de la columna quedó anidado bajo `error.meta.driverAdapterError.cause.constraint.fields` — confirmado inspeccionando el error real:

```
code: P2002
meta: {"modelName":"User","driverAdapterError":{"name":"DriverAdapterError","cause":{
  "originalCode":"23505",
  "originalMessage":"duplicate key value violates unique constraint \"users_nationalId_key\"",
  "kind":"UniqueConstraintViolation",
  "constraint":{"fields":["\"nationalId\""]}
}}}
```

`handlePrismaError` seguía leyendo `error.meta?.['target']`, que ya no existe con este adapter — de ahí el `undefined`.

**Por qué no se había notado antes:** el único lugar donde ya existía una restricción única antes de esta sesión es `users.email`, y `authController.register` nunca deja que ese error llegue a Prisma: hace un `findUnique` por correo *antes* de intentar crear el usuario, y lanza su propio `AppError.conflict('Este correo ya está registrado')` si ya existe. El código que capturaba el P2002 de Prisma directamente (`handlePrismaError`) nunca se había ejercitado hasta que HU-14 agregó el primer flujo que sí deja que la base de datos sea quien detecte el duplicado (`users.nationalId`, también único).

**Corrección:** se agregó `extractUniqueConstraintFields()`, que primero intenta leer la forma nueva del driver adapter y, si no la encuentra, cae de vuelta a la forma clásica (`meta.target`) por si el proyecto cambia de adapter o de versión de Prisma más adelante:

```ts
function extractUniqueConstraintFields(meta: Record<string, unknown> | undefined): string {
  const driverError = meta?.['driverAdapterError'] as { cause?: { constraint?: { fields?: unknown } } } | undefined;
  const driverFields = driverError?.cause?.constraint?.fields;
  if (Array.isArray(driverFields)) {
    return driverFields.map((field) => String(field).replace(/"/g, '')).join(', ');
  }

  const target = meta?.['target'];
  if (Array.isArray(target)) return target.join(', ');
  if (typeof target === 'string') return target;

  return 'ese campo';
}
```

**Impacto:** afecta a **cualquier** violación de restricción única que llegue sin chequeo previo hasta Prisma — no solo `nationalId`. Antes de este fix, todos esos casos mostraban el mismo mensaje inútil (`"...: undefined"`) en vez de decir qué campo estaba duplicado.

**Verificación:** probado con `curl` — enviar dos veces el mismo `nationalId` ahora devuelve `"Ya existe un registro con ese valor: nationalId"`; el flujo de registro con correo duplicado (que no pasa por este código) se probó de nuevo para confirmar que sigue devolviendo su mensaje propio sin cambios.

---

## 6. Se podía publicar un espacio sin haber enviado los documentos de verificación

**Dónde:** `backend/src/controllers/spacesController.ts` (`createSpace`).

**Reportado por el equipo el 2026-07-17**, justo después de construir HU-14 (documentos de verificación) en la Fase 3: `POST /api/spaces` no comprobaba en ningún momento si el usuario ya tenía `nationalId`, `nationalIdDocUrl` y `bankCertificateUrl` guardados — cualquier cuenta logueada podía publicar (y con eso, volverse WSpacer+) sin haber pasado nunca por el flujo de verificación que HU-14 acababa de construir en esta misma sesión.

**Por qué se documenta aquí como bug y no como una historia nueva:** la propia HU-14, tal como quedó redactada en `docs/WSPACE_Backlog_Detallado.md` durante la Fase 3, ya dejaba esto marcado explícitamente como una decisión de negocio sin resolver ("Decisión de negocio pendiente, sin resolver... Si el equipo decide que publicar debería exigir tener los documentos en regla primero, es un cambio de regla de negocio que hay que decidir aparte"). El equipo confirmó la respuesta el mismo día: sí, publicar debe exigirlo. No se asumió la decisión por cuenta propia — se preguntó primero (ver el intercambio en la conversación de esta sesión).

**Corrección:** `createSpace` ahora busca al usuario antes de crear el espacio y rechaza la solicitud con `403` si falta cualquiera de los tres campos:

```ts
const requester = await prisma.user.findUnique({ where: { id: req.user!.id } });
if (!requester) throw AppError.unauthorized('No autenticado');
if (!requester.nationalId || !requester.nationalIdDocUrl || !requester.bankCertificateUrl) {
  throw AppError.forbidden(
    'Debes enviar tus documentos de verificación (cédula y certificado bancario) antes de publicar un espacio'
  );
}
```

Del lado del frontend, `authController.mapUser()` ahora expone `hasVerificationDocuments` (calculado igual que el chequeo de arriba) en la respuesta de login, para que `publishSpace.js` pueda mostrar un aviso y un enlace a `/verification-documents` **antes** de siquiera renderizar el formulario, en vez de dejar que el usuario lo llene y se encuentre con el error recién al enviarlo. `verificationDocuments.js` actualiza ese valor en `localStorage` (`updateStoredUser`) justo después de un envío exitoso, para que no haga falta cerrar sesión y volver a entrar para poder publicar en la misma visita.

**Efecto sobre los datos de prueba:** la cuenta sembrada `carlos@example.com` (que ya era WSpacer+ dueño de 3 espacios antes de este cambio) quedó bloqueada para publicar espacios nuevos hasta que se le agregaron documentos de verificación de prueba en `prisma/seed.ts`, para que la cuenta de demostración siguiera siendo utilizable sin tener que pasar manualmente por el flujo de subida cada vez que se corre `npm run seed`.

**Verificación:** probado de punta a punta — un usuario nuevo sin documentos recibe `403` al intentar publicar por `curl`, y en el navegador ve el aviso en vez del formulario; tras enviar sus documentos, el mismo `POST /api/spaces` se acepta (`201`); la cuenta sembrada de Carlos (ya con documentos en `seed.ts`) sigue publicando sin fricción.

---

## 7. El pago podía confirmar una reserva sin que el anfitrión la hubiera aprobado

**Dónde:** `backend/src/controllers/paymentsController.ts` (`simulatePayment`, ya eliminado), `frontend/js/views/myBookings.js`.

**Síntoma:** se detectó al responder la pregunta del usuario sobre cómo una reserva llega a `completed` — revisando el código para dar una respuesta exacta, apareció que `POST /api/payments/simulate` aceptaba pagar una reserva en estado `pending_approval` (no solo `confirmed`), y **siempre** dejaba el estado en `confirmed` al pagar, sin comprobar si el anfitrión ya la había aprobado. En el frontend, el botón "Confirmar y pagar" se mostraba justo cuando `status === 'pending_approval'` — es decir, el huésped podía pagar y confirmar su propia reserva antes de que el anfitrión hiciera nada.

**Causa:** existían dos caminos independientes hacia `confirmed` que nunca se reconciliaron: `respondBooking` (aprobación del host) y `simulatePayment` (pago del guest), cada uno capaz de dejar la reserva en `confirmed` por su cuenta. Es un residuo probable de la fusión de los dos repos originales — cada equipo diseñó su propia noción de "confirmar", y ninguna de las dos quedó subordinada a la otra al fusionar el código. Esto contradice directamente la regla de negocio ya confirmada: *"Todas las solicitudes requieren aprobación manual del WSpacer+, sin excepción"*.

**Corrección:** el equipo decidió resolverlo cambiando la regla de fondo (no solo parcheando el síntoma): el pago pasó a ser **obligatorio y automático al momento de crear la reserva** (`bookingsController.createBooking`), no una acción aparte que el guest elige hacer después. Con esto:
- Ya no existe un camino donde "pagar" por sí solo cambie el estado a `confirmed` — pagar solo garantiza que el dinero quedó capturado; sigue siendo `respondBooking` (aprobación del host) el único que mueve `pending_approval` → `confirmed`/`rejected`.
- `POST /api/payments/simulate` y todo su controlador/ruta se eliminaron — ya no tiene sentido un endpoint de "pagar después" si pagar ya ocurrió al reservar.
- Si el pago simulado falla (mismo 5% de siempre), la reserva ni siquiera se crea — el guest ve el error y puede reintentar, sin dejar una fila huérfana.
- **Decisión explícita del equipo:** si el host rechaza una reserva ya pagada, no hay reembolso automático — la reserva queda `rejected` con su `paymentReference` visible para el guest en `/my-bookings`, quien puede usarla para pedir un reembolso manual. Es una simplificación a propósito, no un gap; un flujo de reembolso automático queda para una implementación futura si se decide construirlo.

**Impacto:** antes de este cambio, cualquier guest podía saltarse por completo la aprobación del anfitrión con solo llamar al endpoint de pago — algo que ni siquiera requería usar el botón del frontend, cualquier petición directa al endpoint bastaba.

**Verificación:** probado con `curl` — crear una reserva ahora devuelve `paymentReference` ya asignado con `status: pending_approval` (nunca `confirmed` automáticamente); `POST /api/payments/simulate` da `404` (ruta eliminada); rechazar una reserva ya pagada la deja en `status: rejected` conservando su `paymentReference`.
