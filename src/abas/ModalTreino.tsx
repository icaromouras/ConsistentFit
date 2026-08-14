import { useEffect, useRef, useState } from "react";
import type { Exercicio } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { AREAS, rotuloArea, tipoDaArea } from "./Exercicios";

interface Props {
  titulo: string;
  subtitulo?: React.ReactNode;
  texto: string;
  /** catálogo, para mostrar a observação de execução ao segurar um exercício */
  exercicios?: Exercicio[];
  onChange: (t: string) => void;
  onFechar: () => void;
}

const SEGURAR_MS = 450;
const TOLERANCIA_PX = 12; // arrastar mais que isso é rolagem, não "segurar"

const areaDaLinha = (linha: string) =>
  AREAS.find((a) => linha.trim().toUpperCase() === a.rot.toUpperCase());

// linha toda em maiúsculas (sem ser item de lista) também vira título na visualização
const ehTituloGenerico = (linha: string) => {
  const t = linha.trim();
  return t.length >= 2 && t.length <= 40 && !t.startsWith("-") && /\p{Lu}/u.test(t) && !/\p{Ll}/u.test(t);
};

export default function ModalTreino({ titulo, subtitulo, texto, exercicios = [], onChange, onFechar }: Props) {
  const { C, est, tema, cor } = useTema();
  const [editando, setEditando] = useState(!texto.trim());
  const [obsAberta, setObsAberta] = useState<Exercicio | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicioRef = useRef<{ x: number; y: number } | null>(null);

  // ref para o handler de teclado ler o estado atual sem re-registrar o listener
  const obsRef = useRef(obsAberta);
  useEffect(() => {
    obsRef.current = obsAberta;
  }, [obsAberta]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape fecha primeiro a caixa de observação; só depois o modal
      if (obsRef.current) setObsAberta(null);
      else onFechar();
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

  const cancelarSegurar = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    inicioRef.current = null;
  };
  useEffect(() => cancelarSegurar, []);

  const iniciarSegurar = (e: React.PointerEvent, ex: Exercicio) => {
    cancelarSegurar();
    inicioRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      setObsAberta(ex);
      navigator.vibrate?.(15);
      cancelarSegurar();
    }, SEGURAR_MS);
  };
  const moverSegurar = (e: React.PointerEvent) => {
    const ini = inicioRef.current;
    if (ini && Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > TOLERANCIA_PX) cancelarSegurar();
  };

  const acharExercicio = (nome: string): Exercicio | undefined =>
    exercicios.find((ex) => ex.nome.trim().toLowerCase() === nome.trim().toLowerCase() && (ex.obs || "").trim());

  const linhas = texto.split("\n");
  const temAlgumaObs = !editando && linhas.some((l) => {
    const t = l.trim();
    if (!t.startsWith("-")) return false;
    const conteudo = t.replace(/^-\s*/, "");
    const sep = conteudo.indexOf("—");
    return !!acharExercicio(sep === -1 ? conteudo : conteudo.slice(0, sep));
  });

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
          const ex = acharExercicio(nome);
          return (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10,
                padding: "7px 0", borderBottom: `1px solid ${C.deep}`,
                ...(ex && {
                  userSelect: "none" as const,
                  WebkitUserSelect: "none" as const,
                  WebkitTouchCallout: "none",
                  cursor: "pointer",
                  touchAction: "pan-y" as const,
                }),
              }}
              {...(ex && {
                onPointerDown: (e: React.PointerEvent) => iniciarSegurar(e, ex),
                onPointerMove: moverSegurar,
                onPointerUp: cancelarSegurar,
                onPointerLeave: cancelarSegurar,
                onPointerCancel: cancelarSegurar,
                onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
              })}
            >
              <span style={{ fontSize: 15, lineHeight: 1.45, color: C.ink }}>
                {nome}
                {ex && (
                  <span aria-hidden style={{ ...est.num, fontSize: 10, color: C.soft, marginLeft: 6, border: `1px solid ${C.line}`, borderRadius: "50%", width: 15, height: 15, display: "inline-flex", alignItems: "center", justifyContent: "center", verticalAlign: "2px" }}>
                    i
                  </span>
                )}
              </span>
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
          {editando
            ? "o que você escrever aqui é salvo automaticamente"
            : temAlgumaObs
              ? "segure um exercício com ⓘ para ver como executar · toque em editar para alterar"
              : "toque em editar para alterar o treino"}
        </p>
      </div>

      {obsAberta && (
        <div
          onClick={() => setObsAberta(null)}
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            role="dialog"
            aria-label={`Execução de ${obsAberta.nome}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 620, background: C.panel,
              borderRadius: `${tema.raio + 4}px ${tema.raio + 4}px 0 0`,
              border: `1px solid ${C.line}`, borderBottom: "none",
              padding: `18px 20px max(20px, env(safe-area-inset-bottom))`,
              boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, display: "inline-block", background: tipoDaArea(obsAberta.area) ? cor(tipoDaArea(obsAberta.area)!) : C.soft }} />
              <span style={{ ...est.eyebrow, fontSize: 10 }}>{rotuloArea(obsAberta.area)}</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink, marginBottom: 10 }}>
              {obsAberta.nome}
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: C.ink }}>{obsAberta.obs}</p>
            <button
              onClick={() => setObsAberta(null)}
              style={{ ...est.ghost, width: "100%", marginTop: 16, padding: "11px" }}
            >
              fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
