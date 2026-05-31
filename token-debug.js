const fs = require("fs");
const parser = require("@babel/parser");
const code = fs.readFileSync("frontend/src/App.jsx", "utf8");
const ast = parser.parse(code, {
  sourceType: "module",
  plugins: ["jsx"],
  tokens: true,
  errorRecovery: true,
});
const tokens = ast.tokens.filter(
  (token) => token.loc.start.line >= 2096 && token.loc.start.line <= 2102,
);
for (const token of tokens) {
  console.log(
    token.type.label,
    JSON.stringify(token.value),
    token.loc.start.line + ":" + token.loc.start.column,
    "->",
    token.loc.end.line + ":" + token.loc.end.column,
  );
}
console.log(
  "errors",
  ast.errors.map((error) => ({
    message: error.message,
    line: error.loc.line,
    column: error.loc.column,
  })),
);
