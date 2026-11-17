-- La foto de una publicación se muestra solo cuando terminó de subirse.
create or replace function public.mk_photo_ready(p_listing uuid) returns jsonb
language sql security definer set search_path = public as $$
  update listings set has_photo = true where id = p_listing and seller_id = auth.uid() returning jsonb_build_object('ok', true);
$$;
revoke execute on function public.mk_photo_ready(uuid) from public, anon;
grant execute on function public.mk_photo_ready(uuid) to authenticated;
