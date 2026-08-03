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
  | "inferiores";

export interface TreinoSalvo {
  id: string;
  cat: Cat;
  nome: string;
  texto: string;
}

export interface Dados {
  dias: Record<string, DiaInfo>;
  agendamentos: Agendamento[];
  salvos: TreinoSalvo[];
  metaAno: number;
  anotacoes: string;
}
