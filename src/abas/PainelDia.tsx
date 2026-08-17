import { useEffect, useRef, useState } from "react";
import type { Agendamento, Cat, DiaInfo, Exercicio, Repet, TreinoSalvo } from "../types";
import { DIA_CURTO, FONTE, MESES, SEM } from "../temas";
import { useTema } from "../tema-ctx";
import { parseIso, uid } from "../dados";
import { GRUPOS, ROT_CAT } from "../categorias";
import ModalTreino from "./ModalTreino";
import MontarTreino from "./MontarTreino";
import { sugerirCategoria, tiposDoTexto } from "./Exercicios";

const ROT_REPET: Record<Repet, string> = {
  nunca: "",
  semanal: "toda semana",
  quinzenal: "a cada 15 dias",
  mensal: "todo mês",
};

interface Props {
  k: string;
  dia: DiaInfo;
  ags: Agendamento[];
  salvos: TreinoSalvo[];
  exercicios: Exercicio[];
  setDia: (k: string, patch: Partial<DiaInfo>) => void;
  addAg: (a: Agendamento) => void;
  upAg: (id: string, patch: Partial<Agendamento>) => void;
  delAg: (id: string) => void;
  addSalvo: (t: TreinoSalvo) => void;
}

export default function PainelDia({ k, dia, ags, salvos, exercicios, setDia, addAg, upAg, delAg, addSalvo }: Props) {
  const { C, est, chip, tipos, tema } = useTema();
  const data = parseIso(k);
  const raizRef = useRef<HTMLDivElement>(null);

  // o painel abre abaixo do calendário; sem isso, em telas baixas o usuário nem percebe que abriu
  useEffect(() => {
    const suave = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    raizRef.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "nearest" });
  }, []);

  const [aberto, setAberto] = useState<string | null>(null);

  /* --- montar o treino do dia: um treino novo fica em rascunho, um já criado grava a cada toque --- */
  const [montando, setMontando] = useState(false);
  const [alvo, setAlvo] = useState<string | null>(null); // id do agendamento em edição
  const [textoNovo, setTextoNovo] = useState("");
  const [repetNovo, setRepetNovo] = useState<Repet>("nunca");
  const [diasSemNovo, setDiasSemNovo] = useState<number[]>([data.getDay()]);

  const emEdicao = alvo ? ags.find((a) => a.id === alvo) : undefined;
  const texto = emEdicao ? emEdicao.texto : textoNovo;
  const repet = emEdicao ? emEdicao.repet : repetNovo;
  const diasSem = emEdicao ? emEdicao.diasSemana : diasSemNovo;

  // os tipos (força/core/aeróbico) saem do próprio conteúdo — nada para o usuário marcar
  const setTexto = (v: string) =>
    emEdicao ? upAg(emEdicao.id, { texto: v, tipos: tiposDoTexto(v) }) : setTextoNovo(v);
  const setRepet = (v: Repet) => (emEdicao ? upAg(emEdicao.id, { repet: v }) : setRepetNovo(v));
  const togDiaSem = (d: number) => {
    const novo = diasSem.includes(d) ? diasSem.filter((x) => x !== d) : [...diasSem, d].sort();
    if (emEdicao) upAg(emEdicao.id, { diasSemana: novo });
    else setDiasSemNovo(novo);
  };

  const fecharMontador = () => {
    setMontando(false);
    setAlvo(null);
    setTextoNovo("");
    setRepetNovo("nunca");
    setDiasSemNovo([data.getDay()]);
  };

  const rascunhoCheio = montando && !alvo && !!textoNovo.trim();
  const podeTrocar = () => !rascunhoCheio || confirm("Descartar o treino que você está montando?");

  const abrirNovo = () => {
    if (!podeTrocar()) return;
    fecharMontador();
    setMontando(true);
  };

  const abrirEdicao = (a: Agendamento) => {
    if (!podeTrocar()) return;
    fecharMontador();
    setMontando(true);
    setAlvo(a.id);
  };

  const salvarNovo = () => {
    if (!textoNovo.trim()) return;
    addAg({
      id: uid(), texto: textoNovo.trim(), tipos: tiposDoTexto(textoNovo),
      inicio: k, repet: repetNovo, diasSemana: diasSemNovo,
    });
    fecharMontador();
  };

  /* --- guardar na biblioteca um treino do dia --- */
  const [salvarId, setSalvarId] = useState<string | null>(null);
  const [nomeSalvar, setNomeSalvar] = useState("");
  const [catSalvar, setCatSalvar] = useState<Cat>("combinado");
  const [salvoMsg, setSalvoMsg] = useState<{ id: string; texto: string } | null>(null);

  /** Categoria provável ao guardar: pelos cabeçalhos; sem eles, pelo tipo do treino. */
  const catSugerida = (a: Agendamento): Cat =>
    sugerirCategoria(a.texto) ?? (a.tipos.length === 1 && a.tipos[0] === "a" ? "aerobico" : "combinado");

  const guardarNaBiblioteca = (a: Agendamento) => {
    if (!nomeSalvar.trim()) return;
    addSalvo({ id: uid(), cat: catSalvar, nome: nomeSalvar.trim(), texto: a.texto });
    setSalvoMsg({ id: a.id, texto: `Guardado em Treinos como "${nomeSalvar.trim()}".` });
    setSalvarId(null);
    setNomeSalvar("");
  };

  const meta = (a: Agendamento) => {
    const partes = [ROT_REPET[a.repet], ...a.tipos.map((t) => tipos.find((x) => x.id === t)!.rot.toLowerCase())]
      .filter(Boolean);
    if (a.repet === "semanal" || a.repet === "quinzenal") {
      partes[0] = `${ROT_REPET[a.repet]} · ${a.diasSemana.map((d) => DIA_CURTO[d]).join(", ")}`;
    }
    if (partes.length === 0) return null;
    return <span style={{ ...est.eyebrow, color: C.agendaInk, fontSize: 10 }}>{partes.join(" · ")}</span>;
  };

  const agAberto = aberto ? ags.find((a) => a.id === aberto) : undefined;

  // prévia compacta e formatada; a leitura completa acontece ao tocar nela
  const MAX_LINHAS_PREVIA = 6;
  const previaTreino = (a: Agendamento) => {
    const linhas = a.texto.split("\n").filter((l) => l.trim());
    return (
      <button
        onClick={() => setAberto(a.id)}
        aria-label="Abrir treino em tela cheia"
        style={{
          display: "block", width: "100%", textAlign: "left",
          background: C.panel, border: `1px solid ${C.line}`, borderRadius: tema.raioP,
          padding: "10px 12px", cursor: "pointer", fontFamily: FONTE.sans, color: C.ink,
        }}
      >
        {linhas.slice(0, MAX_LINHAS_PREVIA).map((l, i) => {
          const t = l.trim();
          const ehTitulo = !t.startsWith("-") && t === t.toUpperCase() && /\p{Lu}/u.test(t);
          if (ehTitulo) {
            return (
              <div key={i} style={{ fontFamily: FONTE.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.soft, margin: i === 0 ? "0 0 3px" : "8px 0 3px" }}>
                {t}
              </div>
            );
          }
          const conteudo = t.replace(/^-\s*/, "");
          const sep = conteudo.indexOf("—");
          const nome = sep === -1 ? conteudo : conteudo.slice(0, sep).trim();
          const det = sep === -1 ? "" : conteudo.slice(sep + 1).trim();
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>
              {det && <span style={{ ...est.num, fontSize: 12, color: C.soft, flexShrink: 0 }}>{det}</span>}
            </div>
          );
        })}
        {linhas.length > MAX_LINHAS_PREVIA && (
          <div style={{ ...est.eyebrow, fontSize: 9, marginTop: 4 }}>
            +{linhas.length - MAX_LINHAS_PREVIA} {linhas.length - MAX_LINHAS_PREVIA === 1 ? "linha" : "linhas"} — toque para ver tudo
          </div>
        )}
      </button>
    );
  };

  const montador = (
    <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
      <div style={{ ...est.eyebrow, marginBottom: 8 }}>
        {alvo ? "Alterar treino do dia" : "Montar treino do dia"}
      </div>

      <MontarTreino
        texto={texto}
        onTexto={setTexto}
        salvos={salvos}
        exercicios={exercicios}
      />

      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 12 }}>
        <span style={{ ...est.eyebrow, fontSize: 10 }}>Repetir</span>
        <select
          value={repet}
          onChange={(e) => setRepet(e.target.value as Repet)}
          style={{ ...est.input, flex: 1, padding: "8px 10px", cursor: "pointer" }}
        >
          <option value="nunca">Só neste dia</option>
          <option value="semanal">Toda semana</option>
          <option value="quinzenal">A cada 15 dias</option>
          <option value="mensal">Todo mês</option>
        </select>
      </div>

      {(repet === "semanal" || repet === "quinzenal") && (
        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
          {SEM.map((rot, d) => (
            <button key={d} aria-pressed={diasSem.includes(d)} aria-label={DIA_CURTO[d]}
              onClick={() => togDiaSem(d)}
              style={{
                flex: 1, aspectRatio: "1", borderRadius: Math.max(3, tema.raioP - 2), cursor: "pointer",
                border: `1.5px solid ${diasSem.includes(d) ? C.ink : C.line}`,
                background: diasSem.includes(d) ? C.ink : "transparent",
                color: diasSem.includes(d) ? C.onDark : C.soft,
                fontFamily: FONTE.mono, fontSize: 12,
              }}>
              {rot}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {alvo ? (
          // já gravado a cada toque: aqui só se fecha
          <button
            onClick={fecharMontador}
            style={{
              flex: 1, padding: "11px", borderRadius: tema.raioP, border: "none",
              background: C.ink, color: C.onDark, fontFamily: FONTE.mono, fontSize: 12,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Pronto
          </button>
        ) : (
          <>
            <button
              onClick={salvarNovo}
              disabled={!texto.trim() || ((repet === "semanal" || repet === "quinzenal") && diasSem.length === 0)}
              style={{
                flex: 1, padding: "11px", borderRadius: tema.raioP, border: "none",
                background: texto.trim() ? C.ink : C.deep, color: texto.trim() ? C.onDark : C.soft,
                fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em",
                textTransform: "uppercase", cursor: texto.trim() ? "pointer" : "default",
              }}
            >
              Salvar treino do dia
            </button>
            <button style={est.ghost} onClick={() => { if (podeTrocar()) fecharMontador(); }}>cancelar</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div ref={raizRef} style={{ ...est.card, marginTop: 16 }}>
      <div style={{ ...est.eyebrow, marginBottom: 12 }}>
        {data.getDate()} de {MESES[data.getMonth()]} · {DIA_CURTO[data.getDay()]}
      </div>

      <div style={{ ...est.eyebrow, fontSize: 9, marginBottom: 6 }}>marcar o que você treinou</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tipos.map((t) => (
          <button key={t.id} style={chip(!!dia[t.id], t.cor)} aria-pressed={!!dia[t.id]}
            onClick={() => setDia(k, { [t.id]: !dia[t.id] })}>
            {t.rot}
          </button>
        ))}
      </div>

      <input
        value={dia.nota || ""}
        onChange={(e) => setDia(k, { nota: e.target.value })}
        placeholder="O que você fez (ex: costas + 20 min esteira)"
        style={est.input}
      />

      {ags.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...est.eyebrow, marginBottom: 8 }}>Treino do dia</div>
          {ags.map((a) =>
            alvo === a.id ? (
              <div key={a.id}>{montador}</div>
            ) : (
              <div key={a.id} style={{ background: C.agenda, border: `1px solid ${C.line}`, borderRadius: tema.raioP + 2, padding: 12, marginBottom: 8 }}>
                {meta(a) && <div style={{ marginBottom: 8 }}>{meta(a)}</div>}
                {previaTreino(a)}

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    style={{ ...est.ghost, flex: 1, padding: "8px 6px", fontSize: 10, color: C.ink, borderColor: C.ink }}
                    onClick={() => abrirEdicao(a)}
                  >
                    alterar
                  </button>
                  <button
                    style={{ ...est.ghost, flex: 1, padding: "8px 6px", fontSize: 10 }}
                    aria-expanded={salvarId === a.id}
                    onClick={() => {
                      if (salvarId !== a.id) {
                        setCatSalvar(catSugerida(a));
                        setNomeSalvar("");
                      }
                      setSalvoMsg(null);
                      setSalvarId((id) => (id === a.id ? null : a.id));
                    }}
                  >
                    guardar
                  </button>
                  <button
                    style={{ ...est.ghost, flex: 1, padding: "8px 6px", fontSize: 10 }}
                    onClick={() => {
                      const msg = a.repet === "nunca"
                        ? "Excluir este treino?"
                        : "Excluir este treino e todas as repetições?";
                      if (confirm(msg)) delAg(a.id);
                    }}
                  >
                    excluir
                  </button>
                </div>

                {salvarId === a.id && (
                  <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, padding: 12, background: C.panel }}>
                    <div style={{ ...est.eyebrow, fontSize: 9, marginBottom: 8 }}>guardar em Treinos para reusar</div>
                    <input
                      value={nomeSalvar}
                      autoFocus
                      onChange={(e) => setNomeSalvar(e.target.value)}
                      placeholder="Nome do treino (ex: Peito 1)"
                      style={{ ...est.input, marginBottom: 8 }}
                    />
                    <select
                      value={catSalvar}
                      onChange={(e) => setCatSalvar(e.target.value as Cat)}
                      style={{ ...est.input, marginBottom: 10, cursor: "pointer" }}
                    >
                      {GRUPOS.flatMap((g) => g.cats).map((c) => (
                        <option key={c.id} value={c.id}>{c.rot}</option>
                      ))}
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => guardarNaBiblioteca(a)}
                        aria-label="Guardar na biblioteca de treinos"
                        disabled={!nomeSalvar.trim()}
                        style={{
                          flex: 1, padding: "9px", borderRadius: tema.raioP - 1, border: "none",
                          background: nomeSalvar.trim() ? C.ink : C.deep, color: nomeSalvar.trim() ? C.onDark : C.soft,
                          fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                          cursor: nomeSalvar.trim() ? "pointer" : "default",
                        }}
                      >
                        Guardar
                      </button>
                      <button style={est.ghost} onClick={() => setSalvarId(null)}>cancelar</button>
                    </div>
                  </div>
                )}

                {salvoMsg?.id === a.id && (
                  <p role="status" style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.5, color: C.forca, margin: "8px 0 0" }}>
                    {salvoMsg.texto} <span style={{ color: C.soft }}>({ROT_CAT[catSalvar]})</span>
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}

      {!montando && (
        <button
          style={{ ...est.ghost, width: "100%", marginTop: 14, padding: "11px", borderStyle: "dashed", color: C.agendaInk }}
          onClick={abrirNovo}
        >
          {ags.length > 0 ? "+ montar outro treino" : "+ montar treino do dia"}
        </button>
      )}

      {montando && !alvo && montador}

      {agAberto && (
        <ModalTreino
          titulo={`${data.getDate()} de ${MESES[data.getMonth()]}`}
          subtitulo={meta(agAberto)}
          exercicios={exercicios}
          texto={agAberto.texto}
          onChange={(t) => upAg(agAberto.id, { texto: t, tipos: tiposDoTexto(t) })}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
