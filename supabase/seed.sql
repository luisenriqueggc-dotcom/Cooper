-- Opcional: catálogos de ejemplo, no estructura oficial de Skandia.
insert into public.areas(name) values ('Comunicación'),('Talento'),('Marketing') on conflict(name) do nothing;
insert into public.business_lines(name) values ('Corporativo') on conflict(name) do nothing;
-- No se insertan usuarios ni tareas de demostración en producción.
