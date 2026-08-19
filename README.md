# Grupo Now Goals

Crie a tela do "Painel de Metas do Grupo Now" — um dashboard de uma página só,

tema escuro, feito para ficar aberto numa TV do escritório.




**Muito importante:** não calcule nada e não invente dados. Todos os números já

vêm prontos de `GET /api/public/painel`, que essa rota já existe no projeto.

Não crie mock, não crie outra fonte de dados, não recalcule percentual.




O JSON é assim:




```json

{

  "ano": 2026,

  "atualizadoEm": "2026-08-18T20:42:25.172Z",

  "metaGlobal": 30600000,

  "realizadoAno": 9963600,

  "progressoGlobal": 32.56,

  "progressoGlobalMensal": [7.29, 5.34, 5.73, 8.33, 5.87, 0, 0, 0, 0, 0, 0, 0],

  "setores": [

    {

      "id": "transporte",

      "nome": "Transporte",

      "cor": "#f2c94c",

      "metaAnual": 12000000,

      "realizadoAno": 2889600,

      "progressoAnual": 24.08,

      "progressoMensal": [6.41, 3.89, 3.56, 4.37, 5.85, 0, 0, 0, 0, 0, 0, 0],

      "representatividade": 29.0

    }

  ]

}

```




`setores` sempre traz três itens, nesta ordem: Transporte, Agenciamento,

Desembaraço. Os arrays mensais têm sempre 12 posições (índice 0 = janeiro).

Todo valor terminado em "progresso" ou "representatividade" já é percentual.




## Layout




Cabeçalho: título "Painel de Metas do Grupo Now" e, embaixo em texto pequeno e

apagado, "Meta global {ano}: {metaGlobal} · realizado {realizadoAno} ·

atualizado em {atualizadoEm}". Valores em reais formatados pt-BR sem centavos

(R$ 30.600.000); percentuais com duas casas e vírgula (32,56%).




Três faixas, todas com cartões de cantos arredondados, borda sutil e fundo um

tom acima do fundo da página:




1. **Quatro cartões de KPI**, lado a lado. O primeiro é o global ("Meta Anual",

   `progressoGlobal`, cinza `#cbd5e1`); os outros três são

   "Meta Anual – {nome}" com `progressoAnual` e a `cor` do próprio setor. Cada

   cartão: bolinha da cor + título no topo, percentual gigante em fonte leve no

   centro, uma barrinha de progresso fininha e, embaixo, "{realizadoAno} de

   {metaAnual}" em texto pequeno.




2. **Três painéis**:

   - "Progresso Anual Individual – Dividido por Setor" — barras horizontais com

     `progressoAnual` de cada setor, cada barra na cor do setor, ordenadas da

     menor para a maior, com o valor escrito na ponta da barra.

   - "Representatividade do Progresso Anual Dividido por Setor" — rosca

     (donut) com `representatividade`, legenda à direita no formato

     "Agenciamento: 50,7%".

   - "Progresso Mensal da Meta Anual" — barras verticais dos 12 meses com

     `progressoGlobalMensal`, em cinza `#cbd5e1`, valor escrito acima de cada

     barra.




3. **Um painel por setor** (Transporte, Agenciamento, Desembaraço), lado a lado:

   barras verticais dos 12 meses com o `progressoMensal` do setor, na cor dele,

   valor acima de cada barra e o percentual anual no canto do cabeçalho.




Gráficos com Recharts. Eixos e rótulos em cinza-azulado apagado, fontes

pequenas (10–11px), sem grid pesado, sem animação de entrada (o painel fica

recarregando na TV). Meses abreviados (Jan, Fev, …) inclinados a -45°.




Responsivo: em telas estreitas os cartões empilham em uma coluna.




Paleta: fundo `#0d1526`, cartão `#16203a`, borda `#24334f`, texto `#e8eefb`,

texto apagado `#8ea3c4`. Transporte `#f2c94c`, Agenciamento `#4aa3f0`,

Desembaraço `#a78bfa` (mas prefira sempre a `cor` que vem no JSON).




A tela deve se atualizar sozinha a cada 5 minutos, refazendo o fetch.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://groupnow-nlgcomex.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f76da35-afbf-4a23-a414-e874bf416329).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
