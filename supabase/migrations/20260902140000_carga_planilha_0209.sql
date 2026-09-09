-- Carga da planilha "Controle de Lançamentos (1).xlsx", salva em 02/09 13:11.
-- Leitura apenas da aba "Acompanhamento anual", como combinado.
--
-- Agosto foi lançado nos três setores desde a carga anterior:
--   transporte    96.079,64 -> 132.764,79   (+36.685,15)
--   agenciamento 187.070,24 -> 255.697,30   (+68.627,06)
--   desembaraco 3.438.483,54 -> 3.588.661,25 (+150.177,71)
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
  (2026, 'transporte', 8, 132764.79),
  (2026, 'agenciamento', 1, 262513.06),
  (2026, 'agenciamento', 2, 166704.32),
  (2026, 'agenciamento', 3, 133668.74),
  (2026, 'agenciamento', 4, 383964.21),
  (2026, 'agenciamento', 5, 175973.13),
  (2026, 'agenciamento', 6, 218612.85),
  (2026, 'agenciamento', 7, 385253.93),
  (2026, 'agenciamento', 8, 255697.30),
  (2026, 'desembaraco', 1, 62778.06),
  (2026, 'desembaraco', 2, 92513.38),
  (2026, 'desembaraco', 3, 161389.96),
  (2026, 'desembaraco', 4, 65563.36),
  (2026, 'desembaraco', 5, 67206.68),
  (2026, 'desembaraco', 6, 47099.78),
  (2026, 'desembaraco', 7, 180716.03),
  (2026, 'desembaraco', 8, 3588661.25)
on conflict (ano, setor, mes) do update set valor = excluded.valor;

-- Conferência: transporte 1.032.573,53 · agenciamento 1.982.387,54 ·
-- desembaraco 4.265.928,50 · total 7.280.889,57 (107,07% de 6.800.000).
