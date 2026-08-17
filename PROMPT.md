# Prompt de especificação — ConsistentFit

> Este arquivo é o prompt completo para reconstruir o app do zero. Copie tudo
> abaixo da linha e entregue a uma IA de programação (ou a um desenvolvedor).

---

Construa um aplicativo web de acompanhamento de treinos chamado **ConsistentFit**,
em português do Brasil. A ideia central é **consistência antes de intensidade**:
o app deve tornar fácil ver, num relance, se a pessoa está treinando com
regularidade — não medir performance.

## 1. Stack e restrições

- **Vite + React + TypeScript**. Sem bibliotecas de UI, sem CSS framework, sem
  gerenciador de estado externo: só React com `useState`/`useMemo`/`useCallback`
  e estilos inline. Sem dependências além de `react` e `react-dom`.
- **Sem backend, sem login, sem nuvem.** Todos os dados vivem em um único objeto
  JSON no `localStorage`, sob a chave `consistentfit-v1`.
- **Mobile-first.** O alvo é um celular adicionado à tela de início. Deve
  funcionar sem rolagem horizontal a partir de **320px** de largura. Largura
  máxima de conteúdo: 620px, centralizado.
- Publicável como site estático (GitHub Pages). Use `base: './'` no
  `vite.config.ts` para os caminhos funcionarem em subdiretório.
- Idioma: todo o texto de interface em português do Brasil. Nomes de variáveis e
  arquivos também em português (`dias`, `salvos`, `exercicios`, `temas.ts`).

## 2. Modelo de dados

Um único objeto persistido. Este é o contrato — respeite os nomes dos campos:

```ts
type Tipo = "f" | "c" | "a";        // força, core, aeróbico
type Repet = "nunca" | "semanal" | "quinzenal" | "mensal";
type TemaId = "papel" | "carbono" | "nevoa" | "fita";

type Cat =
  | "peito" | "costas" | "ombro" | "biceps" | "triceps" | "inferiores"
  | "core" | "aerobico" | "mobilidade" | "combinado";

/** Áreas do catálogo: categorias menos as que não descrevem um exercício. */
type AreaEx = Exclude<Cat, "aerobico" | "combinado">;

interface DiaInfo  { f?: boolean; c?: boolean; a?: boolean; nota?: string }
interface Agendamento {
  id: string;
  texto: string;
  tipos: Tipo[];
  inicio: string;        // "AAAA-MM-DD"
  repet: Repet;
  diasSemana: number[];  // 0=domingo … 6=sábado (usado em semanal/quinzenal)
}
interface TreinoSalvo { id: string; cat: Cat; nome: string; texto: string }
interface Exercicio   { id: string; area: AreaEx; nome: string; obs?: string }

interface Dados {
  dias: Record<string, DiaInfo>;   // chave "AAAA-MM-DD"
  agendamentos: Agendamento[];
  salvos: TreinoSalvo[];
  exercicios: Exercicio[];
  metaAno: number;                 // 0 = sem meta
  anotacoes: string;
  tema: TemaId;
  cores: Partial<Record<Tipo, string>>;  // sobrescreve a cor padrão do tema
}
```

**Persistência:** salve com _debounce_ de 350ms após qualquer mudança. **Além
disso**, grave imediatamente nos eventos `pagehide` e `visibilitychange`
(quando ficar oculto) — senão, fechar o app logo após marcar um treino perde o
dado. Use um `ref` para o handler enxergar o estado atual sem se re-registrar.

**Carregamento tolerante:** ao ler o `localStorage`, mescle sobre um objeto
vazio padrão e sanitize: tema inválido volta ao padrão, `cores` não-objeto vira
`{}`, `exercicios` não-array vira `[]`. Dados corrompidos ou storage
indisponível ⇒ começa vazio, sem quebrar.

**Um dia sem nada é apagado:** se ao desmarcar sobrar um dia sem nenhum tipo e
sem nota, remova a chave de `dias` em vez de guardar um objeto vazio.

## 3. Navegação

Barra de 5 abas no topo, sempre visível: **Mês · Ano · Treinos · Tema · Dados**.

Cabeçalho acima da barra: o wordmark `Consistent` + `Fit` (o "Fit" na cor do
tipo aeróbico), a linha `constância antes de intensidade`, e à direita o ano
corrente — que vira o aviso `não salvou` se a gravação falhar.

Em telas ≤420px, reduza a fonte das abas via CSS com `!important` (os estilos
inline do botão têm precedência sobre a classe).

## 4. Aba Mês — a tela principal

### Calendário
Grade de 7 colunas, células quadradas (`aspect-ratio: 1`), com navegação
‹ mês ›. Cada célula mostra o número do dia e comunica **três coisas ao mesmo
tempo**:

- **Tipos treinados** — o fundo recebe as cores dos tipos marcados. Com dois
  tipos, divida a célula em duas faixas diagonais a 135°; com três, em três
  faixas. Texto sobre cor recebe `text-shadow` para legibilidade.
- **Treino agendado** — se há agendamento naquele dia (inclusive por
  recorrência), o fundo fica num tom de destaque e um pequeno triângulo aparece
  no canto superior direito.
- **Nota escrita** — um ponto discreto no rodapé da célula.

O dia de hoje tem borda tracejada; o dia selecionado, borda grossa. Abaixo da
grade, uma legenda com as quatro convenções (agendado + os três tipos).

Se não houver nenhum dia marcado nem agendamento, mostre uma dica curta
ensinando a tocar num dia. Ao tocar num dia, abre o **painel do dia** logo
abaixo — que deve **rolar sozinho para dentro da tela** (`scrollIntoView`), pois
em telas baixas o usuário não percebe que abriu.

### Painel do dia
1. Cabeçalho com a data por extenso e o dia da semana.
2. Rótulo `marcar o que você treinou` + três botões-chip (Força, Core,
   Aeróbico) que alternam o que foi feito naquele dia. Chip ativo = preenchido
   com a cor do tipo.
3. Campo de nota livre de uma linha.
4. **Treinos agendados** do dia (ver §5).
5. Botão `+ agendar treino`, que abre o formulário de agendamento (§5).

### Resumo do mês
Card abaixo do painel, com:
- Número grande de **dias treinados no mês** sobre o total de dias do mês, e a
  porcentagem.
- **Comparação com o mês anterior** (`+3 vs mês anterior` / `igual ao mês
  anterior`), em cor positiva ou de alerta.
- **Melhor sequência** de dias consecutivos no mês (só aparece se ≥ 2).
- **Barras por semana** do mês (as linhas do calendário): coluna por semana,
  altura proporcional a dias treinados ÷ dias daquela semana, rótulo `4/7`.
  A largura de cada coluna acompanha quantos dias aquela semana tem.
- Contadores por tipo, cada um com uma faixa da cor do tipo no topo.

Em telas estreitas, o cabeçalho do resumo deve quebrar (`flexWrap`) em vez de
colidir.

Por fim, uma linha compacta com o **acumulado do ano**.

## 5. Agendamento de treinos

### Formulário (`+ agendar treino`)
Na ordem:

1. **`Usar treino salvo…`** — `<select>` com os treinos da biblioteca, rotulados
   `Categoria — Nome`. Ao escolher, preenche o texto e marca o tipo
   correspondente à categoria. Só aparece se houver treinos salvos.
2. **Caixa de texto** do treino (multi-linha).
3. **`+ montar com exercícios`** — abre uma sanfona com as áreas que têm
   exercícios cadastrados; cada área expande em botões, um por exercício.
   Tocar num exercício:
   - **insere no texto agrupado pela área** (ver o algoritmo abaixo);
   - marca automaticamente o tipo (área `core` ⇒ Core; `mobilidade` ⇒ nenhum;
     demais ⇒ Força);
   - mostra a observação de execução como `title` do botão.
   Se não há exercícios cadastrados, explique onde cadastrá-los.
4. **`+ salvar como treino`** — só aparece quando há texto. Abre nome +
   categoria e grava na biblioteca (§7). A categoria vem pré-sugerida.
5. Chips dos três **tipos** do treino.
6. **Repetir**: Não repete / Semanal / Quinzenal / Mensal. Em semanal e
   quinzenal, aparece um seletor de dias da semana (D S T Q Q S S), iniciado
   no dia da data escolhida.
7. Botões **Agendar** e **cancelar**. Cancelar limpa tudo, inclusive painéis
   abertos.

#### Algoritmo de inserção agrupada (importante)
Ao tocar num exercício, **não** acrescente no fim do texto. Em vez disso:
- Se ainda não existe uma linha com o nome da área em MAIÚSCULAS, crie a seção:
  duas quebras de linha, `NOME DA ÁREA`, e a linha `- Nome do exercício — `.
- Se a seção já existe, insira a nova linha **no fim daquela seção** — o fim é
  a primeira linha em branco ou o próximo cabeçalho de área.

Assim, montar tocando Costas → Bíceps → Costas produz um texto organizado:

```
COSTAS
- Remada curvada — 
- Puxada alta — 

BÍCEPS
- Rosca direta — 
```

O traço `—` no fim é onde o usuário completa séries e repetições. **Tudo continua
sendo texto puro** — nada de estrutura rígida: edição manual e backup seguem
simples.

#### Regras de recorrência
Dado um agendamento e uma data, ele aparece naquele dia se:
- `nunca` — a data é exatamente `inicio`;
- `mensal` — o dia do mês é igual ao de `inicio` (e a data ≥ `inicio`);
- `semanal` — o dia da semana está em `diasSemana`;
- `quinzenal` — idem, **e** o número de semanas entre o início da semana da data
  e o da semana de `inicio` é par.

Nunca mostre ocorrências antes de `inicio`.

### Card do treino agendado
Cada agendamento aparece num card destacado com:
- Linha de contexto: a recorrência por extenso (`semanal · seg, qua`) e os tipos
  com seus pontos coloridos.
- Botões **abrir**, **salvar**, **excluir**. Excluir pede confirmação, avisando
  quando vai remover todas as repetições.
- **Prévia formatada** do treino (não uma caixa de edição): cabeçalhos de área
  em maiúsculas, exercícios como linhas com as séries alinhadas à direita em
  fonte monoespaçada. Limite a 6 linhas e mostre `+N linhas — toque para ver
  tudo`. Tocar na prévia abre a tela cheia.
- **salvar** abre nome + categoria (pré-sugerida) e grava na biblioteca. Com
  vários agendamentos no mesmo dia, só um painel fica aberto por vez, e a
  mensagem de confirmação deve carregar o id do agendamento para aparecer sob
  o card certo.

#### Sugestão de categoria ao salvar
Conte os cabeçalhos de área distintos no texto: **dois ou mais ⇒ `combinado`**;
exatamente um ⇒ aquela área. Sem cabeçalho, se o único tipo marcado for
aeróbico use `aerobico`; senão `peito`. A mesma função serve o agendamento e o
compositor da biblioteca.

## 6. Tela cheia do treino (o "abrir")

Modal que ocupa a tela inteira, respeitando os recortes do aparelho
(`env(safe-area-inset-*)`), com a rolagem do fundo travada enquanto aberto.

Cabeçalho: título (data ou nome do treino), subtítulo de contexto, e os botões
`editar`/`ver` e `Fechar`.

**Dois modos:**

- **Visualização** (padrão quando há texto): interpreta o texto e o formata.
  - Linha que corresponde ao nome de uma área ⇒ **título de seção**, com o
    quadrado colorido da área e uma régua horizontal.
  - Qualquer outra linha **toda em maiúsculas** (2–40 caracteres, sem começar
    com `-`) ⇒ também vira título — assim o usuário cria seções próprias como
    `OBSERVAÇÕES`.
  - Linha começando com `-` ⇒ item: nome à esquerda, o que vier depois do `—`
    à direita em fonte monoespaçada (as séries).
  - Demais linhas ⇒ parágrafo simples.
- **Edição**: a caixa de texto crua, com fonte de **16px** (abaixo disso o iOS
  dá zoom automático ao focar). Salva automaticamente. Um treino vazio abre
  direto neste modo.

**Segurar para ver a execução:** se o nome de um item bate (ignorando
maiúsculas) com um exercício do catálogo **que tenha observação preenchida**,
mostre um marcador `ⓘ` ao lado do nome. Pressionar e segurar por ~450ms abre
uma folha inferior com área, nome e a explicação. Detalhes que fazem o gesto
funcionar no celular:

- arrastar mais de ~12px cancela (é rolagem, não um "segurar");
- toque rápido não faz nada;
- suprima seleção de texto e menu de contexto nessas linhas
  (`user-select: none`, `-webkit-touch-callout: none`, `onContextMenu` cancelado)
  — senão o navegador dispara a própria interface de seleção;
- vibre brevemente onde houver suporte (`navigator.vibrate`);
- `Escape` fecha **primeiro** a folha, depois o modal. O handler de teclado deve
  ler o estado por `ref`, senão dispara `setState` durante a renderização de
  outro componente.

O vínculo é **por nome**, não por id: assim uma linha digitada à mão também
ganha a explicação, e editar a observação no catálogo atualiza todos os treinos
(não fica cópia congelada).

## 7. Aba Treinos — duas sub-abas

Um seletor no topo alterna entre **Treinos** e **Exercícios** (uma 6ª aba
principal não caberia em 320px).

### Sub-aba Treinos (biblioteca)
Treinos completos salvos, agrupados por:
- **Força** — com subcategorias Peito, Costas, Ombro, Bíceps, Tríceps, Membros
  inferiores;
- **Core**, **Aeróbico**, **Mobilidade** — cada um com uma categoria só;
- **Combinado** — treinos que juntam mais de um grupo muscular (ex: bíceps +
  tríceps + core + mobilidade num treino só).

Cada grupo tem um quadrado colorido: a cor do tipo correspondente; **Mobilidade
usa um tom neutro**, porque não é força/core/aeróbico (ver §9). **Combinado usa
as três cores** — o mesmo corte diagonal das células de calendário com três
tipos, dizendo visualmente "mistura". Na listra vertical de 3px à esquerda dos
itens, empilhe as três cores de cima para baixo: o corte diagonal some numa
faixa tão estreita.

#### Compositor "Montar e salvar treino"
Botão em destaque no topo da sub-aba. Abre um formulário com **três formas de
montar, combináveis**:
1. **Escrita livre** na caixa de texto.
2. **`+ juntar treino`** — lista os treinos salvos agrupados por categoria; cada
   toque acrescenta o treino **inteiro** como uma seção. Se o treino de origem
   não tiver cabeçalho próprio, ele entra sob o nome da sua categoria em
   maiúsculas, para o resultado sair organizado.
3. **`+ exercícios`** — o mesmo seletor do agendamento, inserindo exercício a
   exercício agrupado por área.

Mais nome e categoria. A **categoria se ajusta sozinha** ao conteúdo (duas ou
mais áreas ⇒ Combinado; uma só ⇒ aquela área), e para de se ajustar assim que o
usuário escolher uma à mão. Salvar exige nome e texto.

Cada categoria tem `+ novo`. Um item da lista mostra o nome e um resumo de uma
linha: **`N exercícios`** (contando linhas iniciadas por `-`), ou a primeira
linha que não seja cabeçalho. Tocar abre a edição inline: nome, texto, e os
botões **Pronto**, **abrir** (tela cheia, §6) e **excluir** (com confirmação).

Quando a biblioteca inteira está vazia, mostre **um único** card explicando as
duas formas de criar treino — nunca repita "nenhum treino salvo" em cada
categoria.

### Sub-aba Exercícios (catálogo)
Só nomes de exercícios, por área, nesta ordem: **Membros inferiores, Core,
Peito, Ombro, Bíceps, Tríceps, Costas, Mobilidade**. Cada área mostra a
contagem e um `+ novo`.

Um exercício tem **nome** e **observação de execução** (opcional) — é essa
observação que aparece no "segurar" da tela cheia. Editar é inline, com
**Pronto** e **excluir**. Se o usuário criar um exercício e sair sem digitar
nome, **descarte-o** em vez de guardar uma linha vazia.

Áreas vazias colapsam (só cabeçalho + `+ novo`); a dica de ajuda aparece uma
única vez, quando o catálogo inteiro está vazio.

## 8. Aba Ano

- Navegação ‹ ano ›.
- Card de destaque: **dias treinados no ano** (um dia com **qualquer** um dos
  três tipos conta como 1), campo numérico de **meta anual**, barra de
  progresso e um indicador de ritmo comparando o esperado até hoje: `no ritmo`
  / `12 à frente` / `12 atrás`.
- Lista dos 12 meses: sigla, barra empilhada com um segmento por tipo, e o
  total de dias do mês à direita (cinza quando zero).
- Legenda dos três tipos + explicação do número à direita.
- Três contadores anuais por tipo.
- Campo livre **Anotações e objetivos**.

## 9. Aba Tema — aparência

### Quatro temas
Não são só recolorações: variam superfícies, contraste, **raio dos cantos** e
peso do título. Todos os raios da interface devem derivar do tema — nada de
valores fixos espalhados pelo código, senão os temas não se distinguem.

| Tema | Caráter | raio card / pequeno | paper / panel / deep | ink / soft / line / onDark | agenda / agendaInk |
|---|---|---|---|---|---|
| **Papel** | Quente e editorial | 14 / 10 | `#E8E7DD` `#F4F3EB` `#DAD9CC` | `#1A1B17` `#66675B` `#C8C7B8` `#F7F5EA` | `#E2E3D0` `#75795C` |
| **Carbono** | Escuro, bom à noite | 14 / 10 | `#141519` `#1E1F23` `#2A2B30` | `#EDECE5` `#9B9B94` `#35363C` `#12130F` | `#282A22` `#A8AC8C` |
| **Névoa** | Claro, frio e suave | 20 / 14 | `#EBEEF3` `#F7F8FA` `#DDE2EA` | `#151A22` `#697384` `#D3D9E2` `#F9FAFC` | `#DFE7F2` `#5E6D85` |
| **Fita** | Alto contraste, geométrico | 4 / 3 | `#F2F2F2` `#FFFFFF` `#E2E2E2` | `#000000` `#5A5A5A` `#BFBFBF` `#FFFFFF` | `#E8E8E8` `#3D3D3D` |

Cada tema traz seu próprio trio de cores para Força / Core / Aeróbico:

| Tema | Força | Core | Aeróbico |
|---|---|---|---|
| Papel | `#41609F` | `#9B7A20` | `#AC2722` |
| Carbono | `#5794D8` | `#AE8C37` | `#C13D34` |
| Névoa | `#4482C4` | `#9B7A20` | `#AC2722` |
| Fita | `#1D4ED8` | `#9B7A20` | `#AC2722` |

> **Por que trios diferentes:** as cores são a codificação dos dados. Cada trio
> foi validado contra a superfície do seu tema para (a) manter separação
> perceptual suficiente sob simulação de daltonismo protan/deutan e (b) ter
> contraste ≥3:1 com o fundo. O tema escuro **não pode** reaproveitar as cores
> do claro: elas caem fora da faixa de luminosidade adequada e o par
> dourado/vermelho deixa de se distinguir. Se alterar as cores, valide de novo.

Os cards de escolha de tema devem mostrar uma **miniatura desenhada com as
cores e o raio daquele tema**, para a escolha ser visual.

### Cores personalizáveis
O usuário pode sobrescrever cada uma das três cores com um `<input type="color">`,
com opção de voltar uma cor ao padrão ou restaurar todas. A cor escolhida vale
em todo o app: calendário, gráficos, legendas, chips. Mostre uma prévia de
"como fica" com as combinações de 1, 2 e 3 tipos.

### Fontes e estilo geral
- Títulos e corpo: **Archivo**; números, rótulos e etiquetas: **IBM Plex Mono**.
- Rótulos pequenos em maiúsculas com `letter-spacing` largo (o "eyebrow" que
  aparece em todo o app).
- Botões escurecem levemente ao toque; células do calendário encolhem um pouco
  — tudo dentro de `@media (prefers-reduced-motion: no-preference)`.
- Foco visível por teclado em todos os controles.
- A cor de fundo do `body` e a `<meta name="theme-color">` acompanham o tema.

## 10. Aba Dados — backup

- Texto explicando com franqueza que **os dados ficam só neste navegador**.
- Quatro contadores: dias, agendados, salvos, exercícios.
- **Exportar backup** — baixa `consistentfit-AAAA-MM-DD.json` contendo
  `{ app, versao, exportadoEm, dados }`. Use um `Blob` + link temporário.
- **Importar backup** — lê o arquivo, **valida**, mostra num `confirm` o que vai
  entrar e o que será substituído, e só então aplica.
- **Apagar tudo** — com confirmação. **Preserva tema e cores**: aparência não é
  dado de treino.
- Dica de que, no celular, o arquivo vai para os downloads ou para a folha de
  compartilhamento.

### Regras de validação da importação (não confie no arquivo)
- Aceite tanto o formato exportado quanto um objeto de dados puro.
- Se nenhuma chave conhecida existir, **rejeite** com mensagem clara ("escolha
  um backup exportado pelo ConsistentFit").
- Descarte **individualmente** entradas inválidas e **conte** os descartes, para
  informar o usuário — nunca deixe uma entrada ruim derrubar a importação toda.
- Chaves de dia devem casar `^\d{4}-\d{2}-\d{2}$`; dias sem nenhum tipo e sem
  nota são descartados.
- Categoria ou área desconhecida **descarta a entrada inteira** (um treino sem
  categoria válida não teria onde aparecer). Já valores desconhecidos em campos
  secundários **caem num padrão seguro**: tipos inválidos são filtrados da
  lista, recorrência inválida vira `nunca`, tema inválido volta ao padrão.
- Exercício ou treino sem nome utilizável é descartado (ou recebe um nome
  genérico, no caso do treino salvo).
- `id` ausente ou repetido é regerado — ids duplicados quebrariam a renderização.
- Um agendamento semanal/quinzenal que chegar **sem dias da semana** recebe o
  dia da data de início, senão nunca apareceria no calendário.
- `metaAno` só é aceito se for número finito positivo.

## 11. Instalação como app (PWA leve)

- `manifest.webmanifest` com `display: standalone`, `start_url` e `scope`
  relativos (`./`), cores de tema e ícones 192/512 (inclusive `maskable`).
- **`apple-touch-icon.png` de 180×180 é obrigatório**: o iOS ignora favicon SVG
  e, sem esse PNG, usa um print da página como ícone da tela de início.
- Metas `apple-mobile-web-app-capable` e `viewport-fit=cover` para abrir sem a
  barra do navegador e permitir o uso das áreas seguras.
- Ícone: fundo escuro, três barras horizontais de comprimentos diferentes nas
  cores dos três tipos. Desenhe **sem cantos arredondados** (o sistema arredonda)
  e mantenha o conteúdo dentro da área central segura (raio ~205 num quadro de
  512), que o Android recorta em ícones circulares.

## 12. Princípios de qualidade

- **Nunca perca dados do usuário.** Gravação com debounce + descarga ao sair;
  importação validada; "apagar tudo" sempre confirmado.
- **Texto puro como formato.** O treino é texto; a formatação é uma leitura
  esperta dele. Isso mantém edição manual, busca e backup triviais.
- **Estado vazio ensina.** Toda lista vazia explica o que fazer — uma vez só,
  não por categoria.
- **Alvos de toque generosos** e nada de gesto que brigue com o navegador.
- **Acessibilidade**: `aria-label` em botões só com ícone, `aria-pressed` nos
  alternáveis, `aria-expanded` nas sanfonas, `role="status"` em confirmações,
  `role="dialog"` + `aria-modal` nos modais. Cor nunca é a única pista: sempre
  há rótulo ou legenda junto.
- **Verifique em 320px** e nos quatro temas antes de considerar pronto.
