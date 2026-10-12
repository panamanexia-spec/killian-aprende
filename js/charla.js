"use strict";
/* ================================================================ CHARLAS ===
   Para estudiar una charla / presentación oral de formas distintas: escuchar y repetir con
   revisión de pronunciación, completar, ordenar y decirla de memoria. Todo gratis: la voz y el
   micrófono son los del navegador (SpeechSynthesis y SpeechRecognition), sin cuentas ni tarjetas. */
var LANGS = {en:{name:"inglés", tts:"en-US", rec:"en-US"}, es:{name:"español", tts:"es-US", rec:"es-MX"}, zh:{name:"chino", tts:"zh-CN", rec:"zh-CN"}};
var ch = {id:null, mode:"menu", i:0, res:null, listening:false, noRec:false, msg:"", scores:{}, lvl:0, cz:null, od:null, playing:false};
var RecAPI = window.SpeechRecognition || window.webkitSpeechRecognition || null;

function charlaById(id){ for(var i = 0; i < S.charlas.length; i++) if(S.charlas[i].id === id) return S.charlas[i]; return null; }
function cLang(c){ return LANGS[c.idioma] || LANGS.en; }

/* ---- validar una charla ---- */
function validateCharla(o){
  var E = [], c = {id:str(o.id), materia:str(o.materia), titulo:str(o.titulo), titulo_es:str(o.titulo_es), idioma:str(o.idioma) || "en", fecha:str(o.fecha_entrega || o.fecha), frases:[]};
  if(!/^[a-z0-9][a-z0-9_-]*$/i.test(c.id)) E.push("La charla necesita un «id» sin espacios ni acentos, por ejemplo thunder-rose.");
  if(!c.titulo) E.push("Falta el título de la charla.");
  if(!LANGS[c.idioma]) E.push("«idioma» debe ser en, es o zh.");
  if(c.fecha && !isDate(c.fecha)) E.push("La fecha de entrega no es válida (usa 2026-10-13).");
  (Array.isArray(o.frases) ? o.frases : []).forEach(function(f, i){
    var t = typeof f === "string" ? f : f && f.texto, es = f && typeof f === "object" ? str(f.es) : "";
    if(!str(t)) { E.push("Frase " + (i + 1) + ": está vacía."); return; }
    c.frases.push({t:str(t), es:es});
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

/* ---- palabras y comparación ---- */
function tokens(t, lang){
  if(lang === "zh") return Array.from(String(t)).filter(function(c){ return /[一-鿿]/.test(c); });
  return String(t).split(/\s+/).filter(Boolean);
}
function nrm(w){ return String(w).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9一-鿿']/g, ""); }
function compare(target, heard, lang){
  var tk = tokens(target, lang), best = null;
  heard.forEach(function(h){
    var hw = tokens(h, lang).map(nrm), used = {}, marks = tk.map(function(w){
      var n = nrm(w), k = hw.indexOf(n);
      while(k >= 0 && used[k]) k = hw.indexOf(n, k + 1);
      if(n && k >= 0){ used[k] = 1; return true; }
      return !n;
    });
    var ok = marks.filter(Boolean).length;
    if(!best || ok > best.ok) best = {marks:marks, ok:ok, heard:h};
  });
  best = best || {marks:tk.map(function(){ return false; }), ok:0, heard:""};
  best.tk = tk; best.pct = tk.length ? Math.round(best.ok / tk.length * 100) : 0;
  return best;
}

/* ---- voz ---- */
function speakC(text, lang, rate, done){
  if(!tts.ok){ if(done) done(); return; }
  try{
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(String(text)), L = LANGS[lang] || LANGS.en, v = pickVoice(lang === "zh" ? "zh" : lang);
    if(v){ u.voice = v; u.lang = v.lang; } else u.lang = L.tts;
    u.rate = rate || 0.9; u.pitch = 1.05;
    if(done){ u.onend = done; u.onerror = done; }
    window.speechSynthesis.speak(u);
  }catch(e){ if(done) done(); }
}
function listenOnce(lang, cb){
  var r = new RecAPI(); r.lang = (LANGS[lang] || LANGS.en).rec; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
  var got = false;
  r.onresult = function(e){
    got = true; var alts = [];
    for(var i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
    cb(null, alts);
  };
  r.onerror = function(e){ if(!got){ got = true; cb(e.error || "error"); } };
  r.onend = function(){ if(!got) cb("no-speech"); };
  try{ r.start(); }catch(e){ cb("error"); }
}

/* ---- guardar práctica ---- */
function chDone(){
  var k = ch.id + "|" + todayKey(); S.home.chd[k] = (S.home.chd[k] || 0) + 1; saveHome();
  markAutoDone("ch", ch.id);
}

/* ---- pantallas ---- */
function renderCharlas(){
  var h = subHeader("Mis charlas", "home", "← Inicio");
  if(!S.charlas.length) return h + '<p class="note">Todavía no hay charlas. Mamá las agrega en la zona de mamá. 😊</p>' + footer();
  h += '<section class="stack">' + S.charlas.map(function(c){
    return '<button class="btn btn-blue" type="button" data-act="ch-open" data-id="'+esc(c.id)+'">🎤 '+esc(c.titulo)+'<span class="small" style="display:block;color:#fff">'+esc(c.materia||"")+' · '+c.frases.length+' frases · en '+LANGS[c.idioma].name+'</span></button>';
  }).join("") + '</section>';
  return h + footer();
}
function renderCharla(){
  var c = charlaById(ch.id);
  if(!c) return renderCharlas();
  var L = cLang(c), back = ' data-act="ch-menu"';
  if(ch.mode === "menu"){
    var h = subHeader(c.titulo, "go-screen", "← Charlas").replace('data-act="go-screen"', 'data-act="go-screen" data-s="charlas"');
    h += '<section class="card"><span class="chip">'+esc(c.materia||"")+'</span><p>Elige cómo quieres estudiar tu charla en '+L.name+'. ¡Una a la vez!</p>' +
      (c.fecha ? '<p class="due">📅 Es '+esc(relDay(c.fecha))+'</p>' : '') + '<div class="stack">' +
      '<button class="btn btn-blue" type="button" data-act="ch-mode" data-m="listen">👂 Escucha y repite' + (c.idioma === "en" ? ' (pronunciación)' : '') + '</button>' +
      '<button class="btn btn-blue" type="button" data-act="ch-mode" data-m="cloze">🧩 Completa la palabra</button>' +
      '<button class="btn btn-blue" type="button" data-act="ch-mode" data-m="order">🔀 Pon las frases en orden</button>' +
      '<button class="btn btn-sun" type="button" data-act="ch-mode" data-m="memory">🙈 Dila de memoria</button>' +
      (ch.playing ? '<button class="btn btn-ghost" type="button" data-act="ch-stopall">⏹ Parar</button>' : '<button class="btn btn-ghost" type="button" data-act="ch-playall">🎧 Escuchar toda la charla</button>') +
      '</div></section>';
    return h + footer();
  }
  var n = c.frases.length, f = c.frases[ch.i] || c.frases[0];
  var h2 = subHeader({listen:"Escucha y repite", cloze:"Completa la palabra", order:"Pon las frases en orden", memory:"Dila de memoria"}[ch.mode], "ch-menu", "← Charla");
  if(ch.mode === "listen" || ch.mode === "memory") return h2 + renderSpeak(c, f, n, L) + footer();
  if(ch.mode === "cloze") return h2 + renderCloze(c, n) + footer();
  return h2 + renderOrder(c) + footer();
}
function bar(i, n){ return '<div class="progress-day"><div class="prog-row"><span>Frase '+(i + 1)+' de '+n+'</span></div><div class="bar"><i style="width:'+Math.round((i + 1) / n * 100)+'%"></i></div></div>'; }

function renderSpeak(c, f, n, L){
  var tk = tokens(f.t, c.idioma), res = ch.res, mem = ch.mode === "memory", lvl = mem ? ch.lvl : 0, h = bar(ch.i, n) + '<section class="card chcard">';
  var shown;
  if(mem && lvl >= 3 && !res) shown = '<p class="chhid">🙈 ' + tk.length + (c.idioma === "zh" ? ' letras' : ' palabras') + '. ¡Dila de memoria!</p>';
  else shown = '<p class="chtext" lang="'+c.idioma+'">' + tk.map(function(w, k){
    var cls = res ? (res.marks[k] ? " ok" : " miss") : "", txt = w;
    if(mem && !res){ if(lvl === 1 && k % 2 === 1) txt = "_".repeat(Math.max(2, nrm(w).length)); else if(lvl === 2) txt = w.charAt(0) + "…"; }
    return '<button type="button" class="wtok'+cls+'" data-act="ch-word" data-w="'+esc(w)+'">'+esc(txt)+'</button>';
  }).join(" ") + '</p>';
  h += shown;
  if(f.es && !(mem && lvl >= 2 && !res)) h += '<p class="small">'+esc(f.es)+'</p>';
  if(res){
    h += '<p class="chres '+(res.pct >= 80 ? "good" : res.pct >= 50 ? "mid" : "low")+'">' + (res.pct >= 80 ? "🌟 ¡Muy bien! " : res.pct >= 50 ? "👍 Casi. " : "💪 Inténtalo otra vez. ") + res.pct + '%</p>' +
      (res.pct < 100 ? '<p class="small">Toca las palabras en naranja para oírlas despacio.</p>' : '');
  }
  if(ch.msg) h += '<p class="note" role="status">'+esc(ch.msg)+'</p>';
  h += '<div class="stack">' +
    '<button class="btn btn-blue" type="button" data-act="ch-say" data-r="0.9">🔊 Escuchar</button>' +
    '<button class="btn btn-ghost" type="button" data-act="ch-say" data-r="0.55">🐢 Despacio</button>';
  if(RecAPI && !ch.noRec) h += '<button class="btn btn-sun'+(ch.listening ? " rec" : "")+'" type="button" data-act="ch-rec">'+(ch.listening ? "🎤 Te escucho…" : "🎤 Dilo tú")+'</button>';
  else h += '<button class="btn btn-sun" type="button" data-act="ch-self">✅ Lo dije yo</button>';
  if(mem){
    h += (lvl < 3 ? '<button class="btn btn-ghost" type="button" data-act="ch-lvl">🙈 Esconder más</button>' : '') +
         (lvl > 0 || res ? '<button class="btn btn-ghost" type="button" data-act="ch-see">👀 Ver la frase</button>' : '');
  }
  h += '<div class="row2"><button class="btn btn-ghost" type="button" data-act="ch-prev"'+(ch.i === 0 ? " disabled" : "")+'>◀</button>' +
    '<button class="btn btn-blue" type="button" data-act="ch-next">'+(ch.i === n - 1 ? "¡Terminar! ✓" : "Siguiente ▶")+'</button></div></div></section>';
  return h;
}

/* completar: se esconde una palabra y hay 3 opciones */
function clozeFor(c, i){
  var f = c.frases[i], tk = tokens(f.t, c.idioma);
  var cand = []; tk.forEach(function(w, k){ if(nrm(w).length >= (c.idioma === "zh" ? 1 : 4) && (k > 0 || tk.length < 3)) cand.push(k); });
  if(!cand.length) tk.forEach(function(w, k){ cand.push(k); });
  var pick = cand[(i * 7 + 3) % cand.length], ans = tk[pick], pool = [];
  c.frases.forEach(function(g){ tokens(g.t, c.idioma).forEach(function(w){ if(nrm(w) && nrm(w) !== nrm(ans) && pool.indexOf(w) < 0) pool.push(w); }); });
  var opts = [ans], k2 = 0;
  while(opts.length < 3 && k2 < pool.length){ var w = pool[(i * 5 + k2 * 3) % pool.length]; if(opts.indexOf(w) < 0 && nrm(w) !== nrm(ans)) opts.push(w); k2++; }
  opts.sort(function(a, b){ return hashText(a + i) < hashText(b + i) ? -1 : 1; });
  return {tk:tk, pick:pick, ans:ans, opts:opts};
}
function renderCloze(c, n){
  var z = clozeFor(c, ch.i), st = ch.cz || {};
  var sent = z.tk.map(function(w, k){ return k === z.pick ? '<span class="blank">'+(st.ok ? esc(w) : "_____")+'</span>' : esc(w); }).join(c.idioma === "zh" ? "" : " ");
  var h = bar(ch.i, n) + '<section class="card chcard"><p class="chtext" lang="'+c.idioma+'">'+sent+'</p>' + (c.frases[ch.i].es ? '<p class="small">'+esc(c.frases[ch.i].es)+'</p>' : '') +
    (st.wrong ? '<p class="note" role="status">Ese no. ¡Prueba otra! 💪</p>' : '') + '<div class="stack">';
  if(st.ok) h += '<p class="chres good">🌟 ¡Correcto!</p><button class="btn btn-blue" type="button" data-act="ch-say" data-r="0.9">🔊 Escuchar la frase</button><button class="btn btn-sun" type="button" data-act="ch-next">'+(ch.i === n - 1 ? "¡Terminar! ✓" : "Siguiente ▶")+'</button>';
  else h += z.opts.map(function(o){ return '<button class="btn btn-blue" type="button" data-act="ch-pick" data-w="'+esc(o)+'">'+esc(o)+'</button>'; }).join("");
  return h + '</div></section>';
}

/* ordenar: grupos de hasta 4 frases seguidas, mezcladas; se toca la que viene primero */
function orderStart(c){
  var s = ch.i, grp = c.frases.slice(s, s + 4).map(function(f, k){ return {k:s + k, t:f.t}; });
  var sh = grp.slice().sort(function(a, b){ return hashText(a.t + s) < hashText(b.t + s) ? -1 : 1; });
  if(sh.length > 1 && sh.every(function(x, k){ return x.k === grp[k].k; })) sh.push(sh.shift());
  ch.od = {start:s, grp:grp, left:sh, done:[], wrong:false};
}
function renderOrder(c){
  var o = ch.od, n = c.frases.length;
  if(!o) { orderStart(c); o = ch.od; }
  var h = bar(Math.min(o.start + o.done.length, n - 1), n) + '<section class="card chcard"><p>Toca la frase que va <b>primero</b>, después la siguiente…</p>';
  if(o.done.length) h += '<ol class="chdone" lang="'+c.idioma+'">' + o.done.map(function(x){ return '<li>'+esc(x.t)+'</li>'; }).join("") + '</ol>';
  if(o.wrong) h += '<p class="note" role="status">Esa no va ahora. ¡Prueba otra! 💪</p>';
  h += '<div class="stack">' + o.left.map(function(x){ return '<button class="btn btn-blue chopt" type="button" lang="'+c.idioma+'" data-act="ch-ord" data-k="'+x.k+'">'+esc(x.t)+'</button>'; }).join("") + '</div>';
  if(!o.left.length){
    var last = o.start + o.grp.length >= n;
    h += '<p class="chres good">🌟 ¡En orden!</p><button class="btn btn-sun" type="button" data-act="ch-next">'+(last ? "¡Terminar! ✓" : "Siguientes frases ▶")+'</button>';
  }
  return h + '</section>';
}

/* ---- clics ---- */
function chGo(i){ ch.i = i; ch.res = null; ch.listening = false; ch.msg = ""; ch.cz = null; ch.lvl = 0; if(ch.mode === "order") orderStart(charlaById(ch.id)); }
function charlaClick(act, el){
  if(act.indexOf("ch-") !== 0) return false;
  var c = charlaById(ch.id), f = c && c.frases[ch.i];
  switch(act){
    case "ch-open": ch = {id:el.getAttribute("data-id"), mode:"menu", i:0, res:null, listening:false, noRec:ch.noRec, msg:"", scores:{}, lvl:0, cz:null, od:null, playing:false}; S.screen = "charla"; render({top:true}); return true;
    case "ch-menu": if(tts.ok) window.speechSynthesis.cancel(); ch.mode = "menu"; ch.playing = false; render({top:true}); return true;
    case "ch-mode": ch.mode = el.getAttribute("data-m"); chGo(0); render({top:true}); return true;
    case "ch-playall":
      if(!c) return true; ch.playing = true; render();
      (function go(k){
        if(!ch.playing || ch.mode !== "menu" || k >= c.frases.length){ ch.playing = false; if(ch.mode === "menu") render(); return; }
        speakC(c.frases[k].t, c.idioma, 0.85, function(){ setTimeout(function(){ go(k + 1); }, 350); });
      })(0);
      return true;
    case "ch-stopall": ch.playing = false; if(tts.ok) window.speechSynthesis.cancel(); render(); return true;
    case "ch-word": if(c) speakC(el.getAttribute("data-w"), c.idioma, 0.55); return true;
    case "ch-say": if(c && f) speakC(f.t, c.idioma, +el.getAttribute("data-r") || 0.9); return true;
    case "ch-rec":
      if(!c || !f || ch.listening) return true;
      if(tts.ok) window.speechSynthesis.cancel();
      ch.listening = true; ch.msg = ""; render();
      listenOnce(c.idioma, function(err, alts){
        ch.listening = false;
        if(err){
          if(err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture" || err === "language-not-supported"){ ch.noRec = true; ch.msg = "No pude usar el micrófono. Di la frase en voz alta y toca «Lo dije yo»."; }
          else ch.msg = "No te escuché. Acércate un poquito y prueba otra vez. 🎤";
        } else {
          ch.res = compare(f.t, alts, c.idioma); ch.scores[ch.i] = Math.max(ch.scores[ch.i] || 0, ch.res.pct); ch.msg = "";
        }
        render();
      });
      return true;
    case "ch-self": ch.res = {marks:tokens(f.t, c.idioma).map(function(){ return true; }), pct:100}; ch.scores[ch.i] = 100; render(); return true;
    case "ch-lvl": ch.lvl = Math.min(3, ch.lvl + 1); ch.res = null; render(); return true;
    case "ch-see": ch.lvl = 0; render(); return true;
    case "ch-pick":
      var z = clozeFor(c, ch.i), w = el.getAttribute("data-w");
      if(nrm(w) === nrm(z.ans)){ ch.cz = {ok:true}; speakC(f.t, c.idioma, 0.9); } else ch.cz = {wrong:true};
      render(); return true;
    case "ch-ord":
      var o = ch.od, k = +el.getAttribute("data-k"), next = o.start + o.done.length;
      if(k === next){ o.done.push(o.left.filter(function(x){ return x.k === k; })[0]); o.left = o.left.filter(function(x){ return x.k !== k; }); o.wrong = false; if(!o.left.length) speakC(o.grp.map(function(x){ return x.t; }).join(" "), c.idioma, 0.85); }
      else o.wrong = true;
      render(); return true;
    case "ch-prev": if(ch.i > 0){ chGo(ch.i - 1); render(); } return true;
    case "ch-next":
      var n = c.frases.length, step = ch.mode === "order" && ch.od ? ch.od.grp.length : 1;
      if(ch.i + step >= n){
        chDone(); var sc = Object.keys(ch.scores).map(function(k){ return ch.scores[k]; }), avg = sc.length ? Math.round(sc.reduce(function(a, b){ return a + b; }, 0) / sc.length) : 0;
        var mode = ch.mode; ch.mode = "menu"; ch.msg = "";
        modal = {type:"chend", mode:mode, avg:avg, titulo:c.titulo};
        render({top:true});
      } else { chGo(ch.i + step); render({top:true}); }
      return true;
  }
  return false;
}
