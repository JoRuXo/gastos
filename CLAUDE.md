# Mis Gastos — contexto del proyecto

## Qué es esto
Una PWA (Progressive Web App) de control de gastos personales. Un único fichero `index.html` con HTML, CSS y JavaScript "vanilla" (sin frameworks ni librerías de build). Pensada para instalarse como app en el móvil y usarse también desde el ordenador.

- **URL en producción:** https://joruxo.github.io/gastos/
- **Repositorio GitHub:** https://github.com/JoRuXo/gastos
- **Ficheros:** `index.html` (todo el código), `manifest.json`, `sw.js` (service worker), `icon-192.png`, `icon-512.png`

> **Un solo repositorio para todos.** Desde el 3 de julio de 2026 hay **un único repo/app** (`gastos`) que usan Alberto, Noel, David y Verónica. Cada uno entra con **su propia cuenta** y solo ve sus datos (RLS). Antes había 4 repos separados (gastos-Joruxo, gastos-Noel, gastos-david, gastos-veronica); ahora esos 4 quedan como **redirecciones** a esta URL. Ver sección "Un solo repositorio para todos".

## Sobre Alberto (el usuario)
- Español de Valencia, vive en Aalsmeer (Países Bajos) desde el 20 de mayo de 2026.
- Trabaja en el sector floricultor/horticultura.
- Nivel técnico medio-bajo: entiende la lógica de la app pero no es desarrollador profesional.
- **Prefiere explicaciones en lenguaje sencillo, sin tecnicismos sin explicar.**
- Conversaciones siempre en español.
- Cambios de código: mostrar solo lo que cambia, no reescribir el fichero entero salvo que se pida explícitamente. Explicar el cambio después en una o dos frases simples.

## Decisiones técnicas — NO cambiar sin confirmar con Alberto
| Decisión | Por qué |
|---|---|
| Un solo fichero `index.html` | Despliegue trivial en GitHub Pages, sin build |
| Vanilla JS (sin React/Vue/jQuery) | Ligero, legible, sin dependencias |
| Supabase como base de datos en la nube | Sincroniza datos entre móvil y ordenador |
| Un solo repositorio para todos | Se mantiene y despliega una sola vez; cada persona entra con su cuenta |
| IDs de categoría | Sagrados — están en datos reales guardados, nunca cambiarlos |
| Modelo de IA fijo `claude-sonnet-4-20250514` | No cambiar sin confirmar (aunque actualmente no se usa, ver abajo) |

## Estado actual de la arquitectura

### Backend: Supabase (NO localStorage)
La app migró de `localStorage` a Supabase para sincronizar datos en tiempo real entre dispositivos.

- **Proyecto Supabase:** ID `zlsuswrmzyecktkiwymi`, URL `https://zlsuswrmzyecktkiwymi.supabase.co`
- Las claves (`SUPABASE_URL` y `SUPABASE_KEY`, la publishable/anon key) están **ya puestas dentro del `index.html`**, cerca del principio del script. No son secretas (están pensadas para ir en el navegador).
- **Autenticación:** login con email/contraseña vía `sb.auth.signInWithPassword`. Hay botón de cuenta (👤 en el topbar) con opción de cerrar sesión (`sb.auth.signOut`).
- **`storageKey`:** `sb-gastos-auth` (única, ya no hay una por persona porque solo hay una app en un dominio).
- **Row Level Security (RLS):** cada usuario solo ve sus propias filas (`auth.uid() = user_id`).

### Tablas en Supabase

**`gastos`** — movimientos (gastos e ingresos):
```sql
id          text        primary key
user_id     uuid        not null default auth.uid()
amount      float8      not null
category_id text        not null
note        text        not null default ''
date        date        not null
kind        text        not null default 'gasto'   -- 'gasto' | 'ingreso'
created_at  timestamptz not null default now()
```

**`deudas`** — deudas con otras personas:
```sql
id          text        primary key
user_id     uuid        not null default auth.uid()
persona     text        not null
amount      float8      not null
direction   text        not null    -- 'te_deben' | 'debes'
note        text        not null default ''
date        date        not null
settled     boolean     not null default false
created_at  timestamptz not null default now()
```

**`perfiles`** — ajustes propios de cada usuario (añadida el 26 jul 2026):
```sql
user_id       uuid        primary key references auth.users(id) on delete cascade default auth.uid()
ciudad        text        not null default ''      -- sale en el subtítulo de la cabecera
etapa_nombre  text        not null default ''      -- p. ej. "Holanda"
etapa_inicio  date                                 -- null = sin etapa configurada
cuentas       text[]      not null default '{}'    -- sus bancos, p. ej. {Santander,"Trade Republic"}
created_at    timestamptz not null default now()
updated_at    timestamptz not null default now()
```

**`fijos`** — cuotas mensuales, **solo para previsión** (no generan movimientos):
```sql
id          text        primary key
user_id     uuid        not null default auth.uid()
concepto    text        not null default ''
amount      float8      not null
category_id text        not null default 'otros'
dia         int                                    -- día del mes en que suele cobrarse (opcional)
cuenta      text        not null default ''
activo      boolean     not null default true      -- false = no cuenta en la previsión
created_at  timestamptz not null default now()
```

**`presupuestos`** — límite mensual por categoría:
```sql
user_id     uuid        not null default auth.uid()
category_id text        not null
importe     float8      not null
updated_at  timestamptz not null default now()
primary key (user_id, category_id)
```

La tabla `gastos` tiene además `cuenta text not null default ''` (de qué banco sale el movimiento).

Las tres tablas tienen RLS activado con 4 políticas (select/insert/update/delete). **Ojo con la forma de escribirlas:** usan `(select auth.uid()) = user_id`, no `auth.uid() = user_id`. El `select` hace que Postgres lo evalúe una vez por consulta en vez de una vez por fila; sin él, el auditor de rendimiento de Supabase da 8 avisos. La condición es idéntica.

### Las 18 categorías — IDs SAGRADOS, nunca cambiar
`vivienda`, `suministros`, `super`, `comer`, `transporte`, `coche`, `viajes`, `salud`, `telefono`, `suscripciones`, `estudios`, `ropa`, `valencia`, `ocio`, `peluqueria`, `tramites`, `otros`, `sin_clasificar`

- **`estudios`** (📚, color `#3F7E7A`) se añadió el 3 de julio de 2026.

### Diseño visual: "Claro Índigo"
- Fondo blanco puro, tarjetas con borde gris suave (`#E5E7EB`).
- Color principal: índigo `#4F46E5`.
- Ingresos en verde (`#16A34A` / fondo `#DCFCE7`), gastos en rojo (`#DC2626` / fondo `#FEE2E2`).
- Fuentes: Fraunces (serif, títulos y números) + Hanken Grotesk (sans, resto).
- Versión de ordenador: media query `@media (min-width: 920px)` con layout de dos columnas. El móvil no cambia.

### Gastos fijos = PREVISIÓN, nunca movimientos — DECISIÓN IMPORTANTE
Los "gastos fijos" (tabla `fijos`, botón *Mis gastos fijos*) **no crean movimientos ni suman en los totales**. Se decidió así el 26 jul 2026 por un motivo concreto: Alberto mete sus datos desde los extractos del banco, y en el extracto **ya vienen** Netflix, Basic-Fit, Cetelem… Si la app los generase por su cuenta, se contarían dos veces (el antiduplicados solo los pillaría si coincidieran en día e importe exactos, y el cobro real no siempre cae el mismo día).

Lo que hacen es responder a «¿cuánto de este mes ya está comprometido?». La función `estadoFijos()` empareja cada cuota con un movimiento real del mes **por importe** (tolerancia de medio céntimo) y va *consumiendo* cada movimiento, para que dos cuotas del mismo importe no se emparejen con el mismo cargo. La tarjeta del Resumen muestra total / ya pasaron / pendiente, y cuánto quedaría cuando pasen las que faltan.

**No cambiar esto a "generar movimientos" sin hablarlo con Alberto.**

### Pestañas de la app
Resumen · Movimientos · Calendario · Evolución · Deudas

- **Resumen:** donut + desglose por categoría (solo gastos, no ingresos).
- **Movimientos:** lista cronológica, con botón de borrado rápido por fila y **buscador**. Con el buscador vacío se ve el mes que estás viendo; en cuanto escribes algo busca en **todos los meses** (por concepto, categoría, cuenta e importe, ignorando acentos: "cafe" encuentra "café"). Al escribir solo se repinta la lista, no la caja, para no perder el foco.
- **Calendario:** cuadrícula del mes con gasto (rojo) e ingreso (verde) bajo cada día; tocar un día abre el detalle.
- **Evolución:** comparación mes a mes. Si el usuario ha configurado una *etapa* en su perfil (nombre + fecha de inicio), separa lo de antes y lo de después; si no la ha configurado, muestra simplemente todos los meses seguidos. **Ya no hay fechas ni ciudades fijas en el código** (antes había una constante con la fecha de mudanza de Alberto, y sus amigos veían textos que no iban con ellos).
- **Deudas:** balance de lo que le deben y lo que debe, con botón de liquidar (✓) sin borrar el histórico.

### Escaneo de tickets/PDF — ELIMINADO (26 jul 2026)
Existió una función para escanear tickets y PDF con la API de Anthropic, pero Alberto decidió NO meter una API key de Anthropic en el navegador (coste y riesgo de que alguien la copie del repo público). Quedó inactiva, luego oculta, y el **26 jul 2026 se borró del todo**: eran unas 200 líneas de código muerto, y el botón *"🔎 Deducir del concepto"* estaba visible pero **siempre fallaba** (llamaba a la API sin clave, y además el navegador lo bloquea por CORS).

Si algún día se quiere recuperar, está en el historial de Git. La forma correcta de hacerlo sería una *Edge Function* de Supabase que guarde la clave en el servidor, nunca en el navegador.

**Flujo real que usa Alberto:** o le manda el extracto a Claude en una sesión como esta y se lo mete directamente en Supabase (ver «Importar movimientos desde extractos»), o pega en el botón **"Pegar movimientos"** un listado en formato `fecha;categoriaId;importe;concepto;tipo` (vía `parsePasted()`).

### Recuperar la contraseña
El login tiene *"¿Has olvidado la contraseña?"*: manda un correo con `sb.auth.resetPasswordForEmail`. Al volver desde el enlace, Supabase lanza el evento `PASSWORD_RECOVERY` y la app muestra la pantalla `#recoveryScreen` para poner una nueva (`sb.auth.updateUser`). **No se deja entrar sin cambiarla**, porque si no el enlace del correo serviría para colarse.

⚠️ **Dos cosas de configuración de Supabase que hay que revisar** (no se pueden hacer desde el código): que la URL `https://joruxo.github.io/gastos/` esté en las *Redirect URLs* permitidas, y que el plan gratuito tiene un límite bajo de correos por hora.

### Otras funciones clave
- **Borrar mes completo:** botón con doble confirmación, borra solo los movimientos del mes que se está viendo.
- **Exportar CSV:** incluye columna de tipo (gasto/ingreso).
- **Botón físico de cerrar (✕):** fijo en la esquina superior derecha de la pantalla, visible en cualquier ventana modal (pegar movimientos, escanear, deudas, cuenta...). Se añadió porque en Safari/iPhone el teclado a veces tapa toda la zona de fondo que se usaba para cerrar tocando fuera.
- **Service worker:** `sw.js`, estrategia *network-first* (intenta red primero, cae a caché si falla). Hay que **subir cache version** (`mis-gastos-vN`) cada vez que se despliega un cambio relevante, para forzar que los navegadores descarten la caché vieja. Versión actual: **`v14`**.
- **Si un guardado falla, se deshace en pantalla.** Las funciones de `Storage` (`saveExpense`, `deleteExpense`, `saveDebt`…) devuelven `true`/`false` según si Supabase confirmó. **Quien las llama TIENE que revertir el cambio local cuando devuelvan `false`.** Antes no se hacía y la app mostraba movimientos que en realidad no se habían guardado: al recargar desaparecían. Si se añade una operación nueva, seguir el mismo patrón.
- **Antiduplicados al pegar:** `marcarDuplicados()` compara fecha + importe **al céntimo** (tolerancia 0,005) y cuenta las repeticiones dentro del propio lote. Así, si un día hubo tres cafés de 0,50 € y solo uno está guardado, marca uno como duplicado y deja entrar los otros dos. La versión vieja usaba una tolerancia de 0,02 € (daba 4,99 y 5,00 por iguales) y marcaba como duplicado cualquier coincidencia.

## Reglas de clasificación de movimientos bancarios
Cuando se procesan extractos del banco (Santander de Alberto, u otros bancos de sus amigos):

| Concepto | Categoría |
|---|---|
| Basic-Fit | `suscripciones` |
| Claude Pro (~22€, cargo de Google Play) | `suscripciones` |
| Netflix | `suscripciones` |
| Financiación del Banco Sabadell (reparación de su coche financiado) | `coche` |
| Tienda Action | `suministros` |
| TGSS / Seguridad Social | `tramites` |
| Endesa | normalmente se ignora (lo paga la familia en España), salvo que el extracto confirme que lo paga él |
| OVpay / códigos "Nlov..." | `transporte` (transporte público holandés) |
| Prefijos de pasarela antes de un asterisco (CCV\*, SUMUP\*, BCK\*, GOC\*, NYX\*, PAYPAL\*) | el comercio real va DESPUÉS del asterisco |

**Nota de privacidad:** existen una o dos reglas de clasificación adicionales que Alberto prefiere mantener discretas y que **nunca deben escribirse en ficheros del repositorio** (ni en este CLAUDE.md, ni en README, ni en el código). Si Alberto las menciona en una sesión, aplícalas solo de palabra para esa sesión, sin documentarlas por escrito en el proyecto.

## Un solo repositorio para todos
Antes había 4 repos separados (uno por persona), todos con código idéntico salvo la `storageKey`. Se unificaron en **un único repo `gastos`** el 3 de julio de 2026, porque:
- Todos apuntaban al mismo Supabase y cada persona entra con su cuenta (RLS separa los datos), así que **una sola app sirve para los 4**.
- Se mantiene y despliega **una sola vez** (antes había que replicar cada cambio 4 veces).

**Cómo entra cada persona:** abre https://joruxo.github.io/gastos/ y hace login con su email/contraseña. Sus datos ya estaban en Supabase, no se pierde nada.

### Los 4 repos viejos → redirecciones
`gastos-Joruxo`, `gastos-Noel-`, `gastos-david`, `gastos-veronica` ya no llevan la app: su `index.html` es una **página de redirección** a `https://joruxo.github.io/gastos/`, y su `sw.js` es un **service worker que se autodesinstala** (borra su caché, se da de baja y recarga) para que las apps ya instaladas salten solas a la nueva. No hay que volver a tocarlos.

### Convenciones de mantenimiento del repo
- **Usuario de GitHub:** la grafía correcta es **`JoRuXo`** (con mayúsculas). El remoto debe apuntar a `https://github.com/JoRuXo/gastos.git`. Si aparece el aviso "This repository moved", el remoto está mal escrito en minúsculas; corregir con `git remote set-url`.
- **`.gitattributes`:** con `* text=auto eol=lf` (+ `*.png binary`). Fija finales de línea en **LF** y evita el aviso de CRLF en Windows. No quitarlo.
- **`.gitignore`:** bloquea basura del sistema (`Thumbs.db`, `.DS_Store`, etc.).
- **Identidad de git al commitear:** nombre `Noel`, email `JoRuXo@hotmail.com`.

## Importar movimientos desde extractos (automático)
Alberto puede mandar un extracto y decir «mételos»: Claude inserta los movimientos **directamente en Supabase, solo en la cuenta de Alberto** (cada usuario tiene sus filas separadas por `user_id`; los amigos no se ven afectados jamás).

**Sus dos bancos (desde julio 2026):** Santander (PDF «Listado de movimientos») y **Trade Republic** (CSV «Exportación de transacción»). Ambos van a la misma cuenta de la app; no hay campo de banco.

Reglas:
- **Antiduplicados obligatorio:** saltar lo que ya exista con misma fecha+importe. **Pero no basta:** Alberto a veces apunta gastos a mano con **fecha distinta a la del banco**, así que hay que listar sus apuntes del rango y cruzarlos también por importe en una ventana de ±5 días.
- **Traspasos entre sus propias cuentas:** una transferencia que sale del Santander aparece como ingreso en Trade Republic. Excluir **los dos lados** o salen gasto e ingreso fantasma.
- **Excluir** además: retrocesiones, anulaciones (netear con su cargo gemelo), y Endesa + reembolsos de luz de la familia.
- **Ingresos** → `kind='ingreso'` (la app los pone en `otros`). Sueldos y transferencias de familia = ingreso.
- **Categorías:** respetar los criterios habituales de Alberto (algunos son discretos y NO se documentan aquí; ver nota de privacidad). Ante una categoría dudosa, dejarla en `sin_clasificar` o preguntar.
- Al terminar, dar un resumen de lo insertado y avisar de los apuntes dudosos para que Alberto los confirme.

## Si la app deja de funcionar: Supabase se pausa solo
El proyecto Supabase es de plan gratuito y **se pausa tras ~2 semanas sin actividad**; mientras está pausado **la app no funciona para nadie** (ni Alberto ni sus amigos pueden entrar). Pasó el 26 jul 2026.

Se arregla reactivando el proyecto (`restore_project`): es gratis, no se pierde nada y tarda 2-4 minutos. Para prevenirlo, basta con abrir la app cada una o dos semanas.

## Cómo desplegar cambios
1. Editar `index.html` (y `sw.js` si se sube versión de caché).
2. Commit y push a la rama `main` del repo `gastos`.
3. GitHub Pages publica automáticamente en 1-2 minutos.
4. Si no se ven los cambios, hacer Ctrl+Shift+R (recarga forzada) — y si persiste, comprobar que se subió también el `sw.js` con la versión de caché incrementada.

## Cómo trabajar conmigo en este proyecto (reglas permanentes)
- **Trabajo en automático (desde 26 jul 2026).** Alberto tiene los permisos en modo automático y no quiere ir autorizando paso a paso: haz los `commit` y `push` sin pedir confirmación. **Pero enséñale siempre después un resumen de lo que cambió** (un `git diff --stat` o las líneas clave); revisar los cambios es lo que ha cazado errores de verdad, como los dos gastos duplicados del 26 jul. **Sigue preguntando antes** de algo irreversible (borrar apuntes, borrar repos) o de cualquier cosa que toque los datos de sus amigos.
- **Supabase directo:** por defecto no ejecutes SQL ni cambies tablas/usuarios por tu cuenta. **Excepción autorizada (3 jul 2026):** importar movimientos desde un PDF de extracto a la cuenta de Alberto cuando él mande el PDF y diga «mételos» (ver sección «Importar movimientos desde PDF»). Cualquier otra operación en Supabase, solo si la pide explícitamente en el momento.
- **Nunca cambies** los IDs de categoría, el `SUPABASE_URL`/`SUPABASE_KEY`, ni el modelo de IA fijo, sin confirmación explícita.
- Si algo te parece arriesgado o ambiguo, pregúntame antes de actuar, no asumas.
- **Mantén este `CLAUDE.md` siempre al día.** Cada vez que tomemos una decisión, cambie cómo quiero las cosas, te cuente una idea, o hagamos una mejora/limpieza relevante, **actualiza este fichero** (la sección que corresponda y el "Historial de decisiones") para que el proyecto tenga memoria escrita de todo. No hace falta que me lo preguntes cada vez: hazlo como parte natural del trabajo y, al final, súbelo cuando yo confirme.

## Historial relevante de decisiones
- Se migró de `localStorage` a Supabase para sincronizar entre dispositivos.
- Se rediseñó la paleta de colores varias veces hasta llegar a "Claro Índigo" (fondo blanco, índigo, verde/rojo para ingresos/gastos).
- Se añadió Calendario, Evolución y Deudas como pestañas nuevas.
- Se añadió un botón físico de cerrar en los modales tras detectar un problema de navegación en Safari/iPhone.
- Se decidió explícitamente NO activar el escaneo automático de PDF/tickets vía API de Anthropic en el navegador, para evitar coste y riesgo de exposición de la clave en el repo público.

### 22–23 jun 2026
- **Aislamiento de sesión:** cada repo guardaba su login con una `storageKey` propia (luego, al unificar, se pasó a una única `sb-gastos-auth`).
- **Arreglos de bugs** (caché `v11`):
  - "Borrar movimientos del mes" fallaba en meses que no tienen 31 días (generaba una fecha imposible que Supabase rechazaba). Ahora usa el último día real del mes.
  - El botón "Entrar" del login podía quedarse colgado en "Entrando…" si fallaba la conexión; se añadió un `.catch`.
  - El detalle de día del Calendario acumulaba escuchadores de clic; se movió a un único escuchador en `wire()`.
  - Se ocultó el botón de escaneo (ver sección de Escaneo).
- **Higiene de repos:** se corrigieron las direcciones remotas a la grafía `JoRuXo`, y se añadieron `.gitattributes` (LF) y `.gitignore`.

### 3 jul 2026
- **Categoría nueva `estudios`** (📚, `#3F7E7A`) añadida al array `CATS`.
- **Unificación a un solo repositorio:** se creó el repo `gastos` (URL `https://joruxo.github.io/gastos/`) como app única para las 4 personas. Cada uno entra con su cuenta (RLS separa datos). Los 4 repos viejos pasan a ser redirecciones con service worker autodesinstalable. Caché subida a `v12`. `storageKey` unificada a `sb-gastos-auth`.

### 26 jul 2026
- **El proyecto Supabase se había auto-pausado** por 3 semanas sin uso y la app estaba caída; se reactivó. Ver sección «Si la app deja de funcionar».
- **Tarea automática anti-pausa:** `.github/workflows/mantener-despierta.yml` consulta la base de datos a diario (y avisa por email si falla), con un commit mensual a `.keepalive` para que GitHub no desactive la tarea por inactividad del repo.
- **Redirecciones aplicadas a los 4 repos viejos** (ya estaban descritas arriba; se ejecutaron este día). Cada uno lleva ahora la página de redirección y el service worker autodestructivo. El `CLAUDE.md` de `gastos-Joruxo` se sustituyó por un aviso de repo retirado.
- **Alberto abrió cuenta en Trade Republic**: ahora manda dos extractos (Santander PDF + Trade Republic CSV). Se documentaron las dos trampas nuevas del antiduplicados (fechas manuales distintas a las del banco, y traspasos entre sus propias cuentas).

#### Fase 1 de mejoras (26 jul 2026) — caché `v13`
Auditoría del código y arreglo de todo lo roto. Alberto confirmó que la app es **de uso personal y para amigos**; la Play Store queda como dirección futura, no como objetivo actual.
- **La app ya no le habla solo a Alberto.** Se creó la tabla `perfiles` y se quitaron la ciudad, la fecha de mudanza y el nombre del manifest (`"Mis Gastos - Aalsmeer"`), que eran suyos y los veían sus tres amigos.
- **Si falla el guardado, se deshace en pantalla** (ver «Otras funciones clave»). Era el bug más grave: la app daba por guardado algo que no lo estaba.
- **Antiduplicados arreglado**: al céntimo y contando repeticiones.
- **Recuperar contraseña**: antes, si un amigo la olvidaba, había que resetearla a mano en Supabase.
- **Borradas ~200 líneas de código muerto** del escaneo con IA, incluido un botón visible que siempre fallaba.
- **8 políticas RLS optimizadas** con `(select auth.uid())`: el auditor pasó de 8 avisos a 0.
- **Colores del manifest corregidos**: eran de la paleta verde antigua, así que la pantalla de carga salía verde y luego saltaba a blanco.
- Todo verificado con una prueba de integración (Supabase falseado) que recorre las 5 pestañas, los guardados que fallan y el pegado de movimientos.

#### Fase 2 de mejoras (26 jul 2026) — caché `v14`
Cuatro funciones nuevas. Ninguna toca el flujo de importar extractos, que sigue igual.
- **Cuenta / banco en cada movimiento.** Cada usuario define sus cuentas en *Mi cuenta* (campo `perfiles.cuentas`); si no define ninguna, el selector no aparece y la app se comporta como antes. Al pegar un extracto se elige la cuenta **una vez para todo el lote** (un extracto es siempre de un banco). Sale también en el CSV. Los 338 movimientos que ya existían se rellenaron: 316 Santander y 22 Trade Republic, deducido de qué extracto vino cada uno.
- **Gastos fijos (previsión).** Ver la sección «Gastos fijos = PREVISIÓN».
- **Presupuesto por categoría.** Límite mensual, tarjeta en Resumen con barra por categoría (verde / ámbar al 80% / rojo al pasarse) y aviso de en cuántas te has pasado. Solo aparece si hay al menos un límite puesto.
- **Buscador en Movimientos.** Ver la descripción en «Pestañas de la app».

**Pendiente para la Fase 3** (por orden de valor): enlazar Deudas con movimientos · gestionar categorías desde la app · importar CSV · modo oscuro · cargar por rango de fechas en vez de todo el histórico (hoy `loadData()` trae todos los movimientos; con 338 va sobrado, con miles no). **Nota:** las etiquetas de algunas categorías siguen siendo personales de Alberto (p. ej. «Valencia y pareja»); se resolverá cuando se puedan gestionar desde la app.
