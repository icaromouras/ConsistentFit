import { useState } from "react";
import type { AreaEx, Cat, Exercicio, Tipo } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { iso, uid } from "../dados";

const hojeIso = () => {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
};

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const diaMes = (chave: string) => {
  const [, m, d] = chave.split("-");
  return `${Number(d)}/${MES_CURTO[Number(m) - 1]}`;
};

export const AREAS: { id: AreaEx; rot: string }[] = [
  { id: "inferiores", rot: "Membros inferiores" },
  { id: "core", rot: "Core" },
  { id: "peito", rot: "Peito" },
  { id: "ombro", rot: "Ombro" },
  { id: "biceps", rot: "Bíceps" },
  { id: "triceps", rot: "Tríceps" },
  { id: "costas", rot: "Costas" },
  { id: "mobilidade", rot: "Mobilidade" },
];

/** Mobilidade não é força/core/aeróbico: usa tom neutro em vez da cor de um tipo. */
export const tipoDaArea = (a: AreaEx): "f" | "c" | null =>
  a === "mobilidade" ? null : a === "core" ? "c" : "f";

const ehCabecalho = (linha: string) =>
  AREAS.some((a) => linha.trim().toUpperCase() === a.rot.toUpperCase());

/**
 * Insere um exercício no texto do treino agrupado pela área:
 * cria o cabeçalho (ex: "COSTAS") na primeira vez e, nas seguintes,
 * acrescenta ao fim da seção existente — mesmo fora de ordem.
 */
export function inserirNoTexto(texto: string, area: AreaEx, nome: string): string {
  const cabecalho = rotuloArea(area).toUpperCase();
  const item = `- ${nome} — `;
  const linhas = texto ? texto.split("\n") : [];

  const idx = linhas.findIndex((l) => l.trim().toUpperCase() === cabecalho);
  if (idx === -1) {
    const antes = texto.trim() ? texto.replace(/\n+$/, "") + "\n\n" : "";
    return `${antes}${cabecalho}\n${item}`;
  }

  // fim da seção: linha em branco ou próximo cabeçalho de área
  let fim = idx + 1;
  while (fim < linhas.length && linhas[fim].trim() !== "" && !ehCabecalho(linhas[fim])) fim++;
  linhas.splice(fim, 0, item);
  return linhas.join("\n");
}

export const rotuloArea = (a: AreaEx) => AREAS.find((x) => x.id === a)!.rot;

/** Uma linha é cabeçalho quando está toda em maiúsculas e não é item de lista. */
export const ehLinhaCabecalho = (linha: string) => {
  const t = linha.trim();
  return t.length >= 2 && !t.startsWith("-") && t === t.toUpperCase() && /\p{Lu}/u.test(t);
};

/**
 * Categoria sugerida pelos cabeçalhos presentes no texto.
 * Mais de um grupo muscular ⇒ "combinado". Devolve null se não der para inferir.
 */
export function sugerirCategoria(texto: string): Cat | null {
  const areas = new Set<AreaEx>();
  let temAerobico = false;
  for (const linha of texto.split("\n")) {
    const t = linha.trim().toUpperCase();
    const area = AREAS.find((a) => a.rot.toUpperCase() === t);
    if (area) areas.add(area.id);
    else if (t === "AERÓBICO" || t === "AEROBICO") temAerobico = true;
  }
  if (areas.size + (temAerobico ? 1 : 0) > 1) return "combinado";
  if (areas.size === 1) return [...areas][0];
  if (temAerobico) return "aerobico";
  return null;
}

/**
 * Normaliza para busca: minúsculas e sem acento, preservando o mapa de volta
 * para o texto original (cada caractere normalizado sabe de que índice veio),
 * para conseguir destacar o trecho encontrado no nome com acentos.
 */
function normalizarComMapa(s: string): { txt: string; mapa: number[] } {
  let txt = "";
  const mapa: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i].normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    for (const ch of c) {
      txt += ch;
      mapa.push(i);
    }
  }
  return { txt, mapa };
}

const normalizar = (s: string) => normalizarComMapa(s).txt;

/** Posição do termo dentro do nome original, ou null se não bater. */
function acharTrecho(nome: string, termo: string): [number, number] | null {
  const alvo = normalizar(termo);
  if (!alvo) return null;
  const { txt, mapa } = normalizarComMapa(nome);
  const i = txt.indexOf(alvo);
  if (i === -1) return null;
  return [mapa[i], mapa[i + alvo.length - 1] + 1];
}

/** Força/core/aeróbico presentes no texto, lidos dos cabeçalhos de área. */
export function tiposDoTexto(texto: string): Tipo[] {
  const achados = new Set<Tipo>();
  for (const linha of texto.split("\n")) {
    const t = linha.trim().toUpperCase();
    const area = AREAS.find((a) => a.rot.toUpperCase() === t);
    if (area) {
      const tp = tipoDaArea(area.id);
      if (tp) achados.add(tp);
    } else if (t === "AERÓBICO" || t === "AEROBICO") achados.add("a");
  }
  return (["f", "c", "a"] as Tipo[]).filter((t) => achados.has(t));
}

interface Props {
  exercicios: Exercicio[];
  addEx: (e: Exercicio) => void;
  upEx: (id: string, patch: Partial<Exercicio>) => void;
  delEx: (id: string) => void;
}

export default function Exercicios({ exercicios, addEx, upEx, delEx }: Props) {
  const { C, est, cor, tema } = useTema();
  const [editando, setEditando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const termo = busca.trim();
  const buscando = termo !== "";
  // durante a busca, o exercício em edição continua visível mesmo se o nome
  // deixar de bater — senão o card sumiria embaixo do dedo ao renomear
  const bate = (e: Exercicio) => !buscando || e.id === editando || acharTrecho(e.nome, termo) !== null;
  const achados = buscando ? exercicios.filter((e) => acharTrecho(e.nome, termo) !== null).length : 0;

  const novo = (area: AreaEx) => {
    const e: Exercicio = { id: uid(), area, nome: "" };
    addEx(e);
    setEditando(e.id);
    setBusca("");
  };

  /** Nome com o trecho buscado em destaque. */
  const nomeRealcado = (nome: string, corArea: string) => {
    const t = buscando ? acharTrecho(nome, termo) : null;
    if (!t) return nome;
    return (
      <>
        {nome.slice(0, t[0])}
        <span style={{ background: corArea + "33", borderRadius: 3, padding: "1px 1px" }}>{nome.slice(t[0], t[1])}</span>
        {nome.slice(t[1])}
      </>
    );
  };

  return (
    <>
      <p style={{ ...est.eyebrow, marginBottom: 16 }}>
        Nome, observação de execução e a carga da última vez — use-os para montar o treino do dia
      </p>

      {exercicios.length > 0 && (
        <div style={{ position: "relative", marginBottom: buscando ? 10 : 18 }}>
          <input
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Escape" && setBusca("")}
            placeholder="Buscar exercício pelo nome…"
            aria-label="Buscar exercício pelo nome"
            style={{ ...est.input, paddingLeft: 34, paddingRight: buscando ? 40 : 12 }}
          />
          <span aria-hidden style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.soft, fontSize: 17, lineHeight: 1, pointerEvents: "none" }}>
            ⌕
          </span>
          {buscando && (
            <button
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: C.soft, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "6px 8px" }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {buscando && achados > 0 && (
        <p style={{ ...est.eyebrow, fontSize: 10, marginTop: 0, marginBottom: 14 }}>
          {achados} {achados === 1 ? "resultado" : "resultados"}
        </p>
      )}

      {buscando && achados === 0 && (
        <div style={{ ...est.card, padding: 14, marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Nenhum exercício com <strong style={{ color: C.ink }}>{termo}</strong> no nome.
          </p>
        </div>
      )}

      {exercicios.length === 0 && (
        <div style={{ ...est.card, padding: 14, marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Nenhum exercício ainda. Toque em <strong style={{ color: C.ink }}>+ novo</strong> numa área para cadastrar —
            depois eles viram botões de um toque ao montar o treino no calendário.
          </p>
        </div>
      )}

      {AREAS.map((area) => {
        const itens = exercicios.filter((e) => e.area === area.id && bate(e));
        // buscando, uma área sem resultado sai da tela em vez de virar cabeçalho vazio
        if (buscando && itens.length === 0) return null;
        const t = tipoDaArea(area.id);
        const corArea = t ? cor(t) : C.soft;
        return (
          <div key={area.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: corArea, display: "inline-block" }} />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{area.rot}</span>
                {itens.length > 0 && <span style={{ ...est.num, fontSize: 11, color: C.soft }}>{itens.length}</span>}
              </span>
              {!buscando && (
                <button
                  style={{ ...est.ghost, padding: "4px 10px", fontSize: 10 }}
                  aria-label={`Novo exercício em ${area.rot}`}
                  onClick={() => novo(area.id)}
                >
                  + novo
                </button>
              )}
            </div>

            {itens.map((e) =>
              editando === e.id ? (
                <div key={e.id} style={{ ...est.card, padding: 12, marginBottom: 6, borderLeft: `3px solid ${corArea}` }}>
                  <input
                    value={e.nome}
                    autoFocus
                    onChange={(ev) => upEx(e.id, { nome: ev.target.value })}
                    placeholder="Nome do exercício (ex: agachamento livre)"
                    style={{ ...est.input, marginBottom: 8, fontWeight: 600 }}
                  />
                  <input
                    value={e.obs || ""}
                    onChange={(ev) => upEx(e.id, { obs: ev.target.value })}
                    placeholder="Observação de execução (opcional)"
                    style={{ ...est.input, marginBottom: 8, fontSize: 13 }}
                  />
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <input
                      value={e.carga || ""}
                      onChange={(ev) => {
                        const carga = ev.target.value;
                        // a data acompanha a carga: sem carga, não há "última vez"
                        upEx(e.id, { carga, cargaEm: carga.trim() ? hojeIso() : undefined });
                      }}
                      placeholder="Peso / carga (ex: 20 kg, placa 5)"
                      aria-label="Peso ou carga do exercício"
                      style={{ ...est.input, fontSize: 13 }}
                    />
                    {(e.carga || "").trim() && e.cargaEm && (
                      <span style={{ ...est.num, fontSize: 10, color: C.soft, flexShrink: 0 }}>{diaMes(e.cargaEm)}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={{ flex: 1, padding: "9px", borderRadius: tema.raioP - 1, border: "none", background: C.ink, color: C.onDark, fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                      onClick={() => {
                        // um exercício sem nome não serve para nada: descarta em vez de guardar vazio
                        if (!e.nome.trim()) delEx(e.id);
                        setEditando(null);
                      }}
                    >
                      Pronto
                    </button>
                    <button
                      style={{ ...est.ghost, color: C.aero, borderColor: C.aero }}
                      onClick={() => {
                        if (!e.nome.trim() || confirm(`Excluir "${e.nome}"?`)) {
                          delEx(e.id);
                          setEditando(null);
                        }
                      }}
                    >
                      excluir
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={e.id}
                  onClick={() => setEditando(e.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", marginBottom: 5,
                    background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid ${corArea}`,
                    borderRadius: tema.raioP - 1, padding: "9px 12px", cursor: "pointer",
                    fontFamily: FONTE.sans, fontSize: 14, color: C.ink,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 600, flex: 1 }}>{nomeRealcado(e.nome, corArea)}</span>
                    {(e.carga || "").trim() && (
                      <span style={{ ...est.num, fontSize: 11, color: C.ink, flexShrink: 0, border: `1px solid ${C.line}`, borderRadius: 4, padding: "2px 6px" }}>
                        {e.carga}
                      </span>
                    )}
                  </span>
                  {(e.obs || "").trim() && (
                    <span style={{ display: "block", color: C.soft, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {e.obs}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        );
      })}
    </>
  );
}
