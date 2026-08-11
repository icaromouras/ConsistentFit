import { useState } from "react";
import type { AreaEx, Exercicio } from "../types";
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
];

export const rotuloArea = (a: AreaEx) => AREAS.find((x) => x.id === a)!.rot;

interface Props {
  exercicios: Exercicio[];
  addEx: (e: Exercicio) => void;
  upEx: (id: string, patch: Partial<Exercicio>) => void;
  delEx: (id: string) => void;
}

export default function Exercicios({ exercicios, addEx, upEx, delEx }: Props) {
  const { C, est, cor } = useTema();
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

      {AREAS.map((area) => {
        const itens = exercicios.filter((e) => e.area === area.id);
        const corArea = cor(area.id === "core" ? "c" : "f");
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

            {itens.length === 0 && (
              <div style={{ ...est.eyebrow, fontSize: 10, color: C.line, padding: "0 0 4px" }}>nenhum exercício</div>
            )}

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
                      style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: C.ink, color: C.onDark, fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
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
                    borderRadius: 9, padding: "9px 12px", cursor: "pointer",
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
