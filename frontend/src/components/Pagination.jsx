import "./Pagination.css";

// Paginação das listagens públicas (projetos e criadores).
export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemLabel = "projetos",
  ariaLabel = "Paginação dos projetos",
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav className="projects-pagination" aria-label={ariaLabel}>
      <div className="projects-pagination__buttons">
        <button
          type="button"
          onClick={() => changePage(1)}
          disabled={currentPage === 1}
          aria-label="Primeira página"
          title="Primeira página"
        >
          <i
            className="fa-solid fa-angles-left"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
          title="Página anterior"
        >
          <i
            className="fa-solid fa-chevron-left"
            aria-hidden="true"
          />
        </button>

        {visiblePages.map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`}>...</span>
          ) : (
            <button
              key={page}
              type="button"
              className={page === currentPage ? "is-current" : ""}
              onClick={() => changePage(page)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Próxima página"
          title="Próxima página"
        >
          <i
            className="fa-solid fa-chevron-right"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => changePage(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Última página"
          title="Última página"
        >
          <i
            className="fa-solid fa-angles-right"
            aria-hidden="true"
          />
        </button>
      </div>

      <p>
        Mostrando{" "}
        <strong>
          {startItem}-{endItem}
        </strong>{" "}
        de <strong>{totalItems}</strong> {itemLabel}
      </p>
    </nav>
  );
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage, "...", totalPages];
}
