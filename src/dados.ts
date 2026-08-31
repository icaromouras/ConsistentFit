import type { Agendamento, AreaEx, Cat, Cores, Dados, DiaInfo, Exercicio, Repet, TemaId, Tipo, TreinoSalvo } from "./types";

export const KEY = "consistentfit-v1";
const KEY_ANTIGA = "treinos-v1";

export const VAZIO: Dados = {
  dias: {}, agendamentos: [], salvos: [], exercicios: [], metaAno: 0, anotacoes: "",
  tema: "papel", cores: {},
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const parseIso = (k: string) =>
  new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));

export function carregar(): Dados {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = { ...VAZIO, ...(JSON.parse(raw) as Partial<Dados>) };
      // um tema inválido (versão antiga, arquivo editado à mão) deixaria a tela sem cor
      if (!["papel", "carbono", "nevoa", "fita"].includes(d.tema)) d.tema = VAZIO.tema;
      if (typeof d.cores !== "object" || d.cores === null) d.cores = {};
      if (!Array.isArray(d.exercicios)) d.exercicios = [];
      return d;
    }

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

/* ---------- backup: exportar e importar ---------- */

const VERSAO_BACKUP = 1;
const CHAVE_DIA = /^\d{4}-\d{2}-\d{2}$/;
const REPETS: Repet[] = ["nunca", "semanal", "quinzenal", "mensal"];
const TIPOS_VALIDOS: Tipo[] = ["f", "c", "a"];
const CATS: Cat[] = ["aerobico", "core", "biceps", "triceps", "ombro", "costas", "peito", "inferiores", "mobilidade", "combinado"];
const AREAS_EX: AreaEx[] = ["inferiores", "core", "peito", "ombro", "biceps", "triceps", "costas", "mobilidade"];
const TEMAS_VALIDOS: TemaId[] = ["papel", "carbono", "nevoa", "fita"];
const HEX = /^#[0-9a-fA-F]{6}$/;

const ehObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function nomeArquivoBackup(d = new Date()): string {
  return `consistentfit-${iso(d.getFullYear(), d.getMonth(), d.getDate())}.json`;
}

export function baixarBackup(dados: Dados) {
  const conteudo = JSON.stringify(
    { app: "consistentfit", versao: VERSAO_BACKUP, exportadoEm: new Date().toISOString(), dados },
    null,
    2
  );
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoBackup();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ResultadoImport {
  dados: Dados;
  resumo: { dias: number; agendamentos: number; salvos: number };
  descartados: number;
}

/** Lê um arquivo de backup, descartando entradas inválidas. Devolve null se o arquivo não for do app. */
export function lerBackup(texto: string): ResultadoImport | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!ehObj(bruto)) return null;

  // aceita tanto o arquivo exportado quanto um dump direto do estado
  const raiz = ehObj(bruto.dados) ? bruto.dados : bruto;
  if (!["dias", "agendamentos", "salvos", "metaAno", "anotacoes"].some((k) => k in raiz)) return null;

  let descartados = 0;
  const ids = new Set<string>();
  const idUnico = (v: unknown) => {
    const base = typeof v === "string" && v.trim() && !ids.has(v) ? v : uid();
    ids.add(base);
    return base;
  };

  const dias: Record<string, DiaInfo> = {};
  if (ehObj(raiz.dias)) {
    Object.entries(raiz.dias).forEach(([k, v]) => {
      if (!CHAVE_DIA.test(k) || !ehObj(v)) {
        descartados++;
        return;
      }
      const dia: DiaInfo = {};
      if (v.f === true) dia.f = true;
      if (v.c === true) dia.c = true;
      if (v.a === true) dia.a = true;
      if (typeof v.nota === "string" && v.nota.trim()) dia.nota = v.nota;
      if (Array.isArray(v.feitos)) {
        const feitos = v.feitos.filter((n): n is string => typeof n === "string" && !!n.trim()).slice(0, 200);
        if (feitos.length) dia.feitos = feitos;
      }
      if (dia.f || dia.c || dia.a || dia.nota || dia.feitos) dias[k] = dia;
      else descartados++;
    });
  }

  const agendamentos: Agendamento[] = [];
  if (Array.isArray(raiz.agendamentos)) {
    raiz.agendamentos.forEach((a) => {
      if (!ehObj(a) || typeof a.texto !== "string" || typeof a.inicio !== "string" || !CHAVE_DIA.test(a.inicio)) {
        descartados++;
        return;
      }
      const repet = REPETS.includes(a.repet as Repet) ? (a.repet as Repet) : "nunca";
      const diasSemana = Array.isArray(a.diasSemana)
        ? a.diasSemana.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
        : [];
      agendamentos.push({
        id: idUnico(a.id),
        texto: a.texto,
        tipos: Array.isArray(a.tipos) ? a.tipos.filter((t): t is Tipo => TIPOS_VALIDOS.includes(t as Tipo)) : [],
        inicio: a.inicio,
        repet,
        // uma repetição semanal sem dias marcados nunca apareceria no calendário
        diasSemana:
          (repet === "semanal" || repet === "quinzenal") && diasSemana.length === 0
            ? [parseIso(a.inicio).getDay()]
            : diasSemana,
      });
    });
  }

  const salvos: TreinoSalvo[] = [];
  if (Array.isArray(raiz.salvos)) {
    raiz.salvos.forEach((s) => {
      if (!ehObj(s) || !CATS.includes(s.cat as Cat)) {
        descartados++;
        return;
      }
      salvos.push({
        id: idUnico(s.id),
        cat: s.cat as Cat,
        nome: typeof s.nome === "string" && s.nome.trim() ? s.nome : "Treino sem nome",
        texto: typeof s.texto === "string" ? s.texto : "",
      });
    });
  }

  const metaAno =
    typeof raiz.metaAno === "number" && Number.isFinite(raiz.metaAno) && raiz.metaAno > 0
      ? Math.floor(raiz.metaAno)
      : 0;

  const exercicios: Exercicio[] = [];
  if (Array.isArray(raiz.exercicios)) {
    raiz.exercicios.forEach((e) => {
      if (!ehObj(e) || !AREAS_EX.includes(e.area as AreaEx) || typeof e.nome !== "string" || !e.nome.trim()) {
        descartados++;
        return;
      }
      const carga = typeof e.carga === "string" && e.carga.trim() ? e.carga.slice(0, 60) : undefined;
      exercicios.push({
        id: idUnico(e.id),
        area: e.area as AreaEx,
        nome: e.nome,
        obs: typeof e.obs === "string" && e.obs.trim() ? e.obs : undefined,
        carga,
        // a data só faz sentido acompanhando uma carga
        cargaEm: carga && typeof e.cargaEm === "string" && CHAVE_DIA.test(e.cargaEm) ? e.cargaEm : undefined,
      });
    });
  }

  const cores: Cores = {};
  if (ehObj(raiz.cores)) {
    TIPOS_VALIDOS.forEach((t) => {
      const v = raiz.cores as Record<string, unknown>;
      if (typeof v[t] === "string" && HEX.test(v[t] as string)) cores[t] = v[t] as string;
    });
  }

  return {
    dados: {
      dias,
      agendamentos,
      salvos,
      exercicios,
      metaAno,
      anotacoes: typeof raiz.anotacoes === "string" ? raiz.anotacoes : "",
      tema: TEMAS_VALIDOS.includes(raiz.tema as TemaId) ? (raiz.tema as TemaId) : "papel",
      cores,
    },
    resumo: { dias: Object.keys(dias).length, agendamentos: agendamentos.length, salvos: salvos.length },
    descartados,
  };
}
