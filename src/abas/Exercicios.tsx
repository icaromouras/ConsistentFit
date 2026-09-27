import { useState } from "react";
import type { AreaEx, Cat, Exercicio, Tipo } from "../types";
import { FONTE } from "../temas";
import { useTema } from "../tema-ctx";
import { iso, uid } from "../dados";
import {
  acharTrecho, emOrdem, normalizar, partesDaLinha,
  partirSubgrupo, partirSubgrupoEmEdicao,
} from "../treino-texto";

const hojeIso = () => {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
};

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const diaMes = (chave: string) => {
  const [, m, d] = chave.split("-");
  return `${Number(d)}/${MES_CURTO[Number(m) - 1]}`;
};

export const AREAS: { id: AreaEx; rot: string }[] = [
  { id: "inferiores", rot: "Membros inferiores" },
  { id: "core", rot: "Core" },
  { id: "peito", rot: "Peito" },
  { id: "ombro", rot: "Ombro" },
  { id: "biceps", rot: "Bíceps" },
  { id: "triceps", rot: "Tríceps" },
  { id: "costas", rot: "Costas" },
  { id: "mobilidade", rot: "Mobilidade" },
];

/** Mobilidade não é força/core/aeróbico: usa tom neutro em vez da cor de um tipo. */
export const tipoDaArea = (a: AreaEx): "f" | "c" | null =>
  a === "mobilidade" ? null : a === "core" ? "c" : "f";

const ehCabecalho = (linha: string) =>
  AREAS.some((a) => linha.trim().toUpperCase() === a.rot.toUpperCase());

/** Subgrupo de uma linha de item do treino, normalizado; null se não tem. */
const subgrupoDaLinha = (linha: string) => {
  const { grupo } = partirSubgrupo(partesDaLinha(linha).nome);
  return grupo ? normalizar(grupo) : null;
};

/**
 * Insere um exercício no texto do treino agrupado pela área: cria o cabeçalho
 * (ex: "COSTAS") na primeira vez e, nas seguintes, entra na seção que já existe
 * — mesmo fora de ordem.
 *
 * Dentro da seção o exercício procura os seus: entra logo depois do último
 * irmão do mesmo subgrupo, para que a seção fique com a mesma forma do catálogo
 * (os sem subgrupo primeiro, depois um bloco por subgrupo) em vez de intercalar
 * [Glúteo] e [Quadríceps] na ordem dos toques.
 */
export function inserirNoTexto(texto: string, area: AreaEx, nome: string): string {
  const cabecalho = rotuloArea(area).toUpperCase();
  const item = `- ${nome} — `;
  const linhas = texto ? texto.split("\n") : [];

  const idx = linhas.findIndex((l) => l.trim().toUpperCase() === cabecalho);
  if (idx === -1) {
    const antes = texto.trim() ? texto.replace(/\n+$/, "") + "\n\n" : "";
    return `${antes}${cabecalho}\n${item}`;
  }

  // fim da seção: linha em branco ou próximo cabeçalho de área
  let fim = idx + 1;
  while (fim < linhas.length && linhas[fim].trim() !== "" && !ehCabecalho(linhas[fim])) fim++;

  const alvo = subgrupoDaLinha(item);
  let pos = -1;
  for (let i = idx + 1; i < fim; i++) {
    if (linhas[i].trim().startsWith("-") && subgrupoDaLinha(linhas[i]) === alvo) pos = i + 1;
  }
  // sem irmão: um subgrupo novo abre bloco no fim; sem subgrupo, fica na frente
  if (pos === -1) pos = alvo === null ? idx + 1 : fim;

  linhas.splice(pos, 0, item);
  return linhas.join("\n");
}

export const rotuloArea = (a: AreaEx) => AREAS.find((x) => x.id === a)!.rot;

/**
 * Categoria sugerida pelos cabeçalhos presentes no texto.
 * Mais de um grupo muscular ⇒ "combinado". Devolve null se não der para inferir.
 */
export function sugerirCategoria(texto: string): Cat | null {
  const areas = new Set<AreaEx>();
  let temAerobico = false;
  for (const linha of texto.split("\n")) {
    const t = linha.trim().toUpperCase();
    const area = AREAS.find((a) => a.rot.toUpperCase() === t);
    if (area) areas.add(area.id);
    else if (t === "AERÓBICO" || t === "AEROBICO") temAerobico = true;
  }
  if (areas.size + (temAerobico ? 1 : 0) > 1) return "combinado";
  if (areas.size === 1) return [...areas][0];
  if (temAerobico) return "aerobico";
  return null;
}

/**
 * Exercícios repartidos em: os sem subgrupo, que abrem a lista, e uma seção por
 * subgrupo. Tudo em ordem alfabética — as seções entre si e os exercícios dentro
 * de cada uma, pelo nome já sem o colchete. `nomeDe` existe para a tela que edita
 * um exercício poder congelar o nome enquanto se digita.
 */
export function repartirPorSubgrupo(itens: Exercicio[], nomeDe: (e: Exercicio) => string = (e) => e.nome) {
  const soltos: Exercicio[] = [];
  const grupos = new Map<string, { rot: string; itens: Exercicio[] }>();
  for (const e of itens) {
    const { grupo } = partirSubgrupo(nomeDe(e));
    if (!grupo) {
      soltos.push(e);
      continue;
    }
    // "[Medio]" e "[Médio]" são o mesmo subgrupo; vale a primeira grafia escrita
    const chave = normalizar(grupo);
    const achado = grupos.get(chave);
    if (achado) achado.itens.push(e);
    else grupos.set(chave, { rot: grupo, itens: [e] });
  }
  const porNome = (a: Exercicio, b: Exercicio) =>
    emOrdem(partirSubgrupo(nomeDe(a)).nome, partirSubgrupo(nomeDe(b)).nome);
  soltos.sort(porNome);
  const secoes = [...grupos].map(([chave, g]) => ({ chave, ...g })).sort((a, b) => emOrdem(a.rot, b.rot));
  secoes.forEach((s) => s.itens.sort(porNome));
  return { soltos, secoes };
}

/** Força/core/aeróbico presentes no texto, lidos dos cabeçalhos de área. */
export function tiposDoTexto(texto: string): Tipo[] {
  const achados = new Set<Tipo>();
  for (const linha of texto.split("\n")) {
    const t = linha.trim().toUpperCase();
    const area = AREAS.find((a) => a.rot.toUpperCase() === t);
    if (area) {
      const tp = tipoDaArea(area.id);
      if (tp) achados.add(tp);
    } else if (t === "AERÓBICO" || t === "AEROBICO") achados.add("a");
  }
  return (["f", "c", "a"] as Tipo[]).filter((t) => achados.has(t));
}

interface Props {
  exercicios: Exercicio[];
  addEx: (e: Exercicio) => void;
  upEx: (id: string, patch: Partial<Exercicio>) => void;
  delEx: (id: string) => void;
}

export default function Exercicios({ exercicios, addEx, upEx, delEx }: Props) {
  const { C, est, cor, tema } = useTema();
  const [editando, setEditando] = useState<string | null>(null);
  const [ancora, setAncora] = useState("");
  const [busca, setBusca] = useState("");
  const [subgrupoNovo, setSubgrupoNovo] = useState<string | null>(null); // texto do campo; null = fechado

  // agrupar e ordenar pelo nome de quando a edição começou: senão o card
  // saltaria de seção — e de posição dentro dela — a cada letra digitada
  const abrirEdicao = (e: Exercicio) => {
    setEditando(e.id);
    setAncora(e.nome);
    setSubgrupoNovo(null);
  };
  const fecharEdicao = () => {
    setEditando(null);
    setSubgrupoNovo(null);
  };
  const nomeEstavel = (e: Exercicio) => (e.id === editando ? ancora : e.nome);

  /**
   * Subgrupos que já existem na área, para oferecer como atalho. O próprio
   * exercício em edição fica de fora: senão cada letra digitada dentro de um
   * colchete viraria um subgrupo novo na lista, piscando embaixo do dedo.
   */
  const subgruposDaArea = (e: Exercicio) =>
    repartirPorSubgrupo(exercicios.filter((x) => x.area === e.area && x.id !== e.id)).secoes.map((s) => s.rot);

  /** Troca só o colchete do nome, preservando o que já foi digitado depois dele. */
  const trocarSubgrupo = (e: Exercicio, grupo: string | null) => {
    const { resto } = partirSubgrupoEmEdicao(e.nome);
    const nome = resto.replace(/^\s+/, "");
    // "gluteo" digitado à mão adota a grafia que a área já usa ("Glúteo"):
    // dois subgrupos iguais escritos diferente viram um só
    const canonico = grupo && (subgruposDaArea(e).find((g) => normalizar(g) === normalizar(grupo)) ?? grupo);
    upEx(e.id, { nome: canonico ? `[${canonico}] ${nome}` : nome });
    setSubgrupoNovo(null);
  };

  /** Um nome que é só o colchete ainda não nomeia exercício nenhum. */
  const semNome = (nome: string) => !partirSubgrupoEmEdicao(nome).resto.trim();

  const termo = busca.trim();
  const buscando = termo !== "";
  // durante a busca, o exercício em edição continua visível mesmo se o nome
  // deixar de bater — senão o card sumiria embaixo do dedo ao renomear
  const bate = (e: Exercicio) => !buscando || e.id === editando || acharTrecho(e.nome, termo) !== null;
  const achados = buscando ? exercicios.filter((e) => acharTrecho(e.nome, termo) !== null).length : 0;

  const novo = (area: AreaEx) => {
    const e: Exercicio = { id: uid(), area, nome: "" };
    addEx(e);
    abrirEdicao(e);
    setBusca("");
  };

  /** Nome com o trecho buscado em destaque. */
  const nomeRealcado = (nome: string, corArea: string) => {
    const t = buscando ? acharTrecho(nome, termo) : null;
    if (!t) return nome;
    return (
      <>
        {nome.slice(0, t[0])}
        <span style={{ background: corArea + "33", borderRadius: 3, padding: "1px 1px" }}>{nome.slice(t[0], t[1])}</span>
        {nome.slice(t[1])}
      </>
    );
  };

  /**
   * Linha de subgrupos no cartão de edição: os que a área já tem viram atalho,
   * para não ter de reescrever "[Glúteo]" à mão a cada exercício novo.
   */
  const seletorSubgrupo = (e: Exercicio, corArea: string) => {
    const atual = partirSubgrupoEmEdicao(e.nome).grupo;
    const existentes = subgruposDaArea(e);
    // o subgrupo recém-criado ainda não está na área: entra na lista assim mesmo
    const lista = atual && !existentes.some((g) => normalizar(g) === normalizar(atual))
      ? [...existentes, atual].sort(emOrdem)
      : existentes;

    const botao = (rot: string, ligado: boolean, aoTocar: () => void, chave: string) => (
      <button
        key={chave}
        aria-pressed={ligado}
        onClick={aoTocar}
        style={{
          padding: "5px 10px", borderRadius: Math.max(3, tema.raioP - 2),
          border: `1px solid ${ligado ? corArea : C.line}`,
          background: ligado ? corArea + "26" : "transparent",
          color: ligado ? C.ink : C.soft, fontWeight: ligado ? 600 : 400,
          fontFamily: FONTE.sans, fontSize: 12, cursor: "pointer",
        }}
      >
        {rot}
      </button>
    );

    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...est.eyebrow, fontSize: 9, marginBottom: 5 }}>Subgrupo</div>
        {subgrupoNovo === null ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {lista.map((g) =>
              botao(g, !!atual && normalizar(g) === normalizar(atual), () =>
                trocarSubgrupo(e, !!atual && normalizar(g) === normalizar(atual) ? null : g), g)
            )}
            {botao("+ novo", false, () => setSubgrupoNovo(""), "+novo")}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={subgrupoNovo}
              autoFocus
              onChange={(ev) => setSubgrupoNovo(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && subgrupoNovo.trim()) trocarSubgrupo(e, subgrupoNovo.trim());
                if (ev.key === "Escape") setSubgrupoNovo(null);
              }}
              placeholder="Novo subgrupo (ex: Glúteo)"
              aria-label="Nome do novo subgrupo"
              style={{ ...est.input, padding: "7px 10px", fontSize: 13 }}
            />
            <button
              style={{ ...est.ghost, padding: "7px 11px", color: C.ink, borderColor: C.ink, opacity: subgrupoNovo.trim() ? 1 : 0.45 }}
              disabled={!subgrupoNovo.trim()}
              onClick={() => trocarSubgrupo(e, subgrupoNovo.trim())}
            >
              ok
            </button>
            <button style={{ ...est.ghost, padding: "7px 10px" }} onClick={() => setSubgrupoNovo(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    );
  };

  /** O exercício na lista: cartão de edição quando aberto, botão quando não. */
  const renderItem = (e: Exercicio, corArea: string) =>
    editando === e.id ? (
      <div key={e.id} style={{ ...est.card, padding: 12, marginBottom: 6, borderLeft: `3px solid ${corArea}` }}>
        {seletorSubgrupo(e, corArea)}
        <input
          value={partirSubgrupoEmEdicao(e.nome).resto}
          autoFocus
          onChange={(ev) => {
            // o colchete é do seletor acima; aqui digita-se só o nome. Digitar
            // "[Novo] " à mão continua valendo: vira subgrupo e sobe para lá.
            const grupo = partirSubgrupoEmEdicao(e.nome).grupo;
            const valor = ev.target.value.replace(/^\s+/, "");
            upEx(e.id, { nome: grupo ? `[${grupo}] ${valor}` : valor });
          }}
          placeholder="Nome do exercício (ex: agachamento livre)"
          style={{ ...est.input, marginBottom: 8, fontWeight: 600 }}
        />
        <input
          value={e.obs || ""}
          onChange={(ev) => upEx(e.id, { obs: ev.target.value })}
          placeholder="Observação de execução (opcional)"
          style={{ ...est.input, marginBottom: 8, fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            value={e.carga || ""}
            onChange={(ev) => {
              const carga = ev.target.value;
              // a data acompanha a carga: sem carga, não há "última vez"
              upEx(e.id, { carga, cargaEm: carga.trim() ? hojeIso() : undefined });
            }}
            placeholder="Peso / carga (ex: 20 kg, placa 5)"
            aria-label="Peso ou carga do exercício"
            style={{ ...est.input, fontSize: 13 }}
          />
          {(e.carga || "").trim() && e.cargaEm && (
            <span style={{ ...est.num, fontSize: 10, color: C.soft, flexShrink: 0 }}>{diaMes(e.cargaEm)}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ flex: 1, padding: "9px", borderRadius: tema.raioP - 1, border: "none", background: C.ink, color: C.onDark, fontFamily: FONTE.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
            onClick={() => {
              // sem nome não serve para nada — nem quando só o subgrupo foi
              // escolhido: descarta em vez de guardar um "[Glúteo]" solto
              if (semNome(e.nome)) delEx(e.id);
              fecharEdicao();
            }}
          >
            Pronto
          </button>
          <button
            style={{ ...est.ghost, color: C.aero, borderColor: C.aero }}
            onClick={() => {
              if (semNome(e.nome) || confirm(`Excluir "${partirSubgrupo(e.nome).nome}"?`)) {
                delEx(e.id);
                fecharEdicao();
              }
            }}
          >
            excluir
          </button>
        </div>
      </div>
    ) : (
      <button
        key={e.id}
        onClick={() => abrirEdicao(e)}
        style={{
          display: "block", width: "100%", textAlign: "left", marginBottom: 5,
          background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid ${corArea}`,
          borderRadius: tema.raioP - 1, padding: "9px 12px", cursor: "pointer",
          fontFamily: FONTE.sans, fontSize: 14, color: C.ink,
        }}
      >
        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          {/* o subgrupo já é o título da seção: o nome aparece sem o colchete */}
          <span style={{ fontWeight: 600, flex: 1 }}>{nomeRealcado(partirSubgrupo(e.nome).nome, corArea)}</span>
          {(e.carga || "").trim() && (
            <span style={{ ...est.num, fontSize: 11, color: C.ink, flexShrink: 0, border: `1px solid ${C.line}`, borderRadius: 4, padding: "2px 6px" }}>
              {e.carga}
            </span>
          )}
        </span>
        {(e.obs || "").trim() && (
          <span style={{ display: "block", color: C.soft, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {e.obs}
          </span>
        )}
      </button>
    );

  return (
    <>
      <p style={{ ...est.eyebrow, marginBottom: 16 }}>
        Nome, observação de execução e a carga da última vez — use-os para montar o treino do dia
      </p>

      {exercicios.length > 0 && (
        <div style={{ position: "relative", marginBottom: buscando ? 10 : 18 }}>
          <input
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Escape" && setBusca("")}
            placeholder="Buscar exercício pelo nome…"
            aria-label="Buscar exercício pelo nome"
            style={{ ...est.input, paddingLeft: 34, paddingRight: buscando ? 40 : 12 }}
          />
          <span aria-hidden style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.soft, fontSize: 17, lineHeight: 1, pointerEvents: "none" }}>
            ⌕
          </span>
          {buscando && (
            <button
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: C.soft, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "6px 8px" }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {buscando && achados > 0 && (
        <p style={{ ...est.eyebrow, fontSize: 10, marginTop: 0, marginBottom: 14 }}>
          {achados} {achados === 1 ? "resultado" : "resultados"}
        </p>
      )}

      {buscando && achados === 0 && (
        <div style={{ ...est.card, padding: 14, marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Nenhum exercício com <strong style={{ color: C.ink }}>{termo}</strong> no nome.
          </p>
        </div>
      )}

      {exercicios.length === 0 && (
        <div style={{ ...est.card, padding: 14, marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Nenhum exercício ainda. Toque em <strong style={{ color: C.ink }}>+ novo</strong> numa área para cadastrar —
            depois eles viram botões de um toque ao montar o treino no calendário.
          </p>
        </div>
      )}

      {AREAS.map((area) => {
        const itens = exercicios.filter((e) => e.area === area.id && bate(e));
        // buscando, uma área sem resultado sai da tela em vez de virar cabeçalho vazio
        if (buscando && itens.length === 0) return null;
        const t = tipoDaArea(area.id);
        const corArea = t ? cor(t) : C.soft;
        const { soltos, secoes } = repartirPorSubgrupo(itens, nomeEstavel);
        return (
          <div key={area.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: corArea, display: "inline-block" }} />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{area.rot}</span>
                {itens.length > 0 && <span style={{ ...est.num, fontSize: 11, color: C.soft }}>{itens.length}</span>}
              </span>
              {!buscando && (
                <button
                  style={{ ...est.ghost, padding: "4px 10px", fontSize: 10 }}
                  aria-label={`Novo exercício em ${area.rot}`}
                  onClick={() => novo(area.id)}
                >
                  + novo
                </button>
              )}
            </div>

            {soltos.map((e) => renderItem(e, corArea))}

            {secoes.map((s) => (
              <div key={s.chave} style={{ marginTop: 10 }}>
                <div style={{ ...est.eyebrow, fontSize: 10, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6, margin: "0 0 5px 2px" }}>
                  {s.rot}
                  <span style={{ ...est.num, fontSize: 10, opacity: 0.75 }}>{s.itens.length}</span>
                </div>
                {s.itens.map((e) => renderItem(e, corArea))}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
