"use strict";
/* ============================================================== AYUDANTE ===
   La voz (leer en voz alta), el búho traductor y el visor de videos. Todo gratis:
   la voz es la del navegador y el traductor usa MyMemory, que no pide cuenta ni tarjeta. */

/* ------------------------------------------------------------------- VOZ */
var tts = {ok:!!(window.speechSynthesis && window.SpeechSynthesisUtterance), voices:[]};
function loadVoices(){ try{ tts.voices = window.speechSynthesis.getVoices() || []; }catch(e){} }
if(tts.ok){
  loadVoices();
  try{ window.speechSynthesis.addEventListener("voiceschanged", loadVoices); }catch(e){ try{ window.speechSynthesis.onvoiceschanged = loadVoices; }catch(e2){} }
} else document.documentElement.classList.add("nospeech");
/* Elige la mejor voz del aparato para el idioma: primero por país preferido y, dentro de eso, las «mejoradas» / de Google. */
var VPREF = {en:["en-US", "en-GB", "en-AU", "en-CA", "en-IN"], es:["es-US", "es-MX", "es-419", "es-PA", "es-CO", "es-ES", "es-AR"], zh:["zh-CN", "zh-TW", "zh-HK"]};
function vlang(v){ return String(v.lang || "").replace("_", "-"); }
function pickVoice(lang){
  if(!tts.voices.length) loadVoices();
  var pref = VPREF[lang] || [], best = null, bestScore = -1;
  tts.voices.forEach(function(v){
    var l = vlang(v), low = l.toLowerCase();
    if(low.indexOf(lang) !== 0) return;
    var pi = pref.indexOf(l), sc = (pi >= 0 ? 50 - pi : 0) + (/enhanced|premium|natural|neural|google|siri|compact/i.test(v.name || "") ? (/compact/i.test(v.name || "") ? 0 : 8) : 0) + (v.localService ? 1 : 0);
    if(sc > bestScore){ bestScore = sc; best = v; }
  });
  return best;
}
/* Para mamá: qué voces tiene este aparato. */
function voiceReport(){
  if(!tts.voices.length) loadVoices();
  var out = {total:tts.voices.length, es:[], en:[], picked:{es:null, en:null}};
  tts.voices.forEach(function(v){ var l = vlang(v).toLowerCase(); if(l.indexOf("es") === 0) out.es.push(v.name + " (" + vlang(v) + ")"); else if(l.indexOf("en") === 0) out.en.push(v.name + " (" + vlang(v) + ")"); });
  var pe = pickVoice("es"), pn = pickVoice("en");
  out.picked.es = pe ? pe.name + " (" + vlang(pe) + ")" : null; out.picked.en = pn ? pn.name + " (" + vlang(pn) + ")" : null;
  return out;
}
function speak(text, lang){
  if(!tts.ok) return;
  text = String(text || "").replace(/_{3,}/g, lang === "en" ? "blank" : "espacio en blanco").replace(/\s+/g, " ").trim();
  if(!text) return;
  try{
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text), v = pickVoice(lang);
    if(v){ u.voice = v; u.lang = v.lang; } else u.lang = lang === "en" ? "en-US" : "es-US";
    u.rate = lang === "en" ? 0.85 : 0.95; u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  }catch(e){}
}
/* Botón 🔊 */
function spk(text, lang, cls){
  return '<button type="button" class="spk ' + (cls || "") + '" data-act="speak" data-l="' + (lang || "en") + '" data-t="' + esc(text) + '" aria-label="Escuchar">🔊</button>';
}

/* ---------------------------------------------------------------- TRADUCTOR */
var HELLO = "¿Qué quieres que te ayude a traducir?";
var hp = {dir:"en", q:"", res:null, busy:false, hist:[]};

function dictEntries(){
  var out = [];
  vocabTopics().forEach(function(t){ t.words.forEach(function(w){ out.push({en:w.en, es:w.es, alts:w.aceptadas || [], ex_en:w.ejemplo_en || "", ex_es:w.ejemplo_es || ""}); }); });
  GENERAL.forEach(function(g){ g.words.forEach(function(w){ out.push({en:w.en, es:w.es, alts:w.aceptadas || [], ex_en:"", ex_es:""}); }); });
  (S.custom || []).forEach(function(w){ out.push({en:w.en, es:w.es, alts:[w.es], ex_en:w.ejemplo_en || "", ex_es:w.ejemplo_es || ""}); });
  allTemas().forEach(function(t){ if(t.idioma === "es") return; t.resumen.forEach(function(r){ out.push({en:r.en, es:r.es, alts:[], ex_en:"", ex_es:""}); }); });
  return out;
}
function lookupLocal(q, dir){
  var n = norm(q); if(!n) return null;
  var cands = [n];
  if(dir === "en"){ if(/s$/.test(n)) cands.push(n.slice(0, -1)); if(/es$/.test(n)) cands.push(n.slice(0, -2)); }
  var list = dictEntries();
  for(var c = 0; c < cands.length; c++) for(var i = 0; i < list.length; i++){
    var e = list[i];
    if(dir === "en"){ if(norm(e.en) === cands[c]) return e; }
    else if(norm(e.es) === cands[c] || e.alts.some(function(a){ return norm(a) === cands[c]; })) return e;
  }
  return null;
}
function decodeEntities(s){ var t = document.createElement("textarea"); t.innerHTML = String(s); return t.value; }
function translateOnline(q, dir){
  var pair = dir === "en" ? "en|es" : "es|en";
  return fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=" + encodeURIComponent(pair))
    .then(function(r){ return r.json(); })
    .then(function(j){
      var t = j && j.responseData && j.responseData.translatedText;
      if(!j || String(j.responseStatus) !== "200" || !t) return {none:true};
      t = decodeEntities(t).trim();
      if(/MYMEMORY WARNING|QUERY LENGTH|INVALID|PLEASE SELECT|NO QUERY/i.test(t)) return {none:true};
      /* Si devuelve la misma palabra, solo vale si es una coincidencia segura (palabras iguales en los dos idiomas, como «hotel»). */
      if(t.toLowerCase() === q.toLowerCase() && !(+j.responseData.match >= 0.9)) return {none:true};
      return {text:t};
    }).catch(function(){ return {offline:true}; });
}
function recordLook(en, es){
  var k = String(en).toLowerCase().trim(), H = S.home;
  H.look[k] = (H.look[k] || 0) + 1; H.lookTr[k] = es;
  saveHome();
}
function helperGo(){
  var q = val("hq").trim(); hp.q = q;
  if(!q) return;
  if(q.length > 100){ hp.res = {long:true}; render(); return; }
  var dir = hp.dir, loc = lookupLocal(q, dir);
  hp.hist = [q].concat(hp.hist.filter(function(x){ return x.toLowerCase() !== q.toLowerCase(); })).slice(0, 6);
  function done(en, es, exEn, exEs, src){
    hp.busy = false; hp.res = {found:true, en:en, es:es, ex_en:exEn || "", ex_es:exEs || "", src:src};
    recordLook(en, es); render();
  }
  if(loc){
    if(dir === "en") done(q, loc.es, loc.ex_en, loc.ex_es, "dic"); else done(loc.en, q, loc.ex_en, loc.ex_es, "dic");
    return;
  }
  hp.busy = true; hp.res = null; render();
  translateOnline(q, dir).then(function(r){
    if(r.text){ if(dir === "en") done(q, r.text, "", "", "web"); else done(r.text, q, "", "", "web"); }
    else if(r.offline){ hp.busy = false; hp.res = {offline:true}; render(); }
    else {
      hp.busy = false; hp.res = {unknown:true};
      S.home.ask[dir + ":" + q.toLowerCase()] = Date.now(); saveHome(); render();
    }
  });
}
function renderHelper(){
  if(!helperOpen) return "";
  var r = hp.res, body = "";
  if(hp.busy) body = '<p class="hmsg">Buscando… 🔎</p>';
  else if(r && r.found){
    body = '<div class="hres"><div class="hline"><b lang="en">' + esc(r.en) + '</b>' + spk(r.en, "en") + '</div><div class="harrow">⬇️</div>' +
      '<div class="hline"><b>' + esc(r.es) + '</b>' + spk(r.es, "es") + '</div>' +
      (r.ex_en ? '<p class="hex"><span lang="en">' + esc(r.ex_en) + '</span> ' + spk(r.ex_en, "en", "mini") + '<br>' + esc(r.ex_es) + '</p>' : '') +
      '<p class="small">' + (r.src === "dic" ? "📖 Está en tu diccionario" : "🌐 Lo encontré en el traductor") + ' · guardada en «Palabras que busqué»</p></div>';
  } else if(r && r.unknown) body = '<p class="hmsg">Esa se la preguntamos a mamá 😊</p><p class="small">Ya quedó anotada para que ella la vea.</p>';
  else if(r && r.offline) body = '<p class="hmsg">No tengo internet para buscar eso 📴. Inténtalo cuando vuelva la conexión.</p>';
  else if(r && r.long) body = '<p class="hmsg">Escribe una palabra o una frase corta, por favor. 🙂</p>';
  var hist = hp.hist.length ? '<div class="hhist">' + hp.hist.map(function(w){ return '<button type="button" class="chip-btn" data-act="h-again" data-w="' + esc(w) + '">' + esc(w) + '</button>'; }).join("") + '</div>' : "";
  return '<div class="hpanel" role="dialog" aria-label="Mi ayudante"><div class="hhead"><svg aria-hidden="true"><use href="#owl"/></svg><b>' + HELLO + '</b>' + spk(HELLO, "es", "mini") +
    '<button type="button" class="link-btn" data-act="helper" aria-label="Cerrar">✕</button></div>' +
    '<div class="tabs"><button type="button" class="tab" data-act="h-dir" data-v="en" aria-pressed="' + (hp.dir === "en") + '">English → Español</button>' +
    '<button type="button" class="tab" data-act="h-dir" data-v="es" aria-pressed="' + (hp.dir === "es") + '">Español → English</button></div>' +
    '<div class="hrow"><input id="hq" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="100" value="' + esc(hp.q) + '" placeholder="' + (hp.dir === "en" ? "Escribe una palabra en inglés…" : "Escribe una palabra en español…") + '">' +
    '<button type="button" class="btn btn-sun" data-act="h-go">Traducir</button></div>' + body + hist + '</div>';
}

/* ------------------------------------------------------------------ VIDEOS */
var vplay = null;
function videoInfo(url){
  var u; try{ u = new URL(url); }catch(e){ return null; }
  var h = u.hostname.replace(/^www\./, ""), id = "", m;
  if(h === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if(h === "youtube.com" || h === "m.youtube.com" || h === "youtube-nocookie.com"){
    if(u.pathname === "/watch") id = u.searchParams.get("v") || "";
    else if((m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/))) id = m[1];
  }
  if(/^[\w-]{6,15}$/.test(id)) return {src:"https://www.youtube-nocookie.com/embed/" + id + "?rel=0&playsinline=1&autoplay=1", site:"YouTube"};
  if(h === "vimeo.com" && (m = u.pathname.match(/^\/(\d+)/))) return {src:"https://player.vimeo.com/video/" + m[1] + "?autoplay=1", site:"Vimeo"};
  return null;
}
function openVideo(kind, id){
  var x = null;
  agendaData().videos.forEach(function(v){ if(v.id === id) x = v; });
  if(!x) return;
  var vi = videoInfo(x.url);
  if(!vi){ window.open(x.url, "_blank", "noopener"); return; }
  vplay = {kind:kind, id:id, title:x.titulo, url:x.url, src:vi.src, site:vi.site};
  drawVideo();
}
function closeVideo(){ vplay = null; drawVideo(); }
function drawVideo(){
  var root = document.getElementById("vroot"); if(!root) return;
  if(!vplay){ root.innerHTML = ""; document.body.classList.remove("noscroll"); return; }
  var done = isDone("vid", vplay.id);
  document.body.classList.add("noscroll");
  root.innerHTML = '<div class="vveil" role="dialog" aria-modal="true" aria-label="Video"><div class="vbox">' +
    '<div class="vtop"><b>🎬 ' + esc(vplay.title) + '</b><button type="button" class="link-btn" data-vact="close">✕ Cerrar</button></div>' +
    '<div class="vframe"><iframe src="' + esc(vplay.src) + '" title="' + esc(vplay.title) + '" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' +
    '<div class="vbtns">' + (done ? '<span class="pill ok">✓ Ya lo viste</span>' : '<button type="button" class="btn btn-sun" data-vact="seen">¡Ya lo vi! ✓</button>') +
    '<a class="btn btn-ghost" href="' + esc(vplay.url) + '" target="_blank" rel="noopener">Abrir en ' + esc(vplay.site) + ' ↗</a></div>' +
    '<p class="small">Si el video no se ve aquí, ábrelo con el botón de arriba.</p></div></div>';
}
(function(){
  var root = document.getElementById("vroot"); if(!root) return;
  root.addEventListener("click", function(ev){
    var el = ev.target.closest("[data-vact]");
    if(!el){ if(ev.target.classList && ev.target.classList.contains("vveil")) closeVideo(); return; }
    var a = el.getAttribute("data-vact");
    if(a === "close") closeVideo();
    if(a === "seen"){ var id = vplay && vplay.id, kind = vplay && vplay.kind; closeVideo(); if(id && kind === "vid") markDone("vid", id); }
  });
  document.addEventListener("keydown", function(ev){ if(ev.key === "Escape" && vplay) closeVideo(); });
})();

/* ------------------------------------------------------------ clics y teclas */
function helperClick(act, el){
  switch(act){
    case "speak": speak(el.getAttribute("data-t"), el.getAttribute("data-l")); return true;
    case "helper":
      helperOpen = !helperOpen;
      if(helperOpen){ hp.res = null; speak(HELLO, "es"); }
      render();
      if(helperOpen){ var q = document.getElementById("hq"); if(q && !isTouch()) q.focus(); }
      return true;
    case "h-dir": hp.dir = el.getAttribute("data-v"); hp.res = null; hp.q = val("hq"); render(); return true;
    case "h-go": helperGo(); return true;
    case "h-again": hp.q = el.getAttribute("data-w"); helperGo(); return true;
    case "play": openVideo("vid", el.getAttribute("data-id")); return true;
  }
  return false;
}
function isTouch(){ return "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0; }
function helperInput(ev){ if(ev.target.id === "hq"){ hp.q = ev.target.value; return true; } return false; }
function helperKey(ev){ if(ev.target.id === "hq"){ ev.preventDefault(); helperGo(); return true; } return false; }
