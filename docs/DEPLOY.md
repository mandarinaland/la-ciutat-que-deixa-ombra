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
| Comprovació | `/api/health` → `{"app":"ok","supabase":"ok","serviceRole":"configured","env":"production"}` |

Variables configurades: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clau publishable), `NEXT_PUBLIC_DEFAULT_WORK_SLUG`, `REVALIDATE_SECRET` (sensible).

## GitHub

| | |
|---|---|
| Repositori | https://github.com/mandarinaland/la-ciutat-que-deixa-ombra (privat) |
| Branca de producció | `main` |

## Estat de la configuració

- [x] Supabase: projecte, migracions, buckets, RLS (38/38 proves)
- [x] Vercel: projecte, variables, regió `cdg1`
- [x] `SUPABASE_SERVICE_ROLE_KEY` a Vercel (`/api/health` → `serviceRole: configured`)
- [x] Primer administrador: `info@piath.cat` (`owner`)
- [x] Codi a GitHub; producció desplegada des del commit `60d572a`
- [ ] Vercel → Settings → Git → **Connect Git Repository** (perquè cada `git push` desplegui sol)
- [ ] Supabase → Authentication → desactivar **Allow new users to sign up** i posar el Site URL de producció
