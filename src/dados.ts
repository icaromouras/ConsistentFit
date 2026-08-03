import type { Agendamento, Dados, DiaInfo } from "./types";

export const KEY = "consistentfit-v1";
const KEY_ANTIGA = "treinos-v1";

export const VAZIO: Dados = { dias: {}, agendamentos: [], salvos: [], metaAno: 0, anotacoes: "" };

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const parseIso = (k: string) =>
  new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));

export function carregar(): Dados {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...VAZIO, ...(JSON.parse(raw) as Partial<Dados>) };

    // migração do app antigo (musculação → força, cardio → aeróbico)
    const antigo = localStorage.getItem(KEY_ANTIGA);
    if (antigo) {
      const v = JSON.parse(antigo) as {
        dias?: Record<string, { m?: boolean; c?: boolean; nota?: string }>;
        plano?: string;
        objetivos?: string;
      };
      const dias: Record<string, DiaInfo> = {};
      Object.entries(v.dias ?? {}).forEach(([k, d]) => {
        dias[k] = { f: !!d.m, a: !!d.c, nota: d.nota || "" };
      });
      const anotacoes = [v.plano, v.objetivos].filter((t) => (t || "").trim()).join("\n\n");
      return { ...VAZIO, dias, anotacoes };
    }
  } catch {
    // dados corrompidos ou storage indisponível: começa vazio
  }
  return VAZIO;
}

export function salvar(dados: Dados) {
  localStorage.setItem(KEY, JSON.stringify(dados));
}

const inicioSemana = (d: Date) => {
  const x = new Date(d);
  x.setDate(d.getDate() - d.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
};

export function agendadosNoDia(ags: Agendamento[], k: string): Agendamento[] {
  const d = parseIso(k);
  return ags.filter((a) => {
    const ini = parseIso(a.inicio);
    if (d < ini) return false;
    if (a.repet === "nunca") return k === a.inicio;
    if (a.repet === "mensal") return d.getDate() === ini.getDate();
    if (!a.diasSemana.includes(d.getDay())) return false;
    if (a.repet === "semanal") return true;
    const semanas = Math.round((inicioSemana(d).getTime() - inicioSemana(ini).getTime()) / 604800000);
    return semanas % 2 === 0;
  });
}
