import { BarChart3 } from "lucide-react";
import { DEMO, DESCRICAO_SETOR_DEMO, EQUIPE_DEMO, MARCA_DEMO, UNIDADE_MARGEM_DEMO } from "./demo";

/**
 * Registro do painel: quem é a equipe, como os setores se chamam e qual marca
 * aparece. Fica num módulo só porque o modo demonstração precisa trocar o
 * REGISTRO, não apenas os números — trocar só os dados deixaria os nomes
 * fictícios sem par no registro real, e os cards cairiam vazios.
 *
 * Tudo que é de cliente (marca, rostos, nomes) sai daqui em modo demo.
 */

export type Pessoa = {
  nome: string;
  setor: string;
  /** Sem foto o card usa o avatar de iniciais. Em demo é sempre assim. */
  foto?: string | undefined;
};

const EQUIPE_REAL: Pessoa[] = [
  { nome: "Cristiane", setor: "transporte", foto: "cristiane" },
  { nome: "Kledson", setor: "transporte", foto: "kledson" },
  { nome: "Amanda", setor: "agenciamento", foto: "amanda" },
  { nome: "Bianca", setor: "agenciamento", foto: "bianca" },
  { nome: "Isabela", setor: "agenciamento", foto: "isabela" },
  { nome: "Leonardo", setor: "desembaraco", foto: "leonardo" },
  { nome: "Luiza", setor: "desembaraco", foto: "luiza" },
  { nome: "Marta", setor: "desembaraco", foto: "marta" },
  { nome: "Nathaly", setor: "desembaraco", foto: "nathaly" },
];

const DESCRICAO_REAL: Record<string, string> = {
  transporte: "Responsáveis pela logística e transporte",
  agenciamento: "Gestão de agenciados e parcerias",
  desembaraco: "Desembaraço e documentação",
};

export const EQUIPE: Pessoa[] = DEMO ? EQUIPE_DEMO : EQUIPE_REAL;

export const DESCRICAO_SETOR: Record<string, string> = DEMO ? DESCRICAO_SETOR_DEMO : DESCRICAO_REAL;

/** Unidade de negócio cuja margem o painel acompanha. */
export const UNIDADE_MARGEM = DEMO ? UNIDADE_MARGEM_DEMO : "NLG";

export const NOME_EMPRESA = DEMO ? MARCA_DEMO.nome : "Grupo Now";

/**
 * Logotipo do cliente. Em modo demo devolve `null` — marca de cliente não vai
 * para vitrine de portfólio.
 *
 * O arquivo é servido de `public/` do próprio projeto, não do domínio da
 * plataforma de origem: caminho de plataforma vira 404 fora dela e a imagem
 * aparece quebrada.
 */
export function MarcaLogo({ className }: { className?: string }) {
  if (DEMO) return null;
  return <img src="/logo-nlg.png" alt={NOME_EMPRESA} className={className} />;
}

/**
 * Símbolo do trilho lateral. A marca de barras é do cliente; em demo entra um
 * glifo genérico, sem identidade de ninguém.
 */
export function MarcaSimbolo({ tamanho = 34 }: { tamanho?: number }) {
  if (DEMO) {
    return (
      <span
        className="grid place-items-center rounded-xl"
        style={{
          width: tamanho,
          height: tamanho,
          background: "linear-gradient(135deg,#1a35f0,#8b7cff)",
          color: "#eef0ff",
        }}
      >
        <BarChart3 size={Math.round(tamanho * 0.55)} />
      </span>
    );
  }

  // Marca de barras ascendentes, redesenhada em SVG a partir do arquivo do
  // cliente — quatro retângulos, então vetor sai mais nítido que um PNG
  // reescalado. A terceira barra é preta no original e vai em branco aqui:
  // sobre o navy do painel, preto sobre escuro desaparece.
  const barras = [
    { x: 1, altura: 14, cor: "#76b82a" },
    { x: 11, altura: 20, cor: "#f05a24" },
    { x: 21, altura: 27, cor: "#ffffff" },
    { x: 31, altura: 33, cor: "#2456a6" },
  ];
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" role="img" aria-label={NOME_EMPRESA}>
      {barras.map((b) => (
        <rect key={b.x} x={b.x} y={37 - b.altura} width={7} height={b.altura} fill={b.cor} />
      ))}
    </svg>
  );
}

/** Iniciais para o avatar de quem não tem foto. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}
