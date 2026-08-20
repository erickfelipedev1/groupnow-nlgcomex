-- Margem mensal por unidade de negócio, sincronizada do quadro
-- "Indicador de Margem - Bruno" (board 18427319518, coluna numeric_mm6c9hk5).
--
-- Fica em tabela própria, separada do realizado: é outro corte da empresa
-- (NLG, Jornada 4S, NDL...), não os setores do painel, e é percentual, não
-- reais. Juntar os dois na mesma tabela só criaria confusão de unidade.
--
-- `unidade` é texto livre porque, ao contrário dos setores, as unidades não
-- são um conjunto fechado — grupo novo no quadro entra sozinho.
--
-- Margem pode ser negativa (a Jornada 4S teve -265,1% em abril/2026), então
-- não há check de valor mínimo.

create table if not exists public.margem (
  ano int not null,
  unidade text not null,
  mes int not null check (mes between 1 and 12),
  valor numeric(8, 2) not null,
  atualizado_em timestamptz not null default now(),
  primary key (ano, unidade, mes)
);

create index if not exists margem_ano_idx on public.margem (ano);

-- Mesma proteção das outras tabelas do painel: RLS ligada e sem policy, só a
-- service role no servidor lê ou escreve.
alter table public.margem enable row level security;
