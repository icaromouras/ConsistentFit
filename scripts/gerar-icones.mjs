/**
 * Gera os PNGs do ícone a partir de public/favicon.svg.
 *
 * O SVG serve para a aba do navegador, mas iOS e Android exigem PNG para o
 * ícone da tela de início. Rode depois de editar o SVG:
 *   npx playwright@latest install chromium   (só na primeira vez)
 *   node scripts/gerar-icones.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(raiz, "public/favicon.svg"), "utf8");

const TAMANHOS = [
  ["apple-touch-icon.png", 180],
  ["icone-192.png", 192],
  ["icone-512.png", 512],
];

const navegador = await chromium.launch();
for (const [nome, tam] of TAMANHOS) {
  const pagina = await navegador.newPage({ viewport: { width: tam, height: tam } });
  await pagina.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${tam}px;height:${tam}px}</style>${svg}`
  );
  await pagina.screenshot({ path: join(raiz, "public", nome), omitBackground: false });
  await pagina.close();
  console.log(`${nome} (${tam}×${tam})`);
}
await navegador.close();
