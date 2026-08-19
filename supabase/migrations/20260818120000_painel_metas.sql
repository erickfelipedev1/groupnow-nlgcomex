-- Painel de Metas — Grupo Now
-- Metas e realizado por setor/mês, alimentado pelo webhook do RD Station CRM.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'setor_painel') then
    create type public.setor_painel as enum ('transporte', 'agenciamento', 'desembaraco');
  end if;
end $$;

-- Meta anual do grupo. É de propósito menor que a soma das metas por setor:
-- as metas setoriais são esticadas.
create table if not exists public.meta_ano (
  ano int primary key,
  meta_global numeric(14, 2) not null check (meta_global > 0),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.meta_setor (
  ano int not null references public.meta_ano (ano) on delete cascade,
  setor public.setor_painel not null,
  meta numeric(14, 2) not null check (meta > 0),
  primary key (ano, setor)
);

-- Base histórica lançada à mão (o que não veio do CRM).
create table if not exists public.realizado_manual (
  ano int not null,
  setor public.setor_painel not null,
  mes int not null check (mes between 1 and 12),
  valor numeric(14, 2) not null default 0,
  primary key (ano, setor, mes)
);

-- Negócios ganhos vindos do RD Station CRM.
-- external_id = id do negócio no RD. O RD redispara o webhook a cada alteração,
-- então o upsert por essa chave atualiza a linha em vez de somar de novo.
create table if not exists public.negocio (
  external_id text primary key,
  ano int not null,
  mes int not null check (mes between 1 and 12),
  setor public.setor_painel not null,
  valor numeric(14, 2) not null default 0,
  nome text,
  funil text,
  fechado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create index if not exists negocio_competencia_idx on public.negocio (ano, setor, mes);

-- Realizado exibido = base manual + negócios do CRM.
-- security_invoker: a view respeita a RLS de quem consulta, em vez de rodar
-- com os privilégios do dono e furar a proteção das tabelas abaixo.
create or replace view public.realizado_mensal with (security_invoker = true) as
select ano, setor, mes, sum(valor)::numeric(14, 2) as valor
from (
  select ano, setor, mes, valor from public.realizado_manual
  union all
  select ano, setor, mes, valor from public.negocio
) t
group by ano, setor, mes;

-- RLS ligada e sem policy nenhuma: só a service role (servidor) enxerga.
-- O painel lê pelo servidor; o navegador nunca fala direto com estas tabelas.
alter table public.meta_ano enable row level security;
alter table public.meta_setor enable row level security;
alter table public.realizado_manual enable row level security;
alter table public.negocio enable row level security;

-- Metas de 2026
insert into public.meta_ano (ano, meta_global) values (2026, 30600000)
on conflict (ano) do update set meta_global = excluded.meta_global;

insert into public.meta_setor (ano, setor, meta) values
  (2026, 'transporte', 12000000),
  (2026, 'agenciamento', 12000000),
  (2026, 'desembaraco', 12000000)
on conflict (ano, setor) do update set meta = excluded.meta;

-- Base histórica jan–mai/2026 (o que hoje está no painel atual)
insert into public.realizado_manual (ano, setor, mes, valor) values
  (2026, 'transporte',   1,  769200), (2026, 'transporte',   2,  466800),
  (2026, 'transporte',   3,  427200), (2026, 'transporte',   4,  524400),
  (2026, 'transporte',   5,  702000),
  (2026, 'agenciamento', 1, 1180800), (2026, 'agenciamento', 2,  750000),
  (2026, 'agenciamento', 3,  601200), (2026, 'agenciamento', 4, 1728000),
  (2026, 'agenciamento', 5,  792000),
  (2026, 'desembaraco',  1,  282000), (2026, 'desembaraco',  2,  416400),
  (2026, 'desembaraco',  3,  726000), (2026, 'desembaraco',  4,  295200),
  (2026, 'desembaraco',  5,  302400)
on conflict (ano, setor, mes) do update set valor = excluded.valor;
