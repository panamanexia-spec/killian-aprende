/* Valida archivos del buzón con las MISMAS reglas del importador de la página.
   Uso: node tools/validar.js archivo.json [otro.json ...]
   Muestra errores y avisos de cada archivo; sale con código 1 si alguno tiene errores. */
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const noop = function(){}, stub = new Proxy(noop, {get:(t, k) => k === Symbol.toPrimitive ? () => "" : stub, apply:() => stub});
const ctx = {console, Math, Date, JSON, Array, Object, String, Number, RegExp, Error, parseInt, parseFloat, isNaN, Set, Map,
  window:stub, document:stub, localStorage:{getItem:() => null, setItem:noop, removeItem:noop}, navigator:{onLine:true}, setTimeout:noop, clearTimeout:noop,
  hashText: t => { let h = 5381; for(let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return String(h >>> 0); },
  S:{temas:[], charlas:[], agenda:null, home:{}, ex:{hist:{}}}, tts:{ok:false}, esc:s => String(s)};
vm.createContext(ctx);
for(const f of ["js/inicio.js", "js/mama.js", "js/charla.js"]){
  try{ vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, {filename:f}); }
  catch(e){ /* el código de pantallas puede fallar sin navegador; las funciones de validación ya quedaron definidas */ }
}
let bad = 0;
for(const file of process.argv.slice(2)){
  const txt = fs.readFileSync(file, "utf8"), pr = ctx.parseImportText(txt);
  if(!pr.ok){ console.log("✗", file, "\n   ", pr.msg); bad++; continue; }
  const o = pr.obj; let res;
  const list = o && Array.isArray(o.agendas) ? o.agendas : [o];
  const errors = [], warnings = [];
  list.forEach(x => {
    const r = x.tipo === "agenda" ? ctx.validateAgenda(x) : x.tipo === "tema" ? ctx.validateTema(x) : x.tipo === "charla" ? ctx.validateCharla(x) : {errors:["Falta «tipo»: agenda, tema o charla."], warnings:[]};
    errors.push(...r.errors); warnings.push(...(r.warnings || []));
  });
  console.log(errors.length ? "✗" : "✓", file, "(" + (o.tipo || (o.agendas ? "agendas" : "?")) + ")");
  errors.forEach(e => console.log("    ERROR:", e)); warnings.forEach(w => console.log("    aviso:", w));
  if(errors.length) bad++;
}
process.exit(bad ? 1 : 0);
