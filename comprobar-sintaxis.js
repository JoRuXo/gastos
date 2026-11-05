// Comprueba que los <script> de index.html y sw.js compilan (no los ejecuta).
// Uso:  node comprobar-sintaxis.js
// No sustituye a probar la app en el navegador, pero caza erratas de sintaxis.
var fs = require("fs"), vm = require("vm"), path = require("path");
var raiz = __dirname, errores = 0;

function comprobar(nombre, codigo) {
  try { new vm.Script(codigo, { filename: nombre }); console.log("OK    " + nombre); }
  catch (e) { errores++; console.log("ERROR " + nombre + ": " + e.message); }
}

var html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, m, n = 0;
while ((m = re.exec(html))) comprobar("index.html (script inline #" + (++n) + ")", m[1]);
comprobar("sw.js", fs.readFileSync(path.join(raiz, "sw.js"), "utf8"));

try { JSON.parse(fs.readFileSync(path.join(raiz, "manifest.json"), "utf8")); console.log("OK    manifest.json"); }
catch (e) { errores++; console.log("ERROR manifest.json: " + e.message); }

process.exit(errores ? 1 : 0);
