create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.store_products(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  review_text text not null check (char_length(review_text) between 1 and 2000),
  rating smallint not null check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_approved_product_created_idx
  on public.product_reviews (product_id, created_at desc)
  where status = 'approved';

create index if not exists product_reviews_pending_created_idx
  on public.product_reviews (created_at desc)
  where status = 'pending';

alter table public.product_reviews enable row level security;
