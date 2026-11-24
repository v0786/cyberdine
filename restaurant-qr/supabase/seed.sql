insert into dining.restaurant(id,name,tax) values('11111111-1111-4111-8111-111111111111','{ RESTAURANT NAME }',500);
insert into dining.tables(restaurant_id,label,capacity)
select '11111111-1111-4111-8111-111111111111','Table '||lpad(n::text,2,'0'),case when n>7 then 8 else 4 end from generate_series(1,10) n;
insert into dining.categories(restaurant_id,id,name,position) values
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','Small plates',1),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Main course',2),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222223','Drinks',3);
insert into dining.menu(restaurant_id,category,name,description,diet,station,price,variants,groups)
select '11111111-1111-4111-8111-111111111111',('22222222-2222-4222-8222-22222222222'||cat)::uuid,
 name,description,diet,station,price,variants::jsonb,groups::jsonb from (values
('1','Paneer Tikka','Charred paneer, peppers and mint chutney.','veg','Kitchen',24900,'[]','[]'),
('1','Chicken 65','Crisp chicken tossed with curry leaves and chilli.','non-veg','Kitchen',29900,'[]','[]'),
('2','Dal Tadka','Yellow lentils with cumin and garlic tempering.','veg','Kitchen',21900,'[]','[{"name":"Sides","min":0,"max":2,"options":[{"name":"Jeera rice","delta":9900},{"name":"Butter roti","delta":4500}]}]'),
('2','Chicken Biryani','Basmati rice, spiced chicken and cool raita.','non-veg','Kitchen',32900,'[{"name":"Regular","delta":0},{"name":"Large","delta":12000}]','[]'),
('3','Kokum Cooler','Tart kokum with lemon and roasted cumin.','veg','Bar',12900,'[]','[]'),
('3','Masala Chaas','Chilled buttermilk with coriander and cumin.','veg','Bar',9900,'[]','[]')
) x(cat,name,description,diet,station,price,variants,groups);
