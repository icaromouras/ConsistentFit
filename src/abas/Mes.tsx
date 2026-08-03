import { useMemo } from "react";
import type { Agendamento, Dados, DiaInfo } from "../types";
import { C, FONTE, MESES, SEM, TIPOS, coresDoDia, est, fundoTipos } from "../theme";
import { agendadosNoDia, iso } from "../dados";
import PainelDia from "./PainelDia";

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
  totais: { f: number; c: number; a: number; dias: number };
  hojeIso: string;
}

export default function Mes({ dados, cursor, navegar, sel, setSel, setDia, addAg, upAg, delAg, totais, hojeIso }: Props) {
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
                borderRadius: 10,
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
        {TIPOS.map((t) => (
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
          setDia={setDia}
          addAg={addAg}
          upAg={upAg}
          delAg={delAg}
        />
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {[...TIPOS.map((t) => ({ rot: t.rot, n: totais[t.id], cor: t.cor })), { rot: "Dias", n: totais.dias, cor: C.ink }].map((x) => (
          <div key={x.rot} style={{ ...est.card, flex: 1, padding: "12px 10px", borderTop: `3px solid ${x.cor}` }}>
            <div style={{ ...est.num, fontSize: 22 }}>{x.n}</div>
            <div style={{ ...est.eyebrow, fontSize: 9, marginTop: 2 }}>{x.rot}</div>
          </div>
        ))}
      </div>
      <p style={{ ...est.eyebrow, marginTop: 8, textAlign: "center" }}>acumulado de {cursor.y}</p>
    </>
  );
}
