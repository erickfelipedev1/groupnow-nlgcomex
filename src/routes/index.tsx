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
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <Card className="min-w-0">
      <p className="truncate text-[10px] font-semibold tracking-[0.14em] text-[#7c8bab] uppercase">
        {rotulo}
      </p>
      <p
        className="mt-2 truncate text-2xl font-bold tracking-tight lg:text-[28px]"
        style={{ color: cor }}
      >
        {valor}
      </p>
    </Card>
  );
}

function Titulo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-[11px] font-semibold tracking-[0.12em] text-[#7c8bab] uppercase">
        {children}
      </h2>
      {extra}
    </div>
  );
}

/** Barra com brilho na cor do setor. `valor` é percentual. */
function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
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

function MensalChart({
  valores,
  cor,
  altura = 170,
}: {
  valores: number[];
  cor: string;
  altura?: number;
}) {
  const data = valores.map((v, i) => ({ mes: MESES[i], valor: v }));
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={data} margin={{ top: 18, right: 4, left: -22, bottom: 4 }}>
        <XAxis
          dataKey="mes"
          tick={{ fill: APAGADO, fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fill: APAGADO, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Bar dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="valor"
            position="top"
            fontSize={10}
            fill={APAGADO}
            formatter={(v: number) => (v ? pct(v) : "")}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
    <main className="relative min-h-screen overflow-hidden bg-[#070c18] p-4 text-[#e8eefb] lg:p-7">
      {/* brilho de fundo, puramente decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 520px at 12% -8%, rgba(56,120,255,0.20), transparent 60%), radial-gradient(900px 460px at 92% 4%, rgba(168,85,247,0.16), transparent 62%)",
        }}
      />

      <div className="relative">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold tracking-[0.12em] uppercase">
              Painel de Metas · Grupo Now
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.14em] text-emerald-300 uppercase">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Ao vivo
            </span>
            <span className="text-[11px] text-[#7c8bab]">
              Atualizado às {hora(data.atualizadoEm)}
            </span>
          </div>
          <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold tracking-[0.1em]">
            {data.ano}
          </span>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="Realizado no ano" valor={brl(data.realizadoAno)} cor={CIANO} />
          <Kpi rotulo="Meta anual" valor={brl(data.metaGlobal)} cor="#e8eefb" />
          <Kpi rotulo="Falta atingir" valor={brl(falta)} cor={ROSA} />
          <Kpi rotulo="Meses restantes" valor={String(restantes)} cor={CIANO} />
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        <section className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-amber-300 uppercase">
              ★ Meta anual
            </span>
            <span className="text-sm font-semibold">
              {brl(data.realizadoAno)}{" "}
              <span className="text-[#7c8bab]">/ {brl(data.metaGlobal)}</span>
            </span>
            <div className="min-w-[220px] flex-1">
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${Math.min(data.progressoGlobal, 100)}%`,
                    background: "linear-gradient(90deg, #f59e0b, #fb7185)",
                    boxShadow: "0 0 16px rgba(245,158,11,0.5)",
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90">
                  {pct(data.progressoGlobal)}
                </span>
              </div>
            </div>
            <span className="text-xl">🏆</span>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {data.setores.map((s) => (
            <Card key={s.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.cor, boxShadow: `0 0 10px ${s.cor}` }}
                  />
                  {s.nome}
                </span>
                <span className="text-2xl font-bold" style={{ color: s.cor }}>
                  {pct(s.progressoAnual)}
                </span>
              </div>
              <Barra valor={s.progressoAnual} cor={s.cor} />
              <p className="text-[11px] text-[#7c8bab]">
                {brl(s.realizadoAno)} de {brl(s.metaAnual)} · {pct(s.representatividade)} do
                realizado
              </p>
              <MensalChart valores={s.progressoMensal} cor={s.cor} altura={150} />
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card>
            <Titulo>Progresso anual por setor</Titulo>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                layout="vertical"
                data={ordenados.map((s) => ({ nome: s.nome, valor: s.progressoAnual }))}
                margin={{ top: 8, right: 52, left: 8, bottom: 8 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={96}
                  tick={{ fill: APAGADO, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} isAnimationActive={false} barSize={20}>
                  {ordenados.map((s) => (
                    <Cell key={s.id} fill={s.cor} />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="right"
                    fontSize={11}
                    fill={APAGADO}
                    formatter={(v: number) => pct(v)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <Titulo>Representatividade do realizado</Titulo>
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={data.setores.map((s) => ({
                        name: s.nome,
                        value: s.representatividade,
                      }))}
                      dataKey="value"
                      innerRadius={50}
                      outerRadius={78}
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
              <ul className="space-y-2 pr-1">
                {data.setores.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-[11px] text-[#7c8bab]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.cor, boxShadow: `0 0 8px ${s.cor}` }}
                    />
                    {s.nome}: {pct(s.representatividade)}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <Titulo>Progresso mensal da meta anual</Titulo>
            <MensalChart valores={data.progressoGlobalMensal} cor={CIANO} altura={190} />
          </Card>
        </section>
      </div>
    </main>
  );
}
