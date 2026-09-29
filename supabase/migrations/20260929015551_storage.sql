-- ════════════════════════════════════════════════════════════════════
-- 0003 · Supabase Storage: buckets i polítiques
--
-- Tres buckets PRIVATS. Cap fitxer és accessible directament:
--   · Visitants: poden obtenir una URL signada NOMÉS si el fitxer està
--     vinculat a contingut publicat (private.is_storage_object_public).
--   · Administradors: llegir, pujar, substituir i eliminar.
--
-- Límits durs (també configurables més avall a `site_settings`, que mai
-- no poden superar aquests). ATENCIÓ: al pla gratuït de Supabase el límit
-- global per fitxer és de 50 MB; per pujar vídeos més grans cal pla Pro i
-- augmentar també el límit global a Storage → Settings.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('images', 'images', false,  26214400,  -- 25 MB
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('audio',  'audio',  false,  52428800,  -- 50 MB
   array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
         'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/ogg', 'application/ogg']),
  ('video',  'video',  false,  52428800,  -- 50 MB (pla gratuït). Pro: pots pujar-ho.
   array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura (necessària per crear URLs signades): admin sempre; visitants només si és públic.
create policy "storage: lectura de media publicat o admin"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id in ('images', 'audio', 'video')
    and ((select private.is_admin()) or private.is_storage_object_public(bucket_id, name))
  );

create policy "storage: admin puja"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('images', 'audio', 'video') and (select private.is_admin()));

create policy "storage: admin substitueix"
  on storage.objects for update to authenticated
  using      (bucket_id in ('images', 'audio', 'video') and (select private.is_admin()))
  with check (bucket_id in ('images', 'audio', 'video') and (select private.is_admin()));

create policy "storage: admin elimina"
  on storage.objects for delete to authenticated
  using (bucket_id in ('images', 'audio', 'video') and (select private.is_admin()));
