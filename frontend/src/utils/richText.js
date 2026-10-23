import DOMPurify from "dompurify";

// Mesma lista da API (backend/src/utils/richText.js): só a formatação do editor.
const ALLOWED_TAGS = ["p", "div", "br", "b", "strong", "i", "em", "u", "s", "strike", "ul", "ol", "li", "span"];
const ALIGNMENTS = new Set(["left", "right", "center", "justify"]);

// Do atributo style, só o alinhamento sobrevive (cor, fundo, url(...) etc. são descartados).
// Fora do navegador (testes em Node) o DOMPurify não tem DOM nem addHook.
DOMPurify.addHook?.("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName !== "style") return;
  const match = /text-align\s*:\s*([a-z]+)/i.exec(data.attrValue || "");
  const alignment = match?.[1]?.toLowerCase();
  if (ALIGNMENTS.has(alignment)) {
    data.attrValue = `text-align: ${alignment}`;
  } else {
    data.keepAttr = false;
  }
});

// Descrições antigas são texto puro: não têm marcação e usam quebras de linha.
export function looksLikeHtml(value) {
  return /<\/?(p|div|br|b|strong|i|em|u|s|strike|ul|ol|li|span)\b/i.test(value || "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// HTML seguro para exibir ou colocar no editor, a partir do que veio da API.
export function descriptionToSafeHtml(description) {
  const value = description || "";
  const html = looksLikeHtml(value) ? value : escapeHtml(value).replace(/\n/g, "<br>");
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: ["style"] });
}

// Texto que aparece para a pessoa, sem marcações (cards, prévias, contagem).
export function descriptionToPlainText(description) {
  const html = descriptionToSafeHtml(description);
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  doc.querySelectorAll("ul, ol").forEach((list) => list.before("\n"));
  doc.querySelectorAll("p, div, li").forEach((block) => block.append("\n"));
  return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}
