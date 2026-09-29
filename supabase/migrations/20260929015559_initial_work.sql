-- ════════════════════════════════════════════════════════════════════
-- 0004 · Obra inicial, capítols i configuració
--
-- Només contingut real definit per l'obra (títol, crèdits, capítols).
-- Cap vinyeta ni fitxer inventat: es creen des del panell d'administració.
-- Idempotent: es pot tornar a executar sense duplicar res.
-- ════════════════════════════════════════════════════════════════════

insert into public.projects (slug, title, description)
values (
  'david-teulats-camina',
  'David Teulats camina',
  'Fotografia de David Teulats i veu de Piath.'
)
on conflict (slug) do nothing;

insert into public.works (project_id, slug, title, subtitle, credit_photography, credit_text_voice, status, order_index)
select p.id,
       'la-ciutat-que-deixa-ombra',
       'La ciutat que deixa ombra',
       'Auca de David Teulats · Veu de Piath',
       'David Teulats',
       'Piath',
       'draft',
       1
from public.projects p
where p.slug = 'david-teulats-camina'
on conflict (slug) do nothing;

insert into public.chapters (work_id, slug, title, order_index, status)
select w.id, c.slug, c.title, c.ord, 'draft'
from public.works w
cross join (values
  (1, 'proleg',                    'Pròleg'),
  (2, 'els-que-habiten-el-carrer', 'Els que habiten el carrer'),
  (3, 'la-ciutat-parla',           'La ciutat parla'),
  (4, 'els-rostres',               'Els rostres'),
  (5, 'vic',                       'Vic'),
  (6, 'allo-que-no-diem',          'Allò que no diem'),
  (7, 'la-ruptura',                'La ruptura'),
  (8, 'estimar',                   'Estimar'),
  (9, 'el-retorn',                 'El retorn')
) as c(ord, slug, title)
where w.slug = 'la-ciutat-que-deixa-ombra'
on conflict (work_id, slug) do nothing;

-- Configuració. Els límits de pujada mai no poden superar els del bucket (0003).
insert into public.site_settings (key, value, is_public)
values
  ('default_work_slug', '"la-ciutat-que-deixa-ombra"'::jsonb, true),
  ('upload_limits', '{
      "image": { "max_bytes": 26214400, "mime_types": ["image/jpeg", "image/png", "image/webp", "image/avif"] },
      "audio": { "max_bytes": 52428800, "mime_types": ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/ogg", "application/ogg"] },
      "video": { "max_bytes": 52428800, "mime_types": ["video/mp4", "video/webm"] }
    }'::jsonb, false)
on conflict (key) do nothing;
