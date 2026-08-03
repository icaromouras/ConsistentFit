import React, { useState, useEffect, useMemo, useCallback } from "react";

const KEY = "treinos-v1";

const C = {
  paper: "#E7E8E1",
  panel: "#F2F2EC",
  deep: "#D9DAD1",
  ink: "#15181A",
  soft: "#63675F",
  line: "#C7C9BF",
  iron: "#26365E",
  pulse: "#CC3F1D",
  onDark: "#F2F1EA",
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MES_CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const SEM = ["D","S","T","Q","Q","S","S"];

type DiaInfo = { m: boolean; c: boolean; nota: string };
type Dados = { dias: Record<string, DiaInfo>; plano: string; objetivos: string };

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export default function Treinos() {
  const hoje = new Date();
  const [data, setData] = useState<Dados>({ dias: {}, plano: "", objetivos: "" });
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState(false);
  const [aba, setAba] = useState<"mes" | "ano" | "plano">("mes");
  const [cursor, setCursor] = useState({ y: hoje.getFullYear(), m: hoje.getMonth() });
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw));
    } catch (e) {
      // primeira abertura: ainda não existe nada salvo
    }
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(data));
        setErro(false);
      } catch (e) {
        setErro(true);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [data, pronto]);

  const setDia = useCallback((chave: string, patch: Partial<DiaInfo>) => {
    setData((prev) => {
      const atual = prev.dias[chave] || { m: false, c: false, nota: "" };
      const novo = { ...atual, ...patch };
      const dias = { ...prev.dias };
      if (!novo.m && !novo.c && !(novo.nota || "").trim()) delete dias[chave];
      else dias[chave] = novo;
      return { ...prev, dias };
    });
  }, []);

  const ano = cursor.y;

  const totais = useMemo(() => {
    let m = 0, c = 0, dias = 0;
    const porMes = Array.from({ length: 12 }, () => ({ m: 0, c: 0, dias: 0 }));
    Object.entries(data.dias).forEach(([k, v]) => {
      if (!k.startsWith(String(ano))) return;
      const mi = parseInt(k.slice(5, 7), 10) - 1;
      if (v.m) { m++; porMes[mi].m++; }
      if (v.c) { c++; porMes[mi].c++; }
      if (v.m || v.c) { dias++; porMes[mi].dias++; }
    });
    return { m, c, dias, porMes };
  }, [data.dias, ano]);

  const grade = useMemo(() => {
    const primeiro = new Date(cursor.y, cursor.m, 1).getDay();
    const qtd = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cels: (number | null)[] = [];
    for (let i = 0; i < primeiro; i++) cels.push(null);
    for (let d = 1; d <= qtd; d++) cels.push(d);
    return cels;
  }, [cursor]);

  const navegar = (delta: number) => {
    setSel(null);
    setCursor((p) => {
      const d = new Date(p.y, p.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const fundo = (v?: DiaInfo) => {
    if (!v) return "transparent";
    if (v.m && v.c) return `linear-gradient(135deg, ${C.iron} 0 50%, ${C.pulse} 50% 100%)`;
    if (v.m) return C.iron;
    if (v.c) return C.pulse;
    return "transparent";
  };

  const hojeIso = iso(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const selVal = sel ? data.dias[sel] || { m: false, c: false, nota: "" } : null;
  const escalaAno = Math.max(12, ...totais.porMes.map((x) => x.m + x.c));

  const s = {
    wrap: { minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "'Archivo', system-ui, sans-serif", padding: "18px 16px 48px", maxWidth: 620, margin: "0 auto" } as React.CSSProperties,
    eyebrow: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: C.soft } as React.CSSProperties,
    tabBtn: (on: boolean): React.CSSProperties => ({ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, background: on ? C.ink : "transparent", color: on ? C.onDark : C.soft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }),
    card: { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 } as React.CSSProperties,
    num: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 } as React.CSSProperties,
    chip: (on: boolean, cor: string): React.CSSProperties => ({ flex: 1, padding: "13px 10px", borderRadius: 10, border: `1.5px solid ${on ? cor : C.line}`, background: on ? cor : "transparent", color: on ? C.onDark : C.soft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }),
    area: { width: "100%", minHeight: 120, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontFamily: "'Archivo', system-ui, sans-serif", fontSize: 15, lineHeight: 1.5, color: C.ink, resize: "vertical", boxSizing: "border-box" } as React.CSSProperties,
    nav: { width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.line}`, background: C.panel, color: C.ink, fontSize: 17, cursor: "pointer", lineHeight: 1 } as React.CSSProperties,
  };

  return (
    <div style={s.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        button:focus-visible, textarea:focus-visible, input:focus-visible { outline: 2px solid ${C.ink}; outline-offset: 2px; }
        textarea:focus, input:focus { outline-color: ${C.ink}; }
        @media (prefers-reduced-motion: no-preference) {
          .cel { transition: transform .12s ease; }
          .cel:active { transform: scale(.93); }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>Treinos</h1>
        <span style={s.eyebrow}>{erro ? "não salvou" : `${ano}`}</span>
      </div>

      <div style={{ display: "flex", gap: 4, background: C.deep, padding: 4, borderRadius: 11, marginBottom: 18 }}>
        {([["mes", "Mês"], ["ano", "Ano"], ["plano", "Plano"]] as const).map(([k, l]) => (
          <button key={k} style={s.tabBtn(aba === k)} onClick={() => setAba(k)}>{l}</button>
        ))}
      </div>

      {!pronto && <p style={{ ...s.eyebrow, textAlign: "center" }}>Carregando…</p>}

      {pronto && aba === "mes" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button style={s.nav} onClick={() => navegar(-1)} aria-label="Mês anterior">‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>{MESES[cursor.m]}</div>
              <div style={s.eyebrow}>{cursor.y}</div>
            </div>
            <button style={s.nav} onClick={() => navegar(1)} aria-label="Próximo mês">›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
            {SEM.map((d, i) => (
              <div key={i} style={{ ...s.eyebrow, textAlign: "center", fontSize: 10 }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {grade.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = iso(cursor.y, cursor.m, d);
              const v = data.dias[k];
              const marcado = v && (v.m || v.c);
              const ehHoje = k === hojeIso;
              return (
                <button
                  key={i}
                  className="cel"
                  onClick={() => setSel(sel === k ? null : k)}
                  aria-label={`Dia ${d}`}
                  style={{
                    position: "relative", aspectRatio: "1", border: sel === k ? `2px solid ${C.ink}` : ehHoje ? `1.5px dashed ${C.soft}` : `1px solid ${C.line}`,
                    borderRadius: 10, background: marcado ? fundo(v) : C.panel,
                    color: marcado ? C.onDark : C.ink, fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 14, fontWeight: marcado ? 600 : 400, cursor: "pointer", padding: 0,
                  }}
                >
                  {d}
                  {v && (v.nota || "").trim() && (
                    <span style={{ position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: marcado ? C.onDark : C.soft }} />
                  )}
                </button>
              );
            })}
          </div>

          {sel && selVal && (
            <div style={{ ...s.card, marginTop: 16 }}>
              <div style={{ ...s.eyebrow, marginBottom: 12 }}>
                {parseInt(sel.slice(8), 10)} de {MESES[cursor.m]}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button style={s.chip(!!selVal.m, C.iron)} aria-pressed={!!selVal.m} onClick={() => setDia(sel, { m: !selVal.m })}>Musculação</button>
                <button style={s.chip(!!selVal.c, C.pulse)} aria-pressed={!!selVal.c} onClick={() => setDia(sel, { c: !selVal.c })}>Cardio</button>
              </div>
              <input
                value={selVal.nota || ""}
                onChange={(e) => setDia(sel, { nota: e.target.value })}
                placeholder="O que você fez (ex: costas + 20 min esteira)"
                style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, fontFamily: "'Archivo', system-ui, sans-serif", fontSize: 14, color: C.ink, boxSizing: "border-box" }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            {([["Musculação", totais.m, C.iron], ["Cardio", totais.c, C.pulse], ["Dias", totais.dias, C.ink]] as const).map(([l, n, cor]) => (
              <div key={l} style={{ ...s.card, flex: 1, padding: 13, borderTop: `3px solid ${cor}` }}>
                <div style={{ ...s.num, fontSize: 24 }}>{n}</div>
                <div style={{ ...s.eyebrow, fontSize: 10, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <p style={{ ...s.eyebrow, marginTop: 8, textAlign: "center" }}>acumulado de {ano}</p>
        </>
      )}

      {pronto && aba === "ano" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button style={s.nav} onClick={() => setCursor((p) => ({ ...p, y: p.y - 1 }))} aria-label="Ano anterior">‹</button>
            <div style={{ ...s.num, fontSize: 22 }}>{ano}</div>
            <button style={s.nav} onClick={() => setCursor((p) => ({ ...p, y: p.y + 1 }))} aria-label="Próximo ano">›</button>
          </div>

          <div style={s.card}>
            {totais.porMes.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 11 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ ...s.eyebrow, width: 28, fontSize: 11 }}>{MES_CURTO[i]}</div>
                <div style={{ flex: 1, display: "flex", height: 14, background: C.deep, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${(v.m / escalaAno) * 100}%`, background: C.iron }} />
                  <div style={{ width: `${(v.c / escalaAno) * 100}%`, background: C.pulse }} />
                </div>
                <div style={{ ...s.num, fontSize: 12, width: 62, textAlign: "right", color: v.dias ? C.ink : C.line }}>
                  {v.m}·{v.c}·{v.dias}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ ...s.eyebrow, display: "flex", alignItems: "center", gap: 6 }}>
              <i style={{ width: 10, height: 10, background: C.iron, borderRadius: 2, display: "inline-block" }} /> musculação
            </span>
            <span style={{ ...s.eyebrow, display: "flex", alignItems: "center", gap: 6 }}>
              <i style={{ width: 10, height: 10, background: C.pulse, borderRadius: 2, display: "inline-block" }} /> cardio
            </span>
            <span style={s.eyebrow}>· dias treinados</span>
          </div>

          <div style={{ ...s.card, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ ...s.num, fontSize: 30 }}>{totais.dias}</div>
              <div style={s.eyebrow}>dias treinados em {ano}</div>
            </div>
            <div style={{ ...s.num, fontSize: 13, color: C.soft, textAlign: "right" }}>
              {totais.m} musculação<br />{totais.c} cardio
            </div>
          </div>
        </>
      )}

      {pronto && aba === "plano" && (
        <>
          <div style={{ ...s.eyebrow, marginBottom: 8 }}>O que treinar</div>
          <textarea
            value={data.plano}
            onChange={(e) => setData((p) => ({ ...p, plano: e.target.value }))}
            placeholder={"A — peito e tríceps\nB — costas e bíceps\nC — pernas\nD — ombro e core"}
            style={s.area}
          />
          <div style={{ ...s.eyebrow, margin: "20px 0 8px" }}>Objetivos</div>
          <textarea
            value={data.objetivos}
            onChange={(e) => setData((p) => ({ ...p, objetivos: e.target.value }))}
            placeholder={"Ex: 4 treinos por semana, 150 dias no ano, supino 100 kg"}
            style={{ ...s.area, minHeight: 100 }}
          />
          <button
            onClick={() => { if (confirm("Apagar todos os treinos, plano e objetivos?")) setData({ dias: {}, plano: "", objetivos: "" }); }}
            style={{ marginTop: 28, width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${C.line}`, background: "transparent", color: C.soft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Apagar tudo
          </button>
        </>
      )}
    </div>
  );
}
