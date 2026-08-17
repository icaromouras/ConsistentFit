import { useEffect, useRef, useState } from "react";
import type { Agendamento, Cat, DiaInfo, Exercicio, Repet, Tipo, TreinoSalvo } from "../types";
import { DIA_CURTO, FONTE, MESES, SEM } from "../temas";
import { useTema } from "../tema-ctx";
import { parseIso, uid } from "../dados";
import ModalTreino from "./ModalTreino";
import { inserirNoTexto, sugerirCategoria, tipoDaArea } from "./Exercicios";
import SeletorExercicios from "./SeletorExercicios";

const ROT_REPET: Record<Repet, string> = {
  nunca: "não repete",
  semanal: "semanal",
  quinzenal: "quinzenal",
  mensal: "mensal",
};

const CAT_TIPO: Record<string, Tipo> = {
  aerobico: "a", core: "c",
  biceps: "f", triceps: "f", ombro: "f", costas: "f", peito: "f", inferiores: "f",
};

const CAT_ROT: Record<string, string> = {
  aerobico: "Aeróbico", core: "Core", biceps: "Bíceps", triceps: "Tríceps",
  ombro: "Ombro", costas: "Costas", peito: "Peito", inferiores: "Membros inferiores",
  mobilidade: "Mobilidade", combinado: "Combinado",
};

// mesma ordem de grupos usada na Biblioteca (Força primeiro, depois Core/Aeróbico/Mobilidade)
const CATS_ORDEM: Cat[] = ["peito", "costas", "ombro", "biceps", "triceps", "inferiores", "core", "aerobico", "mobilidade", "combinado"];

// sugere a categoria a partir do primeiro cabeçalho de área já no texto
// (ex: montado com exercícios de COSTAS → sugere "Costas"); sem cabeçalho, cai no tipo marcado
const catPadraoPara = (texto: string, tiposList: Tipo[]): Cat => {
  const sugerida = sugerirCategoria(texto);
  if (sugerida) return sugerida;
  if (tiposList.length === 1 && tiposList[0] === "a") return "aerobico";
  return "peito";
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
  const [criando, setCriando] = useState(false);
  const [texto, setTexto] = useState("");
  const [tiposSel, setTiposSel] = useState<Tipo[]>([]);
  const [repet, setRepet] = useState<Repet>("nunca");
  const [diasSem, setDiasSem] = useState<number[]>([data.getDay()]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [montando, setMontando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nomeSalvar, setNomeSalvar] = useState("");
  const [catSalvar, setCatSalvar] = useState<Cat>("peito");
  const [salvoMsg, setSalvoMsg] = useState<string | null>(null);
  // salvar um treino que JÁ está agendado (cartão "Treino agendado"), independente do form de criar
  const [salvarAgId, setSalvarAgId] = useState<string | null>(null);
  const [nomeSalvarAg, setNomeSalvarAg] = useState("");
  const [catSalvarAg, setCatSalvarAg] = useState<Cat>("peito");
  // guarda o id do agendamento junto da mensagem, senão ela apareceria embaixo de todos os cartões
  const [salvoMsgAg, setSalvoMsgAg] = useState<{ id: string; texto: string } | null>(null);

  const togTipo = (t: Tipo) =>
    setTiposSel((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const togDiaSem = (d: number) =>
    setDiasSem((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  const confirmar = () => {
    if (!texto.trim()) return;
    addAg({ id: uid(), texto: texto.trim(), tipos: tiposSel, inicio: k, repet, diasSemana: diasSem });
    fecharForm();
  };

  const fecharForm = () => {
    setCriando(false);
    setTexto("");
    setTiposSel([]);
    setRepet("nunca");
    setDiasSem([data.getDay()]);
    setMontando(false);
    setSalvando(false);
    setNomeSalvar("");
    setSalvoMsg(null);
  };

  const salvarComoTreino = () => {
    if (!nomeSalvar.trim()) return;
    addSalvo({ id: uid(), cat: catSalvar, nome: nomeSalvar.trim(), texto: texto.trim() });
    setSalvoMsg(`Salvo como "${nomeSalvar.trim()}" em ${CAT_ROT[catSalvar]} — vai aparecer em "usar treino salvo".`);
    setSalvando(false);
    setNomeSalvar("");
  };

  const salvarAgendadoComoTreino = (a: Agendamento) => {
    if (!nomeSalvarAg.trim()) return;
    addSalvo({ id: uid(), cat: catSalvarAg, nome: nomeSalvarAg.trim(), texto: a.texto });
    setSalvoMsgAg({ id: a.id, texto: `Salvo como "${nomeSalvarAg.trim()}" em ${CAT_ROT[catSalvarAg]} — vai aparecer em "usar treino salvo".` });
    setSalvarAgId(null);
    setNomeSalvarAg("");
  };

  const addExercicio = (e: Exercicio) => {
    setTexto((p) => inserirNoTexto(p, e.area, e.nome));
    const t = tipoDaArea(e.area);
    if (t && !tiposSel.includes(t)) setTiposSel((prev) => [...prev, t]);
  };

  const usarSalvo = (id: string) => {
    const s = salvos.find((x) => x.id === id);
    if (!s) return;
    setTexto(s.texto || s.nome);
    const t = CAT_TIPO[s.cat];
    if (t && !tiposSel.includes(t)) setTiposSel((p) => [...p, t]);
  };

  const rotuloRepet = (a: Agendamento) =>
    a.repet === "semanal" || a.repet === "quinzenal"
      ? `${ROT_REPET[a.repet]} · ${a.diasSemana.map((d) => DIA_CURTO[d]).join(", ")}`
      : ROT_REPET[a.repet];

  // usado no card e no cabeçalho do modal
  const metaAgendamento = (a: Agendamento) => (
    <span style={{ ...est.eyebrow, color: C.agendaInk, fontSize: 10 }}>
      {rotuloRepet(a)}
      {a.tipos.length > 0 && " · "}
      {a.tipos.map((t) => {
        const info = tipos.find((x) => x.id === t)!;
        return (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 5 }}>
            <i style={{ width: 7, height: 7, borderRadius: 2, background: info.cor, display: "inline-block" }} />
            {info.rot.toLowerCase()}
          </span>
        );
      })}
    </span>
  );

  const agAberto = aberto ? ags.find((a) => a.id === aberto) : undefined;

  // prévia compacta e formatada do treino agendado; a edição acontece no "abrir"
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
          <div style={{ ...est.eyebrow, marginBottom: 8 }}>Treino agendado</div>
          {ags.map((a) => (
            <div key={a.id} style={{ background: C.agenda, border: `1px solid ${C.line}`, borderRadius: tema.raioP + 2, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                {metaAgendamento(a)}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    style={{ ...est.ghost, padding: "6px 11px", fontSize: 10, color: C.ink, borderColor: C.ink }}
                    onClick={() => setAberto(a.id)}
                  >
                    abrir
                  </button>
                  <button
                    style={{ ...est.ghost, padding: "6px 11px", fontSize: 10 }}
                    aria-expanded={salvarAgId === a.id}
                    onClick={() => {
                      if (salvarAgId !== a.id) {
                        setCatSalvarAg(catPadraoPara(a.texto, a.tipos));
                        setNomeSalvarAg("");
                      }
                      setSalvoMsgAg(null);
                      setSalvarAgId((id) => (id === a.id ? null : a.id));
                    }}
                  >
                    salvar
                  </button>
                  <button
                    style={{ ...est.ghost, padding: "6px 10px", fontSize: 10 }}
                    onClick={() => {
                      const msg = a.repet === "nunca"
                        ? "Excluir este treino agendado?"
                        : "Excluir este treino agendado e todas as repetições?";
                      if (confirm(msg)) delAg(a.id);
                    }}
                  >
                    excluir
                  </button>
                </div>
              </div>
              {previaTreino(a)}

              {salvarAgId === a.id && (
                <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, padding: 12, background: C.panel }}>
                  <input
                    value={nomeSalvarAg}
                    autoFocus
                    onChange={(e) => setNomeSalvarAg(e.target.value)}
                    placeholder="Nome do treino (ex: Treino A — peito e tríceps)"
                    style={{ ...est.input, marginBottom: 8 }}
                  />
                  <select
                    value={catSalvarAg}
                    onChange={(e) => setCatSalvarAg(e.target.value as Cat)}
                    style={{ ...est.input, marginBottom: 10, cursor: "pointer" }}
                  >
                    {CATS_ORDEM.map((c) => (
                      <option key={c} value={c}>{CAT_ROT[c]}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => salvarAgendadoComoTreino(a)}
                      disabled={!nomeSalvarAg.trim()}
                      style={{
                        flex: 1, padding: "9px", borderRadius: tema.raioP - 1, border: "none",
                        background: nomeSalvarAg.trim() ? C.ink : C.deep, color: nomeSalvarAg.trim() ? C.onDark : C.soft,
                        fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                        cursor: nomeSalvarAg.trim() ? "pointer" : "default",
                      }}
                    >
                      Salvar treino
                    </button>
                    <button style={est.ghost} onClick={() => setSalvarAgId(null)}>cancelar</button>
                  </div>
                </div>
              )}

              {salvoMsgAg?.id === a.id && (
                <p role="status" style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.5, color: C.forca, margin: "8px 0 0" }}>
                  {salvoMsgAg.texto}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!criando && (
        <button
          style={{ ...est.ghost, width: "100%", marginTop: 14, padding: "11px", borderStyle: "dashed", color: C.agendaInk }}
          onClick={() => setCriando(true)}
        >
          + agendar treino
        </button>
      )}

      {criando && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
          <div style={{ ...est.eyebrow, marginBottom: 8 }}>Agendar treino</div>

          {salvos.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => { usarSalvo(e.target.value); e.target.value = ""; }}
              style={{ ...est.input, marginBottom: 8, color: C.soft, cursor: "pointer" }}
            >
              <option value="" disabled>Usar treino salvo…</option>
              {salvos.map((s) => (
                <option key={s.id} value={s.id}>{CAT_ROT[s.cat]} — {s.nome}</option>
              ))}
            </select>
          )}

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"Descreva o treino\n(ex: supino 4x8, crucifixo 3x12…)"}
            style={{ ...est.area, minHeight: 80 }}
          />

          <button
            style={{ ...est.ghost, width: "100%", marginTop: 8, padding: "9px", borderStyle: "dashed", color: montando ? C.ink : C.soft, borderColor: montando ? C.ink : C.line }}
            aria-expanded={montando}
            onClick={() => setMontando((m) => !m)}
          >
            {montando ? "− fechar exercícios" : "+ montar com exercícios"}
          </button>

          {montando && <SeletorExercicios exercicios={exercicios} onEscolher={addExercicio} />}

          {texto.trim() && (
            <>
              <button
                style={{ ...est.ghost, width: "100%", marginTop: 8, padding: "9px", borderStyle: "dashed", color: salvando ? C.ink : C.soft, borderColor: salvando ? C.ink : C.line }}
                aria-expanded={salvando}
                onClick={() => {
                  if (!salvando) { setCatSalvar(catPadraoPara(texto, tiposSel)); setNomeSalvar(""); setSalvoMsg(null); }
                  setSalvando((s) => !s);
                }}
              >
                {salvando ? "− fechar" : "+ salvar como treino"}
              </button>

              {salvando && (
                <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: tema.raioP, padding: 12 }}>
                  <input
                    value={nomeSalvar}
                    autoFocus
                    onChange={(e) => setNomeSalvar(e.target.value)}
                    placeholder="Nome do treino (ex: Treino A — peito e tríceps)"
                    style={{ ...est.input, marginBottom: 8 }}
                  />
                  <select
                    value={catSalvar}
                    onChange={(e) => setCatSalvar(e.target.value as Cat)}
                    style={{ ...est.input, marginBottom: 10, cursor: "pointer" }}
                  >
                    {CATS_ORDEM.map((c) => (
                      <option key={c} value={c}>{CAT_ROT[c]}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={salvarComoTreino}
                      disabled={!nomeSalvar.trim()}
                      style={{
                        flex: 1, padding: "9px", borderRadius: tema.raioP - 1, border: "none",
                        background: nomeSalvar.trim() ? C.ink : C.deep, color: nomeSalvar.trim() ? C.onDark : C.soft,
                        fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                        cursor: nomeSalvar.trim() ? "pointer" : "default",
                      }}
                    >
                      Salvar treino
                    </button>
                    <button style={est.ghost} onClick={() => setSalvando(false)}>cancelar</button>
                  </div>
                </div>
              )}

              {salvoMsg && (
                <p role="status" style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.5, color: C.forca, margin: "8px 0 0" }}>
                  {salvoMsg}
                </p>
              )}
            </>
          )}

          <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
            {tipos.map((t) => (
              <button key={t.id}
                style={{ ...chip(tiposSel.includes(t.id), t.cor), padding: "8px 6px", fontSize: 11 }}
                aria-pressed={tiposSel.includes(t.id)}
                onClick={() => togTipo(t.id)}>
                {t.rot}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
            <span style={{ ...est.eyebrow, fontSize: 10 }}>Repetir</span>
            <select
              value={repet}
              onChange={(e) => setRepet(e.target.value as Repet)}
              style={{ ...est.input, width: "auto", flex: 1, padding: "8px 10px", cursor: "pointer" }}
            >
              <option value="nunca">Não repete</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>

          {(repet === "semanal" || repet === "quinzenal") && (
            <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
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

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={confirmar}
              disabled={!texto.trim() || ((repet === "semanal" || repet === "quinzenal") && diasSem.length === 0)}
              style={{
                flex: 1, padding: "11px", borderRadius: tema.raioP, border: "none",
                background: texto.trim() ? C.ink : C.deep, color: texto.trim() ? C.onDark : C.soft,
                fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em",
                textTransform: "uppercase", cursor: texto.trim() ? "pointer" : "default",
              }}
            >
              Agendar
            </button>
            <button style={est.ghost} onClick={fecharForm}>cancelar</button>
          </div>
        </div>
      )}

      {agAberto && (
        <ModalTreino
          titulo={`${data.getDate()} de ${MESES[data.getMonth()]}`}
          subtitulo={metaAgendamento(agAberto)}
          exercicios={exercicios}
          texto={agAberto.texto}
          onChange={(t) => upAg(agAberto.id, { texto: t })}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
