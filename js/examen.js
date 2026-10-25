"use strict";
/* ================================================================== EXÁMENES ===
   Un mismo motor para todos los temas (el de OVER-/UNDER- incluido): una pregunta por pantalla,
   corrección con explicación, «Intentarlo otra vez» con preguntas nuevas y mini vocabulario. */
var ex = {es:{}, sel:null, hint:""};            /* «ver en español» por pregunta; palabra elegida al unir */
var vx = {fb:null, text:""};           /* mini vocabulario: respuesta mostrada / texto escrito */

function XL(){ var c = S.ex && S.ex.cur; return c && c.tema && c.tema.idioma === "es" ? "es" : "en"; }
function tfWord(v){ return XL() === "es" ? (v ? "VERDADERO" : "FALSO") : (v ? "TRUE" : "FALSE"); }
/* «Te lo explico fácil»: lecciones cortas del tema (en español), para repasar lo que falló. */
function lessonsHtml(tid, subs){
  var t = temaById(tid), L = t && t.lecciones ? t.lecciones : [];
  if(subs) L = L.filter(function(l){ return !l.subtema || subs.indexOf(l.subtema) >= 0; });
  if(!L.length) return "";
  return '<section class="card lessons"><h2 class="sec-title">😊 Te lo explico fácil</h2>' + L.map(function(l){
    return '<article class="lesson"><h3>' + esc(l.emoji || "📘") + ' ' + esc(l.titulo) + ' ' + spk(l.pasos.join(". ") + (l.ejemplo ? ". Ejemplo. " + l.ejemplo : ""), "es", "mini") + '</h3>' +
      '<ol>' + l.pasos.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join("") + '</ol>' +
      (l.ejemplo ? '<p class="ex-box"><b>Ejemplo:</b> ' + esc(l.ejemplo) + '</p>' : '') + (l.truco ? '<p class="trick">💡 ' + esc(l.truco) + '</p>' : '') + '</article>';
  }).join("") + '</section>';
}
/* ---- ✅ Hecho: una práctica con 80 % o más aprueba el tema (la primera vez que pasa queda guardado el día) ---- */
var PASS = 80;
function aprTs(tid){
  var t = S.home.apr[tid] || 0;
  if(!t){ var h = tHist(tid); for(var i = 0; i < h.length; i++) if(h[i].score >= PASS && h[i].mode !== "train"){ t = h[i].ts; break; } }
  return t;
}
/* Mejor nota en «Examen real» (para compararla con la nota del colegio). */
function bestReal(tid){ return tHist(tid).reduce(function(m, a){ return a.mode === "real" ? Math.max(m, a.score) : m; }, -1); }
function realCount(tid){ return tHist(tid).filter(function(a){ return a.mode === "real"; }).length; }
function aprLine(tid){
  var t = aprTs(tid); if(!t) return "";
  var d = ""; try{ d = new Date(t).toLocaleDateString("es", {day:"numeric", month:"short"}); }catch(e){}
  return "Puntaje " + bestOf(tid) + " · " + d;
}
function allTemas(){ return builtinTemas().concat(S.temas); }
function temaById(id){ var l = allTemas(); for(var i=0;i<l.length;i++) if(l[i].id === id) return l[i]; return null; }
function tHist(tid){ return S.ex.hist[tid] || []; }
function bestOf(tid){ return tHist(tid).reduce(function(m, a){ return Math.max(m, a.score); }, 0); }
function seenIds(tid){ var o = {}; tHist(tid).forEach(function(a){ (a.seen || []).forEach(function(id){ o[id] = 1; }); }); return o; }
function curFor(tid){ var c = S.ex.cur; return c && c.tema.id === tid ? c : null; }

/* ---------- texto tolerante (mayúsculas, acentos, signos y espacios) ---------- */
function norm(s){
  var t = String(s == null ? "" : s).toLowerCase();
  try{ t = t.normalize("NFD").replace(/[̀-ͯ]/g, ""); }catch(e){}
  return t.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function sameWord(ans, list){ var a = norm(ans); return !!a && list.some(function(x){ return norm(x) === a; }); }

/* ---------- armar una ronda ---------- */
function prepQuestion(q){
  var o = JSON.parse(JSON.stringify(q));
  o.peso = +o.peso > 0 ? +o.peso : 1;
  if(o.tipo === "unir"){
    var rights = o.pares.map(function(p){ return p.derecha; }), r, n = 0;
    do { r = shuffle(rights); n++; } while(n < 6 && r.join("|") === rights.join("|"));
    o.rights = r;
  }
  return o;
}
function chooseQuestions(tema, n){
  var h = tHist(tema.id), seen = seenIds(tema.id), last = h[h.length - 1] || {wrong:[], subWrong:{}};
  var bank = tema.preguntas.map(function(q){
    var tier = !seen[q.id] ? (last.subWrong && last.subWrong[q.subtema] ? 0 : 1) : ((last.wrong || []).indexOf(q.id) >= 0 ? 2 : 3);
    return {q:q, tier:tier, r:Math.random()};
  });
  bank.sort(function(a, b){ return a.tier - b.tier || a.r - b.r; });
  return shuffle(bank.slice(0, Math.min(n, bank.length)).map(function(x){ return x.q; }));
}
function startRound(tid, official, errorsOnly, mode){
  var tema = temaById(tid); if(!tema) return;
  var h = tHist(tid), round = h.length + 1, qs, usedOfficial = false;
  var n = tema.preguntas_por_ronda || 10, real = mode === "real";
  var wrongQ = errorsOnly && !real ? tema.preguntas.filter(function(q){ return wrongIdsOf(tid).indexOf(q.id) >= 0; }) : [];
  if(wrongQ.length){ qs = shuffle(wrongQ); }
  else if(tema.examen_oficial && tema.examen_oficial.length && (official || real || !h.length)){
    var byId = {}; tema.preguntas.forEach(function(q){ byId[q.id] = q; });
    qs = tema.examen_oficial.map(function(id){ return byId[id]; }).filter(Boolean); usedOfficial = true;
  } else qs = chooseQuestions(tema, n);
  S.ex.cur = {tema:{id:tema.id, idioma:tema.idioma === "es" ? "es" : "en", vocabulario_pregunta_es:tema.vocabulario_pregunta_es || "", materia:tema.materia || "", titulo:tema.titulo, titulo_es:tema.titulo_es || "", vocabulario:tema.vocabulario.slice(0, 60), subtemas:tema.subtemas || []},
    round:round, mode:real ? "real" : "train", errorsOnly:!!(errorsOnly && wrongQ.length), secs:0, warned:false, official:usedOfficial, qs:qs.map(prepQuestion), idx:0, answers:{}, phase:"q", t0:Date.now(), vocab:null, result:null, at:null};
  S.tid = tid; S.screen = "exam"; ex.es = {}; ex.warn = false; ex.sel = null; modal = null; filter = "all";
  save(); render({top:true});
}

/* ---------- corrección ---------- */
function isAnswered(q, a){
  if(q.tipo === "unir") return !!a && Object.keys(a).length > 0;
  if(q.tipo === "verdadero_falso") return a === true || a === false;
  return a != null && String(a).trim() !== "";
}
function fracOf(q, a){
  if(!isAnswered(q, a)) return 0;
  switch(q.tipo){
    case "opcion_multiple": return a === q.correcta ? 1 : 0;
    case "verdadero_falso": return a === q.correcta ? 1 : 0;
    case "completar": return sameWord(a, [q.respuesta].concat(q.aceptadas || [])) ? 1 : 0;
    case "unir": var ok = 0; q.pares.forEach(function(p, i){ if(a[i] === p.derecha) ok++; }); return ok / q.pares.length;
  }
  return 0;
}
function gradeCur(c){
  return c.qs.map(function(q){
    var a = c.answers[q.id], f = fracOf(q, a);
    return {q:q, a:a, answered:isAnswered(q, a), frac:f, ok:f === 1};
  });
}
function resultOf(grades){
  var earned = 0, total = 0, wrong = [], subWrong = {};
  grades.forEach(function(g){
    earned += g.q.peso * g.frac; total += g.q.peso;
    if(!g.ok){ wrong.push(g.q.id); subWrong[g.q.subtema] = (subWrong[g.q.subtema] || 0) + 1; }
  });
  return {score:total ? Math.round(earned / total * 100) : 0, units:Math.round(earned), total:total, wrong:wrong, subWrong:subWrong};
}
function messageFor(score, title){
  var t = title ? " " + title : " este tema";
  if(score >= 90) return "¡Excelente! 🌟 Dominas muy bien" + t + ".";
  if(score >= 80) return "¡Muy bien! 👏 Comprendes el tema. Repasa las palabras que te faltaron.";
  if(score >= 70) return "¡Buen trabajo! 💪 Vas aprendiendo. Vamos a practicar un poquito más.";
  if(score >= 60) return "¡Sigue adelante! 📚 Ya estás aprendiendo. Repasemos juntos las palabras difíciles.";
  return "¡No te rindas! ❤️ Equivocarse es parte de aprender. Vamos a repasar y después puedes intentarlo otra vez.";
}
function subName(sub){ return C[sub] ? C[sub].word : String(sub); }

/* ---------- pantalla del tema ---------- */
function statusOf(tid){
  var c = curFor(tid), h = tHist(tid);
  if(c && c.phase === "q"){ var n = c.qs.filter(function(q){ return isAnswered(q, c.answers[q.id]); }).length; return "✏️ En curso: " + n + " de " + c.qs.length; }
  if(c && c.phase === "vocab") return "🔤 Falta el mini vocabulario";
  if(aprTs(tid)) return "✅ ¡Ya lo hiciste! · " + aprLine(tid) + " · " + h.length + (h.length === 1 ? " intento" : " intentos");
  if(h.length) return "⏳ " + h.length + (h.length === 1 ? " intento" : " intentos") + " · 🏆 Mejor nota: " + bestOf(tid) + " / 100";
  return "🆕 Sin empezar";
}
function renderTopics(){
  var h = subHeader("Mis temas");
  allTemas().forEach(function(t){
    var exm = t.fecha_examen ? '<p>🗓️ Examen: ' + esc(dayLabel(t.fecha_examen)) + ' (' + esc(relDay(t.fecha_examen)) + ')</p>' : "";
    h += '<article class="card topic"><span class="chip">' + esc(t.materia || "Tema") + '</span><h3>' + esc(t.titulo_es || t.titulo) + '</h3>' +
      (t.titulo_es ? '<p lang="' + (t.idioma === "es" ? "es" : "en") + '">' + esc(t.titulo) + '</p>' : '') + exm + '<p>' + statusOf(t.id) + '</p>' +
      '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="open-tema" data-id="' + esc(t.id) + '">Abrir este tema</button></div></article>';
  });
  if(!S.temas.length) h += '<p class="note">Aquí irán apareciendo los temas de estudio que mamá agregue.</p>';
  return h + footer();
}
function renderTema(){
  var t = temaById(S.tid);
  if(!t) return subHeader("Tema", "go-screen", "← Mis temas") + '<p class="note">No encuentro ese tema.</p>' + footer();
  var c = curFor(t.id), h = tHist(t.id), main = "";
  if(c && c.phase === "q"){
    var n = c.qs.filter(function(q){ return isAnswered(q, c.answers[q.id]); }).length;
    main += '<button class="btn btn-sun btn-big" type="button" data-act="x-continue">CONTINUAR MI EXAMEN (' + n + ' de ' + c.qs.length + ')</button>';
  } else if(c && c.phase === "vocab") main += '<button class="btn btn-sun btn-big" type="button" data-act="x-continue">CONTINUAR (mini vocabulario)</button>';
  else if(c && c.phase === "res") main += '<button class="btn btn-sun btn-big" type="button" data-act="x-continue">VER MIS RESULTADOS</button>';
  var other = S.ex.cur && S.ex.cur.tema.id !== t.id && S.ex.cur.phase !== "res";
  main += '<button class="btn ' + (main ? "btn-ghost" : "btn-blue btn-big") + '" type="button" data-act="x-start">🏋️ Entrenar</button>' +
    '<p class="small" style="text-align:center;margin:0">Con ayudas para aprender. ¡Sin presión!</p>' +
    '<button class="btn ' + (main ? "btn-ghost" : "btn-sun btn-big") + '" type="button" data-act="x-real">📝 Examen real</button>' +
    '<p class="small" style="text-align:center;margin:0">Como en el colegio: sin ayudas y con reloj. Con 80 o más ganas tu ✅.</p>';
  var hist = h.length ? '<section class="card"><h2 class="sec-title">Mis intentos</h2>' + h.slice().reverse().map(function(a, i){
    var d = ""; try{ d = new Date(a.ts).toLocaleDateString("es", {day:"numeric", month:"short"}); }catch(e){}
    return '<p class="wordrow"><b>' + a.score + ' / 100</b><span>Intento ' + a.n + ' · ' + esc(d) + (a.vocab ? ' · 🔤 ' + a.vocab.ok + '/' + a.vocab.total : '') + '</span></p>';
  }).join("") + '</section>' : "";
  var banner = aprTs(t.id) ? '<section class="doneban" role="status"><b>✅ ¡Ya lo hiciste!</b><span>' + esc(aprLine(t.id)) + '</span></section>' : "";
  return subHeader(t.titulo_es || t.titulo, "go-screen", "← Mis temas") + banner +
    '<main class="card hero"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><span class="eng">' + esc(t.materia || "Tema") + '</span>' +
    '<h1>' + esc(t.titulo_es || t.titulo) + '</h1>' + (t.titulo_es ? '<p class="lead" lang="' + (t.idioma === "es" ? "es" : "en") + '">' + esc(t.titulo) + '</p>' : '') +
    (t.fecha_examen ? '<p class="lead">🗓️ Examen: ' + esc(dayLabel(t.fecha_examen)) + ' (' + esc(relDay(t.fecha_examen)) + ')</p>' : '') +
    '<p class="note">No te preocupes si te equivocas. Este examen te ayudará a aprender.</p>' +
    '<div class="how"><h2>Instrucciones:</h2><ul><li>Lee cada pregunta con atención.</li><li>Selecciona o escribe tu respuesta.</li><li>🏋️ <b>Entrenar</b> tiene ayudas. 📝 <b>Examen real</b> es como en el colegio: sin ayudas y con reloj.</li>' +
    (t.idioma === "es" ? "" : '<li>En «Entrenar», si no sabes, pulsa «Ver en español» o piensa en el significado de la oración.</li>') +
    '<li>Nunca dejes una pregunta en blanco: escribe tu mejor idea 🍀</li><li>Cuando termines, pulsa el botón "TERMINAR EXAMEN".</li><li>Después podrás revisar tus errores y aprender de ellos.</li></ul></div>' +
    '<p>' + statusOf(t.id) + '</p>' + (other ? '<p class="small">Tienes otro examen a medias. Si empiezas este, el otro se cierra.</p>' : '') +
    '<div class="stack">' + main + '</div>' +
    '<div class="stack">' + (t.resumen.length ? '<button class="btn btn-blue" type="button" data-act="study" data-id="' + esc(t.id) + '">📖 Estudiar el resumen</button>' : '') +
    (t.vocabulario.length && t.idioma !== "es" ? '<button class="btn btn-ghost" type="button" data-act="dict-open" data-id="' + esc(t.id) + '">🔤 Sus palabras</button>' : '') + '</div></main>' +
    hist + footer();
}

/* ---------- el examen, una pregunta por pantalla ---------- */
function examHeader(){ return subHeader(S.ex.cur.tema.titulo_es || S.ex.cur.tema.titulo, "home", "🏠 Inicio"); }
function isReal(c){ return !!c && c.mode === "real"; }
function fmtClock(sec){ sec = Math.max(0, Math.round(sec || 0)); return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); }
function qImg(q){ return q.imagen ? '<img class="qimg" src="img/temas/' + esc(q.imagen) + '" alt="Dibujo de la pregunta" loading="lazy">' : ""; }
/* Reloj del examen real: cuenta el tiempo usado (sin cuenta regresiva), solo mientras está en la pantalla del examen. */
setInterval(function(){
  var c = S.ex && S.ex.cur;
  if(!isReal(c) || c.phase !== "q" || S.screen !== "exam" || document.hidden) return;
  c.secs = (c.secs || 0) + 1;
  var e = document.getElementById("xclock"); if(e) e.textContent = "⏱️ " + fmtClock(c.secs);
  if(c.secs % 15 === 0) save();
}, 1000);
function progressHtml(){
  var c = S.ex.cur, total = c.qs.length, ans = c.qs.filter(function(q){ return isAnswered(q, c.answers[q.id]); }).length;
  var dots = c.qs.map(function(q, i){
    var cls = "dot" + (isAnswered(q, c.answers[q.id]) ? " done" : "") + (i === c.idx ? " now" : "");
    return '<button type="button" class="' + cls + '" data-act="x-goto" data-i="' + i + '" aria-label="Ir a la pregunta ' + (i + 1) + '"' + (i === c.idx ? ' aria-current="step"' : '') + '>' + (i + 1) + '</button>';
  }).join("");
  return '<div class="prog-row"><span id="plabel">Pregunta ' + (c.idx + 1) + ' de ' + total + (c.round > 1 ? ' · Intento ' + c.round : '') + '</span><span id="pcount">✏️ ' + ans + ' de ' + total + ' respondidas</span></div>' +
    '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + ans + '" aria-label="Preguntas respondidas"><i id="pbar" style="width:' + Math.round(ans / total * 100) + '%"></i></div>' +
    '<div class="dots" id="dots">' + dots + '</div>';
}
function updateExamChrome(){
  var c = S.ex.cur; if(!c) return;
  var total = c.qs.length, n = c.qs.filter(function(q){ return isAnswered(q, c.answers[q.id]); }).length;
  var pc = document.getElementById("pcount"), pb = document.getElementById("pbar");
  if(pc) pc.textContent = "✏️ " + n + " de " + total + " respondidas";
  if(pb){ pb.style.width = Math.round(n / total * 100) + "%"; if(pb.parentNode) pb.parentNode.setAttribute("aria-valuenow", n); }
  var dots = document.querySelectorAll("#dots .dot");
  c.qs.forEach(function(q, i){ if(dots[i]) dots[i].classList.toggle("done", isAnswered(q, c.answers[q.id])); });
}
var DEFAULT_INSTR = {opcion_multiple:"Lee la pregunta y elige la respuesta correcta.", verdadero_falso:"Decide si la oración es verdadera o falsa.",
  unir:"Une cada palabra con su pareja.", completar:"Escribe en inglés la palabra que falta."};
function esT(){ return XL() === "es"; }   /* tema en español: nada de «inglés» ni «Ver en español» */
function renderQuestionBody(q, a, c){
  var h = "";
  if(q.tipo === "opcion_multiple"){
    h += '<div class="opts" role="group" aria-label="Opciones">' + q.opciones.map(function(o, i){
      return '<button type="button" class="opt" lang="' + XL() + '" data-act="x-pick" data-v="' + esc(o) + '" aria-pressed="' + (a === o) + '"><span class="let">' + LET[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join("") + '</div>';
  } else if(q.tipo === "verdadero_falso"){
    h += '<div class="opts tf" role="group" aria-label="Verdadero o falso">' +
      '<button type="button" class="opt" lang="' + XL() + '" data-act="x-tf" data-v="true" aria-pressed="' + (a === true) + '"><span class="let">✓</span><span>' + (XL() === "es" ? "Verdadero" : "True") + '</span></button>' +
      '<button type="button" class="opt" lang="' + XL() + '" data-act="x-tf" data-v="false" aria-pressed="' + (a === false) + '"><span class="let">✗</span><span>' + (XL() === "es" ? "Falso" : "False") + '</span></button></div>';
  } else if(q.tipo === "completar"){
    if(c.round > 1 && q.pista_es && !isReal(c)) h += '<p class="hint">💡 Pista: ' + esc(q.pista_es) + '</p>';
    h += '<label for="xans" class="sec-es">' + (esT() ? "Escribe la palabra:" : "Escribe la palabra completa en inglés:") + '</label>' +
      '<input id="xans" class="write" lang="' + XL() + '" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" value="' + esc(a || "") + '" placeholder="Escribe aquí…">';
  } else {
    var used = {}; a = a || {};
    Object.keys(a).forEach(function(k){ used[a[k]] = +k; });
    var cur = ex.sel;
    var msg = ex.hint || (cur != null ? "Paso 2: toca el significado de <b>" + esc(q.pares[cur].izquierda) + "</b>." : "Paso 1: toca una palabra" + (esT() ? "." : " en inglés."));
    h += '<div class="match"><div><h3>1. Palabras</h3><div class="words">' + q.pares.map(function(p, i){
      var r = a[i], L = r != null ? LET[q.rights.indexOf(r)] : null;
      return '<button type="button" class="w' + (r != null ? " set" : "") + (i === cur ? " sel" : "") + '" lang="' + XL() + '" data-act="x-lw" data-i="' + i + '" aria-pressed="' + (i === cur) + '">' +
        '<small>' + (i + 1) + '.</small>' + esc(p.izquierda) + '<span class="tag" aria-label="' + (L ? "elegiste " + L : "sin elegir") + '">' + (L || "?") + '</span></button>';
    }).join("") + '</div></div><p class="step-msg" role="status">' + msg + '</p>' +
    '<div><h3>2. Significados</h3><div class="means">' + q.rights.map(function(r, i){
      var u = used[r];
      return '<button type="button" class="m' + (u != null ? " on" : "") + '" data-act="x-rm" data-i="' + i + '"><span class="let">' + LET[i] + '</span><span>' + esc(r) + '</span>' +
        (u != null ? '<span class="used" lang="' + XL() + '">' + esc(q.pares[u].izquierda) + '</span>' : '') + '</button>';
    }).join("") + '</div></div></div>';
  }
  return h;
}
function renderExam(){
  var c = S.ex.cur;
  if(!c || c.phase !== "q"){ S.screen = "home"; return renderHome(); }
  var q = c.qs[c.idx], last = c.idx === c.qs.length - 1, a = c.answers[q.id];
  var real = isReal(c), miss = c.qs.filter(function(x){ return !isAnswered(x, c.answers[x.id]); }).length;
  var body = (real ? '<p class="realbar"><span class="chip">📝 Examen real</span><span class="clock" id="xclock" aria-label="Tiempo usado">⏱️ ' + fmtClock(c.secs) + '</span></p>' : '') +
    (c.warned && miss ? '<p class="blankwarn" role="status">⚪ Te faltan ' + miss + '. ¡Nunca dejes una en blanco! Escribe tu mejor idea 🍀</p>' : '') +
    '<span class="chip">' + esc(q.seccion || c.tema.titulo_es || c.tema.titulo) + '</span><p class="sec-es">' + esc(q.instruccion_es || (esT() && q.tipo === "completar" ? "Escribe la palabra que falta." : DEFAULT_INSTR[q.tipo])) + '</p>';
  body += '<div class="qrow"><p class="qtext" lang="' + XL() + '">' + blankHtml(q.pregunta_en) + '</p>' + spk(q.pregunta_en, XL()) + '</div>';
  if(q.base_word) body += '<p class="base" lang="' + XL() + '">Base word: <b>' + esc(q.base_word) + '</b></p>';
  body += qImg(q);
  if(q.pregunta_es && !esT() && !real){
    body += ex.es[q.id] ? '<p class="es-box">🇪🇸 ' + blankHtml(q.pregunta_es) + '</p>' :
      '<button type="button" class="link-btn es-btn" data-act="x-es">🇪🇸 Ver en español</button>';
  }
  body += renderQuestionBody(q, a, c);
  return examHeader() + '<section class="prog" aria-label="Progreso">' + progressHtml() + '</section>' +
    '<main class="card qcard" id="qcard">' + body + '</main>' +
    '<nav class="nav" aria-label="Navegación"><button type="button" class="btn btn-ghost" data-act="x-prev"' + (c.idx === 0 ? ' disabled' : '') + '>← Anterior</button>' +
    (last ? '<button type="button" class="btn btn-sun" data-act="x-finish">TERMINAR EXAMEN</button>' : '<button type="button" class="btn btn-blue" data-act="x-next">Siguiente →</button>') + '</nav>' +
    (last ? '' : '<div class="finish-row"><button type="button" class="btn btn-ghost" data-act="x-finish">TERMINAR EXAMEN</button></div>') + footer();
}
function xGo(i){ var c = S.ex.cur; c.idx = Math.min(Math.max(i, 0), c.qs.length - 1); ex.sel = null; ex.hint = ""; save(); render({top:true}); }
function xSet(v){ var c = S.ex.cur, q = c.qs[c.idx]; c.answers[q.id] = v; save(); render(); }
function xTryFinish(){
  var c = S.ex.cur, first = -1;
  c.qs.forEach(function(q, i){ if(first < 0 && !isAnswered(q, c.answers[q.id])) first = i; });
  if(first >= 0 && !c.warned){ c.warned = true; xGo(first); return; }   /* 1.ª vez: aviso cariñoso y lo lleva a la primera vacía */
  xFinish();
}
function xFinish(){
  var c = S.ex.cur, g = gradeCur(c), r = resultOf(g), H = S.home;
  modal = null;
  var att = {n:c.round, ts:Date.now(), score:r.score, units:[r.units, r.total], wrong:r.wrong, subWrong:r.subWrong,
    seen:c.qs.map(function(q){ return q.id; }), official:c.official, nq:c.qs.length, vocab:null,
    mode:c.mode === "real" ? "real" : "train", secs:c.secs || 0, full:c.qs.every(function(q){ return isAnswered(q, c.answers[q.id]); })};
  var h = S.ex.hist[c.tema.id] = (S.ex.hist[c.tema.id] || []).concat([att]).slice(-30);
  c.result = {score:r.score, units:r.units, total:r.total, ts:att.ts};
  c.at = att.ts;
  H.tries++; H.best = Math.max(H.best, r.score);
  /* ✅ 80 % o más: la tarea de ese tema queda hecha (agenda y automáticas). Menos de 80 %: no se marca. */
  var tid0 = c.tema.id;
  var real = isReal(c), prevApr = !!(H.apr[tid0] || (S.ex.hist[tid0] || []).slice(0, -1).some(function(a){ return a.score >= PASS && a.mode !== "train"; }));
  c.score = r.score; c.passed = real && r.score >= PASS; c.fullRound = att.full; c.firstPass = c.passed && !prevApr; c.extra = false;
  if(c.passed && !H.apr[tid0]) H.apr[tid0] = Date.now();
  /* tareas de estudio: se marcan al terminar una ronda COMPLETA; «Repasar mis errores», al corregir todo lo que falló */
  if(att.full) markAutoDone("ex", tid0, c.errorsOnly ? (r.score >= 100 ? "repasar" : "") : real ? "real" : "train");
  /* repetir después de aprobar: como mucho 1 ⭐ extra POR DÍA en total (si de verdad practicó: 50 % o más) */
  if(prevApr && r.score >= 50){ var tk0 = todayKey(), got = Object.keys(H.pxd).some(function(k){ return k.slice(-tk0.length - 1) === "|" + tk0; }); if(!got){ H.pxd[tid0 + "|" + tk0] = 1; c.extra = true; } }
  filter = "all";
  if(c.tema.vocabulario.length >= 3){ c.phase = "vocab"; c.vocab = buildVocab(c); S.screen = "vocab"; }
  else { c.phase = "res"; S.screen = "results"; }
  vx = {fb:null, text:""};
  save(); saveHome(); render({top:true});
}

/* ---------- mini vocabulario ---------- */
function wordKey(tid, w){ return tid + ":" + String(w.en).toLowerCase(); }
function buildVocab(c){
  var words = c.tema.vocabulario, tid = c.tema.id, weak = S.home.weak;
  var pool = shuffle(words).sort(function(a, b){ return (weak[wordKey(tid, b)] > 0 ? 1 : 0) - (weak[wordKey(tid, a)] > 0 ? 1 : 0); });
  var n = words.length <= 5 ? words.length : Math.min(8, Math.max(5, Math.round(words.length / 2)));
  var items = shuffle(pool.slice(0, n)).map(function(w, i){
    var others = shuffle(words.filter(function(x){ return x.es !== w.es; })).map(function(x){ return x.es; });
    if(!esT()) GENERAL.forEach(function(g){ g.words.forEach(function(x){ if(others.length < 4 && x.es !== w.es && others.indexOf(x.es) < 0) others.push(x.es); }); });
    return {en:w.en, es:w.es, aceptadas:(w.aceptadas || []).concat([w.es]), ejemplo_en:w.ejemplo_en || "", ejemplo_es:w.ejemplo_es || "",
      mode:i % 2 === 0 ? "elegir" : "escribir", opts:shuffle([w.es].concat(others.slice(0, 2))), ok:null, said:""};
  });
  return {items:items, i:0, started:false, done:false, ok:0, failed:[]};
}
function vocabHeader(){ return subHeader("Mini vocabulario", "home", "🏠 Inicio"); }
function renderVocab(){
  var c = S.ex.cur;
  if(!c || c.phase !== "vocab" || !c.vocab){ S.screen = "results"; return renderResults(); }
  var v = c.vocab;
  if(!v.started){
    return vocabHeader() + '<main class="card res"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><h2 class="sec-title">¡Terminaste las preguntas! 🎉</h2>' +
      '<div class="score">' + c.result.score + ' <small>/ 100</small></div><p class="lead">Ahora, un mini vocabulario de <b>' + v.items.length + ' palabras</b>. ¡Es rápido!</p>' +
      '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="v-go">¡Vamos! 🚀</button><button class="btn btn-ghost" type="button" data-act="v-skip">Saltar e ir a mis resultados</button></div></main>' + footer();
  }
  var it = v.items[v.i], answered = it.ok !== null, last = v.i === v.items.length - 1;
  var body = '<span class="chip">' + esc(esT() && c.tema.vocabulario_pregunta_es ? c.tema.vocabulario_pregunta_es : "¿Qué significa?") + '</span><div class="qrow"><p class="qtext" lang="' + XL() + '" style="font-size:2.2rem">' + esc(it.en) + '</p>' + spk(it.en, XL()) + '</div>';
  if(it.mode === "elegir"){
    body += '<div class="opts">' + it.opts.map(function(o, i){
      var cls = "opt"; if(answered){ if(o === it.es) cls += " good"; else if(o === it.said) cls += " bad"; }
      return '<button type="button" class="' + cls + '" data-act="v-pick" data-v="' + esc(o) + '"' + (answered ? " disabled" : "") + '><span class="let">' + LET[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join("") + '</div>';
  } else {
    body += '<label for="vans" class="sec-es">' + (esT() ? "Escribe tu respuesta:" : "Escríbelo en español:") + '</label><input id="vans" class="write" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" value="' +
      esc(answered ? it.said : vx.text) + '" placeholder="Escribe aquí…"' + (answered ? " disabled" : "") + '>' +
      (answered ? "" : '<button type="button" class="btn btn-sun btn-big" data-act="v-check">Comprobar</button>');
  }
  if(answered) body += (it.ok ? '<p class="fb good">🎉 ¡Muy bien!</p>' : '<p class="fb bad">¡Casi! ' + (esT() ? 'La respuesta es' : 'Se dice') + ' «' + esc(it.es) + '». Ya lo sabes para la próxima. 💙</p>') +
    (it.ejemplo_en ? '<p class="small"><span lang="' + XL() + '">' + esc(it.ejemplo_en) + '</span><br>' + esc(it.ejemplo_es) + '</p>' : '') +
    '<button class="btn btn-sun btn-big" type="button" data-act="v-next">' + (last ? "Ver mis resultados" : "Siguiente →") + '</button>';
  return vocabHeader() + '<div class="prog-row"><span>Palabra ' + (v.i + 1) + ' de ' + v.items.length + '</span><span>✅ ' + v.ok + '</span></div>' +
    '<div class="bar"><i style="width:' + Math.round((v.i + (answered ? 1 : 0)) / v.items.length * 100) + '%"></i></div><main class="card qcard">' + body + '</main>' + footer();
}
function vAnswer(it, said){
  var v = S.ex.cur.vocab, ok = it.mode === "elegir" ? said === it.es : sameWord(said, it.aceptadas);
  it.said = said; it.ok = ok; vx.text = "";
  if(ok) v.ok++; else v.failed.push(it.en);
  render();
}
function vFinish(skip){
  var c = S.ex.cur, v = c.vocab, tid = c.tema.id, H = S.home, now = Date.now();
  if(!skip){
    v.items.forEach(function(it){
      var k = wordKey(tid, it), cur = H.weak[k];
      if(it.ok){ if(!H.known[k]) H.known[k] = now; if(cur > 0) H.weak[k] = -now; }
      else if(it.ok === false){ H.weak[k] = now; H.wfail[k] = (H.wfail[k] || 0) + 1; }
    });
    var h = S.ex.hist[tid], a = h && h[h.length - 1];
    if(a && a.ts === c.at) a.vocab = {ok:v.ok, total:v.items.filter(function(x){ return x.ok !== null; }).length, failed:v.failed.slice()};
  }
  v.done = true; c.phase = "res"; S.screen = "results"; filter = "all";
  save(); saveHome(); render({top:true});
}

/* ---------- resultados y revisión ---------- */
function meaningOf(word, c){
  var w = String(word).toLowerCase(), l = c.tema.vocabulario;
  for(var i=0;i<l.length;i++) if(String(l[i].en).toLowerCase() === w) return l[i].es;
  return D[String(word).toUpperCase()] || "";
}
function reviewItem(g, i, c){
  var q = g.q, a = g.a, cls = g.ok ? "ok" : (g.answered ? "bad" : "skip"), verdicts;
  var head = '<div class="rv-head"><span class="rv-n">Pregunta ' + (i + 1) + '</span>' + (q.seccion ? '<span class="rv-sec">' + esc(q.seccion) + '</span>' : '') + '</div>';
  var qline = '<span lang="' + XL() + '">' + blankHtml(q.pregunta_en) + '</span>' + (q.base_word ? ' <span lang="' + XL() + '">(Base word: ' + esc(q.base_word) + ')</span>' : "");
  var mine, right, extra = "";
  switch(q.tipo){
    case "verdadero_falso": mine = g.answered ? (a ? tfWord(true) : tfWord(false)) : "(sin responder)"; right = tfWord(!!q.correcta); break;
    case "completar": mine = g.answered ? String(a).trim().toUpperCase() : "(sin responder)"; right = q.respuesta.toUpperCase(); break;
    case "unir":
      mine = g.answered ? "" : "(sin responder)"; right = "";
      extra = q.pares.map(function(p, k){
        var got = a ? a[k] : null, okp = got === p.derecha;
        return '<p class="line pair ' + (okp ? "okp" : "badp") + '"><b lang="' + XL() + '">' + esc(p.izquierda) + '</b> → ' + esc(p.derecha) + (okp ? ' ✅' : (got ? ' ❌ <span class="small">(elegiste: ' + esc(got) + ')</span>' : ' ❌ <span class="small">(sin responder)</span>')) + '</p>';
      }).join("");
      break;
    default: mine = g.answered ? a : "(sin responder)"; right = q.correcta;
  }
  if(g.ok) verdicts = ["✅ ¡Muy bien, Killian!", "✅ ¡Correcto! ¡Sigue así!", "✅ ¡Excelente trabajo!"];
  else if(!g.answered) verdicts = ["⚪ Esta se quedó sin responder. ¡Vamos a aprenderla!"];
  else verdicts = ["❌ ¡Casi lo logras!", "❌ Vamos a aprenderlo juntos.", "❌ ¡Buen intento! Mira esto."];
  var h = '<article class="rv ' + cls + '">' + head + '<p class="rv-q">' + qline + '</p>' + qImg(q);
  if(q.tipo === "unir") h += '<p class="lbl">Tus parejas</p>' + extra;
  else h += '<p class="line"><span class="lbl">Respuesta de Killian</span><br><b lang="' + XL() + '">' + esc(mine) + '</b></p>';
  h += '<p class="verdict">' + verdicts[i % verdicts.length] + '</p>';
  if(!g.ok && q.tipo !== "unir"){
    h += '<p class="line correct-box"><span class="lbl">Respuesta correcta</span> ' + spk(q.pregunta_en.indexOf("___") >= 0 ? q.pregunta_en.replace(/_{3,}/, right) : right, XL(), "mini") + '<br><b lang="' + XL() + '">' + esc(right) + '</b>' +
      (q.tipo === "completar" || (q.tipo === "opcion_multiple" && q.pregunta_en.indexOf("___") >= 0) ? '<br><span lang="' + XL() + '">' + filledHtml(q.pregunta_en, right) + '</span>' : '') + '</p>';
  }
  h += '<div class="learn"><p class="line"><span class="lbl">Explicación</span><br>' + esc(q.explicacion_es || "¡Sigue practicando este tema!") + '</p>';
  if(!g.ok){
    if(g.answered && q.tipo === "opcion_multiple" && a !== q.correcta){ var m = meaningOf(a, c); if(m) h += '<p class="line">Tú elegiste <b lang="' + XL() + '">' + esc(a) + '</b>, que significa «' + esc(m) + '».</p>'; }
    if(g.answered && q.tipo === "completar" && C[q.subtema] && C[q.subtema].parts) h += '<p class="line">Fíjate cómo se escribe: <b lang="' + XL() + '">' + esc(C[q.subtema].parts) + '</b> = <b lang="' + XL() + '">' + esc(q.respuesta.toUpperCase()) + '</b>.</p>';
    var tm0 = temaById(c.tema.id), rs = tm0 && q.subtema ? tm0.resumen.filter(function(r){ return r.subtema === q.subtema && !isPartTitle(r); }).slice(0, 4) : [];
    if(!rs.length && tm0){   /* si el resumen no trae «subtema», se buscan las frases que contienen la respuesta correcta */
      var ans = q.tipo === "completar" ? q.respuesta : q.tipo === "opcion_multiple" ? q.correcta : "", na = norm(ans);
      if(na.length >= 3) rs = tm0.resumen.filter(function(r){ return !isPartTitle(r) && (norm(r.en).indexOf(na) >= 0 || norm(r.es).indexOf(na) >= 0); }).slice(0, 3);
    }
    if(rs.length) h += '<div class="inres"><p class="lbl">📖 Esto estaba en tu resumen</p>' + rs.map(function(r){ return '<p class="line"><b lang="' + XL() + '">' + esc(r.en) + '</b><br>' + esc(r.es) + '</p>'; }).join("") + '</div>';
    if(q.ejemplo_en) h += '<p class="exa line"><span class="lbl">Otro ejemplo</span><br><span lang="' + XL() + '">' + esc(q.ejemplo_en) + '</span><br>' + esc(q.ejemplo_es || "") + '</p>';
  }
  return h + '</div></article>';
}
function resActions(c, wrongN, unans){
  var t = temaById(c.tema.id), failed = c.vocab && c.vocab.failed && c.vocab.failed.length;
  var h = '<div class="stack">';
  if(unans > 0) h += '<button class="btn btn-blue btn-big" data-act="x-resume" type="button">SEGUIR RESPONDIENDO (faltan ' + unans + ')</button>';
  if(!isReal(c)) h += '<button class="btn btn-sun btn-big" data-act="x-real" type="button">📝 HACER EL EXAMEN REAL</button>';
  h += '<button class="btn ' + (isReal(c) ? "btn-sun btn-big" : "btn-blue") + '" data-act="x-retry" type="button">' + (isReal(c) ? "📝 OTRO EXAMEN REAL" : "🏋️ ENTRENAR OTRA VEZ") + '</button>';
  if(wrongN > 0) h += '<p class="small" style="text-align:center">Te daré preguntas nuevas, con más de lo que más te costó.</p>';
  if(failed) h += '<button class="btn btn-blue" data-act="dict-open" data-id="weak" type="button">🔤 PRACTICAR MIS PALABRAS</button>';
  if(t && t.examen_oficial) h += '<button class="btn btn-ghost" data-act="x-official" type="button">REPETIR TODO EL EXAMEN</button>';
  h += '<button class="btn btn-ghost" data-act="go-screen" data-s="topics" type="button">← Mis temas</button></div>';
  return h;
}
function aprMsg(c, r){
  if(!isReal(c) && r.score >= PASS && !c.extra && !aprTs(c.tema.id)) return '<p class="tryban" role="status"><b>¡Muy bien entrenando! 💪</b><span>Ahora prueba el 📝 Examen real para ganar tu ✅.</span></p>';
  if(!isReal(c) && r.score >= PASS && !aprTs(c.tema.id)) return '<p class="tryban" role="status"><b>¡Muy bien entrenando! 💪</b><span>Ahora prueba el 📝 Examen real para ganar tu ✅. ⭐ +1 estrella por practicar hoy</span></p>';
  if(c.firstPass) return '<p class="doneban" role="status"><b>✅ ¡Ya lo hiciste!</b><span>Tu tarea quedó marcada. ¡Felicidades, Killian! 🎉</span></p>';
  if(c.passed) return '<p class="doneban" role="status"><b>✅ ¡Otra vez muy bien!</b><span>' + (c.extra ? '⭐ +1 estrella por practicar hoy' : 'Hoy ya ganaste tu estrella por practicar') + '</span></p>';
  if(!aprTs(c.tema.id)) return '<p class="tryban" role="status"><b>¡Buen esfuerzo! 💪</b><span>Inténtalo otra vez para ganar tu ✅ (necesitas ' + PASS + ' o más en el 📝 Examen real).</span></p>';
  return c.extra ? '<p class="tryban" role="status"><b>¡Gracias por practicar! 🌟</b><span>⭐ +1 estrella por practicar hoy</span></p>' : '';
}
function renderResults(){
  var c = S.ex.cur;
  if(!c || c.phase !== "res"){ S.screen = "home"; return renderHome(); }
  var grades = gradeCur(c), r = resultOf(grades), unans = grades.filter(function(g){ return !g.answered; }).length;
  var right = r.units, wrong = r.total - r.units, pct = r.total ? Math.round(right / r.total * 100) : 0;
  var shown = filter === "bad" ? grades.filter(function(g){ return !g.ok; }) : grades;
  var goodSubs = [], subs = {};
  grades.forEach(function(g){ var s = g.q.subtema; (subs[s] = subs[s] || {ok:0, n:0}); subs[s].n++; if(g.ok) subs[s].ok++; });
  Object.keys(subs).forEach(function(s){ if(subs[s].n >= 1 && subs[s].ok === subs[s].n && s !== "vocabulario") goodSubs.push(subName(s)); });
  var good = right > 0 ? '<p class="goodline">🌟 Acertaste <b>' + right + ' de ' + r.total + '</b>' + (goodSubs.length ? '. ¡Ya dominas: <b lang="' + XL() + '">' + esc(goodSubs.slice(0, 5).join(", ")) + '</b>!' : '. ¡Buen comienzo!') + '</p>' : '';
  var v = c.vocab && c.vocab.done && c.vocab.items.some(function(x){ return x.ok !== null; });
  var vbox = v ? '<p class="goodline">🔤 Mini vocabulario: <b>' + c.vocab.ok + ' de ' + c.vocab.items.filter(function(x){ return x.ok !== null; }).length + '</b>' +
    (c.vocab.failed.length ? '. Para practicar: <b lang="' + XL() + '">' + esc(c.vocab.failed.join(", ")) + '</b>' : '. ¡Todas bien!') + '</p>' : '';
  return subHeader("Resultados", "go-screen", "← Mis temas") + '<main class="card res"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg>' +
    '<h1>Resultados de Killian</h1><p lang="' + XL() + '" class="small">' + esc(c.tema.titulo) + (c.round > 1 ? ' · Intento ' + c.round : '') + '</p>' +
    '<p class="small"><b>' + (isReal(c) ? '📝 Examen real · ⏱️ ' + fmtClock(c.secs) : '🏋️ Entrenamiento') + '</b></p>' +
    '<div class="score" aria-label="Puntuación final">' + r.score + ' <small>/ 100</small></div>' +
    '<p class="msg">' + messageFor(r.score, c.tema.titulo_es || c.tema.titulo) + '</p>' + aprMsg(c, r) + good + vbox +
    '<div class="stats"><div class="stat g"><b>' + right + '</b><span>✅ correctas</span></div>' +
    '<div class="stat r"><b>' + wrong + '</b><span>❌ incorrectas</span></div>' +
    '<div class="stat"><b>' + pct + '%</b><span>de aciertos</span></div></div>' + (unans ? '<p class="unans">⚪ ' + unans + (unans === 1 ? ' pregunta quedó' : ' preguntas quedaron') + ' sin responder</p>' : '') + resActions(c, wrong, unans) + '</main>' +
    '<section aria-label="Revisión de preguntas" class="review-wrap"><h2 class="sec-title">Revisión de todas las preguntas</h2>' +
    '<div class="tabs"><button type="button" class="tab" data-act="filter" data-f="all" aria-pressed="' + (filter === "all") + '">Ver todas (' + grades.length + ')</button>' +
    '<button type="button" class="tab" data-act="filter" data-f="bad" aria-pressed="' + (filter === "bad") + '">Solo las que fallé (' + grades.filter(function(g){ return !g.ok; }).length + ')</button></div>' +
    '<div class="review">' + (shown.length ? shown.map(function(g){ return reviewItem(g, grades.indexOf(g), c); }).join("") : '<p class="note">🎉 ¡Todas fueron correctas!</p>') + '</div></section>' +
    lessonsHtml(c.tema.id, grades.filter(function(g){ return !g.ok; }).map(function(g){ return g.q.subtema; })) +
    '<section class="card">' + resActions(c, wrong, unans) + '</section>' + footer();
}

/* ---------- clics, escritura y teclas ---------- */
function examClick(act, el, ev){
  var c = S.ex.cur, q = c && c.phase === "q" ? c.qs[c.idx] : null;
  switch(act){
    case "open-tema": S.tid = el.getAttribute("data-id"); S.screen = "tema"; helperOpen = false; writeLocal(); render({top:true}); return true;
    case "x-start": startRound(S.tid, false); return true;
    case "x-quick": var qm = el.getAttribute("data-m"); startRound(el.getAttribute("data-id"), false, qm === "errors", qm === "real" ? "real" : "train"); return true;
    case "x-real": startRound(S.tid, false, false, "real"); return true;
    case "x-official": startRound((S.ex.cur && S.screen === "results") ? S.ex.cur.tema.id : S.tid, true, false, S.ex.cur && S.screen === "results" ? S.ex.cur.mode : "train"); return true;
    case "x-retry": startRound(S.ex.cur ? S.ex.cur.tema.id : S.tid, false, false, S.ex.cur ? S.ex.cur.mode : "train"); return true;
    case "x-continue":
      if(!c) return true;
      S.screen = c.phase === "q" ? "exam" : c.phase === "vocab" ? "vocab" : "results"; filter = "all"; writeLocal(); render({top:true}); return true;
    case "x-prev": xGo(c.idx - 1); return true;
    case "x-next": xGo(c.idx + 1); return true;
    case "x-goto": xGo(+el.getAttribute("data-i")); return true;
    case "x-es": ex.es[q.id] = true; render(); return true;
    case "x-pick": xSet(el.getAttribute("data-v")); return true;
    case "x-tf": xSet(el.getAttribute("data-v") === "true"); return true;
    case "x-lw": var li = +el.getAttribute("data-i"); ex.sel = ex.sel === li ? null : li; ex.hint = ""; render(); return true;
    case "x-rm":
      var ri = +el.getAttribute("data-i"), ans = c.answers[q.id] || {}, right = q.rights[ri];
      if(ex.sel == null){ ex.hint = esT() ? "Primero toca una palabra 👆" : "Primero toca una palabra en inglés 👆"; render(); return true; }
      ex.hint = "";
      if(ans[ex.sel] === right) delete ans[ex.sel];
      else {
        Object.keys(ans).forEach(function(k){ if(ans[k] === right) delete ans[k]; });
        ans[ex.sel] = right;
        var nx = null; for(var k = 0; k < q.pares.length; k++) if(ans[k] == null){ nx = k; break; }
        ex.sel = nx;
      }
      if(Object.keys(ans).length) c.answers[q.id] = ans; else delete c.answers[q.id];
      save(); render(); return true;
    case "x-finish": xTryFinish(); return true;
    case "finish-now": xFinish(); return true;
    case "x-resume":
      var gr = gradeCur(c), first = 0; for(var j = 0; j < gr.length; j++) if(!gr[j].answered){ first = j; break; }
      var h = S.ex.hist[c.tema.id]; if(h && h.length && h[h.length - 1].ts === c.at) h.pop();
      c.phase = "q"; c.vocab = null; c.idx = first; S.screen = "exam"; ex.sel = null; save(); render({top:true}); return true;
    case "v-go": c.vocab.started = true; vx = {fb:null, text:""}; save(); render({top:true}); return true;
    case "v-skip": vFinish(true); return true;
    case "v-pick": var vi = c.vocab.items[c.vocab.i]; if(vi.ok === null) vAnswer(vi, el.getAttribute("data-v")); return true;
    case "v-check": var vi2 = c.vocab.items[c.vocab.i]; if(vi2.ok === null) vAnswer(vi2, val("vans")); return true;
    case "v-next":
      if(c.vocab.i >= c.vocab.items.length - 1) vFinish(false); else { c.vocab.i++; vx.text = ""; save(); render({top:true}); }
      return true;
    case "ask-reset": modal = {type:"reset", title:(temaById(S.tid) || {}).titulo_es || (temaById(S.tid) || {}).titulo}; render(); return true;
    case "reset-tema":
      delete S.ex.hist[S.tid]; if(S.ex.cur && S.ex.cur.tema.id === S.tid) S.ex.cur = null;
      modal = null; save(); render({top:true}); return true;
  }
  return false;
}
function examInput(ev){
  var t = ev.target, c = S.ex.cur;
  if(t.id === "xans" && c && c.phase === "q"){ c.answers[c.qs[c.idx].id] = t.value; save(); updateExamChrome(); return true; }
  if(t.id === "vans"){ vx.text = t.value; return true; }
  return false;
}
function examKey(ev){
  var c = S.ex.cur;
  if(ev.target.id === "xans" && c){ ev.preventDefault(); if(c.idx < c.qs.length - 1) xGo(c.idx + 1); return true; }
  if(ev.target.id === "vans" && c && c.vocab){ ev.preventDefault(); var it = c.vocab.items[c.vocab.i]; if(it && it.ok === null) vAnswer(it, ev.target.value); return true; }
  return false;
}
