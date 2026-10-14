import { SYNTAX } from "./theme";
const KEYWORDS = new Set(["for", "in", "while", "if", "elif", "else", "and", "or", "not", "return", "def", "class", "import", "from", "is", "None", "True", "False", "break", "continue", "lambda", "yield", "with", "as", "pass"]);
const BUILTINS = new Set(["len", "range", "enumerate", "min", "max", "sum", "sorted", "list", "dict", "set", "int", "str", "zip", "abs", "self"]);

const TOKEN = /(#.*$)|("[^"]*"|'[^']*')|(\b\d+\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|([^\sA-Za-z_\d]+)|(\s+)/g;

const colorOf = (m: RegExpExecArray): string | undefined => {
  if (m[1]) return SYNTAX.comment;
  if (m[2]) return SYNTAX.string;
  if (m[3]) return SYNTAX.number;
  const word = m[4] ?? m[5];
  if (word && KEYWORDS.has(word)) return SYNTAX.keyword;
  if (word && BUILTINS.has(word)) return SYNTAX.builtin;
  if (m[4]) return SYNTAX.call;
  if (m[6]) return SYNTAX.punct;
  return undefined;
};

export const PyLine = ({ text }: { text: string }) => (
  <>
    {[...text.matchAll(TOKEN)].map((m, k) => (
      <span key={k} style={{ color: colorOf(m as RegExpExecArray) }}>{m[0]}</span>
    ))}
  </>
);
