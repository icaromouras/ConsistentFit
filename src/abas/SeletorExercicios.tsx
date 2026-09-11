import { useState } from "react";
import type { AreaEx, Exercicio } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { AREAS, partirSubgrupo, repartirPorSubgrupo, tipoDaArea } from "./Exercicios";

interface Props {
  exercicios: Exercicio[];
  onEscolher: (e: Exercicio) => void;
  /** ids dos exercícios que já estão no treino sendo montado */
  noTreino?: Set<string>;
  /** tira do treino o exercício já adicionado; sem isso, o chip só adiciona */
  onRemover?: (e: Exercicio) => void;
}

/** Sanfona de áreas com os exercícios do catálogo; usada ao agendar e ao montar um treino. */
export default function SeletorExercicios({ exercicios, onEscolher, noTreino, onRemover }: Props) {
  const { C, est, cor, tema } = useTema();
  const [areaAberta, setAreaAberta] = useState<AreaEx | null>(null);

  const dentro = (e: Exercicio) => !!noTreino?.has(e.id);

  const chip = (e: Exercicio, corArea: string) => {
    const posto = dentro(e);
    // o subgrupo já é o título da linha: o chip mostra o nome sem o colchete
    const nome = partirSubgrupo(e.nome).nome;
    return (
      <button
        key={e.id}
        title={e.obs || undefined}
        aria-pressed={posto}
        aria-label={`${posto ? "Tirar do treino" : "Adicionar ao treino"}: ${nome}`}
        onClick={() => (posto && onRemover ? onRemover(e) : onEscolher(e))}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 11px", borderRadius: Math.max(3, tema.raioP - 2),
          border: `1px solid ${posto ? corArea : C.line}`,
          background: posto ? corArea + "26" : C.panel,
          color: C.ink, fontFamily: FONTE.sans, fontSize: 13, cursor: "pointer",
          fontWeight: posto ? 600 : 400,
        }}
      >
        <span aria-hidden style={{ color: posto ? corArea : C.soft, fontWeight: 700 }}>{posto ? "✓" : "+"}</span>
        {nome}
        {posto && onRemover && (
          <span aria-hidden style={{ color: corArea, fontSize: 15, lineHeight: 1, marginLeft: 1 }}>×</span>
        )}
      </button>
    );
  };

  const linhaChips = (itens: Exercicio[], corArea: string) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{itens.map((e) => chip(e, corArea))}</div>
  );

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
        const t = tipoDaArea(area.id);
        const corArea = t ? cor(t) : C.soft;
        // quantos desta área já estão no treino: dá para ver com a sanfona fechada
        const postos = itens.filter(dentro).length;
        const { soltos, secoes } = repartirPorSubgrupo(itens);
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.soft }}>
                {postos > 0 && <span style={{ color: corArea, fontWeight: 700 }}>{postos} ✓</span>}
                <span>{itens.length} {abertaEsta ? "−" : "+"}</span>
              </span>
            </button>
            {abertaEsta && (
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                {soltos.length > 0 && linhaChips(soltos, corArea)}
                {secoes.map((s) => (
                  <div key={s.chave}>
                    <div style={{ ...est.eyebrow, fontSize: 9, letterSpacing: "0.1em", marginBottom: 5 }}>{s.rot}</div>
                    {linhaChips(s.itens, corArea)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {exercicios.length > 0 && (
        <p style={{ ...est.eyebrow, fontSize: 9, margin: 0, padding: "7px 12px", lineHeight: 1.5 }}>
          {onRemover
            ? "toque para adicionar — o que já está no treino fica marcado ✓; toque de novo para tirar"
            : "toque para adicionar — o treino é agrupado por área; complete com séries e repetições no texto"}
        </p>
      )}
    </div>
  );
}
