/* Revisión completa antes de publicar: node tools/revisar.js
   Comprueba que los scripts no tengan errores de sintaxis, que todos los archivos de data/ pasen el validador,
   que las tareas con tema/charla encuentren su archivo y que las imágenes existan. Sale con código 1 si hay errores. */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const root = path.join(__dirname, ".."), rd = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
let bad = 0; const warn = [];
for(const f of fs.readdirSync(path.join(root, "js")).filter(x => x.endsWith(".js"))){
  const r = cp.spawnSync(process.execPath, ["--check", path.join(root, "js", f)]);
  if(r.status){ console.log("✗ sintaxis js/" + f + "\n", String(r.stderr).split("\n").slice(0, 4).join("\n")); bad++; }
}
const files = ["data/agenda-actual.json"];
const temas = rd("data/temas/index.json"), charlas = rd("data/charlas/index.json");
temas.forEach(f => files.push("data/temas/" + f)); charlas.forEach(f => files.push("data/charlas/" + f));
for(const f of files){ if(!fs.existsSync(path.join(root, f))){ console.log("✗ no existe", f); bad++; } }
const v = cp.spawnSync(process.execPath, [path.join(__dirname, "validar.js"), ...files.filter(f => fs.existsSync(path.join(root, f))).map(f => path.join(root, f))], {encoding:"utf8"});
if(v.status){ console.log(v.stdout); bad++; } else console.log("✓ validador:", files.length, "archivos sin errores");
const tid = new Set(["overunder"]), cid = new Set();
temas.forEach(f => { try{ tid.add(rd("data/temas/" + f).id); }catch(e){} });
charlas.forEach(f => { try{ cid.add(rd("data/charlas/" + f).id); }catch(e){} });
const ag = rd("data/agenda-actual.json").agendas || [];
ag.forEach(w => (w.tareas || []).forEach(t => {
  if(t.tema && !tid.has(t.tema)) warn.push("tarea " + t.id + ": el tema «" + t.tema + "» no está cargado");
  if(t.charla && !cid.has(t.charla)) warn.push("tarea " + t.id + ": la charla «" + t.charla + "» no está cargada");
  ((t.copiar && t.copiar.partes) || []).forEach(p => { if(p.imagen && !fs.existsSync(path.join(root, "img/copiar", p.imagen))){ console.log("✗ falta img/copiar/" + p.imagen); bad++; } });
}));
temas.forEach(f => { try{ (rd("data/temas/" + f).preguntas || []).forEach(q => { if(q.imagen && !fs.existsSync(path.join(root, "img/temas", q.imagen))){ console.log("✗ falta img/temas/" + q.imagen + " (" + f + ")"); bad++; } }); }catch(e){} });
warn.forEach(w => console.log("aviso:", w));
console.log(bad ? "✗ HAY " + bad + " PROBLEMA(S)" : "✓ Todo bien");
process.exit(bad ? 1 : 0);
