import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const appRoot = resolve(process.cwd(), "app");
const secretPattern = /process\.env\.(?:OPENAI_API_KEY|TAVILY_API_KEY|MAGIC_HOUR_API_KEY)/;
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}
const files = (await walk(appRoot)).filter(file => !file.includes("/app/api/"));
const violations = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  if (secretPattern.test(source)) violations.push(file);
}
if (violations.length) {
  console.error("No se permite usar claves secretas del servidor en archivos fuera de app/api:");
  for (const file of violations) console.error(file);
  process.exitCode = 1;
} else {
  console.log("Comprobación OK: no se encontraron referencias directas a claves secretas fuera de app/api.");
}
