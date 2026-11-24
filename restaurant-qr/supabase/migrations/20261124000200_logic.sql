create function dining.pin(key bytea, code text) returns bytea language sql immutable set search_path='' as $$
 select extensions.hmac(convert_to(code,'UTF8'),key,'sha256')
$$;
create function dining.new_pin() returns text language plpgsql set search_path='' as $$
declare b bytea; n integer;
begin
 loop
  b:=extensions.gen_random_bytes(2);
  n:=get_byte(b,0)*256+get_byte(b,1);
  if n<60000 then return lpad((n%10000)::text,4,'0'); end if;
 end loop;
end $$;

create function dining.catalog(r uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object(
 'restaurant',(select to_jsonb(x)-'pin_key' from dining.restaurant x where id=r),
 'categories',coalesce((select jsonb_agg(to_jsonb(x)-'restaurant_id' order by position,name) from dining.categories x where restaurant_id=r),'[]'),
 'menu',coalesce((select jsonb_agg(to_jsonb(x)-'restaurant_id' order by name) from dining.menu x where restaurant_id=r and not archived),'[]'))
$$;

create function dining.quote(r uuid, selections jsonb) returns jsonb language plpgsql set search_path='' as $$
declare m dining.menu; line jsonb; v jsonb; g jsonb; opt jsonb; choices jsonb;
 selected text; qty integer; unit integer; names jsonb; result jsonb:='[]'; tax_rate integer;
begin
 if jsonb_typeof(selections) is distinct from 'array' or jsonb_array_length(selections) not between 1 and 30 then
  raise exception 'Add between 1 and 30 cart lines';
 end if;
 select tax into tax_rate from dining.restaurant where id=r for share;
 for line in select value from jsonb_array_elements(selections) loop
  select * into m from dining.menu where restaurant_id=r and id=(line->>'id')::uuid for share;
  if not found or m.archived or not m.available then raise exception 'An item is unavailable. Refresh the menu.'; end if;
  if m.revision is distinct from (line->>'revision')::integer or tax_rate is distinct from (line->>'tax')::integer then
   raise exception 'Prices or menu options changed. Refresh and review your cart.';
  end if;
  qty:=(line->>'quantity')::integer;
  if qty is null or qty not between 1 and 20 or length(coalesce(line->>'notes',''))>250 then
   raise exception 'Check quantity and cooking notes';
  end if;
  unit:=m.price; v:=null; names:='[]';
  if jsonb_array_length(m.variants)>0 then
   select value into v from jsonb_array_elements(m.variants) where value->>'name'=line->>'variant';
   if not found then raise exception 'Choose a valid variant'; end if;
   unit:=unit+(v->>'delta')::integer;
  elsif coalesce(line->>'variant','')<>'' then raise exception 'Invalid variant';
  end if;
  if jsonb_typeof(coalesce(line->'choices','{}'))<>'object' then raise exception 'Invalid modifiers'; end if;
  if exists(select 1 from jsonb_object_keys(coalesce(line->'choices','{}')) k
            where not exists(select 1 from jsonb_array_elements(m.groups) a where a->>'name'=k)) then
   raise exception 'Invalid modifier group';
  end if;
  for g in select value from jsonb_array_elements(m.groups) loop
   choices:=coalesce(line->'choices'->(g->>'name'),'[]');
   if jsonb_typeof(choices)<>'array' or jsonb_array_length(choices) not between (g->>'min')::integer and (g->>'max')::integer
      or jsonb_array_length(choices)<>(select count(distinct value) from jsonb_array_elements_text(choices)) then
    raise exception 'Check selections for %',g->>'name';
   end if;
   for selected in select value from jsonb_array_elements_text(choices) loop
    select value into opt from jsonb_array_elements(g->'options') where value->>'name'=selected;
    if not found then raise exception 'Invalid modifier'; end if;
    unit:=unit+(opt->>'delta')::integer;
    names:=names||jsonb_build_array(opt);
   end loop;
  end loop;
  if unit not between 0 and 20000000 then raise exception 'Invalid item price'; end if;
  result:=result||jsonb_build_array(jsonb_build_object('line',gen_random_uuid(),'name',m.name,'station',m.station,
  'unit',unit,'tax',tax_rate,'modifiers',names,'selection',line,'quantity',qty,'variant',v->>'name','notes',coalesce(line->>'notes','')));
 end loop;
 return result;
end $$;

create function dining.bill_lines(r uuid,s uuid) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(value order by k.number, n),'[]') from dining.orders o
 join dining.tickets k on k.restaurant_id=o.restaurant_id and k.order_id=o.id
 cross join lateral jsonb_array_elements(k.items) with ordinality a(value,n)
 where o.restaurant_id=r and o.session_id=s and o.status='approved'
$$;

create function dining.totals(lines jsonb, discount integer default 0) returns jsonb language sql immutable set search_path='' as $$
 with sums as (
  select coalesce(sum((x->>'quantity')::bigint*(x->>'unit')::bigint),0) subtotal,
  coalesce(sum((x->>'quantity')::bigint*(x->>'unit')::bigint*(x->>'tax')::integer),0) tax_base
  from jsonb_array_elements(lines) x
 ), math as (
  select subtotal, least(greatest(discount,0),subtotal) off,
  coalesce(round(tax_base*(subtotal-least(greatest(discount,0),subtotal))/nullif(subtotal,0)/10000),0) tax from sums
 )
 select jsonb_build_object('subtotal',subtotal,'discount',off,'tax',tax,'rounding',0,'total',subtotal-off+tax) from math
$$;

create function dining.log(r uuid,act text,e uuid,d jsonb default '{}') returns void language sql set search_path='' as $$
 insert into dining.audit(restaurant_id,actor,action,entity,details) values(r,auth.uid(),act,e,d)
$$;

create function dining.order_view(r uuid,s uuid,c uuid default null) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'status',o.status,'items',o.items,'version',o.version,
 'confirmed',o.confirmed,'reason',o.reason,'created_at',o.created_at,'origin_session',o.origin_session,
 'tickets',coalesce((select jsonb_agg(jsonb_build_object('id',k.id,'number',k.number,'kind',k.kind,'items',k.items,
 'reason',k.reason,'states',k.states,'acknowledged',k.acknowledged,'created_at',k.created_at) order by k.number)
 from dining.tickets k where k.restaurant_id=r and k.order_id=o.id),'[]')) order by o.created_at desc),'[]')
 from dining.orders o where o.restaurant_id=r and o.session_id=s and (c is null or o.customer=c)
$$;

create function public.dining_customer(action text, payload jsonb default '{}') returns jsonb language plpgsql
 security definer set search_path='' as $$
declare t dining.tables; s dining.sessions; c dining.customers; o dining.orders; credential text;
 bucket text; hits integer; key bytea; items jsonb; request_id uuid; current_token text; amount jsonb;
begin
 if action='menu' then
  select * into t from dining.tables where active and qr=extensions.digest(payload->>'qr','sha256');
  if not found then return jsonb_build_object('error','This table QR is invalid or revoked.'); end if;
  return dining.catalog(t.restaurant_id)||jsonb_build_object('table',t.label);
 end if;
 current_token:=payload->>'token';
 if current_token is not null then
  select * into c from dining.customers where digest=extensions.digest(current_token,'sha256') and expires>now();
  if found then
   select * into s from dining.sessions where restaurant_id=c.restaurant_id and id=c.session_id;
   if action not in ('join','submit') then
    select * into s from dining.sessions where restaurant_id=c.restaurant_id and id=c.session_id for update;
   end if;
   if s.version<>c.version or s.status not in ('active','billing') or s.expires<=now() then c:=null; end if;
  end if;
 end if;
 if action in ('join','submit') then
  select * into t from dining.tables where active and qr=extensions.digest(payload->>'qr','sha256');
  if not found then return jsonb_build_object('error','This table QR is invalid or revoked.'); end if;
  select * into s from dining.sessions where restaurant_id=t.restaurant_id and table_id=t.id and status='active' for update;
  if not found or s.expires<=now() then return jsonb_build_object('error','Ask your waiter to open this table.'); end if;
  if c.session_id is distinct from s.id or c.version is distinct from s.version then c:=null; end if;
  -- The session-wide limit also applies when a requester changes devices or addresses.
  foreach bucket in array array['session','requester:'||coalesce(nullif(split_part(coalesce(
    nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for',''),',',1),''),'unknown')] loop
   insert into dining.attempts(restaurant_id,session_id,requester) values(s.restaurant_id,s.id,bucket)
   on conflict(restaurant_id,session_id,requester) do update set
    count=case when dining.attempts.window_at<=now()-interval '5 minutes' then 1 else least(dining.attempts.count+1,41) end,
    window_at=case when dining.attempts.window_at<=now()-interval '5 minutes' then now() else dining.attempts.window_at end
   returning count into hits;
   if hits>(case when bucket='session' then 40 else 8 end) then
    return jsonb_build_object('error','Too many PIN attempts. Wait five minutes or ask your waiter.');
   end if;
  end loop;
  select pin_key into key from dining.restaurant where id=s.restaurant_id;
  if coalesce(payload->>'pin','') !~ '^[0-9]{4}$' or s.pin is distinct from dining.pin(key,payload->>'pin') then
   return jsonb_build_object('error','Incorrect table PIN.');
  end if;
  delete from dining.attempts where restaurant_id=s.restaurant_id and session_id=s.id and requester=bucket;
  update dining.attempts set count=greatest(0,count-1)
   where restaurant_id=s.restaurant_id and session_id=s.id and requester='session';
  if action='submit' then
   request_id:=(payload->>'request')::uuid;
   if request_id is null then raise exception 'Missing request ID'; end if;
   select * into o from dining.orders where restaurant_id=s.restaurant_id and session_id=s.id and request=request_id;
   if found then
    if o.customer is distinct from c.id then raise exception 'Request already exists'; end if;
    return jsonb_build_object('token',current_token,'order',o.id);
   end if;
   items:=dining.quote(s.restaurant_id,payload->'items');
  end if;
  if c.id is null then
   credential:=encode(extensions.gen_random_bytes(32),'hex');
   insert into dining.customers(restaurant_id,session_id,digest,version,expires)
   values(s.restaurant_id,s.id,extensions.digest(credential,'sha256'),s.version,least(s.expires,now()+interval '3 hours')) returning * into c;
  else credential:=current_token;
  end if;
  if action='join' then return jsonb_build_object('token',credential); end if;
  insert into dining.orders(restaurant_id,session_id,origin_session,customer,items,request)
  values(s.restaurant_id,s.id,s.id,c.id,items,request_id) returning * into o;
  return jsonb_build_object('token',credential,'order',o.id);
 end if;
 if c.id is null then return jsonb_build_object('error','Table access expired. Scan the current QR and enter the PIN again.','expired',true); end if;
 if action='status' then
  select totals into amount from dining.bills where restaurant_id=s.restaurant_id and session_id=s.id;
  return jsonb_build_object('orders',dining.order_view(s.restaurant_id,s.id,c.id),
  'bill',coalesce(amount,dining.totals(dining.bill_lines(s.restaurant_id,s.id))));
 elsif action='confirm' then
  update dining.orders set confirmed=version where restaurant_id=s.restaurant_id and session_id=s.id and customer=c.id and
   id=(payload->>'id')::uuid and version=(payload->>'version')::integer and status='pending';
  if not found then raise exception 'The order changed. Refresh before confirming.'; end if;
 elsif action='request' then
  if exists(select 1 from dining.requests where restaurant_id=s.restaurant_id and session_id=s.id and kind=payload->>'kind'
    and created_at>now()-interval '1 minute') then raise exception 'Please give your waiter a moment'; end if;
  insert into dining.requests(restaurant_id,session_id,kind) values(s.restaurant_id,s.id,payload->>'kind') on conflict do nothing;
 else raise exception 'Unknown customer action';
 end if;
 return '{}';
end $$;
revoke all on function public.dining_customer(text,jsonb) from public, anon, authenticated;
grant execute on function public.dining_customer(text,jsonb) to anon, authenticated;

create function dining.validate_options(variants jsonb, groups jsonb) returns void language plpgsql set search_path='' as $$
declare g jsonb; options jsonb; entry jsonb;
begin
 if jsonb_typeof(variants) is distinct from 'array' or jsonb_typeof(groups) is distinct from 'array' then raise exception 'Options must be arrays'; end if;
 if jsonb_array_length(groups)>10 or jsonb_array_length(groups)<>(select count(distinct x->>'name') from jsonb_array_elements(groups) x) then
  raise exception 'Modifier groups must have unique names';
 end if;
 for g in select value from jsonb_array_elements(groups) loop
  if length(btrim(g->>'name')) not between 1 and 80 or jsonb_typeof(g->'options') is distinct from 'array'
    or (g->>'min')::int is null or (g->>'max')::int is null
    or (g->>'min')::int not between 0 and (g->>'max')::int or (g->>'max')::int>jsonb_array_length(g->'options') then
   raise exception 'Check modifier group name and selection limits';
  end if;
 end loop;
 for options in select variants union all select value->'options' from jsonb_array_elements(groups) loop
  if jsonb_array_length(options)>20 or jsonb_array_length(options)<>(select count(distinct x->>'name') from jsonb_array_elements(options) x) then
   raise exception 'Options must have unique names';
  end if;
  for entry in select value from jsonb_array_elements(options) loop
   if length(btrim(entry->>'name')) not between 1 and 80 or (entry->>'delta')::int is null or
     (entry->>'delta')::int not between 0 and 1000000 then raise exception 'Check option name and price'; end if;
  end loop;
 end loop;
end $$;

create function dining.remaining(r uuid, order_id uuid, line_id text) returns integer language sql stable set search_path='' as $$
 select coalesce(sum((a->>'quantity')::integer),0)::integer
 from dining.tickets t cross join lateral jsonb_array_elements(t.items) a
 where t.restaurant_id=r and t.order_id=$2 and a->>'line'=line_id
$$;
