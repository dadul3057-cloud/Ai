create table documents(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, path text not null, status text not null default 'processing', page_count int, error text, created_at timestamptz default now());
create table pages(id bigserial primary key, document_id uuid not null references documents on delete cascade, user_id uuid not null default auth.uid(), page_no int not null, content text not null, fts tsvector generated always as (to_tsvector('simple', content)) stored);
create index on pages using gin(fts);
create index on pages(document_id, page_no);
create table messages(id bigserial primary key, user_id uuid not null default auth.uid(), document_id uuid not null references documents on delete cascade, role text not null, content text not null, created_at timestamptz default now());
alter table documents enable row level security; alter table pages enable row level security; alter table messages enable row level security;
create policy own_docs on documents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_pages on pages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_msgs on messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create function search_pages(doc uuid, q text, n int default 8) returns table(page_no int, content text) language sql stable as $$
  select page_no, content from pages where document_id = doc and fts @@ to_tsquery('simple', q) order by ts_rank(fts, to_tsquery('simple', q)) desc limit n $$;
insert into storage.buckets(id, name, public) values ('documents','documents',false) on conflict do nothing;
create policy own_files on storage.objects for all using (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
