import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
} from "recharts";

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
const AMBAR = "#f59e0b";
const ROSA = "#fb7185";
const VERDE = "#34d399";
const APAGADO = "#7c8bab";

/** A margem é por unidade de negócio; o painel acompanha a da NLG. */
const UNIDADE_MARGEM = "NLG";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const pct = (v: number) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)}%`;

/** Margem tem uma casa decimal — duas dariam ruído sem informação. */
const pct1 = (v: number) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
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
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 shrink-0 text-xs font-semibold tracking-[0.1em] text-[#8ea3c4] uppercase">
      {children}
    </h2>
  );
}

/** Barra com brilho na cor do setor. `valor` é percentual. */
function Barra({ valor, cor, alta = false }: { valor: number; cor: string; alta?: boolean }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${alta ? "h-4" : "h-1.5"}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${Math.min(Math.max(valor, 0), 100)}%`,
          background: `linear-gradient(90deg, ${cor}66, ${cor})`,
          boxShadow: `0 0 14px ${cor}80`,
        }}
      />
    </div>
  );
}

/** Ocupa toda a altura que o pai der — é o que faz o painel caber na tela. */
function Grafico({ children }: { children: React.ReactElement }) {
  return (
    <div className="min-h-[110px] w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function MensalChart({ valores, cor }: { valores: number[]; cor: string }) {
  const data = valores.map((v, i) => ({ mes: MESES[i], valor: v }));
  return (
    <Grafico>
      <BarChart data={data} margin={{ top: 22, right: 6, left: 6, bottom: 0 }}>
        <XAxis
          dataKey="mes"
          tick={{ fill: APAGADO, fontSize: 13 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          interval={0}
        />
        <Bar dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="valor"
            position="top"
            fontSize={13}
            fontWeight={600}
            fill="#c9d6ee"
            formatter={(v: number) => (v ? pct(v) : "")}
          />
        </Bar>
      </BarChart>
    </Grafico>
  );
}

function MargemChart({ valores }: { valores: (number | null)[] }) {
  const data = valores.map((v, i) => ({ mes: MESES[i], valor: v }));
  return (
    <Grafico>
      <BarChart data={data} margin={{ top: 22, right: 6, left: 6, bottom: 0 }}>
        <XAxis
          dataKey="mes"
          tick={{ fill: APAGADO, fontSize: 13 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          interval={0}
        />
        {/* Margem negativa existe e importa: a linha do zero dá a referência. */}
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.mes} fill={(d.valor ?? 0) >= 0 ? VERDE : ROSA} />
          ))}
          <LabelList
            dataKey="valor"
            position="top"
            fontSize={13}
            fontWeight={600}
            fill="#c9d6ee"
            formatter={(v: number | null) => (v === null ? "" : pct1(v))}
          />
        </Bar>
      </BarChart>
    </Grafico>
  );
}

/** Linha rótulo/valor do bloco de ritmo, no herói. */
function Linha({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-[#8ea3c4]">{rotulo}</span>
      <span className="text-lg font-semibold" style={cor ? { color: cor } : undefined}>
        {valor}
      </span>
    </div>
  );
}

/** Cartão de um setor (ou da margem): título, número grande, barra e série mensal. */
function Bloco({
  nome,
  cor,
  destaque,
  legenda,
  progresso,
  children,
}: {
  nome: string;
  cor: string;
  destaque: string;
  legenda: string;
  progresso?: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex min-h-0 flex-col gap-1.5">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-base font-semibold">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: cor, boxShadow: `0 0 10px ${cor}` }}
          />
          {nome}
        </span>
        <span className="text-3xl font-bold" style={{ color: cor }}>
          {destaque}
        </span>
      </div>
      {progresso !== undefined && <Barra valor={progresso} cor={cor} />}
      <p className="shrink-0 text-xs text-[#8ea3c4]">{legenda}</p>
      {children}
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
      <main className="flex min-h-screen items-center justify-center bg-[#070c18] p-6">
        <p className="text-sm text-[#7c8bab]">
          {erro ? `Não foi possível carregar os dados (${erro}).` : "Carregando painel…"}
        </p>
      </main>
    );
  }

  const falta = Math.max(data.metaGlobal - data.realizadoAno, 0);
  const restantes = mesesRestantes(data.ano);
  const mesesComValor = data.progressoGlobalMensal.filter((v) => v > 0).length;
  const mediaMensal = mesesComValor > 0 ? data.realizadoAno / mesesComValor : 0;
  const necessario = restantes > 0 ? falta / restantes : 0;
  /** O ritmo atual dá conta? É a pergunta que o painel existe para responder. */
  const noRitmo = mediaMensal >= necessario;
  /** Quantas vezes o mês médio seria preciso repetir para fechar o ano. */
  const vezes = mediaMensal > 0 ? necessario / mediaMensal : 0;
  const vezesTxt = vezes.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const margemNLG = data.margem?.[UNIDADE_MARGEM] ?? Array<number | null>(12).fill(null);
  const ultimoLancado = margemNLG.reduce<number>((ultimo, v, i) => (v !== null ? i : ultimo), -1);
  const margemAtual = ultimoLancado >= 0 ? (margemNLG[ultimoLancado] ?? null) : null;
  const mesDaMargem = ultimoLancado >= 0 ? MESES[ultimoLancado] : null;

  return (
    /* Em telas largas o painel é travado na altura da janela e não rola — é uma
       TV. Abaixo de xl volta a ser uma página comum, que rola. */
    <main className="relative flex min-h-screen flex-col gap-3 overflow-hidden bg-[#070c18] p-3 text-[#e8eefb] xl:h-screen xl:p-5">
      {/* brilho de fundo, puramente decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 520px at 12% -8%, rgba(56,120,255,0.20), transparent 60%), radial-gradient(900px 460px at 92% 4%, rgba(168,85,247,0.16), transparent 62%)",
        }}
      />

      <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-sm font-bold tracking-[0.1em] uppercase">
            Painel de Metas · Grupo Now
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold tracking-[0.14em] text-emerald-300 uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Ao vivo
          </span>
          <span className="text-xs text-[#8ea3c4]">Atualizado às {hora(data.atualizadoEm)}</span>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-sm font-bold tracking-[0.1em]">
          {data.ano}
        </span>
      </header>

      <section className="relative grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)]">
        {/* Herói: o número que se lê de longe, e o ritmo que o explica. */}
        <Card className="flex min-h-0 flex-col justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#8ea3c4] uppercase">
              Progresso global
            </p>
            <p
              className="mt-1 text-6xl leading-none font-bold tracking-tight 2xl:text-7xl"
              style={{ color: CIANO }}
            >
              {pct(data.progressoGlobal)}
            </p>
            <p className="mt-3 text-sm text-[#8ea3c4]">
              <span className="font-semibold text-[#e8eefb]">{brl(data.realizadoAno)}</span> de{" "}
              {brl(data.metaGlobal)}
            </p>
            <div className="mt-2">
              <Barra valor={data.progressoGlobal} cor={CIANO} alta />
            </div>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#8ea3c4] uppercase">
              Ritmo
            </p>
            <Linha rotulo="Média mensal realizada" valor={brl(mediaMensal)} />
            <Linha
              rotulo="Necessário por mês"
              valor={restantes > 0 ? brl(necessario) : "—"}
              cor={noRitmo ? VERDE : AMBAR}
            />
            <Linha rotulo="Falta atingir" valor={brl(falta)} cor={ROSA} />
            <Linha rotulo="Meses restantes" valor={String(restantes)} />
            <p className="pt-1 text-xs text-[#8ea3c4]">
              {restantes === 0
                ? "Ano encerrado."
                : noRitmo
                  ? "No ritmo atual, a meta anual fecha."
                  : `No ritmo atual a meta não fecha: seria preciso ${vezesTxt}x o mês médio.`}
            </p>
          </div>
        </Card>

        <div className="grid min-h-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-rows-[1fr_1fr_0.9fr]">
          {data.setores.map((s) => (
            <Bloco
              key={s.id}
              nome={s.nome}
              cor={s.cor}
              destaque={pct(s.progressoAnual)}
              progresso={s.progressoAnual}
              legenda={`${brl(s.realizadoAno)} de ${brl(s.metaAnual)} · ${pct(s.representatividade)} do realizado`}
            >
              <MensalChart valores={s.progressoMensal} cor={s.cor} />
            </Bloco>
          ))}

          <Bloco
            nome={`Margem · ${UNIDADE_MARGEM}`}
            cor={margemAtual !== null && margemAtual < 0 ? ROSA : VERDE}
            destaque={margemAtual === null ? "—" : pct1(margemAtual)}
            legenda={mesDaMargem ? `último mês lançado: ${mesDaMargem}` : "sem lançamento no ano"}
          >
            <MargemChart valores={margemNLG} />
          </Bloco>

          <Card className="flex min-h-0 flex-col sm:col-span-2">
            <Titulo>Progresso mensal da meta anual</Titulo>
            <MensalChart valores={data.progressoGlobalMensal} cor={CIANO} />
          </Card>
        </div>
      </section>
    </main>
  );
}
