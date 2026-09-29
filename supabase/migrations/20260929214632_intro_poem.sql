-- Poema de la portada: un àudio de l'obra que sona de fons a la pàgina d'inici.
alter table public.works
  add column if not exists intro_audio_media_id uuid references public.media (id) on delete set null;

create index if not exists works_intro_audio_idx on public.works (intro_audio_media_id);

-- El poema d'una obra publicada és públic (com la portada).
create or replace function private.is_media_public(p_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1
      from public.vignette_media vm
      join public.vignettes v on v.id = vm.vignette_id
      join public.works w     on w.id = v.work_id
      where vm.media_id = p_media_id and v.status = 'published' and w.status = 'published'
    )
    or exists (
      select 1 from public.works w
      where (w.cover_media_id = p_media_id or w.intro_audio_media_id = p_media_id) and w.status = 'published'
    );
$$;

-- Mediateca: el poema compta com a ús (no es pot esborrar mentre estigui vinculat).
create or replace view public.media_with_usage
with (security_invoker = true)
as
select
  m.*,
  (select count(*) from public.vignette_media vm where vm.media_id = m.id)::integer as usage_count,
  (select count(*) from public.works w where w.cover_media_id = m.id or w.intro_audio_media_id = m.id)::integer as cover_count
from public.media m;
