import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis } from "recharts";
import { Percent, Target, TrendingDown, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Metas do Grupo Now" },
      {
        name: "description",
        content:
          "Dashboard em tempo real das metas anuais e mensais do Grupo Now por setor: Transporte, Agenciamento e Desembaraço.",
      },
      { property: "og:title", content: "Painel de Metas do Grupo Now" },
      {
        property: "og:description",
        content:
          "Acompanhe o progresso anual e mensal das metas do Grupo Now por setor em um painel único.",
      },
    ],
  }),
  component: Painel,
});

type Setor = {
  id: string;
  nome: string;
  cor: string;
  metaAnual: number;
  realizadoAno: number;
  progressoAnual: number;
  progressoMensal: number[];
  representatividade: number;
};

type PainelData = {
  ano: number;
  atualizadoEm: string;
  metaGlobal: number;
  realizadoAno: number;
  progressoGlobal: number;
  progressoGlobalMensal: number[];
  setores: Setor[];
  /** Margem mensal por unidade, em %. `null` = mês sem lançamento. */
  margem?: Record<string, (number | null)[]>;
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Tokens do Gentelella v4: sidebar escura, primária teal, fundo claro,
 * bordas finas e raio de 6px. A escala tipográfica é nossa — o original é um
 * admin de mesa (11–22px) e este painel é lido de longe, numa TV.
 */
const SIDEBAR = "#1a2332";
const PRIMARIA = "#1ABB9C";
const TEXTO = "#1e2633";
const MUDO = "#7e8896";
const BORDA = "#e6e7eb";
const VERMELHO = "#d63939";
const VERDE = "#2fb344";

/** Cores dos setores ajustadas para fundo claro (as da API foram feitas para o escuro). */
const COR_SETOR: Record<string, string> = {
  transporte: "#f59f00",
  agenciamento: "#066fd1",
  desembaraco: "#ae3ec9",
};

/** A margem é por unidade de negócio; o painel acompanha a da NLG. */
const UNIDADE_MARGEM = "NLG";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

/** Valor curto para os cartões: "R$ 3,19 mi" cabe onde o número cheio não caberia. */
const brlCurto = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
    : brl(v);

const pct = (v: number, casas = 1) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(v)}%`;

const hora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(iso));

/** Meses que ainda faltam fechar no ano do painel. */
function mesesRestantes(ano: number): number {
  const agora = new Date();
  if (agora.getFullYear() > ano) return 0;
  if (agora.getFullYear() < ano) return 12;
  return 12 - (agora.getMonth() + 1);
}

/** Cartão branco com borda fina e sombra quase invisível — o painel do Gentelella. */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className="rounded-md border bg-white shadow-[rgba(30,38,51,0.04)_0_2px_4px_0]"
      style={{ borderColor: BORDA }}
    >
      <div className={className}>{children}</div>
    </div>
  );
}

/** Cabeçalho de painel: título pequeno em caixa alta e borda embaixo. */
function TituloPainel({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3"
      style={{ borderColor: BORDA }}
    >
      <h2 className="text-sm font-medium tracking-[0.3px] uppercase" style={{ color: MUDO }}>
        {children}
      </h2>
      {extra}
    </div>
  );
}

function Barra({ valor, cor, altura = 8 }: { valor: number; cor: string; altura?: number }) {
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height: altura, backgroundColor: "rgba(4,32,69,0.08)" }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(Math.max(valor, 0), 100)}%`, backgroundColor: cor }}
      />
    </div>
  );
}

/** Stat card: chip de ícone tingido, rótulo em caixa alta, valor grande. */
function Stat({
  icone,
  cor,
  rotulo,
  valor,
  detalhe,
  progresso,
}: {
  icone: React.ReactNode;
  cor: string;
  rotulo: string;
  valor: string;
  detalhe: string;
  /** Quando presente, o cartão ganha a mesma barra do progresso do ano. */
  progresso?: number;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${cor}12`, color: cor }}
      >
        {icone}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-[0.3px] uppercase" style={{ color: MUDO }}>
          {rotulo}
        </p>
        <p className="mt-0.5 truncate text-3xl font-semibold tracking-[-0.5px] 2xl:text-4xl">
          {valor}
        </p>
        {progresso !== undefined && (
          <div className="mt-2">
            <Barra valor={progresso} cor={cor} altura={6} />
          </div>
        )}
        <p className="mt-1 truncate text-xs" style={{ color: MUDO }}>
          {detalhe}
        </p>
      </div>
    </Card>
  );
}

function Painel() {
  const [data, setData] = useState<PainelData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const res = await fetch("/api/public/painel");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PainelData;
        if (ativo) {
          setData(json);
          setErro(null);
        }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Falha ao carregar");
      }
    };
    carregar();
    const id = setInterval(carregar, 5 * 60 * 1000);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6">
        <p className="text-sm" style={{ color: MUDO }}>
          {erro ? `Não foi possível carregar os dados (${erro}).` : "Carregando painel…"}
        </p>
      </main>
    );
  }

  const falta = Math.max(data.metaGlobal - data.realizadoAno, 0);
  const restantes = mesesRestantes(data.ano);
  const necessario = restantes > 0 ? falta / restantes : 0;

  const margemNLG = data.margem?.[UNIDADE_MARGEM] ?? [];
  const ultimo = margemNLG.reduce<number>((u, v, i) => (v !== null ? i : u), -1);
  const margemAtual = ultimo >= 0 ? (margemNLG[ultimo] ?? null) : null;

  const mensal = data.progressoGlobalMensal.map((v, i) => ({ mes: MESES[i], valor: v }));

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f5f7fb] xl:h-screen xl:flex-row xl:overflow-hidden"
      style={{ color: TEXTO }}
    >
      {/* Sidebar escura do Gentelella — aqui ela carrega o número global em vez
          de um menu, já que o painel é de tela única. */}
      <aside
        className="flex shrink-0 flex-col gap-6 p-6 xl:w-[252px]"
        style={{ backgroundColor: SIDEBAR }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: PRIMARIA }}
          >
            GN
          </span>
          <span className="text-base font-semibold text-white">Grupo Now</span>
        </div>

        <div className="border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p
            className="text-xs font-medium tracking-[0.3px] uppercase"
            style={{ color: "#7b8fa3" }}
          >
            Progresso do ano
          </p>
          <p className="mt-2 text-6xl leading-none font-semibold tracking-[-1px] text-white 2xl:text-7xl">
            {pct(data.progressoGlobal)}
          </p>
          <div className="mt-4">
            <Barra valor={data.progressoGlobal} cor={PRIMARIA} altura={10} />
          </div>
          <p className="mt-3 text-sm" style={{ color: "#c5d0dc" }}>
            {brlCurto(data.realizadoAno)} de {brlCurto(data.metaGlobal)}
          </p>
        </div>

        <div
          className="mt-auto hidden border-t pt-4 text-xs xl:block"
          style={{ borderColor: "rgba(255,255,255,0.06)", color: "#7b8fa3" }}
        >
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            atualizado às {hora(data.atualizadoEm)}
          </p>
          <p className="mt-1">exercício {data.ano}</p>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:p-6">
        <header className="flex shrink-0 items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold">Painel de Metas</h1>
          <span className="text-sm" style={{ color: MUDO }}>
            {restantes > 0
              ? `faltam ${brlCurto(falta)} em ${restantes} meses`
              : "exercício encerrado"}
          </span>
        </header>

        <section className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icone={<Wallet size={22} />}
            cor={PRIMARIA}
            rotulo="Realizado"
            valor={brlCurto(data.realizadoAno)}
            detalhe={`${pct(data.progressoGlobal)} da meta`}
          />
          <Stat
            icone={<Target size={22} />}
            cor={PRIMARIA}
            rotulo="Meta anual"
            valor={brlCurto(data.metaGlobal)}
            progresso={data.progressoGlobal}
            detalhe={`${brlCurto(data.realizadoAno)} alcançados · ${pct(data.progressoGlobal)}`}
          />
          <Stat
            icone={<TrendingDown size={22} />}
            cor={VERMELHO}
            rotulo="Falta atingir"
            valor={brlCurto(falta)}
            detalhe={restantes > 0 ? `${brl(necessario)} por mês` : "—"}
          />
          <Stat
            icone={<Percent size={22} />}
            cor={margemAtual !== null && margemAtual < 0 ? VERMELHO : VERDE}
            rotulo={`Margem ${UNIDADE_MARGEM}`}
            valor={margemAtual === null ? "—" : pct(margemAtual)}
            detalhe={ultimo >= 0 ? `em ${MESES[ultimo]}` : "sem lançamento"}
          />
        </section>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="flex h-full min-h-0 flex-col">
            <TituloPainel>Progresso mês a mês</TituloPainel>
            <div className="min-h-[160px] flex-1 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensal} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={BORDA} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: MUDO, fontSize: 14 }}
                    axisLine={{ stroke: BORDA }}
                    tickLine={false}
                    interval={0}
                  />
                  <Bar
                    dataKey="valor"
                    fill={PRIMARIA}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="valor"
                      position="top"
                      fontSize={14}
                      fontWeight={600}
                      fill={TEXTO}
                      formatter={(v: number) => (v ? pct(v) : "")}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="flex h-full min-h-0 flex-col">
            <TituloPainel>Por setor</TituloPainel>
            <div className="flex min-h-0 flex-1 flex-col justify-around gap-4 p-5">
              {data.setores.map((s) => {
                const cor = COR_SETOR[s.id] ?? s.cor;
                return (
                  <div key={s.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base font-medium">{s.nome}</span>
                      <span className="text-2xl font-semibold" style={{ color: cor }}>
                        {pct(s.progressoAnual)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Barra valor={s.progressoAnual} cor={cor} />
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: MUDO }}>
                      {brl(s.realizadoAno)} de {brlCurto(s.metaAnual)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
