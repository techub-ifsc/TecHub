import { useCallback, useEffect, useRef } from "react";

const MESSAGE =
  "Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas. Deseja sair mesmo assim?";

// Avisa antes de perder um formulário preenchido e não salvo:
// - fechar a aba, recarregar ou ir para outro site: aviso padrão do navegador;
// - clicar em links internos (menu, logo, "Voltar"): confirmação antes de sair;
// - botões da própria tela que saem: usar a função devolvida (confirmLeave).
// O botão "voltar" do navegador não é interceptado: o BrowserRouter não oferece bloqueio.
export function useUnsavedChangesGuard(isDirty) {
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function handleLinkClick(event) {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // nova aba
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // sai do site: o beforeunload avisa
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(MESSAGE)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    // Fase de captura: roda antes do Link do React Router e pode impedir a navegação.
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, []);

  // Para botões que saem da tela: true se pode sair.
  return useCallback(() => !dirtyRef.current || window.confirm(MESSAGE), []);
}
