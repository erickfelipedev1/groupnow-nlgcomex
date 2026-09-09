-- Releitura de "Controle de Lançamentos (1).xlsx" (27/08, 18:05).
--
-- Novidade: Transporte/Agosto 96.079,64 — a aba TRANSPORTE ganhou o bloco de
-- agosto, que fecha nesse valor (L207).
--
-- Agenciamento/Agosto entra como 208.830,59, e NÃO como os 187.070,24 que
-- estão na aba "Acompanhamento anual" deste arquivo: a aba de detalhe
-- AGENCIAMENTO fecha agosto em 208.830,59 (L190), e os dois arquivos concordam
-- nisso. O consolidado é que não foi atualizado depois do detalhe.
--
-- ATENÇÃO: rode com o cron do monday-sync desligado.

delete from public.realizado_manual where ano = 2026;

insert into public.realizado_manual (ano, setor, mes, valor) values
  (2026, 'transporte', 1, 170912.09),
  (2026, 'transporte', 2, 103814.95),
  (2026, 'transporte', 3, 94809.45),
  (2026, 'transporte', 4, 116491.07),
  (2026, 'transporte', 5, 155975.01),
  (2026, 'transporte', 6, 160591.37),
  (2026, 'transporte', 7, 97214.80),
  (2026, 'transporte', 8, 96079.64),
  (2026, 'agenciamento', 1, 262513.06),
  (2026, 'agenciamento', 2, 166704.32),
  (2026, 'agenciamento', 3, 133668.74),
  (2026, 'agenciamento', 4, 383964.21),
  (2026, 'agenciamento', 5, 175973.13),
  (2026, 'agenciamento', 6, 218612.85),
  (2026, 'agenciamento', 7, 385253.93),
  (2026, 'agenciamento', 8, 208830.59),
  (2026, 'desembaraco', 1, 62778.06),
  (2026, 'desembaraco', 2, 92513.38),
  (2026, 'desembaraco', 3, 161389.96),
  (2026, 'desembaraco', 4, 65563.36),
  (2026, 'desembaraco', 5, 67206.68),
  (2026, 'desembaraco', 6, 47099.78),
  (2026, 'desembaraco', 7, 180716.03),
  (2026, 'desembaraco', 8, 3438483.54)
on conflict (ano, setor, mes) do update set valor = excluded.valor;
