import { useRef, useState } from "react";
import type { Dados } from "../types";
import { C, FONTE, est } from "../theme";
import { baixarBackup, lerBackup } from "../dados";

interface Props {
  dados: Dados;
  importar: (d: Dados) => void;
  apagarTudo: () => void;
}

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

const plural = (n: number, sing: string, plur: string) => `${n} ${n === 1 ? sing : plur}`;

export default function Ajustes({ dados, importar, apagarTudo }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const totalDias = Object.keys(dados.dias).length;
  const totalAgs = dados.agendamentos.length;
  const totalSalvos = dados.salvos.length;

  const aoExportar = () => {
    try {
      baixarBackup(dados);
      setAviso({ tipo: "ok", texto: "Backup gerado. Guarde o arquivo fora do celular (e-mail, Drive, iCloud)." });
    } catch {
      setAviso({ tipo: "erro", texto: "Não foi possível gerar o arquivo de backup." });
    }
  };

  const aoImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;

    let texto: string;
    try {
      texto = await arquivo.text();
    } catch {
      setAviso({ tipo: "erro", texto: "Não foi possível ler o arquivo." });
      return;
    }

    const r = lerBackup(texto);
    if (!r) {
      setAviso({ tipo: "erro", texto: "Arquivo inválido — escolha um backup exportado pelo ConsistentFit." });
      return;
    }

    const novo = `${plural(r.resumo.dias, "dia treinado", "dias treinados")}, ${plural(r.resumo.agendamentos, "agendamento", "agendamentos")} e ${plural(r.resumo.salvos, "treino salvo", "treinos salvos")}`;
    const atual = `${plural(totalDias, "dia", "dias")}, ${plural(totalAgs, "agendamento", "agendamentos")} e ${plural(totalSalvos, "treino salvo", "treinos salvos")}`;
    if (!confirm(`Importar ${novo}?\n\nIsso substitui tudo o que está no app agora (${atual}) e não dá para desfazer.`)) return;

    importar(r.dados);
    setAviso({
      tipo: "ok",
      texto: `Backup importado: ${novo}.${r.descartados > 0 ? ` ${plural(r.descartados, "registro inválido foi ignorado", "registros inválidos foram ignorados")}.` : ""}`,
    });
  };

  const botao = (primario: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "13px",
    borderRadius: 10,
    border: primario ? "none" : `1px solid ${C.line}`,
    background: primario ? C.ink : "transparent",
    color: primario ? C.onDark : C.ink,
    fontFamily: FONTE.mono,
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
  });

  return (
    <>
      <div style={{ ...est.eyebrow, marginBottom: 8 }}>Backup</div>
      <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.5, color: C.soft }}>
        Seus treinos ficam salvos só neste navegador. Exporte um arquivo de vez em quando para não perder nada se
        trocar de aparelho ou limpar os dados do navegador.
      </p>

      <div style={{ ...est.card, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            ["Dias", totalDias],
            ["Agendados", totalAgs],
            ["Salvos", totalSalvos],
          ].map(([rot, n]) => (
            <div key={rot as string} style={{ flex: 1 }}>
              <div style={{ ...est.num, fontSize: 20 }}>{n}</div>
              <div style={{ ...est.eyebrow, fontSize: 9, marginTop: 2 }}>{rot}</div>
            </div>
          ))}
        </div>

        <button style={{ ...botao(true), marginBottom: 8 }} onClick={aoExportar}>
          Exportar backup
        </button>
        <button style={botao(false)} onClick={() => inputRef.current?.click()}>
          Importar backup
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={aoImportar}
          style={{ display: "none" }}
        />
      </div>

      {aviso && (
        <div
          role="status"
          style={{
            ...est.card,
            padding: 12,
            marginBottom: 14,
            borderLeft: `3px solid ${aviso.tipo === "ok" ? C.forca : C.aero}`,
            fontSize: 13,
            lineHeight: 1.5,
            color: C.ink,
          }}
        >
          {aviso.texto}
        </div>
      )}

      <p style={{ ...est.eyebrow, fontSize: 10, lineHeight: 1.6, color: C.soft, marginBottom: 30 }}>
        No celular, o arquivo vai para os downloads ou para a folha de compartilhamento — de lá dá para salvar no
        Drive, iCloud ou mandar por e-mail.
      </p>

      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
        <button
          onClick={() => {
            if (confirm("Apagar TODOS os dados do app (treinos, agendamentos, biblioteca e metas)?")) {
              apagarTudo();
              setAviso({ tipo: "ok", texto: "Tudo apagado. O app voltou ao estado inicial." });
            }
          }}
          style={{ ...est.ghost, width: "100%", padding: "11px", color: C.aero, borderColor: C.aero }}
        >
          Apagar tudo
        </button>
      </div>
    </>
  );
}
