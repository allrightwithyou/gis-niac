-- Sections seed (generated from data.ts). ASCII only: safe to copy and paste in any terminal.
-- Replaces ALL sections (map_tools is not touched).
begin;
truncate sections restart identity cascade;

insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (1, E'\u0410\u0433\u0440\u043E\u043F\u0440\u043E\u043C\u044B\u0448\u043B\u0435\u043D\u043D\u044B\u0439 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0441', E'\u0410\u041F\u041A', E'\u0421\u0435\u043B\u044C\u0441\u043A\u043E\u0435 \u0445\u043E\u0437\u044F\u0439\u0441\u0442\u0432\u043E', E'12 \u0441\u043B\u043E\u0451\u0432', E'/apk.svg', E'#7CB34240', 0);
insert into section_maps (section_id, resource_id, position) values (1, 262, 0) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (1, 522, 1) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (2, E'\u0420\u0435\u0441\u0443\u0440\u0441\u044B', E'\u0420\u0435\u0441\u0443\u0440\u0441\u044B', E'\u041F\u0440\u0438\u0440\u043E\u0434\u043D\u044B\u0435 \u0440\u0435\u0441\u0443\u0440\u0441\u044B', E'22 \u0441\u043B\u043E\u044F', E'/resources.svg', E'#8D6E6340', 1);
insert into section_maps (section_id, resource_id, position) values (2, 226, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (3, E'\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u0441\u043F\u043E\u0440\u0442', E'\u0421\u043E\u0446', E'\u0418\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430', E'312 \u0443\u0447\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0439', E'/social.svg', E'#42A5F540', 2);
insert into section_maps (section_id, resource_id, position) values (3, 254, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (4, E'\u042D\u043A\u043E\u043B\u043E\u0433\u0438\u044F', E'\u042D\u043A\u043E', E'\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0441\u0440\u0435\u0434\u044B', E'47 \u043F\u043E\u0441\u0442\u043E\u0432', E'/eco.svg', E'#26A69A40', 3);
insert into section_maps (section_id, resource_id, position) values (4, 531, 0) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (4, 532, 1) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (4, 579, 2) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (4, 520, 3) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (4, 1117, 4) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (5, E'\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442', E'\u0422\u0440\u0430\u043D\u0441', E'\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442\u043D\u0430\u044F \u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430', E'1 284 \u043E\u0431\u044A\u0435\u043A\u0442\u0430', E'/bus.svg', E'#78909C40', 4);
insert into section_maps (section_id, resource_id, position) values (5, 714, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (6, E'\u041A\u0443\u043B\u044C\u0442\u0443\u0440\u0430', E'\u041A\u0443\u043B\u044C\u0442\u0443\u0440\u0430', E'\u041A\u0443\u043B\u044C\u0442\u0443\u0440\u0430 \u0438 \u0442\u0443\u0440\u0438\u0437\u043C', E'76 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432', E'/culture.svg', E'#AB47BC40', 5);
insert into section_maps (section_id, resource_id, position) values (6, 384, 0) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (6, 389, 1) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (6, 1024, 2) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (7, E'\u0413\u0435\u043A\u0442\u0430\u0440 \u0432 \u0410\u0440\u043A\u0442\u0438\u043A\u0435', E'\u0410\u0440\u043A\u0442\u0438\u043A\u0430', E'\u0417\u0435\u043C\u0435\u043B\u044C\u043D\u044B\u0435 \u0443\u0447\u0430\u0441\u0442\u043A\u0438', E'2 388 \u0443\u0447\u0430\u0441\u0442\u043A\u043E\u0432', E'/arctica.svg', E'#4DD0E140', 6);
insert into section_maps (section_id, resource_id, position) values (7, 498, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (8, E'\u0414\u0430\u043D\u043D\u044B\u0435 \u0414\u0417\u0417', E'\u0414\u0417\u0417', E'\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u043E\u043D\u043D\u043E\u0435 \u0437\u043E\u043D\u0434\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435', E'5.2 \u0422\u0411 \u0434\u0430\u043D\u043D\u044B\u0445', E'/dzz.svg', E'#5C6BC040', 7);
insert into section_maps (section_id, resource_id, position) values (8, 466, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (9, E'\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u0438 \u0441\u0432\u044F\u0437\u044C', E'\u0418\u0422', E'\u0426\u0438\u0444\u0440\u043E\u0432\u0430\u044F \u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430', E'18 \u0443\u0437\u043B\u043E\u0432', E'/it.svg', E'#29B6F640', 8);
insert into section_maps (section_id, resource_id, position) values (9, 1049, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (10, E'\u0417\u0434\u0440\u0430\u0432\u043E\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435', E'\u041C\u0435\u0434', E'\u041C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u043E\u0431\u044A\u0435\u043A\u0442\u044B', E'63 \u0443\u0447\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F', E'/med.svg', E'#EF535040', 9);
insert into section_maps (section_id, resource_id, position) values (10, 1041, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (11, E'\u0421\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E', E'\u0421\u0442\u0440\u043E\u0439', E'\u0413\u0440\u0430\u0434\u043E\u0441\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E', E'34 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0438', E'/build.svg', E'#FFA72640', 10);
insert into section_maps (section_id, resource_id, position) values (11, 1054, 0) on conflict do nothing;
insert into sections (id, name, short_name, category, statistic, img, shadow_color, position) values (12, E'\u041C\u0443\u043D\u0438\u0446\u0438\u043F\u0430\u043B\u044C\u043D\u044B\u0435 \u043E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u044F', E'\u041C\u041E', E'\u0422\u0435\u0440\u0440\u0438\u0442\u043E\u0440\u0438\u0438 \u0438 \u043C\u0443\u043D\u0438\u0446\u0438\u043F\u0430\u043B\u0438\u0442\u0435\u0442\u044B', E'28 \u0441\u043B\u0443\u0436\u0431', E'/mo.svg', E'#D4E15740', 11);
insert into section_maps (section_id, resource_id, position) values (12, 966, 0) on conflict do nothing;
insert into section_maps (section_id, resource_id, position) values (12, 641, 1) on conflict do nothing;

select setval(pg_get_serial_sequence('sections', 'id'), (select max(id) from sections));
commit;
