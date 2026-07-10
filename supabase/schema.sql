-- =========================================================================
-- Powerlife Inventory — production schema (Supabase / Postgres)
-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- =========================================================================

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- -------------------------------------------------------------------------
-- PROFILES  (one row per authenticated user, extends auth.users)
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'New User',
  role text not null default 'Sales Staff' check (role in ('Administrator', 'Inventory Manager', 'Sales Staff')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'Sales Staff');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------------------
-- EVENTS
-- -------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- PRODUCTS
-- -------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand text,
  name text not null,
  barcode text,
  sku text,                       -- "Product Code"
  category text,
  rrp_price numeric(12,2) not null default 0,
  current_stock integer not null default 0,
  active_promotion_id uuid,       -- fk added below (after promotions table exists)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_name_idx on public.products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(barcode,'') || ' ' || coalesce(sku,'')));

-- -------------------------------------------------------------------------
-- STOCK HISTORY  (every increase/decrease/adjust/sale/refund, audit trail)
-- -------------------------------------------------------------------------
create table if not exists public.product_stock_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  action text not null,           -- 'Increase' | 'Decrease' | 'Adjust' | 'Sale' | 'Refund'
  qty integer not null,
  remark text,
  resulting_stock integer not null,
  user_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists stock_history_product_idx on public.product_stock_history(product_id, created_at desc);

-- -------------------------------------------------------------------------
-- PROMOTIONS  (unlimited per product; one may be "active" per product)
-- -------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  promo_price numeric(12,2) not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists promotions_product_idx on public.promotions(product_id);

alter table public.products
  add constraint products_active_promotion_fk
  foreign key (active_promotion_id) references public.promotions(id) on delete set null;

-- -------------------------------------------------------------------------
-- EVENT STOCK ALLOCATION
-- -------------------------------------------------------------------------
create table if not exists public.product_event_allocations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  allocated integer not null default 0,
  returned integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, event_id)
);

-- -------------------------------------------------------------------------
-- SALES PEOPLE / PAYMENT METHODS  (master data)
-- -------------------------------------------------------------------------
create table if not exists public.sales_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- ORDERS / ORDER ITEMS  (denormalized names kept for historical display —
-- deleting an Event/Sales Person/Payment Method must never corrupt past orders)
-- -------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  event_id uuid references public.events(id) on delete set null,
  event_name text,
  sales_person_id uuid references public.sales_people(id) on delete set null,
  sales_person_name text,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  payment_method_name text,
  customer_name text,
  customer_phone text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_received numeric(12,2),
  change_amount numeric(12,2),
  status text not null default 'completed' check (status in ('completed', 'draft', 'refunded', 'cancelled')),
  is_draft boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_number_idx on public.orders(order_number);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  brand text,
  qty integer not null,
  unit_price numeric(12,2) not null,
  price_label text,               -- e.g. "RRP" or promotion name
  is_giveaway boolean not null default false,
  line_total numeric(12,2) not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- =========================================================================
-- ROW LEVEL SECURITY
-- Internal staff tool: any signed-in user (all roles) can read/write.
-- Tighten later by role if you need e.g. Sales Staff to be read-only on
-- Inventory — see commented example at the bottom.
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.products enable row level security;
alter table public.product_stock_history enable row level security;
alter table public.promotions enable row level security;
alter table public.product_event_allocations enable row level security;
alter table public.sales_people enable row level security;
alter table public.payment_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles','events','products','product_stock_history','promotions',
    'product_event_allocations','sales_people','payment_methods','orders','order_items'
  ])
  loop
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format(
      'create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- Example of tighter, role-based policy (not applied by default):
-- create policy "sales_staff_read_only_products" on public.products
--   for select to authenticated using (true);
-- create policy "managers_write_products" on public.products
--   for insert to authenticated with check (
--     exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Administrator','Inventory Manager'))
--   );
