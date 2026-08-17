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

interface Props {
  salvos: TreinoSalvo[];
  exercicios: Exercicio[];
  addSalvo: (t: TreinoSalvo) => void;
  upSalvo: (id: string, patch: Partial<TreinoSalvo>) => void;
  delSalvo: (id: string) => void;
}

/** Onde o editor aparece: no topo, dentro de uma categoria, ou no lugar de um treino salvo. */
type Ancora = { tipo: "topo" } | { tipo: "cat"; cat: Cat } | { tipo: "salvo"; id: string };

export default function Biblioteca({ salvos, exercicios, addSalvo, upSalvo, delSalvo }: Props) {
  const { C, est, cor, tema } = useTema();
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

  /* --- editor: mesmo painel para montar um treino novo e para alterar um já salvo --- */
  const [ancora, setAncora] = useState<Ancora | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null); // id do treino em edição; null = treino novo
  const [nomeNovo, setNomeNovo] = useState("");
  const [textoNovo, setTextoNovo] = useState("");
  const [catNovo, setCatNovo] = useState<Cat>("combinado");
  const [catManual, setCatManual] = useState(false);
  const [juntando, setJuntando] = useState(false);
  const [comExercicios, setComExercicios] = useState(false);
  const [ajustando, setAjustando] = useState(false);
  const [linhaEdit, setLinhaEdit] = useState<number | null>(null);
  const [linhaValor, setLinhaValor] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  /**
   * Treino já salvo grava a cada toque, como o resto do app — trocar de aba no meio
   * da edição não pode perder nada. Só a composição nova fica em rascunho, para não
   * deixar registro vazio se o usuário desistir.
   */
  const origem = alvo ? salvos.find((s) => s.id === alvo) : undefined;
  const nome = origem ? origem.nome : nomeNovo;
  const texto = origem ? origem.texto : textoNovo;
  const cat = origem ? origem.cat : catNovo;

  const setNome = (v: string) => (origem ? upSalvo(origem.id, { nome: v }) : setNomeNovo(v));
  const setCat = (v: Cat) => {
    setCatManual(true);
    if (origem) upSalvo(origem.id, { cat: v });
    else setCatNovo(v);
  };

  const fecharEditor = () => {
    setAncora(null);
    setAlvo(null);
    setNomeNovo("");
    setTextoNovo("");
    setCatNovo("combinado");
    setCatManual(false);
    setJuntando(false);
    setComExercicios(false);
    setAjustando(false);
    setLinhaEdit(null);
  };

  /** Só a composição nova tem o que perder ao sair; o treino salvo já está gravado. */
  const rascunhoCheio = !alvo && !!ancora && (!!nomeNovo.trim() || !!textoNovo.trim());
  const podeTrocar = () => !rascunhoCheio || confirm("Descartar o treino que você está montando?");

  const abrirNovo = (a: Ancora, catInicial?: Cat) => {
    if (!podeTrocar()) return;
    fecharEditor();
    setAncora(a);
    setMsg(null);
    if (catInicial) { setCatNovo(catInicial); setCatManual(true); }
  };

  const abrirEdicao = (s: TreinoSalvo) => {
    if (!podeTrocar()) return;
    fecharEditor();
    setAncora({ tipo: "salvo", id: s.id });
    setAlvo(s.id);
    setCatManual(true); // treino já arquivado: não muda de categoria sozinho
    setMsg(null);
  };

  // enquanto o usuário não escolher a categoria à mão, ela acompanha o conteúdo
  const aplicarTexto = (novoTexto: string) => {
    if (origem) {
      upSalvo(origem.id, { texto: novoTexto });
      return;
    }
    setTextoNovo(novoTexto);
    if (!catManual) setCatNovo(sugerirCategoria(novoTexto) ?? "combinado");
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

  const salvarNovo = () => {
    if (!nomeNovo.trim() || !textoNovo.trim()) return;
    addSalvo({ id: uid(), cat: catNovo, nome: nomeNovo.trim(), texto: textoNovo.trim() });
    setMsg(`Salvo como "${nomeNovo.trim()}" em ${ROT_CAT[catNovo]}.`);
    fecharEditor();
  };

  const comecarLinha = (i: number, l: string) => {
    setLinhaEdit(i);
    setLinhaValor(ehLinhaCabecalho(l) ? l.trim() : l.trim().replace(/^-\s*/, ""));
  };

  const gravarLinha = () => {
    if (linhaEdit === null) return;
    const linhas = texto.split("\n");
    const original = linhas[linhaEdit] ?? "";
    const valor = linhaValor.trim();
    if (!valor) aplicarTexto(removerLinha(texto, linhaEdit));
    else aplicarTexto(trocarLinha(texto, linhaEdit, ehLinhaCabecalho(original) ? valor : `- ${valor}`));
    setLinhaEdit(null);
  };

  const botaoPrimario = (ativo: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px", borderRadius: tema.raioP, border: "none",
    background: ativo ? C.ink : C.deep, color: ativo ? C.onDark : C.soft,
    fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em",
    textTransform: "uppercase", cursor: ativo ? "pointer" : "default",
  });

  const alternador = (ligado: boolean): React.CSSProperties => ({
    ...est.ghost, flex: 1, padding: "9px 6px", borderStyle: "dashed",
    color: ligado ? C.ink : C.soft, borderColor: ligado ? C.ink : C.line,
  });

  const sugerida = sugerirCategoria(texto);

  /** O editor. Renderizado onde o usuário o abriu, para a tela não pular. */
  const editor = (g?: (typeof GRUPOS)[number]) => {
    const linhas = texto.split("\n").map((l, i) => ({ i, l })).filter(({ l }) => l.trim() !== "");
    return (
      <div style={{ ...est.card, marginBottom: 20, ...(g ? listra(g) : {}) }}>
        <div style={{ ...est.eyebrow, marginBottom: 10 }}>{alvo ? "Alterar treino" : "Montar treino"}</div>

        <input
          value={nome}
          autoFocus
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do treino (ex: Peito 1)"
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
            style={alternador(juntando)}
            aria-expanded={juntando}
            onClick={() => { setJuntando((v) => !v); setComExercicios(false); setAjustando(false); }}
          >
            {juntando ? "− treinos" : "+ juntar treino"}
          </button>
          <button
            style={alternador(comExercicios)}
            aria-expanded={comExercicios}
            onClick={() => { setComExercicios((v) => !v); setJuntando(false); setAjustando(false); }}
          >
            {comExercicios ? "− exercícios" : "+ exercícios"}
          </button>
        </div>

        {texto.trim() !== "" && (
          <button
            style={{ ...alternador(ajustando), width: "100%", marginTop: 8 }}
            aria-expanded={ajustando}
            onClick={() => { setAjustando((v) => !v); setJuntando(false); setComExercicios(false); setLinhaEdit(null); }}
          >
            {ajustando ? "− ajustar lista" : "ajustar lista do treino"}
          </button>
        )}

        {juntando && (
          <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, overflow: "hidden" }}>
            {salvos.filter((s) => s.id !== alvo).length === 0 ? (
              <p style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.6, margin: 0, padding: 12 }}>
                Nenhum outro treino salvo para juntar. Crie um com <strong style={{ color: C.ink }}>+ novo</strong> numa categoria abaixo.
              </p>
            ) : (
              <>
                {GRUPOS.map((g2) => {
                  // o próprio treino em edição fica de fora: juntá-lo a si mesmo só duplicaria
                  const itens = salvos.filter((s) => s.id !== alvo && g2.cats.some((c) => c.id === s.cat));
                  if (itens.length === 0) return null;
                  return (
                    <div key={g2.rot} style={{ borderBottom: `1px solid ${C.line}`, padding: "8px 10px" }}>
                      <div style={{ ...est.eyebrow, fontSize: 9, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <i style={{ width: 8, height: 8, borderRadius: 2, background: corGrupo(g2), display: "inline-block" }} />
                        {g2.rot}
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

        {ajustando && (
          <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, overflow: "hidden" }}>
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
                    onClick={() => { aplicarTexto(cab ? removerSecao(texto, i) : removerLinha(texto, i)); setLinhaEdit(null); }}
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

        <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "10px 0 0" }}>
          <span style={{ ...est.eyebrow, fontSize: 10 }}>Salvar em</span>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as Cat)}
            style={{ ...est.input, flex: 1, padding: "8px 10px", cursor: "pointer" }}
          >
            {GRUPOS.flatMap((g2) => g2.cats).map((c) => (
              <option key={c.id} value={c.id}>{c.rot}</option>
            ))}
          </select>
        </div>

        {sugerida && sugerida !== cat && (
          <button
            onClick={() => setCat(sugerida)}
            style={{ ...est.ghost, width: "100%", marginTop: 6, padding: "7px 8px", fontSize: 9.5, borderStyle: "dashed" }}
          >
            pelo conteúdo, seria {ROT_CAT[sugerida]} — mover
          </button>
        )}

        {alvo ? (
          // já está gravado a cada toque: aqui só se fecha, abre inteiro ou exclui
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={botaoPrimario(true)} onClick={fecharEditor}>Pronto</button>
            <button style={{ ...est.ghost, color: C.ink, borderColor: C.ink }} onClick={() => setAberto(alvo)}>
              abrir
            </button>
            <button
              style={{ ...est.ghost, color: C.aero, borderColor: C.aero }}
              onClick={() => { if (confirm(`Excluir "${nome}"?`)) { delSalvo(alvo); fecharEditor(); } }}
            >
              excluir
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={botaoPrimario(!!nome.trim() && !!texto.trim())} onClick={salvarNovo} disabled={!nome.trim() || !texto.trim()}>
              Salvar treino
            </button>
            <button style={est.ghost} onClick={() => { if (podeTrocar()) fecharEditor(); }}>
              cancelar
            </button>
          </div>
        )}
      </div>
    );
  };

  const editorAqui = (a: Ancora) => {
    if (!ancora || ancora.tipo !== a.tipo) return false;
    if (ancora.tipo === "cat" && a.tipo === "cat") return ancora.cat === a.cat;
    if (ancora.tipo === "salvo" && a.tipo === "salvo") return ancora.id === a.id;
    return true;
  };

  return (
    <>
      <p style={{ ...est.eyebrow, marginBottom: 12 }}>
        Treinos padrão — toque para alterar, junte para montar novos
      </p>

      {!ancora && (
        <button
          onClick={() => abrirNovo({ tipo: "topo" })}
          style={{
            width: "100%", marginBottom: 16, padding: "12px", borderRadius: tema.raioP,
            border: "none", background: C.ink, color: C.onDark, cursor: "pointer",
            fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
          }}
        >
          + Montar e salvar treino
        </button>
      )}

      {msg && !ancora && (
        <p role="status" style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.5, color: C.forca, margin: "0 0 16px" }}>
          {msg}
        </p>
      )}

      {editorAqui({ tipo: "topo" }) && editor()}

      {salvos.length === 0 && !ancora && (
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

          {g.cats.map((cat2) => {
            const itens = salvos.filter((s) => s.cat === cat2.id);
            return (
              <div key={cat2.id} style={{ marginBottom: 10, paddingLeft: g.cats.length > 1 ? 20 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  {g.cats.length > 1
                    ? <span style={{ ...est.eyebrow, fontSize: 10 }}>{cat2.rot}</span>
                    : <span />}
                  <button
                    style={{ ...est.ghost, padding: "4px 10px", fontSize: 10 }}
                    aria-label={`Novo treino em ${cat2.rot}`}
                    onClick={() => abrirNovo({ tipo: "cat", cat: cat2.id }, cat2.id)}
                  >
                    + novo
                  </button>
                </div>

                {editorAqui({ tipo: "cat", cat: cat2.id }) && editor(g)}

                {itens.map((s) =>
                  editorAqui({ tipo: "salvo", id: s.id }) ? (
                    <div key={s.id}>{editor(g)}</div>
                  ) : (
                    <button
                      key={s.id}
                      onClick={() => abrirEdicao(s)}
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
