import { useState } from "react";
import type { Agendamento, AreaEx, DiaInfo, Exercicio, Repet, Tipo, TreinoSalvo } from "../types";
import { DIA_CURTO, FONTE, MESES, SEM } from "../temas";
import { useTema } from "../tema-ctx";
import { parseIso, uid } from "../dados";
import ModalTreino from "./ModalTreino";
import { AREAS, tipoDaArea } from "./Exercicios";

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
  mobilidade: "Mobilidade",
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
}

export default function PainelDia({ k, dia, ags, salvos, exercicios, setDia, addAg, upAg, delAg }: Props) {
  const { C, est, chip, tipos } = useTema();
  const data = parseIso(k);
  const [criando, setCriando] = useState(false);
  const [texto, setTexto] = useState("");
  const [tiposSel, setTiposSel] = useState<Tipo[]>([]);
  const [repet, setRepet] = useState<Repet>("nunca");
  const [diasSem, setDiasSem] = useState<number[]>([data.getDay()]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [montando, setMontando] = useState(false);
  const [areaAberta, setAreaAberta] = useState<AreaEx | null>(null);

  const togTipo = (t: Tipo) =>
    setTiposSel((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const togDiaSem = (d: number) =>
    setDiasSem((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  const confirmar = () => {
    if (!texto.trim()) return;
    addAg({ id: uid(), texto: texto.trim(), tipos: tiposSel, inicio: k, repet, diasSemana: diasSem });
    setCriando(false);
    setTexto("");
    setTiposSel([]);
    setRepet("nunca");
    setDiasSem([data.getDay()]);
  };

  const addExercicio = (e: Exercicio) => {
    setTexto((p) => (p && !p.endsWith("\n") ? p + "\n" : p) + e.nome + " — ");
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

  return (
    <div style={{ ...est.card, marginTop: 16 }}>
      <div style={{ ...est.eyebrow, marginBottom: 12 }}>
        {data.getDate()} de {MESES[data.getMonth()]} · {DIA_CURTO[data.getDay()]}
      </div>

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
            <div key={a.id} style={{ background: C.agenda, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                {metaAgendamento(a)}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    style={{ ...est.ghost, padding: "4px 10px", fontSize: 10, color: C.ink, borderColor: C.ink }}
                    onClick={() => setAberto(a.id)}
                  >
                    abrir
                  </button>
                  <button
                    style={{ ...est.ghost, padding: "4px 8px", fontSize: 10 }}
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
              <textarea
                value={a.texto}
                onChange={(e) => upAg(a.id, { texto: e.target.value })}
                style={{ ...est.area, minHeight: 60, background: C.panel, fontSize: 14 }}
              />
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

          {montando && (
            <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
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
                            onClick={() => addExercicio(e)}
                            style={{
                              padding: "7px 11px", borderRadius: 8, border: `1px solid ${C.line}`,
                              background: C.panel, color: C.ink, fontFamily: FONTE.sans,
                              fontSize: 13, cursor: "pointer",
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
                  toque para adicionar ao treino — depois complete com séries e repetições no texto
                </p>
              )}
            </div>
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
                    flex: 1, aspectRatio: "1", borderRadius: 8, cursor: "pointer",
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
                flex: 1, padding: "11px", borderRadius: 10, border: "none",
                background: texto.trim() ? C.ink : C.deep, color: texto.trim() ? C.onDark : C.soft,
                fontFamily: FONTE.mono, fontSize: 12, letterSpacing: "0.08em",
                textTransform: "uppercase", cursor: texto.trim() ? "pointer" : "default",
              }}
            >
              Agendar
            </button>
            <button style={est.ghost} onClick={() => setCriando(false)}>cancelar</button>
          </div>
        </div>
      )}

      {agAberto && (
        <ModalTreino
          titulo={`${data.getDate()} de ${MESES[data.getMonth()]}`}
          subtitulo={metaAgendamento(agAberto)}
          texto={agAberto.texto}
          onChange={(t) => upAg(agAberto.id, { texto: t })}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
