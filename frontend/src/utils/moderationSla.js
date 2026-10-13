const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const plural = (amount, unit) => `${amount} ${unit}${amount === 1 ? "" : "s"}`;

// Situação do prazo de análise de um projeto pendente, contado desde o envio.
// tone: "ok" (no prazo), "warning" (vence em até 24 h) ou "late" (prazo vencido).
// progress: quanto do prazo já foi consumido, de 0 a 100.
export function getSlaStatus({ submittedAt, dueAt }, now = new Date()) {
  const start = new Date(submittedAt).getTime();
  const end = new Date(dueAt).getTime();
  const current = new Date(now).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

  const remaining = end - current;
  const progress = Math.min(100, Math.max(0, Math.round(((current - start) / (end - start)) * 100)));

  if (remaining < 0) {
    const days = Math.floor(-remaining / DAY_IN_MS);
    const hours = Math.max(1, Math.floor(-remaining / HOUR_IN_MS));
    return {
      tone: "late",
      label: `Atrasado há ${days >= 1 ? plural(days, "dia") : plural(hours, "hora")}`,
      progress,
    };
  }

  if (remaining <= DAY_IN_MS) {
    const hours = Math.floor(remaining / HOUR_IN_MS);
    return {
      tone: "warning",
      label: hours >= 1 ? `Vence em ${plural(hours, "hora")}` : "Vence em menos de 1 hora",
      progress,
    };
  }

  const days = Math.floor(remaining / DAY_IN_MS);
  return {
    tone: "ok",
    label: `${days === 1 ? "Falta" : "Faltam"} ${plural(days, "dia")}`,
    progress,
  };
}
