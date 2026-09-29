-- Aforisme de la portada (columna dreta del hero). Primera línia: títol; la resta: el text.
alter table public.works
  add column if not exists hero_quote text
  check (hero_quote is null or char_length(hero_quote) <= 1000);

comment on column public.works.hero_quote is 'Aforisme de la portada. Primera línia = encapçalament; resta = text.';
