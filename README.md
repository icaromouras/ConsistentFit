# ConsistentFit

App de acompanhamento de treinos com foco em **consistência**: marque o que treinou, agende os próximos treinos e acompanhe seu progresso no ano.

## Funcionalidades

- **Calendário mensal** — marque cada dia com os tipos de treino feitos: **Força**, **Core** e **Aeróbico**. O dia fica colorido com uma, duas ou três cores.
- **Agendamento** — agende um treino para qualquer dia, com repetição (semanal em dias escolhidos, quinzenal ou mensal). Dias com treino agendado ficam destacados no calendário, e o texto do treino abre ao clicar no dia.
- **Biblioteca de treinos** — salve treinos padrão divididos em Aeróbico, Core e Força (peito, costas, ombro, bíceps, tríceps e membros inferiores) e reutilize-os ao agendar.
- **Visão anual e metas** — total de dias treinados no ano (qualquer tipo conta como um dia), gráfico mensal por tipo, meta anual com barra de progresso e indicador de ritmo.

Os dados ficam salvos localmente no navegador (localStorage).

## Desenvolvimento

```bash
npm install
npm run dev     # servidor de desenvolvimento
npm run build   # build de produção
```

Stack: Vite + React + TypeScript.
