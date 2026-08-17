import { useState } from "react";
import type { Cat, Exercicio, TreinoSalvo } from "../types";
import { FONTE, fundoTipos } from "../temas";
import { useTema } from "../tema-ctx";
import { uid } from "../dados";
import { GRUPOS, ROT_CAT, grupoDe, type Grupo } from "../categorias";
import ModalTreino from "./ModalTreino";
import MontarTreino from "./MontarTreino";
import { sugerirCategoria } from "./Exercicios";

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
  const [aberto, setAberto] = useState<string | null>(null);

  const salvoAberto = aberto ? salvos.find((s) => s.id === aberto) : undefined;
  const rotuloCat = (cat: Cat) => grupoDe(cat).cats.find((c) => c.id === cat)!.rot;

  /** Combinado mistura grupos: mostra as três cores, como uma célula de 3 tipos no calendário. */
  const corGrupo = (g: Grupo) =>
    g.combinado ? fundoTipos([cor("f"), cor("c"), cor("a")]) : g.tipo ? cor(g.tipo) : C.soft;

  /**
   * Listra da esquerda. No Combinado ela empilha as três cores de cima para baixo —
   * o corte diagonal do marcador desapareceria numa faixa de 3px de largura.
   */
  const listra = (g: Grupo): React.CSSProperties => {
    if (!g.combinado) return { borderLeft: `3px solid ${g.tipo ? cor(g.tipo) : C.soft}` };
    const faixas = `linear-gradient(to bottom, ${cor("f")} 0 33.3%, ${cor("c")} 33.3% 66.6%, ${cor("a")} 66.6% 100%)`;
    return {
      borderLeft: "3px solid transparent",
      backgroundImage: `linear-gradient(${C.panel}, ${C.panel}), ${faixas}`,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
    };
  };

  /* --- editor: o mesmo painel para criar um treino e para alterar um já salvo --- */
  const [editorAberto, setEditorAberto] = useState(false);
  const [alvo, setAlvo] = useState<string | null>(null); // id em edição; null = treino novo
  const [nomeNovo, setNomeNovo] = useState("");
  const [textoNovo, setTextoNovo] = useState("");
  const [catNovo, setCatNovo] = useState<Cat>("combinado");
  const [catManual, setCatManual] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /**
   * Treino já salvo grava a cada toque, como o resto do app — trocar de aba no meio
   * da edição não pode perder nada. Só o treino novo fica em rascunho, para não deixar
   * registro vazio se o usuário desistir.
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
  const setTexto = (v: string) => {
    if (origem) {
      upSalvo(origem.id, { texto: v });
      return;
    }
    setTextoNovo(v);
    if (!catManual) setCatNovo(sugerirCategoria(v) ?? "combinado");
  };

  const fecharEditor = () => {
    setEditorAberto(false);
    setAlvo(null);
    setNomeNovo("");
    setTextoNovo("");
    setCatNovo("combinado");
    setCatManual(false);
  };

  /** Só o treino novo tem o que perder ao sair; o já salvo está gravado. */
  const rascunhoCheio = editorAberto && !alvo && (!!nomeNovo.trim() || !!textoNovo.trim());
  const podeTrocar = () => !rascunhoCheio || confirm("Descartar o treino que você está montando?");

  const abrirNovo = () => {
    if (!podeTrocar()) return;
    fecharEditor();
    setEditorAberto(true);
    setMsg(null);
  };

  const abrirEdicao = (s: TreinoSalvo) => {
    if (!podeTrocar()) return;
    fecharEditor();
    setEditorAberto(true);
    setAlvo(s.id);
    setCatManual(true); // treino já arquivado: não muda de categoria sozinho
    setMsg(null);
  };

  const salvarNovo = () => {
    if (!nomeNovo.trim() || !textoNovo.trim()) return;
    addSalvo({ id: uid(), cat: catNovo, nome: nomeNovo.trim(), texto: textoNovo.trim() });
    setMsg(`Salvo como "${nomeNovo.trim()}" em ${ROT_CAT[catNovo]}.`);
    fecharEditor();
  };

  const botaoPrimario = (ativo: boolean): React.CSSProperties => ({
    flex: 1, padding: "11px", borderRadius: tema.raioP, border: "none",
    background: ativo ? C.ink : C.deep, color: ativo ? C.onDark : C.soft,
    fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em",
    textTransform: "uppercase", cursor: ativo ? "pointer" : "default",
  });

  const sugerida = sugerirCategoria(texto);
  const grupoEmEdicao = alvo ? grupoDe(cat) : undefined;

  const editor = (
    <div style={{ ...est.card, marginBottom: 20, ...(grupoEmEdicao ? listra(grupoEmEdicao) : {}) }}>
      <div style={{ ...est.eyebrow, marginBottom: 10 }}>{alvo ? "Alterar treino" : "Novo treino"}</div>

      <input
        value={nome}
        autoFocus
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do treino (ex: Peito 1)"
        style={{ ...est.input, marginBottom: 8, fontWeight: 600 }}
      />

      <MontarTreino
        texto={texto}
        onTexto={setTexto}
        salvos={salvos}
        exercicios={exercicios}
        ignorar={alvo ?? undefined}
      />

      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 12 }}>
        <span style={{ ...est.eyebrow, fontSize: 10 }}>Guardar em</span>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as Cat)}
          style={{ ...est.input, flex: 1, padding: "8px 10px", cursor: "pointer" }}
        >
          {GRUPOS.flatMap((g) => g.cats).map((c) => (
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
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={botaoPrimario(!!nome.trim() && !!texto.trim())} onClick={salvarNovo} disabled={!nome.trim() || !texto.trim()}>
            Salvar treino
          </button>
          <button style={est.ghost} onClick={() => { if (podeTrocar()) fecharEditor(); }}>cancelar</button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <p style={{ ...est.eyebrow, marginBottom: 12 }}>
        Seus treinos guardados — use-os para montar o treino do dia
      </p>

      {!editorAberto && (
        <button
          onClick={abrirNovo}
          style={{
            width: "100%", marginBottom: 16, padding: "12px", borderRadius: tema.raioP,
            border: "none", background: C.ink, color: C.onDark, cursor: "pointer",
            fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
          }}
        >
          + Novo treino
        </button>
      )}

      {msg && !editorAberto && (
        <p role="status" style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.5, color: C.forca, margin: "0 0 16px" }}>
          {msg}
        </p>
      )}

      {editorAberto && !alvo && editor}

      {salvos.length === 0 && !editorAberto && (
        <div style={{ ...est.card, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Nada guardado ainda. Um treino salvo pode ser um bloco pequeno (só bíceps, só core)
            ou um treino inteiro — depois é só juntar os blocos para montar o treino do dia.
          </p>
        </div>
      )}

      {/* só os grupos que têm treino aparecem: a lista mostra o que existe, não o que poderia existir */}
      {GRUPOS.map((g) => {
        const doGrupo = salvos.filter((s) => g.cats.some((c) => c.id === s.cat));
        if (doGrupo.length === 0) return null;
        return (
          <div key={g.rot} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <i style={{ width: 12, height: 12, borderRadius: 3, background: corGrupo(g), display: "inline-block" }} />
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{g.rot}</span>
            </div>

            {g.cats.map((c) => {
              const itens = salvos.filter((s) => s.cat === c.id);
              if (itens.length === 0) return null;
              return (
                <div key={c.id} style={{ marginBottom: 10, paddingLeft: g.cats.length > 1 ? 20 : 0 }}>
                  {g.cats.length > 1 && (
                    <div style={{ ...est.eyebrow, fontSize: 10, marginBottom: 6 }}>{c.rot}</div>
                  )}

                  {itens.map((s) =>
                    alvo === s.id ? (
                      <div key={s.id}>{editor}</div>
                    ) : (
                      <button
                        key={s.id}
                        onClick={() => abrirEdicao(s)}
                        style={{
                          display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                          background: C.panel, border: `1px solid ${C.line}`,
                          borderRadius: tema.raioP, padding: "11px 12px", cursor: "pointer",
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
