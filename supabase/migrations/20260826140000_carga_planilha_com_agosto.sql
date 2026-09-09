-- Recarga da planilha "Controle de Lançamentos.xlsx" incluindo
-- Desembaraço/Agosto (3.438.483,54), confirmado pelo usuário.
--
-- O valor não aparece na aba de detalhe DESEMBARAÇO — ela soma 1.187.452,59 no
-- total e o bloco de agosto não tem fechamento. Entra aqui porque o usuário
-- confirmou que o número está certo; a aba de detalhe simplesmente não é a
-- origem dele.
--
-- Com agosto, Desembaraço vai a 154,34% da meta e o grupo passa de 100%.
--
-- ATENÇÃO: rode com o cron do monday-sync desligado. O sync apaga o ano inteiro
-- antes de gravar e desfaz esta carga.

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
  (2026, 'desembaraco', 7, 180716.03),
  (2026, 'desembaraco', 8, 3438483.54)
on conflict (ano, setor, mes) do update set valor = excluded.valor;

-- Conferência: transporte 899.808,74 · agenciamento 1.913.760,48 ·
-- desembaraco 4.115.750,79 · total 6.929.320,01 (101,90% de 6.800.000).
