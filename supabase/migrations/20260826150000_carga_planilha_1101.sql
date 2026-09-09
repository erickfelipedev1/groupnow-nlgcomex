-- Releitura da planilha "Controle de Lançamentos.xlsx" (26/08, 11:01).
--
-- Única mudança desde a carga anterior: Agenciamento/Agosto passou de
-- 187.070,24 para 208.830,59 (+21.760,35). Todo o resto está idêntico.
--
-- ATENÇÃO: rode com o cron do monday-sync desligado — o sync apaga o ano
-- inteiro antes de gravar e desfaz esta carga.

delete from public.realizado_manual where ano = 2026;

insert into public.realizado_manual (ano, setor, mes, valor) values
  (2026, 'transporte', 1, 170912.09),
  (2026, 'transporte', 2, 103814.95),
  (2026, 'transporte', 3, 94809.45),
  (2026, 'transporte', 4, 116491.07),
  (2026, 'transporte', 5, 155975.01),
  (2026, 'transporte', 6, 160591.37),
  (2026, 'transporte', 7, 97214.80),
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

-- Conferência: transporte 899.808,74 · agenciamento 1.935.520,83 ·
-- desembaraco 4.115.750,79 · total 6.951.080,36 (102,22% de 6.800.000).
