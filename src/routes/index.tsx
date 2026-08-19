import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
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
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Painel de TV: paleta fixa, sem depender do tema de quem abre. */
const CIANO = "#22d3ee";
const AMBAR = "#f59e0b";
const ROSA = "#fb7185";
const APAGADO = "#7c8bab";

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
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <Card className="min-w-0">
      <p className="truncate text-[9px] font-semibold tracking-[0.14em] text-[#7c8bab] uppercase">
        {rotulo}
      </p>
      <p
        className="mt-1 truncate text-lg font-bold tracking-tight lg:text-xl 2xl:text-2xl"
        style={{ color: cor }}
      >
        {valor}
      </p>
    </Card>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 shrink-0 text-[10px] font-semibold tracking-[0.12em] text-[#7c8bab] uppercase">
      {children}
    </h2>
  );
}

/** Barra com brilho na cor do setor. `valor` é percentual. */
function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${Math.min(Math.max(valor, 0), 100)}%`,
          background: `linear-gradient(90deg, ${cor}66, ${cor})`,
          boxShadow: `0 0 12px ${cor}80`,
        }}
      />
    </div>
  );
}

/** Ocupa toda a altura que o pai der — é o que faz o painel caber na tela. */
function Grafico({ children }: { children: React.ReactElement }) {
  return (
    <div className="min-h-[130px] w-full flex-1">
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
      <BarChart data={data} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
        <XAxis
          dataKey="mes"
          tick={{ fill: APAGADO, fontSize: 9 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          interval={0}
        />
        <YAxis tick={{ fill: APAGADO, fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
        <Bar dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="valor"
            position="top"
            fontSize={9}
            fill={APAGADO}
            formatter={(v: number) => (v ? pct(v) : "")}
          />
        </Bar>
      </BarChart>
    </Grafico>
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

  const ordenados = [...data.setores].sort((a, b) => a.progressoAnual - b.progressoAnual);
  const melhor = [...data.setores].sort((a, b) => b.progressoAnual - a.progressoAnual)[0];
  const falta = Math.max(data.metaGlobal - data.realizadoAno, 0);
  const restantes = mesesRestantes(data.ano);
  const mesesComValor = data.progressoGlobalMensal.filter((v) => v > 0).length;

  return (
    /* Em telas largas o painel é travado na altura da janela e não rola — é uma
       TV. Abaixo de xl volta a ser uma página comum, que rola. */
    <main className="relative flex min-h-screen flex-col gap-2.5 overflow-hidden bg-[#070c18] p-3 text-[#e8eefb] xl:h-screen xl:p-5">
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
          <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] uppercase">
            Painel de Metas · Grupo Now
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold tracking-[0.14em] text-emerald-300 uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Ao vivo
          </span>
          <span className="text-[10px] text-[#7c8bab]">
            Atualizado às {hora(data.atualizadoEm)}
          </span>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold tracking-[0.1em]">
          {data.ano}
        </span>
      </header>

      <section className="relative grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <Kpi rotulo="Realizado no ano" valor={brl(data.realizadoAno)} cor={CIANO} />
        <Kpi rotulo="Meta anual" valor={brl(data.metaGlobal)} cor="#e8eefb" />
        <Kpi rotulo="Falta atingir" valor={brl(falta)} cor={ROSA} />
        <Kpi rotulo="Meses restantes" valor={String(restantes)} cor={CIANO} />
        <Kpi
          rotulo="Necessário por mês"
          valor={restantes > 0 ? brl(falta / restantes) : "—"}
          cor={AMBAR}
        />
        <Kpi
          rotulo="Média mensal realizada"
          valor={mesesComValor > 0 ? brl(data.realizadoAno / mesesComValor) : "—"}
          cor={AMBAR}
        />
        <Kpi rotulo="Progresso global" valor={pct(data.progressoGlobal)} cor={CIANO} />
        <Kpi
          rotulo="Setor mais adiantado"
          valor={melhor ? `${melhor.nome} · ${pct(melhor.progressoAnual)}` : "—"}
          cor={melhor ? melhor.cor : "#e8eefb"}
        />
      </section>

      <section className="relative shrink-0 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-amber-300 uppercase">
            ★ Meta anual
          </span>
          <span className="text-xs font-semibold">
            {brl(data.realizadoAno)}{" "}
            <span className="text-[#7c8bab]">/ {brl(data.metaGlobal)}</span>
          </span>
          <div className="min-w-[200px] flex-1">
            <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.min(data.progressoGlobal, 100)}%`,
                  background: "linear-gradient(90deg, #f59e0b, #fb7185)",
                  boxShadow: "0 0 16px rgba(245,158,11,0.5)",
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90">
                {pct(data.progressoGlobal)}
              </span>
            </div>
          </div>
          <span className="text-base">🏆</span>
        </div>
      </section>

      {/* As duas faixas de gráficos dividem toda a altura que sobrou. */}
      <section className="relative grid min-h-0 flex-1 grid-cols-1 gap-2.5 xl:grid-cols-3 xl:grid-rows-2">
        {data.setores.map((s) => (
          <Card key={s.id} className="flex min-h-0 flex-col gap-1.5">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.cor, boxShadow: `0 0 10px ${s.cor}` }}
                />
                {s.nome}
              </span>
              <span className="text-lg font-bold" style={{ color: s.cor }}>
                {pct(s.progressoAnual)}
              </span>
            </div>
            <Barra valor={s.progressoAnual} cor={s.cor} />
            <p className="shrink-0 text-[10px] text-[#7c8bab]">
              {brl(s.realizadoAno)} de {brl(s.metaAnual)} · {pct(s.representatividade)} do realizado
            </p>
            <MensalChart valores={s.progressoMensal} cor={s.cor} />
          </Card>
        ))}

        <Card className="flex min-h-0 flex-col">
          <Titulo>Progresso anual por setor</Titulo>
          <Grafico>
            <BarChart
              layout="vertical"
              data={ordenados.map((s) => ({ nome: s.nome, valor: s.progressoAnual }))}
              margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nome"
                width={92}
                tick={{ fill: APAGADO, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} isAnimationActive={false} barSize={18}>
                {ordenados.map((s) => (
                  <Cell key={s.id} fill={s.cor} />
                ))}
                <LabelList
                  dataKey="valor"
                  position="right"
                  fontSize={10}
                  fill={APAGADO}
                  formatter={(v: number) => pct(v)}
                />
              </Bar>
            </BarChart>
          </Grafico>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <Titulo>Representatividade do realizado</Titulo>
          {/* items-stretch (padrão) é o que dá altura ao filho — com
              items-center a rosca colapsava para zero. */}
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="min-h-[130px] min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.setores.map((s) => ({ name: s.nome, value: s.representatividade }))}
                    dataKey="value"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {data.setores.map((s) => (
                      <Cell key={s.id} fill={s.cor} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex shrink-0 flex-col justify-center gap-1.5 pr-1">
              {data.setores.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-[10px] text-[#7c8bab]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.cor, boxShadow: `0 0 8px ${s.cor}` }}
                  />
                  {s.nome}: {pct(s.representatividade)}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <Titulo>Progresso mensal da meta anual</Titulo>
          <MensalChart valores={data.progressoGlobalMensal} cor={CIANO} />
        </Card>
      </section>
    </main>
  );
}
