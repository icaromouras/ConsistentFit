import { useEffect, useRef } from "react";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";

interface Props {
  titulo: string;
  subtitulo?: React.ReactNode;
  texto: string;
  onChange: (t: string) => void;
  onFechar: () => void;
}

export default function ModalTreino({ titulo, subtitulo, texto, onChange, onFechar }: Props) {
  const { C, est, tema } = useTema();
  const areaRef = useRef<HTMLTextAreaElement>(null);

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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>{titulo}</div>
            {subtitulo && <div style={{ marginTop: 4 }}>{subtitulo}</div>}
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              flexShrink: 0,
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

        <textarea
          ref={areaRef}
          value={texto}
          onChange={(e) => onChange(e.target.value)}
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

        <p style={{ ...est.eyebrow, fontSize: 9, textAlign: "center", margin: "10px 0 0" }}>
          o que você escrever aqui é salvo automaticamente
        </p>
      </div>
    </div>
  );
}
