import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis } from "recharts";

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

/** Painel de TV: paleta fixa, sem depender do tema de quem abre. */
const CIANO = "#22d3ee";
const ROSA = "#fb7185";
const VERDE = "#34d399";
const APAGADO = "#8ea3c4";

/** A margem é por unidade de negócio; o painel acompanha a da NLG. */
const UNIDADE_MARGEM = "NLG";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

/** Valor curto para o topo: "R$ 3,2 mi" cabe onde o número cheio não caberia. */
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

function Barra({ valor, cor, alta = false }: { valor: number; cor: string; alta?: boolean }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/[0.07] ${alta ? "h-5" : "h-3"}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${Math.min(Math.max(valor, 0), 100)}%`,
          background: `linear-gradient(90deg, ${cor}66, ${cor})`,
          boxShadow: `0 0 18px ${cor}80`,
        }}
      />
    </div>
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
      <main className="flex min-h-screen items-center justify-center bg-[#070c18] p-6">
        <p className="text-sm text-[#8ea3c4]">
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
    /* Painel de TV: trava na altura da tela e não rola. */
    <main className="relative flex min-h-screen flex-col gap-4 overflow-hidden bg-[#070c18] p-4 text-[#e8eefb] xl:h-screen xl:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 560px at 15% -10%, rgba(56,120,255,0.20), transparent 60%), radial-gradient(900px 480px at 90% 0%, rgba(168,85,247,0.14), transparent 62%)",
        }}
      />

      <header className="relative flex shrink-0 items-center justify-between gap-3">
        <span className="text-sm font-bold tracking-[0.16em] text-[#8ea3c4] uppercase">
          Painel de Metas · Grupo Now
        </span>
        <span className="flex items-center gap-3 text-xs text-[#8ea3c4]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {hora(data.atualizadoEm)}
          </span>
          <span className="font-bold text-[#e8eefb]">{data.ano}</span>
        </span>
      </header>

      {/* O número que se lê da porta da sala. */}
      <Card className="relative flex shrink-0 flex-col items-center gap-3 py-7">
        <p
          className="text-7xl leading-none font-bold tracking-tight 2xl:text-9xl"
          style={{ color: CIANO }}
        >
          {pct(data.progressoGlobal)}
        </p>
        <p className="text-xl text-[#8ea3c4] 2xl:text-2xl">
          <span className="font-semibold text-[#e8eefb]">{brlCurto(data.realizadoAno)}</span> de{" "}
          {brlCurto(data.metaGlobal)}
        </p>
        <div className="w-full max-w-5xl">
          <Barra valor={data.progressoGlobal} cor={CIANO} alta />
        </div>
        <p className="text-base text-[#8ea3c4] 2xl:text-lg">
          {restantes > 0 ? (
            <>
              faltam <span className="font-semibold text-[#e8eefb]">{brlCurto(falta)}</span> em{" "}
              {restantes} meses ·{" "}
              <span className="font-semibold" style={{ color: ROSA }}>
                {brl(necessario)}
              </span>{" "}
              por mês
            </>
          ) : (
            "ano encerrado"
          )}
        </p>
      </Card>

      <section className="relative grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
        {data.setores.map((s) => (
          <Card key={s.id} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-semibold 2xl:text-xl">{s.nome}</span>
              <span className="text-4xl font-bold 2xl:text-5xl" style={{ color: s.cor }}>
                {pct(s.progressoAnual)}
              </span>
            </div>
            <Barra valor={s.progressoAnual} cor={s.cor} />
            <p className="text-sm text-[#8ea3c4]">{brl(s.realizadoAno)}</p>
          </Card>
        ))}
      </section>

      <section className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col">
          <p className="mb-2 shrink-0 text-xs font-semibold tracking-[0.14em] text-[#8ea3c4] uppercase">
            Progresso mês a mês
          </p>
          <div className="min-h-[120px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mensal} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
                <XAxis
                  dataKey="mes"
                  tick={{ fill: APAGADO, fontSize: 15 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={false}
                  interval={0}
                />
                <Bar dataKey="valor" fill={CIANO} radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  <LabelList
                    dataKey="valor"
                    position="top"
                    fontSize={15}
                    fontWeight={600}
                    fill="#c9d6ee"
                    formatter={(v: number) => (v ? pct(v) : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col items-center justify-center gap-2">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#8ea3c4] uppercase">
            Margem {UNIDADE_MARGEM}
          </p>
          <p
            className="text-5xl font-bold 2xl:text-6xl"
            style={{ color: margemAtual !== null && margemAtual < 0 ? ROSA : VERDE }}
          >
            {margemAtual === null ? "—" : pct(margemAtual)}
          </p>
          <p className="text-sm text-[#8ea3c4]">{ultimo >= 0 ? MESES[ultimo] : "sem lançamento"}</p>
        </Card>
      </section>
    </main>
  );
}
