# ConsistentFit

App de acompanhamento de treinos com foco em **consistência**: marque o que treinou, agende os próximos treinos e acompanhe seu progresso no ano.

## Funcionalidades

- **Calendário mensal** — marque cada dia com os tipos de treino feitos: **Força**, **Core** e **Aeróbico**. O dia fica colorido com uma, duas ou três cores.
- **Agendamento** — agende um treino para qualquer dia, com repetição (semanal em dias escolhidos, quinzenal ou mensal). Dias com treino agendado ficam destacados no calendário, e o texto do treino abre ao clicar no dia. O botão **abrir** mostra o treino em tela cheia, para ler e editar sem rolar dentro de uma caixa pequena.
- **Biblioteca de treinos** — salve treinos padrão divididos em Força (peito, costas, ombro, bíceps, tríceps e membros inferiores), Core, Aeróbico e Mobilidade e reutilize-os ao agendar. O botão **abrir** mostra o treino salvo em tela cheia.
- **Catálogo de exercícios** — em Treinos → Exercícios, cadastre só o nome (e uma observação de execução, se quiser) por área: membros inferiores, core, peito, ombro, bíceps, tríceps, costas e mobilidade. Ao agendar, "montar com exercícios" adiciona cada exercício ao treino com um toque, e você completa séries e repetições no texto.
- **Resumo mensal** — dias treinados no mês, comparação com o mês anterior, melhor sequência, barras por semana e totais por tipo.
- **Visão anual e metas** — total de dias treinados no ano (qualquer tipo conta como um dia), gráfico mensal por tipo, meta anual com barra de progresso e indicador de ritmo.
- **Temas e cores** — quatro temas (Papel, Carbono, Névoa e Fita) e cores personalizáveis para Força, Core e Aeróbico. As cores padrão de cada tema passam nos testes de daltonismo e contraste contra a superfície daquele tema.
- **Backup** — na aba Dados, exporte todos os dados para um arquivo `.json` e importe de volta quando trocar de aparelho ou limpar o navegador.

Os dados ficam salvos localmente no navegador (localStorage).

## Ícone do app

O ícone é um único arquivo: `public/favicon.svg` (fundo escuro e três barras, uma por tipo de treino). Para trocar, edite esse SVG e gere os PNGs de novo — iOS e Android não aceitam SVG no ícone da tela de início:

```bash
npx playwright@latest install chromium   # só na primeira vez
node scripts/gerar-icones.mjs            # regenera os PNGs a partir do SVG
```

Isso atualiza `apple-touch-icon.png` (180x180, iOS), `icone-192.png` e `icone-512.png` (Android, via `manifest.webmanifest`).

Mantenha o desenho dentro da area central (raio de ~205 num quadro de 512): o Android recorta as bordas em telas que usam icones circulares, e o sistema ja arredonda os cantos sozinho, entao o SVG e um quadrado sem borda arredondada.

Depois de publicar, **remova e adicione o app a tela de inicio de novo**: o icone antigo fica em cache no aparelho.

## Desenvolvimento

```bash
npm install
npm run dev     # servidor de desenvolvimento
npm run build   # build de produção
```

Stack: Vite + React + TypeScript.
