-- Carga a partir da planilha "Controle de Lançamentos.xlsx" (OneDrive),
-- enquanto o sync do monday está pausado.
--
-- Duas diferenças em relação ao que o monday tinha, ambas conferidas nas abas
-- de detalhe da própria planilha:
--
--   Desembaraço/Julho  180.716,03  (o monday tinha 66.070,18, lançamento pela
--                                   metade; a aba DESEMBARAÇO fecha o mês em
--                                   180.716,03 na coluna de total)
--   Agenciamento/Agosto 187.070,24 (mês novo, total do bloco de agosto)
--
-- Desembaraço/Agosto fica de fora de propósito. A planilha traz 3.438.483,54
-- naquela célula, e a aba de detalhe inteira — todos os meses, todas as
-- colunas — soma 1.187.452,59. O valor é impossível; o mês entra quando a
-- célula for corrigida.
--
-- ATENÇÃO: rode isto DEPOIS de desligar o cron do monday-sync. O sync apaga o
-- ano inteiro antes de gravar, então uma rodada dele desfaz esta carga.

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
  (2026, 'agenciamento', 8, 187070.24),
  (2026, 'desembaraco', 1, 62778.06),
  (2026, 'desembaraco', 2, 92513.38),
  (2026, 'desembaraco', 3, 161389.96),
  (2026, 'desembaraco', 4, 65563.36),
  (2026, 'desembaraco', 5, 67206.68),
  (2026, 'desembaraco', 6, 47099.78),
  (2026, 'desembaraco', 7, 180716.03)
on conflict (ano, setor, mes) do update set valor = excluded.valor;

-- Conferência: transporte 899.808,74 · agenciamento 1.913.760,48 ·
-- desembaraco 677.267,25 · total 3.490.836,47 (51,34% de 6.800.000).
