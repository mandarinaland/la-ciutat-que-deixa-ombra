-- ════════════════════════════════════════════════════════════════════
-- 0002 · Funcions, vistes, Row Level Security i permisos
--
-- Regla: els visitants (anon) només poden llegir contingut publicat
-- d'obres publicades. Els administradors (taula `admins`) ho poden tot.
-- El frontend no decideix res: tot es comprova aquí.
-- ════════════════════════════════════════════════════════════════════

-- Les funcions auxiliars viuen a l'esquema `private`: no s'exposen a l'API REST
-- (PostgREST només publica `public`), però les polítiques RLS les poden cridar.
create schema if not exists private;
revoke all on schema private from public;

-- ── Rols d'administració ─────────────────────────────────────────────
-- security definer: poden llegir `admins` sense dependre de la seva pròpia RLS.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()) and a.role = 'owner');
$$;

-- ── Visibilitat pública ──────────────────────────────────────────────
create function private.is_work_public(p_work_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.works w where w.id = p_work_id and w.status = 'published');
$$;

create function private.is_vignette_public(p_vignette_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vignettes v
    join public.works w on w.id = v.work_id
    where v.id = p_vignette_id and v.status = 'published' and w.status = 'published'
  );
$$;

-- Un fitxer és públic si el fa servir alguna vinyeta publicada o és la portada d'una obra publicada.
create function private.is_media_public(p_media_id uuid)
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
      where w.cover_media_id = p_media_id and w.status = 'published'
    );
$$;

-- Per a les polítiques de Storage: objecte → fila de media → és públic?
create function private.is_storage_object_public(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.media m
    where m.bucket = p_bucket and m.storage_path = p_name and private.is_media_public(m.id)
  );
$$;

-- ── Vistes ───────────────────────────────────────────────────────────
-- security_invoker: la vista respecta la RLS de qui consulta.
-- La numeració ("07 / 49") surt de l'ordre de les vinyetes publicades.
create view public.public_vignettes
with (security_invoker = true)
as
select
  v.*,
  row_number() over (partition by v.work_id order by v.order_index)::integer as number,
  count(*)     over (partition by v.work_id)::integer                        as total
from public.vignettes v
join public.works w on w.id = v.work_id
where v.status = 'published' and w.status = 'published';

-- Per a la previsualització d'administrador: tot excepte arxivades.
create view public.preview_vignettes
with (security_invoker = true)
as
select
  v.*,
  row_number() over (partition by v.work_id order by v.order_index)::integer as number,
  count(*)     over (partition by v.work_id)::integer                        as total
from public.vignettes v
where v.status <> 'archived';

-- Mediateca: cada fitxer amb el nombre d'usos.
create view public.media_with_usage
with (security_invoker = true)
as
select
  m.*,
  (select count(*) from public.vignette_media vm where vm.media_id = m.id)::integer as usage_count,
  (select count(*) from public.works w where w.cover_media_id = m.id)::integer      as cover_count
from public.media m;

-- ── Reordenació atòmica ──────────────────────────────────────────────
-- Rep TOTS els ids de l'obra en el nou ordre. Les restriccions úniques són
-- diferibles, així que l'intercanvi de posicions no xoca a mig camí.
create function public.reorder_vignettes(p_work_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected integer;
begin
  if not private.is_admin() then
    raise exception 'Només administradors' using errcode = '42501';
  end if;

  select count(*) into expected from public.vignettes where work_id = p_work_id;
  if expected <> coalesce(array_length(p_ids, 1), 0)
     or expected <> (select count(distinct x) from unnest(p_ids) x)
     or exists (
       select 1 from unnest(p_ids) x
       where not exists (select 1 from public.vignettes v where v.id = x and v.work_id = p_work_id)
     ) then
    raise exception 'La llista d''ids no coincideix amb les vinyetes de l''obra' using errcode = '22023';
  end if;

  set constraints public.vignettes_work_order_unique deferred;

  update public.vignettes v
     set order_index = t.ord::integer
    from unnest(p_ids) with ordinality as t(id, ord)
   where v.id = t.id and v.order_index is distinct from t.ord::integer;
end;
$$;

create function public.reorder_chapters(p_work_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected integer;
begin
  if not private.is_admin() then
    raise exception 'Només administradors' using errcode = '42501';
  end if;

  select count(*) into expected from public.chapters where work_id = p_work_id;
  if expected <> coalesce(array_length(p_ids, 1), 0)
     or expected <> (select count(distinct x) from unnest(p_ids) x)
     or exists (
       select 1 from unnest(p_ids) x
       where not exists (select 1 from public.chapters c where c.id = x and c.work_id = p_work_id)
     ) then
    raise exception 'La llista d''ids no coincideix amb els capítols de l''obra' using errcode = '22023';
  end if;

  set constraints public.chapters_work_order_unique deferred;

  update public.chapters c
     set order_index = t.ord::integer
    from unnest(p_ids) with ordinality as t(id, ord)
   where c.id = t.id and c.order_index is distinct from t.ord::integer;
end;
$$;

-- ── Row Level Security ───────────────────────────────────────────────
alter table public.projects       enable row level security;
alter table public.media          enable row level security;
alter table public.works          enable row level security;
alter table public.chapters       enable row level security;
alter table public.vignettes      enable row level security;
alter table public.vignette_media enable row level security;
alter table public.admins         enable row level security;
alter table public.site_settings  enable row level security;

-- (select fn()) → Postgres l'avalua una vegada per consulta, no per fila.

-- projects
create policy "projects: lectura pública si té obres publicades"
  on public.projects for select to anon, authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.works w where w.project_id = projects.id and w.status = 'published')
  );
create policy "projects: admin escriu"
  on public.projects for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- works
create policy "works: lectura pública publicades"
  on public.works for select to anon, authenticated
  using (status = 'published' or (select private.is_admin()));
create policy "works: admin escriu"
  on public.works for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- chapters
create policy "chapters: lectura pública publicats"
  on public.chapters for select to anon, authenticated
  using ((status = 'published' and private.is_work_public(work_id)) or (select private.is_admin()));
create policy "chapters: admin escriu"
  on public.chapters for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- vignettes
create policy "vignettes: lectura pública publicades"
  on public.vignettes for select to anon, authenticated
  using ((status = 'published' and private.is_work_public(work_id)) or (select private.is_admin()));
create policy "vignettes: admin escriu"
  on public.vignettes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- vignette_media
create policy "vignette_media: lectura pública si la vinyeta és pública"
  on public.vignette_media for select to anon, authenticated
  using (private.is_vignette_public(vignette_id) or (select private.is_admin()));
create policy "vignette_media: admin escriu"
  on public.vignette_media for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- media
create policy "media: lectura pública si està en ús publicat"
  on public.media for select to anon, authenticated
  using ((select private.is_admin()) or private.is_media_public(id));
create policy "media: admin escriu"
  on public.media for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- admins: cadascú veu la seva fila; només un owner gestiona administradors.
create policy "admins: lectura pròpia o admin"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "admins: owner insereix"
  on public.admins for insert to authenticated
  with check ((select private.is_owner()));
create policy "admins: owner actualitza"
  on public.admins for update to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
create policy "admins: owner elimina"
  on public.admins for delete to authenticated
  using ((select private.is_owner()));

-- Mai no es pot quedar el sistema sense cap owner.
create function public.protect_last_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and (select count(*) from public.admins where role = 'owner') <= 1 then
    raise exception 'No es pot eliminar ni degradar l''últim owner' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger admins_protect_last_owner
  before update or delete on public.admins
  for each row execute function public.protect_last_owner();

-- site_settings
create policy "site_settings: lectura pública dels públics"
  on public.site_settings for select to anon, authenticated
  using (is_public or (select private.is_admin()));
create policy "site_settings: admin escriu"
  on public.site_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ── Permisos explícits ───────────────────────────────────────────────
-- No depenem dels privilegis per defecte del projecte: ho declarem aquí.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

grant usage on schema public to anon, authenticated;

grant select on
  public.projects, public.works, public.chapters, public.vignettes,
  public.vignette_media, public.media, public.site_settings,
  public.public_vignettes
to anon, authenticated;

grant insert, update, delete on
  public.projects, public.works, public.chapters, public.vignettes,
  public.vignette_media, public.media, public.site_settings, public.admins
to authenticated;

grant select on public.admins, public.preview_vignettes, public.media_with_usage to authenticated;

grant usage on schema private to anon, authenticated, service_role;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;

grant execute on function
  public.reorder_vignettes(uuid, uuid[]), public.reorder_chapters(uuid, uuid[])
to authenticated;

-- service_role (només servidor) manté accés complet; ignora RLS per disseny.
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Les funcions de trigger no s'han de poder cridar directament per l'API:
-- ja han quedat revocades a dalt per a anon/authenticated; els triggers s'executen igualment.
