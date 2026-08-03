import type { CSSProperties } from "react";
import type { Tipo } from "./types";

export const C = {
  paper: "#E8E7DD",
  panel: "#F4F3EB",
  deep: "#DAD9CC",
  ink: "#1A1B17",
  soft: "#66675B",
  line: "#C8C7B8",
  onDark: "#F7F5EA",
  // paleta validada (daltonismo + contraste) para os três tipos
  forca: "#41609F",
  core: "#B98A1F",
  aero: "#C24425",
  // dias com treino agendado
  agenda: "#E2E3D0",
  agendaInk: "#75795C",
};

export const FONTE = {
  sans: "'Archivo', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const TIPOS: { id: Tipo; rot: string; cor: string }[] = [
  { id: "f", rot: "Força", cor: C.forca },
  { id: "c", rot: "Core", cor: C.core },
  { id: "a", rot: "Aeróbico", cor: C.aero },
];

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const SEM = ["D", "S", "T", "Q", "Q", "S", "S"];
export const DIA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export const est: Record<string, CSSProperties> = {
  eyebrow: { fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: C.soft },
  card: { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 },
  num: { fontFamily: FONTE.mono, fontWeight: 600 },
  area: { width: "100%", minHeight: 110, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontFamily: FONTE.sans, fontSize: 15, lineHeight: 1.5, color: C.ink, resize: "vertical", boxSizing: "border-box" },
  input: { width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, fontFamily: FONTE.sans, fontSize: 14, color: C.ink, boxSizing: "border-box" },
  nav: { width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.line}`, background: C.panel, color: C.ink, fontSize: 17, cursor: "pointer", lineHeight: 1 },
  ghost: { padding: "8px 12px", borderRadius: 9, border: `1px solid ${C.line}`, background: "transparent", color: C.soft, fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
};

export const tabEst = (on: boolean): CSSProperties => ({
  flex: 1, padding: "9px 0", border: "none", borderRadius: 8,
  background: on ? C.ink : "transparent", color: on ? C.onDark : C.soft,
  fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
});

export const chipEst = (on: boolean, cor: string): CSSProperties => ({
  flex: 1, padding: "12px 8px", borderRadius: 10,
  border: `1.5px solid ${on ? cor : C.line}`, background: on ? cor : "transparent",
  color: on ? C.onDark : C.soft, fontFamily: FONTE.mono, fontSize: 12,
  letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer",
});

// fundo de célula/indicador para 1–3 tipos concluídos
export const fundoTipos = (cores: string[]): string => {
  if (cores.length === 1) return cores[0];
  if (cores.length === 2) return `linear-gradient(135deg, ${cores[0]} 0 50%, ${cores[1]} 50% 100%)`;
  return `linear-gradient(135deg, ${cores[0]} 0 33.4%, ${cores[1]} 33.4% 66.7%, ${cores[2]} 66.7% 100%)`;
};

export const coresDoDia = (v?: { f?: boolean; c?: boolean; a?: boolean }): string[] =>
  v ? TIPOS.filter((t) => v[t.id]).map((t) => t.cor) : [];
