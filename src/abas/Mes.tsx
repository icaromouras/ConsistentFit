import { useMemo } from "react";
import type { Agendamento, Dados, DiaInfo, Tipo, TreinoSalvo } from "../types";
import { FONTE, MESES, SEM, fundoTipos } from "../temas";
import { useTema } from "../tema-ctx";
import { agendadosNoDia, iso } from "../dados";
import PainelDia from "./PainelDia";
import ResumoMes from "./ResumoMes";

interface Props {
  dados: Dados;
  cursor: { y: number; m: number };
  navegar: (delta: number) => void;
  sel: string | null;
  setSel: (k: string | null) => void;
  setDia: (k: string, patch: Partial<DiaInfo>) => void;
  addAg: (a: Agendamento) => void;
  upAg: (id: string, patch: Partial<Agendamento>) => void;
  delAg: (id: string) => void;
  addSalvo: (t: TreinoSalvo) => void;
  totais: { f: number; c: number; a: number; dias: number };
  hojeIso: string;
}

export default function Mes({ dados, cursor, navegar, sel, setSel, setDia, addAg, upAg, delAg, addSalvo, totais, hojeIso }: Props) {
  const { C, est, tema, tipos } = useTema();

  const coresDoDia = (v?: DiaInfo): string[] => (v ? tipos.filter((t) => v[t.id]).map((t) => t.cor) : []);

  const grade = useMemo(() => {
    const primeiro = new Date(cursor.y, cursor.m, 1).getDay();
    const qtd = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cels: (number | null)[] = [];
    for (let i = 0; i < primeiro; i++) cels.push(null);
    for (let d = 1; d <= qtd; d++) cels.push(d);
    return cels;
  }, [cursor]);

  const agendaDoMes = useMemo(() => {
    const marca: Record<string, boolean> = {};
    grade.forEach((d) => {
      if (!d) return;
      const k = iso(cursor.y, cursor.m, d);
      if (agendadosNoDia(dados.agendamentos, k).length > 0) marca[k] = true;
    });
    return marca;
  }, [grade, cursor, dados.agendamentos]);

  const selVal: DiaInfo = sel ? dados.dias[sel] || {} : {};
  const selAgs = sel ? agendadosNoDia(dados.agendamentos, sel) : [];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button style={est.nav} onClick={() => navegar(-1)} aria-label="Mês anterior">‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>{MESES[cursor.m]}</div>
          <div style={est.eyebrow}>{cursor.y}</div>
        </div>
        <button style={est.nav} onClick={() => navegar(1)} aria-label="Próximo mês">›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {SEM.map((d, i) => (
          <div key={i} style={{ ...est.eyebrow, textAlign: "center", fontSize: 10 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {grade.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = iso(cursor.y, cursor.m, d);
          const v = dados.dias[k];
          const cores = coresDoDia(v);
          const marcado = cores.length > 0;
          const agendado = agendaDoMes[k];
          const ehHoje = k === hojeIso;
          return (
            <button
              key={i}
              className="cel"
              onClick={() => setSel(sel === k ? null : k)}
              aria-label={`Dia ${d}`}
              style={{
                position: "relative", aspectRatio: "1", overflow: "hidden",
                border: sel === k ? `2px solid ${C.ink}` : ehHoje ? `1.5px dashed ${C.soft}` : `1px solid ${C.line}`,
                borderRadius: tema.raioP,
                background: marcado ? fundoTipos(cores) : agendado ? C.agenda : C.panel,
                color: marcado ? C.onDark : C.ink,
                textShadow: marcado ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                fontFamily: FONTE.mono, fontSize: 14, fontWeight: marcado ? 600 : 400,
                cursor: "pointer", padding: 0,
              }}
            >
              {d}
              {agendado && (
                <span aria-hidden style={{
                  position: "absolute", top: 0, right: 0, width: 0, height: 0,
                  borderTop: `9px solid ${marcado ? C.onDark : C.agendaInk}`,
                  borderLeft: "9px solid transparent",
                }} />
              )}
              {v && (v.nota || "").trim() && (
                <span style={{ position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: marcado ? C.onDark : C.soft }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ ...est.eyebrow, fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}>
          <i style={{ width: 9, height: 9, borderRadius: 2, background: C.agenda, border: `1px solid ${C.agendaInk}`, display: "inline-block" }} /> agendado
        </span>
        {tipos.map((t) => (
          <span key={t.id} style={{ ...est.eyebrow, fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 9, height: 9, borderRadius: 2, background: t.cor, display: "inline-block" }} /> {t.rot.toLowerCase()}
          </span>
        ))}
      </div>

      {sel && (
        <PainelDia
          key={sel}
          k={sel}
          dia={selVal}
          ags={selAgs}
          salvos={dados.salvos}
          exercicios={dados.exercicios}
          setDia={setDia}
          addAg={addAg}
          upAg={upAg}
          delAg={delAg}
          addSalvo={addSalvo}
        />
      )}

      <ResumoMes dados={dados} y={cursor.y} m={cursor.m} />

      <div style={{ ...est.card, marginTop: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ ...est.eyebrow, fontSize: 10 }}>acumulado de {cursor.y}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          {tipos.map((t) => (
            <span key={t.id} style={{ ...est.num, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: t.cor, display: "inline-block" }} />
              {totais[t.id as Tipo]}
            </span>
          ))}
          <span style={{ ...est.num, fontSize: 18 }}>{totais.dias}</span>
          <span style={{ ...est.eyebrow, fontSize: 9 }}>dias</span>
        </div>
      </div>
    </>
  );
}
