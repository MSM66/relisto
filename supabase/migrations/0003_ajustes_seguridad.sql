-- Funciones internas: no se pueden llamar desde la app.
revoke execute on function public.handle_new_user(), public.mk_blocked(uuid, uuid), public.mk_name(), public.mk_accept_internal(uuid) from authenticated, anon, public;
alter function public.mk_today() set search_path = public;
alter function public.mk_err(text) set search_path = public;
alter function public.mk_district_ok(text) set search_path = public;
