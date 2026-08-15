import type { Tipo } from "../types";
import { MES_CURTO } from "../temas";
import { useTema } from "../tema-ctx";

export interface TotaisAno {
  f: number; c: number; a: number; dias: number;
  porMes: { f: number; c: number; a: number; dias: number }[];
}

interface Props {
  totais: TotaisAno;
  ano: number;
  mudarAno: (delta: number) => void;
  metaAno: number;
  setMeta: (n: number) => void;
  anotacoes: string;
  setAnotacoes: (t: string) => void;
}

export default function Ano({ totais, ano, mudarAno, metaAno, setMeta, anotacoes, setAnotacoes }: Props) {
  const { C, est, tipos } = useTema();
  const hoje = new Date();
  const escala = Math.max(12, ...totais.porMes.map((x) => x.f + x.c + x.a));
  const pct = metaAno > 0 ? Math.min(100, (totais.dias / metaAno) * 100) : 0;

  const inicioAno = new Date(ano, 0, 1).getTime();
  const diasPassados = ano < hoje.getFullYear() ? 366
    : ano > hoje.getFullYear() ? 0
    : Math.floor((hoje.getTime() - inicioAno) / 86400000) + 1;
  const esperado = metaAno > 0 ? Math.round((metaAno * diasPassados) / 366) : 0;
  const delta = totais.dias - esperado;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button style={est.nav} onClick={() => mudarAno(-1)} aria-label="Ano anterior">‹</button>
        <div style={{ ...est.num, fontSize: 22 }}>{ano}</div>
        <button style={est.nav} onClick={() => mudarAno(1)} aria-label="Próximo ano">›</button>
      </div>

      <div style={{ ...est.card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div>
            <span style={{ ...est.num, fontSize: 34 }}>{totais.dias}</span>
            <span style={{ ...est.eyebrow, marginLeft: 8 }}>dias treinados</span>
          </div>
          <label style={{ ...est.eyebrow, fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}>
            meta
            <input
              type="number"
              min={0}
              value={metaAno || ""}
              placeholder="—"
              onChange={(e) => setMeta(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{ ...est.input, width: 64, padding: "6px 8px", fontFamily: est.num.fontFamily, fontSize: 14, textAlign: "center" }}
            />
          </label>
        </div>

        {metaAno > 0 && (
          <>
            <div style={{ height: 10, background: C.deep, borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: C.ink, borderRadius: 5 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ ...est.eyebrow, fontSize: 10 }}>{Math.round(pct)}% de {metaAno}</span>
              {diasPassados > 0 && diasPassados < 366 && (
                <span style={{ ...est.eyebrow, fontSize: 10, color: delta >= 0 ? C.ink : C.aero }}>
                  {delta === 0 ? "no ritmo" : delta > 0 ? `${delta} à frente` : `${-delta} atrás`}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div style={est.card}>
        {totais.porMes.map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 11 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ ...est.eyebrow, width: 28, fontSize: 11 }}>{MES_CURTO[i]}</div>
            <div style={{ flex: 1, display: "flex", gap: 2, height: 14, background: C.deep, borderRadius: 3, overflow: "hidden" }}>
              {tipos.map((t) => v[t.id as Tipo] > 0 && (
                <div key={t.id} style={{ width: `${(v[t.id as Tipo] / escala) * 100}%`, background: t.cor, borderRadius: 2 }} />
              ))}
            </div>
            <div style={{ ...est.num, fontSize: 12, width: 30, textAlign: "right", color: v.dias ? C.ink : C.line }}>
              {v.dias}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        {tipos.map((t) => (
          <span key={t.id} style={{ ...est.eyebrow, display: "flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 10, height: 10, background: t.cor, borderRadius: 2, display: "inline-block" }} /> {t.rot.toLowerCase()}
          </span>
        ))}
      </div>
      <div style={{ ...est.eyebrow, fontSize: 9, marginTop: 6 }}>o número à direita é o total de dias treinados no mês</div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {tipos.map((t) => (
          <div key={t.id} style={{ ...est.card, flex: 1, padding: "12px 10px", borderTop: `3px solid ${t.cor}` }}>
            <div style={{ ...est.num, fontSize: 22 }}>{totais[t.id as Tipo]}</div>
            <div style={{ ...est.eyebrow, fontSize: 9, marginTop: 2 }}>{t.rot}</div>
          </div>
        ))}
      </div>

      <div style={{ ...est.eyebrow, margin: "20px 0 8px" }}>Anotações e objetivos</div>
      <textarea
        value={anotacoes}
        onChange={(e) => setAnotacoes(e.target.value)}
        placeholder={"Ex: 4 treinos por semana, correr 10 km, supino 100 kg"}
        style={{ ...est.area, minHeight: 90 }}
      />
    </>
  );
}
