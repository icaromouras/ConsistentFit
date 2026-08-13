import { useEffect, useState } from "react";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { AREAS, tipoDaArea } from "./Exercicios";

interface Props {
  titulo: string;
  subtitulo?: React.ReactNode;
  texto: string;
  onChange: (t: string) => void;
  onFechar: () => void;
}

const areaDaLinha = (linha: string) =>
  AREAS.find((a) => linha.trim().toUpperCase() === a.rot.toUpperCase());

// linha toda em maiúsculas (sem ser item de lista) também vira título na visualização
const ehTituloGenerico = (linha: string) => {
  const t = linha.trim();
  return t.length >= 2 && t.length <= 40 && !t.startsWith("-") && /\p{Lu}/u.test(t) && !/\p{Ll}/u.test(t);
};

export default function ModalTreino({ titulo, subtitulo, texto, onChange, onFechar }: Props) {
  const { C, est, tema, cor } = useTema();
  const [editando, setEditando] = useState(!texto.trim());

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    // trava a rolagem do fundo enquanto o modal está aberto
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAntes;
    };
  }, [onFechar]);

  const linhas = texto.split("\n");

  const visualizacao = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: C.panel, border: `1px solid ${C.line}`, borderRadius: tema.raioP + 2, padding: "6px 16px 16px" }}>
      {linhas.map((linha, i) => {
        const t = linha.trim();
        if (!t) return <div key={i} style={{ height: 8 }} />;

        const area = areaDaLinha(linha);
        if (area || ehTituloGenerico(linha)) {
          const tipoArea = area ? tipoDaArea(area.id) : null;
          const corArea = area ? (tipoArea ? cor(tipoArea) : C.soft) : C.soft;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 8px" }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: corArea, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontFamily: FONTE.mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink }}>
                {area ? area.rot : t}
              </span>
              <span style={{ flex: 1, borderTop: `1px solid ${C.line}` }} />
            </div>
          );
        }

        if (t.startsWith("-")) {
          const conteudo = t.replace(/^-\s*/, "");
          const sep = conteudo.indexOf("—");
          const nome = sep === -1 ? conteudo : conteudo.slice(0, sep).trim();
          const detalhe = sep === -1 ? "" : conteudo.slice(sep + 1).trim();
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.deep}` }}>
              <span style={{ fontSize: 15, lineHeight: 1.45, color: C.ink }}>{nome}</span>
              {detalhe && (
                <span style={{ ...est.num, fontSize: 13, color: C.soft, whiteSpace: "nowrap", flexShrink: 0 }}>{detalhe}</span>
              )}
            </div>
          );
        }

        return (
          <p key={i} style={{ margin: "6px 0", fontSize: 15, lineHeight: 1.55, color: C.ink }}>
            {linha}
          </p>
        );
      })}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Treino de ${titulo}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: C.paper,
        display: "flex",
        flexDirection: "column",
        // respeita o recorte da tela (notch e barra inferior)
        padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
      }}
    >
      <div style={{ maxWidth: 620, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>{titulo}</div>
            {subtitulo && <div style={{ marginTop: 4 }}>{subtitulo}</div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setEditando((e) => !e)}
              aria-pressed={editando}
              style={{ ...est.ghost, padding: "10px 12px", fontSize: 11 }}
            >
              {editando ? "ver" : "editar"}
            </button>
            <button
              onClick={onFechar}
              aria-label="Fechar"
              style={{
                padding: "10px 16px",
                borderRadius: tema.raioP,
                border: "none",
                background: C.ink,
                color: C.paper,
                fontFamily: FONTE.mono,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </div>

        {editando ? (
          <textarea
            value={texto}
            onChange={(e) => onChange(e.target.value)}
            autoFocus={!texto.trim()}
            placeholder="Descreva o treino"
            style={{
              ...est.area,
              flex: 1,
              minHeight: 0,
              resize: "none",
              // 16px evita o zoom automático do iOS ao focar o campo
              fontSize: 16,
              lineHeight: 1.7,
              padding: 16,
            }}
          />
        ) : (
          visualizacao
        )}

        <p style={{ ...est.eyebrow, fontSize: 9, textAlign: "center", margin: "10px 0 0" }}>
          {editando ? "o que você escrever aqui é salvo automaticamente" : "toque em editar para alterar o treino"}
        </p>
      </div>
    </div>
  );
}
