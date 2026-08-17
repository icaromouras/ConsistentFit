import { useState } from "react";
import type { Exercicio, TreinoSalvo } from "../types";
import { FONTE, fundoTipos } from "../temas";
import { useTema } from "../tema-ctx";
import { GRUPOS, ROT_CAT } from "../categorias";
import SeletorExercicios from "./SeletorExercicios";
import { ehLinhaCabecalho, inserirNoTexto } from "./Exercicios";

/** Remonta o texto descartando cabeçalhos que ficaram sem nenhum conteúdo embaixo. */
function limparTexto(linhas: string[]): string {
  const fica = linhas.filter((l, i) => {
    if (!ehLinhaCabecalho(l)) return true;
    for (let j = i + 1; j < linhas.length; j++) {
      if (!linhas[j].trim()) continue; // linha em branco não encerra a seção
      if (ehLinhaCabecalho(linhas[j])) break;
      return true;
    }
    return false;
  });
  return fica.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const removerLinha = (texto: string, i: number) => {
  const l = texto.split("\n");
  l.splice(i, 1);
  return limparTexto(l);
};

/** Tira o cabeçalho e tudo que está sob ele, até o próximo cabeçalho. */
const removerSecao = (texto: string, i: number) => {
  const l = texto.split("\n");
  let fim = i + 1;
  while (fim < l.length && !ehLinhaCabecalho(l[fim])) fim++;
  l.splice(i, fim - i);
  return limparTexto(l);
};

const trocarLinha = (texto: string, i: number, nova: string) => {
  const l = texto.split("\n");
  l[i] = nova;
  return limparTexto(l);
};

/** Anexa um treino salvo inteiro como mais uma seção do treino sendo montado. */
export function juntarTreino(texto: string, s: TreinoSalvo): string {
  const corpo = (s.texto || "").trim() || s.nome;
  // sem cabeçalho próprio, o bloco entra sob o nome da categoria de origem
  const bloco = corpo.split("\n").some(ehLinhaCabecalho)
    ? corpo
    : `${(ROT_CAT[s.cat] || s.cat).toUpperCase()}\n${corpo}`;
  return texto.trim() ? `${texto.replace(/\n+$/, "")}\n\n${bloco}` : bloco;
}

interface Props {
  texto: string;
  onTexto: (t: string) => void;
  salvos: TreinoSalvo[];
  exercicios: Exercicio[];
  /** treino salvo que não deve aparecer na lista (o próprio, quando está sendo alterado) */
  ignorar?: string;
  placeholder?: string;
}

/**
 * Painel único de montar treino: escrever, juntar treinos salvos, pegar exercícios
 * do catálogo e ajustar a lista. Usado no dia (Mês) e na biblioteca (Treinos).
 */
export default function MontarTreino({ texto, onTexto, salvos, exercicios, ignorar, placeholder }: Props) {
  const { C, est, cor, tema } = useTema();
  const [painel, setPainel] = useState<"salvos" | "exercicios" | "lista" | null>(null);
  const [linhaEdit, setLinhaEdit] = useState<number | null>(null);
  const [linhaValor, setLinhaValor] = useState("");

  const disponiveis = salvos.filter((s) => s.id !== ignorar);
  const linhas = texto.split("\n").map((l, i) => ({ i, l })).filter(({ l }) => l.trim() !== "");

  const abrir = (p: "salvos" | "exercicios" | "lista") => {
    setPainel((atual) => (atual === p ? null : p));
    setLinhaEdit(null);
  };

  const comecarLinha = (i: number, l: string) => {
    setLinhaEdit(i);
    setLinhaValor(ehLinhaCabecalho(l) ? l.trim() : l.trim().replace(/^-\s*/, ""));
  };

  const gravarLinha = () => {
    if (linhaEdit === null) return;
    const original = texto.split("\n")[linhaEdit] ?? "";
    const valor = linhaValor.trim();
    if (!valor) onTexto(removerLinha(texto, linhaEdit));
    else onTexto(trocarLinha(texto, linhaEdit, ehLinhaCabecalho(original) ? valor : `- ${valor}`));
    setLinhaEdit(null);
  };

  const aba = (p: "salvos" | "exercicios" | "lista"): React.CSSProperties => ({
    ...est.ghost, flex: 1, padding: "10px 4px", borderStyle: "dashed",
    color: painel === p ? C.ink : C.soft, borderColor: painel === p ? C.ink : C.line,
  });

  const corGrupo = (g: (typeof GRUPOS)[number]) =>
    g.combinado ? fundoTipos([cor("f"), cor("c"), cor("a")]) : g.tipo ? cor(g.tipo) : C.soft;

  const caixa: React.CSSProperties = {
    marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, overflow: "hidden",
  };

  return (
    <>
      <textarea
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        placeholder={placeholder ?? "Escreva o treino, ou use os botões abaixo"}
        style={{ ...est.area, minHeight: 96, background: C.paper, fontSize: 14 }}
      />

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button style={aba("salvos")} aria-label="Juntar treino salvo" aria-expanded={painel === "salvos"} onClick={() => abrir("salvos")}>
          treino salvo
        </button>
        <button style={aba("exercicios")} aria-label="Adicionar exercício do catálogo" aria-expanded={painel === "exercicios"} onClick={() => abrir("exercicios")}>
          exercício
        </button>
        <button
          style={{ ...aba("lista"), opacity: texto.trim() ? 1 : 0.45 }}
          aria-label="Ajustar a lista do treino"
          aria-expanded={painel === "lista"}
          disabled={!texto.trim()}
          onClick={() => abrir("lista")}
        >
          ajustar
        </button>
      </div>

      {painel === "salvos" && (
        <div style={caixa}>
          {disponiveis.length === 0 ? (
            <p style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.6, margin: 0, padding: 12 }}>
              Nenhum treino salvo ainda. Guarde um em <strong style={{ color: C.ink }}>Treinos</strong> e ele aparece aqui.
            </p>
          ) : (
            <>
              {GRUPOS.map((g) => {
                const itens = disponiveis.filter((s) => g.cats.some((c) => c.id === s.cat));
                if (itens.length === 0) return null;
                return (
                  <div key={g.rot} style={{ borderBottom: `1px solid ${C.line}`, padding: "8px 10px" }}>
                    <div style={{ ...est.eyebrow, fontSize: 9, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <i style={{ width: 8, height: 8, borderRadius: 2, background: corGrupo(g), display: "inline-block" }} />
                      {g.rot}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {itens.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onTexto(juntarTreino(texto, s))}
                          style={{
                            padding: "8px 11px", borderRadius: Math.max(3, tema.raioP - 2),
                            border: `1px solid ${C.line}`, background: C.panel, color: C.ink,
                            fontFamily: FONTE.sans, fontSize: 13, cursor: "pointer",
                          }}
                        >
                          + {s.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p style={{ ...est.eyebrow, fontSize: 9, margin: 0, padding: "7px 12px", lineHeight: 1.5 }}>
                toque para juntar — dá para somar quantos quiser num treino só
              </p>
            </>
          )}
        </div>
      )}

      {painel === "exercicios" && (
        <SeletorExercicios
          exercicios={exercicios}
          onEscolher={(e) => onTexto(inserirNoTexto(texto, e.area, e.nome))}
        />
      )}

      {painel === "lista" && texto.trim() && (
        <div style={caixa}>
          {linhas.map(({ i, l }) => {
            const cab = ehLinhaCabecalho(l);
            if (linhaEdit === i) {
              return (
                <div key={i} style={{ display: "flex", gap: 6, padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>
                  <input
                    value={linhaValor}
                    autoFocus
                    onChange={(e) => setLinhaValor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") gravarLinha();
                      if (e.key === "Escape") setLinhaEdit(null);
                    }}
                    style={{ ...est.input, padding: "8px 10px", fontSize: 14 }}
                  />
                  <button style={{ ...est.ghost, padding: "8px 12px", color: C.ink, borderColor: C.ink }} onClick={gravarLinha}>
                    ok
                  </button>
                </div>
              );
            }
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.line}`, paddingLeft: cab ? 10 : 16 }}>
                <button
                  onClick={() => comecarLinha(i, l)}
                  style={{
                    flex: 1, textAlign: "left", background: "transparent", border: "none",
                    cursor: "pointer", padding: "9px 2px",
                    ...(cab
                      ? { ...est.eyebrow, fontSize: 9, color: C.ink }
                      : { fontFamily: FONTE.sans, fontSize: 13.5, color: C.ink }),
                  }}
                >
                  {cab ? l.trim() : l.trim().replace(/^-\s*/, "")}
                </button>
                <button
                  aria-label={cab ? `Remover a seção ${l.trim()}` : `Remover ${l.trim().replace(/^-\s*/, "")}`}
                  onClick={() => { onTexto(cab ? removerSecao(texto, i) : removerLinha(texto, i)); setLinhaEdit(null); }}
                  style={{ border: "none", background: "transparent", color: C.soft, cursor: "pointer", fontSize: 17, lineHeight: 1, padding: "9px 12px" }}
                >
                  ×
                </button>
              </div>
            );
          })}
          <p style={{ ...est.eyebrow, fontSize: 9, margin: 0, padding: "7px 12px", lineHeight: 1.5 }}>
            toque para mudar séries ou nome · × remove — no título, remove a seção inteira
          </p>
        </div>
      )}
    </>
  );
}
