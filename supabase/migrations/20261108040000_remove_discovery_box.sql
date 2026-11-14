alter table public.store_products
  drop constraint if exists store_products_id_check;
alter table public.store_products
  add constraint store_products_id_check check (id in ('edp', 'edt', 'ext'));

alter table public.inventory
  drop constraint if exists inventory_product_id_check;
alter table public.inventory
  add constraint inventory_product_id_check check (product_id in ('edp', 'edt', 'ext'));

alter table public.storefront_content
  drop constraint if exists storefront_content_content_key_check;
alter table public.storefront_content
  add constraint storefront_content_content_key_check check (
    content_key in ('hero_image', 'hero_leaves', 'note_top', 'note_heart', 'note_base')
  );

delete from public.inventory where product_id = 'box';
delete from public.store_products where id = 'box';
delete from public.storefront_content
where content_key in ('discovery_image', 'discovery_leaves');
