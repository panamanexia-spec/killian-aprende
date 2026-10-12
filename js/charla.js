"use strict";
/* ================================================================ CHARLAS ===
   Aprender una charla (en otro idioma) solo repitiéndola, por niveles:
   1 Entender · 2 Eco · 3 Bola de nieve · 4 Sombra · 5 Desvanecer · 6 Ensayo final.
   Todo gratis: la voz y el micrófono son los del navegador (SpeechSynthesis, SpeechRecognition y
   MediaRecorder), sin cuentas ni tarjetas. Las grabaciones del ensayo final se guardan en la nube
   (fila «grabaciones») para que mamá las escuche desde su celular. */
var LANGS = {en:{name:"inglés", tts:"en-US", rec:"en-US"}, es:{name:"español", tts:"es-US", rec:"es-MX"}, zh:{name:"chino", tts:"zh-CN", rec:"zh-CN"}};
var LEVELS = [
  {n:1, name:"Entender", e:"👀", w:10, d:"Mira cada frase, su dibujo y su gesto."},
  {n:2, name:"Eco", e:"🔁", w:15, d:"Escucha y repite cada frase 3 veces."},
  {n:3, name:"Bola de nieve", e:"⛄", w:20, d:"La charla va creciendo frase por frase."},
  {n:4, name:"Sombra", e:"🎤", w:10, d:"Habla al mismo tiempo que la voz."},
  {n:5, name:"Desvanecer", e:"🌫️", w:20, d:"La ayuda va desapareciendo."},
  {n:6, name:"Ensayo final", e:"🏆", w:25, d:"La charla completa, de memoria."}
];
var RecAPI = window.SpeechRecognition || window.webkitSpeechRecognition || null;
var ch = {id:null, lvl:0, queue:[], noRec:false, noRecord:false};
var chTimers = [], chCtl = null, chPlayTok = 0;

function charlaById(id){ for(var i = 0; i < S.charlas.length; i++) if(S.charlas[i].id === id) return S.charlas[i]; return null; }
/* El dibujo de la frase: «pista»; si no hay, el primer emoji de la traducción; si no, 💬. */
function pistaOf(f){
  if(f.pista) return f.pista;
  var m = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u.exec(f.es || "");
  return m ? m[0] : "💬";
}
function cLang(c){ return LANGS[c.idioma] || LANGS.en; }

/* ---- validar una charla ---- */
function validateCharla(o){
  var E = [], c = {id:str(o.id), materia:str(o.materia), titulo:str(o.titulo), titulo_es:str(o.titulo_es), idioma:str(o.idioma) || "en", fecha:str(o.fecha_entrega || o.fecha), frases:[]};
  if(!/^[a-z0-9][a-z0-9_-]*$/i.test(c.id)) E.push("La charla necesita un «id» sin espacios ni acentos, por ejemplo thunder-rose.");
  if(!c.titulo) E.push("Falta el título de la charla.");
  if(!LANGS[c.idioma]) E.push("«idioma» debe ser en, es o zh.");
  if(c.fecha && !isDate(c.fecha)) E.push("La fecha de entrega no es válida (usa 2026-10-13).");
  (Array.isArray(o.frases) ? o.frases : []).forEach(function(f, i){
    var t = typeof f === "string" ? f : f && f.texto, ob = f && typeof f === "object" ? f : {};
    if(!str(t)) { E.push("Frase " + (i + 1) + ": está vacía."); return; }
    c.frases.push({t:str(t), es:str(ob.es), pista:str(ob.pista), gesto:str(ob.gesto)});
  });
  if(!c.frases.length) E.push("La charla no trae frases.");
  return {errors:E, draft:c};
}
/* Convierte un texto pegado en frases (una por línea o por punto). */
function splitFrases(txt){
  var out = [];
  String(txt || "").split(/\n+/).forEach(function(line){
    line = line.trim(); if(!line) return;
    (line.match(/[^.!?。！？]+[.!?。！？]*/g) || [line]).forEach(function(p){ p = p.trim(); if(p) out.push(p); });
  });
  return out;
}

/* ---- palabras y comparación (con tolerancia) ---- */
var STOP = {
  en:"a an the of to in on at is are was were be am and or it its i my me he she we you they his her their this that there for with as by from do did does not no so up".split(" "),
  es:"el la los las un una unos unas de del en y o a al que se su sus mi me lo con por para es son".split(" ")
};
function tokens(t, lang){
  if(lang === "zh") return Array.from(String(t)).filter(function(c){ return /[一-鿿]/.test(c); });
  return String(t).split(/\s+/).filter(Boolean);
}
function nrm(w){ return String(w).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9一-鿿']/g, ""); }
function isKey(w, lang){
  var n = nrm(w); if(!n) return false;
  if(lang === "zh") return true;
  return n.length >= 3 && (STOP[lang] || []).indexOf(n) < 0;
}
function lev(a, b){
  var m = a.length, n = b.length, d = [], i, j;
  for(i = 0; i <= m; i++){ d[i] = [i]; }
  for(j = 1; j <= n; j++) d[0][j] = j;
  for(i = 1; i <= m; i++) for(j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
  return d[m][n];
}
function said(n, heard, lang){
  if(heard.indexOf(n) >= 0) return true;
  if(lang === "zh") return false;
  var tol = n.length >= 6 ? 2 : n.length >= 4 ? 1 : 0;
  if(!tol) return false;
  for(var i = 0; i < heard.length; i++) if(Math.abs(heard[i].length - n.length) <= tol && lev(n, heard[i]) <= tol) return true;
  return false;
}
/* Cada palabra: «ok» (la dijo), «miss» (faltó) o «small» (palabrita sin importancia). pct = palabras clave dichas. */
function compare(text, heardText, lang){
  var tk = tokens(text, lang), heard = tokens(heardText, lang).map(nrm).filter(Boolean);
  var keys = tk.map(function(w){ return isKey(w, lang); });
  if(!keys.some(Boolean)) keys = tk.map(function(){ return true; });
  var marks = tk.map(function(w, i){
    if(!keys[i]) return "small";
    return said(nrm(w), heard, lang) ? "ok" : "miss";
  });
  var total = keys.filter(Boolean).length, ok = marks.filter(function(m){ return m === "ok"; }).length;
  return {tk:tk, marks:marks, ok:ok, total:total, pct:total ? Math.round(ok / total * 100) : 0, heard:heardText};
}
function nice(pct){
  return pct >= 85 ? "🌟 ¡Increíble!" : pct >= 60 ? "🎉 ¡Muy bien!" : pct >= 35 ? "👍 ¡Vas muy bien! Una vez más y te sale." : "💪 ¡Buen intento! Escucha otra vez y verás.";
}

/* ---- voz ---- */
function estMs(text, rate){ return Math.round((tokens(text, "en").length * 460 + 500) / (rate || 0.9)); }
function speakC(text, lang, rate, done, hooks){
  var fin = false, wd = null;
  function end(){ if(fin) return; fin = true; clearTimeout(wd); if(done) done(); }
  if(!tts.ok){ wd = setTimeout(end, Math.min(estMs(text, rate), 1200)); return end; }
  try{
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(String(text)), L = LANGS[lang] || LANGS.en, v = pickVoice(lang === "zh" ? "zh" : lang);
    if(v){ u.voice = v; u.lang = v.lang; } else u.lang = L.tts;
    u.rate = rate || 0.9; u.pitch = 1.05;
    u.onend = end; u.onerror = end;
    if(hooks && hooks.boundary) u.onboundary = function(e){ hooks.boundary(e); };
    window.speechSynthesis.speak(u);
    wd = setTimeout(end, estMs(text, rate) + 2500);       /* por si el aparato no avisa que terminó */
  }catch(e){ end(); }
  return end;
}
/* Dice una lista de frases una tras otra. */
function speakSeq(list, lang, rate, done, onEach, hooksFor){
  var tok = ++chPlayTok;
  (function go(k){
    if(tok !== chPlayTok) return;
    if(k >= list.length){ if(done) done(); return; }
    if(onEach) onEach(k);
    speakC(list[k], lang, rate, function(){ later(function(){ if(tok === chPlayTok) go(k + 1); }, 280); }, hooksFor ? hooksFor(k) : null);
  })(0);
}
function later(fn, ms){ var t = setTimeout(fn, ms * (window.__kxFast || 1)); chTimers.push(t); return t; }
/* Para todo lo que esté sonando, escuchando o esperando. */
function chStop(){
  chPlayTok++; chTimers.forEach(clearTimeout); chTimers = [];
  if(tts.ok) try{ window.speechSynthesis.cancel(); }catch(e){}
  if(chCtl){ var c = chCtl; chCtl = null; try{ c.abort(); }catch(e){} }
}

/* ---- micrófono: espera hasta 2 s de silencio; máximo = 3 s por cada 5 palabras + 3 s ---- */
function listenSmart(lang, nWords, record, cb){
  var maxMs = (Math.ceil(nWords / 5) * 3 + 3) * 1000, t0 = Date.now(), lastAt = 0, started = false, text = "", finished = false;
  var r = null, iv = null, mr = null, stream = null, chunks = [], blob = null, mime = "", recDone = !record, results = null;
  var ctl = {abort:function(){ finished = true; clear(); }, stop:function(){ finish(null); }};
  chCtl = ctl;
  function clear(){
    clearInterval(iv); if(r){ r.onresult = r.onerror = r.onend = null; try{ r.abort(); }catch(e){} }
    if(mr && mr.state !== "inactive") try{ mr.stop(); }catch(e){}
    if(stream) stream.getTracks().forEach(function(t){ t.stop(); });
  }
  function done(err){
    if(chCtl === ctl) chCtl = null;
    cb(err, text.trim(), blob, mime);
  }
  function finish(err){
    if(finished) return; finished = true;
    clearInterval(iv); if(r){ r.onresult = r.onerror = r.onend = null; try{ r.stop(); }catch(e){} }
    if(mr && mr.state !== "inactive"){ mr.onstop = function(){ blob = chunks.length ? new Blob(chunks, {type:mime || "audio/webm"}) : null; if(stream) stream.getTracks().forEach(function(t){ t.stop(); }); done(err); }; try{ mr.stop(); }catch(e){ done(err); } }
    else { if(stream) stream.getTracks().forEach(function(t){ t.stop(); }); done(err); }
  }
  /* grabación de la voz (si el aparato la permite) */
  if(record && navigator.mediaDevices && window.MediaRecorder){
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
      if(finished){ s.getTracks().forEach(function(t){ t.stop(); }); return; }
      stream = s;
      try{
        var opts = {audioBitsPerSecond:24000}; mr = new MediaRecorder(s, opts); mime = mr.mimeType || "";
        mr.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
        mr.start(500);
      }catch(e){ mr = null; ch.noRecord = true; }
    }).catch(function(){ ch.noRecord = true; });
  }
  if(!RecAPI || ch.noRec){
    /* sin reconocimiento de voz: solo graba hasta que pulse «Terminé» (o hasta el máximo) */
    iv = setInterval(function(){ if(Date.now() - t0 > maxMs + 4000) finish("manual"); }, 300);
    return ctl;
  }
  try{
    r = new RecAPI(); r.lang = (LANGS[lang] || LANGS.en).rec; r.interimResults = true; r.maxAlternatives = 1; r.continuous = true;
    results = [];
    r.onresult = function(e){
      started = true; lastAt = Date.now();
      var s = ""; for(var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript + " ";
      text = s;
    };
    r.onerror = function(e){
      var er = e.error || "error";
      if(er === "no-speech" || er === "aborted") return;
      finish(er);
    };
    r.onend = function(){ if(!finished){ try{ r.start(); }catch(e){ finish(null); } } };   /* algunos aparatos lo cortan solos */
    r.start();
  }catch(e){ finish("error"); return ctl; }
  iv = setInterval(function(){
    var now = Date.now();
    if(started && now - lastAt > 2000 * (window.__kxFast || 1)) finish(null);
    else if(!started && now - t0 > 6000) finish("no-speech");
    else if(now - t0 > maxMs) finish(null);
  }, 200);
  return ctl;
}

/* ---- progreso guardado ---- */
function chLevelDone(id){ return S.home.chl[id] || 0; }
function chStars(id, n){ return S.home.chs[id + "|" + n] || 0; }
function chReady(id){
  var p = 0; LEVELS.forEach(function(L){ p += L.w * Math.min(3, chStars(id, L.n)) / 3; });
  return Math.round(p);
}
function chStarTotal(){ var n = 0; for(var k in S.home.chs) n += Math.min(3, S.home.chs[k]); return n; }
function chToday(id){ return S.home.chd[id + "|" + todayKey()] || 0; }
function chSessions(id){ var n = 0, k; for(k in S.home.chd) if(k.indexOf(id + "|") === 0) n += S.home.chd[k]; return n; }
function chNextLevel(id){ for(var n = 1; n <= 6; n++) if(!chStars(id, n)) return n; return 6; }
function chUnlocked(id, n){ return n === 1 || chStars(id, n - 1) > 0 || (ch.queue.indexOf(n) >= 0 && ch.id === id); }
function chFinish(n, pct){
  var id = ch.id, stars = (n === 1 || n === 4) ? 3 : (pct >= 85 ? 3 : pct >= 55 ? 2 : 1), H = S.home;
  H.chs[id + "|" + n] = Math.max(H.chs[id + "|" + n] || 0, stars);
  H.chr[id + "|" + n] = Math.max(H.chr[id + "|" + n] || 0, Math.round(pct));
  if(n <= (H.chl[id] || 0) + 1) H.chl[id] = Math.max(H.chl[id] || 0, n);   /* los niveles se desbloquean en orden */
  var k = id + "|" + todayKey(); H.chd[k] = (H.chd[k] || 0) + 1;
  saveHome();
  if(H.chd[k] >= 3) markAutoDone("ch", id);
  return stars;
}

/* ---- grabaciones del ensayo (guardadas en el aparato y en la nube) ---- */
var GR = {items:[]};
try{ var _g = JSON.parse(localStorage.getItem("kx-grab") || "null"); if(_g && Array.isArray(_g.items)) GR = _g; }catch(e){}
function grSave(){ try{ localStorage.setItem("kx-grab", JSON.stringify(GR)); }catch(e){} if(window.KXSync) KXSync.push("grabaciones", GR); }
function grMerge(remote){
  if(!remote || !Array.isArray(remote.items)) return false;
  var have = {}; GR.items.forEach(function(x){ have[x.id] = 1; });
  var add = remote.items.filter(function(x){ return x && x.id && x.data && !have[x.id]; });
  if(!add.length) return false;
  GR.items = GR.items.concat(add).sort(function(a, b){ return b.ts - a.ts; });
  grTrim(); try{ localStorage.setItem("kx-grab", JSON.stringify(GR)); }catch(e){}
  return true;
}
function grTrim(){
  var per = {}, out = [];
  GR.items.sort(function(a, b){ return b.ts - a.ts; }).forEach(function(x){ per[x.charla] = (per[x.charla] || 0) + 1; if(per[x.charla] <= 3) out.push(x); });
  GR.items = out;
}
function grAdd(blob, mime, pct){
  if(!blob || blob.size > 450000) return;
  var rd = new FileReader();
  rd.onload = function(){
    GR.items.unshift({id:"g" + Date.now(), charla:ch.id, ts:Date.now(), pct:Math.round(pct), mime:mime || blob.type || "audio/webm", data:String(rd.result)});
    grTrim(); grSave(); if(S.screen === "mom") render();
  };
  rd.readAsDataURL(blob);
}

/* ---- pantallas ---- */
function barHtml(label, pct){ return '<div class="progress-day"><div class="prog-row"><span>'+esc(label)+'</span></div><div class="bar"><i style="width:'+Math.max(2, Math.min(100, pct))+'%"></i></div></div>'; }
function starsTxt(n){ return "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n); }
function renderCharlas(){
  var h = subHeader("Mis charlas", "home", "← Inicio");
  if(!S.charlas.length) return h + '<p class="note">Todavía no hay charlas. Mamá las agrega en la zona de mamá. 😊</p>' + footer();
  h += '<section class="stack">' + S.charlas.map(function(c){
    return '<button class="btn btn-blue" type="button" data-act="ch-open" data-id="'+esc(c.id)+'">🎤 '+esc(c.titulo)+'<span class="small" style="display:block;color:#fff">'+esc(c.materia||"")+' · '+c.frases.length+' frases · charla lista al '+chReady(c.id)+'%</span></button>';
  }).join("") + '</section>';
  return h + footer();
}
function renderCharla(){
  var c = charlaById(ch.id);
  if(!c) return renderCharlas();
  if(!ch.lvl) return renderMenu(c);
  var L = LEVELS[ch.lvl - 1], h = subHeader(L.e + " Nivel " + L.n + " · " + L.name, "ch-menu", "← Niveles");
  switch(ch.lvl){
    case 1: return h + r1(c) + footer();
    case 2: return h + r2(c) + footer();
    case 3: return h + r3(c) + footer();
    case 4: return h + r4(c) + footer();
    case 5: return h + r5(c) + footer();
    default: return h + r6(c) + footer();
  }
}
function renderMenu(c){
  var id = c.id, next = chNextLevel(id), h = subHeader(c.titulo, "go-screen", "← Charlas").replace('data-act="go-screen"', 'data-act="go-screen" data-s="charlas"');
  var rd = chReady(id);
  h += '<section class="card"><span class="chip">'+esc(c.materia||"")+'</span>' + (c.fecha ? '<p class="due">📅 Es '+esc(relDay(c.fecha))+'</p>' : '') +
    barHtml("Mi charla está lista al " + rd + "%", rd) +
    '<p class="small">Hoy practicaste '+chToday(id)+' '+(chToday(id) === 1 ? "vez" : "veces")+'. ¡Sube de nivel poco a poco! 🪜</p></section>';
  h += '<section class="stack">' + LEVELS.map(function(L){
    var open = chUnlocked(id, L.n), st = chStars(id, L.n), cur = L.n === next;
    return '<button class="lvl'+(cur ? " cur" : "")+(open ? "" : " lock")+'" type="button" data-act="ch-level" data-n="'+L.n+'"'+(open ? "" : ' aria-disabled="true"')+'>' +
      '<span class="le">'+(open ? L.e : "🔒")+'</span><span class="lvtxt"><b>Nivel '+L.n+' · '+esc(L.name)+'</b><span>'+esc(L.d)+'</span></span><span class="ls" aria-label="'+st+' estrellas">'+(st ? starsTxt(st) : (cur && open ? "¡Sigue aquí!" : ""))+'</span></button>';
  }).join("") + '</section>';
  return h + footer();
}

/* NIVEL 1 · Entender */
function r1(c){
  var n = c.frases.length, f = c.frases[ch.i], seen = ch.seen || (ch.seen = {});
  seen[ch.i] = 1;
  var h = barHtml("Frase " + (ch.i + 1) + " de " + n, (ch.i + 1) / n * 100) + '<section class="card chcard">';
  h += '<p class="bigemo" aria-hidden="true">'+esc(pistaOf(f))+'</p>';
  h += '<p class="chtext" lang="'+c.idioma+'">' + (ch.hl != null && ch.hl.s === ch.i ? kTokens(f, c, ch.hl.w) : plainTokens(f, c)) + '</p>';
  h += '<p class="trad">'+esc(f.es || "")+'</p>';
  if(f.gesto) h += '<p class="gesto">🙌 Gesto: '+esc(f.gesto)+'</p>';
  h += '<div class="stack"><button class="btn btn-blue" type="button" data-act="ch-say" data-r="0.9">🔊 Escuchar</button>' +
    '<button class="btn btn-ghost" type="button" data-act="ch-say" data-r="0.55">🐢 Despacio</button>' +
    '<button class="btn btn-ghost" type="button" data-act="'+(ch.playing ? "ch-stopall" : "ch-playall")+'">'+(ch.playing ? "⏹ Parar" : "🎧 Escuchar toda la charla")+'</button>' +
    '<div class="row2"><button class="btn btn-ghost" type="button" data-act="ch-prev"'+(ch.i === 0 ? " disabled" : "")+'>◀</button>' +
    (ch.i < n - 1 ? '<button class="btn btn-blue" type="button" data-act="ch-next">Siguiente ▶</button>'
      : '<button class="btn btn-sun" type="button" data-act="ch-l1done"'+(Object.keys(seen).length >= n ? "" : " disabled")+'>¡Ya entendí mi charla! ✓</button>') + '</div></div></section>';
  return h;
}
function plainTokens(f, c){
  return tokens(f.t, c.idioma).map(function(w){ return '<button type="button" class="wtok" data-act="ch-word" data-w="'+esc(w)+'">'+esc(w)+'</button>'; }).join(c.idioma === "zh" ? "" : " ");
}
function kTokens(f, c, cur){
  return tokens(f.t, c.idioma).map(function(w, k){ return '<span class="wtok'+(k === cur ? " now" : k < cur ? " past" : "")+'">'+esc(w)+'</span>'; }).join(c.idioma === "zh" ? "" : " ");
}
function markedTokens(res, lang){
  return res.tk.map(function(w, k){ return '<button type="button" class="wtok '+res.marks[k]+'" data-act="ch-word" data-w="'+esc(w)+'">'+esc(w)+'</button>'; }).join(lang === "zh" ? "" : " ");
}
function micBtn(label){
  if(ch.listening) return '<button class="btn btn-sun rec" type="button" data-act="ch-done">🎤 Te escucho… (toca al terminar)</button>';
  return label ? '<button class="btn btn-sun" type="button" data-act="ch-rec">'+label+'</button>' : "";
}
function selfBtns(){ return '<div class="stack"><button class="btn btn-sun" type="button" data-act="ch-self" data-v="1">✅ Me salió</button><button class="btn btn-ghost" type="button" data-act="ch-self" data-v="0">🔁 Otra vez</button></div>'; }
function useMic(){ return !!RecAPI && !ch.noRec; }

/* NIVEL 2 · Eco: cada frase suena UNA vez; luego él toca «Escuchar otra vez» cuando quiera, repite y pasa a la siguiente (nada avanza solo) */
function r2(c){
  var n = c.frases.length, f = c.frases[ch.i], e = ch.e || {ph:"idle", plays:0, tries:0, best:0};
  var h = barHtml("Frase " + (ch.i + 1) + " de " + n, (ch.i + 1) / n * 100) + '<section class="card chcard"><p class="bigemo" aria-hidden="true">'+esc(pistaOf(f))+'</p>';
  h += '<p class="chtext" lang="'+c.idioma+'">' + (ch.res && ch.res.tk && ch.res.tk.length ? markedTokens(ch.res, c.idioma) : plainTokens(f, c)) + '</p><p class="trad">'+esc(f.es || "")+'</p>';
  var msg = e.ph === "play" ? "👂 Escucha…" : e.ph === "listen" ? "🎤 ¡Tu turno! Repite la frase" : (e.ph === "ready" && ch.res) ? nice(ch.res.pct) : e.ph === "ready" ? "¡Cuando estés listo, repite la frase!" : "";
  h += '<p class="chres '+(ch.res ? (ch.res.pct >= 60 ? "good" : "mid") : "")+'" role="status">'+esc(msg)+'</p>';
  if(ch.msg) h += '<p class="note" role="status">'+esc(ch.msg)+'</p>';
  h += '<div class="stack">';
  if(e.ph === "listen") h += micBtn();
  else {
    h += '<button class="btn btn-sun btn-big" type="button" data-act="ch-e-again"'+(e.ph === "play" ? " disabled" : "")+'>🔁 Escuchar otra vez</button>';
    if(useMic()) h += '<button class="btn btn-blue" type="button" data-act="ch-e-mic"'+(e.ph === "play" ? " disabled" : "")+'>🎤 Dilo tú</button>';
    else h += '<button class="btn btn-blue" type="button" data-act="ch-self" data-v="1"'+(e.ph === "play" ? " disabled" : "")+'>✅ Ya lo dije</button>';
    h += '<button class="btn btn-ghost" type="button" data-act="ch-e-next"'+(e.ph === "play" ? " disabled" : "")+'>'+(ch.i === n - 1 ? "¡Terminar el nivel! ✓" : "Siguiente frase ▶")+'</button>';
  }
  return h + '</div></section>';
}
/* suena la frase una vez (la primera despacio) */
function eStart(c){
  var f = c.frases[ch.i], e = ch.e = ch.e && ch.e.i === ch.i ? ch.e : {i:ch.i, ph:"idle", plays:0, tries:0, best:0};
  e.ph = "play"; ch.res = null; ch.msg = ""; render();
  var slow = e.plays === 0; e.plays++;
  speakC(f.t, c.idioma, slow ? 0.55 : 0.9, function(){ if(ch.lvl !== 2) return; e.ph = "ready"; render(); });
}
function eMic(c){
  var f = c.frases[ch.i], e = ch.e; if(!e) return;
  e.ph = "listen"; ch.res = null; render();
  doListen(c, f.t, function(res){ eResult(c, res); });
}
function eResult(c, res){
  var e = ch.e; ch.res = res; e.best = Math.max(e.best, res.pct); e.tries++; e.ph = "ready"; render();
}
function eNext(c){
  var e = ch.e; ch.scores[ch.i] = e ? e.best : 0; ch.res = null;
  if(ch.i >= c.frases.length - 1){ endLevel(2, avgScores()); return; }
  ch.i++; ch.e = null; render({top:true}); later(function(){ if(ch.lvl === 2) eStart(c); }, 300);
}
function avgScores(){ var s = Object.keys(ch.scores).map(function(k){ return ch.scores[k]; }); return s.length ? s.reduce(function(a, b){ return a + b; }, 0) / s.length : 0; }

/* Escucha con revisión; llama a cb con el resultado comparado. */
function doListen(c, target, cb, record){
  ch.listening = true; ch.msg = ""; render();
  var lv = ch.lvl;
  listenSmart(c.idioma, tokens(target, c.idioma).length, !!record, function(err, text, blob, mime){
    ch.listening = false;
    if(ch.lvl !== lv || !charlaById(ch.id)) return;
    if(err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture" || err === "language-not-supported"){
      ch.noRec = true; ch.msg = "No pude usar el micrófono. Di la frase en voz alta y toca «Me salió»."; ch.res = null;
      if(lv === 2 && ch.e) ch.e.ph = "ready"; render(); return;
    }
    var res = compare(target, text, c.idioma); res.blob = blob; res.mime = mime;
    if(!text && err !== "manual") { res.pct = 0; res.empty = true; }
    cb(res);
  });
}

/* NIVEL 3 · Bola de nieve */
function r3(c){
  var n = c.frases.length, s = ch.s || {k:1, ph:"idle", tries:0}, h = barHtml("Frases 1 a " + s.k + " de " + n, s.k / n * 100) + '<section class="card chcard">';
  var list = c.frases.slice(0, s.k);
  if(s.ph === "hard"){
    var hf = c.frases[s.hard];
    h += '<p class="small">Vamos a practicar solo esta frase 💪</p><p class="bigemo">'+esc(pistaOf(hf))+'</p><p class="chtext" lang="'+c.idioma+'">'+(ch.res ? markedTokens(ch.res, c.idioma) : plainTokens(hf, c))+'</p><p class="trad">'+esc(hf.es || "")+'</p>';
  } else {
    h += '<div class="chain" lang="'+c.idioma+'">' + list.map(function(f, i){
      var res = ch.chainRes && ch.chainRes.parts ? ch.chainRes.parts[i] : null;
      return '<p class="chtext sm">'+(res ? markedTokens(res, c.idioma) : plainTokens(f, c))+'</p>';
    }).join("") + '</div>';
  }
  var msg = s.ph === "play" ? "👂 Escucha la charla hasta aquí…" : s.ph === "listen" ? "🎤 ¡Tu turno! Repite todo" : s.ph === "hardplay" ? "👂 Escucha esta frase…" : s.ph === "hardlisten" ? "🎤 Repite solo esta frase" : s.ph === "fb" ? (ch.chainRes ? nice(ch.chainRes.pct) : (ch.res ? nice(ch.res.pct) : "")) : s.ph === "self" || s.ph === "hardself" ? "🎤 Tu turno: dilo en voz alta" : "Toca el botón para empezar";
  h += '<p class="chres" role="status">'+esc(msg)+'</p>';
  if(ch.msg) h += '<p class="note" role="status">'+esc(ch.msg)+'</p>';
  h += '<div class="stack">';
  if(s.ph === "idle") h += '<button class="btn btn-sun btn-big" type="button" data-act="ch-start">▶ Empezar</button>';
  if(s.ph === "listen" || s.ph === "hardlisten") h += micBtn();
  if(s.ph === "self" || s.ph === "hardself") h += selfBtns();
  if(s.ph !== "idle") h += '<button class="btn btn-ghost" type="button" data-act="ch-skip">Saltar ⏭</button>';
  return h + '</div></section>';
}
function sStart(c){
  var s = ch.s = ch.s || {k:1, ph:"idle", tries:0};
  s.ph = "play"; ch.res = null; ch.chainRes = null; ch.msg = ""; render();
  speakSeq(c.frases.slice(0, s.k).map(function(f){ return f.t; }), c.idioma, s.k === 1 ? 0.7 : 0.85, function(){
    if(ch.lvl !== 3) return;
    s.ph = useMic() ? "listen" : "self"; render();
    if(useMic()){
      var txt = c.frases.slice(0, s.k).map(function(f){ return f.t; }).join(" ");
      doListen(c, txt, function(res){ sChain(c, res); });
    }
  });
}
function sChain(c, res){
  var s = ch.s, parts = c.frases.slice(0, s.k).map(function(f){ return compare(f.t, res.heard, c.idioma); });
  res.parts = parts; ch.chainRes = res; s.ph = "fb"; render();
  var ok = res.pct >= 55, hard = 0, worst = 101;
  parts.forEach(function(p, i){ if(p.pct < worst){ worst = p.pct; hard = i; } });
  later(function(){
    if(ch.lvl !== 3) return;
    if(ok || s.tries >= 1){ if(!ok) ch.msg = ""; sAdvance(c, res.pct); }
    else { s.tries++; s.hard = hard; sHard(c); }
  }, 1700);
}
function sHard(c){
  var s = ch.s, f = c.frases[s.hard]; s.ph = "hardplay"; ch.res = null; ch.chainRes = null; render();
  speakC(f.t, c.idioma, 0.6, function(){
    if(ch.lvl !== 3) return;
    s.ph = useMic() ? "hardlisten" : "hardself"; render();
    if(useMic()) doListen(c, f.t, function(res){ ch.res = res; s.ph = "fb"; render(); later(function(){ if(ch.lvl === 3) sStart(c); }, 1500); });
  });
}
function sAdvance(c, pct){
  var s = ch.s; ch.scores[s.k - 1] = Math.max(ch.scores[s.k - 1] || 0, pct); ch.chainRes = null; ch.res = null;
  if(s.k >= c.frases.length){ endLevel(3, avgScores()); return; }
  s.k++; s.tries = 0; render({top:true}); later(function(){ if(ch.lvl === 3) sStart(c); }, 400);
}

/* NIVEL 4 · Sombra: la voz y él hablan al mismo tiempo, con el texto resaltado como karaoke */
function allTokens(c){
  var out = [];
  c.frases.forEach(function(f, s){ tokens(f.t, c.idioma).forEach(function(w, k){ out.push({w:w, s:s, k:k}); }); });
  return out;
}
function r4(c){
  var p = ch.pass || 0, h = '<section class="card chcard"><p class="small">Habla <b>al mismo tiempo</b> que la voz, como si cantaras karaoke. 🎶</p><p class="chtext sm karaoke" id="kt" lang="'+c.idioma+'">';
  var g = 0;
  h += c.frases.map(function(f){
    return tokens(f.t, c.idioma).map(function(w){ return '<span class="wtok" data-g="'+(g++)+'">'+esc(w)+'</span>'; }).join(c.idioma === "zh" ? "" : " ");
  }).join(" ") + '</p>';
  var msg = ch.kph === "run" ? (p === 0 ? "🐢 ¡Despacito! Habla con la voz…" : "🎤 ¡Ahora más rápido!") : ch.kph === "fb" ? "🎉 ¡Lo lograste!" : "";
  if(msg) h += '<p class="chres good" role="status">'+esc(msg)+'</p>';
  h += '<div class="stack">';
  if(ch.kph === "run") h += '<button class="btn btn-ghost" type="button" data-act="ch-stopall">⏹ Parar</button>';
  else if(ch.kph === "fb") h += '<button class="btn btn-sun btn-big" type="button" data-act="ch-kdone">'+(p === 0 ? "Ahora a velocidad normal ▶" : "¡Terminar el nivel! ✓")+'</button>';
  else h += '<button class="btn btn-sun btn-big" type="button" data-act="ch-kstart">▶ '+(p === 0 ? "Empezar (despacio)" : "Empezar (normal)")+'</button>';
  return h + '</div></section>';
}
function kSet(g){
  var box = document.getElementById("kt"); if(!box) return;
  var sp = box.querySelectorAll(".wtok");
  for(var i = 0; i < sp.length; i++) sp[i].className = "wtok" + (i === g ? " now" : i < g ? " past" : "");
}
function kStart(c){
  var rate = (ch.pass || 0) === 0 ? 0.6 : 0.9, toks = allTokens(c), base = 0, boundaryOk = false;
  ch.kph = "run"; render(); kSet(-1);
  var starts = []; c.frases.forEach(function(f, s){ starts.push(base); base += tokens(f.t, c.idioma).length; });
  speakSeq(c.frases.map(function(f){ return f.t; }), c.idioma, rate, function(){
    if(ch.lvl !== 4) return;
    kSet(toks.length); ch.kph = "fb"; render(); kSet(toks.length);
  }, function(s){
    /* respaldo por tiempo, por si la voz no avisa palabra por palabra */
    boundaryOk = false;
    var ws = tokens(c.frases[s].t, c.idioma), tot = ws.reduce(function(a, w){ return a + w.length + 2; }, 0), dur = estMs(c.frases[s].t, rate) - 300, acc = 0;
    kSet(starts[s]);
    ws.forEach(function(w, k){
      later(function(){ if(!boundaryOk && ch.lvl === 4 && ch.kph === "run") kSet(starts[s] + k); }, 250 + dur * acc / tot);
      acc += w.length + 2;
    });
  }, function(s){
    var txt = c.frases[s].t, pos = [], at = 0;
    tokens(txt, c.idioma).forEach(function(w){ var i = txt.indexOf(w, at); pos.push(i); at = i + w.length; });
    return {boundary:function(e){
      if(e.name && e.name !== "word") return;
      boundaryOk = true; var k = 0; for(var i = 0; i < pos.length; i++) if(pos[i] <= e.charIndex) k = i;
      kSet(starts[s] + k);
    }};
  });
}

/* NIVEL 5 · Desvanecer: texto completo → primeras letras → solo emojis → vacío */
var FADES = ["Con todo el texto", "Solo las primeras letras", "Solo los dibujos", "¡Sin ayuda!"];
function r5(c){
  var st = ch.fade || {st:0, tries:0, ph:"idle", sc:[]}, h = barHtml("Paso " + (st.st + 1) + " de 4 · " + FADES[st.st], (st.st + 1) / 4 * 100) + '<section class="card chcard">';
  var all = c.frases;
  if(ch.res && ch.res.full){ h += '<p class="chtext sm" lang="'+c.idioma+'">'+markedTokens(ch.res.full, c.idioma)+'</p>'; }
  else if(st.st === 0) h += '<p class="chtext sm" lang="'+c.idioma+'">'+all.map(function(f){ return plainTokens(f, c); }).join(" ")+'</p>';
  else if(st.st === 1) h += '<p class="chtext sm" lang="'+c.idioma+'">'+all.map(function(f){ return tokens(f.t, c.idioma).map(function(w){ return '<span class="wtok">'+esc(c.idioma === "zh" ? w : w.charAt(0) + "…")+'</span>'; }).join(" "); }).join(" ")+'</p>';
  else if(st.st === 2) h += '<p class="emorow" aria-label="Solo dibujos">'+all.map(function(f){ return '<span>'+esc(pistaOf(f))+'</span>'; }).join("")+'</p>';
  else h += '<p class="bigemo" aria-hidden="true">🙈</p><p class="small" style="text-align:center">Pantalla vacía: ¡tú puedes!</p>';
  var msg = st.ph === "listen" ? "🎤 Di toda la charla" : st.ph === "self" ? "🎤 Di toda la charla en voz alta" : st.ph === "fb" ? (ch.res ? nice(ch.res.pct) : "") : "Toca para decir la charla completa";
  h += '<p class="chres" role="status">'+esc(msg)+'</p>';
  if(ch.msg) h += '<p class="note" role="status">'+esc(ch.msg)+'</p>';
  h += '<div class="stack">';
  if(st.ph === "idle") h += '<button class="btn btn-sun btn-big" type="button" data-act="ch-start">🎤 Decir la charla</button>';
  if(st.ph === "listen") h += micBtn();
  if(st.ph === "self") h += selfBtns();
  if(st.ph === "idle") h += '<button class="btn btn-ghost" type="button" data-act="ch-say-all">🔊 Escucharla primero</button>';
  return h + '</div></section>';
}
function fStart(c){
  var st = ch.fade = ch.fade || {st:0, tries:0, ph:"idle", sc:[]};
  var full = c.frases.map(function(f){ return f.t; }).join(" ");
  st.ph = useMic() ? "listen" : "self"; ch.res = null; ch.msg = ""; render();
  if(useMic()) doListen(c, full, function(res){ res.full = res; fResult(c, res); });
}
function fResult(c, res){
  var st = ch.fade; ch.res = res; st.ph = "fb"; render();
  later(function(){
    if(ch.lvl !== 5) return;
    if(res.pct >= 50 || st.tries >= 1){ fAdvance(c, res.pct); } else { st.tries++; st.ph = "idle"; ch.res = null; ch.msg = "¡Otra vez, tú puedes! 💪"; render(); }
  }, 2200);
}
function fAdvance(c, pct){
  var st = ch.fade; st.sc.push(pct); ch.res = null; ch.msg = "";
  if(st.st >= 3){ endLevel(5, st.sc.reduce(function(a, b){ return a + b; }, 0) / st.sc.length); return; }
  st.st++; st.tries = 0; st.ph = "idle"; render({top:true});
}

/* NIVEL 6 · Ensayo final: de pie, de memoria, cuenta regresiva y grabación */
function r6(c){
  var f = ch.fin || (ch.fin = {ph:"ready"}), h = '<section class="card chcard">';
  if(f.ph === "ready") h += '<p class="bigemo" aria-hidden="true">🧍</p><p class="chtext sm" style="text-align:center">Párate derechito, respira hondo y di tu charla <b>completa, de memoria</b>.</p>' +
    '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="ch-go">¡Estoy listo! 🚀</button></div>';
  else if(f.ph === "count") h += '<p class="countdown" role="status" aria-live="assertive">'+esc(f.n > 0 ? String(f.n) : "¡Tu turno!")+'</p>';
  else if(f.ph === "listen") h += '<p class="bigemo" aria-hidden="true">🎤</p><p class="chres good" role="status">¡Tu turno! Di tu charla…</p><div class="stack">'+micBtn()+'</div>';
  else if(f.ph === "self") h += '<p class="bigemo" aria-hidden="true">🎤</p><p class="chres good" role="status">¡Tu turno! Di tu charla…</p><div class="stack"><button class="btn btn-sun" type="button" data-act="ch-fin-end">✅ Terminé</button></div>';
  else if(f.ph === "rate") h += '<p class="chres good">¿Cómo te salió?</p><div class="stack"><button class="btn btn-sun" type="button" data-act="ch-rate" data-v="95">😄 ¡Muy bien!</button><button class="btn btn-blue" type="button" data-act="ch-rate" data-v="65">🙂 Más o menos</button><button class="btn btn-ghost" type="button" data-act="ch-rate" data-v="40">🤔 Me faltó</button></div>';
  else if(f.ph === "res"){
    var res = f.res;
    h += '<p class="chres '+(res.pct >= 60 ? "good" : "mid")+'" role="status">'+esc(nice(res.pct))+' · '+res.pct+'%</p>';
    if(res.tk) h += '<p class="chtext sm" lang="'+c.idioma+'">'+markedTokens(res, c.idioma)+'</p><p class="small">Verde: las palabras que dijiste. Gris: las que faltaron esta vez.</p>';
    if(f.url) h += '<audio controls src="'+esc(f.url)+'"></audio>';
    h += '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="ch-fin-ok">¡Terminar el nivel! ✓</button><button class="btn btn-ghost" type="button" data-act="ch-again">🔁 Hacer otro ensayo</button></div>';
  }
  return h + '</section>';
}
function finStart(c){
  var f = ch.fin = {ph:"count", n:3};
  render({top:true});
  (function tick(){
    if(ch.lvl !== 6 || ch.fin !== f) return;
    render();
    if(f.n > 0){ speakC(["", "uno", "dos", "tres"][f.n], "es", 1.1); f.n--; later(tick, 1000); }
    else { speakC("¡Tu turno!", "es", 1.05); later(function(){ finListen(c); }, 700); }
  })();
}
function finListen(c){
  var f = ch.fin; if(!f || ch.lvl !== 6) return;
  var full = c.frases.map(function(x){ return x.t; }).join(" ");
  f.ph = useMic() ? "listen" : "self"; render();
  doListen(c, full, function(res){ finEnd(c, res); }, true);
  if(!useMic()) { /* solo graba; termina con el botón */ }
}
function finEnd(c, res){
  var f = ch.fin; if(!f) return;
  if(!useMic()){ f.blob = res.blob; f.mime = res.mime; f.ph = "rate"; render(); return; }
  f.res = res; f.blob = res.blob; f.mime = res.mime;
  if(res.blob){ try{ f.url = URL.createObjectURL(res.blob); }catch(e){} }
  f.ph = "res"; render({top:true});
}

/* ---- terminar un nivel ---- */
function endLevel(n, pct){
  chStop(); ch.listening = false;
  var id = ch.id, c = charlaById(id), stars = chFinish(n, pct), rd = chReady(id), title = c ? c.titulo : "";
  if(n === 6 && ch.fin && ch.fin.blob) grAdd(ch.fin.blob, ch.fin.mime, ch.fin.res ? ch.fin.res.pct : pct);
  var nextQ = ch.queue.length ? ch.queue.shift() : 0;
  modal = {type:"chend", lvl:n, name:LEVELS[n - 1].name, stars:stars, ready:rd, titulo:title, next:nextQ};
  ch.lvl = 0; ch.i = 0; ch.e = ch.s = ch.fade = ch.fin = ch.res = ch.chainRes = null; ch.scores = {}; ch.seen = null; ch.pass = 0; ch.kph = null; ch.playing = false;
  render({top:true});
}
function startLevel(n){
  var c = charlaById(ch.id); if(!c) return;
  chStop(); ch.lvl = n; ch.i = 0; ch.e = ch.s = ch.fade = ch.fin = ch.res = ch.chainRes = null; ch.scores = {}; ch.seen = null; ch.pass = 0; ch.kph = null; ch.msg = ""; ch.listening = false; ch.playing = false; ch.hl = null;
  render({top:true});
  if(n === 2) later(function(){ if(ch.lvl === 2) eStart(c); }, 300);
  if(n === 3) later(function(){ if(ch.lvl === 3) sStart(c); }, 300);
}

/* ---- clics ---- */
function charlaClick(act, el){
  if(act.indexOf("ch-") !== 0) return false;
  var c = charlaById(ch.id), f = c && c.frases[ch.i];
  switch(act){
    case "ch-open":
      chStop(); ch = {id:el.getAttribute("data-id"), lvl:0, queue:[], noRec:ch.noRec, noRecord:ch.noRecord, scores:{}};
      if(el.getAttribute("data-m") === "final"){ ch.queue = [4, 6]; }
      S.screen = "charla"; modal = null; render({top:true});
      if(ch.queue.length) startLevel(ch.queue.shift());
      return true;
    case "ch-menu": chStop(); ch.lvl = 0; ch.listening = false; ch.queue = []; render({top:true}); return true;
    case "ch-level":
      var n = +el.getAttribute("data-n");
      if(!chUnlocked(ch.id, n)){ ch.msg = "Primero termina el nivel " + (n - 1) + " 😉"; render(); return true; }
      startLevel(n); return true;
    case "ch-word": if(c) speakC(el.getAttribute("data-w"), c.idioma, 0.55); return true;
    case "ch-say": if(c && f) speakC(f.t, c.idioma, +el.getAttribute("data-r") || 0.9); return true;
    case "ch-say-all": if(c) speakSeq(c.frases.map(function(x){ return x.t; }), c.idioma, 0.85); return true;
    case "ch-playall":
      if(!c) return true; ch.playing = true; ch.hl = null; render();
      speakSeq(c.frases.map(function(x){ return x.t; }), c.idioma, 0.85, function(){ ch.playing = false; ch.hl = null; if(ch.lvl === 1) render(); }, function(k){ ch.i = k; ch.hl = {s:k, w:-1}; if(ch.lvl === 1) render(); });
      return true;
    case "ch-stopall": chStop(); ch.playing = false; ch.kph = null; ch.hl = null; render(); return true;
    case "ch-prev": if(ch.i > 0){ chStop(); ch.playing = false; ch.i--; ch.hl = null; render({top:true}); } return true;
    case "ch-next": if(c && ch.i < c.frases.length - 1){ chStop(); ch.playing = false; ch.i++; ch.hl = null; render({top:true}); } return true;
    case "ch-l1done": endLevel(1, 100); return true;
    case "ch-start":
      if(ch.lvl === 3) sStart(c); else if(ch.lvl === 5) fStart(c);
      return true;
    case "ch-e-again": if(c && ch.lvl === 2 && ch.e && ch.e.ph !== "play"){ chStop(); ch.listening = false; eStart(c); } return true;
    case "ch-e-mic": if(c && ch.lvl === 2) eMic(c); return true;
    case "ch-e-next": if(c && ch.lvl === 2){ chStop(); ch.listening = false; eNext(c); } return true;
    case "ch-rec": return true;
    case "ch-done": if(chCtl) chCtl.stop(); return true;
    case "ch-self":
      var ok = el.getAttribute("data-v") === "1", res = {tk:[], marks:[], pct:ok ? 100 : 0, heard:"", self:true};
      if(c && f && ch.lvl === 2){ res.tk = tokens(f.t, c.idioma); res.marks = res.tk.map(function(){ return ok ? "ok" : "small"; }); eResult(c, res); }
      else if(c && ch.lvl === 3){
        var s = ch.s;
        if(s.ph === "hardself"){ ch.res = null; later(function(){ sStart(c); }, 200); }
        else { var parts = c.frases.slice(0, s.k).map(function(x){ var tk = tokens(x.t, c.idioma); return {tk:tk, marks:tk.map(function(){ return ok ? "ok" : "small"; }), pct:ok ? 100 : 0}; }); sChain(c, {pct:ok ? 100 : 0, parts:parts, heard:""}); }
      } else if(c && ch.lvl === 5){
        var tk5 = c.frases.map(function(x){ return tokens(x.t, c.idioma).length; });
        fResult(c, {pct:ok ? 100 : 0, tk:[], marks:[], heard:""});
      }
      return true;
    case "ch-skip":
      if(!c) return true; chStop(); ch.listening = false;
      if(ch.lvl === 3){ sAdvance(c, 0); }
      return true;
    case "ch-kstart": if(c) kStart(c); return true;
    case "ch-kdone":
      if((ch.pass || 0) === 0){ ch.pass = 1; ch.kph = null; render({top:true}); } else endLevel(4, 100);
      return true;
    case "ch-go": if(c) finStart(c); return true;
    case "ch-fin-end": if(chCtl) chCtl.stop(); else if(c) finEnd(c, {blob:null, pct:0}); return true;
    case "ch-rate": endLevelFin(+el.getAttribute("data-v")); return true;
    case "ch-fin-ok": endLevel(6, ch.fin && ch.fin.res ? ch.fin.res.pct : 60); return true;
    case "ch-again": if(c) finStart(c); return true;
    case "ch-after": var nq = modal && modal.next; modal = null; if(nq) startLevel(nq); else render({top:true}); return true;
  }
  return false;
}
function endLevelFin(pct){ if(ch.fin) ch.fin.res = {pct:pct, tk:[], marks:[]}; endLevel(6, pct); }
