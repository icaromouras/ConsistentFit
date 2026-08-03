import { useMemo } from "react";
import type { Dados, Tipo } from "../types";
import { useTema } from "../tema-ctx";
import { MESES } from "../temas";
import { iso } from "../dados";

interface Props {
  dados: Dados;
  y: number;
  m: number;
}

interface Contagem {
  f: number;
  c: number;
  a: number;
  dias: number;
}

const vazia = (): Contagem => ({ f: 0, c: 0, a: 0, dias: 0 });

function contar(dados: Dados, y: number, m: number): Contagem {
  const t = vazia();
  const qtd = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= qtd; d++) {
    const v = dados.dias[iso(y, m, d)];
    if (!v) continue;
    if (v.f) t.f++;
    if (v.c) t.c++;
    if (v.a) t.a++;
    if (v.f || v.c || v.a) t.dias++;
  }
  return t;
}

export default function ResumoMes({ dados, y, m }: Props) {
  const { C, est, tipos } = useTema();

  const { atual, anterior, semanas, sequencia, diasNoMes } = useMemo(() => {
    const atual = contar(dados, y, m);
    const antDate = new Date(y, m - 1, 1);
    const anterior = contar(dados, antDate.getFullYear(), antDate.getMonth());
    const diasNoMes = new Date(y, m + 1, 0).getDate();

    // agrupa por semana do mês (linhas do calendário)
    const primeiroDiaSem = new Date(y, m, 1).getDay();
    const totalSemanas = Math.ceil((primeiroDiaSem + diasNoMes) / 7);
    const semanas = Array.from({ length: totalSemanas }, () => ({ treinados: 0, total: 0 }));
    let maior = 0;
    let atualSeq = 0;
    for (let d = 1; d <= diasNoMes; d++) {
      const i = Math.floor((primeiroDiaSem + d - 1) / 7);
      const v = dados.dias[iso(y, m, d)];
      const treinou = !!(v && (v.f || v.c || v.a));
      semanas[i].total++;
      if (treinou) {
        semanas[i].treinados++;
        atualSeq++;
        maior = Math.max(maior, atualSeq);
      } else {
        atualSeq = 0;
      }
    }
    return { atual, anterior, semanas, sequencia: maior, diasNoMes };
  }, [dados, y, m]);

  const delta = atual.dias - anterior.dias;
  const pct = Math.round((atual.dias / diasNoMes) * 100);
  const escalaSem = Math.max(1, ...semanas.map((s) => s.total));

  return (
    <div style={{ ...est.card, marginTop: 18 }}>
      <div style={{ ...est.eyebrow, marginBottom: 12 }}>Resumo de {MESES[m].toLowerCase()}</div>

      {/* flexWrap: em telas estreitas a comparação desce para a linha de baixo em vez de colidir */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <span style={{ ...est.num, fontSize: 34, lineHeight: 1 }}>{atual.dias}</span>
          <span style={{ ...est.eyebrow, marginLeft: 8, whiteSpace: "nowrap" }}>de {diasNoMes} dias</span>
          <div style={{ ...est.eyebrow, fontSize: 10, marginTop: 4 }}>{pct}% do mês</div>
        </div>
        <div style={{ textAlign: "right", flexGrow: 1 }}>
          <div style={{ ...est.num, fontSize: 13, color: delta === 0 ? C.soft : delta > 0 ? C.forca : C.aero }}>
            {delta === 0 ? "igual ao mês anterior" : `${delta > 0 ? "+" : ""}${delta} vs mês anterior`}
          </div>
          {sequencia > 1 && (
            <div style={{ ...est.eyebrow, fontSize: 10, marginTop: 4 }}>
              melhor sequência: {sequencia} dias
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 6 }}>
        {semanas.map((s, i) => (
          <div key={i} style={{ flex: s.total / escalaSem, minWidth: 0 }}>
            <div
              style={{
                height: 52,
                background: C.deep,
                borderRadius: 5,
                display: "flex",
                alignItems: "flex-end",
                overflow: "hidden",
              }}
              title={`Semana ${i + 1}: ${s.treinados} de ${s.total} dias`}
            >
              <div
                style={{
                  width: "100%",
                  height: `${(s.treinados / s.total) * 100}%`,
                  background: C.ink,
                  borderRadius: 5,
                }}
              />
            </div>
            <div style={{ ...est.num, fontSize: 11, textAlign: "center", marginTop: 5 }}>
              {s.treinados}
              <span style={{ color: C.soft }}>/{s.total}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...est.eyebrow, fontSize: 9, textAlign: "center", marginBottom: 16 }}>
        dias treinados por semana
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {tipos.map((t) => (
          <div key={t.id} style={{ flex: 1, borderTop: `3px solid ${t.cor}`, paddingTop: 8 }}>
            <div style={{ ...est.num, fontSize: 20 }}>{atual[t.id as Tipo]}</div>
            <div style={{ ...est.eyebrow, fontSize: 9, marginTop: 2 }}>{t.rot}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
