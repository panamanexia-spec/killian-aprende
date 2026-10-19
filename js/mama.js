"use strict";
/* ===================================================== ZONA DE MAMÁ ===== */
function isDate(v){ return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && dkey(parseD(v)) === v; }
function str(v){ return typeof v === "string" ? v.trim() : (typeof v === "number" ? String(v) : ""); }
function mondayOf(k){ var d = parseD(k), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return dkey(d); }
function normUrl(u){ u = str(u); return /^https?:\/\/\S+$/i.test(u) ? u : ""; }

/* Lee el texto pegado (tolera ```json y comillas "bonitas" de chats). */
function parseImportText(txt){
  txt = String(txt || "").trim();
  if(!txt) return {ok:false, msg:"Pega el contenido o elige un archivo primero."};
  txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try{ return {ok:true, obj:JSON.parse(txt)}; }catch(e1){
    try{ return {ok:true, obj:JSON.parse(txt.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"))}; }catch(e2){
      return {ok:false, msg:"No pude leer el texto como un archivo de importación. Revisa que empiece con { y termine con } y que esté completo. (" + e1.message + ")"};
    }
  }
}

function strList(v){ return (Array.isArray(v) ? v : v ? [v] : []).map(str).filter(Boolean); }
/* «copiar»: texto que Killian copia en el cuaderno, por partes (con traducción, dibujo y tabla opcionales). */
function validateCopiar(c, n){
  var E = [], out = {instrucciones_mama:"", partes:[]};
  if(!c || typeof c !== "object" || Array.isArray(c)){ return {errors:[n + ": «copiar» debe ser un bloque con «partes»."], val:null}; }
  out.instrucciones_mama = str(c.instrucciones_mama);
  var ps = Array.isArray(c.partes) ? c.partes : [];
  if(!ps.length) E.push(n + ": «copiar» necesita al menos una parte en «partes».");
  ps.forEach(function(p, i){
    var m = n + ", parte " + (i + 1);
    if(!p || typeof p !== "object"){ E.push(m + ": no se entiende."); return; }
    var part = {titulo:str(p.titulo), texto:String(p.texto == null ? "" : p.texto).replace(/\r/g, "").trim(), traduccion_es:str(p.traduccion_es), dibujo:str(p.dibujo), imagen:str(p.imagen), tabla:[]};
    if(part.imagen && !/^[A-Za-z0-9][A-Za-z0-9_.-]*\.(png|jpe?g|webp|gif)$/i.test(part.imagen)) E.push(m + ": «imagen» debe ser solo el nombre de un archivo (png, jpg, webp o gif), sin carpetas ni espacios.");
    if(!part.titulo) E.push(m + ": falta el «titulo».");
    if(!part.texto && !part.imagen && !(Array.isArray(p.tabla) && p.tabla.length)) E.push(m + ": falta el «texto» (o una «tabla» o una «imagen»).");
    if(p.tabla != null){
      if(!Array.isArray(p.tabla) || p.tabla.some(function(r){ return !Array.isArray(r); })) E.push(m + ": la «tabla» debe ser una lista de filas, por ejemplo [[\"Nota\",\"Dónde va\"],[\"Mi\",\"1.ª línea\"]].");
      else part.tabla = p.tabla.map(function(r){ return r.map(function(c2){ return str(c2); }); });
    }
    out.partes.push(part);
  });
  return {errors:E, val:out};
}
function validateAgenda(o){
  var E = [], W = [], d = {semana:str(o.semana), tareas:[], materiales:[], videos:[], notas:[]};
  if(!isDate(d.semana)) E.push("La semana debe ser una fecha con este formato: 2026-10-12 (año-mes-día).");
  function list(name){
    if(o[name] == null) return [];
    if(Array.isArray(o[name])) return o[name];
    E.push("«" + name + "» debe ser una lista."); return [];
  }
  function near(label, k){
    if(isDate(k) && isDate(d.semana) && Math.abs(dayDiff(k) - dayDiff(d.semana)) > 21) W.push(label + ": la fecha " + k + " está lejos de la semana " + d.semana + ". ¿Es correcta?");
  }
  var seen = {};
  function uid(kind, x, i, pre){
    var id = str(x.id) || (pre + (i + 1));
    if(seen[kind + id]) E.push((kind === "t" ? "Tarea " : kind === "m" ? "Material " : "Video ") + (i + 1) + ": el id «" + id + "» está repetido.");
    seen[kind + id] = 1; return id;
  }
  list("tareas").forEach(function(x, i){
    var n = "Tarea " + (i + 1);
    if(!x || typeof x !== "object"){ E.push(n + ": no se entiende."); return; }
    var it = {id:uid("t", x, i, "t"), materia:str(x.materia), titulo:str(x.titulo), detalle:str(x.detalle), fecha:str(x.fecha), entrega:str(x.entrega), evaluacion:str(x.evaluacion), en_casa:strList(x.en_casa), repaso:strList(x.repaso), videos:strList(x.videos), charla:str(x.charla), tema:str(x.tema)};
    if(x.copiar != null){
      var cv = validateCopiar(x.copiar, n); it.copiar = cv.val; cv.errors.forEach(function(e){ E.push(e); });
    }
    if(!it.titulo) E.push(n + ": falta el título.");
    if(!isDate(it.fecha)) E.push(n + (it.titulo ? " («" + it.titulo + "»)" : "") + ": falta la fecha o no es válida (usa 2026-10-13).");
    if(it.entrega && !isDate(it.entrega)) E.push(n + ": la fecha de entrega no es válida (usa 2026-10-14).");
    if(!it.materia) W.push(n + ": no tiene materia.");
    if(it.entrega && isDate(it.entrega) && isDate(it.fecha) && it.entrega < it.fecha) W.push(n + ": la entrega es antes de la fecha de hacerla.");
    near(n, it.fecha); d.tareas.push(it);
  });
  list("materiales").forEach(function(x, i){
    var n = "Material " + (i + 1);
    if(!x || typeof x !== "object"){ E.push(n + ": no se entiende."); return; }
    var it = {id:uid("m", x, i, "m"), materia:str(x.materia), material:str(x.material), llevar_el:str(x.llevar_el)};
    if(!it.material) E.push(n + ": falta qué material es.");
    if(!isDate(it.llevar_el)) E.push(n + (it.material ? " («" + it.material + "»)" : "") + ": falta el día de llevarlo o no es válido (usa 2026-10-15).");
    near(n, it.llevar_el); d.materiales.push(it);
  });
  list("videos").forEach(function(x, i){
    var n = "Video " + (i + 1);
    if(!x || typeof x !== "object"){ E.push(n + ": no se entiende."); return; }
    var it = {id:uid("v", x, i, "v"), materia:str(x.materia), titulo:str(x.titulo), url:str(x.url), fecha:str(x.fecha)};
    if(!it.titulo) E.push(n + ": falta el título.");
    if(!normUrl(it.url)) E.push(n + (it.titulo ? " («" + it.titulo + "»)" : "") + ": el enlace debe empezar con https://");
    if(!isDate(it.fecha)) E.push(n + ": falta la fecha o no es válida (usa 2026-10-13).");
    near(n, it.fecha); d.videos.push(it);
  });
  list("notas_para_mama").forEach(function(t){ if(str(t)) d.notas.push(str(t)); });
  if(!E.length && !d.tareas.length && !d.materiales.length && !d.videos.length) E.push("La agenda no trae tareas, materiales ni videos.");
  return {errors:E, warnings:W, draft:d};
}

function validateTema(o){
  var E = [], W = [];
  var t = {id:str(o.id), idioma:str(o.idioma) || "en", materia:str(o.materia), titulo:str(o.titulo), titulo_es:str(o.titulo_es), fecha_examen:str(o.fecha_examen),
           resumen:[], subtemas:[], preguntas:[], vocabulario:[], lecciones:[]};
  if(!/^[a-z0-9][a-z0-9_-]*$/i.test(t.id)) E.push("El tema necesita un «id» sin espacios ni acentos, por ejemplo science-water-cycle.");
  if(t.id === "overunder" || t.id === "weak") E.push("El id «" + t.id + "» está reservado. Usa otro.");
  var ppr = +o.preguntas_por_ronda;
  t.preguntas_por_ronda = ppr >= 3 && ppr <= 50 ? Math.round(ppr) : 10;
  if(t.idioma !== "en" && t.idioma !== "es") E.push("«idioma» del tema debe ser en o es.");
  if(!t.titulo) E.push("Falta el «titulo» del tema.");
  if(!t.materia) W.push("El tema no tiene materia.");
  if(t.fecha_examen && !isDate(t.fecha_examen)){ E.push("«fecha_examen» no es válida (usa 2026-10-20)."); }
  if(!t.fecha_examen) t.fecha_examen = "";
  var tipos = ["opcion_multiple", "verdadero_falso", "unir", "completar"];
  if(Array.isArray(o.subtemas)) o.subtemas.forEach(function(x){ if(str(x)) t.subtemas.push(str(x)); });
  (Array.isArray(o.resumen) ? o.resumen : []).forEach(function(r, i){
    if(!r || !str(r.en) || !str(r.es)){ E.push("Resumen " + (i + 1) + ": necesita «en» y «es»."); return; }
    t.resumen.push({en:str(r.en), es:str(r.es), emoji:str(r.emoji)});
  });
  (Array.isArray(o.lecciones) ? o.lecciones : []).forEach(function(l, i){
    if(!l || !str(l.titulo) || !strList(l.pasos).length){ E.push("Lección " + (i + 1) + ": necesita «titulo» y «pasos» (lista de textos)."); return; }
    t.lecciones.push({subtema:str(l.subtema), titulo:str(l.titulo), emoji:str(l.emoji), pasos:strList(l.pasos), ejemplo:str(l.ejemplo), truco:str(l.truco)});
  });
  var seen = {};
  (Array.isArray(o.preguntas) ? o.preguntas : []).forEach(function(p, i){
    var n = "Pregunta " + (i + 1);
    if(!p || typeof p !== "object"){ E.push(n + ": no se entiende."); return; }
    var q = {id:str(p.id) || ("q" + (i + 1)), subtema:str(p.subtema) || "general", tipo:str(p.tipo), pregunta_en:str(p.pregunta_en), pregunta_es:str(p.pregunta_es), explicacion_es:str(p.explicacion_es),
      ejemplo_en:str(p.ejemplo_en), ejemplo_es:str(p.ejemplo_es), pista_es:str(p.pista_es), peso:(+p.peso > 0 && +p.peso <= 10) ? +p.peso : 1};
    if(seen[q.id]) E.push(n + ": el id «" + q.id + "» está repetido."); seen[q.id] = 1;
    if(tipos.indexOf(q.tipo) < 0){ E.push(n + ": el tipo «" + q.tipo + "» no existe. Usa: " + tipos.join(", ") + "."); return; }
    if(!q.pregunta_en) E.push(n + ": falta «pregunta_en».");
    if(!q.explicacion_es) W.push(n + ": no tiene «explicacion_es» (Killian no verá por qué se equivocó).");
    if(t.subtemas.length && q.subtema && t.subtemas.indexOf(q.subtema) < 0) W.push(n + ": el subtema «" + q.subtema + "» no está en la lista de subtemas.");
    if(q.tipo === "opcion_multiple"){
      var ops = (Array.isArray(p.opciones) ? p.opciones : []).map(str).filter(Boolean);
      q.opciones = ops; q.correcta = str(p.correcta);
      if(ops.length < 2) E.push(n + ": necesita al menos 2 «opciones».");
      else if(ops.length > 6) E.push(n + ": admite hasta 6 «opciones».");
      else if(ops.indexOf(q.correcta) < 0) E.push(n + ": la «correcta» («" + q.correcta + "») no está entre las opciones.");
    } else if(q.tipo === "verdadero_falso"){
      var c = p.correcta, cs = String(c).toLowerCase();
      if(c === true || cs === "true" || cs === "verdadero" || cs === "v") q.correcta = true;
      else if(c === false || cs === "false" || cs === "falso" || cs === "f") q.correcta = false;
      else E.push(n + ": «correcta» debe ser true o false.");
    } else if(q.tipo === "unir"){
      var pares = (Array.isArray(p.pares) ? p.pares : []).map(function(x){
        x = x || {}; return {izquierda:str(x.izquierda || x.en), derecha:str(x.derecha || x.es)};
      }).filter(function(x){ return x.izquierda && x.derecha; });
      q.pares = pares;
      if(pares.length < 2) E.push(n + ": «unir» necesita al menos 2 pares con «izquierda» y «derecha».");
      else if(pares.length > 6) E.push(n + ": «unir» admite hasta 6 pares.");
      else if(pares.map(function(x){ return x.derecha; }).filter(function(x, k, a){ return a.indexOf(x) !== k; }).length) E.push(n + ": dos pares tienen el mismo significado («derecha»). Deben ser distintos.");
    } else {
      q.respuesta = str(p.respuesta != null ? p.respuesta : p.correcta);
      q.aceptadas = (Array.isArray(p.aceptadas) ? p.aceptadas : []).map(str).filter(Boolean);
      if(!q.respuesta) E.push(n + ": falta la «respuesta».");
      if(q.pregunta_en.indexOf("___") < 0) W.push(n + ": la frase no tiene el hueco ______.");
    }
    t.preguntas.push(q);
  });
  (Array.isArray(o.vocabulario) ? o.vocabulario : []).forEach(function(v, i){
    if(!v || !str(v.en) || !str(v.es)){ E.push("Palabra " + (i + 1) + ": necesita «en» y «es»."); return; }
    t.vocabulario.push({en:str(v.en), es:str(v.es), aceptadas:(Array.isArray(v.aceptadas) ? v.aceptadas : []).map(str).filter(Boolean),
      ejemplo_en:str(v.ejemplo_en), ejemplo_es:str(v.ejemplo_es)});
  });
  if(!t.preguntas.length && !E.length) E.push("El tema no trae preguntas.");
  if(t.preguntas.length && t.preguntas.length < 10) W.push("Solo hay " + t.preguntas.length + " preguntas. Conviene tener más para varias rondas distintas.");
  if(!t.vocabulario.length) W.push("El tema no trae vocabulario.");
  return {errors:E, warnings:W, draft:t};
}

/* ---- PIN ---- */
var momOk = false, momAt = 0, momView = "menu", pinMsg = "", pinTries = 0, pinLock = 0, momNote = "";
var imp = {text:"", msg:"", kind:null, draft:null, errors:[], warnings:[], src:"import", busy:false};
function hashPin(pin, salt){
  var data = salt + ":" + pin;
  if(window.crypto && crypto.subtle && window.TextEncoder){
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }
  var h = 5381; for(var i=0;i<data.length;i++) h = ((h << 5) + h + data.charCodeAt(i)) | 0;
  return Promise.resolve("x" + (h >>> 0).toString(16));
}
function newSalt(){ var s = ""; for(var i=0;i<16;i++) s += Math.floor(Math.random()*16).toString(16); return s; }
function val(id){ var el = document.getElementById(id); return el ? el.value : ""; }
function pinGo(){
  var pin = val("pin").trim();
  if(!S.pinHash || momView === "pin"){
    var p2 = val("pin2").trim();
    if(!/^\d{4}$/.test(pin)){ pinMsg = "El PIN debe tener exactamente 4 números."; render(); return; }
    if(pin !== p2){ pinMsg = "Los dos PIN no son iguales. Escríbelos otra vez."; render(); return; }
    var salt = newSalt();
    hashPin(pin, salt).then(function(h){
      S.pinSalt = salt; S.pinHash = h; saveContent();
      momOk = true; momAt = Date.now(); momView = "menu"; pinMsg = ""; momNote = "✅ PIN guardado."; render({top:true});
    });
    return;
  }
  if(Date.now() < pinLock){ pinMsg = "Espera unos segundos antes de volver a intentar."; render(); return; }
  hashPin(pin, S.pinSalt).then(function(h){
    if(h === S.pinHash){ momOk = true; momAt = Date.now(); pinTries = 0; pinMsg = ""; momView = MAMA ? "progreso" : "menu"; momNote = ""; render({top:true}); }
    else { pinTries++; if(pinTries >= 5){ pinLock = Date.now() + 30000; pinTries = 0; pinMsg = "Demasiados intentos. Espera 30 segundos."; } else pinMsg = "PIN incorrecto."; render(); }
  });
}
function momHeader(title, backAct, backTxt){
  if(MAMA && (!backAct || backAct === "home")) return '<header class="top"><span></span><b class="sec-title">'+esc(title)+'</b><span></span></header>';
  return '<header class="top"><button class="link-btn" data-act="'+(backAct||"home")+'" type="button">'+(backTxt||"← Inicio")+'</button><b class="sec-title">'+esc(title)+'</b><span></span></header>';
}
function renderPinGate(){
  var creating = !S.pinHash || momView === "pin";
  return momHeader(creating ? "Crear PIN" : "Zona de mamá") +
    '<main class="card auth mom"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><h1>'+(creating ? "Crea tu PIN de 4 números" : "Escribe tu PIN")+'</h1>' +
    '<p>'+(creating ? "Con este PIN solo tú entrarás a la zona de mamá." : "Esta zona es solo para mamá.")+'</p>' +
    (pinMsg ? '<p class="err" role="alert">'+esc(pinMsg)+'</p>' : '') +
    '<div class="pinbox"><label for="pin">'+(creating ? "PIN nuevo" : "PIN")+'</label><input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" pattern="[0-9]*">' +
    (creating ? '<label for="pin2">Repite el PIN</label><input id="pin2" type="password" inputmode="numeric" maxlength="4" autocomplete="off" pattern="[0-9]*">' : '') +
    '<button class="btn btn-sun btn-big" type="button" data-act="pin-go">'+(creating ? "GUARDAR PIN" : "ENTRAR")+'</button></div></main>' + footer();
}
function weeksList(){
  var ag = S.agenda, set = {};
  if(ag) ["tareas","materiales","videos","notas"].forEach(function(k){ (ag[k] || []).forEach(function(x){ if(x.semana) set[x.semana] = 1; }); });
  return Object.keys(set).sort().reverse();
}
function renderMom(){
  if(momOk && Date.now() - momAt > 15 * 60000) momOk = false;
  if(!momOk || momView === "pin") return renderPinGate();
  momAt = Date.now();
  switch(momView){
    case "import": return renderImport();
    case "preview": case "edit": return renderEditor();
    case "weeks": return renderWeeks();
    case "temas": return renderTemasMom();
    case "asks": return renderAsks();
    case "progreso": return renderProgress();
    case "prizes": return renderPrizesMom();
    case "notas": return renderNotas();
    case "tareas": return renderTareasMom();
    case "charlas": return renderCharlasMom();
    case "voces": return renderVoces();
    case "paracopiar": return renderParaCopiar();
    case "registro": return renderRegistro();
    default: return renderMomMenu();
  }
}
/* ---- Notas con check, ordenadas por día ---- */
function notaKey(n){ return n.semana + ":n:" + hashText(n.texto); }
function notaDia(n){
  var m = /(\d{1,2})\/(\d{1,2})/.exec(n.texto), w = String(n.semana).split("-");
  if(!m) return "";
  var y = +w[0], mo = +m[2], dd = +m[1];
  if(mo < 1 || mo > 12 || dd < 1 || dd > 31) return "";
  if(w[1] && mo < (+w[1]) - 6) y++;
  return y + "-" + (mo < 10 ? "0" : "") + mo + "-" + (dd < 10 ? "0" : "") + dd;
}
function notasOrdenadas(){
  var L = ((S.agenda && S.agenda.notas) || []).map(function(n, i){ return {n:n, i:i, d:notaDia(n), k:notaKey(n)}; });
  L.sort(function(a, b){ if(a.d && b.d) return a.d < b.d ? -1 : a.d > b.d ? 1 : a.i - b.i; if(a.d) return -1; if(b.d) return 1; return a.i - b.i; });
  return L;
}
/* Notas vivas: sin fecha o de hoy en adelante. Las ya pasadas se ocultan solas. */
function notaViva(x){ return !x.d || x.d >= todayKey(); }
function notasPend(){ return notasOrdenadas().filter(function(x){ return notaViva(x) && !(S.home.nchk[x.k] > 0); }).length; }
var momShowDone = {};   /* «Ver hechas» abierto o cerrado, por pantalla */
/* Lo hecho que ya pasó pero es de esta semana: se oculta, y sale con «Ver hechas». Lo de semanas anteriores ya no se ve. */
function hechasBtn(v, n){
  if(!n) return "";
  return '<p style="text-align:center"><button class="link-btn" type="button" data-act="mom-showdone" data-v="' + v + '">' + (momShowDone[v] ? "Ocultar hechas" : "Ver hechas (" + n + ")") + '</button></p>';
}
function renderNotas(){
  var all = notasOrdenadas(), t = todayKey(), wk = weekStart(t), h = momHeader("Notas para mamá", "mom-go", "← Zona de mamá"), pend = notasPend(), last = null;
  var on = function(x){ return S.home.nchk[x.k] > 0; };
  var live = all.filter(notaViva), todo = live.filter(function(x){ return !on(x); }), doneL = live.filter(on);
  var old = all.filter(function(x){ return !notaViva(x) && on(x) && x.d >= wk; });   /* hechas y pasadas, de esta semana */
  h += '<section class="card mom"><p class="small">' + (live.length ? (pend ? 'Te faltan <b>' + pend + '</b> por marcar. Toca el círculo cuando ya lo tengas listo.' : '🌟 Todo marcado.') : 'No hay notas por ahora.') + '</p></section>';
  todo.forEach(function(x){
    var g = x.d ? capFirst(dayLabel(x.d)) + " · " + relDay(x.d) : "Sin fecha";
    if(g !== last){ h += '<h2 class="sec-title nday">' + esc(g) + '</h2>'; last = g; }
    h += notaRow(x, false);
  });
  if(doneL.length) h += '<h2 class="sec-title nday">✅ Hechas</h2>' + doneL.map(function(x){ return notaRow(x, true); }).join("");
  h += hechasBtn("notas", old.length);
  if(momShowDone.notas) h += old.map(function(x){ return notaRow(x, true); }).join("");
  return h + footer();
}
function notaRow(x, on){
  return '<div class="nrow' + (on ? ' done' : '') + '"><button class="nchk" type="button" role="checkbox" aria-checked="' + on + '" aria-label="Marcar nota" data-act="nchk" data-id="' + esc(x.k) + '">' + (on ? "✓" : "") + '</button><p>' + (x.d && on ? '<span class="small">' + esc(capFirst(dayLabel(x.d))) + ' · </span>' : '') + esc(x.n.texto) + '</p></div>';
}
/* Todo el detalle de las tareas (lo que pide la escuela y lo que harán en clase), por día. */
function tareaMomCard(x, done, late){
  return '<article class="card mom' + (done ? ' tdone' : '') + '"><span class="chip sm">' + esc(x.materia || "") + '</span> ' + (done ? '<span class="small">✓ Killian ya la hizo</span>' : late ? '<span class="small softlate">⏰ Pendiente</span>' : '') + '<h3>' + esc(x.titulo) + '</h3>' +
    String(x.detalle || "").split(/\n+/).filter(Boolean).map(function(l){ return '<p class="small" style="color:var(--ink)">' + esc(l) + '</p>'; }).join("") +
    (x.tema && temaById(x.tema) ? (function(){ var hh = tHist(x.tema); return '<p class="small" style="color:var(--ink)">📝 Examen de práctica «' + esc(temaById(x.tema).titulo_es || temaById(x.tema).titulo) + '»: ' + (hh.length ? 'practicó <b>' + hh.length + '</b> ' + (hh.length === 1 ? 'vez' : 'veces') + ' · mejor nota <b>' + bestOf(x.tema) + '</b> · última <b>' + hh[hh.length - 1].score + '</b>' : 'todavía no ha practicado') + '</p>'; })() : '') +
    (x.repaso && x.repaso.length ? '<p class="small" style="color:var(--ink)"><b>📚 Repaso en clase:</b> ' + esc(x.repaso.join(" ")) + '</p>' : '') +
    (x.copiar && x.copiar.partes ? '<p class="small" style="color:var(--ink)"><b>✏️ Copiar en el cuaderno ('+x.copiar.partes.length+' '+(x.copiar.partes.length === 1 ? "parte" : "partes")+'):</b> ' + esc(x.copiar.partes.map(function(p){ return p.titulo; }).join(" · ")) + '</p>' + (x.copiar.instrucciones_mama ? '<p class="small mamanote">👩 Para mamá: ' + esc(x.copiar.instrucciones_mama) + '</p>' : '') : '') +
    (x.copiar && x.copiar.partes ? '<button class="btn btn-sun" type="button" data-act="cp-open-mom" data-id="' + esc(x.id) + '">📝 Ver qué copiar</button>' : '') + (x.copiar && x.copiar.partes && !done ? '<button class="btn btn-ghost" type="button" data-act="mom-task-done" data-id="' + esc(x.id) + '">✔️ Marcarla como hecha (mamá)</button>' : '') + '</article>';
}
function tareaDia(x){ return x.entrega || x.fecha || ""; }
function renderTareasMom(){
  var h = momHeader("Detalle de tareas", "mom-go", "← Zona de mamá"), L = ((S.agenda && S.agenda.tareas) || []).slice(), last = null, t = todayKey(), wk = weekStart(t);
  L.sort(function(a, b){ return (tareaDia(a) || "9") < (tareaDia(b) || "9") ? -1 : (tareaDia(a) || "9") > (tareaDia(b) || "9") ? 1 : 0; });
  if(!L.length) return h + '<section class="card mom"><p class="small">No hay tareas cargadas.</p></section>' + footer();
  var isDone = function(x){ return !!S.home.tasks[x.id]; };
  var todo = L.filter(function(x){ return !isDone(x); });
  var doneNow = L.filter(function(x){ return isDone(x) && (!tareaDia(x) || tareaDia(x) >= t); });   /* hechas de hoy en adelante: abajo, en gris */
  var old = L.filter(function(x){ return isDone(x) && tareaDia(x) && tareaDia(x) < t && tareaDia(x) >= wk; });   /* hechas y pasadas de esta semana: «Ver hechas» */
  todo.forEach(function(x){
    var d = tareaDia(x), g = d ? "Para " + capFirst(dayLabel(d)) + " · " + relDay(d) : "Sin fecha";
    if(g !== last){ h += '<h2 class="sec-title nday">' + esc(g) + '</h2>'; last = g; }
    h += tareaMomCard(x, false, !!d && d < t);
  });
  if(doneNow.length) h += '<h2 class="sec-title nday">✅ Ya hechas</h2>' + doneNow.map(function(x){ return tareaMomCard(x, true); }).join("");
  h += hechasBtn("tareas", old.length);
  if(momShowDone.tareas) h += old.map(function(x){ return tareaMomCard(x, true); }).join("");
  return h + footer();
}
/* Cuántas veces practicó, en qué nivel va y las grabaciones del ensayo final. */
function charlaStatsMom(c){
  var id = c.id, ses = chSessions(id), rd = chReady(id), recs = GR.items.filter(function(x){ return x.charla === id; });
  var lv = LEVELS.map(function(L){ var sc = chScore(id, L.n); return '<span class="lvchip'+(sc ? " on" : "")+'" title="'+esc(L.name)+'">'+L.n+' '+esc(L.name)+' '+(sc ? Math.min(100, sc)+'%' : "·")+'</span>'; }).join("");
  return '<div class="charlamom"><p class="wordrow"><span><b>'+esc(c.titulo)+'</b> · '+esc(c.materia||"")+' · '+c.frases.length+' frases · '+LANGS[c.idioma].name+(c.fecha ? ' · entrega '+esc(c.fecha) : '')+'</span><button class="link-btn del" type="button" data-act="chm-del" data-id="'+esc(id)+'">🗑 Quitar</button></p>' +
    '<p class="small">Practicó <b>'+ses+'</b> '+(ses === 1 ? "vez" : "veces")+' ('+chToday(id)+' hoy) · va en el nivel <b>'+chNextLevel(id)+'</b> · charla lista al <b>'+rd+'%</b> · ⭐ '+chStarsOf(id)+' de 3</p>' +
    '<p class="lvrow">'+lv+'</p>' +
    (recs.length ? recs.map(function(g){ return '<p class="small">🎙 Ensayo final · '+esc(new Date(g.ts).toLocaleString("es", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}))+' · '+g.pct+'%</p><audio controls preload="none" src="'+esc(g.data)+'"></audio>'; }).join("") : '<p class="small">Todavía no hay grabaciones del ensayo final.</p>') + '</div>';
}
/* Lista de las tareas «Para copiar», con botón para ver cómo las ve Killian. */
function renderParaCopiar(){
  var t = todayKey(), tm = addDays(t, 1), wk = weekStart(t), done = function(x){ return !!S.home.tasks[x.id]; };
  var h = momHeader("Para copiar", "mom-go", "← Zona de mamá"), L = ((S.agenda && S.agenda.tareas) || []).filter(function(x){ return x.copiar && x.copiar.partes && x.copiar.partes.length; });
  var key = function(x){ return tareaDia(x) || "9"; };
  /* primero lo que falta de hoy y mañana (y lo atrasado), luego lo demás que falta; lo hecho al final */
  var up = L.filter(function(x){ return !done(x) && key(x) <= tm; }).sort(function(a, b){ return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; });
  var rest = L.filter(function(x){ return !done(x) && key(x) > tm; }).sort(function(a, b){ return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; });
  var fin = L.filter(function(x){ return done(x) && (!tareaDia(x) || tareaDia(x) >= wk); }).sort(function(a, b){ return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; });
  h += '<section class="card mom"><p>Las tareas donde Killian copia un texto en el cuaderno. Toca <b>📝 Ver qué copiar</b> para ver la pantalla tal como la ve él (aquí no se marca nada).</p></section>';
  if(!up.length && !rest.length && !fin.length) return h + '<section class="card mom"><p class="small">Todavía no hay tareas con «Para copiar».</p></section>' + footer();
  var card = function(x){
    var d = done(x), n = x.copiar.partes.length, c = cpDoneCount(x.id, n), late = !d && tareaDia(x) && tareaDia(x) < t;
    return '<article class="card mom' + (d ? ' tdone' : '') + '"><span class="chip sm">' + esc(x.materia || "") + '</span> <span class="small">' + (d ? "✓ hecha" : late ? "⏰ Pendiente" : c ? c + " de " + n + " partes" : n + (n === 1 ? " parte" : " partes")) + (x.entrega ? " · para " + esc(capFirst(dayLabel(x.entrega))) : "") + '</span><h3>' + esc(x.titulo) + '</h3>' +
      '<button class="btn btn-sun" type="button" data-act="cp-open-mom" data-id="' + esc(x.id) + '">📝 Ver qué copiar</button></article>';
  };
  h += up.map(card).join("") + rest.map(card).join("");
  if(fin.length) h += '<h2 class="sec-title nday">✅ Ya hechas</h2>' + fin.map(card).join("");
  return h + footer();
}
/* Registro de estudio por día: qué está hecho ✅ y qué falta ⏳, con su mejor puntaje en cada tema. */
function renderRegistro(){
  var h = momHeader("Registro de estudio", "mom-go", "← Zona de mamá"), t = todayKey(), rows = [], seen = {};
  ((S.agenda && S.agenda.tareas) || []).forEach(function(x){ if(x.tema && temaById(x.tema) && x.fecha >= addDays(t, -3) && x.fecha <= addDays(t, 7)) rows.push({id:x.id, x:x, d:x.fecha}); });
  autoItems().forEach(function(it){ if(it.x.auto === "ex") rows.push({id:it.id, x:it.x, d:it.x.fecha}); });
  rows.sort(function(a, b){ return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
  var temas = {}; rows.forEach(function(r){ temas[r.x.tema] = 1; });
  h += '<section class="card mom"><h2 class="sec-title">🏆 Mejor puntaje por tema</h2>' + (Object.keys(temas).length ? Object.keys(temas).map(function(id){
    var tm = temaById(id), hh = tHist(id), ap = aprTs(id);
    return '<p class="wordrow"><span><b>' + esc(tm.titulo_es || tm.titulo) + '</b></span><span>' + (hh.length ? (ap ? "✅ " : "⏳ ") + 'mejor <b>' + bestOf(id) + '</b> · ' + hh.length + (hh.length === 1 ? " intento" : " intentos") : "⏳ sin practicar") + '</span></p>';
  }).join("") : '<p class="small">No hay tareas de estudio en estos días.</p>') + '<p class="small">✅ = sacó 80 o más y la tarea se marcó sola.</p></section>';
  var last = null;
  rows.forEach(function(r){
    var g = capFirst(dayLabel(r.d)) + (r.d === t ? " · hoy" : "");
    if(g !== last){ h += '<h2 class="sec-title nday">' + esc(g) + '</h2>'; last = g; }
    var ts = S.home.tasks[r.id], done = !!ts, dd = ""; try{ if(ts) dd = new Date(ts).toLocaleDateString("es", {day:"numeric", month:"short"}); }catch(e){}
    h += '<div class="nrow' + (done ? " done" : "") + '"><span class="regico" aria-hidden="true">' + (done ? "✅" : "⏳") + '</span><p><b>' + esc(r.x.titulo) + '</b><br><span class="small">' + esc(r.x.materia || "") + ' · ' + (done ? "hecha el " + esc(dd) : "falta") + ' · mejor puntaje <b>' + (tHist(r.x.tema).length ? bestOf(r.x.tema) : "—") + '</b></span></p></div>';
  });
  var adv = Object.keys(S.home.adv).filter(function(id){ return S.home.tasks[id]; }), tk = {};
  ((S.agenda && S.agenda.tareas) || []).forEach(function(x){ tk[x.id] = x; });
  h += '<h2 class="sec-title nday">🚀 Tareas adelantadas</h2>';
  if(!adv.length) h += '<section class="card mom"><p class="small">Todavía no ha adelantado tareas.</p></section>';
  else adv.sort(function(a, b){ return S.home.adv[b] - S.home.adv[a]; }).forEach(function(id){
    var x = tk[id] || {titulo:id, materia:""}, dd = ""; try{ dd = new Date(S.home.adv[id]).toLocaleDateString("es", {weekday:"long", day:"numeric", month:"short"}); }catch(e){}
    h += '<div class="nrow done"><span class="regico" aria-hidden="true">🚀</span><p><b>' + esc(x.titulo) + '</b><br><span class="small">' + esc(x.materia || "") + ' · era para el ' + esc(x.fecha ? dayLabel(x.fecha) : "") + ' · la hizo el ' + esc(dd) + '</span></p></div>';
  });
  return h + footer();
}
function renderVoces(){
  var r = voiceReport(), h = momHeader("Voces de este aparato", "mom-go", "← Zona de mamá");
  h += '<section class="card mom"><p>La voz que lee en español depende de las voces que tenga <b>este aparato</b> (la tablet, la Lenovo o el iPhone). Si no tiene una voz en español, lee en español con acento de inglés y la página no lo puede arreglar sola.</p>' +
    '<p class="small">Voces encontradas: <b>' + r.total + '</b> · en español: <b>' + r.es.length + '</b> · en inglés: <b>' + r.en.length + '</b></p>' +
    '<p><b>Voz en español que usa la página:</b><br>' + (r.picked.es ? esc(r.picked.es) : '<span class="err">Ninguna: este aparato no tiene voz en español.</span>') + '</p>' +
    '<p><b>Voz en inglés que usa la página:</b><br>' + (r.picked.en ? esc(r.picked.en) : "Ninguna") + '</p>' +
    '<div class="stack"><button class="btn btn-sun" type="button" data-act="voz-test" data-l="es">🔊 Probar en español</button><button class="btn btn-blue" type="button" data-act="voz-test" data-l="en">🔊 Probar en inglés</button></div>' +
    (r.picked.es ? '<p class="small">Si al probar en español suena con acento de inglés, instala una voz mejor (abajo) y vuelve a abrir la página.</p>' : '') + '</section>' +
    '<section class="card mom"><h2 class="sec-title">Cómo conseguir una voz en español</h2>' +
    '<p><b>Tablet o celular Android:</b> Ajustes → Sistema (o Administración general) → Idioma → <b>Salida de texto a voz</b> → Motor de Google → ⚙️ → <b>Instalar datos de voz</b> → Español (México o EE. UU.).</p>' +
    '<p><b>iPhone / iPad:</b> Ajustes → Accesibilidad → Contenido hablado → Voces → Español → baja una voz <b>«Mejorada»</b> (por ejemplo Paulina o Mónica).</p>' +
    '<p><b>Computadora con Windows:</b> Configuración → Hora e idioma → Voz → Agregar voces → Español (México). En el navegador <b>Edge</b> suenan mejor las voces de Microsoft.</p>' +
    '<p class="small">Después cierra el navegador por completo y ábrelo otra vez.</p></section>';
  return h + footer();
}
var chForm = {titulo:"", materia:"", idioma:"en", texto:"", msg:""};
function renderCharlasMom(){
  var h = momHeader("Charlas", "mom-go", "← Zona de mamá");
  h += '<section class="card mom"><p>Aquí se agregan las charlas o presentaciones orales de Killian. La página las convierte en práctica: escuchar, repetir (con revisión de pronunciación), completar, ordenar y decirlas de memoria.</p>' +
    (S.charlas.length ? S.charlas.map(charlaStatsMom).join("") : '<p class="small">Todavía no hay charlas.</p>') + '</section>';
  h += '<section class="card mom"><h2 class="sec-title">+ Nueva charla</h2>' +
    (chForm.msg ? '<p class="err" role="alert">'+esc(chForm.msg)+'</p>' : '') +
    '<label class="fld" for="chm-titulo"><span>Título</span><input id="chm-titulo" value="'+esc(chForm.titulo)+'"></label>' +
    '<label class="fld" for="chm-materia"><span>Materia</span><input id="chm-materia" value="'+esc(chForm.materia)+'"></label>' +
    '<label class="fld" for="chm-idioma"><span>Idioma de la charla</span><select id="chm-idioma"><option value="en"'+(chForm.idioma === "en" ? " selected" : "")+'>Inglés</option><option value="es"'+(chForm.idioma === "es" ? " selected" : "")+'>Español</option><option value="zh"'+(chForm.idioma === "zh" ? " selected" : "")+'>Chino</option></select></label>' +
    '<label class="fld" for="chm-texto"><span>El texto de la charla (pégalo o escríbelo)</span><textarea id="chm-texto" rows="8">'+esc(chForm.texto)+'</textarea></label>' +
    '<button class="btn btn-sun btn-big" type="button" data-act="chm-add">Guardar charla</button></section>';
  return h + footer();
}
function renderMomMenu(){
  var notas = (S.agenda && S.agenda.notas) || [], nal = computeReport().alertas.filter(function(a){ return a.n === "warn"; }).length;
  var h = momHeader("Zona de mamá") + (momNote ? '<p class="good-note">'+esc(momNote)+'</p>' : '') +
    '<section class="momgrid">' +
    '<button class="tile" type="button" data-act="mom-go" data-v="progreso"><span class="big">📊</span>Progreso y análisis' + (nal ? '<span class="small">' + nal + (nal === 1 ? ' alerta' : ' alertas') + '</span>' : '') + '</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="notas"><span class="big">📌</span>Notas' + (notas.length ? '<span class="small">' + (notasPend() ? notasPend() + ' sin marcar' : 'todo marcado') + '</span>' : '') + '</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="tareas"><span class="big">📖</span>Detalle de tareas</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="charlas"><span class="big">🎤</span>Charlas (' + S.charlas.length + ')</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="voces"><span class="big">🔊</span>Voces del aparato</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="registro"><span class="big">✅</span>Registro de estudio</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="paracopiar"><span class="big">📝</span>Para copiar</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="import"><span class="big">📥</span>Importar agenda o tema</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="weeks"><span class="big">📋</span>Agenda y materiales</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="temas"><span class="big">📚</span>Temas de estudio ('+S.temas.length+')</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="prizes"><span class="big">🎁</span>Premios</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="asks"><span class="big">❓</span>Preguntas de Killian (' + askList().length + ')</button>' +
    '<button class="tile" type="button" data-act="mom-go" data-v="pin"><span class="big">🔑</span>Cambiar PIN</button>' +
    '<button class="tile" type="button" data-act="go-screen" data-s="games"><span class="big">🎮</span>Probar los juegos</button></section>';
  h += '<p class="small" style="text-align:center">El panel de progreso y análisis llega en una próxima etapa.</p>';
  return h + footer();
}
function renderImport(){
  var h = momHeader("Importar", "mom-go", "← Zona de mamá") + (S.agenda === null ? '' : '');
  h += '<section class="card mom"><p>Pega aquí el contenido que te dio Claude (empieza con <b>{</b>) o elige el archivo <b>.json</b>.</p>' +
    '<label class="fld" for="imptext"><span>Contenido</span><textarea id="imptext" rows="9" spellcheck="false" placeholder="{ &quot;tipo&quot;: &quot;agenda&quot;, … }">'+esc(imp.text)+'</textarea></label>' +
    '<label class="fld" for="impfile"><span>o elige un archivo</span><input id="impfile" type="file" accept=".json,.txt,application/json,text/plain"></label>' +
    (imp.msg ? '<p class="err" role="alert">'+esc(imp.msg)+'</p>' : '') +
    (imp.errors.length ? '<div class="err" role="alert"><b>Hay que corregir esto antes de guardar:</b><ul>'+imp.errors.map(function(e){ return '<li>'+esc(e)+'</li>'; }).join("")+'</ul>' +
      '<p>Corrige el archivo (puedes pedirle a Claude que lo arregle y pegarle estos mensajes) y vuelve a pulsar Revisar.</p></div>' : '') +
    '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="imp-check">🔍 Revisar</button>' +
    '<button class="btn btn-ghost" type="button" data-act="imp-sample" data-v="agenda">Cargar una agenda de ejemplo</button>' +
    '<button class="btn btn-ghost" type="button" data-act="imp-sample" data-v="tema">Cargar un tema de ejemplo</button>' +
    '<button class="btn btn-ghost" type="button" data-act="imp-clear">Limpiar</button></div></section>';
  return h + footer();
}
/* Editor: sirve para revisar lo importado y para editar la agenda a mano. */
function inp(kind, i, f, label, v, type){
  return '<label class="fld"><span>'+label+'</span><input type="'+(type||"text")+'" data-e="'+kind+'" data-i="'+i+'" data-f="'+f+'" value="'+esc(v||"")+'"></label>';
}
/* Editor de «Para copiar» dentro de cada tarea. */
function cpInp(i, p, f, label, v, area){
  var attrs = ' data-cp="1" data-i="'+i+'" data-p="'+p+'" data-f="'+f+'"';
  return '<label class="fld"><span>'+label+'</span>' + (area ? '<textarea rows="'+(f === "texto" ? 4 : 3)+'"'+attrs+'>'+esc(v||"")+'</textarea>' : '<input type="text"'+attrs+' value="'+esc(v||"")+'">') + '</label>';
}
function copiarEditor(x, i){
  var c = x.copiar;
  if(!c) return '<button class="btn btn-ghost" type="button" data-act="cp-add" data-i="'+i+'">+ Agregar «Para copiar»</button>';
  var h = '<div class="cpedit"><b>📝 Para copiar</b>' + cpInp(i, -1, "instrucciones_mama", "Para mamá (Killian no lo ve)", c.instrucciones_mama, true);
  (c.partes || []).forEach(function(pt, k){
    h += '<div class="cppart"><b>Parte '+(k + 1)+'</b>' + cpInp(i, k, "titulo", "Título", pt.titulo) + cpInp(i, k, "texto", "Texto que copia", pt.texto, true) +
      cpInp(i, k, "traduccion_es", "Traducción (si está en inglés)", pt.traduccion_es) + cpInp(i, k, "dibujo", "Qué dibujar al lado", pt.dibujo) + cpInp(i, k, "imagen", "Imagen (nombre del archivo en la carpeta img/copiar)", pt.imagen) +
      cpInp(i, k, "tabla", "Tabla (una fila por línea, columnas separadas con |)", (pt.tabla || []).map(function(r){ return r.join(" | "); }).join("\n"), true) +
      '<button class="link-btn del" type="button" data-act="cp-delpart" data-i="'+i+'" data-p="'+k+'">🗑 Quitar esta parte</button></div>';
  });
  return h + '<button class="btn btn-ghost" type="button" data-act="cp-addpart" data-i="'+i+'">+ Agregar parte</button>' +
    '<button class="link-btn del" type="button" data-act="cp-del" data-i="'+i+'">🗑 Quitar «Para copiar»</button></div>';
}
function renderEditor(){
  var d = imp.draft, back = imp.src === "manual" ? ["weeks", "← Agenda"] : ["import", "← Volver"];
  if(!d){ momView = "menu"; return renderMomMenu(); }
  var h = momHeader(imp.kind === "agenda" ? "Revisar la agenda" : "Revisar el tema", "mom-go", back[1]);
  h = h.replace('data-act="mom-go"', 'data-act="mom-go" data-v="'+back[0]+'"');
  if(imp.msg) h += '<p class="err" role="alert">'+esc(imp.msg)+'</p>';
  if(imp.errors.length) h += '<div class="err" role="alert"><b>Corrige esto para guardar:</b><ul>'+imp.errors.map(function(e){ return '<li>'+esc(e)+'</li>'; }).join("")+'</ul></div>';
  if(imp.warnings.length) h += '<div class="warn"><b>Ojo:</b><ul>'+imp.warnings.map(function(e){ return '<li>'+esc(e)+'</li>'; }).join("")+'</ul></div>';
  if(imp.kind === "agenda"){
    h += '<section class="card mom"><label class="fld"><span>Semana (lunes)</span><input id="semana" type="date" value="'+esc(d.semana)+'"></label>' +
      '<h2 class="sec-title">📝 Tareas ('+d.tareas.length+')</h2>' + d.tareas.map(function(x, i){
        return '<div class="erow">'+inp("tareas",i,"materia","Materia",x.materia)+inp("tareas",i,"titulo","Qué hacer",x.titulo)+inp("tareas",i,"detalle","Detalle",x.detalle)+
          inp("tareas",i,"fecha","Se hace el",x.fecha,"date")+inp("tareas",i,"entrega","Entrega",x.entrega,"date")+
          copiarEditor(x, i) + '<button class="link-btn del" type="button" data-act="e-del" data-e="tareas" data-i="'+i+'">🗑 Quitar</button></div>';
      }).join("") + '<button class="btn btn-ghost" type="button" data-act="e-add" data-e="tareas">+ Agregar tarea</button>' +
      '<h2 class="sec-title">🎒 Materiales ('+d.materiales.length+')</h2>' + d.materiales.map(function(x, i){
        return '<div class="erow">'+inp("materiales",i,"materia","Materia",x.materia)+inp("materiales",i,"material","Material",x.material)+inp("materiales",i,"llevar_el","Llevar el",x.llevar_el,"date")+
          '<button class="link-btn del" type="button" data-act="e-del" data-e="materiales" data-i="'+i+'">🗑 Quitar</button></div>';
      }).join("") + '<button class="btn btn-ghost" type="button" data-act="e-add" data-e="materiales">+ Agregar material</button>' +
      '<h2 class="sec-title">🎬 Videos ('+d.videos.length+')</h2>' + d.videos.map(function(x, i){
        return '<div class="erow">'+inp("videos",i,"materia","Materia",x.materia)+inp("videos",i,"titulo","Título",x.titulo)+inp("videos",i,"url","Enlace (https://…)",x.url,"url")+inp("videos",i,"fecha","Verlo el",x.fecha,"date")+
          '<button class="link-btn del" type="button" data-act="e-del" data-e="videos" data-i="'+i+'">🗑 Quitar</button></div>';
      }).join("") + '<button class="btn btn-ghost" type="button" data-act="e-add" data-e="videos">+ Agregar video</button>' +
      '<h2 class="sec-title">📌 Notas para mamá ('+d.notas.length+')</h2>' + d.notas.map(function(x, i){
        return '<div class="erow">'+inp("notas",i,"t","Nota",x)+'<button class="link-btn del" type="button" data-act="e-del" data-e="notas" data-i="'+i+'">🗑 Quitar</button></div>';
      }).join("") + '<button class="btn btn-ghost" type="button" data-act="e-add" data-e="notas">+ Agregar nota</button></section>' +
      '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="e-save">💾 Guardar la agenda</button>' +
      (imp.src === "manual" && imp.exists ? '<button class="btn btn-ghost" type="button" data-act="ask-delweek">🗑 Borrar esta semana</button>' : '') + '</div>';
  } else {
    var ex = temaById(d.id);
    h += '<section class="card mom"><span class="chip">'+esc(d.materia||"Tema")+'</span><h2 class="sec-title">'+esc(d.titulo_es||d.titulo)+'</h2>' +
      (d.titulo_es ? '<p lang="en">'+esc(d.titulo)+'</p>' : '') + (d.fecha_examen ? '<p>🗓️ Examen: '+esc(d.fecha_examen)+'</p>' : '') +
      (ex ? '<p class="warn">Este tema ya existe y se reemplazará con esta versión.</p>' : '') +
      '<p>'+d.preguntas.length+' preguntas · '+d.vocabulario.length+' palabras · '+d.resumen.length+' frases de resumen</p>' +
      '<h3 class="sec-title">Resumen</h3>' + d.resumen.map(function(r, i){
        return '<div class="srow"><span class="semo">'+esc(r.emoji||"📌")+'</span><div><b lang="en">'+esc(r.en)+'</b><p>'+esc(r.es)+'</p></div><button class="link-btn del" type="button" data-act="e-del" data-e="resumen" data-i="'+i+'">🗑</button></div>';
      }).join("") +
      '<h3 class="sec-title">Preguntas</h3>' + d.preguntas.map(function(q, i){
        return '<div class="srow"><div style="flex:1;min-width:0"><span class="pill">'+esc(q.tipo.replace("_"," "))+'</span><p lang="en"><b>'+esc(q.pregunta_en)+'</b></p>' +
          (q.explicacion_es ? '<p class="small">'+esc(q.explicacion_es)+'</p>' : '') + '</div><button class="link-btn del" type="button" data-act="e-del" data-e="preguntas" data-i="'+i+'">🗑</button></div>';
      }).join("") +
      '<h3 class="sec-title">Vocabulario</h3>' + d.vocabulario.map(function(v, i){
        return '<div class="srow"><div style="flex:1"><b lang="en">'+esc(v.en)+'</b> → '+esc(v.es)+'</div><button class="link-btn del" type="button" data-act="e-del" data-e="vocabulario" data-i="'+i+'">🗑</button></div>';
      }).join("") + '</section>' +
      '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="e-save">💾 Guardar el tema</button></div>';
  }
  return h + footer();
}
function renderWeeks(){
  var ws = weeksList(), t = todayKey(), h = momHeader("Agenda y materiales", "mom-go", "← Zona de mamá");
  h += '<section class="card mom"><p>Elige una semana para ver o corregir sus tareas, materiales y videos.</p><div class="stack">' +
    ws.map(function(w){
      var ag = S.agenda, n = ag.tareas.filter(function(x){ return x.semana === w; }).length, m = ag.materiales.filter(function(x){ return x.semana === w; }).length, v = ag.videos.filter(function(x){ return x.semana === w; }).length;
      return '<button class="btn btn-blue" type="button" data-act="week-edit" data-v="'+esc(w)+'">Semana del '+esc(w)+' · '+n+' tareas · '+m+' materiales · '+v+' videos</button>';
    }).join("") + (ws.length ? "" : '<p class="small">Todavía no hay una agenda cargada. Usa «Importar» o crea una semana a mano.</p>') +
    '<button class="btn btn-sun" type="button" data-act="week-new">+ Nueva semana a mano</button></div></section>';
  return h + footer();
}
function renderTemasMom(){
  var h = momHeader("Temas de estudio", "mom-go", "← Zona de mamá");
  h += '<section class="card mom">' + (S.temas.length ? S.temas.map(function(t){
    return '<div class="srow"><div style="flex:1;min-width:0"><b>'+esc(t.titulo_es||t.titulo)+'</b><p class="small">'+esc(t.materia||"")+' · '+t.preguntas.length+' preguntas · '+t.vocabulario.length+' palabras'+(t.fecha_examen ? ' · examen '+esc(t.fecha_examen) : '')+'</p></div>' +
      '<button class="link-btn del" type="button" data-act="ask-deltema" data-id="'+esc(t.id)+'">🗑 Borrar</button></div>';
  }).join("") : '<p>Todavía no hay temas cargados. Usa «Importar».</p>') + '</section>' +
  '<p class="small" style="text-align:center">El tema de OVER-/UNDER- viene incluido en la página y no se borra.</p>';
  return h + footer();
}

/* ---- Preguntas de Killian (palabras que el búho no supo) ---- */
function askList(){
  var m = S.home.ask, out = [];
  Object.keys(m).forEach(function(k){
    if(m[k] > 0){ var i = k.indexOf(":"); out.push({key:k, dir:k.slice(0, i), w:k.slice(i + 1), ts:m[k]}); }
  });
  return out.sort(function(a, b){ return b.ts - a.ts; });
}
function renderAsks(){
  var list = askList(), h = momHeader("Preguntas de Killian", "mom-go", "← Zona de mamá");
  if(momNote) h += '<p class="good-note">' + esc(momNote) + '</p>';
  h += '<section class="card mom"><p>Estas son las palabras que Killian le preguntó al búho y no encontró. Escribe su significado y el búho la usará la próxima vez.</p>' +
    (list.length ? list.map(function(a, i){
      var en = a.dir === "en";
      return '<div class="erow"><div><b' + (en ? ' lang="en"' : '') + '>' + esc(a.w) + '</b> <span class="small">(' + (en ? "en inglés" : "en español") + ')</span></div>' +
        '<label class="fld"><span>' + (en ? "Significado en español" : "Cómo se dice en inglés") + '</span><input id="as-' + i + '" type="text" maxlength="80"></label>' +
        '<div class="stack"><button class="btn btn-sun" type="button" data-act="ask-save" data-i="' + i + '">Guardar para el búho</button>' +
        '<button class="link-btn del" type="button" data-act="ask-drop" data-i="' + i + '">Quitar de la lista</button></div></div>';
    }).join("") : '<p class="note">🎉 No hay preguntas pendientes.</p>') + '</section>';
  return h + footer();
}

/* ---- Guardar ---- */
function applyAgenda(d){
  var sem = d.semana, ag = S.agenda || {tareas:[], materiales:[], videos:[], notas:[]}, pre = sem + ":";
  function keep(x){ return x.semana !== sem; }
  ag.tareas = ag.tareas.filter(keep).concat(d.tareas.map(function(x){ return {id:pre + x.id, semana:sem, materia:x.materia, titulo:x.titulo, detalle:x.detalle, fecha:x.fecha, entrega:x.entrega, evaluacion:x.evaluacion||"", en_casa:x.en_casa||[], repaso:x.repaso||[], videos:(x.videos||[]).map(function(v){ return pre + v; }), charla:x.charla||"", tema:x.tema||"", copiar:x.copiar||null}; }));
  ag.materiales = ag.materiales.filter(keep).concat(d.materiales.map(function(x){ return {id:pre + x.id, semana:sem, materia:x.materia, material:x.material, llevar_el:x.llevar_el}; }));
  ag.videos = ag.videos.filter(keep).concat(d.videos.map(function(x){ return {id:pre + x.id, semana:sem, materia:x.materia, titulo:x.titulo, url:x.url, fecha:x.fecha}; }));
  ag.notas = (ag.notas || []).filter(keep).concat(d.notas.filter(function(n){ return str(n); }).map(function(n){ return {semana:sem, texto:str(n)}; }));
  var firstReal = !S.agenda;
  S.agenda = ag; saveContent();
  if(firstReal){
    ["tasks","vids","mats","have","days"].forEach(function(m){ Object.keys(S.home[m]).forEach(function(k){ if(/^(d-|demo:)/.test(k)) delete S.home[m][k]; }); });
    saveHome();
  }
}
function draftFromWeek(sem){
  var ag = S.agenda || {tareas:[], materiales:[], videos:[], notas:[]}, pre = sem + ":";
  function id(x){ return String(x.id).indexOf(pre) === 0 ? String(x.id).slice(pre.length) : x.id; }
  function w(x){ return x.semana === sem; }
  return {semana:sem,
    tareas:ag.tareas.filter(w).map(function(x){ return {id:id(x), materia:x.materia||"", titulo:x.titulo||"", detalle:x.detalle||"", fecha:x.fecha||"", entrega:x.entrega||"", evaluacion:x.evaluacion||"", en_casa:x.en_casa||[], repaso:x.repaso||[], videos:(x.videos||[]).map(function(v){ return String(v).indexOf(pre) === 0 ? String(v).slice(pre.length) : v; }), charla:x.charla||"", tema:x.tema||"", copiar:x.copiar||null}; }),
    materiales:ag.materiales.filter(w).map(function(x){ return {id:id(x), materia:x.materia||"", material:x.material||"", llevar_el:x.llevar_el||""}; }),
    videos:ag.videos.filter(w).map(function(x){ return {id:id(x), materia:x.materia||"", titulo:x.titulo||"", url:x.url||"", fecha:x.fecha||""}; }),
    notas:(ag.notas||[]).filter(w).map(function(n){ return n.texto; })};
}
function newId(p){ return p + Date.now().toString(36) + Math.floor(Math.random()*1000).toString(36); }
function sampleAgendaText(){
  var t = todayKey(), mon = mondayOf(t);
  return JSON.stringify({tipo:"agenda", semana:mon,
    tareas:[{id:"t1", materia:"Math", titulo:"Páginas 34 y 35 del libro", detalle:"Sumas con llevada", fecha:addDays(mon,1), entrega:addDays(mon,2)},
            {id:"t2", materia:"Spanish", titulo:"Leer la lectura y copiar 5 palabras", detalle:"", fecha:addDays(mon,2), entrega:addDays(mon,3)},
            {id:"t3", materia:"Science", titulo:"Dibujar el ciclo del agua", detalle:"Con colores", fecha:addDays(mon,3), entrega:addDays(mon,4)}],
    materiales:[{id:"m1", materia:"Art", material:"Cartulina azul y tijeras", llevar_el:addDays(mon,3)}, {id:"m2", materia:"Science", material:"Una botella plástica vacía", llevar_el:addDays(mon,4)}],
    videos:[{id:"v1", materia:"Science", titulo:"The Water Cycle", url:"https://www.youtube.com/results?search_query=water+cycle+for+kids", fecha:addDays(mon,1)}],
    notas_para_mama:["Reunión de padres el viernes"]}, null, 2);
}

/* ---- Clics y escritura de la zona de mamá ---- */
function extraClick(act, el, ev){
  if(gamesClick(act, el)) return true;
  switch(act){
    case "go-mom": momView = "menu"; momNote = ""; pinMsg = ""; S.screen = "mom"; helperOpen = false; writeLocal(); render({top:true}); return true;
    case "pin-go": pinGo(); return true;
    case "mom-go":
      var v = el.getAttribute("data-v") || "menu";
      momView = v; pinMsg = ""; momNote = ""; progMsg = "";
      if(v === "import"){ imp.msg = ""; imp.errors = []; }
      if(v === "pin"){ momOk = true; }
      render({top:true}); return true;
    case "imp-clear": imp = {text:"", msg:"", kind:null, draft:null, errors:[], warnings:[], src:"import"}; render(); return true;
    case "imp-sample":
      if(el.getAttribute("data-v") === "agenda"){ imp.text = sampleAgendaText(); imp.msg = ""; imp.errors = []; render(); }
      else fetch("ejemplos/tema-ejemplo.json").then(function(r){ if(!r.ok) throw 0; return r.text(); }).then(function(t){ imp.text = t; imp.msg = ""; imp.errors = []; render(); })
        .catch(function(){ imp.msg = "No pude cargar el ejemplo (¿hay internet?)."; render(); });
      return true;
    case "imp-check":
      imp.text = val("imptext") || imp.text; imp.msg = ""; imp.errors = []; imp.warnings = [];
      var pr = parseImportText(imp.text);
      if(!pr.ok){ imp.msg = pr.msg; render(); return true; }
      var o = pr.obj;
      if(!o || typeof o !== "object" || Array.isArray(o)){ imp.msg = "El contenido debe ser un solo bloque que empiece con { ."; render(); return true; }
      var res;
      if(o.tipo === "agenda") res = validateAgenda(o);
      else if(o.tipo === "tema") res = validateTema(o);
      else { imp.msg = "Falta el campo «tipo»: debe decir \"agenda\" o \"tema\"."; render(); return true; }
      imp.kind = o.tipo; imp.draft = res.draft; imp.errors = res.errors; imp.warnings = res.warnings; imp.src = "import"; imp.exists = false;
      if(!res.errors.length){ momView = "preview"; render({top:true}); } else render();
      return true;
    case "week-edit": imp = {text:"", msg:"", kind:"agenda", draft:draftFromWeek(el.getAttribute("data-v")), errors:[], warnings:[], src:"manual", exists:true}; momView = "edit"; render({top:true}); return true;
    case "week-new":
      imp = {text:"", msg:"", kind:"agenda", draft:{semana:mondayOf(todayKey()), tareas:[], materiales:[], videos:[], notas:[]}, errors:[], warnings:[], src:"manual", exists:false};
      momView = "edit"; render({top:true}); return true;
    case "e-add":
      var k = el.getAttribute("data-e"), d = imp.draft, t = todayKey();
      if(k === "tareas") d.tareas.push({id:newId("t"), materia:"", titulo:"", detalle:"", fecha:t, entrega:""});
      if(k === "materiales") d.materiales.push({id:newId("m"), materia:"", material:"", llevar_el:t});
      if(k === "videos") d.videos.push({id:newId("v"), materia:"", titulo:"", url:"", fecha:t});
      if(k === "notas") d.notas.push("");
      render(); return true;
    case "e-del":
      imp.draft[el.getAttribute("data-e")].splice(+el.getAttribute("data-i"), 1); render(); return true;
    case "e-save":
      imp.msg = ""; imp.errors = [];
      if(imp.kind === "agenda"){
        var d2 = imp.draft;
        var chk = validateAgenda({tipo:"agenda", semana:d2.semana, tareas:d2.tareas, materiales:d2.materiales, videos:d2.videos, notas_para_mama:d2.notas});
        if(chk.errors.length){ imp.errors = chk.errors; imp.warnings = chk.warnings; render(); return true; }
        applyAgenda(chk.draft); momNote = "✅ Agenda guardada: semana del " + chk.draft.semana + ".";
      } else {
        var t2 = imp.draft, i, found = false;
        if(!t2.preguntas.length){ imp.errors = ["El tema debe tener al menos una pregunta."]; render(); return true; }
        for(i=0;i<S.temas.length;i++) if(S.temas[i].id === t2.id){ S.temas[i] = t2; found = true; }
        if(!found) S.temas.push(t2);
        saveContent(); momNote = "✅ Tema guardado: " + (t2.titulo_es || t2.titulo) + ".";
      }
      imp.draft = null; imp.text = ""; momView = "menu"; render({top:true}); return true;
    case "ask-save":
      var al = askList(), ai = +el.getAttribute("data-i"), a0 = al[ai], tx = (val("as-" + ai) || "").trim();
      if(!a0 || !tx){ render(); return true; }
      S.custom = (S.custom || []).concat([a0.dir === "en" ? {en:a0.w, es:tx} : {en:tx, es:a0.w}]);
      S.home.ask[a0.key] = -Date.now(); saveContent(); saveHome(); momNote = "✅ Guardada: el búho ya conoce «" + a0.w + "»."; render(); return true;
    case "ask-drop":
      var al2 = askList(), a1 = al2[+el.getAttribute("data-i")]; if(a1){ S.home.ask[a1.key] = -Date.now(); saveHome(); } render(); return true;
    case "ask-deltema": modal = {type:"deltema", id:el.getAttribute("data-id")}; render(); return true;
    case "do-deltema":
      S.temas = S.temas.filter(function(x){ return x.id !== modal.id; }); modal = null; saveContent(); render(); return true;
    case "ask-delweek": modal = {type:"delweek", sem:imp.draft.semana}; render(); return true;
    case "do-delweek":
      var sem = modal.sem; modal = null;
      if(S.agenda){ ["tareas","materiales","videos","notas"].forEach(function(kk){ S.agenda[kk] = (S.agenda[kk] || []).filter(function(x){ return x.semana !== sem; }); }); }
      saveContent(); imp.draft = null; momView = "weeks"; momNote = "Semana borrada."; render({top:true}); return true;
    /* tareas y materiales */
    case "mom-showdone": var sv = el.getAttribute("data-v"); momShowDone[sv] = !momShowDone[sv]; render(); return true;
    case "mom-task-done": markDone("task", el.getAttribute("data-id")); momNote = "✅ Tarea marcada como hecha."; render(); return true;
    case "cp-add": imp.draft.tareas[+el.getAttribute("data-i")].copiar = {instrucciones_mama:"", partes:[{titulo:"1. ", texto:"", traduccion_es:"", dibujo:"", imagen:"", tabla:[]}]}; render(); return true;
    case "cp-addpart": var cc1 = imp.draft.tareas[+el.getAttribute("data-i")].copiar; cc1.partes.push({titulo:(cc1.partes.length + 1) + ". ", texto:"", traduccion_es:"", dibujo:"", imagen:"", tabla:[]}); render(); return true;
    case "cp-delpart": imp.draft.tareas[+el.getAttribute("data-i")].copiar.partes.splice(+el.getAttribute("data-p"), 1); render(); return true;
    case "cp-del": imp.draft.tareas[+el.getAttribute("data-i")].copiar = null; render(); return true;
    case "voz-test": var vl = el.getAttribute("data-l"); speak(vl === "es" ? "Hola, soy tu voz en español. Los adverbios dicen dónde, cuándo y cómo pasa algo." : "Hello, I am your English voice. Rose lived in a small town.", vl); return true;
    case "chm-add":
      chForm = {titulo:val("chm-titulo"), materia:val("chm-materia"), idioma:val("chm-idioma") || "en", texto:val("chm-texto"), msg:""};
      var fr = splitFrases(chForm.texto), cid = (chForm.titulo || "charla").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "charla";
      var cv = validateCharla({id:cid, titulo:chForm.titulo, materia:chForm.materia, idioma:chForm.idioma, frases:fr});
      if(cv.errors.length){ chForm.msg = cv.errors.join(" "); render(); return true; }
      S.charlas = S.charlas.filter(function(c){ return c.id !== cid; }).concat([cv.draft]); saveContent();
      chForm = {titulo:"", materia:"", idioma:"en", texto:"", msg:""}; momNote = "✅ Charla guardada."; render({top:true}); return true;
    case "chm-del": var did = el.getAttribute("data-id"); S.charlas = S.charlas.filter(function(c){ return c.id !== did; }); saveContent(); render(); return true;
    case "nchk":
      var nk = el.getAttribute("data-id");
      S.home.nchk[nk] = S.home.nchk[nk] > 0 ? -Date.now() : Date.now();
      saveHome(); render(); return true;
    case "have":
      var id = el.getAttribute("data-id");
      S.home.have[id] = S.home.have[id] > 0 ? -Date.now() : Date.now();   /* negativo = quitado; gana el más reciente */
      saveHome(); render(); return true;
    case "study": studyId = el.getAttribute("data-id"); S.screen = "study"; writeLocal(); render({top:true}); return true;
    /* diccionario */
    case "dict-open": dict.topic = el.getAttribute("data-id"); dict.flip = {}; dict.quiz = null; S.screen = "dict"; writeLocal(); render({top:true}); return true;
    case "dict-back": dict.topic = null; dict.quiz = null; render({top:true}); return true;
    case "flip": var fi = el.getAttribute("data-i"); dict.flip[fi] = !dict.flip[fi]; render(); return true;
    case "dict-play": startQuiz2(topicById(dict.topic)); render({top:true}); return true;
    case "dict-end": dict.quiz = null; render({top:true}); return true;
    case "dict-pick":
      var qz = dict.quiz, it = qz.items[qz.i]; if(it.pick !== null) return true;
      it.pick = el.getAttribute("data-v");
      if(it.pick === it.w.es){
        qz.ok++; var kk = wkey(it.w._tid || dict.topic, it.w);
        S.home.known[kk] = S.home.known[kk] || Date.now();
        if(S.home.weak[kk] > 0) S.home.weak[kk] = -Date.now();
        saveHome();
      } else { noteFail(it.w._tid || dict.topic, it.w); saveHome(); }
      render(); return true;
    case "dict-next":
      var q3 = dict.quiz;
      if(q3.i >= q3.items.length - 1){ q3.done = true; gameDone(); } else q3.i++;
      render({top:true}); return true;
  }
  return false;
}
function extraInput(ev){
  var t = ev.target;
  if(t.id === "imptext"){ imp.text = t.value; return true; }
  if(t.id === "semana" && imp.draft){ imp.draft.semana = t.value; return true; }
  if(t.getAttribute && t.getAttribute("data-cp") && imp.draft){
    var ti = +t.getAttribute("data-i"), pi = +t.getAttribute("data-p"), ff = t.getAttribute("data-f"), cx = imp.draft.tareas[ti] && imp.draft.tareas[ti].copiar;
    if(cx){
      if(pi < 0) cx[ff] = t.value;
      else if(cx.partes[pi]) cx.partes[pi][ff] = ff === "tabla" ? t.value.split(/\n/).map(function(l){ return l.trim(); }).filter(Boolean).map(function(l){ return l.split("|").map(function(c2){ return c2.trim(); }); }) : t.value;
    }
    return true;
  }
  var e = t.getAttribute && t.getAttribute("data-e");
  if(e && imp.draft){
    var i = +t.getAttribute("data-i"), f = t.getAttribute("data-f");
    if(e === "notas") imp.draft.notas[i] = t.value; else if(imp.draft[e] && imp.draft[e][i]) imp.draft[e][i][f] = t.value;
    return true;
  }
  return false;
}

