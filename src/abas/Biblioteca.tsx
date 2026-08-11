import { useState } from "react";
import type { Cat, Tipo, TreinoSalvo } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { uid } from "../dados";
import ModalTreino from "./ModalTreino";

const GRUPOS: { rot: string; tipo: Tipo | null; cats: { id: Cat; rot: string }[] }[] = [
  {
    rot: "Força", tipo: "f",
    cats: [
      { id: "peito", rot: "Peito" },
      { id: "costas", rot: "Costas" },
      { id: "ombro", rot: "Ombro" },
      { id: "biceps", rot: "Bíceps" },
      { id: "triceps", rot: "Tríceps" },
      { id: "inferiores", rot: "Membros inferiores" },
    ],
  },
  { rot: "Core", tipo: "c", cats: [{ id: "core", rot: "Core" }] },
  { rot: "Aeróbico", tipo: "a", cats: [{ id: "aerobico", rot: "Aeróbico" }] },
  { rot: "Mobilidade", tipo: null, cats: [{ id: "mobilidade", rot: "Mobilidade" }] },
];

interface Props {
  salvos: TreinoSalvo[];
  addSalvo: (t: TreinoSalvo) => void;
  upSalvo: (id: string, patch: Partial<TreinoSalvo>) => void;
  delSalvo: (id: string) => void;
}

export default function Biblioteca({ salvos, addSalvo, upSalvo, delSalvo }: Props) {
  const { C, est, cor } = useTema();
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const salvoAberto = aberto ? salvos.find((s) => s.id === aberto) : undefined;
  const grupoDe = (cat: Cat) => GRUPOS.find((g) => g.cats.some((c) => c.id === cat))!;
  const rotuloCat = (cat: Cat) => grupoDe(cat).cats.find((c) => c.id === cat)!.rot;

  const novo = (cat: Cat) => {
    const t: TreinoSalvo = { id: uid(), cat, nome: "Novo treino", texto: "" };
    addSalvo(t);
    setEditando(t.id);
  };

  return (
    <>
      <p style={{ ...est.eyebrow, marginBottom: 16 }}>
        Treinos padrão — edite uma vez, use quando quiser ao agendar
      </p>

      {GRUPOS.map((g) => {
        const gcor = g.tipo ? cor(g.tipo) : C.soft;
        return (
        <div key={g.rot} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <i style={{ width: 12, height: 12, borderRadius: 3, background: gcor, display: "inline-block" }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{g.rot}</span>
          </div>

          {g.cats.map((cat) => {
            const itens = salvos.filter((s) => s.cat === cat.id);
            return (
              <div key={cat.id} style={{ marginBottom: 10, paddingLeft: g.cats.length > 1 ? 20 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  {g.cats.length > 1
                    ? <span style={{ ...est.eyebrow, fontSize: 10 }}>{cat.rot}</span>
                    : <span />}
                  <button style={{ ...est.ghost, padding: "4px 10px", fontSize: 10 }} onClick={() => novo(cat.id)}>
                    + novo
                  </button>
                </div>

                {itens.length === 0 && (
                  <div style={{ ...est.eyebrow, fontSize: 10, color: C.line, padding: "2px 0 6px" }}>nenhum treino salvo</div>
                )}

                {itens.map((s) =>
                  editando === s.id ? (
                    <div key={s.id} style={{ ...est.card, padding: 12, marginBottom: 8, borderLeft: `3px solid ${gcor}` }}>
                      <input
                        value={s.nome}
                        onChange={(e) => upSalvo(s.id, { nome: e.target.value })}
                        placeholder="Nome do treino"
                        style={{ ...est.input, marginBottom: 8, fontWeight: 600 }}
                      />
                      <textarea
                        value={s.texto}
                        onChange={(e) => upSalvo(s.id, { texto: e.target.value })}
                        placeholder={"Exercícios, séries e repetições\n(ex: rosca direta 4x10, martelo 3x12)"}
                        style={{ ...est.area, minHeight: 90, background: C.paper, fontSize: 14 }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: C.ink, color: C.onDark, fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                          onClick={() => setEditando(null)}
                        >
                          Pronto
                        </button>
                        <button
                          style={{ ...est.ghost, color: C.ink, borderColor: C.ink }}
                          onClick={() => setAberto(s.id)}
                        >
                          abrir
                        </button>
                        <button
                          style={{ ...est.ghost, color: C.aero, borderColor: C.aero }}
                          onClick={() => { if (confirm(`Excluir "${s.nome}"?`)) { delSalvo(s.id); setEditando(null); } }}
                        >
                          excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={s.id}
                      onClick={() => setEditando(s.id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                        background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid ${gcor}`,
                        borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                        fontFamily: FONTE.sans, fontSize: 14, color: C.ink,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{s.nome}</span>
                      {(s.texto || "").trim() && (
                        <span style={{ display: "block", color: C.soft, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.texto.split("\n")[0]}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
        );
      })}

      {salvoAberto && (
        <ModalTreino
          titulo={salvoAberto.nome}
          subtitulo={
            <span style={{ ...est.eyebrow, fontSize: 10, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: grupoDe(salvoAberto.cat).tipo ? cor(grupoDe(salvoAberto.cat).tipo!) : C.soft, display: "inline-block" }} />
              {grupoDe(salvoAberto.cat).rot}
              {rotuloCat(salvoAberto.cat) !== grupoDe(salvoAberto.cat).rot && ` · ${rotuloCat(salvoAberto.cat)}`}
            </span>
          }
          texto={salvoAberto.texto}
          onChange={(t) => upSalvo(salvoAberto.id, { texto: t })}
          onFechar={() => setAberto(null)}
        />
      )}
    </>
  );
}
