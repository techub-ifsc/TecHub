const sanitizeHtml = require('sanitize-html');

// Formatação aceita na descrição do projeto: a mesma que o editor da tela produz.
// Tudo fora desta lista (img, a, script, iframe, atributos como onerror, estilos
// além do alinhamento) é removido antes de salvar.
const RICH_TEXT_OPTIONS = {
  allowedTags: ['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'span'],
  allowedAttributes: { '*': ['style'] },
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
  disallowedTagsMode: 'discard',
};

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

function sanitizeRichText(value) {
  return sanitizeHtml(String(value ?? ''), RICH_TEXT_OPTIONS).trim();
}

// Texto que a pessoa vê (sem as marcações), usado para o limite de caracteres.
function richTextToPlain(html) {
  const text = sanitizeHtml(String(html ?? ''), { allowedTags: [], allowedAttributes: {} });
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity]).replace(/\s+/g, ' ').trim();
}

module.exports = { sanitizeRichText, richTextToPlain };
