-- ════════════════════════════════════════════════════════════════════
-- La ciutat que deixa ombra — 0001 · Esquema
--
-- PROJECTE → OBRA → CAPÍTOLS → VINYETES ⇄ MULTIMÈDIA
-- Genèric: cap taula depèn del nom d'aquesta obra ni del nombre de vinyetes.
-- ════════════════════════════════════════════════════════════════════

-- ── Tipus ────────────────────────────────────────────────────────────
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.media_type     as enum ('image', 'audio', 'video');
create type public.media_role     as enum (
  'main_image', 'alternative_image',
  'audio_piath', 'ambient_audio', 'music',
  'video', 'video_poster'
);
create type public.media_provider as enum ('supabase', 'mux', 'cloudflare_stream', 'external');
create type public.admin_role     as enum ('owner', 'editor');

-- ── Utilitats ────────────────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Omple published_at la primera vegada que una fila passa a 'published'.
create function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

-- ── projects ─────────────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title       text not null check (char_length(title) between 1 and 300),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── media ────────────────────────────────────────────────────────────
-- Es crea abans que `works` perquè l'obra hi apunta amb cover_media_id.
create table public.media (
  id                uuid primary key default gen_random_uuid(),
  filename          text not null check (char_length(filename) between 1 and 255),
  original_filename text,
  -- Supabase Storage
  bucket            text check (bucket in ('images', 'audio', 'video')),
  storage_path      text check (storage_path is null or (storage_path !~ '(^/|\.\.)' and char_length(storage_path) <= 512)),
  public_url        text,           -- només si algun dia un bucket és públic; normalment null
  -- Abstracció de font (vídeo a Mux/Cloudflare Stream en el futur)
  provider          public.media_provider not null default 'supabase',
  provider_asset_id text,
  media_type        public.media_type not null,
  mime_type         text not null,
  size              bigint not null default 0 check (size >= 0),
  width             integer check (width is null or width > 0),
  height            integer check (height is null or height > 0),
  duration          numeric(10, 3) check (duration is null or duration >= 0),  -- segons
  alt_text          text,
  checksum          text,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint media_supabase_has_path
    check (provider <> 'supabase' or (bucket is not null and storage_path is not null)),
  constraint media_external_has_asset
    check (provider = 'supabase' or provider_asset_id is not null or public_url is not null),
  constraint media_bucket_matches_type
    check (
      bucket is null
      or (media_type = 'image' and bucket = 'images')
      or (media_type = 'audio' and bucket = 'audio')
      or (media_type = 'video' and bucket = 'video')
    ),
  constraint media_mime_matches_type
    check (split_part(mime_type, '/', 1) = media_type::text),
  constraint media_bucket_path_unique unique (bucket, storage_path)
);

create index media_type_created_idx on public.media (media_type, created_at desc);

-- ── works ────────────────────────────────────────────────────────────
create table public.works (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid references public.projects (id) on delete set null,
  slug               text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title              text not null check (char_length(title) between 1 and 300),
  subtitle           text,
  intro_text         text,
  description        text,
  credit_photography text,
  credit_text_voice  text,
  cover_media_id     uuid references public.media (id) on delete set null,
  status             public.publish_status not null default 'draft',
  order_index        integer not null default 0,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index works_project_idx on public.works (project_id);
create index works_cover_idx   on public.works (cover_media_id);

-- ── chapters ─────────────────────────────────────────────────────────
create table public.chapters (
  id           uuid primary key default gen_random_uuid(),
  work_id      uuid not null references public.works (id) on delete cascade,
  -- Un slug purament numèric xocaria amb /auca/[obra]/[número-de-vinyeta]
  slug         text not null
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug !~ '^[0-9]+$' and char_length(slug) <= 120),
  title        text not null check (char_length(title) between 1 and 300),
  description  text,
  order_index  integer not null,
  status       public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint chapters_work_slug_unique  unique (work_id, slug),
  constraint chapters_id_work_unique    unique (id, work_id),
  constraint chapters_work_order_unique unique (work_id, order_index) deferrable initially immediate
);

-- ── vignettes ────────────────────────────────────────────────────────
create table public.vignettes (
  id           uuid primary key default gen_random_uuid(),
  work_id      uuid not null references public.works (id) on delete cascade,
  chapter_id   uuid,
  order_index  integer not null,
  slug         text not null
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title        text,
  piath_text   text,
  caption      text,
  photographer text,
  photo_date   date,
  location     text,
  status       public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Una vinyeta només pot pertànyer a un capítol de la seva mateixa obra.
  -- Si s'elimina el capítol, la vinyeta queda sense capítol (no s'esborra).
  constraint vignettes_chapter_same_work
    foreign key (chapter_id, work_id) references public.chapters (id, work_id)
    on delete set null (chapter_id),
  constraint vignettes_work_slug_unique  unique (work_id, slug),
  -- Diferible: permet reordenar totes les vinyetes en una sola transacció.
  constraint vignettes_work_order_unique unique (work_id, order_index) deferrable initially immediate
);

create index vignettes_chapter_idx     on public.vignettes (chapter_id);
create index vignettes_work_status_idx on public.vignettes (work_id, status, order_index);

-- ── vignette_media ───────────────────────────────────────────────────
create table public.vignette_media (
  id          uuid primary key default gen_random_uuid(),
  vignette_id uuid not null references public.vignettes (id) on delete cascade,
  -- restrict: no es pot esborrar un fitxer que alguna vinyeta fa servir
  media_id    uuid not null references public.media (id) on delete restrict,
  role        public.media_role not null,
  position    integer not null default 0 check (position >= 0),
  created_at  timestamptz not null default now(),

  constraint vignette_media_role_position_unique unique (vignette_id, role, position)
);

-- Rols únics per vinyeta: una imatge principal, una veu, un vídeo, un pòster.
create unique index vignette_media_single_role_idx
  on public.vignette_media (vignette_id, role)
  where role in ('main_image', 'audio_piath', 'video', 'video_poster');

create index vignette_media_media_idx on public.vignette_media (media_id);

-- El rol ha de ser coherent amb el tipus de fitxer.
create function public.check_vignette_media_role()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  t public.media_type;
begin
  select m.media_type into t from public.media m where m.id = new.media_id;
  if t is null then
    raise exception 'media % no existeix', new.media_id;
  end if;
  if (new.role in ('main_image', 'alternative_image', 'video_poster') and t <> 'image')
     or (new.role in ('audio_piath', 'ambient_audio', 'music') and t <> 'audio')
     or (new.role = 'video' and t <> 'video') then
    raise exception 'El rol % no és compatible amb un fitxer de tipus %', new.role, t
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger vignette_media_role_check
  before insert or update of role, media_id on public.vignette_media
  for each row execute function public.check_vignette_media_role();

-- ── admins ───────────────────────────────────────────────────────────
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.admin_role not null default 'editor',
  created_at timestamptz not null default now()
);

-- ── site_settings ────────────────────────────────────────────────────
create table public.site_settings (
  key        text primary key check (key ~ '^[a-z0-9_]+$'),
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── Ordre automàtic en inserir ───────────────────────────────────────
-- Si no s'indica order_index, la fila nova va al final.
create function public.default_order_index()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_index is null then
    if tg_table_name = 'vignettes' then
      select coalesce(max(order_index), 0) + 1 into new.order_index
        from public.vignettes where work_id = new.work_id;
    elsif tg_table_name = 'chapters' then
      select coalesce(max(order_index), 0) + 1 into new.order_index
        from public.chapters where work_id = new.work_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger vignettes_default_order before insert on public.vignettes
  for each row execute function public.default_order_index();
create trigger chapters_default_order before insert on public.chapters
  for each row execute function public.default_order_index();

-- ── Triggers updated_at / published_at ───────────────────────────────
create trigger projects_updated_at      before update on public.projects      for each row execute function public.set_updated_at();
create trigger media_updated_at         before update on public.media         for each row execute function public.set_updated_at();
create trigger works_updated_at         before update on public.works         for each row execute function public.set_updated_at();
create trigger chapters_updated_at      before update on public.chapters      for each row execute function public.set_updated_at();
create trigger vignettes_updated_at     before update on public.vignettes     for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

create trigger works_published_at     before insert or update of status on public.works     for each row execute function public.set_published_at();
create trigger chapters_published_at  before insert or update of status on public.chapters  for each row execute function public.set_published_at();
create trigger vignettes_published_at before insert or update of status on public.vignettes for each row execute function public.set_published_at();
