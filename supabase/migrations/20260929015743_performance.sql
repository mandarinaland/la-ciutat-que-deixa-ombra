-- ════════════════════════════════════════════════════════════════════
-- 0005 · Rendiment (recomanacions del Supabase Advisor)
--
-- 1. Les polítiques "admin escriu" eren FOR ALL i també cobrien SELECT:
--    cada lectura avaluava dues polítiques. Ara SELECT en té una de sola
--    (que ja inclou l'admin) i l'escriptura té polítiques pròpies.
-- 2. Índexs per a les claus foranes sense índex.
-- ════════════════════════════════════════════════════════════════════

drop policy "projects: admin escriu" on public.projects;
create policy "projects: admin insereix" on public.projects for insert to authenticated
  with check ((select private.is_admin()));
create policy "projects: admin actualitza" on public.projects for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "projects: admin elimina" on public.projects for delete to authenticated
  using ((select private.is_admin()));

drop policy "works: admin escriu" on public.works;
create policy "works: admin insereix" on public.works for insert to authenticated
  with check ((select private.is_admin()));
create policy "works: admin actualitza" on public.works for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "works: admin elimina" on public.works for delete to authenticated
  using ((select private.is_admin()));

drop policy "chapters: admin escriu" on public.chapters;
create policy "chapters: admin insereix" on public.chapters for insert to authenticated
  with check ((select private.is_admin()));
create policy "chapters: admin actualitza" on public.chapters for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "chapters: admin elimina" on public.chapters for delete to authenticated
  using ((select private.is_admin()));

drop policy "vignettes: admin escriu" on public.vignettes;
create policy "vignettes: admin insereix" on public.vignettes for insert to authenticated
  with check ((select private.is_admin()));
create policy "vignettes: admin actualitza" on public.vignettes for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "vignettes: admin elimina" on public.vignettes for delete to authenticated
  using ((select private.is_admin()));

drop policy "vignette_media: admin escriu" on public.vignette_media;
create policy "vignette_media: admin insereix" on public.vignette_media for insert to authenticated
  with check ((select private.is_admin()));
create policy "vignette_media: admin actualitza" on public.vignette_media for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "vignette_media: admin elimina" on public.vignette_media for delete to authenticated
  using ((select private.is_admin()));

drop policy "media: admin escriu" on public.media;
create policy "media: admin insereix" on public.media for insert to authenticated
  with check ((select private.is_admin()));
create policy "media: admin actualitza" on public.media for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "media: admin elimina" on public.media for delete to authenticated
  using ((select private.is_admin()));

drop policy "site_settings: admin escriu" on public.site_settings;
create policy "site_settings: admin insereix" on public.site_settings for insert to authenticated
  with check ((select private.is_admin()));
create policy "site_settings: admin actualitza" on public.site_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "site_settings: admin elimina" on public.site_settings for delete to authenticated
  using ((select private.is_admin()));

drop index if exists public.vignettes_chapter_idx;
create index vignettes_chapter_work_idx on public.vignettes (chapter_id, work_id);
create index media_created_by_idx on public.media (created_by);
