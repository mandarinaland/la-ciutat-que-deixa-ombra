# Desplegament actual

> Recursos creats el 29/09/2026. Aquí no hi ha cap secret: la URL i la clau *publishable* de Supabase són públiques per disseny (les protegeix la RLS).

## Supabase

| | |
|---|---|
| Organització | Piath Dao (pla Free) |
| Projecte | `la-ciutat-que-deixa-ombra` · ref `rgklovopctwgmlbjspxr` |
| Regió | `eu-west-3` (París) |
| URL | `https://rgklovopctwgmlbjspxr.supabase.co` |
| Clau pública | `sb_publishable_tPB8f2Km8A-O0Y74Zzo1YQ_cdo31pLH` |
| Migracions aplicades | `20260929015505_schema` · `…015540_security` · `…015551_storage` · `…015559_initial_work` · `…015743_performance` |
| Buckets | `images`, `audio`, `video` (privats) |
| Security Advisor | 0 avisos |
| Proves RLS | 38/38 correctes contra la BD real (amb rollback, no queda cap dada) |

## Vercel

| | |
|---|---|
| Projecte | `la-ciutat-que-deixa-ombra` · `prj_TwzXV6TX5mQrRQBzoEftlvFE7Fka` (compte Hobby) |
| Producció | https://la-ciutat-que-deixa-ombra.vercel.app |
| Regió de funcions | `cdg1` (París) — la mateixa que Supabase |
| Protecció | Vercel Authentication només a les *previews*; producció pública |
| Comprovació | `/api/health` → `{"app":"ok","supabase":"ok","serviceRole":"missing","env":"production"}` |

Variables configurades: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clau publishable), `NEXT_PUBLIC_DEFAULT_WORK_SLUG`, `REVALIDATE_SECRET` (sensible).

## Pendent (requereix el teu compte)

1. **`SUPABASE_SERVICE_ROLE_KEY`** — Supabase → Project Settings → API Keys → *secret key*. Afegeix-la a Vercel → Settings → Environment Variables (Production + Preview, tipus *Sensitive*) i torna a desplegar. Sense ella l'admin funciona, però les miniatures no s'optimitzen.
2. **Autenticació** — Supabase → Authentication:
   - *Sign In / Providers → Email*: desactiva **Allow new users to sign up**.
   - *URL Configuration*: Site URL `https://la-ciutat-que-deixa-ombra.vercel.app`; Redirect URLs `http://localhost:3000/**`.
3. **Primer administrador** — Authentication → Users → *Add user* (email + contrasenya, *Auto Confirm*). Després, al SQL Editor:
   ```sql
   insert into public.admins (user_id, role)
   select id, 'owner' from auth.users where email = 'EL-TEU-EMAIL';
   ```
4. **GitHub** — perquè `git push` desplegui sol: crea un repositori (privat) a GitHub, puja-hi aquest projecte i connecta'l a Vercel → Project → Settings → Git. A partir d'aquí, cada push a `main` = producció i cada branca = preview.
