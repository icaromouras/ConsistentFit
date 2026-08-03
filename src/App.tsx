import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Agendamento, Cores, Dados, DiaInfo, TemaId, Tipo, TreinoSalvo } from "./types";
import { FONTE } from "./temas";
import { TemaCtx, montarCtx } from "./tema-ctx";
import { VAZIO, carregar, iso, salvar } from "./dados";
import Mes from "./abas/Mes";
import Ano from "./abas/Ano";
import Biblioteca from "./abas/Biblioteca";
import Ajustes from "./abas/Ajustes";
import Aparencia from "./abas/Aparencia";

export default function App() {
  const hoje = new Date();
  const [dados, setDados] = useState<Dados>(carregar);
  const [erro, setErro] = useState(false);
  const [aba, setAba] = useState<"mes" | "ano" | "treinos" | "tema" | "dados">("mes");
  const [cursor, setCursor] = useState({ y: hoje.getFullYear(), m: hoje.getMonth() });
  const [sel, setSel] = useState<string | null>(null);

  const dadosRef = useRef(dados);

  useEffect(() => {
    dadosRef.current = dados;
    const t = setTimeout(() => {
      try {
        salvar(dados);
        setErro(false);
      } catch {
        setErro(true);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [dados]);

  // garante que uma escrita pendente do debounce não se perca ao fechar/ocultar a aba
  useEffect(() => {
    const flush = () => {
      try {
        salvar(dadosRef.current);
      } catch {
        // sem storage disponível; o estado em memória segue válido
      }
    };
    const aoOcultar = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", aoOcultar);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", aoOcultar);
    };
  }, []);

  const ctx = useMemo(() => montarCtx(dados.tema, dados.cores), [dados.tema, dados.cores]);
  const { C, est, tab, tipos } = ctx;

  // pinta a barra do navegador e o fundo além da rolagem com a cor do tema
  useEffect(() => {
    document.body.style.background = C.paper;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", C.paper);
  }, [C.paper]);

  const setDia = useCallback((chave: string, patch: Partial<DiaInfo>) => {
    setDados((prev) => {
      const atual = prev.dias[chave] || {};
      const novo = { ...atual, ...patch };
      const dias = { ...prev.dias };
      if (!novo.f && !novo.c && !novo.a && !(novo.nota || "").trim()) delete dias[chave];
      else dias[chave] = novo;
      return { ...prev, dias };
    });
  }, []);

  const addAg = useCallback((a: Agendamento) =>
    setDados((p) => ({ ...p, agendamentos: [...p.agendamentos, a] })), []);
  const upAg = useCallback((id: string, patch: Partial<Agendamento>) =>
    setDados((p) => ({ ...p, agendamentos: p.agendamentos.map((a) => (a.id === id ? { ...a, ...patch } : a)) })), []);
  const delAg = useCallback((id: string) =>
    setDados((p) => ({ ...p, agendamentos: p.agendamentos.filter((a) => a.id !== id) })), []);

  const addSalvo = useCallback((t: TreinoSalvo) =>
    setDados((p) => ({ ...p, salvos: [...p.salvos, t] })), []);
  const upSalvo = useCallback((id: string, patch: Partial<TreinoSalvo>) =>
    setDados((p) => ({ ...p, salvos: p.salvos.map((s) => (s.id === id ? { ...s, ...patch } : s)) })), []);
  const delSalvo = useCallback((id: string) =>
    setDados((p) => ({ ...p, salvos: p.salvos.filter((s) => s.id !== id) })), []);

  const setTema = useCallback((t: TemaId) => setDados((p) => ({ ...p, tema: t })), []);
  const setCor = useCallback((t: Tipo, cor: string | null) => {
    setDados((p) => {
      const cores: Cores = { ...p.cores };
      if (cor) cores[t] = cor;
      else delete cores[t];
      return { ...p, cores };
    });
  }, []);

  const ano = cursor.y;

  const totais = useMemo(() => {
    let f = 0, c = 0, a = 0, dias = 0;
    const porMes = Array.from({ length: 12 }, () => ({ f: 0, c: 0, a: 0, dias: 0 }));
    Object.entries(dados.dias).forEach(([k, v]) => {
      if (!k.startsWith(String(ano))) return;
      const mi = parseInt(k.slice(5, 7), 10) - 1;
      if (v.f) { f++; porMes[mi].f++; }
      if (v.c) { c++; porMes[mi].c++; }
      if (v.a) { a++; porMes[mi].a++; }
      if (v.f || v.c || v.a) { dias++; porMes[mi].dias++; }
    });
    return { f, c, a, dias, porMes };
  }, [dados.dias, ano]);

  const navegar = (delta: number) => {
    setSel(null);
    setCursor((p) => {
      const d = new Date(p.y, p.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const hojeIso = iso(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  return (
    <TemaCtx.Provider value={ctx}>
      <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: FONTE.sans, padding: "18px 16px 48px", maxWidth: 620, margin: "0 auto" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
          * { -webkit-tap-highlight-color: transparent; }
          button:focus-visible, textarea:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.ink}; outline-offset: 2px; }
          textarea:focus, input:focus { outline-color: ${C.ink}; }
          @media (prefers-reduced-motion: no-preference) {
            .cel { transition: transform .12s ease; }
            .cel:active { transform: scale(.93); }
          }
          /* !important: tab() aplica fonte e espaçamento como estilo inline */
          @media (max-width: 420px) {
            .tab { font-size: 9.5px !important; letter-spacing: 0.02em !important; }
          }
        `}</style>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: ctx.tema.peso, letterSpacing: "-0.035em" }}>
            Consistent<span style={{ color: C.aero }}>Fit</span>
          </h1>
          <span style={est.eyebrow}>{erro ? "não salvou" : `${ano}`}</span>
        </div>
        <p style={{ ...est.eyebrow, margin: "0 0 16px", fontSize: 10 }}>constância antes de intensidade</p>

        <div style={{ display: "flex", gap: 3, background: C.deep, padding: 4, borderRadius: ctx.tema.raioP + 1, marginBottom: 18 }}>
          {([["mes", "Mês"], ["ano", "Ano"], ["treinos", "Treinos"], ["tema", "Tema"], ["dados", "Dados"]] as const).map(([k, l]) => (
            <button key={k} className="tab" style={tab(aba === k)} onClick={() => setAba(k)}>{l}</button>
          ))}
        </div>

        {aba === "mes" && (
          <Mes
            dados={dados}
            cursor={cursor}
            navegar={navegar}
            sel={sel}
            setSel={setSel}
            setDia={setDia}
            addAg={addAg}
            upAg={upAg}
            delAg={delAg}
            totais={totais}
            hojeIso={hojeIso}
          />
        )}

        {aba === "ano" && (
          <Ano
            totais={totais}
            ano={ano}
            mudarAno={(d) => setCursor((p) => ({ ...p, y: p.y + d }))}
            metaAno={dados.metaAno}
            setMeta={(n) => setDados((p) => ({ ...p, metaAno: n }))}
            anotacoes={dados.anotacoes}
            setAnotacoes={(t) => setDados((p) => ({ ...p, anotacoes: t }))}
          />
        )}

        {aba === "treinos" && (
          <Biblioteca salvos={dados.salvos} addSalvo={addSalvo} upSalvo={upSalvo} delSalvo={delSalvo} />
        )}

        {aba === "tema" && (
          <Aparencia temaAtual={dados.tema} setTema={setTema} cores={dados.cores} setCor={setCor} />
        )}

        {aba === "dados" && (
          <Ajustes
            dados={dados}
            importar={(d) => {
              setSel(null);
              setDados(d);
            }}
            apagarTudo={() => {
              setSel(null);
              // preferências de aparência não são dados de treino: sobrevivem ao "apagar tudo"
              setDados((p) => ({ ...VAZIO, tema: p.tema, cores: p.cores }));
            }}
          />
        )}

        <p style={{ ...est.eyebrow, fontSize: 9, textAlign: "center", marginTop: 40, color: C.line }}>
          {tipos.map((t) => t.rot.toLowerCase()).join(" · ")} — um dia com qualquer um deles conta como dia treinado
        </p>
      </div>
    </TemaCtx.Provider>
  );
}
