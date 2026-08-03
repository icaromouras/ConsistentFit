import { createContext, useContext } from "react";
import type { Tipo } from "./types";
import {
  TEMAS,
  acharTema,
  chipEst,
  coresEmUso,
  criarEstilos,
  tabEst,
  type Estilos,
  type InfoTipo,
  type Paleta,
  type Tema,
} from "./temas";

export interface CtxTema {
  tema: Tema;
  /** paleta já com as cores personalizadas aplicadas */
  C: Paleta;
  est: Estilos;
  tab: (on: boolean) => React.CSSProperties;
  chip: (on: boolean, cor: string) => React.CSSProperties;
  tipos: InfoTipo[];
  cor: (t: Tipo) => string;
}

export function montarCtx(idTema: string | undefined, cores: Partial<Record<Tipo, string>> | undefined): CtxTema {
  const tema = acharTema(idTema as never);
  const usadas = coresEmUso(tema, cores);
  const C: Paleta = { ...tema.p, forca: usadas.f, core: usadas.c, aero: usadas.a };
  const temaResolvido: Tema = { ...tema, p: C };
  return {
    tema: temaResolvido,
    C,
    est: criarEstilos(temaResolvido),
    tab: (on) => tabEst(temaResolvido, on),
    chip: (on, cor) => chipEst(temaResolvido, on, cor),
    tipos: [
      { id: "f", rot: "Força", cor: usadas.f },
      { id: "c", rot: "Core", cor: usadas.c },
      { id: "a", rot: "Aeróbico", cor: usadas.a },
    ],
    cor: (t) => usadas[t],
  };
}

export const TemaCtx = createContext<CtxTema>(montarCtx(TEMAS[0].id, undefined));

export const useTema = () => useContext(TemaCtx);
