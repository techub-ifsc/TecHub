// Outra aba entrou, saiu ou trocou de conta: o localStorage é o mesmo para todas as abas,
// então esta aba precisa acompanhar para não mostrar uma pessoa e agir como outra.
// Devolve undefined quando o evento não muda a sessão, null quando saiu e o usuário novo
// quando entrou ou trocou de conta.
export function userFromStorageChange({ key, newValue }) {
  if (key === null) return null; // localStorage.clear()
  if (key !== "techub_user") return undefined;
  if (!newValue) return null;

  try {
    const user = JSON.parse(newValue);
    return user && typeof user === "object" && user.id ? user : null;
  } catch {
    return null;
  }
}
