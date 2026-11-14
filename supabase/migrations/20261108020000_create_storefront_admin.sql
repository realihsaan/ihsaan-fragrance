create table if not exists public.store_products (
  id text primary key check (id in ('edp', 'edt', 'ext')),
  type text not null check (type in ('fragrance', 'set')),
  name text not null,
  short text not null,
  price numeric(10, 2) not null check (price > 0),
  size text not null,
  tag text not null,
  img text not null,
  description text not null,
  image_position text not null default '50% 50%',
  updated_at timestamptz not null default now()
);

insert into public.store_products (id, type, name, short, price, size, tag, img, description, image_position)
values
  ('edp', 'fragrance', 'Velvet Smoke Eau de Parfum', 'Eau de Parfum', 120, '50 ml', 'Warm. Spiced. Magnetic.', '/assets/images/product-eau-de-parfum.jpg', 'The classic Velvet Smoke. A warm, spiced heart over amber and sandalwood that settles close to the skin.', '50% 50%'),
  ('edt', 'fragrance', 'Velvet Smoke Eau de Toilette', 'Eau de Toilette', 120, '50 ml', 'Luminous. Elegant. Refined.', '/assets/images/product-eau-de-toilette.jpg', 'A lighter, brighter reading of Velvet Smoke. Bergamot and jasmine lead, made for daytime.', '50% 50%'),
  ('ext', 'fragrance', 'Velvet Smoke Extrait de Parfum', 'Extrait de Parfum', 140, '50 ml', 'Bold. Intense. Unforgettable.', '/assets/images/product-extrait-de-parfum.jpg', 'The deepest concentration. Amber, musk and sandalwood that stay with you well into the night.', '50% 50%')
on conflict (id) do nothing;

create table if not exists public.storefront_content (
  content_key text primary key check (content_key in (
    'hero_image', 'hero_leaves', 'note_top', 'note_heart', 'note_base'
  )),
  image_url text not null,
  alt_text text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.storefront_content (content_key, image_url, alt_text)
values
  ('hero_image', '/assets/images/hero-photo-full.jpg', 'Velvet Smoke bottle and box'),
  ('hero_leaves', '/assets/images/hero-leaves.jpg', ''),
  ('note_top', '/assets/images/note-top-bergamot-pepper.jpg', ''),
  ('note_heart', '/assets/images/note-heart-jasmine.jpg', ''),
  ('note_base', '/assets/images/note-base-amber-sandalwood.jpg', '')
on conflict (content_key) do nothing;

alter table public.store_products enable row level security;
alter table public.storefront_content enable row level security;

create or replace function public.save_store_product(product_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_id text := product_data->>'id';
  stock_value integer := (product_data->>'stock')::integer;
begin
  if product_id not in ('edp', 'edt', 'ext') then
    raise exception 'Unknown product';
  end if;

  insert into public.store_products (
    id, type, name, short, price, size, tag, img, description, image_position, updated_at
  )
  values (
    product_id,
    product_data->>'type',
    product_data->>'name',
    product_data->>'short',
    (product_data->>'price')::numeric,
    product_data->>'size',
    product_data->>'tag',
    product_data->>'img',
    product_data->>'description',
    coalesce(nullif(product_data->>'image_position', ''), '50% 50%'),
    now()
  )
  on conflict (id) do update set
    type = excluded.type,
    name = excluded.name,
    short = excluded.short,
    price = excluded.price,
    size = excluded.size,
    tag = excluded.tag,
    img = excluded.img,
    description = excluded.description,
    image_position = excluded.image_position,
    updated_at = now();

  insert into public.inventory (product_id, stock, updated_at)
  values (product_id, stock_value, now())
  on conflict (product_id) do update set stock = excluded.stock, updated_at = now();
end;
$$;

revoke all on function public.save_store_product(jsonb) from public, anon, authenticated;
grant execute on function public.save_store_product(jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'storefront-images',
  'storefront-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
