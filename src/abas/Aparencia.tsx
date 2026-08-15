import type { Cores, TemaId, Tipo } from "../types";
import { useTema } from "../tema-ctx";
import { FONTE, TEMAS, coresEmUso, fundoTipos, acharTema } from "../temas";

interface Props {
  temaAtual: TemaId;
  setTema: (t: TemaId) => void;
  cores: Cores;
  setCor: (t: Tipo, cor: string | null) => void;
}

export default function Aparencia({ temaAtual, setTema, cores, setCor }: Props) {
  const { C, est, tipos, tema } = useTema();
  const personalizadas = (["f", "c", "a"] as Tipo[]).filter((t) => cores[t]);

  return (
    <>
      <div style={{ ...est.eyebrow, marginBottom: 10 }}>Tema</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 26 }}>
        {TEMAS.map((t) => {
          const ativo = t.id === temaAtual;
          const amostra = coresEmUso(t, cores);
          return (
            <button
              key={t.id}
              onClick={() => setTema(t.id)}
              aria-pressed={ativo}
              style={{
                textAlign: "left",
                padding: 0,
                overflow: "hidden",
                cursor: "pointer",
                borderRadius: t.raio,
                border: ativo ? `2px solid ${C.ink}` : `1px solid ${C.line}`,
                background: t.p.paper,
              }}
            >
              {/* miniatura do tema, desenhada com as cores dele */}
              <div style={{ padding: 12, background: t.p.paper }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: FONTE.sans, fontWeight: t.peso, fontSize: 13, color: t.p.ink, letterSpacing: "-0.02em" }}>
                    Consistent<span style={{ color: amostra.a }}>Fit</span>
                  </span>
                  {ativo && (
                    <span style={{ fontFamily: FONTE.mono, fontSize: 8, letterSpacing: "0.1em", color: t.p.soft, textTransform: "uppercase" }}>
                      ativo
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
                  {[
                    [amostra.f, amostra.c],
                    [],
                    [amostra.a],
                    [amostra.f, amostra.c, amostra.a],
                    [],
                  ].map((cs, i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: "1",
                        borderRadius: Math.max(2, t.raioP - 5),
                        background: cs.length ? fundoTipos(cs) : t.p.panel,
                        border: cs.length ? "none" : `1px solid ${t.p.line}`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ padding: "8px 12px 10px", background: t.p.panel, borderTop: `1px solid ${t.p.line}` }}>
                <div style={{ fontFamily: FONTE.sans, fontSize: 13, fontWeight: 600, color: t.p.ink }}>{t.nome}</div>
                <div style={{ fontFamily: FONTE.mono, fontSize: 9, letterSpacing: "0.06em", color: t.p.soft, textTransform: "uppercase", marginTop: 2 }}>
                  {t.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ ...est.eyebrow, marginBottom: 8 }}>Cores dos treinos</div>
      <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: C.soft }}>
        Toque no quadrado para escolher outra cor. Ela vale para o calendário, os gráficos e as legendas.
      </p>

      <div style={{ ...est.card, marginBottom: 10 }}>
        {tipos.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: i < tipos.length - 1 ? `1px solid ${C.line}` : "none",
            }}
          >
            <label
              style={{
                position: "relative",
                width: 40,
                height: 40,
                borderRadius: tema.raioP,
                background: t.cor,
                border: `1px solid ${C.line}`,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <input
                type="color"
                value={t.cor}
                onChange={(e) => setCor(t.id, e.target.value)}
                aria-label={`Cor de ${t.rot}`}
                style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
              />
            </label>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{t.rot}</div>
              <div style={{ ...est.num, fontSize: 11, color: C.soft, textTransform: "uppercase" }}>
                {t.cor}
                {cores[t.id] ? " · personalizada" : " · padrão do tema"}
              </div>
            </div>

            {cores[t.id] && (
              <button style={{ ...est.ghost, padding: "5px 9px", fontSize: 9 }} onClick={() => setCor(t.id, null)}>
                voltar
              </button>
            )}
          </div>
        ))}
      </div>

      {personalizadas.length > 0 && (
        <button
          style={{ ...est.ghost, width: "100%", padding: "10px", marginBottom: 12 }}
          onClick={() => personalizadas.forEach((t) => setCor(t, null))}
        >
          Restaurar cores do tema
        </button>
      )}

      <div style={{ ...est.card, padding: 14 }}>
        <div style={{ ...est.eyebrow, fontSize: 10, marginBottom: 10 }}>Como fica</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["f"], ["c"], ["a"], ["f", "c"], ["f", "c", "a"]].map((combo, i) => {
            const cs = combo.map((x) => tipos.find((t) => t.id === x)!.cor);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  aspectRatio: "1",
                  borderRadius: acharTema(temaAtual).raioP,
                  background: fundoTipos(cs),
                  color: C.onDark,
                  fontFamily: FONTE.mono,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <p style={{ ...est.eyebrow, fontSize: 9, marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
          um dia pode ter um, dois ou os três tipos — as cores se dividem na célula
        </p>
      </div>

      <p style={{ ...est.eyebrow, fontSize: 9, lineHeight: 1.6, marginTop: 20, color: C.soft }}>
        As cores padrão de cada tema foram escolhidas para continuarem distinguíveis por quem tem daltonismo. Ao trocar,
        prefira cores bem diferentes entre si.
      </p>
    </>
  );
}
