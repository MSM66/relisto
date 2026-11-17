-- Beta privada: código de invitación obligatorio al registrarse y comentarios desde la app.
create table if not exists public.beta_settings (id int primary key default 1 check (id = 1), invite_required boolean not null default true);
insert into public.beta_settings (id, invite_required) values (1, true) on conflict (id) do nothing;
create table if not exists public.beta_invites (
  code text primary key,
  max_uses int not null default 25,
  used int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.beta_invites (code, max_uses) values ('RELISTO-BETA', 25) on conflict (code) do nothing;
alter table public.beta_settings enable row level security;
alter table public.beta_invites enable row level security;
revoke all on public.beta_settings, public.beta_invites from anon, authenticated;

create or replace function public.beta_check_invite(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select not (select invite_required from beta_settings where id = 1)
      or exists (select 1 from beta_invites where code = upper(trim(p_code)) and active and used < max_uses);
$$;

create or replace function public.beta_enforce_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'invite', '')));
begin
  if not (select invite_required from beta_settings where id = 1) then return new; end if;
  update beta_invites set used = used + 1 where code = v_code and active and used < max_uses;
  if not found then raise exception 'invite_required: codigo de invitacion no valido'; end if;
  return new;
end $$;
drop trigger if exists beta_invite_check on auth.users;
create trigger beta_invite_check before insert on auth.users for each row execute function public.beta_enforce_invite();

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  rating int check (rating between 1 and 5),
  kind text not null default 'comentario' check (char_length(kind) <= 30),
  message text not null default '' check (char_length(message) <= 2000),
  screen text not null default '' check (char_length(screen) <= 60),
  app_version text not null default '' check (char_length(app_version) <= 40),
  device text not null default '' check (char_length(device) <= 160),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

create or replace function public.send_feedback(p_rating int, p_kind text, p_message text, p_screen text, p_version text, p_device text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_rating, 0) = 0 and coalesce(trim(p_message), '') = '' then return jsonb_build_object('error', 'Cuéntanos algo o elige una carita.'); end if;
  if (select count(*) from feedback where created_at > now() - interval '1 minute') > 60 then return jsonb_build_object('error', 'Muchos comentarios a la vez. Intenta en un momento.'); end if;
  insert into feedback (user_id, rating, kind, message, screen, app_version, device)
  values (auth.uid(), case when p_rating between 1 and 5 then p_rating end, left(coalesce(p_kind, 'comentario'), 30), left(coalesce(p_message, ''), 2000), left(coalesce(p_screen, ''), 60), left(coalesce(p_version, ''), 40), left(coalesce(p_device, ''), 160));
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.beta_enforce_invite() from public, anon, authenticated;
revoke execute on function public.beta_check_invite(text), public.send_feedback(int, text, text, text, text, text) from public;
grant execute on function public.beta_check_invite(text), public.send_feedback(int, text, text, text, text, text) to anon, authenticated;
