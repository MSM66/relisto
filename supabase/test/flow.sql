\set ON_ERROR_STOP on
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', 'ana@x.com', '{"name":"Ana"}'),
 ('22222222-2222-2222-2222-222222222222', 'beto@x.com', '{"name":"Beto"}'),
 ('33333333-3333-3333-3333-333333333333', 'cata@x.com', '{"name":"Cata"}') on conflict do nothing;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
set role authenticated;
-- Ana: armario
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'save1', wardrobe_save('{"items":[1]}', null);
select 'save-conflict', wardrobe_save('{"items":[2]}', 7);
select 'save2', wardrobe_save('{"items":[1,2]}', 1);
select 'get', wardrobe_get()->'version', wardrobe_get()->'data';
select 'profiles visible', count(*) from profiles;
-- Ana publica
select 'bad price', mk_publish('{"price":0,"district":"Lince","delivery":["recojo"]}');
select 'bad district', mk_publish('{"price":50,"district":"Narnia","delivery":["recojo"]}');
select set_config('t.l', (mk_publish('{"itemId":"MI001","price":80,"district":"Barranco","delivery":["recojo"],"snap":{"name":"Casaca"},"contact":"WA 999"}')->>'id'), false);
select 'dup', mk_publish('{"itemId":"MI001","price":80,"district":"Barranco","delivery":["recojo"]}');
select 'own offer', mk_offer(current_setting('t.l')::uuid, 60);
-- Beto: no ve armario de Ana, oferta
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select 'beto sees wardrobe rows', count(*) from wardrobes;
select 'beto direct insert blocked?';
do $$ begin begin insert into listings (seller_id, price, district) values (auth.uid(), 5, 'Lince'); raise notice 'INSERT ALLOWED (bad)'; exception when others then raise notice 'insert denied ok: %', sqlstate; end; end $$;
do $$ begin begin update wardrobes set data = '{}' where true; raise notice 'update rows ok (own only)'; exception when others then raise notice 'denied %', sqlstate; end; end $$;
select 'low', mk_offer(current_setting('t.l')::uuid, 5);
select set_config('t.o', (mk_offer(current_setting('t.l')::uuid, 60, 'hola', 'beto IG', 'Miraflores')->>'id'), false);
select 'contact hidden to beto before deal', (mk_snapshot()->'listings'->0->>'contact');
-- Cata oferta también
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select set_config('t.o2', (mk_offer(current_setting('t.l')::uuid, 70)->>'id'), false);
select 'cata sees beto offer?', jsonb_array_length(mk_snapshot()->'offers');
-- Ana contraoferta a Beto
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'beto contact hidden to ana before accept', mk_snapshot()->'offers' @> '[{"contact":"beto IG"}]';
select 'bad counter', mk_respond(current_setting('t.o')::uuid, 'contraofertar', 90);
select 'counter', mk_respond(current_setting('t.o')::uuid, 'contraofertar', 72);
-- Beto acepta contraoferta
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select 'accept', mk_buyer_respond(current_setting('t.o')::uuid, 'aceptar');
select 'contact visible to beto', (select x->>'contact' from jsonb_array_elements(mk_snapshot()->'listings') x where x->>'id' = current_setting('t.l'));
select 'early review', mk_review(current_setting('t.o')::uuid, 5, '{}', '');
-- Ana entrega
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'beto contact visible to ana', mk_snapshot()->'offers' @> '[{"contact":"beto IG"}]';
select 'deliver', mk_deal_step(current_setting('t.o')::uuid, 'entregar');
select 'ana cannot receive', mk_deal_step(current_setting('t.o')::uuid, 'recibir');
-- Beto recibe y opina
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select 'receive', mk_deal_step(current_setting('t.o')::uuid, 'recibir');
select 'review', mk_review(current_setting('t.o')::uuid, 4, '{Puntual,inventada}', 'bien');
select 'twice', mk_review(current_setting('t.o')::uuid, 5, '{}', '');
select 'added', mk_mark_added(current_setting('t.o')::uuid, 'MI009');
reset role;
select 'STATE', l.status, l.sold_price, (select status from offers where id = current_setting('t.o2')::uuid) as cata_offer, (select tags from reviews limit 1) from listings l;
set role authenticated;
-- Bloqueo y reporte
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select set_config('t.l2', (mk_publish('{"itemId":"C1","price":40,"district":"Lince","delivery":["delivery"]}')->>'id'), false);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select 'beto sees cata listing', mk_snapshot()->'listings' @> jsonb_build_array(jsonb_build_object('id', current_setting('t.l2')));
select 'report', mk_report(current_setting('t.l2')::uuid, 'Estafa o pago por adelantado', 'pidió adelanto');
select 'block', mk_block('33333333-3333-3333-3333-333333333333');
select 'beto sees cata listing after block', mk_snapshot()->'listings' @> jsonb_build_array(jsonb_build_object('id', current_setting('t.l2')));
select 'offer to blocked', mk_offer(current_setting('t.l2')::uuid, 40);
do $$ begin begin perform count(*) from reports; raise notice 'REPORTS READABLE (bad)'; exception when others then raise notice 'reports private ok'; end; end $$;
-- Borrar cuenta de Cata
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'delete', delete_my_account();
reset role;
select 'users left', count(*) from auth.users; select 'cata listings left', count(*) from listings where seller_id = '33333333-3333-3333-3333-333333333333';
set role anon;
do $$ begin begin perform wardrobe_get(); raise notice 'ANON CAN CALL (bad)'; exception when others then raise notice 'anon denied ok'; end; end $$;
do $$ begin begin perform count(*) from listings; raise notice 'ANON CAN READ (bad)'; exception when others then raise notice 'anon read denied ok'; end; end $$;
