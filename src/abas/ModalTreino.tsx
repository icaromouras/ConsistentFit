import { useEffect, useRef, useState } from "react";
import type { Exercicio } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { AREAS, rotuloArea, tipoDaArea } from "./Exercicios";

interface Props {
  titulo: string;
  subtitulo?: React.ReactNode;
  texto: string;
  /** catálogo, para a observação de execução e a carga de cada exercício */
  exercicios?: Exercicio[];
  onChange: (t: string) => void;
  onFechar: () => void;
  /** exercícios já feitos (nomes normalizados); ausente = sem marcação de feito */
  feitos?: string[];
  onFeitos?: (nomes: string[]) => void;
  /** grava a carga no catálogo */
  onCarga?: (id: string, carga: string | undefined) => void;
  /** a que dia as marcações pertencem, quando não é óbvio pelo título (ex: "hoje") */
  diaFeitos?: string;
}

const SEGURAR_MS = 450;
const TOLERANCIA_PX = 12; // arrastar mais que isso é rolagem, não "segurar"

/** Chave de comparação de nomes de exercício, entre o texto do treino e o catálogo. */
export const chaveNome = (n: string) => n.trim().toLowerCase();

const areaDaLinha = (linha: string) =>
  AREAS.find((a) => linha.trim().toUpperCase() === a.rot.toUpperCase());

// linha toda em maiúsculas (sem ser item de lista) também vira título na visualização
const ehTituloGenerico = (linha: string) => {
  const t = linha.trim();
  return t.length >= 2 && t.length <= 40 && !t.startsWith("-") && /\p{Lu}/u.test(t) && !/\p{Ll}/u.test(t);
};

/** Separa "- Nome — 4x10" em nome e detalhe. */
export const partesDaLinha = (linha: string) => {
  const conteudo = linha.trim().replace(/^-\s*/, "");
  const sep = conteudo.indexOf("—");
  return {
    nome: sep === -1 ? conteudo : conteudo.slice(0, sep).trim(),
    detalhe: sep === -1 ? "" : conteudo.slice(sep + 1).trim(),
  };
};

/** Quantos exercícios o treino tem e quantos já foram feitos. */
export function progresso(texto: string, feitos: string[]) {
  const nomes = texto
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .map((l) => chaveNome(partesDaLinha(l).nome))
    .filter(Boolean);
  const marcados = new Set(feitos);
  return { total: nomes.length, feitos: nomes.filter((n) => marcados.has(n)).length };
}

const DIA_MES = (iso: string) => {
  const [, m, d] = iso.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${Number(d)}/${meses[Number(m) - 1]}`;
};

export default function ModalTreino({
  titulo, subtitulo, texto, exercicios = [], onChange, onFechar,
  feitos, onFeitos, onCarga, diaFeitos,
}: Props) {
  const { C, est, tema, cor } = useTema();
  const [editando, setEditando] = useState(!texto.trim());
  const [detalhe, setDetalhe] = useState<Exercicio | null>(null);
  const [cargaEdit, setCargaEdit] = useState<string | null>(null); // id do exercício
  const [cargaValor, setCargaValor] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicioRef = useRef<{ x: number; y: number } | null>(null);

  const marcavel = !!feitos && !!onFeitos;
  const marcados = new Set(feitos ?? []);

  // ref para o handler de teclado ler o estado atual sem re-registrar o listener
  const detalheRef = useRef(detalhe);
  useEffect(() => {
    detalheRef.current = detalhe;
  }, [detalhe]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape fecha primeiro a caixa de detalhe; só depois o modal
      if (detalheRef.current) setDetalhe(null);
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
      setDetalhe(ex);
      navigator.vibrate?.(15);
      cancelarSegurar();
    }, SEGURAR_MS);
  };
  const moverSegurar = (e: React.PointerEvent) => {
    const ini = inicioRef.current;
    if (ini && Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > TOLERANCIA_PX) cancelarSegurar();
  };

  const acharExercicio = (nome: string): Exercicio | undefined =>
    exercicios.find((ex) => chaveNome(ex.nome) === chaveNome(nome));

  const alternarFeito = (nome: string) => {
    if (!onFeitos) return;
    const k = chaveNome(nome);
    if (!k) return;
    navigator.vibrate?.(8);
    onFeitos(marcados.has(k) ? (feitos ?? []).filter((n) => n !== k) : [...(feitos ?? []), k]);
  };

  const abrirCarga = (ex: Exercicio) => {
    setCargaEdit(ex.id);
    setCargaValor(ex.carga || "");
  };
  const gravarCarga = (ex: Exercicio) => {
    onCarga?.(ex.id, cargaValor.trim() || undefined);
    setCargaEdit(null);
  };

  const linhas = texto.split("\n");
  const conta = progresso(texto, feitos ?? []);
  const temAlgumaObs = !editando && linhas.some((l) => {
    if (!l.trim().startsWith("-")) return false;
    return !!acharExercicio(partesDaLinha(l).nome)?.obs?.trim();
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
          const { nome, detalhe: det } = partesDaLinha(t);
          const ex = acharExercicio(nome);
          const feito = marcados.has(chaveNome(nome));
          const editandoCarga = !!ex && cargaEdit === ex.id;
          return (
            <div key={i} style={{ padding: "7px 0", borderBottom: `1px solid ${C.deep}` }}>
              <div
                style={{
                  display: "flex", alignItems: "baseline", gap: 10,
                  ...(ex && {
                    userSelect: "none" as const,
                    WebkitUserSelect: "none" as const,
                    WebkitTouchCallout: "none",
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
                {marcavel && (
                  <button
                    onClick={() => alternarFeito(nome)}
                    aria-pressed={feito}
                    aria-label={`${feito ? "Desmarcar" : "Marcar como feito"}: ${nome}`}
                    style={{
                      flexShrink: 0, width: 24, height: 24, alignSelf: "center", cursor: "pointer",
                      borderRadius: Math.max(4, tema.raioP - 3),
                      border: `1.5px solid ${feito ? C.ink : C.line}`,
                      background: feito ? C.ink : "transparent",
                      color: C.paper, fontSize: 14, lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}
                  >
                    {feito ? "✓" : ""}
                  </button>
                )}

                <span
                  onClick={marcavel ? () => alternarFeito(nome) : undefined}
                  style={{
                    flex: 1, fontSize: 15, lineHeight: 1.45,
                    color: feito ? C.soft : C.ink,
                    textDecoration: feito ? "line-through" : "none",
                    cursor: marcavel ? "pointer" : ex ? "pointer" : "default",
                  }}
                >
                  {nome}
                  {ex?.obs?.trim() && (
                    <span aria-hidden style={{ ...est.num, fontSize: 10, color: C.soft, marginLeft: 6, border: `1px solid ${C.line}`, borderRadius: "50%", width: 15, height: 15, display: "inline-flex", alignItems: "center", justifyContent: "center", verticalAlign: "2px" }}>
                      i
                    </span>
                  )}
                </span>

                {det && (
                  <span style={{ ...est.num, fontSize: 13, color: C.soft, whiteSpace: "nowrap", flexShrink: 0 }}>{det}</span>
                )}
              </div>

              {ex && onCarga && (
                <div style={{ marginLeft: marcavel ? 34 : 0, marginTop: 3 }}>
                  {editandoCarga ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        value={cargaValor}
                        autoFocus
                        onChange={(e) => setCargaValor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") gravarCarga(ex);
                          if (e.key === "Escape") { e.stopPropagation(); setCargaEdit(null); }
                        }}
                        placeholder="ex: 20 kg, placa 5"
                        aria-label={`Peso de ${nome}`}
                        style={{ ...est.input, padding: "7px 9px", fontSize: 14, maxWidth: 200 }}
                      />
                      <button style={{ ...est.ghost, padding: "7px 11px", color: C.ink, borderColor: C.ink }} onClick={() => gravarCarga(ex)}>
                        ok
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => abrirCarga(ex)}
                      aria-label={ex.carga ? `Mudar o peso de ${nome}` : `Anotar o peso de ${nome}`}
                      style={{
                        ...est.num, fontSize: 11, cursor: "pointer",
                        padding: "3px 8px", borderRadius: Math.max(3, tema.raioP - 3),
                        border: `1px ${ex.carga ? "solid" : "dashed"} ${C.line}`,
                        background: "transparent", color: ex.carga ? C.ink : C.soft,
                      }}
                    >
                      {ex.carga ? ex.carga : "+ peso"}
                      {ex.carga && ex.cargaEm && (
                        <span style={{ color: C.soft, marginLeft: 6 }}>{DIA_MES(ex.cargaEm)}</span>
                      )}
                    </button>
                  )}
                </div>
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

        {/* barra de progresso do treino: quanto já foi feito */}
        {marcavel && !editando && conta.total > 0 && (
          // minHeight reserva o espaço do botão "limpar": sem isso a lista pula ao marcar o primeiro
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, minHeight: 30 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.deep, overflow: "hidden" }}>
              <div
                style={{
                  width: `${(conta.feitos / conta.total) * 100}%`, height: "100%",
                  background: C.ink, borderRadius: 3, transition: "width 140ms ease-out",
                }}
              />
            </div>
            <span style={{ ...est.num, fontSize: 11, color: C.soft, flexShrink: 0 }}>
              {conta.feitos}/{conta.total} feitos{diaFeitos ? ` ${diaFeitos}` : ""}
            </span>
            {conta.feitos > 0 && (
              <button
                onClick={() => onFeitos?.([])}
                style={{ ...est.ghost, padding: "5px 9px", fontSize: 9 }}
              >
                limpar
              </button>
            )}
          </div>
        )}

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

        <p style={{ ...est.eyebrow, fontSize: 9, textAlign: "center", margin: "10px 0 0", lineHeight: 1.6 }}>
          {editando
            ? "o que você escrever aqui é salvo automaticamente"
            : [
                // marcar é auto-explicativo pela caixinha; a dica cobre o que não é óbvio
                onCarga ? "toque no peso para anotar a carga" : null,
                temAlgumaObs ? "segure um exercício com ⓘ para ver como executar" : null,
              ].filter(Boolean).join(" · ") || "toque em editar para alterar o treino"}
        </p>
      </div>

      {detalhe && (
        <div
          onClick={() => setDetalhe(null)}
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            role="dialog"
            aria-label={`Execução de ${detalhe.nome}`}
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
              <i style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, display: "inline-block", background: tipoDaArea(detalhe.area) ? cor(tipoDaArea(detalhe.area)!) : C.soft }} />
              <span style={{ ...est.eyebrow, fontSize: 10 }}>{rotuloArea(detalhe.area)}</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink, marginBottom: 10 }}>
              {detalhe.nome}
            </div>

            {detalhe.carga && (
              <div style={{ ...est.num, fontSize: 14, color: C.ink, marginBottom: 10 }}>
                Última carga: {detalhe.carga}
                {detalhe.cargaEm && <span style={{ color: C.soft }}> · {DIA_MES(detalhe.cargaEm)}</span>}
              </div>
            )}

            {detalhe.obs?.trim()
              ? <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: C.ink }}>{detalhe.obs}</p>
              : <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.soft }}>
                  Sem observação de execução. Você pode escrever uma em Treinos → Exercícios.
                </p>}

            <button
              onClick={() => setDetalhe(null)}
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
