-- Remove a tabela de negócios do RD Station.
--
-- A fonte do painel é o quadro do monday.com, não o CRM: a conta do RD tinha 7
-- negócios ganhos somando R$ 38 mil, contra os R$ 3,1 milhões do quadro. A
-- tabela nunca recebeu um registro real.
--
-- `realizado_manual` continua com o nome de origem, mas hoje quem escreve nela
-- é o sync do monday (/api/public/monday-sync), que substitui o ano inteiro a
-- cada rodada.

drop view if exists public.realizado_mensal;

drop table if exists public.negocio;

create or replace view public.realizado_mensal with (security_invoker = true) as
select ano, setor, mes, valor
from public.realizado_manual;
