import { useState } from "react";
import type { AreaEx, Exercicio } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { AREAS } from "./Exercicios";

interface Props {
  exercicios: Exercicio[];
  onEscolher: (e: Exercicio) => void;
}

/** Sanfona de áreas com os exercícios do catálogo; usada ao agendar e ao montar um treino. */
export default function SeletorExercicios({ exercicios, onEscolher }: Props) {
  const { C, est, tema } = useTema();
  const [areaAberta, setAreaAberta] = useState<AreaEx | null>(null);

  return (
    <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, overflow: "hidden" }}>
      {exercicios.length === 0 && (
        <p style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.6, margin: 0, padding: 12 }}>
          Nenhum exercício cadastrado ainda. Cadastre em Treinos → Exercícios e eles aparecem aqui para montar o treino com um toque.
        </p>
      )}

      {AREAS.map((area) => {
        const itens = exercicios.filter((e) => e.area === area.id);
        if (itens.length === 0) return null;
        const abertaEsta = areaAberta === area.id;
        return (
          <div key={area.id} style={{ borderBottom: `1px solid ${C.line}` }}>
            <button
              aria-expanded={abertaEsta}
              onClick={() => setAreaAberta(abertaEsta ? null : area.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 12px", border: "none", cursor: "pointer",
                background: abertaEsta ? C.deep : "transparent",
                fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em",
                textTransform: "uppercase", color: C.ink,
              }}
            >
              <span>{area.rot}</span>
              <span style={{ color: C.soft }}>{itens.length} {abertaEsta ? "−" : "+"}</span>
            </button>
            {abertaEsta && (
              <div style={{ padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {itens.map((e) => (
                  <button
                    key={e.id}
                    title={e.obs || undefined}
                    onClick={() => onEscolher(e)}
                    style={{
                      padding: "7px 11px", borderRadius: Math.max(3, tema.raioP - 2),
                      border: `1px solid ${C.line}`, background: C.panel, color: C.ink,
                      fontFamily: FONTE.sans, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    + {e.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {exercicios.length > 0 && (
        <p style={{ ...est.eyebrow, fontSize: 9, margin: 0, padding: "7px 12px", lineHeight: 1.5 }}>
          toque para adicionar — o treino é agrupado por área; complete com séries e repetições no texto
        </p>
      )}
    </div>
  );
}
