/**
 * O treino é texto livre — é isso que o usuário escreve e edita. Este módulo
 * reúne a leitura desse texto (linhas, nomes, subgrupos) e as comparações de
 * nome usadas para casar uma linha do treino com o catálogo de exercícios.
 *
 * Fica fora dos componentes de propósito: antes `chaveNome` morava dentro do
 * modal de treino e quem montava o treino tinha de importar de lá.
 */

/** Chave de comparação de nomes de exercício, entre o texto do treino e o catálogo. */
export const chaveNome = (n: string) => n.trim().toLowerCase();

/** Uma linha é cabeçalho quando está toda em maiúsculas e não é item de lista. */
export const ehLinhaCabecalho = (linha: string) => {
  const t = linha.trim();
  return t.length >= 2 && !t.startsWith("-") && t === t.toUpperCase() && /\p{Lu}/u.test(t);
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

/**
 * Lê o subgrupo escrito no começo do nome — "[Superior] Supino inclinado" — e o
 * devolve separado. Só vale como subgrupo quando os colchetes e o resto do nome
 * têm conteúdo: "[Superior]" sozinho continua sendo o nome inteiro do exercício.
 */
export function partirSubgrupo(nome: string): { grupo: string | null; nome: string } {
  const m = nome.match(/^\s*\[([^\]]*)\]\s*(.*)$/);
  if (!m) return { grupo: null, nome };
  const grupo = m[1].trim();
  const resto = m[2].trim();
  if (!grupo || !resto) return { grupo: null, nome };
  return { grupo, nome: resto };
}

/**
 * Como `partirSubgrupo`, mas para quem está *escrevendo* o nome: aceita o
 * colchete ainda sem nome depois ("[Glúteo] "), que é o estado normal logo
 * depois de escolher o subgrupo e antes de digitar o exercício.
 */
export function partirSubgrupoEmEdicao(nome: string): { grupo: string | null; resto: string } {
  const m = nome.match(/^\s*\[([^\]]*)\]\s*(.*)$/);
  if (!m) return { grupo: null, resto: nome };
  const grupo = m[1].trim();
  return { grupo: grupo || null, resto: m[2] };
}

/**
 * Normaliza para busca e comparação: minúsculas e sem acento, preservando o mapa
 * de volta para o texto original (cada caractere normalizado sabe de que índice
 * veio), para conseguir destacar o trecho encontrado no nome com acentos.
 */
function normalizarComMapa(s: string): { txt: string; mapa: number[] } {
  let txt = "";
  const mapa: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i].normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    for (const ch of c) {
      txt += ch;
      mapa.push(i);
    }
  }
  return { txt, mapa };
}

export const normalizar = (s: string) => normalizarComMapa(s).txt;

/** Posição do termo dentro do nome original, ou null se não bater. */
export function acharTrecho(nome: string, termo: string): [number, number] | null {
  const alvo = normalizar(termo);
  if (!alvo) return null;
  const { txt, mapa } = normalizarComMapa(nome);
  const i = txt.indexOf(alvo);
  if (i === -1) return null;
  return [mapa[i], mapa[i + alvo.length - 1] + 1];
}

/**
 * Ordem alfabética como se espera em português: sem pesar maiúsculas nem
 * acentos, e lendo número como número ("Prancha 2" antes de "Prancha 10").
 */
export const emOrdem = (a: string, b: string) =>
  a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });

/**
 * Para cada linha, o subgrupo que precisa ser anunciado antes dela na
 * visualização — null quando a linha continua o subgrupo já anunciado, não é
 * item, ou não tem subgrupo. Um cabeçalho zera o estado: cada seção anuncia os
 * seus. Anuncia por sequência, não por agrupamento, para que a tela mostre o
 * treino na ordem em que ele está escrito.
 */
export function anunciosDeSubgrupo(linhas: string[]): (string | null)[] {
  let atual: string | null = null;
  return linhas.map((linha) => {
    const t = linha.trim();
    if (!t) return null; // linha em branco não encerra a sequência
    if (!t.startsWith("-")) {
      atual = null;
      return null;
    }
    const { grupo } = partirSubgrupo(partesDaLinha(t).nome);
    const chave = grupo && normalizar(grupo);
    if (chave === atual) return null;
    atual = chave || null;
    return grupo;
  });
}
