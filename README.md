# La ciutat que deixa ombra

**Auca de David Teulats · Veu de Piath**

Obra digital: fotografia, literatura, veu, àudio i vídeo.
Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS 4 · Supabase (Auth, PostgreSQL, Storage) · Vercel.

L'arquitectura completa (esquema de dades, RLS, fluxos, fases) és a [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

> **Estat:** Fase 1 completada (esquelet Next.js + Vercel). Els apartats marcats amb *(Fase N)* s'activen quan s'implementi aquella fase.

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

## 2. Variables d'entorn

| Variable | On es fa servir | Secreta? | Development | Preview | Production |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + servidor | no | ✔ | ✔ | ✔ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + servidor | no (protegida per RLS) | ✔ | ✔ | ✔ |
| `SUPABASE_SERVICE_ROLE_KEY` | **només servidor** | **sí — "Sensitive"** | ✔ | ✔ | ✔ |
| `NEXT_PUBLIC_SITE_URL` | URLs canòniques, OG, sitemap | no | `http://localhost:3000` | *buida* (usa `VERCEL_URL`) | `https://el-teu-domini` |
| `NEXT_PUBLIC_DEFAULT_WORK_SLUG` | obra de `/` i `/auca` | no | ✔ | ✔ | ✔ |
| `REVALIDATE_SECRET` | `/api/revalidate` *(Fase 15)* | sí | opcional | opcional | ✔ |

Regles:

- `SUPABASE_SERVICE_ROLE_KEY` **mai** porta el prefix `NEXT_PUBLIC_`. Només la llegeix `src/lib/env.server.ts`, que importa `server-only`: si algun component de client l'importés, el build fallaria.
- Cap `.env*` es puja a Git (excepte `.env.example`).
- Recomanació: un projecte Supabase per a **Production** i un altre per a **Development/Preview**, perquè les proves no toquin l'obra publicada.

## 3. Supabase *(Fase 2)*

1. Crea un projecte a supabase.com. Regió recomanada: **West EU (Paris) `eu-west-3`** — coincideix amb la regió de Vercel `cdg1` configurada a `vercel.json`.
2. *Project Settings → API*: copia `Project URL`, la clau `anon`/publishable i la `service_role`/secret a `.env.local`.
3. Instal·la la CLI: `npm i -g supabase` (o `brew install supabase/tap/supabase`).

## 4. Crear la base de dades *(Fase 2)*

La base de dades es reconstrueix sencera des de `supabase/migrations/` — no cal crear res al dashboard.

```bash
supabase login
supabase link --project-ref <ref-del-projecte>
supabase db push           # aplica totes les migracions
```

En local (Docker): `supabase start` i `supabase db reset`.

## 5. Crear els buckets *(Fase 2)*

Els buckets `images`, `audio` i `video` es creen **per migració** (`0003_storage.sql`) amb límit de mida i tipus MIME permesos. Són privats: el servidor només genera URLs signades per a fitxers vinculats a contingut publicat.

## 6. Configurar l'autenticació *(Fase 3)*

A Supabase → *Authentication*:

- *Sign In / Providers*: activa **Email**. Desactiva **"Allow new users to sign up"** (ningú no s'ha de poder registrar sol).
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

Seguretat de la Fase 1: fins que no existeixi l'autenticació (Fase 3), `src/proxy.ts` retorna 404 per a `/admin` a Production.

## 9. Configurar el domini

1. Vercel → *Settings → Domains* → afegeix el domini (p. ex. `laciutatquedeixaombra.cat`).
2. Al registrador DNS: registre `A` → `76.76.21.21` per a l'arrel, o `CNAME` → `cname.vercel-dns.com` per a un subdomini (Vercel indica els valors exactes).
3. Posa `NEXT_PUBLIC_SITE_URL=https://el-teu-domini` a l'entorn **Production** i torna a desplegar.
4. Supabase → *Authentication → URL Configuration* → actualitza `Site URL`.

## 10. Crear el primer administrador *(Fase 3)*

No hi ha cap contrasenya al codi. L'administrador és un usuari de Supabase Auth amb una fila a la taula `admins`.

1. Supabase → *Authentication → Users → Add user → Create new user*: email + contrasenya forta, marca *Auto Confirm User*.
2. Supabase → *SQL Editor*:

   ```sql
   insert into public.admins (user_id, role)
   select id, 'owner' from auth.users where email = 'el-teu-email@exemple.cat';
   ```

3. Entra a `/admin/login`.

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
