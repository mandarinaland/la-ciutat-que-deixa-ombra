-- Proves de RLS i restriccions. Executa-les contra la BD LOCAL (supabase start):
--   npm run db:test
-- Tot passa dins d'una transacció que es desfà al final: no deixa cap dada.
\set ON_ERROR_STOP 1
begin;
-- helpers
create or replace function pg_temp.expect(cond boolean, msg text) returns void language plpgsql as $$
begin if not cond then raise exception 'FAIL: %', msg; end if; raise notice 'ok  %', msg; end $$;
create or replace function pg_temp.expect_error(sql text, msg text) returns void language plpgsql as $$
begin execute sql; raise exception 'FAIL (no error): %', msg;
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  % → %', msg, sqlerrm; end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@x'),
  ('00000000-0000-0000-0000-00000000000b', 'visitant@x'),
  ('00000000-0000-0000-0000-00000000000c', 'editor@x');
insert into public.admins (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'owner');

-- ── anon amb obra en esborrany ─────────────────
set role anon;
select pg_temp.expect((select count(*) from works) = 0, 'anon no veu obra draft');
select pg_temp.expect((select count(*) from chapters) = 0, 'anon no veu capítols draft');
select pg_temp.expect((select count(*) from projects) = 0, 'anon no veu projecte sense obres publicades');
select pg_temp.expect_error($$insert into works(slug,title) values ('x','x')$$, 'anon no pot inserir');
select pg_temp.expect((select count(*) from site_settings) = 1, 'anon només veu settings públics');
select pg_temp.expect_error($$select * from admins$$, 'anon no pot llegir admins');
reset role;

-- ── usuari autenticat NO admin ─────────────────
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select count(*) from works) = 0, 'no-admin no veu draft');
select pg_temp.expect_error($$insert into works(slug,title) values ('x','x')$$, 'no-admin no pot inserir');
select pg_temp.expect_error($$insert into admins(user_id, role) values ('00000000-0000-0000-0000-00000000000b','owner')$$, 'no-admin no es pot fer admin');
reset role;

-- ── admin ──────────────────────────────────────
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect((select count(*) from works) = 1, 'admin veu obra draft');
select pg_temp.expect((select count(*) from chapters) = 9, 'admin veu 9 capítols');
update works set status = 'published';
update chapters set status = 'published' where slug in ('proleg', 'vic');
select pg_temp.expect((select published_at is not null from works), 'published_at automàtic');

insert into vignettes (work_id, chapter_id, slug, title, status)
select w.id, c.id, s.slug, s.slug, s.st::publish_status
from works w join chapters c on c.work_id = w.id and c.slug = 'proleg',
     (values ('v-a','published'),('v-b','draft'),('v-c','published'),('v-d','published')) s(slug, st);
select pg_temp.expect((select array_agg(order_index order by order_index) = '{1,2,3,4}' from vignettes), 'order_index automàtic 1..4');

insert into media (id, filename, bucket, storage_path, media_type, mime_type, size, width, height) values
  ('10000000-0000-0000-0000-000000000001','a.jpg','images','2026/09/a.jpg','image','image/jpeg',100,3000,2000),
  ('10000000-0000-0000-0000-000000000002','b.jpg','images','2026/09/b.jpg','image','image/jpeg',100,3000,2000),
  ('10000000-0000-0000-0000-000000000003','v.mp3','audio','2026/09/v.mp3','audio','audio/mpeg',100,null,null),
  ('10000000-0000-0000-0000-000000000004','orfe.jpg','images','2026/09/orfe.jpg','image','image/jpeg',100,10,10);
insert into vignette_media (vignette_id, media_id, role)
select v.id, '10000000-0000-0000-0000-000000000001', 'main_image' from vignettes v where slug='v-a';
insert into vignette_media (vignette_id, media_id, role)
select v.id, '10000000-0000-0000-0000-000000000002', 'main_image' from vignettes v where slug='v-b';
insert into vignette_media (vignette_id, media_id, role)
select v.id, '10000000-0000-0000-0000-000000000003', 'audio_piath' from vignettes v where slug='v-a';
select pg_temp.expect_error($$insert into vignette_media (vignette_id, media_id, role)
  select v.id, '10000000-0000-0000-0000-000000000003', 'main_image' from vignettes v where slug='v-c'$$, 'àudio no pot ser main_image');
select pg_temp.expect_error($$insert into vignette_media (vignette_id, media_id, role)
  select v.id, '10000000-0000-0000-0000-000000000002', 'main_image' from vignettes v where slug='v-a'$$, 'només una main_image per vinyeta');
select pg_temp.expect_error($$insert into media (filename,bucket,storage_path,media_type,mime_type) values ('x','audio','x.jpg','image','image/jpeg')$$, 'bucket ha de coincidir amb tipus');
select pg_temp.expect_error($$insert into media (filename,bucket,storage_path,media_type,mime_type) values ('x','images','../x.jpg','image','image/jpeg')$$, 'path traversal rebutjat');
select pg_temp.expect_error($$insert into chapters (work_id, slug, title) select id, '23', 'x' from works$$, 'slug numèric de capítol rebutjat');
select pg_temp.expect_error($$delete from media where id = '10000000-0000-0000-0000-000000000001'$$, 'no es pot esborrar media en ús');

-- obra 2 per provar FK capítol-obra
insert into works (slug, title) values ('altra-obra', 'Altra');
select pg_temp.expect_error($$insert into vignettes (work_id, chapter_id, slug)
  select w.id, c.id, 'creu' from works w, chapters c where w.slug='altra-obra' and c.slug='vic'$$, 'capítol d''una altra obra rebutjat');

insert into storage.objects (bucket_id, name) values
  ('images','2026/09/a.jpg'),('images','2026/09/b.jpg'),('audio','2026/09/v.mp3'),('images','2026/09/orfe.jpg');

-- reordenar: d,c,b,a
select reorder_vignettes((select id from works where slug='la-ciutat-que-deixa-ombra'),
  array(select id from vignettes where work_id=(select id from works where slug='la-ciutat-que-deixa-ombra') order by order_index desc));
select pg_temp.expect((select string_agg(slug, ',' order by order_index) from vignettes where work_id=(select id from works where slug='la-ciutat-que-deixa-ombra')) = 'v-d,v-c,v-b,v-a', 'reorder_vignettes inverteix l''ordre');
select pg_temp.expect_error($$select reorder_vignettes((select id from works where slug='la-ciutat-que-deixa-ombra'), array(select id from vignettes limit 2))$$, 'reorder amb llista incompleta rebutjat');
select pg_temp.expect((select count(*) from preview_vignettes) = 4, 'preview inclou esborranys');
select pg_temp.expect_error($$delete from admins where user_id='00000000-0000-0000-0000-00000000000a'$$, 'no es pot eliminar l''últim owner');
reset role;

-- ── anon amb contingut publicat ────────────────
set role anon; reset request.jwt.claim.sub;
select pg_temp.expect((select count(*) from works) = 1, 'anon veu només l''obra publicada');
select pg_temp.expect((select count(*) from projects) = 1, 'anon veu projecte amb obra publicada');
select pg_temp.expect((select count(*) from chapters) = 2, 'anon veu 2 capítols publicats');
select pg_temp.expect((select count(*) from vignettes) = 3, 'anon veu 3 vinyetes publicades');
select pg_temp.expect((select string_agg(slug||':'||number||'/'||total, ',' order by number) from public_vignettes) = 'v-d:1/3,v-c:2/3,v-a:3/3', 'numeració pública 1..3 salta esborranys');
select pg_temp.expect((select count(*) from media) = 2, 'anon veu només media de vinyetes publicades');
select pg_temp.expect((select count(*) from vignette_media) = 2, 'anon veu vincles publicats');
select pg_temp.expect((select count(*) from storage.objects) = 2, 'storage: anon només veu objectes publicats');
select pg_temp.expect_error($$select * from preview_vignettes$$, 'anon no pot usar preview_vignettes');
select pg_temp.expect_error($$select * from media_with_usage$$, 'anon no pot usar media_with_usage');
select pg_temp.expect_error($$select reorder_vignettes(gen_random_uuid(), '{}')$$, 'anon no pot reordenar');
select pg_temp.expect_error($$update vignettes set title='x'$$, 'anon no pot actualitzar');
reset role;

-- no-admin autenticat no pot reordenar
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect_error($$select reorder_vignettes((select id from works limit 1), '{}')$$, 'no-admin no pot reordenar');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('images','hack.jpg')$$, 'no-admin no pot pujar a storage');
reset role;
\echo TOTS ELS TESTS OK
rollback;
