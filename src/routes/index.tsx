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
const CINZA = "#cbd5e1";
const APAGADO = "#8ea3c4";

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

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>
  );
}

function KpiCard({
  titulo,
  cor,
  progresso,
  realizado,
  meta,
}: {
  titulo: string;
  cor: string;
  progresso: number;
  realizado: number;
  meta: number;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor }} />
        <span className="text-xs font-medium tracking-wide text-muted-foreground">{titulo}</span>
      </div>
      <div className="py-5 text-center text-5xl font-light" style={{ color: cor }}>
        {pct(progresso)}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(progresso, 100)}%`, backgroundColor: cor }}
        />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {brl(realizado)} de {brl(meta)}
      </div>
    </Card>
  );
}

function Titulo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground">{children}</h2>
      {extra}
    </div>
  );
}

function MensalChart({ valores, cor }: { valores: number[]; cor: string }) {
  const data = valores.map((v, i) => ({ mes: MESES[i], valor: v }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 18, right: 4, left: -20, bottom: 8 }}>
        <XAxis
          dataKey="mes"
          angle={-45}
          textAnchor="end"
          height={34}
          tick={{ fill: APAGADO, fontSize: 10 }}
          axisLine={{ stroke: "#24334f" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: APAGADO, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Bar dataKey="valor" fill={cor} radius={[3, 3, 0, 0]} isAnimationActive={false}>
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
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">
          {erro ? `Não foi possível carregar os dados (${erro}).` : "Carregando painel…"}
        </p>
      </main>
    );
  }

  const ordenados = [...data.setores].sort((a, b) => a.progressoAnual - b.progressoAnual);

  return (
    <main className="min-h-screen bg-background p-5 text-foreground lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
          Painel de Metas do Grupo Now
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Meta global {data.ano}: {brl(data.metaGlobal)} · realizado {brl(data.realizadoAno)} ·
          atualizado em {dataHora(data.atualizadoEm)}
        </p>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Meta Anual"
          cor={CINZA}
          progresso={data.progressoGlobal}
          realizado={data.realizadoAno}
          meta={data.metaGlobal}
        />
        {data.setores.map((s) => (
          <KpiCard
            key={s.id}
            titulo={`Meta Anual – ${s.nome}`}
            cor={s.cor}
            progresso={s.progressoAnual}
            realizado={s.realizadoAno}
            meta={s.metaAnual}
          />
        ))}
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <Titulo>Progresso Anual Individual – Dividido por Setor</Titulo>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              layout="vertical"
              data={ordenados.map((s) => ({ nome: s.nome, valor: s.progressoAnual, cor: s.cor }))}
              margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nome"
                width={92}
                tick={{ fill: APAGADO, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={22}>
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
          <Titulo>Representatividade do Progresso Anual Dividido por Setor</Titulo>
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.setores.map((s) => ({ name: s.nome, value: s.representatividade }))}
                    dataKey="value"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
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
            <ul className="space-y-2 pr-2">
              {data.setores.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
                  {s.nome}: {pct(s.representatividade)}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <Titulo>Progresso Mensal da Meta Anual</Titulo>
          <MensalChart valores={data.progressoGlobalMensal} cor={CINZA} />
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {data.setores.map((s) => (
          <Card key={s.id}>
            <Titulo
              extra={
                <span className="text-xs font-medium" style={{ color: s.cor }}>
                  {pct(s.progressoAnual)}
                </span>
              }
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
                {s.nome} – Progresso Mensal
              </span>
            </Titulo>
            <MensalChart valores={s.progressoMensal} cor={s.cor} />
          </Card>
        ))}
      </section>
    </main>
  );
}
