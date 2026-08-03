import type { CSSProperties } from "react";
import type { Cores, TemaId, Tipo } from "./types";

export interface Paleta {
  paper: string;   // fundo da página
  panel: string;   // cartões e células
  deep: string;    // trilhos e barra de abas
  ink: string;     // texto principal
  soft: string;    // texto secundário
  line: string;    // bordas
  onDark: string;  // texto sobre preenchimento colorido
  agenda: string;  // célula de dia agendado
  agendaInk: string;
  forca: string;
  core: string;
  aero: string;
}

export interface Tema {
  id: TemaId;
  nome: string;
  desc: string;
  escuro: boolean;
  raio: number;   // cartões
  raioP: number;  // células e botões
  peso: number;   // peso do título
  p: Paleta;
}

/* As três cores de cada tema passam nos testes de daltonismo e contraste
   contra a superfície daquele tema (checagens do guia de dataviz). */
export const TEMAS: Tema[] = [
  {
    id: "papel",
    nome: "Papel",
    desc: "Quente e editorial",
    escuro: false,
    raio: 14,
    raioP: 10,
    peso: 800,
    p: {
      paper: "#E8E7DD", panel: "#F4F3EB", deep: "#DAD9CC", ink: "#1A1B17",
      soft: "#66675B", line: "#C8C7B8", onDark: "#F7F5EA",
      agenda: "#E2E3D0", agendaInk: "#75795C",
      forca: "#41609F", core: "#9B7A20", aero: "#AC2722",
    },
  },
  {
    id: "carbono",
    nome: "Carbono",
    desc: "Escuro, bom à noite",
    escuro: true,
    raio: 14,
    raioP: 10,
    peso: 800,
    p: {
      paper: "#141519", panel: "#1E1F23", deep: "#2A2B30", ink: "#EDECE5",
      soft: "#9B9B94", line: "#35363C", onDark: "#12130F",
      agenda: "#282A22", agendaInk: "#A8AC8C",
      forca: "#5794D8", core: "#AE8C37", aero: "#C13D34",
    },
  },
  {
    id: "nevoa",
    nome: "Névoa",
    desc: "Claro, frio e suave",
    escuro: false,
    raio: 20,
    raioP: 14,
    peso: 700,
    p: {
      paper: "#EBEEF3", panel: "#F7F8FA", deep: "#DDE2EA", ink: "#151A22",
      soft: "#697384", line: "#D3D9E2", onDark: "#F9FAFC",
      agenda: "#DFE7F2", agendaInk: "#5E6D85",
      forca: "#4482C4", core: "#9B7A20", aero: "#AC2722",
    },
  },
  {
    id: "fita",
    nome: "Fita",
    desc: "Alto contraste, geométrico",
    escuro: false,
    raio: 4,
    raioP: 3,
    peso: 800,
    p: {
      paper: "#F2F2F2", panel: "#FFFFFF", deep: "#E2E2E2", ink: "#000000",
      soft: "#5A5A5A", line: "#BFBFBF", onDark: "#FFFFFF",
      agenda: "#E8E8E8", agendaInk: "#3D3D3D",
      forca: "#1D4ED8", core: "#9B7A20", aero: "#AC2722",
    },
  },
];

export const TEMA_PADRAO: TemaId = "papel";

export const acharTema = (id: TemaId | undefined): Tema =>
  TEMAS.find((t) => t.id === id) ?? TEMAS[0];

export const FONTE = {
  sans: "'Archivo', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const SEM = ["D", "S", "T", "Q", "Q", "S", "S"];
export const DIA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export const ROTULO_TIPO: Record<Tipo, string> = { f: "Força", c: "Core", a: "Aeróbico" };

export interface InfoTipo {
  id: Tipo;
  rot: string;
  cor: string;
}

/** Cores em uso: as do tema, com as personalizações do usuário por cima. */
export function coresEmUso(tema: Tema, cores: Cores | undefined): Record<Tipo, string> {
  return {
    f: cores?.f || tema.p.forca,
    c: cores?.c || tema.p.core,
    a: cores?.a || tema.p.aero,
  };
}

export interface Estilos {
  eyebrow: CSSProperties;
  card: CSSProperties;
  num: CSSProperties;
  area: CSSProperties;
  input: CSSProperties;
  nav: CSSProperties;
  ghost: CSSProperties;
}

export function criarEstilos(tema: Tema): Estilos {
  const { p, raio, raioP } = tema;
  return {
    eyebrow: { fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: p.soft },
    card: { background: p.panel, border: `1px solid ${p.line}`, borderRadius: raio, padding: 16 },
    num: { fontFamily: FONTE.mono, fontWeight: 600 },
    area: { width: "100%", minHeight: 110, background: p.panel, border: `1px solid ${p.line}`, borderRadius: raioP + 2, padding: 12, fontFamily: FONTE.sans, fontSize: 15, lineHeight: 1.5, color: p.ink, resize: "vertical", boxSizing: "border-box" },
    input: { width: "100%", padding: "11px 12px", borderRadius: raioP, border: `1px solid ${p.line}`, background: p.paper, fontFamily: FONTE.sans, fontSize: 14, color: p.ink, boxSizing: "border-box" },
    nav: { width: 38, height: 38, borderRadius: raioP, border: `1px solid ${p.line}`, background: p.panel, color: p.ink, fontSize: 17, cursor: "pointer", lineHeight: 1 },
    ghost: { padding: "8px 12px", borderRadius: raioP - 1, border: `1px solid ${p.line}`, background: "transparent", color: p.soft, fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
  };
}

export const tabEst = (tema: Tema, on: boolean): CSSProperties => ({
  flex: 1, padding: "9px 0", border: "none", borderRadius: tema.raioP - 2,
  background: on ? tema.p.ink : "transparent", color: on ? tema.p.paper : tema.p.soft,
  fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
});

export const chipEst = (tema: Tema, on: boolean, cor: string): CSSProperties => ({
  flex: 1, padding: "12px 8px", borderRadius: tema.raioP,
  border: `1.5px solid ${on ? cor : tema.p.line}`, background: on ? cor : "transparent",
  color: on ? tema.p.onDark : tema.p.soft, fontFamily: FONTE.mono, fontSize: 12,
  letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer",
});

/** Preenchimento de uma célula: 1, 2 ou 3 faixas diagonais. */
export const fundoTipos = (cores: string[]): string => {
  if (cores.length === 1) return cores[0];
  if (cores.length === 2) return `linear-gradient(135deg, ${cores[0]} 0 50%, ${cores[1]} 50% 100%)`;
  return `linear-gradient(135deg, ${cores[0]} 0 33.4%, ${cores[1]} 33.4% 66.7%, ${cores[2]} 66.7% 100%)`;
};
