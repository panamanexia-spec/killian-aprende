"use strict";

/* ================================================================== NÚCLEO ===
   Estado, guardado en el aparato y en la nube, pantalla de entrada, ventanas,
   dibujo de pantallas y eventos. */
var STORE_KEY = "kx-over-under-v1";
var MAMA = window.KX_MODE === "mama";      /* versión para el celular de mamá: abre directo la zona de mamá */
var LET = ["A","B","C","D","E","F"];

/* ------------------------------------------------------------------ ESTADO */
var HMAPS = ["tasks","mats","vids","days","have","known","gdays","weak","look","lookTr","ask","mins","wfail","redeem","nchk","chd","chl","chs","chr","chv","apr","pxd","adv"], HNUMS = ["best","tries","prac","games","speed"];
var SIGNED = {have:1, weak:1, ask:1, nchk:1};   /* positivo = sí, negativo = quitado; gana el más reciente */
function freshHome(){ return {tasks:{}, mats:{}, vids:{}, days:{}, have:{}, known:{}, gdays:{}, weak:{}, look:{}, lookTr:{}, ask:{}, mins:{}, wfail:{}, redeem:{}, nchk:{}, chd:{}, chl:{}, chs:{}, chr:{}, chv:{}, apr:{}, pxd:{}, adv:{}, best:0, tries:0, prac:0, games:0, speed:0}; }
function freshEx(){ return {cur:null, hist:{}}; }
function fresh(){ return {screen:"home", tid:"", home:freshHome(), ex:freshEx(), at:0, agenda:null, temas:[], charlas:[], custom:[], prizes:[], pinHash:"", pinSalt:"", cAt:0, fileSig:{agenda:"", temas:{}, charlas:{}}}; }
function normHome(h){
  var o = freshHome();
  if(!h || typeof h !== "object") return o;
  HMAPS.forEach(function(k){ if(h[k] && typeof h[k] === "object") o[k] = h[k]; });
  HNUMS.forEach(function(k){ o[k] = +h[k] || 0; });
  return o;
}
function mergeHome(a, b){
  a = normHome(a); b = normHome(b);
  var o = freshHome();
  HMAPS.forEach(function(k){
    var m = {}, i;
    for(i in a[k]) m[i] = a[k][i];
    for(i in b[k]){
      if(!(i in m)) m[i] = b[k][i];
      else if(SIGNED[k]) m[i] = Math.abs(b[k][i]) > Math.abs(m[i]) ? b[k][i] : m[i];
      else if(k === "gdays" || k === "look" || k === "mins" || k === "wfail" || k === "chd" || k === "chl" || k === "chs" || k === "chr" || k === "chv" || k === "pxd") m[i] = Math.max(b[k][i], m[i]);
      else if(k === "lookTr") m[i] = m[i];                  /* se queda la traducción que ya había */
      else if(b[k][i] < m[i]) m[i] = b[k][i];            /* se conserva la primera vez */
    }
    o[k] = m;
  });
  HNUMS.forEach(function(k){ o[k] = Math.max(a[k], b[k]); });
  return o;
}
function homeEq(a, b){
  a = normHome(a); b = normHome(b);
  var ok = HMAPS.every(function(k){
    var ka = Object.keys(a[k]), kb = Object.keys(b[k]);
    return ka.length === kb.length && ka.every(function(i){ return a[k][i] === b[k][i]; });
  });
  return ok && HNUMS.every(function(k){ return a[k] === b[k]; });
}
function homeEmpty(h){ return homeEq(h, freshHome()); }
/* Exámenes: el intento en curso y el historial de intentos de cada tema. */
function normEx(e){
  var o = freshEx();
  if(!e || typeof e !== "object") return o;
  var c = e.cur;
  if(c && typeof c === "object" && c.tema && c.tema.id && Array.isArray(c.qs) && c.qs.length && c.answers && typeof c.answers === "object" &&
     ["q","vocab","res"].indexOf(c.phase) >= 0){
    c.idx = Math.min(Math.max(+c.idx || 0, 0), c.qs.length - 1);
    o.cur = c;
  }
  if(e.hist && typeof e.hist === "object") Object.keys(e.hist).forEach(function(k){ if(Array.isArray(e.hist[k])) o.hist[k] = e.hist[k].slice(-30); });
  return o;
}
/* Agenda, temas y PIN: se revisan al leerlos para que un dato dañado no rompa la página. */
function normContent(c){
  var o = {agenda:null, temas:[], custom:[], charlas:[], prizes:[], pinHash:"", pinSalt:"", cAt:0, fileSig:{agenda:"", temas:{}, charlas:{}}};
  if(!c || typeof c !== "object") return o;
  if(c.fileSig && typeof c.fileSig === "object"){ o.fileSig.agenda = String(c.fileSig.agenda || ""); if(c.fileSig.temas && typeof c.fileSig.temas === "object") o.fileSig.temas = c.fileSig.temas; if(c.fileSig.charlas && typeof c.fileSig.charlas === "object") o.fileSig.charlas = c.fileSig.charlas; }
  var a = c.agenda;
  if(a && typeof a === "object" && Array.isArray(a.tareas) && Array.isArray(a.materiales) && Array.isArray(a.videos)){
    o.agenda = {tareas:a.tareas.filter(function(x){ return x && x.id && x.fecha; }),
      materiales:a.materiales.filter(function(x){ return x && x.id && x.llevar_el; }),
      videos:a.videos.filter(function(x){ return x && x.id && x.fecha; }),
      notas:Array.isArray(a.notas) ? a.notas.filter(function(n){ return n && n.texto; }) : []};
  }
  if(Array.isArray(c.temas)) o.temas = c.temas.filter(function(t){
    return t && t.id && Array.isArray(t.preguntas) && Array.isArray(t.vocabulario) && Array.isArray(t.resumen);
  });
  if(Array.isArray(c.charlas)) o.charlas = c.charlas.filter(function(x){ return x && x.id && x.titulo && /^(en|es|zh)$/.test(x.idioma) && Array.isArray(x.frases) && x.frases.length; }).slice(0, 60);
  if(Array.isArray(c.custom)) o.custom = c.custom.filter(function(w){ return w && typeof w.en === "string" && typeof w.es === "string" && w.en && w.es; }).slice(0, 500);
  if(Array.isArray(c.prizes)) o.prizes = c.prizes.filter(function(p){ return p && p.id && p.nombre && +p.costo >= 1; }).slice(0, 30);
  if(typeof c.pinHash === "string") o.pinHash = c.pinHash;
  if(typeof c.pinSalt === "string") o.pinSalt = c.pinSalt;
  o.cAt = +c.cAt || 0;
  return o;
}
function normalize(s){
  try{
    if(!s || typeof s !== "object") return fresh();
    var o = fresh();
    o.screen = ["home","topics","tema","stars","dict","study","mom","games","exam","vocab","results"].indexOf(s.screen) >= 0 ? s.screen : "home";
    o.tid = typeof s.tid === "string" ? s.tid : "";
    o.home = normHome(s.home);
    o.ex = normEx(s.ex);
    o.at = +s.at || 0;
    var nc = normContent(s);
    o.agenda = nc.agenda; o.temas = nc.temas; o.charlas = nc.charlas; o.custom = nc.custom; o.prizes = nc.prizes; o.pinHash = nc.pinHash; o.pinSalt = nc.pinSalt; o.cAt = nc.cAt; o.fileSig = nc.fileSig;
    return o;
  }catch(e){ return fresh(); }
}
function load(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    if(!raw) return fresh();
    var n = normalize(JSON.parse(raw)), c = n.ex.cur;
    /* Al abrir, Killian ve el inicio; si dejó un examen a medias, lo sigue. */
    if(!(c && ((n.screen === "exam" && c.phase === "q") || (n.screen === "vocab" && c.phase === "vocab")))) n.screen = "home";
    return n;
  }catch(e){ return fresh(); }
}
var S = load();
if(MAMA) S.screen = "mom";

function rowExam(){ return {at:S.at, ex:S.ex}; }
function rowContent(){ return {cAt:S.cAt, agenda:S.agenda, temas:S.temas, charlas:S.charlas, custom:S.custom, prizes:S.prizes, pinHash:S.pinHash, pinSalt:S.pinSalt, fileSig:S.fileSig}; }
function writeLocal(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }catch(e){} }
/* Cada parte se guarda aparte: así un aparato no pisa lo que otro cambió en otra parte. */
function save(){ S.at = Date.now(); writeLocal(); if(window.KXSync) KXSync.push("examen", rowExam()); }
function saveHome(){ writeLocal(); if(window.KXSync) KXSync.push("inicio", S.home); }
function saveContent(){ S.cAt = Date.now(); writeLocal(); if(window.KXSync) KXSync.push("contenido", rowContent()); }
function clearSaved(){ try{ localStorage.removeItem(STORE_KEY); }catch(e){} }

function isTyping(){ var a = document.activeElement; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA"); }
/* Trae de la nube lo más reciente. Examen y contenido: gana el cambio más nuevo. Inicio (tareas, estrellas): se juntan los de todos los aparatos. */
function reconcile(){
  if(!window.KXSync || !KXSync.hasSession() || KXSync.hasPending()) return Promise.resolve();
  return KXSync.pull().then(function(r){
    if(!r.ok || KXSync.hasPending() || isTyping()) return;
    var rows = r.rows, changed = false, pushed = false;
    var re = rows.examen, mine = S.at || 0, hasEx = !!(re && re.ex && typeof re.ex === "object");
    if(hasEx && (re.at || 0) > mine){
      S.ex = normEx(re.ex); S.at = re.at; changed = true; modal = null;
      var c = S.ex.cur;
      if((S.screen === "exam" && !(c && c.phase === "q")) || (S.screen === "vocab" && !(c && c.phase === "vocab")) || (S.screen === "results" && !(c && c.phase === "res"))) S.screen = "home";
    } else if(mine > 0 && (!hasEx || mine > (re.at || 0))){ KXSync.push("examen", rowExam()); pushed = true; }
    var rh = rows.inicio, merged = mergeHome(S.home, rh);
    if(!homeEq(merged, S.home)){ S.home = merged; changed = true; }
    if(!homeEmpty(S.home) && (!rh || !homeEq(merged, rh))){ KXSync.push("inicio", S.home); pushed = true; }
    var rc = rows.contenido, mineC = S.cAt || 0;
    if(rc && (rc.cAt || 0) > mineC){
      var nc = normContent(rc);
      S.agenda = nc.agenda; S.temas = nc.temas; S.charlas = nc.charlas; S.custom = nc.custom; S.prizes = nc.prizes; S.pinHash = nc.pinHash; S.pinSalt = nc.pinSalt; S.cAt = nc.cAt; S.fileSig = nc.fileSig; changed = true;
    } else if(mineC > 0 && (!rc || mineC > (rc.cAt || 0))){ KXSync.push("contenido", rowContent()); pushed = true; }
    if(rows.grabaciones && grMerge(rows.grabaciones)){ changed = true; }
    if(window.GR && GR.items.length && (!rows.grabaciones || GR.items.length > (rows.grabaciones.items || []).length)){ KXSync.push("grabaciones", GR); pushed = true; }
    writeLocal();
    if(!pushed) KXSync.markOk();
    if(changed) render();
  });
}

/* ------------------------------------------------------------------ UTILES */
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function blankHtml(prompt){ return esc(prompt).replace(/_{3,}/g, '<span class="blank">______</span>'); }
function filledHtml(prompt, word){ return esc(prompt).replace(/_{3,}/g, "<mark>"+esc(String(word).toUpperCase())+"</mark>"); }
function shuffle(a){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j = Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
var modal = null, filter = "all", helperOpen = false;
var app = document.getElementById("app");
function header(){
  return '<header class="top"><div class="brand"><svg aria-hidden="true"><use href="#owl"/></svg><b>English Practice<br>with Killian</b></div>' +
    '<button class="link-btn" data-act="home" type="button">🏠 Inicio</button></header>';
}

function renderFab(){
  if(MAMA) return "";
  var b = renderHelper();
  var small = S.screen === "exam" || S.screen === "vocab" || (S.screen === "games" && gm.game) || (S.screen === "dict" && dict.quiz);
  return b + '<button class="fab' + (small ? ' small' : '') + '" type="button" data-act="helper" aria-label="Mi ayudante"><svg aria-hidden="true"><use href="#owl"/></svg></button>';
}


var SYNC_TXT = {
  ok:["☁️ Guardado en la nube", ""], syncing:["☁️ Guardando…", ""],
  offline:["📴 Sin internet: tu progreso se guardará al volver", "bad"],
  error:["⚠️ No se pudo guardar en la nube. Reintentando…", "bad"],
  none:["Tu progreso se guarda en este aparato.", ""]
};
function syncText(s){ return (SYNC_TXT[s] || SYNC_TXT.none); }
function footer(){
  var st = window.KXSync ? KXSync.status : "none", t = syncText(st);
  return '<footer class="foot"><span id="syncst" class="syncst '+t[1]+'">'+t[0]+'</span><span class="small" style="opacity:.6">versión '+KX_VERSION+'</span>' +
    (S.screen === "home" ? '<button class="link-btn" data-act="go-mom" type="button">🔒 Zona de mamá</button>' : '') +
    (S.screen === "tema" && tHist(S.tid).length ? '<button class="link-btn" data-act="ask-reset" type="button">↺ Borrar los exámenes de este tema</button>' : '') +
    (window.KXSync && KXSync.enabled ? '<button class="link-btn" data-act="ask-logout" type="button">Cerrar sesión en este aparato</button>' : '') +
    '</footer>';
}
function setSyncStatus(s){
  var el = document.getElementById("syncst");
  if(!el) return;
  var t = syncText(s);
  el.textContent = t[0]; el.className = "syncst " + t[1];
}


/* ---------------------------------------------------------------- ENTRADA */
var auth = {mode:"in", email:"", pass:"", msg:"", kind:"", busy:false};
function authError(e){
  var m = String((e && e.message) || e || "");
  if(/invalid login/i.test(m)) return "El correo o la contraseña no coinciden.";
  if(/not confirmed/i.test(m)) return "Falta confirmar tu correo. Abre el mensaje que te enviamos y pulsa el enlace.";
  if(/already registered/i.test(m)) return "Ese correo ya tiene cuenta. Pulsa «Ya tengo cuenta» para entrar.";
  if(/password/i.test(m) && /6|short|weak/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
  if(/valid email|invalid.*email/i.test(m)) return "Escribe un correo válido.";
  if(/rate limit|too many/i.test(m)) return "Hubo muchos intentos. Espera unos minutos y vuelve a probar.";
  if(!navigator.onLine || /fetch|network|failed/i.test(m)) return "No hay internet. Conéctate y vuelve a intentar.";
  return "No se pudo entrar. Revisa tus datos e intenta otra vez.";
}
function renderAuth(){
  var up = auth.mode === "up";
  return '<header class="top"><div class="brand"><svg aria-hidden="true"><use href="#owl"/></svg><b>English Practice<br>with Killian</b></div></header>' +
  '<main class="card auth">' +
    '<svg class="owl" aria-hidden="true"><use href="#owl"/></svg>' +
    '<h1>'+(up ? "Crear la cuenta de mamá" : "Entrar")+'</h1>' +
    '<p>Mamá, entra <b>una sola vez</b> en este aparato. Después Killian ya no tendrá que escribir nada y su progreso será el mismo en la tablet, el celular y la computadora.</p>' +
    (auth.msg ? '<p class="'+(auth.kind==="ok"?"good":"err")+'" role="alert">'+esc(auth.msg)+'</p>' : '') +
    '<form id="authform" novalidate>' +
      '<label for="email">Correo</label><input id="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" value="'+esc(auth.email)+'">' +
      '<label for="pass">Contraseña</label><input id="pass" type="password" autocomplete="'+(up?"new-password":"current-password")+'" value="'+esc(auth.pass)+'">' +
      '<button class="btn btn-sun btn-big" type="submit" data-act="auth-go"'+(auth.busy?' disabled':'')+'>'+(auth.busy ? "Un momento…" : (up ? "CREAR CUENTA" : "ENTRAR"))+'</button>' +
    '</form>' +
    '<button class="link-btn" type="button" data-act="auth-toggle">'+(up ? "Ya tengo cuenta" : "Es la primera vez: crear cuenta")+'</button>' +
  '</main>';
}
function doAuth(){
  if(auth.busy) return;
  var email = auth.email.trim(), pass = auth.pass;
  if(!email || !pass){ auth.msg = "Escribe tu correo y tu contraseña."; auth.kind = "err"; render(); return; }
  auth.busy = true; auth.msg = ""; render();
  var up = auth.mode === "up";
  (up ? KXSync.signUp(email, pass) : KXSync.signIn(email, pass)).then(function(r){
    auth.busy = false;
    if(r.error){ auth.msg = authError(r.error); auth.kind = "err"; render(); return; }
    if(KXSync.hasSession()){ auth.pass = ""; auth.msg = ""; return reconcile().then(function(){ render({top:true}); return loadProjectFiles(); }); }
    auth.mode = "in"; auth.pass = ""; auth.kind = "ok";
    auth.msg = "Te enviamos un correo para confirmar tu cuenta. Ábrelo, pulsa el enlace y regresa aquí a entrar.";
    render();
  }).catch(function(e){ auth.busy = false; auth.msg = authError(e); auth.kind = "err"; render(); });
}


/* ------------------------------------------------------------------ VENTANAS */
function renderModal(){
  if(!modal) return "";
  var h;
  if(modal.type === "unanswered"){
    if(modal.none) h = '<h2>¡Espera un momento! ✋</h2><p>Todavía <b>no has respondido ninguna</b> pregunta.</p><p>Si terminas ahora, todas contarán como incorrectas.</p>' +
      '<button type="button" class="btn btn-sun" data-act="modal-close" id="mfocus">Seguir respondiendo</button>' +
      '<button type="button" class="btn btn-ghost" data-act="finish-now">Terminar de todos modos</button>';
    else h = '<h2>¡Espera un momento! ✋</h2><p>Te faltan <b>'+modal.list.length+'</b> '+(modal.list.length===1?'pregunta':'preguntas')+' sin responder ('+esc(modal.list.join(", "))+').</p>' +
      '<p>Si terminas ahora, esas preguntas contarán como incorrectas.</p>' +
      '<button type="button" class="btn btn-sun" data-act="modal-close" id="mfocus">Seguir respondiendo</button>' +
      '<button type="button" class="btn btn-ghost" data-act="finish-now">Terminar de todos modos</button>';
  } else if(modal.type === "deltema"){
    h = '<h2>¿Borrar este tema?</h2><p>Se borrará el tema con sus preguntas y vocabulario. Puedes volver a importarlo después.</p>' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close" id="mfocus">No, conservarlo</button>' +
      '<button type="button" class="btn btn-sun" data-act="do-deltema">Sí, borrar</button>';
  } else if(modal.type === "delweek"){
    h = '<h2>¿Borrar esta semana?</h2><p>Se borrarán sus tareas, materiales, videos y notas. Lo que Killian ya marcó se conserva en sus estrellas.</p>' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close" id="mfocus">No, conservarla</button>' +
      '<button type="button" class="btn btn-sun" data-act="do-delweek">Sí, borrar</button>';
  } else if(modal.type === "chend"){
    h = '<h2>¡Nivel '+modal.lvl+' terminado! 🎉</h2><p>«'+esc(modal.name)+'» · tu puntaje: <b>'+modal.score+'%</b></p>' +
      '<p>Tu charla está lista al <b>'+modal.ready+'%</b> · ⭐ '+modal.stars+' de 3</p>' +
      (modal.next ? '<button type="button" class="btn btn-sun" data-act="ch-after" id="mfocus">Seguir con el nivel '+modal.next+' ▶</button>' : '') +
      '<button type="button" class="btn btn-blue" data-act="ch-repeat"'+(modal.next ? '' : ' id="mfocus"')+'>🔁 Repetir este nivel</button>' +
      '<button type="button" class="btn btn-ghost" data-act="ch-tomenu">Ir a los niveles</button>';
  } else if(modal.type === "chreset"){
    h = '<h2>¿Empezar toda la charla de cero?</h2><p>«'+esc(modal.titulo)+'»: se borra el avance de esta charla y sus estrellas vuelven a 0. Las grabaciones se conservan.</p>' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close" id="mfocus">No, seguir donde voy</button>' +
      '<button type="button" class="btn btn-sun" data-act="ch-reset">Sí, empezar de cero</button>';
  } else if(modal.type === "logout"){
    h = '<h2>¿Cerrar sesión?</h2><p>Este aparato dejará de estar conectado. Tu progreso sigue guardado en la nube y volverá al entrar de nuevo.</p>' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close" id="mfocus">No, quedarme</button>' +
      '<button type="button" class="btn btn-sun" data-act="logout">Sí, cerrar sesión</button>';
  } else {
    h = '<h2>¿Borrar los exámenes de este tema?</h2><p>Se borrarán los intentos y resultados de <b>'+esc(modal.title||"este tema")+'</b> en todos tus aparatos. Tus tareas y estrellas no se borran.</p>' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close" id="mfocus">No, mantener mi progreso</button>' +
      '<button type="button" class="btn btn-sun" data-act="reset-tema">Sí, borrar</button>';
  }
  return '<div class="veil" data-act="veil"><div class="modal" role="dialog" aria-modal="true">'+h+'</div></div>';
}

/* ------------------------------------------------------------------ RENDER */
function render(opts){
  opts = opts || {};
  var y = window.scrollY;
  var needLogin = window.KXSync && KXSync.enabled && !KXSync.hasSession();
  var html;
  if(needLogin && KXSync.restoring) html = '<section class="card" style="text-align:center"><svg class="big-owl" aria-hidden="true" style="width:90px;height:90px"><use href="#owl"/></svg><h2>Entrando…</h2><p class="small">Un momentito, abriendo tu cuenta.</p></section>';
  else if(needLogin) html = renderAuth();
  else switch(S.screen){
    case "home": html = renderHome(); break;
    case "mom": html = renderMom(); break;
    case "games": html = renderGames(); break;
    case "study": html = renderStudy(); break;
    case "charlas": html = renderCharlas(); break;
    case "adelantar": html = renderAdelantar(); break;
    case "charla": html = renderCharla(); break;
    case "copiar": html = renderCopiar(); break;
    case "topics": html = renderTopics(); break;
    case "tema": html = renderTema(); break;
    case "stars": html = renderStars(); break;
    case "dict": html = renderDict(); break;
    case "exam": html = renderExam(); break;
    case "vocab": html = renderVocab(); break;
    case "results": html = renderResults(); break;
    default: html = renderHome();
  }
  app.className = "app" + (!needLogin && S.screen === "home" ? " wide" : "");
  app.innerHTML = html + (needLogin ? "" : renderFab() + renderModal());
  if(opts.top) window.scrollTo(0, 0); else window.scrollTo(0, y);
  if(modal){ var f = document.getElementById("mfocus"); if(f) f.focus(); }
}

/* ------------------------------------------------------------------ EVENTOS */
function goHome(){
  if(window.chStop) chStop();
  if(MAMA){ S.screen = "mom"; momView = "menu"; helperOpen = false; stopTimer(); writeLocal(); render({top:true}); return; }
  S.screen = "home"; helperOpen = false; momOk = false; dict.quiz = null; stopTimer(); writeLocal(); render({top:true}); }
app.addEventListener("click", function(ev){
  var el = ev.target.closest("[data-act]");
  if(!el || !app.contains(el)) return;
  var act = el.getAttribute("data-act");
  if(act === "veil"){ if(ev.target === el){ modal = null; render(); } return; }
  if(helperClick(act, el)) return;
  if(progClick(act, el)) return;
  if(charlaClick(act, el)) return;
  if(copiarClick(act, el)) return;
  if(examClick(act, el, ev)) return;
  if(extraClick(act, el, ev)) return;
  switch(act){
    case "home": goHome(); break;
    case "go-screen": if(window.chStop) chStop(); S.screen = el.getAttribute("data-s"); helperOpen = false; if(S.screen === "dict"){ dict.topic = null; dict.quiz = null; } if(S.screen === "games"){ gmEnd(); } writeLocal(); render({top:true}); break;
    case "done": markDone(el.getAttribute("data-k"), el.getAttribute("data-id")); break;
    case "modal-close": modal = null; render(); break;
    case "ask-logout": modal = {type:"logout"}; render(); break;
    case "logout":
      modal = null;
      KXSync.signOut().catch(function(){}).then(function(){
        clearSaved(); S = fresh(); filter = "all";
        auth.pass = ""; auth.msg = ""; render({top:true});
      });
      break;
    case "auth-toggle": auth.mode = auth.mode === "up" ? "in" : "up"; auth.msg = ""; render(); break;
    case "auth-go": ev.preventDefault(); doAuth(); break;
    case "filter": filter = el.getAttribute("data-f"); render(); break;
  }
});
app.addEventListener("submit", function(ev){ ev.preventDefault(); if(ev.target.id === "authform") doAuth(); });
app.addEventListener("change", function(ev){
  if(ev.target.id !== "impfile" || !ev.target.files || !ev.target.files[0]) return;
  var rd = new FileReader();
  rd.onload = function(){ imp.text = String(rd.result || ""); imp.msg = ""; imp.errors = []; render(); };
  rd.onerror = function(){ imp.msg = "No pude leer ese archivo."; render(); };
  rd.readAsText(ev.target.files[0]);
});
app.addEventListener("input", function(ev){
  if(extraInput(ev)) return;
  if(examInput(ev)) return;
  if(helperInput(ev)) return;
  if(ev.target.id === "email"){ auth.email = ev.target.value; return; }
  if(ev.target.id === "pass"){ auth.pass = ev.target.value; return; }
});
app.addEventListener("keydown", function(ev){
  if(ev.key === "Enter" && (helperKey(ev) || examKey(ev))) return;
  if(ev.key === "Enter" && (ev.target.id === "pin" || ev.target.id === "pin2")){ ev.preventDefault(); pinGo(); }
  if(ev.key === "Escape" && modal){ modal = null; render(); }
});

/* ------------------------------------------------------------------ ARRANQUE */
/* Primero revisa si este aparato ya tiene sesión, luego sincroniza. */
function syncNow(){
  if(!window.KXSync || !KXSync.enabled || !KXSync.hasSession()) return Promise.resolve();
  KXSync.flush();
  return reconcile();
}
/* La agenda de la semana y los temas nuevos se leen solos de data/ (los deja Claude en el proyecto).
   Solo se vuelven a aplicar cuando el archivo cambia. */
function hashText(t){ var h = 5381; for(var i=0;i<t.length;i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return String(h >>> 0); }
function fetchText(url){ return fetch(url, {cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error(url); return r.text(); }); }
var AGENDA_SCHEMA = "|s3", KX_VERSION = "21-oct 1";
function loadProjectFiles(){
  if(window.KXSync && KXSync.enabled && !KXSync.hasSession()) return Promise.resolve();
  var changed = false;
  var pa = fetchText("data/agenda-actual.json").then(function(txt){
    var sig = hashText(txt) + AGENDA_SCHEMA;   /* si cambia el formato de la agenda, se vuelve a leer el archivo */
    if(S.fileSig.agenda === sig) return;
    var pr = parseImportText(txt); if(!pr.ok){ console.warn("agenda-actual.json:", pr.msg); return; }
    var list = Array.isArray(pr.obj) ? pr.obj : (pr.obj && Array.isArray(pr.obj.agendas) ? pr.obj.agendas : [pr.obj]);
    var drafts = [];
    for(var i=0;i<list.length;i++){
      var v = validateAgenda(list[i] || {});
      if(v.errors.length){ console.warn("agenda-actual.json:", v.errors.join(" | ")); return; }
      drafts.push(v.draft);
    }
    S.agenda = null;                                   /* el archivo reemplaza toda la agenda (borra los ejemplos) */
    drafts.forEach(applyAgenda);
    S.temas = S.temas.filter(function(t){ return !/^ejemplo-/.test(t.id); });
    S.fileSig.agenda = sig; changed = true;
  }).catch(function(){});
  var pt = fetchText("data/temas/index.json").then(function(txt){
    var files = JSON.parse(txt); if(!Array.isArray(files)) return;
    return Promise.all(files.map(function(f){
      return fetchText("data/temas/" + f).then(function(tx){
        var sig = hashText(tx);
        if(S.fileSig.temas[f] === sig) return;
        var pr = parseImportText(tx); if(!pr.ok || !pr.obj || pr.obj.tipo !== "tema"){ console.warn(f, "no es un tema"); return; }
        var v = validateTema(pr.obj); if(v.errors.length){ console.warn(f + ":", v.errors.join(" | ")); return; }
        var t = v.draft, k = -1; for(var i=0;i<S.temas.length;i++) if(S.temas[i].id === t.id) k = i;
        if(k >= 0) S.temas[k] = t; else S.temas.push(t);
        S.fileSig.temas[f] = sig; changed = true;
      }).catch(function(){});
    }));
  }).catch(function(){});
  var pc = fetchText("data/charlas/index.json").then(function(txt){
    var files = JSON.parse(txt); if(!Array.isArray(files)) return;
    return Promise.all(files.map(function(f){
      return fetchText("data/charlas/" + f).then(function(tx){
        var sig = hashText(tx);
        if(S.fileSig.charlas[f] === sig) return;
        var pr = parseImportText(tx); if(!pr.ok || !pr.obj || pr.obj.tipo !== "charla"){ console.warn(f, "no es una charla"); return; }
        var v = validateCharla(pr.obj); if(v.errors.length){ console.warn(f + ":", v.errors.join(" | ")); return; }
        var t = v.draft, k = -1; for(var i=0;i<S.charlas.length;i++) if(S.charlas[i].id === t.id) k = i;
        if(k >= 0) S.charlas[k] = t; else S.charlas.push(t);
        S.fileSig.charlas[f] = sig; changed = true;
      }).catch(function(){});
    }));
  }).catch(function(){});
  return Promise.all([pa, pt, pc]).then(function(){ if(changed){ saveContent(); render(); } });
}
function boot(){
  if(window.KXSync){
    KXSync.init({onStatus:setSyncStatus, onSignedOut:function(){ render(); },
      onRestored:function(){ render({top:true}); syncNow().then(loadProjectFiles); }}).then(function(){
      render();
      syncNow().then(loadProjectFiles);
    });
    document.addEventListener("visibilitychange", function(){ if(!document.hidden) syncNow().then(loadProjectFiles); });
    window.addEventListener("online", syncNow);
    setInterval(function(){ if(!document.hidden) syncNow(); }, 30000);
  } else { render(); loadProjectFiles(); }
  if("serviceWorker" in navigator && location.protocol.indexOf("http") === 0){
    window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
}

/* Utilidad de pruebas (no la usa el niño). */
window.__kx = {S:function(){ return S; }, gm:function(){ return gm; }};
