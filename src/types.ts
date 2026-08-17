export type Tipo = "f" | "c" | "a"; // força, core, aeróbico

export type Repet = "nunca" | "semanal" | "quinzenal" | "mensal";

export interface DiaInfo {
  f?: boolean;
  c?: boolean;
  a?: boolean;
  nota?: string;
}

export interface Agendamento {
  id: string;
  texto: string;
  tipos: Tipo[];
  inicio: string; // data ISO (yyyy-mm-dd)
  repet: Repet;
  diasSemana: number[]; // 0=domingo … 6=sábado (semanal/quinzenal)
}

export type Cat =
  | "aerobico"
  | "core"
  | "biceps"
  | "triceps"
  | "ombro"
  | "costas"
  | "peito"
  | "inferiores"
  | "mobilidade"
  | "combinado";

export interface TreinoSalvo {
  id: string;
  cat: Cat;
  nome: string;
  texto: string;
}

/**
 * Áreas do catálogo de exercícios: as categorias de treino salvo, menos as que
 * não descrevem um exercício — aeróbico e combinado (este agrupa treinos inteiros).
 */
export type AreaEx = Exclude<Cat, "aerobico" | "combinado">;

export interface Exercicio {
  id: string;
  area: AreaEx;
  nome: string;
  obs?: string; // dica de execução, opcional
}

export type TemaId = "papel" | "carbono" | "nevoa" | "fita";

/** Cores escolhidas pelo usuário; ausente = usa a cor padrão do tema. */
export type Cores = Partial<Record<Tipo, string>>;

export interface Dados {
  dias: Record<string, DiaInfo>;
  agendamentos: Agendamento[];
  salvos: TreinoSalvo[];
  exercicios: Exercicio[];
  metaAno: number;
  anotacoes: string;
  tema: TemaId;
  cores: Cores;
}
