-- =========================================================================
-- Powerlife Inventory — optional starter data
-- Run this AFTER schema.sql, in the same SQL Editor, if you want some
-- sample events / sales people / payment methods / products to explore the
-- app with before importing your real inventory (Inventory > Import).
-- Safe to skip entirely — the app works fine with an empty database too.
-- =========================================================================

insert into public.events (name, location, starts_at, ends_at) values
  ('Bangkok Marathon 2026', 'Bangkok', '2026-08-15', '2026-08-16'),
  ('Football Expo Central World', 'Bangkok', '2026-09-01', '2026-09-03'),
  ('Summer Sports Fest', 'Chiang Mai', '2026-07-20', '2026-07-21')
on conflict do nothing;

insert into public.sales_people (name) values
  ('Alex Morgan'), ('Sarah Chen'), ('Noppadol T.'), ('Kanya S.')
on conflict do nothing;

insert into public.payment_methods (name) values
  ('Cash'), ('Credit Card'), ('PromptPay / QR'), ('Bank Transfer')
on conflict do nothing;

insert into public.products (brand, name, barcode, sku, category, rrp_price, current_stock) values
  ('Nike', 'Grip Sock', '8850001100011', 'NIK-GS-001', 'Sock', 290, 120),
  ('Nike', 'Superlight Sock', '8850001100028', 'NIK-SL-002', 'Sock', 250, 85),
  ('Adidas', 'Classic Sock', '8850001100035', 'ADI-CL-003', 'Sock', 220, 200),
  ('Puma', 'Elite X', '8850001112226', 'PUM-ELX-101', 'Cleats', 3290, 15),
  ('Puma', 'Elite Pro', '8850001112233', 'PUM-ELP-102', 'Cleats', 3990, 10),
  ('Under Armour', 'Training Jersey', '8850001120011', 'UA-TJ-201', 'Jersey', 890, 60),
  ('New Balance', 'Match Ball', '8850001130011', 'NB-MB-301', 'Match Ball', 1290, 40),
  ('Asics', 'Running Shoes', '8850001140011', 'ASC-RS-401', 'Running Shoes', 2890, 25),
  ('Reebok', 'Shin Guards', '8850001150011', 'RBK-SG-501', 'Shin Guards', 490, 70),
  ('Mizuno', 'Goalkeeper Gloves', '8850001160011', 'MIZ-GK-601', 'Goalkeeper Gloves', 1590, 18)
on conflict do nothing;

insert into public.promotions (product_id, name, promo_price, enabled)
select id, 'Grand Opening', 2990, true from public.products where sku = 'PUM-ELX-101'
on conflict do nothing;

update public.products set active_promotion_id = (
  select id from public.promotions where product_id = public.products.id and name = 'Grand Opening'
) where sku = 'PUM-ELX-101';

insert into public.product_event_allocations (product_id, event_id, allocated, returned)
select p.id, e.id, 5, 0
from public.products p, public.events e
where p.sku = 'PUM-ELX-101' and e.name = 'Bangkok Marathon 2026'
on conflict do nothing;
