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
import {
  BarChart3,
  CalendarDays,
  ChartPie,
  CircleDollarSign,
  Coins,
  Flag,
  Info,
  LayoutGrid,
  LogOut,
  Package,
  Settings,
  Store,
  Target,
  TrendingUp,
  Trophy,
  Truck,
  Users,
} from "lucide-react";

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
  margem?: Record<string, (number | null)[]>;
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Identidade da NLG, extraída do nlgcomex.com.br: navy #0a0734, dourado
 * #eab22e, azul elétrico #3d6aff, magenta #cc3366, e a fonte Outfit.
 */
const FUNDO = "#070428";
const CARTAO = "#0f0b3d";
const BORDA = "rgba(255,255,255,0.09)";
const TEXTO = "#eef0ff";
const MUDO = "#9aa0cc";
/**
 * Azul do logo. Estimado a partir do arquivo enviado pelo usuário — o site só
 * publica a versão branca da marca, então não deu para amostrar o hex exato.
 * Se aparecer o valor oficial no manual, é trocar aqui.
 */
const MARCA = "#1a35f0";
const DOURADO = "#eab22e";
const MAGENTA = "#cc3366";
/**
 * Verde e vermelho ficam fora da paleta da marca de propósito: aqui a cor é
 * semântica (no ritmo / fora do ritmo), não decoração. Pintar de dourado um
 * aviso de atraso esconderia justamente o que ele precisa mostrar.
 */
const VERDE = "#34d399";
const VERMELHO = "#f43f5e";

/**
 * Três cores distinguíveis entre si. Duas são da marca; o violeta é derivado
 * entre o azul e o magenta, porque a marca não tem um terceiro tom próprio.
 */
const COR_SETOR: Record<string, string> = {
  transporte: "#eab22e",
  agenciamento: "#cc3366",
  desembaraco: "#8b7cff",
};

const ICONE_SETOR: Record<string, React.ReactNode> = {
  transporte: <Truck size={20} />,
  agenciamento: <Users size={20} />,
  desembaraco: <Package size={20} />,
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const pct = (v: number, casas = 2) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(v)}%`;

const hora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(iso));

function mesesRestantes(ano: number): number {
  const agora = new Date();
  if (agora.getFullYear() > ano) return 0;
  if (agora.getFullYear() < ano) return 12;
  return 12 - (agora.getMonth() + 1);
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ borderColor: BORDA, backgroundColor: CARTAO }}
    >
      {children}
    </div>
  );
}

/** Círculo com anel e brilho na cor do indicador — a assinatura do mockup. */
function Chip({
  cor,
  children,
  tamanho = 44,
}: {
  cor: string;
  children: React.ReactNode;
  tamanho?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: tamanho,
        height: tamanho,
        color: cor,
        background: `radial-gradient(circle at 32% 28%, ${cor}30, ${cor}10 70%)`,
        boxShadow: `inset 0 0 0 1.5px ${cor}66, 0 0 16px ${cor}22`,
      }}
    >
      {children}
    </span>
  );
}

function Tile({
  icone,
  cor,
  rotulo,
  valor,
  corDoValor,
}: {
  icone: React.ReactNode;
  cor: string;
  rotulo: string;
  valor: string;
  corDoValor?: string;
}) {
  return (
    <Card className="flex items-center gap-3 px-3 py-2.5">
      <Chip cor={cor} tamanho={42}>
        {icone}
      </Chip>
      <div className="min-w-0">
        <p
          className="text-[10px] leading-tight font-semibold tracking-[0.06em] uppercase"
          style={{ color: MUDO }}
        >
          {rotulo}
        </p>
        <p
          className="truncate text-xl leading-tight font-bold 2xl:text-2xl"
          style={{ color: corDoValor ?? TEXTO }}
        >
          {valor}
        </p>
      </div>
    </Card>
  );
}

function TituloCard({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="shrink-0 px-4 pt-3 text-sm font-semibold tracking-[0.06em] uppercase">
      {children}
    </h2>
  );
}

/** Gráfico mensal de barras com o valor escrito acima de cada uma. */
function MensalChart({ valores, cor }: { valores: number[]; cor: string }) {
  const data = valores.map((v, i) => ({ mes: MESES[i], valor: v }));
  return (
    <div className="min-h-[120px] w-full flex-1 px-2 pb-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="mes"
            tick={{ fill: MUDO, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Bar dataKey="valor" fill={cor} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="valor"
              position="top"
              fontSize={12}
              fontWeight={600}
              fill={TEXTO}
              formatter={(v: number) => (v ? pct(v) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Segundos que cada painel do carrossel fica na tela. */
const SEGUNDOS_POR_SLIDE = 12;
const SLIDES = ["Por setor", "Consolidado"];

function Painel() {
  const [data, setData] = useState<PainelData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setSlide((s) => (s + 1) % SLIDES.length),
      SEGUNDOS_POR_SLIDE * 1000,
    );
    return () => clearInterval(id);
  }, []);

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
      <main
        className="flex min-h-screen items-center justify-center p-6"
        style={{ backgroundColor: FUNDO }}
      >
        <p className="text-sm" style={{ color: MUDO }}>
          {erro ? `Não foi possível carregar os dados (${erro}).` : "Carregando painel…"}
        </p>
      </main>
    );
  }

  const falta = Math.max(data.metaGlobal - data.realizadoAno, 0);
  const restantes = mesesRestantes(data.ano);
  const necessario = restantes > 0 ? falta / restantes : 0;
  const mesesComValor = data.progressoGlobalMensal.filter((v) => v > 0).length;
  const mediaMensal = mesesComValor > 0 ? data.realizadoAno / mesesComValor : 0;
  const melhor = [...data.setores].sort((a, b) => b.progressoAnual - a.progressoAnual)[0];
  const ordenados = [...data.setores].sort((a, b) => a.progressoAnual - b.progressoAnual);
  const cor = (s: Setor) => COR_SETOR[s.id] ?? s.cor;

  return (
    <div
      className="flex min-h-screen xl:h-screen xl:overflow-hidden"
      style={{ backgroundColor: FUNDO, color: TEXTO }}
    >
      {/* Trilho de ícones: num painel de tela única ele não navega para lugar
          nenhum, mas é o que dá a moldura de sistema em vez de página solta. */}
      <nav
        aria-hidden
        className="hidden w-[72px] shrink-0 flex-col items-center gap-2 border-r py-4 xl:flex"
        style={{ borderColor: BORDA }}
      >
        <span
          className="mb-4 grid h-10 w-10 place-items-center rounded-xl text-lg font-bold"
          style={{ background: `linear-gradient(135deg,${MARCA},${DOURADO})`, color: "#0b0736" }}
        >
          N
        </span>
        {[LayoutGrid, Truck, Users, Package, BarChart3, Target, Settings, LogOut].map(
          (Icone, i) => (
            <span
              key={i}
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={
                i === 0
                  ? { backgroundColor: "rgba(26,53,240,0.18)", color: "#7d92ff" }
                  : { color: "#5b6a86" }
              }
            >
              <Icone size={20} />
            </span>
          ),
        )}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 xl:p-4">
        <header className="flex shrink-0 flex-wrap items-center gap-3">
          <img
            src="/logo-nlg.png"
            alt="Now Logistics Group"
            className="h-8 w-auto shrink-0 2xl:h-9"
          />
          <h1 className="text-2xl font-bold tracking-[0.01em] 2xl:text-3xl">PAINEL DE METAS</h1>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-[0.1em] uppercase"
            style={{ backgroundColor: "rgba(52,211,153,0.12)", color: VERDE }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Ao vivo
          </span>
          <span className="text-sm" style={{ color: MUDO }}>
            Atualizado às {hora(data.atualizadoEm)}
          </span>
          <span
            className="ml-auto rounded-xl border px-4 py-1.5 text-base font-semibold"
            style={{ borderColor: BORDA, backgroundColor: CARTAO }}
          >
            {data.ano}
          </span>
        </header>

        <section className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-4 2xl:grid-cols-8">
          <Tile
            icone={<CircleDollarSign size={20} />}
            cor={MARCA}
            rotulo="Realizado no ano"
            valor={brl(data.realizadoAno)}
          />
          <Tile
            icone={<Target size={20} />}
            cor="#8b7cff"
            rotulo="Meta anual"
            valor={brl(data.metaGlobal)}
          />
          <Tile
            icone={<Flag size={20} />}
            cor={VERMELHO}
            rotulo="Falta atingir"
            valor={brl(falta)}
          />
          <Tile
            icone={<CalendarDays size={20} />}
            cor={MAGENTA}
            rotulo="Meses restantes"
            valor={String(restantes)}
          />
          <Tile
            icone={<Coins size={20} />}
            cor={DOURADO}
            rotulo="Necessário por mês"
            valor={restantes > 0 ? brl(necessario) : "—"}
            corDoValor={DOURADO}
          />
          <Tile
            icone={<TrendingUp size={20} />}
            cor={VERDE}
            rotulo="Média mensal realiz."
            valor={brl(mediaMensal)}
            corDoValor={VERDE}
          />
          <Tile
            icone={<ChartPie size={20} />}
            cor={MARCA}
            rotulo="Progresso global"
            valor={pct(data.progressoGlobal)}
            corDoValor={MARCA}
          />
          <Tile
            icone={<Store size={20} />}
            cor={MARCA}
            rotulo="Setor mais adiantado"
            valor={melhor ? melhor.nome : "—"}
            corDoValor={melhor ? cor(melhor) : TEXTO}
          />
        </section>

        {/* Faixa da meta: barra longa com gradiente e o troféu no fim. */}
        <Card className="flex shrink-0 flex-wrap items-center gap-4 px-4 py-3">
          <Chip cor={DOURADO} tamanho={52}>
            <Target size={24} />
          </Chip>
          <div className="shrink-0">
            <p className="text-xs font-semibold tracking-[0.1em] uppercase" style={{ color: MUDO }}>
              Meta anual
            </p>
            <p className="text-2xl font-bold 2xl:text-3xl">
              {brl(data.realizadoAno)}{" "}
              <span className="text-xl font-normal" style={{ color: MUDO }}>
                / {brl(data.metaGlobal)}
              </span>
            </p>
          </div>
          <div className="min-w-[240px] flex-1">
            <div
              className="h-3 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.min(data.progressoGlobal, 100)}%`,
                  background: `linear-gradient(90deg,${MARCA},#8b7cff,${DOURADO})`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs tracking-[0.06em] uppercase" style={{ color: MUDO }}>
              {restantes > 0 ? `Faltam ${brl(falta)} para atingir a meta` : "Exercício encerrado"}
            </p>
          </div>
          <p className="text-2xl font-bold 2xl:text-3xl">{pct(data.progressoGlobal)}</p>
          <span
            className="grid h-14 w-14 place-items-center rounded-xl border"
            style={{ borderColor: "#eab22e66", backgroundColor: "rgba(234,178,46,0.08)" }}
          >
            <Trophy size={26} color={DOURADO} />
          </span>
        </Card>

        {/* Carrossel: três cartões por vez, alternando sozinho. Os dois slides
            ficam montados o tempo todo — desmontar faria o Recharts remedir
            tudo a cada troca. */}
        <section className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-700 ease-in-out"
            style={{
              width: `${SLIDES.length * 100}%`,
              transform: `translateX(-${slide * (100 / SLIDES.length)}%)`,
            }}
          >
            <div className="grid h-full w-full min-w-0 grid-cols-1 gap-3 pr-3 xl:grid-cols-3">
              {data.setores.map((s) => (
                <Card key={s.id} className="flex min-h-0 flex-col">
                  <div className="flex shrink-0 items-center gap-3 px-4 pt-3">
                    <Chip cor={cor(s)} tamanho={40}>
                      {ICONE_SETOR[s.id] ?? <Package size={20} />}
                    </Chip>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-bold tracking-[0.04em] uppercase">
                          {s.nome}
                        </span>
                        <span className="text-2xl font-bold" style={{ color: cor(s) }}>
                          {pct(s.progressoAnual)}
                        </span>
                      </div>
                      <p className="truncate text-xs" style={{ color: MUDO }}>
                        {brl(s.realizadoAno)} de {brl(s.metaAnual)} • {pct(s.representatividade)} do
                        realizado
                      </p>
                    </div>
                  </div>
                  <MensalChart valores={s.progressoMensal} cor={cor(s)} />
                </Card>
              ))}
            </div>

            <div className="grid h-full w-full min-w-0 grid-cols-1 gap-3 xl:grid-cols-3">
              <Card className="flex min-h-0 flex-col">
                <TituloCard>Progresso anual por setor</TituloCard>
                <div className="min-h-[120px] flex-1 px-3 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={ordenados.map((s) => ({ nome: s.nome, valor: s.progressoAnual }))}
                      margin={{ top: 10, right: 56, left: 8, bottom: 4 }}
                    >
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fill: MUDO, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="nome"
                        width={104}
                        tick={{ fill: TEXTO, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar
                        dataKey="valor"
                        radius={[0, 4, 4, 0]}
                        isAnimationActive={false}
                        barSize={16}
                      >
                        {ordenados.map((s) => (
                          <Cell key={s.id} fill={cor(s)} />
                        ))}
                        <LabelList
                          dataKey="valor"
                          position="right"
                          fontSize={12}
                          fontWeight={600}
                          fill={TEXTO}
                          formatter={(v: number) => pct(v)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="flex min-h-0 flex-col">
                <TituloCard>Representatividade do realizado</TituloCard>
                {/* items-stretch (padrão): com items-center o filho não estica, a
                  altura vira zero e o height:100% do gráfico não resolve. */}
                <div className="flex min-h-0 flex-1 gap-3 px-3 pb-2">
                  <div className="relative min-h-[120px] min-w-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.setores.map((s) => ({
                            name: s.nome,
                            value: s.representatividade,
                          }))}
                          dataKey="value"
                          innerRadius="62%"
                          outerRadius="92%"
                          paddingAngle={2}
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {data.setores.map((s) => (
                            <Cell key={s.id} fill={cor(s)} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p
                          className="text-[10px] tracking-[0.1em] uppercase"
                          style={{ color: MUDO }}
                        >
                          Total
                        </p>
                        <p className="text-sm font-bold">{brl(data.realizadoAno)}</p>
                      </div>
                    </div>
                  </div>
                  <ul className="flex shrink-0 flex-col justify-center gap-2 pr-1">
                    {[...data.setores]
                      .sort((a, b) => b.representatividade - a.representatividade)
                      .map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-sm">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cor(s) }}
                          />
                          <span style={{ color: MUDO }}>{s.nome}</span>
                          <span className="ml-auto font-semibold">{pct(s.representatividade)}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </Card>

              <Card className="flex min-h-0 flex-col">
                <TituloCard>Progresso mensal da meta anual</TituloCard>
                <MensalChart valores={data.progressoGlobalMensal} cor={MARCA} />
              </Card>
            </div>
          </div>

          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {SLIDES.map((nome, i) => (
              <span
                key={nome}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: i === slide ? 20 : 6,
                  backgroundColor: i === slide ? MARCA : "rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </div>
        </section>

        <Card className="flex shrink-0 items-center gap-3 px-4 py-2.5">
          <Chip cor={MARCA} tamanho={32}>
            <Info size={16} />
          </Chip>
          <p className="text-sm" style={{ color: MUDO }}>
            {restantes > 0 && mediaMensal >= necessario ? (
              <>
                No ritmo atual a meta fecha: a média de{" "}
                <span className="font-semibold" style={{ color: VERDE }}>
                  {brl(mediaMensal)}
                </span>{" "}
                por mês já supera os {brl(necessario)} necessários.
              </>
            ) : restantes > 0 ? (
              <>
                Atenção ao ritmo: a média de{" "}
                <span className="font-semibold" style={{ color: DOURADO }}>
                  {brl(mediaMensal)}
                </span>{" "}
                por mês está abaixo dos{" "}
                <span className="font-semibold" style={{ color: VERMELHO }}>
                  {brl(necessario)}
                </span>{" "}
                necessários para fechar a meta em {restantes} meses.
              </>
            ) : (
              <>
                Exercício encerrado com{" "}
                <span className="font-semibold" style={{ color: MARCA }}>
                  {pct(data.progressoGlobal)}
                </span>{" "}
                da meta anual.
              </>
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}
