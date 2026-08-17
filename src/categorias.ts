import type { Cat, Tipo } from "./types";

export interface Grupo {
  rot: string;
  tipo: Tipo | null;
  /** junta mais de um grupo muscular: aparece com as três cores */
  combinado?: boolean;
  cats: { id: Cat; rot: string }[];
}

/** Ordem única das categorias de treino, usada na biblioteca e ao montar o treino do dia. */
export const GRUPOS: Grupo[] = [
  {
    rot: "Força", tipo: "f",
    cats: [
      { id: "peito", rot: "Peito" },
      { id: "costas", rot: "Costas" },
      { id: "ombro", rot: "Ombro" },
      { id: "biceps", rot: "Bíceps" },
      { id: "triceps", rot: "Tríceps" },
      { id: "inferiores", rot: "Membros inferiores" },
    ],
  },
  { rot: "Core", tipo: "c", cats: [{ id: "core", rot: "Core" }] },
  { rot: "Aeróbico", tipo: "a", cats: [{ id: "aerobico", rot: "Aeróbico" }] },
  { rot: "Mobilidade", tipo: null, cats: [{ id: "mobilidade", rot: "Mobilidade" }] },
  { rot: "Combinado", tipo: null, combinado: true, cats: [{ id: "combinado", rot: "Combinado" }] },
];

export const ROT_CAT: Record<string, string> = Object.fromEntries(
  GRUPOS.flatMap((g) => g.cats.map((c) => [c.id, c.rot]))
);

export const grupoDe = (cat: Cat): Grupo => GRUPOS.find((g) => g.cats.some((c) => c.id === cat))!;
