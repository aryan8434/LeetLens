const fs = require("fs");
const lines = fs
  .readFileSync("frontend/src/App.jsx", "utf8")
  .split(/\r?\n/)
  .slice(1699);
let p = 0;
let b = 0;
let c = 0;
const strip = (s) => s.replace(/'[^']*'|\"[^\"]*\"|`[^`]*`/g, "");
lines.forEach((line, i) => {
  const s = strip(line);
  for (const ch of s) {
    if (ch === "(") p += 1;
    else if (ch === ")") p -= 1;
    else if (ch === "{") b += 1;
    else if (ch === "}") b -= 1;
    else if (ch === "[") c += 1;
    else if (ch === "]") c -= 1;
  }
  if (i >= 390) {
    console.log(`${1700 + i}: ${p},${b},${c} | ${line.trim()}`);
  }
});
console.log("final", p, b, c);
