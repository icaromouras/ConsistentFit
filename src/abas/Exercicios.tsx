import { useState } from "react";
import type { AreaEx, Cat, Exercicio } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { uid } from "../dados";

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

interface Props {
  exercicios: Exercicio[];
  addEx: (e: Exercicio) => void;
  upEx: (id: string, patch: Partial<Exercicio>) => void;
  delEx: (id: string) => void;
}

export default function Exercicios({ exercicios, addEx, upEx, delEx }: Props) {
  const { C, est, cor, tema } = useTema();
  const [editando, setEditando] = useState<string | null>(null);

  const novo = (area: AreaEx) => {
    const e: Exercicio = { id: uid(), area, nome: "" };
    addEx(e);
    setEditando(e.id);
  };

  return (
    <>
      <p style={{ ...est.eyebrow, marginBottom: 16 }}>
        Só o nome (e uma observação, se quiser) — use-os para montar treinos ao agendar
      </p>

      {exercicios.length === 0 && (
        <div style={{ ...est.card, padding: 14, marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Nenhum exercício ainda. Toque em <strong style={{ color: C.ink }}>+ novo</strong> numa área para cadastrar —
            depois eles viram botões de um toque ao montar o treino no calendário.
          </p>
        </div>
      )}

      {AREAS.map((area) => {
        const itens = exercicios.filter((e) => e.area === area.id);
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
              <button
                style={{ ...est.ghost, padding: "4px 10px", fontSize: 10 }}
                aria-label={`Novo exercício em ${area.rot}`}
                onClick={() => novo(area.id)}
              >
                + novo
              </button>
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
                  <span style={{ fontWeight: 600 }}>{e.nome}</span>
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
