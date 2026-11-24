create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema dining;
revoke all on schema dining from public, anon, authenticated;

create table dining.restaurant (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 1 and 100),
 currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
 timezone text not null default 'Asia/Kolkata',
 tax integer not null default 0 check(tax between 0 and 10000),
 hours integer not null default 8 check(hours between 1 and 24),
 pin_key bytea not null default extensions.gen_random_bytes(32)
);
create table dining.staff (
 restaurant_id uuid references dining.restaurant,
 user_id uuid references auth.users,
 role text not null check(role in ('waiter','kitchen','manager')),
 active boolean not null default true,
 primary key(restaurant_id,user_id)
);
create table dining.tables (
 restaurant_id uuid references dining.restaurant, id uuid default gen_random_uuid(),
 label text not null check(length(label) between 1 and 40),
 capacity integer not null check(capacity between 1 and 100),
 active boolean not null default true, qr bytea unique,
 waiter uuid,
 primary key(restaurant_id,id), unique(restaurant_id,label),
 foreign key(restaurant_id,waiter) references dining.staff
);
create table dining.categories (
 restaurant_id uuid references dining.restaurant, id uuid default gen_random_uuid(),
 name text not null check(length(name) between 1 and 80),
 position integer not null default 0,
 primary key(restaurant_id,id)
);
create table dining.menu (
 restaurant_id uuid references dining.restaurant, id uuid default gen_random_uuid(),
 category uuid not null, name text not null check(length(name) between 1 and 100),
 description text not null default '', image text not null default '',
 diet text not null check(diet in ('veg','non-veg')), station text not null default 'Kitchen',
 price integer not null check(price between 0 and 10000000),
 available boolean not null default true, archived boolean not null default false,
 variants jsonb not null default '[]', groups jsonb not null default '[]',
 revision integer not null default 1,
 primary key(restaurant_id,id),
 foreign key(restaurant_id,category) references dining.categories
);
create table dining.sessions (
 restaurant_id uuid references dining.restaurant, id uuid default gen_random_uuid(),
 table_id uuid not null, waiter uuid not null, guests integer not null check(guests between 1 and 100),
 status text not null default 'active' check(status in ('active','billing','closed','merged')),
 opened_at timestamptz not null default now(), closed_at timestamptz,
 pin bytea, version integer not null default 1, expires timestamptz not null,
 merged_into uuid,
 primary key(restaurant_id,id),
 foreign key(restaurant_id,table_id) references dining.tables,
 foreign key(restaurant_id,waiter) references dining.staff,
 foreign key(restaurant_id,merged_into) references dining.sessions
);
create unique index one_visit on dining.sessions(restaurant_id,table_id) where status in ('active','billing');
create table dining.customers (
 restaurant_id uuid not null, id uuid default gen_random_uuid(), session_id uuid not null,
 digest bytea not null unique, version integer not null, expires timestamptz not null,
 primary key(restaurant_id,id),
 foreign key(restaurant_id,session_id) references dining.sessions
);
create table dining.attempts (
 restaurant_id uuid not null, session_id uuid not null, requester text not null,
 window_at timestamptz not null default now(), count integer not null default 1,
 primary key(restaurant_id,session_id,requester),
 foreign key(restaurant_id,session_id) references dining.sessions
);
create table dining.orders (
 restaurant_id uuid not null, id uuid default gen_random_uuid(), session_id uuid not null,
 origin_session uuid not null, customer uuid, created_by uuid, approved_by uuid,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 version integer not null default 1, confirmed integer not null default 1,
 reason text, items jsonb not null, request uuid not null,
 created_at timestamptz not null default now(), approved_at timestamptz,
 primary key(restaurant_id,id), unique(restaurant_id,session_id,request),
 foreign key(restaurant_id,session_id) references dining.sessions,
 foreign key(restaurant_id,origin_session) references dining.sessions,
 foreign key(restaurant_id,customer) references dining.customers
);
create table dining.tickets (
 restaurant_id uuid not null, id uuid default gen_random_uuid(),
 number bigint generated always as identity, order_id uuid not null, original uuid,
 kind text not null check(kind in ('original','addition','cancellation')),
 items jsonb not null, states jsonb not null default '{}', reason text,
 acknowledged boolean not null default false, created_at timestamptz not null default now(),
 primary key(restaurant_id,id),
 foreign key(restaurant_id,order_id) references dining.orders,
 foreign key(restaurant_id,original) references dining.tickets
);
create unique index one_original on dining.tickets(restaurant_id,order_id) where kind='original';
create table dining.bills (
 restaurant_id uuid not null, session_id uuid not null,
 lines jsonb not null, totals jsonb not null, finalized_at timestamptz not null default now(),
 method text check(method in ('cash','upi','card')), paid_at timestamptz,
 primary key(restaurant_id,session_id),
 foreign key(restaurant_id,session_id) references dining.sessions
);
create table dining.requests (
 restaurant_id uuid not null, id uuid default gen_random_uuid(), session_id uuid not null,
 kind text not null check(kind in ('waiter','bill')), created_at timestamptz not null default now(),
 resolved_at timestamptz,
 primary key(restaurant_id,id),
 foreign key(restaurant_id,session_id) references dining.sessions
);
create unique index open_request on dining.requests(restaurant_id,session_id,kind) where resolved_at is null;
create table dining.audit (
 restaurant_id uuid references dining.restaurant, id uuid primary key default gen_random_uuid(),
 actor uuid, action text not null, entity uuid, details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index orders_visit on dining.orders(restaurant_id,session_id,created_at);
create index tickets_order on dining.tickets(restaurant_id,order_id);
create index requests_visit on dining.requests(restaurant_id,session_id);
create index audit_recent on dining.audit(restaurant_id,created_at desc);

do $$
declare t text;
begin
 for t in select tablename from pg_catalog.pg_tables where schemaname='dining' loop
   execute format('alter table dining.%I enable row level security',t);
 end loop;
end $$;

create table public.dining_updates (
 restaurant_id uuid primary key references dining.restaurant,
 changed_at timestamptz not null default now()
);
alter table public.dining_updates enable row level security;
revoke all on public.dining_updates from public, anon, authenticated;
grant select on public.dining_updates to authenticated;

create function public.dining_member(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from dining.staff where restaurant_id=rid and user_id=auth.uid() and active)
$$;
revoke all on function public.dining_member(uuid) from public, anon, authenticated;
grant execute on function public.dining_member(uuid) to authenticated;
create policy dining_updates_members on public.dining_updates for select to authenticated using(public.dining_member(restaurant_id));
do $$ begin
 if exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.dining_updates;
 end if;
end $$;

create function dining.bump() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.dining_updates(restaurant_id) values(new.restaurant_id)
 on conflict(restaurant_id) do update set changed_at=clock_timestamp();
 return new;
end $$;
do $$
declare t text;
begin
 foreach t in array array['sessions','orders','tickets','bills','requests','menu','categories','tables','staff'] loop
  execute format('create trigger dining_changed after insert or update on dining.%I for each row execute function dining.bump()',t);
 end loop;
end $$;
