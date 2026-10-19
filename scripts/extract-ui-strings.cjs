// Collects English UI strings from app/ and components/ for the Spanish dictionary.
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const roots = ["app", "components"];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name) && !full.includes("i18n") && !full.includes(`${path.sep}api${path.sep}`)) files.push(full);
  }
}
roots.forEach(walk);

const out = new Set();
const ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "description"]);

function looksLikeUi(s) {
  s = s.trim();
  if (s.length < 2 || s.length > 400) return false;
  if (!/[A-Za-z]{2}/.test(s)) return false;
  if (/^(https?:|\/|#|\.|@|--)/.test(s)) return false;
  if (/^[a-z0-9_.:\-\/]+$/.test(s)) return false; // keys, slugs, ids
  if (/\b(rounded|flex|grid|text-|bg-|px-|py-|border|hover:|md:|lg:|w-|h-)/.test(s)) return false;
  if (/[{}<>;=]|=>|\$\{/.test(s)) return false;
  if (/^[a-z]+[A-Z]\w*$/.test(s)) return false; // camelCase
  if (/^[A-Z_]+$/.test(s) && s.length > 3 && s.includes("_")) return false;
  if (/\.(tsx?|sql|png|svg|json|com)$/.test(s)) return false;
  if (/rgba?\(|\dpx|solid |inset |^[0-9 .%{}x-]+$|^\d+(px|%)?\s/.test(s)) return false;
  if (/^[A-Z0-9 _]+$/.test(s) && s.length <= 4) return false;
  return /^[A-Z¿¡"'(0-9$€+•✓·—…]/.test(s) || s.includes(" ");
}

function add(s) {
  const v = s.replace(/\s+/g, " ").trim();
  if (looksLikeUi(v)) out.add(v);
}

for (const file of files) {
  const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxText(node)) add(node.text);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const p = node.parent;
      const inImport = p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p));
      const isClass = p && ts.isJsxAttribute(p) && ["className", "href", "src", "type", "id", "key", "name", "role"].includes(p.name.getText());
      const inCall = p && ts.isCallExpression(p) && /^(fetch|from|eq|select|order|getItem|setItem|require|querySelector|addEventListener|insert|update|upsert|in|neq|gte|lte|ilike|or|is|not|cn|clsx)$|\.(from|eq|select|order|in|is)$/.test(p.expression.getText().split(".").pop());
      const isPropKey = p && ts.isPropertyAssignment(p) && p.name === node;
      const isCompare = p && ts.isBinaryExpression(p) && /===|!==|==|!=/.test(p.operatorToken.getText());
      const isCase = p && ts.isCaseClause(p);
      const isTypeLit = p && ts.isLiteralTypeNode(p);
      const isElemAccess = p && ts.isElementAccessExpression(p);
      if (!inImport && !isClass && !inCall && !isPropKey && !isCompare && !isCase && !isTypeLit && !isElemAccess) add(node.text);
    } else if (ts.isTemplateExpression(node)) {
      const p = node.parent;
      const isClass = p && ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent) && p.parent.name.getText() === "className";
      if (!isClass) {
        let text = node.head.text;
        node.templateSpans.forEach((span, i) => { text += `{${i}}` + span.literal.text; });
        const plain = text.replace(/\{\d+\}/g, "");
        if (looksLikeUi(plain) && !/\b(rounded|bg-|text-|px-)/.test(text) && !text.startsWith("/") && !text.includes("?")) out.add(text.replace(/\s+/g, " ").trim());
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(src);
}

const existing = fs.readFileSync("components/i18n/LanguageProvider.tsx", "utf8");
const list = [...out].filter((s) => !existing.includes(JSON.stringify(s) + ":")).sort();
fs.writeFileSync(process.argv[2] || "ui-strings.json", JSON.stringify(list, null, 0));
console.log(out.size, "found;", list.length, "new");
