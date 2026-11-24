create function public.dining_staff(action text, payload jsonb default '{}') returns jsonb language plpgsql
security definer set search_path='' as $$
<<operation>>
declare r uuid; role_name text; actor uuid:=auth.uid(); t dining.tables; target dining.tables;
 s dining.sessions; dest dining.sessions; o dining.orders; k dining.tickets; base dining.tickets;
 id_arg uuid; pin_code text; qr_code text; reason text; items jsonb; line jsonb; prior jsonb;
 step text; idx text; count_arg integer; outcome jsonb:='{}'; config jsonb;
begin
 if action='memberships' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'role',m.role))
   from dining.staff m join dining.restaurant x on x.id=m.restaurant_id where m.user_id=actor and m.active),'[]');
 end if;
 r:=(payload->>'restaurant')::uuid;
 select role into role_name from dining.staff where restaurant_id=r and user_id=actor and active;
 if not found then raise exception 'Staff access required' using errcode='42501'; end if;
 if action not in ('floor','kds','admin','history') then
  perform pg_advisory_xact_lock(hashtextextended(r::text,0));
  select role into role_name from dining.staff where restaurant_id=r and user_id=actor and active;
  if not found then raise exception 'Staff access required' using errcode='42501'; end if;
 end if;
 id_arg:=(payload->>'id')::uuid;
 reason:=nullif(btrim(payload->>'reason'),'');
 if length(reason)>250 then raise exception 'Reason is too long'; end if;

 if action='kds' then
  return coalesce((select jsonb_agg(to_jsonb(kot)-'restaurant_id'||jsonb_build_object('table',dt.label) order by kot.number)
   from dining.tickets kot join dining.orders ord on (ord.restaurant_id,ord.id)=(kot.restaurant_id,kot.order_id)
   join dining.sessions visit on (visit.restaurant_id,visit.id)=(ord.restaurant_id,ord.session_id)
   join dining.tables dt on (dt.restaurant_id,dt.id)=(visit.restaurant_id,visit.table_id)
   where kot.restaurant_id=r and visit.status in ('active','billing')),'[]');
 end if;
 if action='ticket' then
  select * into k from dining.tickets where restaurant_id=r and id=id_arg;
  select * into o from dining.orders where restaurant_id=r and id=k.order_id;
  select * into s from dining.sessions where restaurant_id=r and id=o.session_id for update;
  if k.id is null or s.status not in ('active','billing') then raise exception 'Ticket is unavailable'; end if;
  step:=payload->>'step';
  if step='acknowledge' and role_name in ('kitchen','manager') and k.kind<>'original' then
   update dining.tickets set acknowledged=true where restaurant_id=r and id=k.id;
  else
   idx:=payload->>'line';
   if not exists(select 1 from jsonb_array_elements(k.items) a where a->>'line'=idx) or k.kind='cancellation' then
    raise exception 'Unknown ticket item';
   end if;
   if dining.remaining(r,k.order_id,idx)<=0 then raise exception 'This item is fully cancelled'; end if;
   prior:=to_jsonb(coalesce(k.states->>idx,'new'));
   if not coalesce((step='preparing' and prior='"new"' and role_name in ('kitchen','manager'))
    or (step='ready' and prior='"preparing"' and role_name in ('kitchen','manager'))
    or (step='served' and prior='"ready"' and role_name in ('waiter','manager')),false) then
     raise exception 'Invalid kitchen status transition' using errcode='42501';
   end if;
   update dining.tickets set states=jsonb_set(states,array[idx],to_jsonb(step)) where restaurant_id=r and id=k.id;
  end if;
  perform dining.log(r,action,k.id,jsonb_build_object('step',step,'line',idx));
  return '{}';
 end if;

 if role_name='kitchen' then raise exception 'Kitchen access is limited to KDS' using errcode='42501'; end if;
 if action='floor' then
  return dining.catalog(r)||jsonb_build_object('tables',coalesce((
   select jsonb_agg(jsonb_build_object('id',dt.id,'label',dt.label,'capacity',dt.capacity,'assigned',dt.waiter,
    'session',case when visit.id is not null then to_jsonb(visit)-'pin'-'restaurant_id' end,
    'orders',case when visit.id is not null then dining.order_view(r,visit.id) else '[]'::jsonb end,
    'requests',coalesce((select jsonb_agg(to_jsonb(req)-'restaurant_id') from dining.requests req
     where req.restaurant_id=r and req.session_id=visit.id and req.resolved_at is null),'[]'),
    'bill',(select to_jsonb(b)-'restaurant_id' from dining.bills b where b.restaurant_id=r and b.session_id=visit.id),
    'totals',dining.totals(dining.bill_lines(r,visit.id))) order by dt.label)
   from dining.tables dt left join dining.sessions visit on visit.restaurant_id=r and visit.table_id=dt.id and visit.status in ('active','billing')
   where dt.restaurant_id=r and dt.active and (role_name='manager' or coalesce(visit.waiter,dt.waiter,actor)=actor)),'[]'));
 end if;
 if action='scan' then
  select * into t from dining.tables where restaurant_id=r and active and qr=extensions.digest(payload->>'qr','sha256');
  if not found or (role_name='waiter' and t.waiter is not null and t.waiter<>actor) then raise exception 'Table is unavailable'; end if;
  return jsonb_build_object('id',t.id);
 end if;

 if action in ('admin','history','table','category','menu','settings','staff','qr','revoke_qr') then
  if role_name<>'manager' then raise exception 'Manager access required' using errcode='42501'; end if;
  config:=coalesce(payload->'data','{}');
  if action='admin' then
   return dining.catalog(r)||jsonb_build_object(
    'archived',coalesce((select jsonb_agg(to_jsonb(x)-'restaurant_id' order by name) from dining.menu x where restaurant_id=r and archived),'[]'),
    'tables',coalesce((select jsonb_agg(to_jsonb(x)-'restaurant_id'-'qr'||jsonb_build_object('has_qr',qr is not null) order by label) from dining.tables x where restaurant_id=r),'[]'),
    'staff',coalesce((select jsonb_agg(to_jsonb(x)-'restaurant_id'||jsonb_build_object('email',u.email)) from dining.staff x join auth.users u on u.id=x.user_id where x.restaurant_id=r),'[]'));
  elsif action='history' then
   return jsonb_build_object(
   'sales',coalesce((select jsonb_agg(day) from (
    select (paid_at at time zone rr.timezone)::date as date,sum((totals->>'total')::bigint) as total,count(*) as bills
    from dining.bills b join dining.restaurant rr on b.restaurant_id=rr.id where restaurant_id=r and paid_at is not null
    group by 1 order by 1 desc limit 30) day),'[]'),
   'bills',coalesce((select jsonb_agg(to_jsonb(b)-'restaurant_id') from (select * from dining.bills where restaurant_id=r order by finalized_at desc limit 50) b),'[]'),
   'visits',coalesce((select jsonb_agg(to_jsonb(v)) from (select id,table_id,status,guests,opened_at,closed_at
    from dining.sessions where restaurant_id=r order by opened_at desc limit 50) v),'[]'),
   'items',coalesce((select jsonb_agg(x) from (
    select a->>'name' as name,sum(greatest(0,(a->>'quantity')::int)) as ordered,
    sum(greatest(0,-(a->>'quantity')::int)) as cancelled
    from dining.tickets rpt cross join lateral jsonb_array_elements(rpt.items) a
    where restaurant_id=r and rpt.created_at>now()-interval '30 days' group by 1 order by 1) x),'[]'),
   'timing',coalesce((select jsonb_agg(x) from (select id,created_at,approved_at from dining.orders
    where restaurant_id=r and approved_at is not null order by approved_at desc limit 50) x),'[]'),
   'audit',coalesce((select jsonb_agg(to_jsonb(a)-'restaurant_id') from
     (select * from dining.audit where restaurant_id=r order by created_at desc limit 50) a),'[]'));
  elsif action='table' then
   if config->>'waiter' is not null and not exists(select 1 from dining.staff where restaurant_id=r and
      user_id=(config->>'waiter')::uuid and role='waiter' and active) then raise exception 'Choose an active waiter'; end if;
   if not coalesce((config->>'active')::boolean,true) and exists(select 1 from dining.sessions
     where restaurant_id=r and table_id=id_arg and status in ('active','billing')) then raise exception 'Close active visit first'; end if;
   insert into dining.tables(restaurant_id,id,label,capacity,active,waiter) values(r,coalesce(id_arg,gen_random_uuid()),
    btrim(config->>'label'),(config->>'capacity')::integer,coalesce((config->>'active')::boolean,true),(config->>'waiter')::uuid)
   on conflict(restaurant_id,id) do update set label=excluded.label,capacity=excluded.capacity,
    active=excluded.active,waiter=excluded.waiter returning id into id_arg;
  elsif action='category' then
   insert into dining.categories values(r,coalesce(id_arg,gen_random_uuid()),btrim(config->>'name'),coalesce((config->>'position')::integer,0))
   on conflict(restaurant_id,id) do update set name=excluded.name,position=excluded.position returning id into id_arg;
  elsif action='menu' then
   perform dining.validate_options(coalesce(config->'variants','[]'),coalesce(config->'groups','[]'));
   if length(coalesce(config->>'description',''))>500 or length(coalesce(config->>'image',''))>500 or
     (coalesce(config->>'image','')<>'' and config->>'image' !~ '^(https://|/food/[a-z-]+\.webp$)') then
    raise exception 'Use an HTTPS image URL and a shorter description';
   end if;
   insert into dining.menu(restaurant_id,id,category,name,description,image,diet,station,price,available,archived,variants,groups)
   values(r,coalesce(id_arg,gen_random_uuid()),(config->>'category')::uuid,btrim(config->>'name'),coalesce(config->>'description',''),
   coalesce(config->>'image',''),config->>'diet',coalesce(nullif(btrim(config->>'station'),''),'Kitchen'),(config->>'price')::integer,
   coalesce((config->>'available')::boolean,true),coalesce((config->>'archived')::boolean,false),coalesce(config->'variants','[]'),coalesce(config->'groups','[]'))
   on conflict(restaurant_id,id) do update set category=excluded.category,name=excluded.name,description=excluded.description,
   image=excluded.image,diet=excluded.diet,station=excluded.station,price=excluded.price,available=excluded.available,
   archived=excluded.archived,variants=excluded.variants,groups=excluded.groups,revision=dining.menu.revision+1 returning id into id_arg;
  elsif action='settings' then
   if not exists(select 1 from pg_timezone_names where name=config->>'timezone') then raise exception 'Enter an IANA time zone'; end if;
   if exists(select 1 from dining.orders where restaurant_id=r) and exists(
      select 1 from dining.restaurant where id=r and currency is distinct from config->>'currency') then
    raise exception 'Currency cannot change after taking orders';
   end if;
   update dining.restaurant set name=btrim(config->>'name'),tax=(config->>'tax')::integer,hours=(config->>'hours')::integer,
    currency=config->>'currency',timezone=config->>'timezone' where id=r;
   update public.dining_updates set changed_at=clock_timestamp() where restaurant_id=r;
  elsif action='staff' then
   select id into id_arg from auth.users where lower(email)=lower(btrim(config->>'email'));
   if not found then raise exception 'Create or invite this user in Supabase Auth first'; end if;
   if id_arg=actor then raise exception 'A different manager must change your membership'; end if;
   if exists(select 1 from dining.sessions where restaurant_id=r and waiter=id_arg and status in ('active','billing'))
    and (config->>'role'='kitchen' or not coalesce((config->>'active')::boolean,true)) then
    raise exception 'This staff member has active tables';
   end if;
   insert into dining.staff values(r,id_arg,config->>'role',coalesce((config->>'active')::boolean,true))
   on conflict(restaurant_id,user_id) do update set role=excluded.role,active=excluded.active;
   if config->>'role'<>'waiter' or not coalesce((config->>'active')::boolean,true) then
    update dining.tables set waiter=null where restaurant_id=r and waiter=id_arg;
   end if;
  else
   if action='qr' then qr_code:=encode(extensions.gen_random_bytes(24),'hex'); end if;
   update dining.tables set qr=extensions.digest(qr_code,'sha256') where restaurant_id=r and id=id_arg;
   if not found then raise exception 'Table not found'; end if;
   if qr_code is not null then outcome:=jsonb_build_object('qr',qr_code); end if;
  end if;
  perform dining.log(r,action,id_arg);
  return outcome;
 end if;

 if action='open' then
  select * into t from dining.tables where restaurant_id=r and id=id_arg and active;
  if not found or (role_name='waiter' and t.waiter is not null and t.waiter<>actor) then raise exception 'Table is unavailable'; end if;
  count_arg:=(payload->>'guests')::integer;
  if count_arg is null or count_arg not between 1 and t.capacity then raise exception 'Guest count exceeds table capacity'; end if;
  pin_code:=dining.new_pin();
  insert into dining.sessions(restaurant_id,table_id,waiter,guests,pin,expires)
   select r,t.id,coalesce(t.waiter,actor),count_arg,dining.pin(pin_key,pin_code),now()+make_interval(hours=>hours)
   from dining.restaurant where id=r returning * into s;
  perform dining.log(r,action,s.id);
  return jsonb_build_object('pin',pin_code);
 end if;

 select * into s from dining.sessions where restaurant_id=r and id=(payload->>'session')::uuid for update;
 if not found or (role_name='waiter' and s.waiter<>actor) then raise exception 'Table assignment required' using errcode='42501'; end if;
 if action='settle' and exists(select 1 from dining.bills where restaurant_id=r and session_id=s.id
  and paid_at is not null and method=payload->>'method') then return '{}'; end if;
 if s.status not in ('active','billing') then raise exception 'Visit is closed'; end if;
 if s.status='billing' and action not in ('settle','resolve') then raise exception 'This bill has been finalized'; end if;
 if action in ('edit','approve','reject','amend') then
  select * into o from dining.orders where restaurant_id=r and session_id=s.id and id=id_arg for update;
  if not found then raise exception 'Order not found'; end if;
  if action='approve' and o.status='approved' then return '{}'; end if;
  if o.version is distinct from (payload->>'version')::integer then raise exception 'Order changed. Refresh before continuing.'; end if;
  if (action='amend' and o.status<>'approved') or (action<>'amend' and o.status<>'pending') then raise exception 'Order status changed'; end if;
 end if;

 if action in ('open','rotate','transfer','merge') then
  pin_code:=dining.new_pin();
  if action in ('transfer','merge') then
   select * into target from dining.tables where restaurant_id=r and id=id_arg and active and id<>s.table_id;
   if not found or (role_name='waiter' and target.waiter is not null and target.waiter<>actor) then raise exception 'Target table is unavailable'; end if;
   select * into dest from dining.sessions where restaurant_id=r and table_id=target.id and status in ('active','billing') for update;
   if action='transfer' then
    if dest.id is not null or s.guests>target.capacity then raise exception 'Choose a vacant table with enough seats'; end if;
    update dining.sessions set table_id=target.id,waiter=coalesce(target.waiter,s.waiter) where restaurant_id=r and id=s.id;
   else
    if role_name<>'manager' or reason is null then raise exception 'Manager and reason required'; end if;
    if dest.id is null or dest.status<>'active' or s.guests+dest.guests>target.capacity then raise exception 'Choose an active table with enough seats'; end if;
    update dining.orders set status='rejected',reason='Tables merged. Ask your waiter to retake this order.'
     where restaurant_id=r and session_id in (s.id,dest.id) and status='pending';
    update dining.orders set session_id=dest.id where restaurant_id=r and session_id=s.id;
    update dining.requests set resolved_at=now() where restaurant_id=r and session_id=s.id and resolved_at is null;
    update dining.sessions set status='merged',closed_at=now(),merged_into=dest.id,version=version+1,pin=null where restaurant_id=r and id=s.id;
    update dining.sessions set guests=guests+s.guests where restaurant_id=r and id=dest.id;
   end if;
  end if;
  update dining.sessions v set pin=dining.pin(rr.pin_key,pin_code),version=v.version+1,expires=now()+make_interval(hours=>rr.hours)
   from dining.restaurant rr where rr.id=r and v.restaurant_id=r and v.id=coalesce(dest.id,s.id);
  if action='transfer' then
   update dining.orders set confirmed=version where restaurant_id=r and session_id=s.id and status='pending' and customer is null;
   update dining.orders set status='rejected',reason='Table transferred. Please reorder from your new table.'
    where restaurant_id=r and session_id=s.id and status='pending' and customer is not null;
  end if;
  delete from dining.attempts where restaurant_id=r and session_id=coalesce(dest.id,s.id);
  if action='rotate' then
   update dining.orders set status='rejected',reason='PIN rotated. Please resubmit the revised order.'
    where restaurant_id=r and session_id=s.id and status='pending' and confirmed<>version;
  end if;
  outcome:=jsonb_build_object('pin',pin_code);
 elsif action in ('manual','approve') then
  if (payload->>'physical')::boolean is distinct from true then raise exception 'Confirm the order in person'; end if;
  if action='manual' then
   id_arg:=(payload->>'request')::uuid;
   select * into o from dining.orders where restaurant_id=r and session_id=s.id and request=id_arg;
   if found then
    if o.customer is not null then raise exception 'Request already exists'; end if;
    return '{}';
   end if;
   items:=dining.quote(r,payload->'items');
   insert into dining.orders(restaurant_id,session_id,origin_session,created_by,items,request) values(r,s.id,s.id,actor,items,id_arg) returning * into o;
  elsif o.confirmed<>o.version then raise exception 'Wait for the diner to confirm the revision';
  end if;
  update dining.orders set status='approved',approved_by=actor,approved_at=now() where restaurant_id=r and id=o.id;
  insert into dining.tickets(restaurant_id,order_id,kind,items) values(r,o.id,'original',o.items);
  id_arg:=o.id;
 elsif action='edit' then
  items:=dining.quote(r,payload->'items');
  update dining.orders set items=operation.items,version=version+1
   where restaurant_id=r and id=o.id;
 elsif action='reject' then
  if reason is null then raise exception 'Enter a rejection reason'; end if;
  update dining.orders set status='rejected',reason=operation.reason,version=version+1 where restaurant_id=r and id=o.id;
 elsif action='amend' then
  if reason is null then raise exception 'Enter an amendment reason'; end if;
  select * into base from dining.tickets where restaurant_id=r and order_id=o.id and kind='original';
  step:=payload->>'kind';
  if step='addition' then
   if (payload->>'physical')::boolean is distinct from true then raise exception 'Confirm the addition in person'; end if;
   items:=dining.quote(r,payload->'items');
  elsif step='cancellation' then
   idx:=payload->>'line'; count_arg:=(payload->>'quantity')::integer;
   select a,ticket.states->>idx into line,step from dining.tickets ticket cross join lateral jsonb_array_elements(ticket.items) a
    where ticket.restaurant_id=r and ticket.order_id=o.id and ticket.kind<>'cancellation' and a->>'line'=idx;
   if line is null or count_arg is null or count_arg<1 then raise exception 'Choose a quantity to cancel'; end if;
   if coalesce(step,'new')<>'new' and role_name<>'manager' then raise exception 'Manager required after preparation starts'; end if;
   if count_arg>dining.remaining(r,o.id,idx) then raise exception 'Cancellation exceeds remaining quantity'; end if;
   items:=jsonb_build_array(jsonb_set(line,'{quantity}',to_jsonb(-count_arg)));
   step:='cancellation';
  else raise exception 'Unknown amendment'; end if;
  insert into dining.tickets(restaurant_id,order_id,original,kind,items,reason) values(r,o.id,base.id,step,items,reason);
  update dining.orders set version=version+1 where restaurant_id=r and id=o.id;
 elsif action='resolve' then
  update dining.requests set resolved_at=now() where restaurant_id=r and session_id=s.id and id=id_arg and resolved_at is null;
 elsif action='finalize' then
  if exists(select 1 from dining.orders where restaurant_id=r and session_id=s.id and status='pending') then raise exception 'Resolve pending orders before finalizing'; end if;
  count_arg:=coalesce((payload->>'discount')::integer,0);
  if count_arg<0 or (count_arg>0 and role_name<>'manager') then raise exception 'Only managers can apply discounts'; end if;
  items:=dining.bill_lines(r,s.id);
  insert into dining.bills(restaurant_id,session_id,lines,totals) values(r,s.id,items,dining.totals(items,count_arg));
  update dining.sessions set status='billing' where restaurant_id=r and id=s.id;
 elsif action='settle' then
  step:=payload->>'method';
  if step is null or step not in ('cash','upi','card') or (payload->>'physical')::boolean is distinct from true then
   raise exception 'Confirm payment was received and choose a method';
  end if;
  update dining.bills set method=step,paid_at=now() where restaurant_id=r and session_id=s.id and paid_at is null;
  if not found then raise exception 'Bill is missing or paid'; end if;
  update dining.sessions set status='closed',closed_at=now(),pin=null,version=version+1 where restaurant_id=r and id=s.id;
 elsif action='close' then
  if role_name<>'manager' or reason is null then raise exception 'Manager and reason required'; end if;
  if exists(select 1 from dining.orders where restaurant_id=r and session_id=s.id and status in ('pending','approved')) then
   raise exception 'Resolve orders and settle the bill before closing';
  end if;
  update dining.sessions set status='closed',closed_at=now(),pin=null,version=version+1 where restaurant_id=r and id=s.id;
 else raise exception 'Unknown staff action';
 end if;
 perform dining.log(r,action,coalesce(id_arg,s.id),jsonb_strip_nulls(jsonb_build_object('session',s.id,'from_table',case when target.id is not null then s.table_id end,'target',target.id,'reason',reason)));
 return outcome;
end $$;
revoke all on function public.dining_staff(text,jsonb) from public, anon, authenticated;
grant execute on function public.dining_staff(text,jsonb) to authenticated;
