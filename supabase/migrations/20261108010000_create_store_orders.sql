create table if not exists public.inventory (
  product_id text primary key check (product_id in ('edp', 'edt', 'ext')),
  stock integer not null check (stock >= 0),
  updated_at timestamptz not null default now()
);

insert into public.inventory (product_id, stock)
values ('edp', 24), ('edt', 3), ('ext', 12)
on conflict (product_id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('IH' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  customer_id uuid references auth.users(id) on delete set null,
  email text not null,
  customer_name text not null default '',
  phone text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  region text not null default '',
  postal_code text not null default '',
  country text not null default '',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null check (currency = 'usd'),
  status text not null default 'paid' check (status in ('paid', 'refunded', 'packed', 'shipped', 'delivered', 'inventory_issue')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  total_cents integer not null check (total_cents >= 0)
);

create index if not exists orders_email_created_at_idx on public.orders (email, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Customers can read their own orders" on public.orders;
create policy "Customers can read their own orders"
  on public.orders for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists "Customers can read items from their own orders" on public.order_items;
create policy "Customers can read items from their own orders"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.customer_id = (select auth.uid())
    )
  );

create or replace function public.record_paid_order(order_data jsonb, items_data jsonb)
returns table (order_id uuid, public_id text, inventory_available boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.orders%rowtype;
  new_order public.orders%rowtype;
  item jsonb;
  available_stock integer;
  all_available boolean := true;
begin
  if jsonb_typeof(items_data) <> 'array' or jsonb_array_length(items_data) = 0 then
    raise exception 'Order must include at least one product';
  end if;

  select * into existing_order
  from public.orders
  where stripe_session_id = order_data->>'stripe_session_id';

  if found then
    return query select existing_order.id, existing_order.public_id, existing_order.status <> 'inventory_issue';
    return;
  end if;

  for item in
    select value from jsonb_array_elements(items_data)
    order by value->>'product_id'
  loop
    select stock into available_stock
    from public.inventory
    where product_id = item->>'product_id'
    for update;

    if not found or available_stock < (item->>'quantity')::integer then
      all_available := false;
    end if;
  end loop;

  insert into public.orders (
    stripe_session_id, stripe_payment_intent_id, customer_id, email, customer_name, phone,
    address_line1, address_line2, city, region, postal_code, country,
    subtotal_cents, shipping_cents, total_cents, currency, status
  )
  values (
    order_data->>'stripe_session_id',
    nullif(order_data->>'stripe_payment_intent_id', ''),
    nullif(order_data->>'customer_id', '')::uuid,
    lower(order_data->>'email'),
    coalesce(order_data->>'customer_name', ''),
    coalesce(order_data->>'phone', ''),
    coalesce(order_data->>'address_line1', ''),
    coalesce(order_data->>'address_line2', ''),
    coalesce(order_data->>'city', ''),
    coalesce(order_data->>'region', ''),
    coalesce(order_data->>'postal_code', ''),
    coalesce(order_data->>'country', ''),
    (order_data->>'subtotal_cents')::integer,
    (order_data->>'shipping_cents')::integer,
    (order_data->>'total_cents')::integer,
    lower(order_data->>'currency'),
    case when all_available then 'paid' else 'inventory_issue' end
  )
  returning * into new_order;

  for item in select value from jsonb_array_elements(items_data)
  loop
    insert into public.order_items (
      order_id, product_id, quantity, unit_price_cents, subtotal_cents, total_cents
    )
    values (
      new_order.id,
      item->>'product_id',
      (item->>'quantity')::integer,
      (item->>'unit_price_cents')::integer,
      (item->>'subtotal_cents')::integer,
      (item->>'total_cents')::integer
    );

    if all_available then
      update public.inventory
      set stock = stock - (item->>'quantity')::integer, updated_at = now()
      where product_id = item->>'product_id';
    end if;
  end loop;

  return query select new_order.id, new_order.public_id, all_available;
end;
$$;

revoke all on function public.record_paid_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_paid_order(jsonb, jsonb) to service_role;
