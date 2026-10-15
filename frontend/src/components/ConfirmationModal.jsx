import { useEffect } from "react";

import "./ConfirmationModal.css";

export default function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  tone = "primary",
  confirmDisabled = false,
  children,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="confirmation-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="confirmation-modal__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
      >
        <span
          className={`confirmation-modal__icon is-${tone}`}
          aria-hidden="true"
        >
          <i
            className={`fa-solid ${
              tone === "danger" ? "fa-triangle-exclamation" : "fa-check"
            }`}
          />
        </span>

        <h2 id="confirmation-modal-title">{title}</h2>

        <p id="confirmation-modal-description">{description}</p>

        {/* Conteúdo extra, como o campo de parecer da moderação. */}
        {children}

        <div className="confirmation-modal__actions">
          <button
            type="button"
            className="confirmation-modal__cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={`confirmation-modal__confirm is-${tone}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
            autoFocus={!children}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
