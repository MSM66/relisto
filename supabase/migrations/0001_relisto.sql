-- =====================================================================
-- RELISTO · esquema inicial (Supabase)
-- Armario por persona protegido con RLS, fotos en Storage y vitrina
-- con reglas de negocio en funciones del servidor (no editables por el cliente).
-- =====================================================================

-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "perfil propio: leer" on public.profiles;
create policy "perfil propio: leer" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "perfil propio: editar" on public.profiles;
create policy "perfil propio: editar" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'name', ''), 40))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Armario (espacio personal completo) ----------
create table if not exists public.wardrobes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  check (octet_length(data::text) < 5000000)
);
alter table public.wardrobes enable row level security;
drop policy if exists "armario propio" on public.wardrobes;
create policy "armario propio" on public.wardrobes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.wardrobe_get() returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce((select jsonb_build_object('data', data, 'version', version, 'updatedAt', updated_at) from public.wardrobes where user_id = auth.uid()), 'null'::jsonb);
$$;

-- Guardado con control de versión: si otro dispositivo guardó antes, avisa (salvo p_force).
create or replace function public.wardrobe_save(p_data jsonb, p_base bigint, p_force boolean default false) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare cur bigint; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select version into cur from public.wardrobes where user_id = uid for update;
  if cur is null then
    insert into public.wardrobes (user_id, data) values (uid, p_data);
    return jsonb_build_object('ok', true, 'version', 1);
  end if;
  if not p_force and p_base is distinct from cur then
    return jsonb_build_object('ok', false, 'conflict', true, 'version', cur);
  end if;
  update public.wardrobes set data = p_data, version = cur + 1, updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'version', cur + 1);
end $$;

-- ---------- Vitrina ----------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text not null default '',
  item_id text,
  snap jsonb not null default '{}'::jsonb,
  price int not null check (price between 1 and 100000),
  accept_offers boolean not null default true,
  condition text not null default 'buen estado' check (condition in ('nueva con etiqueta','como nueva','buen estado','con detalles')),
  district text not null,
  delivery text[] not null default '{recojo}',
  note text not null default '' check (char_length(note) <= 280),
  status text not null default 'publicada' check (status in ('publicada','reservada','vendida','retirada')),
  has_photo boolean not null default false,
  deal_offer_id uuid,
  sold_at date, sold_price int, buyer_id uuid, buyer_name text,
  seller_synced boolean not null default false,
  created_at date not null default (now() at time zone 'America/Lima')::date,
  updated_at date not null default (now() at time zone 'America/Lima')::date
);
create table if not exists public.listing_contacts (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  contact text not null default '' check (char_length(contact) <= 80)
);
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  buyer_name text not null default '',
  buyer_district text not null default '',
  amount int not null check (amount >= 1),
  kind text not null check (kind in ('compra','oferta')),
  counter int,
  message text not null default '' check (char_length(message) <= 200),
  contact text not null default '' check (char_length(contact) <= 80),
  status text not null default 'pendiente' check (status in ('pendiente','contraoferta','aceptada','rechazada','retirada','en espera','no concretada','cancelada')),
  deal text check (deal in ('acordado','entregada','recibida')),
  cancelled_by text,
  added_item_id text,
  received_at date,
  created_at date not null default (now() at time zone 'America/Lima')::date,
  updated_at date not null default (now() at time zone 'America/Lima')::date
);
create index if not exists offers_listing on public.offers(listing_id);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.offers(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  from_id uuid not null references auth.users(id) on delete cascade,
  from_name text not null default '',
  to_id uuid not null references auth.users(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  comment text not null default '' check (char_length(comment) <= 280),
  created_at date not null default (now() at time zone 'America/Lima')::date
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  reported_user uuid,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) <= 60),
  detail text not null default '' check (char_length(detail) <= 500),
  created_at timestamptz not null default now()
);
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.listings enable row level security;
alter table public.listing_contacts enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
-- Lectura directa mínima; todo cambio pasa por las funciones mk_*.
drop policy if exists "vitrina: ver publicaciones" on public.listings;
create policy "vitrina: ver publicaciones" on public.listings for select to authenticated using (status <> 'retirada' or seller_id = auth.uid());
drop policy if exists "vitrina: mis ofertas" on public.offers;
create policy "vitrina: mis ofertas" on public.offers for select to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists "vitrina: ver opiniones" on public.reviews;
create policy "vitrina: ver opiniones" on public.reviews for select to authenticated using (true);
drop policy if exists "bloqueos propios" on public.blocks;
create policy "bloqueos propios" on public.blocks for select to authenticated using (blocker_id = auth.uid());

create or replace function public.mk_today() returns date language sql stable as $$ select (now() at time zone 'America/Lima')::date $$;
create or replace function public.mk_err(msg text) returns jsonb language sql immutable as $$ select jsonb_build_object('error', msg) $$;
create or replace function public.mk_blocked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
create or replace function public.mk_name() returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select name from public.profiles where id = auth.uid()), ''), 'Alguien');
$$;
create or replace function public.mk_district_ok(d text) returns boolean language sql immutable as $$
  select d = any (array['Barranco','Jesús María','La Molina','Lince','Magdalena del Mar','Miraflores','Pueblo Libre','San Borja','San Isidro','San Miguel','Santiago de Surco','Surquillo','Cercado de Lima','Breña','La Victoria','Rímac','San Luis','Chorrillos','San Juan de Miraflores','Villa El Salvador','Ate','Santa Anita','San Juan de Lurigancho','Los Olivos','San Martín de Porres','Comas','Callao']);
$$;

-- Vista de la vitrina para quien consulta, con la misma forma que usa la app.
create or replace function public.mk_snapshot() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); res jsonb;
begin
  if uid is null then return mk_err('not_authenticated'); end if;
  select jsonb_build_object(
    'listings', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'sellerId', l.seller_id, 'sellerName', l.seller_name, 'itemId', l.item_id, 'snap', l.snap, 'price', l.price,
        'acceptOffers', l.accept_offers, 'condition', l.condition, 'district', l.district, 'delivery', to_jsonb(l.delivery), 'note', l.note,
        'contact', case when l.seller_id = uid or exists (select 1 from offers o where o.id = l.deal_offer_id and o.buyer_id = uid) or (l.status = 'vendida' and l.buyer_id = uid)
                        then coalesce((select contact from listing_contacts c where c.listing_id = l.id), '') else '' end,
        'status', l.status, 'createdAt', l.created_at, 'updatedAt', l.updated_at, 'origin', 'real', 'hasPhoto', l.has_photo,
        'dealOfferId', l.deal_offer_id, 'soldAt', l.sold_at, 'soldPrice', l.sold_price, 'buyerId', l.buyer_id, 'buyerName', l.buyer_name, 'sellerSynced', l.seller_synced)
        order by l.created_at desc, l.id)
      from listings l
      where (l.status = 'publicada' and not mk_blocked(uid, l.seller_id))
         or l.seller_id = uid
         or exists (select 1 from offers o where o.listing_id = l.id and o.buyer_id = uid)
         or exists (select 1 from reviews r where r.listing_id = l.id)), '[]'::jsonb),
    'offers', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'listingId', o.listing_id, 'sellerId', o.seller_id, 'buyerId', o.buyer_id, 'buyerName', o.buyer_name, 'buyerDistrict', o.buyer_district,
        'amount', o.amount, 'kind', o.kind, 'counter', o.counter, 'message', o.message,
        'contact', case when o.buyer_id = uid or o.status = 'aceptada' or o.deal = 'recibida' then o.contact else '' end,
        'status', o.status, 'deal', o.deal, 'cancelledBy', o.cancelled_by, 'addedItemId', o.added_item_id, 'receivedAt', o.received_at,
        'createdAt', o.created_at, 'updatedAt', o.updated_at, 'origin', 'real') order by o.created_at desc, o.id)
      from offers o where o.buyer_id = uid or o.seller_id = uid), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'offerId', r.offer_id, 'listingId', r.listing_id, 'fromId', r.from_id, 'fromName', r.from_name, 'toId', r.to_id,
        'stars', r.stars, 'tags', to_jsonb(r.tags), 'comment', r.comment, 'createdAt', r.created_at, 'origin', 'real', 'verified', true) order by r.created_at desc, r.id)
      from reviews r), '[]'::jsonb),
    'blocked', coalesce((select jsonb_agg(blocked_id) from blocks where blocker_id = uid), '[]'::jsonb),
    'seq', '{}'::jsonb
  ) into res;
  return res;
end $$;

create or replace function public.mk_publish(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_price int; v_id uuid; v_del text[];
begin
  if uid is null then return mk_err('Inicia sesión para publicar.'); end if;
  v_price := round((p->>'price')::numeric);
  if v_price is null or v_price < 1 or v_price > 100000 then return mk_err('Pon un precio de venta entre S/ 1 y S/ 100 000.'); end if;
  if not mk_district_ok(p->>'district') then return mk_err('Indica tu distrito para que vean qué tan cerca estás.'); end if;
  select array_agg(x) into v_del from jsonb_array_elements_text(coalesce(p->'delivery', '[]'::jsonb)) x where x in ('recojo','delivery');
  if v_del is null then return mk_err('Elige al menos una forma de entrega.'); end if;
  if exists (select 1 from listings where seller_id = uid and item_id = p->>'itemId' and status in ('publicada','reservada')) then return mk_err('Esta prenda ya está en la vitrina.'); end if;
  if (select count(*) from listings where seller_id = uid and created_at = mk_today()) >= 30 then return mk_err('Llegaste al límite de publicaciones de hoy.'); end if;
  insert into listings (seller_id, seller_name, item_id, snap, price, accept_offers, condition, district, delivery, note, has_photo)
  values (uid, mk_name(), left(p->>'itemId', 40), coalesce(p->'snap', '{}'::jsonb), v_price, coalesce((p->>'acceptOffers')::boolean, true),
          case when p->>'condition' in ('nueva con etiqueta','como nueva','buen estado','con detalles') then p->>'condition' else 'buen estado' end,
          p->>'district', v_del, left(coalesce(p->>'note', ''), 280), coalesce((p->>'hasPhoto')::boolean, false))
  returning id into v_id;
  insert into listing_contacts (listing_id, contact) values (v_id, left(coalesce(p->>'contact', ''), 80));
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.mk_set_price(p_listing uuid, p_price int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_price is null or p_price < 1 or p_price > 100000 then return mk_err('Precio no válido.'); end if;
  update listings set price = p_price, updated_at = mk_today() where id = p_listing and seller_id = auth.uid() and status = 'publicada';
  if not found then return mk_err('Solo puedes cambiar el precio mientras está publicada.'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mk_withdraw(p_listing uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update listings set status = 'retirada', updated_at = mk_today() where id = p_listing and seller_id = auth.uid() and status = 'publicada';
  if not found then return mk_err('Solo se retira una publicación sin acuerdo en curso.'); end if;
  update offers set status = 'no concretada', updated_at = mk_today() where listing_id = p_listing and status in ('pendiente','contraoferta','en espera');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mk_offer(p_listing uuid, p_amount numeric, p_message text default '', p_contact text default '', p_district text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l listings%rowtype; v_amount int; v_id uuid;
begin
  if uid is null then return mk_err('Inicia sesión para ofertar.'); end if;
  select * into l from listings where id = p_listing for update;
  if not found or l.status <> 'publicada' then return mk_err('Esta prenda ya no está disponible.'); end if;
  if l.seller_id = uid then return mk_err('Es tu propia publicación.'); end if;
  if mk_blocked(uid, l.seller_id) then return mk_err('No puedes ofertar en esta publicación.'); end if;
  v_amount := round(p_amount);
  if v_amount is null or v_amount < 1 then return mk_err('Escribe un monto válido.'); end if;
  if v_amount >= l.price then v_amount := l.price; end if;
  if v_amount < l.price and not l.accept_offers then return mk_err('Quien vende no acepta ofertas: el precio es S/ ' || l.price || '.'); end if;
  if v_amount < ceil(l.price * 0.3) then return mk_err('La oferta es muy baja para esta prenda. Prueba con un monto más cercano al precio.'); end if;
  update offers set status = 'retirada', updated_at = mk_today() where listing_id = l.id and buyer_id = uid and status in ('pendiente','contraoferta');
  insert into offers (listing_id, seller_id, buyer_id, buyer_name, buyer_district, amount, kind, message, contact)
  values (l.id, l.seller_id, uid, mk_name(), case when mk_district_ok(p_district) then p_district else '' end, v_amount,
          case when v_amount = l.price then 'compra' else 'oferta' end, left(coalesce(p_message, ''), 200), left(coalesce(p_contact, ''), 80))
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.mk_accept_internal(p_offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype;
begin
  select * into o from offers where id = p_offer for update;
  update offers set status = 'aceptada', deal = 'acordado', amount = coalesce(o.counter, o.amount), updated_at = mk_today() where id = o.id;
  update listings set status = 'reservada', deal_offer_id = o.id, updated_at = mk_today() where id = o.listing_id;
  update offers set status = 'en espera', updated_at = mk_today() where listing_id = o.listing_id and id <> o.id and status in ('pendiente','contraoferta');
end $$;
revoke execute on function public.mk_accept_internal(uuid) from public, anon, authenticated;

create or replace function public.mk_respond(p_offer uuid, p_action text, p_counter int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype; l listings%rowtype;
begin
  select * into o from offers where id = p_offer for update;
  if not found then return mk_err('No es una oferta de tus publicaciones.'); end if;
  select * into l from listings where id = o.listing_id for update;
  if l.seller_id is distinct from auth.uid() then return mk_err('No es una oferta de tus publicaciones.'); end if;
  if o.status <> 'pendiente' or l.status <> 'publicada' then return mk_err('Esta oferta ya no está pendiente.'); end if;
  if p_action = 'aceptar' then perform mk_accept_internal(o.id); return jsonb_build_object('ok', true); end if;
  if p_action = 'rechazar' then update offers set status = 'rechazada', updated_at = mk_today() where id = o.id; return jsonb_build_object('ok', true); end if;
  if p_action = 'contraofertar' then
    if p_counter is null or p_counter <= o.amount or p_counter > l.price then return mk_err('La contraoferta debe estar entre S/ ' || (o.amount + 1) || ' y S/ ' || l.price || '.'); end if;
    update offers set status = 'contraoferta', counter = p_counter, updated_at = mk_today() where id = o.id; return jsonb_build_object('ok', true);
  end if;
  return mk_err('Acción desconocida.');
end $$;

create or replace function public.mk_buyer_respond(p_offer uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype; l listings%rowtype;
begin
  select * into o from offers where id = p_offer for update;
  if not found or o.buyer_id is distinct from auth.uid() then return mk_err('No es tu oferta.'); end if;
  select * into l from listings where id = o.listing_id for update;
  if p_action = 'retirar' and o.status in ('pendiente','contraoferta','en espera') then update offers set status = 'retirada', updated_at = mk_today() where id = o.id; return jsonb_build_object('ok', true); end if;
  if o.status <> 'contraoferta' or l.status <> 'publicada' then return mk_err('No hay contraoferta pendiente.'); end if;
  if p_action = 'aceptar' then perform mk_accept_internal(o.id); return jsonb_build_object('ok', true); end if;
  if p_action = 'rechazar' then update offers set status = 'rechazada', updated_at = mk_today() where id = o.id; return jsonb_build_object('ok', true); end if;
  return mk_err('Acción desconocida.');
end $$;

create or replace function public.mk_deal_step(p_offer uuid, p_step text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype; l listings%rowtype; uid uuid := auth.uid(); is_seller boolean; is_buyer boolean;
begin
  select * into o from offers where id = p_offer for update;
  if not found or o.status <> 'aceptada' then return mk_err('No hay un acuerdo en curso.'); end if;
  select * into l from listings where id = o.listing_id for update;
  is_seller := l.seller_id = uid; is_buyer := o.buyer_id = uid;
  if not is_seller and not is_buyer then return mk_err('No participas en este acuerdo.'); end if;
  if p_step = 'entregar' and is_seller and o.deal = 'acordado' then
    update offers set deal = 'entregada', updated_at = mk_today() where id = o.id; return jsonb_build_object('ok', true);
  end if;
  if p_step = 'recibir' and is_buyer and o.deal in ('acordado','entregada') then
    update offers set deal = 'recibida', received_at = mk_today(), updated_at = mk_today() where id = o.id;
    update listings set status = 'vendida', sold_at = mk_today(), sold_price = o.amount, buyer_id = o.buyer_id, buyer_name = o.buyer_name, updated_at = mk_today() where id = l.id;
    update offers set status = 'no concretada', updated_at = mk_today() where listing_id = l.id and status = 'en espera';
    return jsonb_build_object('ok', true);
  end if;
  if p_step = 'cancelar' and o.deal is distinct from 'recibida' then
    update offers set status = 'cancelada', deal = null, cancelled_by = case when is_seller then 'vende' else 'compra' end, updated_at = mk_today() where id = o.id;
    update listings set status = 'publicada', deal_offer_id = null, updated_at = mk_today() where id = l.id;
    update offers set status = 'pendiente', updated_at = mk_today() where listing_id = l.id and status = 'en espera';
    return jsonb_build_object('ok', true);
  end if;
  return mk_err('Ese paso no corresponde ahora.');
end $$;

create or replace function public.mk_review(p_offer uuid, p_stars int, p_tags text[], p_comment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o offers%rowtype;
begin
  select * into o from offers where id = p_offer;
  if not found or o.buyer_id is distinct from auth.uid() or o.deal is distinct from 'recibida' then return mk_err('Solo opina quien recibió la prenda.'); end if;
  if exists (select 1 from reviews where offer_id = o.id) then return mk_err('Ya dejaste tu opinión.'); end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then return mk_err('Elige de 1 a 5 estrellas.'); end if;
  insert into reviews (offer_id, listing_id, from_id, from_name, to_id, stars, tags, comment)
  values (o.id, o.listing_id, o.buyer_id, o.buyer_name, o.seller_id, p_stars,
          coalesce((select array_agg(t) from unnest(p_tags) t where t in ('Como se describió','Puntual','Buena comunicación','Bien cuidada')), '{}'),
          left(coalesce(p_comment, ''), 280));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mk_mark_synced(p_listing uuid) returns jsonb
language sql security definer set search_path = public as $$
  update listings set seller_synced = true where id = p_listing and seller_id = auth.uid() returning jsonb_build_object('ok', true);
$$;
create or replace function public.mk_mark_added(p_offer uuid, p_item text) returns jsonb
language sql security definer set search_path = public as $$
  update offers set added_item_id = left(p_item, 40) where id = p_offer and buyer_id = auth.uid() returning jsonb_build_object('ok', true);
$$;

create or replace function public.mk_report(p_listing uuid, p_reason text, p_detail text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if auth.uid() is null then return mk_err('Inicia sesión para reportar.'); end if;
  select seller_id into v_user from listings where id = p_listing;
  if (select count(*) from reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then return mk_err('Demasiados reportes hoy.'); end if;
  insert into reports (listing_id, reported_user, reporter_id, reason, detail) values (p_listing, v_user, auth.uid(), left(p_reason, 60), left(coalesce(p_detail, ''), 500));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mk_block(p_user uuid, p_on boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then return mk_err('No se pudo bloquear.'); end if;
  if p_on then insert into blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
  else delete from blocks where blocker_id = auth.uid() and blocked_id = p_user; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Eliminar la cuenta (y todo lo asociado, en cascada) ----------
create or replace function public.delete_my_account() returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return mk_err('not_authenticated'); end if;
  update listings set status = 'retirada' where seller_id = uid and status = 'publicada';
  delete from auth.users where id = uid;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Permisos ----------
-- La vitrina solo se lee y se cambia por las funciones mk_* (así los contactos nunca se filtran).
revoke all on public.profiles, public.wardrobes, public.listings, public.listing_contacts, public.offers, public.reviews, public.reports, public.blocks from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;
grant select, insert, update on public.wardrobes to authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.wardrobe_get(), public.wardrobe_save(jsonb, bigint, boolean), public.mk_snapshot(), public.mk_publish(jsonb),
  public.mk_set_price(uuid, int), public.mk_withdraw(uuid), public.mk_offer(uuid, numeric, text, text, text), public.mk_respond(uuid, text, int),
  public.mk_buyer_respond(uuid, text), public.mk_deal_step(uuid, text), public.mk_review(uuid, int, text[], text), public.mk_mark_synced(uuid),
  public.mk_mark_added(uuid, text), public.mk_report(uuid, text, text), public.mk_block(uuid, boolean), public.delete_my_account(),
  public.mk_today(), public.mk_err(text), public.mk_district_ok(text) to authenticated;
