import { useState } from "react";
import type { Cat, Exercicio, Tipo, TreinoSalvo } from "../types";
import { FONTE, fundoTipos } from "../temas";
import { useTema } from "../tema-ctx";
import { uid } from "../dados";
import ModalTreino from "./ModalTreino";
import SeletorExercicios from "./SeletorExercicios";
import { ehLinhaCabecalho, inserirNoTexto, sugerirCategoria } from "./Exercicios";

const GRUPOS: { rot: string; tipo: Tipo | null; combinado?: boolean; cats: { id: Cat; rot: string }[] }[] = [
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
  // treinos que juntam mais de um grupo muscular
  { rot: "Combinado", tipo: null, combinado: true, cats: [{ id: "combinado", rot: "Combinado" }] },
];

const ROT_CAT: Record<string, string> = Object.fromEntries(
  GRUPOS.flatMap((g) => g.cats.map((c) => [c.id, c.rot]))
);

/** Resumo de uma linha: conta exercícios; sem lista, mostra a 1ª linha que não é cabeçalho. */
const resumoTreino = (texto: string): string => {
  const linhas = (texto || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const itens = linhas.filter((l) => l.startsWith("-"));
  if (itens.length > 0) return `${itens.length} ${itens.length === 1 ? "exercício" : "exercícios"}`;
  const primeira = linhas.find((l) => !(l === l.toUpperCase() && /\p{Lu}/u.test(l)));
  return primeira || "";
};

interface Props {
  salvos: TreinoSalvo[];
  exercicios: Exercicio[];
  addSalvo: (t: TreinoSalvo) => void;
  upSalvo: (id: string, patch: Partial<TreinoSalvo>) => void;
  delSalvo: (id: string) => void;
}

export default function Biblioteca({ salvos, exercicios, addSalvo, upSalvo, delSalvo }: Props) {
  const { C, est, cor, tema } = useTema();
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const salvoAberto = aberto ? salvos.find((s) => s.id === aberto) : undefined;
  const grupoDe = (cat: Cat) => GRUPOS.find((g) => g.cats.some((c) => c.id === cat))!;
  const rotuloCat = (cat: Cat) => grupoDe(cat).cats.find((c) => c.id === cat)!.rot;

  /** Combinado mistura grupos: mostra as três cores, como uma célula de 3 tipos no calendário. */
  const corGrupo = (g: (typeof GRUPOS)[number]) =>
    g.combinado ? fundoTipos([cor("f"), cor("c"), cor("a")]) : g.tipo ? cor(g.tipo) : C.soft;

  /**
   * Listra da esquerda. No Combinado ela empilha as três cores de cima para baixo —
   * o corte diagonal do marcador desapareceria numa faixa de 3px de largura.
   */
  const listra = (g: (typeof GRUPOS)[number]): React.CSSProperties => {
    if (!g.combinado) return { borderLeft: `3px solid ${g.tipo ? cor(g.tipo) : C.soft}` };
    const faixas = `linear-gradient(to bottom, ${cor("f")} 0 33.3%, ${cor("c")} 33.3% 66.6%, ${cor("a")} 66.6% 100%)`;
    return {
      borderLeft: "3px solid transparent",
      backgroundImage: `linear-gradient(${C.panel}, ${C.panel}), ${faixas}`,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
    };
  };

  const novo = (cat: Cat) => {
    const t: TreinoSalvo = { id: uid(), cat, nome: "Novo treino", texto: "" };
    addSalvo(t);
    setEditando(t.id);
  };

  /* --- compositor: monta um treino juntando treinos salvos, exercícios e texto --- */
  const [montando, setMontando] = useState(false);
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [cat, setCat] = useState<Cat>("combinado");
  const [catManual, setCatManual] = useState(false);
  const [juntando, setJuntando] = useState(false);
  const [comExercicios, setComExercicios] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fecharCompositor = () => {
    setMontando(false);
    setNome("");
    setTexto("");
    setCat("combinado");
    setCatManual(false);
    setJuntando(false);
    setComExercicios(false);
  };

  // enquanto o usuário não escolher a categoria à mão, ela acompanha o conteúdo
  const aplicarTexto = (novoTexto: string) => {
    setTexto(novoTexto);
    if (!catManual) setCat(sugerirCategoria(novoTexto) ?? "combinado");
  };

  const juntarTreino = (s: TreinoSalvo) => {
    const corpo = (s.texto || "").trim() || s.nome;
    // sem cabeçalho próprio, o bloco entra sob o nome da categoria de origem
    const bloco = corpo.split("\n").some(ehLinhaCabecalho)
      ? corpo
      : `${(ROT_CAT[s.cat] || s.cat).toUpperCase()}\n${corpo}`;
    aplicarTexto(texto.trim() ? `${texto.replace(/\n+$/, "")}\n\n${bloco}` : bloco);
    setMsg(null);
  };

  const salvarCompositor = () => {
    if (!nome.trim() || !texto.trim()) return;
    addSalvo({ id: uid(), cat, nome: nome.trim(), texto: texto.trim() });
    setMsg(`Salvo como "${nome.trim()}" em ${ROT_CAT[cat]}.`);
    fecharCompositor();
  };

  const botaoPrimario = (ativo: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px", borderRadius: tema.raioP, border: "none",
    background: ativo ? C.ink : C.deep, color: ativo ? C.onDark : C.soft,
    fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em",
    textTransform: "uppercase", cursor: ativo ? "pointer" : "default",
  });

  return (
    <>
      <p style={{ ...est.eyebrow, marginBottom: 12 }}>
        Treinos padrão — edite uma vez, use quando quiser ao agendar
      </p>

      {!montando && (
        <button
          onClick={() => { setMontando(true); setMsg(null); }}
          style={{
            width: "100%", marginBottom: 16, padding: "12px", borderRadius: tema.raioP,
            border: "none", background: C.ink, color: C.onDark, cursor: "pointer",
            fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
          }}
        >
          + Montar e salvar treino
        </button>
      )}

      {msg && !montando && (
        <p role="status" style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.5, color: C.forca, margin: "0 0 16px" }}>
          {msg}
        </p>
      )}

      {montando && (
        <div style={{ ...est.card, marginBottom: 20 }}>
          <div style={{ ...est.eyebrow, marginBottom: 10 }}>Montar treino</div>

          <input
            value={nome}
            autoFocus
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do treino (ex: Treino de hoje)"
            style={{ ...est.input, marginBottom: 8, fontWeight: 600 }}
          />

          <textarea
            value={texto}
            onChange={(e) => aplicarTexto(e.target.value)}
            placeholder={"Escreva livremente, ou use os botões abaixo para juntar\ntreinos salvos e exercícios do catálogo"}
            style={{ ...est.area, minHeight: 110, background: C.paper, fontSize: 14 }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              style={{ ...est.ghost, flex: 1, padding: "9px 6px", borderStyle: "dashed", color: juntando ? C.ink : C.soft, borderColor: juntando ? C.ink : C.line }}
              aria-expanded={juntando}
              onClick={() => { setJuntando((v) => !v); setComExercicios(false); }}
            >
              {juntando ? "− treinos" : "+ juntar treino"}
            </button>
            <button
              style={{ ...est.ghost, flex: 1, padding: "9px 6px", borderStyle: "dashed", color: comExercicios ? C.ink : C.soft, borderColor: comExercicios ? C.ink : C.line }}
              aria-expanded={comExercicios}
              onClick={() => { setComExercicios((v) => !v); setJuntando(false); }}
            >
              {comExercicios ? "− exercícios" : "+ exercícios"}
            </button>
          </div>

          {juntando && (
            <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, overflow: "hidden" }}>
              {salvos.length === 0 ? (
                <p style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.6, margin: 0, padding: 12 }}>
                  Nenhum treino salvo ainda para juntar. Crie um com <strong style={{ color: C.ink }}>+ novo</strong> numa categoria abaixo.
                </p>
              ) : (
                <>
                  {GRUPOS.map((g) => {
                    const itens = salvos.filter((s) => g.cats.some((c) => c.id === s.cat));
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
                              onClick={() => juntarTreino(s)}
                              style={{
                                padding: "7px 11px", borderRadius: Math.max(3, tema.raioP - 2),
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
                    toque para juntar o treino inteiro — cada um entra como uma seção
                  </p>
                </>
              )}
            </div>
          )}

          {comExercicios && (
            <SeletorExercicios
              exercicios={exercicios}
              onEscolher={(e) => aplicarTexto(inserirNoTexto(texto, e.area, e.nome))}
            />
          )}

          <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "10px 0" }}>
            <span style={{ ...est.eyebrow, fontSize: 10 }}>Salvar em</span>
            <select
              value={cat}
              onChange={(e) => { setCat(e.target.value as Cat); setCatManual(true); }}
              style={{ ...est.input, flex: 1, padding: "8px 10px", cursor: "pointer" }}
            >
              {GRUPOS.flatMap((g) => g.cats).map((c) => (
                <option key={c.id} value={c.id}>{c.rot}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={botaoPrimario(!!nome.trim() && !!texto.trim())} onClick={salvarCompositor} disabled={!nome.trim() || !texto.trim()}>
              Salvar treino
            </button>
            <button style={est.ghost} onClick={fecharCompositor}>cancelar</button>
          </div>
        </div>
      )}

      {salvos.length === 0 && !montando && (
        <div style={{ ...est.card, padding: 14, marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Nenhum treino salvo ainda. Toque em <strong style={{ color: C.ink }}>+ novo</strong> numa categoria,
            ou use <strong style={{ color: C.ink }}>salvar como treino</strong> ao agendar um treino no calendário.
          </p>
        </div>
      )}

      {GRUPOS.map((g) => {
        const gcor = corGrupo(g);
        return (
        <div key={g.rot} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <i style={{ width: 12, height: 12, borderRadius: 3, background: gcor, display: "inline-block" }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{g.rot}</span>
          </div>

          {g.cats.map((cat) => {
            const itens = salvos.filter((s) => s.cat === cat.id);
            return (
              <div key={cat.id} style={{ marginBottom: 10, paddingLeft: g.cats.length > 1 ? 20 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  {g.cats.length > 1
                    ? <span style={{ ...est.eyebrow, fontSize: 10 }}>{cat.rot}</span>
                    : <span />}
                  <button style={{ ...est.ghost, padding: "4px 10px", fontSize: 10 }} onClick={() => novo(cat.id)}>
                    + novo
                  </button>
                </div>

                {itens.map((s) =>
                  editando === s.id ? (
                    <div key={s.id} style={{ ...est.card, padding: 12, marginBottom: 8, ...listra(g) }}>
                      <input
                        value={s.nome}
                        onChange={(e) => upSalvo(s.id, { nome: e.target.value })}
                        placeholder="Nome do treino"
                        style={{ ...est.input, marginBottom: 8, fontWeight: 600 }}
                      />
                      <textarea
                        value={s.texto}
                        onChange={(e) => upSalvo(s.id, { texto: e.target.value })}
                        placeholder={"Exercícios, séries e repetições\n(ex: rosca direta 4x10, martelo 3x12)"}
                        style={{ ...est.area, minHeight: 90, background: C.paper, fontSize: 14 }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          style={{ flex: 1, padding: "9px", borderRadius: tema.raioP - 1, border: "none", background: C.ink, color: C.onDark, fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                          onClick={() => setEditando(null)}
                        >
                          Pronto
                        </button>
                        <button
                          style={{ ...est.ghost, color: C.ink, borderColor: C.ink }}
                          onClick={() => setAberto(s.id)}
                        >
                          abrir
                        </button>
                        <button
                          style={{ ...est.ghost, color: C.aero, borderColor: C.aero }}
                          onClick={() => { if (confirm(`Excluir "${s.nome}"?`)) { delSalvo(s.id); setEditando(null); } }}
                        >
                          excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={s.id}
                      onClick={() => setEditando(s.id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                        background: C.panel, border: `1px solid ${C.line}`,
                        borderRadius: tema.raioP, padding: "10px 12px", cursor: "pointer",
                        fontFamily: FONTE.sans, fontSize: 14, color: C.ink,
                        ...listra(g),
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{s.nome}</span>
                      {resumoTreino(s.texto) && (
                        <span style={{ display: "block", color: C.soft, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {resumoTreino(s.texto)}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
        );
      })}

      {salvoAberto && (
        <ModalTreino
          titulo={salvoAberto.nome}
          subtitulo={
            <span style={{ ...est.eyebrow, fontSize: 10, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: corGrupo(grupoDe(salvoAberto.cat)), display: "inline-block" }} />
              {grupoDe(salvoAberto.cat).rot}
              {rotuloCat(salvoAberto.cat) !== grupoDe(salvoAberto.cat).rot && ` · ${rotuloCat(salvoAberto.cat)}`}
            </span>
          }
          exercicios={exercicios}
          texto={salvoAberto.texto}
          onChange={(t) => upSalvo(salvoAberto.id, { texto: t })}
          onFechar={() => setAberto(null)}
        />
      )}
    </>
  );
}
