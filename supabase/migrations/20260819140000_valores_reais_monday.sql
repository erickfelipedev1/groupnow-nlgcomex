-- Substitui os valores provisórios pelos reais, lidos do quadro
-- "Metas do Grupo Now" no monday.com (board 18399927931).
--
-- Os números anteriores foram deduzidos de um print que só mostrava
-- percentuais: os percentuais estavam certos, mas a escala em reais estava
-- 4,5x maior que a real. Esta migration corrige a escala e acrescenta junho e
-- julho, que ainda não existiam no painel.
--
-- No monday: grupo = setor, item = mês, coluna numeric_mm0gmsgs = faturamento,
-- numeric_mm0hmpzk = meta anual do setor, numeric_mm15gwvr = meta global.

update public.meta_ano set meta_global = 6800000, atualizado_em = now() where ano = 2026;

update public.meta_setor set meta = 2666666 where ano = 2026;

-- Fora com a base provisória de jan–mai.
delete from public.realizado_manual where ano = 2026;

-- Faturamento real, jan–jul/2026. Desembaraço não tem julho lançado no monday,
-- então o mês fica ausente (a view soma como zero).
insert into public.realizado_manual (ano, setor, mes, valor) values
  (2026, 'agenciamento', 1, 262513.06),
  (2026, 'agenciamento', 2, 166704.32),
  (2026, 'agenciamento', 3, 133668.74),
  (2026, 'agenciamento', 4, 383964.21),
  (2026, 'agenciamento', 5, 175973.13),
  (2026, 'agenciamento', 6, 218612.85),
  (2026, 'agenciamento', 7, 385253.93),
  (2026, 'transporte',   1, 170912.09),
  (2026, 'transporte',   2, 103814.95),
  (2026, 'transporte',   3,  94809.45),
  (2026, 'transporte',   4, 116491.07),
  (2026, 'transporte',   5, 155975.01),
  (2026, 'transporte',   6, 160591.37),
  (2026, 'transporte',   7,  97214.80),
  (2026, 'desembaraco',  1,  62778.06),
  (2026, 'desembaraco',  2,  92513.38),
  (2026, 'desembaraco',  3, 161389.96),
  (2026, 'desembaraco',  4,  65563.36),
  (2026, 'desembaraco',  5,  67206.68),
  (2026, 'desembaraco',  6,  47099.78)
on conflict (ano, setor, mes) do update set valor = excluded.valor;

-- Conferência: deve dar agenciamento 1.726.690,24 · transporte 899.808,74 ·
-- desembaraco 496.551,22, e 3.123.050,20 no total (45,93% de 6.800.000).
