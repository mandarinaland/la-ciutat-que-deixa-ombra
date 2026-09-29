# La ciutat que deixa ombra

**Auca de David Teulats · Veu de Piath**

Obra digital: fotografia, literatura, veu, àudio i vídeo.
Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS 4 · Supabase (Auth, PostgreSQL, Storage) · Vercel.

L'arquitectura completa (esquema de dades, RLS, fluxos, fases) és a [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
L'estat del desplegament real (Supabase + Vercel) i els passos pendents són a [`docs/DEPLOY.md`](docs/DEPLOY.md).

**Producció:** https://la-ciutat-que-deixa-ombra.vercel.app

> **Estat:** Fases 1–9, 11 i 12 completades (Next.js + Vercel, Supabase, autenticació, model de dades, tauler, CRUD d'obres, capítols i vinyetes, mediateca, pujades d'imatge/àudio/vídeo, configuració i administradors, portada pública amb recorregut i lector de l'auca). Els apartats marcats amb *(Fase N)* s'activen quan s'implementi aquella fase.

---

## 1. Instal·lació

Requisits: **Node.js 20.9+** (recomanat 22, vegeu `.nvmrc`), npm, i un compte a [Supabase](https://supabase.com) i [Vercel](https://vercel.com).

```bash
git clone <el-teu-repositori> la-ciutat-que-deixa-ombra
cd la-ciutat-que-deixa-ombra
npm install
cp .env.example .env.local
```

Scripts:

| Ordre | Què fa |
|---|---|
| `npm run dev` | Servidor local a http://localhost:3000 |
| `npm run build` | Build de producció (el mateix que fa Vercel) |
| `npm run typecheck` | Comprovació de tipus |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Supabase local (Docker) |
| `npm run db:reset` | Reconstrueix la BD local des de les migracions |
| `npm run db:push` | Aplica les migracions al projecte remot enllaçat |
| `npm run db:types` | Regenera `src/types/database.ts` des del projecte enllaçat |
| `npm run db:test` | Proves de RLS contra la BD local (38 comprovacions, no deixa dades) |

## 2. Variables d'entorn

| Variable | On es fa servir | Secreta? | Development | Preview | Production |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + servidor | no | ✔ | ✔ | ✔ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + servidor | no (protegida per RLS) | ✔ | ✔ | ✔ |
| `SUPABASE_SERVICE_ROLE_KEY` | **només servidor** | **sí — "Sensitive"** | ✔ | ✔ | ✔ |
| `NEXT_PUBLIC_SITE_URL` | URLs canòniques, OG, sitemap | no | `http://localhost:3000` | *buida* (usa `VERCEL_URL`) | `https://el-teu-domini` |
| `NEXT_PUBLIC_DEFAULT_WORK_SLUG` | obra de `/` i `/auca` | no | ✔ | ✔ | ✔ |
| `REVALIDATE_SECRET` | `/api/revalidate` *(Fase 15)* | sí | opcional | opcional | ✔ |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE` | vídeo a Cloudflare Stream (futur) | no | — | — | opcional |

Regles:

- `SUPABASE_SERVICE_ROLE_KEY` **mai** porta el prefix `NEXT_PUBLIC_`. Només la llegeix `src/lib/env.server.ts`, que importa `server-only`: si algun component de client l'importés, el build fallaria.
- Cap `.env*` es puja a Git (excepte `.env.example`).
- Recomanació: un projecte Supabase per a **Production** i un altre per a **Development/Preview**, perquè les proves no toquin l'obra publicada.

Les variables `NEXT_PUBLIC_*` s'incrusten en temps de **build**: si en canvies alguna a Vercel, torna a desplegar.

## 3. Supabase

1. Crea un projecte a supabase.com. Regió recomanada: **West EU (Paris) `eu-west-3`** — coincideix amb la regió de Vercel `cdg1` configurada a `vercel.json`.
2. *Project Settings → API*: copia `Project URL`, la clau `anon`/publishable i la `service_role`/secret a `.env.local`.
3. La CLI de Supabase ja ve com a dependència de desenvolupament (`npx supabase …`). Per a la BD local cal Docker Desktop.

## 4. Crear la base de dades

La base de dades es reconstrueix sencera des de `supabase/migrations/` — no cal crear res al dashboard.

```bash
npx supabase login
npx supabase link --project-ref <ref-del-projecte>   # el "ref" és el subdomini de la URL del projecte
npm run db:push                                       # aplica totes les migracions
npm run db:types                                      # (opcional) regenera els tipus
```

Migracions (`supabase/migrations/`):

| Fitxer | Contingut |
|---|---|
| `…015505_schema.sql` | tipus, taules, restriccions, índexs, triggers |
| `…015540_security.sql` | esquema `private` amb funcions de permisos, vistes, reordenació atòmica, RLS, permisos |
| `…015551_storage.sql` | buckets `images`, `audio`, `video` (privats) i polítiques |
| `…015559_initial_work.sql` | projecte, obra *La ciutat que deixa ombra* (en esborrany), 9 capítols, configuració |

L'obra i els capítols es creen en **esborrany**: el públic no veurà res fins que els publiquis des de l'administració.

En local: `npm run db:start`, després `npm run db:reset` i `npm run db:test`. A `.env.local` fes servir la URL i les claus que mostra `db:start`.

## 5. Crear els buckets

No cal fer res al dashboard: `db:push` crea els buckets `images`, `audio` i `video` amb límit de mida i tipus MIME permesos.

- Són **privats**. Un visitant només pot obtenir una URL signada d'un fitxer vinculat a una vinyeta publicada (o a la portada d'una obra publicada); ho decideix una política de Storage, no el frontend.
- Límits inicials: imatges 25 MB, àudio 50 MB, vídeo 50 MB. **Al pla gratuït de Supabase el màxim per fitxer és 50 MB.** Amb el pla Pro, puja el límit global (Storage → Settings) i el del bucket `video`.

## 6. Configurar l'autenticació

A Supabase → *Authentication*:

- *Sign In / Providers*: activa **Email**. Desactiva **"Allow new users to sign up"** (ningú no s'ha de poder registrar sol).
- *Policies / Password*: longitud mínima recomanada 12.
- *URL Configuration*: `Site URL` = el domini de producció; afegeix a *Redirect URLs* `http://localhost:3000/**` i `https://*-<el-teu-equip>.vercel.app/**` per a Preview.

## 7. Executar localment

```bash
npm run dev
```

- Públic: http://localhost:3000
- Admin: http://localhost:3000/admin

## 8. Desplegar a Vercel

1. Puja el repositori a GitHub.
2. Vercel → *Add New → Project* → importa el repositori. Framework: Next.js (detectat).
3. *Settings → Environment Variables*: afegeix les variables de l'apartat 2 per a cada entorn.
4. *Deploy*. A partir d'aquí:
   - `git push` a `main` → **Production**
   - `git push` a qualsevol altra branca o PR → **Preview** (amb URL pròpia, no indexada)

Després de cada desplegament, comprova `https://<url>/api/health` → `{"supabase":"ok"}`.

Seguretat: si falten les variables de Supabase, `/admin` respon 503 (tancat per defecte).

## 9. Configurar el domini

1. Vercel → *Settings → Domains* → afegeix el domini (p. ex. `laciutatquedeixaombra.cat`).
2. Al registrador DNS: registre `A` → `76.76.21.21` per a l'arrel, o `CNAME` → `cname.vercel-dns.com` per a un subdomini (Vercel indica els valors exactes).
3. Posa `NEXT_PUBLIC_SITE_URL=https://el-teu-domini` a l'entorn **Production** i torna a desplegar.
4. Supabase → *Authentication → URL Configuration* → actualitza `Site URL`.

## 10. Crear el primer administrador

No hi ha cap contrasenya al codi. L'administrador és un usuari de Supabase Auth amb una fila a la taula `admins`.

1. Supabase → *Authentication → Users → Add user → Create new user*: email + contrasenya forta, marca *Auto Confirm User*.
2. Supabase → *SQL Editor*:

   ```sql
   insert into public.admins (user_id, role)
   select id, 'owner' from auth.users where email = 'el-teu-email@exemple.cat';
   ```

3. Entra a `/admin/login`.

Com funciona la protecció de `/admin`:

1. `src/proxy.ts` refresca la sessió i envia a `/admin/login` qui no n'ha iniciat.
2. El layout del panell i **cada Server Action** criden `requireAdmin()` (valida el token amb Supabase Auth i comprova la taula `admins`).
3. PostgreSQL torna a comprovar-ho amb RLS. Un usuari autenticat que no és a `admins` no pot ni llegir esborranys.

Només un `owner` pot afegir o treure administradors, i no es pot eliminar l'últim `owner`.

---

## Estructura

```
src/
  proxy.ts                 protecció de /admin (Next 16)
  app/(public)/            portada, auca, capítols
  app/admin/               login + panell (route group "(panel)")
  components/              public · admin · auca
  lib/                     env, site, routing, supabase, data, actions, media
supabase/migrations/       SQL versionat
docs/ARCHITECTURE.md
```

Els fitxers multimèdia **mai** van al repositori: `.gitignore` bloqueja imatges, àudio i vídeo.
