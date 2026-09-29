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
| Migracions aplicades | `20260929015505_schema` · `…015540_security` · `…015551_storage` · `…015559_initial_work` · `…015743_performance` · `…210952_hero_quote` · `…214632_intro_poem` |
| Buckets | `images`, `audio`, `video` (privats) |
| Security Advisor | 1 avís: *Leaked password protection* (opció d'Auth; vegeu la llista) |
| Performance Advisor | només índexs encara no usats (BD buida); es mantenen |
| Proves RLS | 38/38 correctes contra la BD real (amb rollback, no queda cap dada) |

## Vercel

| | |
|---|---|
| Projecte | `la-ciutat-que-deixa-ombra` · `prj_TwzXV6TX5mQrRQBzoEftlvFE7Fka` (compte Hobby) |
| Producció | **https://www.deixaombra.art** (`deixaombra.art` redirigeix amb 308 a `www`) · també https://la-ciutat-que-deixa-ombra.vercel.app |
| Regió de funcions | `cdg1` (París) — la mateixa que Supabase |
| Protecció | Vercel Authentication només a les *previews*; producció pública |
| Comprovació | `/api/health` → `{"app":"ok","supabase":"ok","serviceRole":"configured","env":"production"}` |

Variables configurades: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clau publishable), `NEXT_PUBLIC_DEFAULT_WORK_SLUG`, `NEXT_PUBLIC_SITE_URL=https://www.deixaombra.art` (només Production: URLs canòniques, sitemap i imatges per compartir), `REVALIDATE_SECRET` (sensible), `SUPABASE_SERVICE_ROLE_KEY` (sensible).

Capçaleres de seguretat (`next.config.ts`): Content-Security-Policy (només el mateix origen + Supabase), HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, COOP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. L'admin porta `X-Robots-Tag: noindex`.

Refrescar la web si es canvia contingut directament a Supabase (des de l'admin no cal):

```bash
curl -X POST https://www.deixaombra.art/api/revalidate -H "Authorization: Bearer $REVALIDATE_SECRET"
```

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
- [x] Codi a GitHub; cada `git push` a `main` desplega sol a producció
- [x] Domini propi `deixaombra.art` / `www.deixaombra.art` verificat
- [ ] Supabase → Authentication → Sign In / Providers: desactivar **Allow new users to sign up**
- [ ] Supabase → Authentication → URL Configuration: **Site URL** `https://www.deixaombra.art`
- [ ] (Opcional, pla Pro) Supabase → Authentication → activar **Leaked password protection**
- [ ] Publicar l'obra (Admin → Obra) i els capítols que s'hagin de veure

## Proves automàtiques (stack local)

125 comprovacions de navegador: admin (25), mediateca i pujades (31), web pública i compartir (41), ordenar (15), poema de la portada (13). A més, 38 proves de RLS en SQL (`supabase/tests/rls_smoke.sql`).
