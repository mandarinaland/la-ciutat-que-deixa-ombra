# La ciutat que deixa ombra — Arquitectura

> Auca de David Teulats · Veu de Piath
>
> Principi: la fotografia mostra allò que hi ha; la veu pregunta què significa.
> El codi només ha de fer una cosa: deixar que això passi sense fer soroll.

---

## 1. Arquitectura del projecte

```
                    ┌─────────────────────────────────────────────┐
  Navegador ───────▶│ VERCEL (CDN + Functions, regió cdg1 París)  │
                    │                                             │
                    │  Next.js 16 · App Router · React 19 · TS    │
                    │  ├─ proxy.ts ── refresca sessió, tanca /admin│
                    │  ├─ Server Components (lectura, ISR/cache)  │
                    │  ├─ Server Actions (escriptura, admin)      │
                    │  ├─ Route Handlers (sitemap, OG, revalidate)│
                    │  ├─ Experiència pública  (app/(public))     │
                    │  └─ Panell admin         (app/admin)        │
                    └───────────────┬─────────────────────────────┘
                                    │ HTTPS (anon key + cookie de sessió)
                                    │ service role només en codi `server-only`
                    ┌───────────────▼─────────────────────────────┐
                    │ SUPABASE (regió eu-west-3 París)            │
                    │  ├─ Auth ──────── admins (email + password) │
                    │  ├─ PostgreSQL ── RLS a totes les taules    │
                    │  └─ Storage ───── buckets privats           │
                    │        images · audio · video               │
                    └─────────────────────────────────────────────┘
                                    │ (futur, opcional)
                                    ▼
                         Mux / Cloudflare Stream (vídeo)
```

### Decisions clau

| Tema | Decisió | Per què |
|---|---|---|
| Framework | Next.js 16 App Router, Server Components per defecte | Menys JS al client; les pàgines de l'auca es poden cachejar i revalidar. |
| Auth | Supabase Auth amb `@supabase/ssr` (cookies) | Sessió llegible des del servidor, sense tokens a `localStorage`. |
| Permisos | RLS + funció `is_admin()` + comprovació al servidor (`requireAdmin()`) | Doble barrera: el frontend mai no decideix res. |
| Escriptures admin | Server Actions amb el client de **sessió** (RLS s'aplica) | La service role no es fa servir per a CRUD normal. |
| Service role | Només a `src/lib/supabase/admin.ts` amb `import "server-only"`. Únic ús: signar miniatures i esborranys a l'admin (darrere de `requireAdmin()`) | Si algú l'importa des del client, el build falla. El CRUD sempre va amb la sessió de l'admin i RLS. |
| Funcions de permisos | Esquema `private` (no exposat per l'API REST) | Les polítiques les fan servir, però ningú no les pot cridar via `/rest/v1/rpc`. |
| Buckets | **Privats**. Política de Storage: `anon` només pot signar objectes de contingut publicat | Els esborranys no són accessibles encara que se n'endevini el camí; no cal service role per servir media. |
| URLs signades | Vàlides 7 dies, reutilitzades 6 dies (`unstable_cache`, etiqueta `media-urls`) | La mateixa URL durant la finestra → cache de `next/image` i CDN estable. Els resultats incomplets no es cachegen. |
| Lectura pública | Client anònim **sense cookies** (`lib/supabase/public.ts`) | Les pàgines públiques poden ser estàtiques/ISR; `proxy.ts` només s'executa a `/admin`. |
| Pujades | Directes navegador → Supabase amb *signed upload URL* | Evita el límit de 4,5 MB del cos de les Functions de Vercel; permet progrés i cancel·lació. |
| Límits | Límit dur al bucket (`file_size_limit`, `allowed_mime_types`) + límits configurables a `site_settings` validats al servidor | Mai pujades il·limitades. |
| Vídeo | Columna `provider` a `media` + `resolveMediaSource()` | Avui Supabase; demà Mux/Cloudflare Stream sense tocar els components. |
| Numeració | Es calcula amb `row_number()` sobre l'ordre de les vinyetes publicades | `07 / 49` sempre coherent; reordenar no trenca res. |
| Genèric | `projects → works → chapters → vignettes → media` | Cap taula ni ruta depèn del nom d'aquesta obra ni de 49 vinyetes. |

---

## 2. Estructura de carpetes

```
la-ciutat-que-deixa-ombra/
├── docs/ARCHITECTURE.md
├── public/                      # només icones/robots estàtics, cap fotografia
├── supabase/
│   ├── config.toml              # Supabase CLI (local)
│   ├── migrations/              # SQL versionat: la BD es reconstrueix d'aquí
│   │   ├── 20260929015505_schema.sql
│   │   ├── 20260929015540_security.sql   # esquema private, vistes, RLS, permisos
│   │   ├── 20260929015551_storage.sql
│   │   └── 20260929015559_initial_work.sql  # obra + 9 capítols (esborrany)
│   ├── tests/rls_smoke.sql      # 38 comprovacions de permisos (npm run db:test)
│   └── seed.sql                 # només per a entorn local
├── src/
│   ├── proxy.ts                 # (Next 16 = antic middleware) sessió + /admin
│   ├── app/
│   │   ├── layout.tsx           # <html>, fonts, metadata base
│   │   ├── globals.css          # Tailwind v4 + tokens de l'obra
│   │   ├── robots.ts · sitemap.ts · not-found.tsx · error.tsx
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                     # /  portada
│   │   │   ├── auca/page.tsx                # /auca → obra per defecte
│   │   │   ├── auca/[work]/page.tsx         # /auca/la-ciutat-que-deixa-ombra
│   │   │   ├── auca/[work]/[segment]/page.tsx  # /…/23 (vinyeta) o /…/vic (capítol)
│   │   │   ├── capitols/page.tsx
│   │   │   └── capitols/[slug]/page.tsx
│   │   └── admin/
│   │       ├── login/page.tsx
│   │       └── (panel)/                     # layout amb requireAdmin()
│   │           ├── page.tsx                 # /admin → /admin/dashboard
│   │           ├── dashboard/ work/ chapters/ media/ settings/
│   │           ├── vignettes/page.tsx       # llista + drag & drop
│   │           ├── vignettes/[id]/page.tsx  # editor
│   │           └── preview/[work]/[[...segment]]/page.tsx  # inclou esborranys
│   ├── components/
│   │   ├── auca/     # Reader, VignetteView, AudioPlayer, VideoPlayer, Nav
│   │   ├── admin/    # Uploader, SortableList, forms
│   │   └── ui/       # primitives (shadcn/ui només on aporti)
│   ├── lib/
│   │   ├── env.ts            # validació zod de variables públiques
│   │   ├── env.server.ts     # variables secretes (server-only)
│   │   ├── site.ts           # URL canònica segons entorn Vercel
│   │   ├── supabase/         # client.ts · server.ts · admin.ts · proxy.ts
│   │   ├── auth/             # requireAdmin()
│   │   ├── data/             # consultes (works, chapters, vignettes, media)
│   │   ├── actions/          # server actions
│   │   └── media/            # limits.ts · sources.ts (abstracció vídeo/àudio)
│   └── types/database.ts     # generat amb `supabase gen types`
├── .env.example · .gitignore · .nvmrc · vercel.json
├── next.config.ts · eslint.config.mjs · postcss.config.mjs · tsconfig.json
└── README.md
```

---

## 3. Esquema de base de dades

```
projects 1───* works 1───* chapters 1───* vignettes *───* media
                  │                           │  (vignette_media: role, position)
                  └── cover_media_id ─────────┴──▶ media
admins (user_id → auth.users)       site_settings (key → jsonb)
```

### Tipus (enums)

- `publish_status`: `draft | published | archived`
- `media_type`: `image | audio | video`
- `media_role`: `main_image | alternative_image | audio_piath | ambient_audio | music | video | video_poster`
- `media_provider`: `supabase | mux | cloudflare_stream | external`
- `admin_role`: `owner | editor`

### Taules

**projects** — `id uuid pk`, `slug text unique`, `title`, `description`, `created_at`, `updated_at`

**works** — `id`, `project_id → projects`, `slug unique`, `title`, `subtitle`, `intro_text`, `description`,
`credit_photography`, `credit_text_voice`, `cover_media_id → media`, `status`, `order_index`,
`published_at`, `created_at`, `updated_at`

**chapters** — `id`, `work_id → works`, `slug`, `title`, `description`, `order_index`, `status`,
`created_at`, `updated_at` · `unique(work_id, slug)` · `unique(id, work_id)`

**vignettes** — `id`, `work_id → works`, `chapter_id`, `order_index`, `slug`, `title`, `piath_text`,
`caption`, `photographer`, `photo_date`, `location`, `status`, `published_at`, `created_at`, `updated_at`
· `unique(work_id, slug)` · `unique(work_id, order_index) deferrable` (reordenació atòmica)
· FK composta `(chapter_id, work_id) → chapters(id, work_id)`: una vinyeta no pot apuntar a un capítol d'una altra obra.

**media** — `id`, `filename`, `original_filename`, `bucket`, `storage_path`, `public_url` (null si privat),
`provider`, `provider_asset_id`, `media_type`, `mime_type`, `size`, `width`, `height`, `duration`,
`alt_text`, `checksum`, `created_by → auth.users`, `created_at`, `updated_at` · `unique(bucket, storage_path)`

**vignette_media** — `id`, `vignette_id → vignettes (cascade)`, `media_id → media (restrict)`, `role`,
`position`, `created_at` · `unique(vignette_id, role, position)` · índex únic parcial: una sola `main_image` per vinyeta.
`restrict` a `media_id`: no es pot esborrar un fitxer que s'està fent servir (la mediateca ho mostra com a "ús").

**admins** — `user_id pk → auth.users`, `role`, `created_at`

**site_settings** — `key text pk`, `value jsonb`, `updated_at` (límits de pujada, obra per defecte, textos globals)

### Vistes i funcions

- `private.is_admin()`, `private.is_owner()` — `security definer`, `stable`; base de totes les polítiques.
- `private.is_work_public()`, `is_vignette_public()`, `is_media_public()`, `is_storage_object_public()`.
- `preview_vignettes` — com `public_vignettes` però amb esborranys (només admin).
- `media_with_usage` — cada fitxer amb `usage_count` i `cover_count` (mediateca).
- Triggers: `order_index` automàtic al final, `published_at` en publicar, coherència rol ↔ tipus de fitxer, protecció de l'últim `owner`.
- `public_vignettes` (`security_invoker`) — vinyetes publicades d'obres publicades amb
  `number = row_number() over (partition by work_id order by order_index)` i `total`.
- `reorder_vignettes(work_id, ids uuid[])` i `reorder_chapters(...)` — reescriuen `order_index` en una sola transacció (restriccions úniques diferibles) i rebutgen llistes incompletes.
- Trigger `set_updated_at` a totes les taules amb `updated_at`.

### RLS (resum)

| Taula | anon / visitant | admin |
|---|---|---|
| works, chapters | `select` si `status = 'published'` | tot |
| vignettes | `select` si publicada **i** l'obra publicada | tot |
| media, vignette_media | `select` només si vinculat a una vinyeta publicada o és portada d'una obra publicada | tot |
| projects | `select` si té alguna obra publicada | tot |
| admins, site_settings | cap (settings públics via funció) | tot (`owner` per gestionar admins) |
| storage.objects | `select` (= poder signar) només d'objectes de contingut publicat | `insert/update/delete/select` |

---

## 4. Flux Vercel → Next.js → Supabase

**Lectura pública (`/auca/la-ciutat-que-deixa-ombra/23`)**

1. Vercel CDN: si la pàgina és a la cache (ISR), es serveix directament.
2. Si no, Server Component → `createServerClient` amb **anon key** → Postgres amb RLS
   (només veu contingut publicat) → consulta la vinyeta 23 a `public_vignettes`.
3. El servidor obté URLs signades (cachejades) per als fitxers d'aquesta vinyeta i la imatge de la 24 per al *preload*, amb el mateix client anònim: Storage només ho permet per a contingut publicat.
4. `next/image` optimitza la fotografia (AVIF/WebP, mida segons `sizes`) a la CDN de Vercel.
5. Àudio i vídeo es reprodueixen directament des de Supabase Storage (HTTP Range) — mai passen per Vercel.
6. Publicar/editar des de l'admin crida `revalidateTag()` → la següent visita regenera la pàgina.

**Escriptura admin (editar vinyeta)**

1. `proxy.ts` refresca la sessió i redirigeix a `/admin/login` si no n'hi ha.
2. El layout `(panel)` crida `requireAdmin()` (sessió + fila a `admins`).
3. Server Action valida amb zod → client de sessió → Postgres (RLS torna a comprovar `is_admin()`).

**Pujada de fitxer**

1. Client: tria/arrossega fitxer → validació local (tipus, mida) per donar feedback ràpid.
2. Server Action `createUpload`: `requireAdmin()`, revalida tipus i mida contra `site_settings`, genera camí `images/2026/09/<uuid>.jpg` i una *signed upload URL*.
3. Client puja directament a Supabase amb XHR → barra de progrés, botó de cancel·lar (`abort()`).
4. Server Action `finalizeUpload`: comprova que l'objecte existeix (`storage.info`) i la mida/tipus reals; si no quadren, esborra l'objecte. Crea la fila `media` amb les dimensions/durada llegides al navegador i, si hi ha destinació, la vincula (rol de vinyeta o portada).

Detalls:
- Codi: `lib/media/limits.ts` (tipus admesos, límits), `lib/actions/media.ts`, `components/admin/media/*` (`useUploads`, `Uploader`, `MediaSlot`, `MediaPicker`, `MediaCard`).
- Rols únics (`main_image`, `audio_piath`, `video`, `video_poster`): vincular-ne un de nou substitueix l'anterior; el fitxer vell es queda a la mediateca.
- Treure la foto principal d'una vinyeta publicada la torna a esborrany.
- Eliminar de la mediateca només és possible si el fitxer no s'usa enlloc (ni vinyeta ni portada); s'esborra la fila i després l'objecte de Storage.
- Els límits es desen a `site_settings.upload_limits` (MB) i mai poden superar el límit dur del bucket (25 MB imatges, 50 MB àudio i vídeo).
- Administradors: només un *owner* pot donar o retirar accés (`/admin/settings`); cal que la persona ja tingui compte a Supabase Auth (Dashboard → Authentication → Add user). Requereix `SUPABASE_SERVICE_ROLE_KEY`.

---

## 4b. Capa de dades i accions

- `lib/data/public.ts` — lectures públiques amb el client anònim, cachejades amb `unstable_cache` (etiqueta `content`, revalidació d'1 h com a xarxa de seguretat).
- `lib/data/admin.ts` — lectures d'admin amb la sessió (sense cache). L'obra en edició es recorda amb la cookie `admin_work` (preparat per a diverses auques).
- `lib/actions/*` — Server Actions. Patró obligatori: `requireAdmin()` → validació zod → client de sessió → `touchContent()` (`updateTag('content')`, i `updateTag('media-urls')` si canvia la visibilitat).
- L'estat d'una vinyeta només canvia amb botons explícits (Publicar, Despublicar, Arxivar); "Guardar" mai no el modifica.
- Publicar exigeix fotografia principal **amb text alternatiu**.
- Els formularis no es buiden si el servidor retorna un error (`useActionForm`).

## 4c. Experiència pública

- `lib/data/auca.ts` — una sola capa de dades amb dos modes: `public` (client anònim + `unstable_cache`, etiqueta `content`) i `preview` (sessió d'admin, inclou esborranys, sense cache). Els components són els mateixos.
- `/` — portada (foto de portada, títol, subtítol, frase d'entrada, crèdits) + **recorregut**: totes les vinyetes publicades en ordre de lectura, agrupades per capítols i compostes en files justificades segons la proporció de cada foto. Una vinyeta en un capítol no publicat surt sense capçalera de capítol.
- `/auca/[obra]/[n]` — lector: foto a pantalla, text de Piath, veu (només en clicar), vídeo opcional, ← → / Esc / lliscar, barra de progrés, precàrrega només de la foto següent.
- Poema de la portada (`works.intro_audio_media_id`, Admin → Obra): `IntroPoem` intenta sonar en entrar; si el navegador ho bloqueja, comença al primer toc/clic/tecla (no si és un enllaç a una altra pàgina). Control fix per pausar; si es pausa o s'acaba, no torna a començar sol durant la sessió. S'atura en sortir de la portada.
- Aforisme de la portada (`works.hero_quote`): primera línia = encapçalament; es mostra justificat a la dreta, sota el títol.
- Àudio ambient: `AmbientProvider` viu al layout públic; el visitant l'activa una vegada (es recorda a la sessió) i continua entre vinyetes si és el mateix fitxer; si la vinyeta no en té, s'esvaeix.
- `/auca/[obra]/[capítol]`, `/capitols`, `/capitols/[slug]` (redirigeix), `sitemap.xml` amb vinyetes i capítols.
- `/admin/preview/[obra]/[[...segment]]` — la mateixa web amb esborranys, protegida per `requireAdmin()`.
- Compartir: `opengraph-image.tsx` (portada, obra, vinyeta/capítol) genera un JPEG 1200×630 amb `next/og` + `sharp` (accepta fotos AVIF/WEBP). URL estable, a diferència de les URLs signades de Storage. Fonts a `src/assets/og` (OFL).
- Dades estructurades: `CreativeWork` a la portada i `Photograph` a cada vinyeta (`lib/data/auca-meta.ts`).
- Ordenar: `/admin/vignettes/ordre` i `/admin/chapters/ordre` (`SortableList`, dnd-kit). Els canvis són locals fins a «Desar l'ordre», que envia la llista completa en una sola crida transaccional; avís si es tanca la pàgina sense desar.
- Revalidació: cada acció d'admin crida `touchContent()` → `updateTag('content')` + `revalidatePath('/', 'layout')`; la primera visita després de publicar ja veu el canvi.

## 5. Fases d'implementació

| Fase | Contingut | Lliurable verificable |
|---|---|---|
| 1 | Next.js + Vercel: configuració, entorn, rutes, layouts, fonts, capçaleres de seguretat | `npm run build` net, totes les rutes existeixen |
| 2 | Supabase: CLI, migracions SQL, clients (browser/server/admin), tipus generats | `supabase db reset` reconstrueix tot |
| 3 | Auth: login, `proxy.ts`, `requireAdmin()`, primer administrador | `/admin` inaccessible sense sessió |
| 4 | Model Work/Chapter/Vignette/Media + capa `lib/data` | consultes tipades |
| 5 | Dashboard amb estadístiques | comptadors reals |
| 6 | CRUD d'obres, capítols i vinyetes + editor | crear/editar/publicar/eliminar (25 proves E2E) |
| 7 | Mediateca (cerca, ús, eliminar, reutilitzar) + configuració (límits, administradors) | fet (31 proves E2E) |
| 8 | Pujada d'imatges (drag & drop, progrés, cancel·lar, substituir) + portada de l'obra | fet |
| 9 | Àudio i vídeo (pujada, durada, veu de Piath, àudio ambient, vídeo + pòster) | fet a l'admin; reproductor públic a la Fase 12 |
| 10 | Ordenar arrossegant (ratolí, dit, teclat, «moure a la posició») → `reorder_vignettes` / `reorder_chapters` | fet (15 proves E2E) |
| 11 | Experiència pública: portada, recorregut (fotollibre per capítols), pàgines de capítol, sitemap | fet (37 proves E2E) |
| 12 | Mode auca: lectura seqüencial, teclat, lliscar, precàrrega, veu, àudio ambient continu, vídeo, previsualització amb esborranys | fet |
| 13 | Responsive: web pública (320–1440 px) i admin amb menú plegable al mòbil | fet |
| 14 | SEO: metadades, imatge per compartir generada per vinyeta/capítol/portada, JSON-LD, sitemap, robots, canonical | fet (40 proves E2E públiques) |
| 15 | Rendiment: ISR + cache per etiqueta, precàrrega de la foto següent, `content-visibility` al recorregut, `/api/revalidate` | fet (mòbil 4G: LCP ≈ 0,6 s, CLS 0, 141 KB de JS) |
| 16 | Seguretat: CSP, HSTS, auditoria de totes les Server Actions (`requireAdmin`), redirecció de login segura, advisors de Supabase | fet |
| 17 | Deploy a Vercel + domini `www.deixaombra.art` | fet (vegeu docs/DEPLOY.md) |
