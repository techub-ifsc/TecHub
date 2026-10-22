import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { API_URL } from "../api/apiUrl";
import ConfirmationModal from "../components/ConfirmationModal";
import Spinner from "../components/Spinner";
import "./ProjectDraftsPage.css";

function DraftCover({ draft }) {
  const url = draft.coverUrl;
  
  return (
    <div className={`draft-card__cover${url ? " has-image" : ""}`}>
      {url ? <img src={url} alt="" /> : <span className="draft-card__placeholder" aria-hidden="true">&lt;/&gt;</span>}
      <span className="draft-card__badge"><span aria-hidden="true">●</span> Rascunho</span>
      {!url && <span className="draft-card__cover-note">Uma ideia em construção</span>}
    </div>
  );
}

export default function ProjectDraftsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(location.state?.submitted
    ? "Projeto enviado para revisão. Ele ficará público após a aprovação." : "");
  const [reload, setReload] = useState(0);

  // Busca os rascunhos diretamente do Backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    
    const fetchDrafts = async () => {
      try {
        const token = localStorage.getItem("techub_token") || localStorage.getItem("token");
        const response = await fetch(`${API_URL}/projects/drafts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Erro ao carregar os rascunhos do servidor.");
        
        const data = await response.json();
        if (!cancelled) setDrafts(data.projects || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDrafts();
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => {
    const refresh = () => setReload((value) => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return drafts.filter((draft) => {
      // Remove tags HTML da descrição para a busca
      const plainDescription = (draft.description || "").replace(/<[^>]*>?/gm, '');
      const searchString = [
        draft.title || "Projeto sem título", 
        plainDescription, 
        ...(draft.technologies || [])
      ].join(" ").toLocaleLowerCase("pt-BR");
      
      return searchString.includes(query);
    }).sort((a, b) => sort === "title"
      ? (a.title || "Projeto sem título").localeCompare(b.title || "Projeto sem título", "pt-BR")
      : new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [drafts, search, sort]);

  // Exclui o rascunho no Backend
  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    try {
      const token = localStorage.getItem("techub_token") || localStorage.getItem("token");
      const response = await fetch(`${API_URL}/projects/${deleting.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Não foi possível excluir o rascunho.");
      
      setDrafts((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      setNotice("Rascunho excluído.");
    } catch (cause) {
      setError(cause.message);
      setDeleting(null);
    } finally { setBusy(false); }
  }

  return (
    <section className="drafts-page">
      <div className="drafts-page__content">
        <div className="drafts-page__eyebrow">SEU ESPAÇO DE CRIAÇÃO</div>
        <header className="drafts-page__header">
          <div>
            <h1>Meus rascunhos <span className="drafts-page__count">{drafts.length}</span></h1>
            <p>Boas ideias merecem tempo. Continue de onde parou.</p>
          </div>
          <Link to="/projeto/novo" className="drafts-button drafts-button--primary"><span aria-hidden="true">＋</span> Novo projeto</Link>
        </header>

        <aside className="drafts-page__privacy">
          <span className="drafts-page__privacy-icon" aria-hidden="true"><i className="fa-solid fa-lock" /></span>
          <div><strong>Seu projeto, no seu ritmo</strong><p>Rascunhos ficam só para você na sua conta. Eles não aparecem na listagem pública nem na fila de aprovação.</p></div>
        </aside>

        {notice && <p className="drafts-page__notice" role="status">{notice}</p>}
        {error && <div className="drafts-page__error" role="alert"><p>{error}</p><button type="button" className="drafts-button" onClick={() => setReload((value) => value + 1)}>Tentar novamente</button></div>}

        <div className="drafts-page__toolbar">
          <label className="drafts-page__search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" aria-label="Buscar rascunhos" placeholder="Buscar por título ou tecnologia..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="drafts-page__sort">Ordenar por<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Última atualização</option><option value="title">Título (A–Z)</option></select></label>
        </div>

        {loading ? <Spinner label="Carregando seus rascunhos..." /> : !error && (
          <>
            <p className="drafts-page__results">{filtered.length} {filtered.length === 1 ? `rascunho ${search ? "encontrado" : "salvo"}` : `rascunhos ${search ? "encontrados" : "salvos"}`}</p>
            {filtered.length > 0 ? (
              <div className="drafts-page__grid">
                {filtered.map((draft) => {
                  const plainDescription = (draft.description || "").replace(/<[^>]*>?/gm, '').trim();
                  
                  return (
                    <article className="draft-card" key={draft.id}>
                      <DraftCover draft={draft} />
                      <div className="draft-card__body">
                        <span className="draft-card__course">{draft.major || "Curso ainda não definido"}</span>
                        <h2>{draft.title.trim() || "Projeto sem título"}</h2>
                        <p className="draft-card__description">{plainDescription || "Sua próxima ideia começa aqui. Abra o rascunho para adicionar uma descrição."}</p>
                        <div className="draft-card__tags">{(draft.technologies || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}{(draft.technologies?.length > 3) && <span>+{(draft.technologies.length - 3)}</span>}</div>
                        <p className="draft-card__date">Atualizado em <time dateTime={draft.updatedAt}>{new Date(draft.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time></p>
                        <div className="draft-card__actions">
                          <Link className="drafts-button drafts-button--edit" to={`/meus-rascunhos/${draft.id}/editar`}>Continuar edição <span aria-hidden="true">→</span></Link>
                          <button className="drafts-button drafts-button--delete" type="button" aria-label={`Excluir rascunho ${draft.title.trim() || "sem título"}`} onClick={() => setDeleting(draft)}><i className="fa-regular fa-trash-can" aria-hidden="true" /></button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="drafts-page__empty">
                <span aria-hidden="true">&lt;/&gt;</span>
                <h2>{search ? "Nenhum rascunho encontrado" : "Dê espaço à sua próxima ideia"}</h2>
                <p>{search ? "Tente outro título ou tecnologia." : "Crie um projeto e salve como rascunho. Você pode completar os detalhes e enviar para revisão quando estiver pronto."}</p>
                {search ? <button className="drafts-button" onClick={() => setSearch("")}>Limpar busca</button> : <Link className="drafts-button drafts-button--primary" to="/projeto/novo">Criar meu primeiro projeto</Link>}
              </div>
            )}
          </>
        )}
        <p className="drafts-page__footnote">Para submeter um rascunho, abra a edição, revise os campos obrigatórios e clique em “Enviar para a revisão”.</p>
      </div>
      <ConfirmationModal open={Boolean(deleting)} tone="danger" title="Excluir rascunho?" description={`O rascunho “${deleting?.title?.trim() || "Projeto sem título"}” será excluído definitivamente. Essa ação não pode ser desfeita.`} confirmLabel={busy ? "Excluindo..." : "Excluir rascunho"} confirmDisabled={busy} onCancel={() => { if (!busy) setDeleting(null); }} onConfirm={confirmDelete} />
    </section>
  );
}