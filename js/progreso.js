"use strict";
/* ================================================================== PROGRESO ===
   Panel de análisis para mamá (reglas simples, sin IA), reporte para pegar en el chat con Claude
   y premios reales que se canjean con estrellas. */

var DAYL = ["D", "L", "M", "M", "J", "V", "S"];
function rk(map){ return realKeys(map); }
function noteFail(tid, w){ var k = wkey(tid, w); S.home.wfail[k] = (S.home.wfail[k] || 0) + 1; }
function dateOfTs(ts){ return pkey(new Date(ts)); }
function fmtDay(k){ try{ return parseD(k).toLocaleDateString("es", {day:"numeric", month:"short"}); }catch(e){ return k; } }

/* ---------------------------------------------------------------- uso (tiempo aproximado) */
var DEV = (function(){ try{ var d = localStorage.getItem("kx-dev"); if(!d){ d = Math.random().toString(36).slice(2, 6); localStorage.setItem("kx-dev", d); } return d; }catch(e){ return "x"; } })();
var useT = {last:0, pend:0};
function useTick(){
  var n = Date.now();
  if(useT.last && n - useT.last < 120000) useT.pend += (n - useT.last) / 1000;   /* solo cuenta si hubo actividad en los últimos 2 min */
  useT.last = n;
  if(useT.pend >= 45) useFlush();
}
function useFlush(){
  if(useT.pend < 5) return;
  var k = todayKey() + "|" + DEV, H = S.home;
  H.mins[k] = Math.round((H.mins[k] || 0) + useT.pend); useT.pend = 0;
  saveHome();
}
["click", "keydown", "touchstart", "input"].forEach(function(e){ document.addEventListener(e, useTick, {passive:true, capture:true}); });
document.addEventListener("visibilitychange", function(){ if(document.hidden) useFlush(); });

/* ---------------------------------------------------------------- premios */
function spentStars(){ var n = 0, r = S.home.redeem; Object.keys(r).forEach(function(k){ n += +r[k] || 0; }); return n; }
function starsAvail(){ return Math.max(0, starCount() - spentStars()); }
function prizeList(){ return S.prizes || []; }
function renderPrizesKid(){
  var list = prizeList(), av = starsAvail();
  if(!list.length) return "";
  return '<section class="card"><h2 class="sec-title">🎁 Mis premios</h2><p class="small">Tienes ⭐ ' + av + ' para gastar. Cuando alcances el premio, ¡díselo a mamá!</p>' +
    list.map(function(p){
      var ok = av >= p.costo, pct = Math.min(100, Math.round(av / p.costo * 100));
      return '<div class="prize-row"><b>' + esc(p.nombre) + '</b><span class="small">⭐ ' + p.costo + '</span><span class="bar"><i style="width:' + pct + '%"></i></span>' +
        (ok ? '<span class="pill ok">¡Puedes canjearlo! 🎉</span>' : '<span class="small">Te faltan ' + (p.costo - av) + ' ⭐</span>') + '</div>';
    }).join("") + '</section>';
}

/* ---------------------------------------------------------------- análisis */
function weekPick(){
  var ag = S.agenda; if(!ag) return null;
  var t = todayKey(), set = {};
  ag.tareas.concat(ag.videos).forEach(function(x){ if(x.semana) set[x.semana] = 1; });
  var list = Object.keys(set).sort(); if(!list.length) return null;
  var pick = list[0]; list.forEach(function(s){ if(s <= addDays(t, 3)) pick = s; });
  return pick;
}
function activityDays(){
  var H = S.home, set = {}, id;
  [H.tasks, H.vids, H.mats, H.known].forEach(function(m){ Object.keys(m).forEach(function(k){ if(!/^(d-|demo:)/.test(k) && m[k] > 0) set[dateOfTs(m[k])] = 1; }); });
  Object.keys(H.gdays).forEach(function(k){ set[k] = 1; });
  Object.keys(H.mins).forEach(function(k){ if(H.mins[k] >= 60) set[k.split("|")[0]] = 1; });
  Object.keys(S.ex.hist).forEach(function(t){ S.ex.hist[t].forEach(function(a){ set[dateOfTs(a.ts)] = 1; }); });
  return set;
}
function minutesOn(d){ var n = 0, m = S.home.mins; Object.keys(m).forEach(function(k){ if(k.split("|")[0] === d) n += m[k]; }); return n / 60; }
function tasksDoneOn(d){
  var n = 0, H = S.home;
  [H.tasks, H.vids].forEach(function(m){ Object.keys(m).forEach(function(k){ if(!/^d-/.test(k) && m[k] > 0 && dateOfTs(m[k]) === d) n++; }); });
  return n;
}
function pct(n, d){ return d ? Math.round(n / d * 100) : 0; }
function plural(n, a, b){ return n + " " + (n === 1 ? a : b); }

function computeReport(){
  var t = todayKey(), H = S.home, R = {generado:t, alertas:[], recomendaciones:[]};
  /* --- semana de la agenda --- */
  var sem = weekPick();
  if(sem){
    var ag = S.agenda, items = ag.tareas.map(function(x){ return {k:"task", x:x}; }).concat(ag.videos.map(function(x){ return {k:"vid", x:x}; })).filter(function(i){ return i.x.semana === sem; });
    var done = items.filter(function(i){ return isDone(i.k, i.x.id); }).length;
    var due = items.filter(function(i){ return i.x.fecha <= t; });
    var pend = due.filter(function(i){ return !isDone(i.k, i.x.id); });
    var late = pend.filter(function(i){ return i.x.fecha < t; });
    R.semana = {inicio:sem, fin:addDays(sem, 4), total:items.length, hechas:done, vencidas_pendientes:pend.length, atrasadas:late.length, por_venir:items.length - due.length};
  } else R.semana = null;
  /* --- últimos 7 días --- */
  var act = activityDays(), days = [], i;
  for(i = 6; i >= 0; i--){
    var d = addDays(t, -i);
    days.push({fecha:d, dia:DAYL[parseD(d).getDay()], tareas:tasksDoneOn(d), minutos:Math.round(minutesOn(d)), activo:!!act[d]});
  }
  R.dias = days;
  R.dias_estudiados = days.filter(function(x){ return x.activo; }).length;
  R.minutos_7d = days.reduce(function(n, x){ return n + x.minutos; }, 0);
  var from = days[0].fecha, wk = 0;
  [H.tasks, H.vids, H.mats].forEach(function(m){ Object.keys(m).forEach(function(k){ if(!/^d-/.test(k) && m[k] > 0 && dateOfTs(m[k]) >= from) wk++; }); });
  Object.keys(H.days).forEach(function(k){ if(!/^demo:/.test(k) && k >= from) wk += 2; });
  Object.keys(H.gdays).forEach(function(k){ if(k >= from) wk += Math.min(H.gdays[k], 3); });
  R.estrellas = {total:starCount(), disponibles:starsAvail(), ultimos_7_dias_aprox:wk};
  /* --- exámenes --- */
  var temas = [], qInfo = {}, subs = {}, tipos = {};
  allTemas().forEach(function(tm){
    var h = S.ex.hist[tm.id] || [];
    var byId = {}; tm.preguntas.forEach(function(q){ byId[q.id] = q; });
    h.forEach(function(a){
      var wrong = {}; (a.wrong || []).forEach(function(id){ wrong[id] = 1; });
      (a.seen || []).forEach(function(id){
        var q = byId[id]; if(!q) return;
        var sk = tm.id + "|" + q.subtema, s = subs[sk] || (subs[sk] = {tema:tm.titulo_es || tm.titulo, tid:tm.id, sub:q.subtema, vistas:0, falladas:0});
        s.vistas++; if(wrong[id]) s.falladas++;
        var tp = tipos[q.tipo] || (tipos[q.tipo] = {tipo:q.tipo, vistas:0, falladas:0});
        tp.vistas++; if(wrong[id]) tp.falladas++;
      });
    });
    if(h.length){
      var sc = h.map(function(a){ return a.score; });
      temas.push({id:tm.id, tema:tm.titulo_es || tm.titulo, materia:tm.materia || "", fecha_examen:tm.fecha_examen || "", intentos:h.length, notas:sc, primera:sc[0], ultima:sc[sc.length - 1],
        mejor:Math.max.apply(null, sc), vocabulario:h.map(function(a){ return a.vocab ? a.vocab.ok + "/" + a.vocab.total : null; })});
    }
  });
  R.temas = temas;
  var mat = {};
  temas.forEach(function(x){ var m = mat[x.materia || "General"] || (mat[x.materia || "General"] = {materia:x.materia || "General", ult:[], mejor:0, intentos:0}); m.ult.push(x.ultima); m.mejor = Math.max(m.mejor, x.mejor); m.intentos += x.intentos; });
  R.materias = Object.keys(mat).map(function(k){ var m = mat[k]; return {materia:m.materia, promedio:Math.round(m.ult.reduce(function(a, b){ return a + b; }, 0) / m.ult.length), mejor:m.mejor, intentos:m.intentos}; });
  R.subtemas = Object.keys(subs).map(function(k){ var s = subs[k]; s.tasa = pct(s.falladas, s.vistas); s.nombre = subName(s.sub); return s; })
    .filter(function(s){ return s.vistas >= 2 && s.sub !== "general"; }).sort(function(a, b){ return b.tasa - a.tasa || b.falladas - a.falladas; });
  R.tipos = Object.keys(tipos).map(function(k){ var s = tipos[k]; s.tasa = pct(s.falladas, s.vistas); return s; }).filter(function(s){ return s.vistas >= 3; }).sort(function(a, b){ return b.tasa - a.tasa; });
  /* --- palabras --- */
  var wordIndex = {}; vocabTopics().concat(GENERAL).forEach(function(tp){ tp.words.forEach(function(w){ wordIndex[wkey(tp.id, w)] = {en:w.en, es:w.es, tema:tp.title}; }); });
  R.palabras_falladas = Object.keys(H.wfail).filter(function(k){ var tm = temaById(k.split(":")[0]); return !(tm && tm.idioma === "es"); }).sort(function(a, b){ return H.wfail[b] - H.wfail[a]; }).slice(0, 10).map(function(k){
    var w = wordIndex[k] || {en:k.split(":").slice(1).join(":"), es:"", tema:""}; return {en:w.en, es:w.es, tema:w.tema, veces:H.wfail[k], aun_por_practicar:H.weak[k] > 0};
  });
  R.palabras_por_practicar = Object.keys(H.weak).filter(function(k){ return H.weak[k] > 0; }).length;
  R.palabras_buscadas = Object.keys(H.look).sort(function(a, b){ return H.look[b] - H.look[a]; }).slice(0, 10).map(function(k){ return {en:k, es:H.lookTr[k] || "", veces:H.look[k]}; });
  R.preguntas_para_mama = Object.keys(H.ask).filter(function(k){ return H.ask[k] > 0; }).map(function(k){ return k.slice(k.indexOf(":") + 1); });
  R.palabras_aprendidas = Object.keys(H.known).length;
  /* --- alertas --- */
  var A = R.alertas, rec = R.recomendaciones;
  temas.forEach(function(x){
    var n = x.notas.length, last3 = x.notas.slice(-3);
    if(n >= 3 && last3.every(function(v){ return v < 60; })) A.push({n:"warn", t:"Killian ha intentado «" + x.tema + "» " + n + " veces y su nota sigue baja (último intento: " + x.ultima + ")."});
    if(n >= 2 && x.ultima - x.primera >= 15) A.push({n:"good", t:"Mejoró de " + x.primera + " a " + x.ultima + " puntos en «" + x.tema + "». ¡Felicítalo!"});
    if(n >= 2 && x.primera - x.ultima >= 15) A.push({n:"warn", t:"En «" + x.tema + "» bajó de " + x.primera + " a " + x.ultima + " puntos."});
    if(x.fecha_examen){
      var dd = dayDiff(x.fecha_examen);
      if(dd >= 0 && dd <= 4 && x.mejor < 80) A.push({n:"warn", t:"El examen de «" + x.tema + "» es " + relDay(x.fecha_examen) + " y su mejor nota es " + x.mejor + "."});
    }
  });
  allTemas().forEach(function(tm){
    if(tm.fecha_examen && !(S.ex.hist[tm.id] || []).length){ var dd = dayDiff(tm.fecha_examen); if(dd >= 0 && dd <= 5) A.push({n:"warn", t:"El examen de «" + (tm.titulo_es || tm.titulo) + "» es " + relDay(tm.fecha_examen) + " y todavía no ha hecho ningún intento."}); }
  });
  R.subtemas.filter(function(s){ return s.falladas >= 3 && s.tasa >= 50; }).slice(0, 3).forEach(function(s){
    A.push({n:"warn", t:"Ha fallado " + s.falladas + " veces las preguntas de «" + s.nombre + "» (" + s.tema + ")."});
  });
  if(R.semana && R.semana.atrasadas > 0) A.push({n:"warn", t:"Tiene " + plural(R.semana.atrasadas, "tarea atrasada", "tareas atrasadas") + " de días anteriores."});
  var lastTask = 0; [H.tasks, H.vids].forEach(function(m){ Object.keys(m).forEach(function(k){ if(!/^d-/.test(k) && m[k] > lastTask) lastTask = m[k]; }); });
  if(R.semana && R.semana.vencidas_pendientes > 0 && lastTask && dayDiff(dateOfTs(lastTask)) <= -2) A.push({n:"warn", t:"Lleva " + (-dayDiff(dateOfTs(lastTask))) + " días sin marcar ninguna tarea."});
  if(R.semana && R.semana.vencidas_pendientes === 0 && R.semana.hechas > 0) A.push({n:"good", t:"Está al día con las tareas de la semana. 🌟"});
  if(!days[6].activo && S.agenda) A.push({n:"info", t:"Hoy todavía no ha practicado."});
  if(R.palabras_por_practicar >= 5) A.push({n:"info", t:"Tiene " + R.palabras_por_practicar + " palabras en «Mis palabras para practicar»."});
  if(R.preguntas_para_mama.length) A.push({n:"info", t:"Killian tiene " + plural(R.preguntas_para_mama.length, "pregunta", "preguntas") + " para ti (palabras que el búho no supo)."});
  prizeList().forEach(function(p){ if(starsAvail() >= p.costo) A.push({n:"good", t:"Ya puede canjear el premio «" + p.nombre + "» (⭐ " + p.costo + ")."}); });
  /* --- recomendaciones --- */
  if(R.subtemas[0] && R.subtemas[0].tasa >= 40) rec.push("Repasar «" + R.subtemas[0].nombre + "» (" + R.subtemas[0].tema + "): falló " + R.subtemas[0].falladas + " de " + R.subtemas[0].vistas + " preguntas. Un intento nuevo del tema le dará más preguntas de eso.");
  if(R.tipos[0] && R.tipos[0].tasa >= 40) rec.push("Practicar preguntas de tipo «" + TIPO_ES[R.tipos[0].tipo] + "»: falla " + R.tipos[0].tasa + "%.");
  if(R.palabras_por_practicar) rec.push("Dedicar 5 minutos a «Mis palabras para practicar» (en el diccionario): hay " + R.palabras_por_practicar + " pendientes.");
  temas.forEach(function(x){ if(x.fecha_examen && dayDiff(x.fecha_examen) >= 0 && dayDiff(x.fecha_examen) <= 7 && x.ultima < 85) rec.push("Hacer un «Intentarlo otra vez» de «" + x.tema + "» antes del examen (" + relDay(x.fecha_examen) + ")."); });
  if(R.dias_estudiados <= 2 && R.semana) rec.push("Crear el hábito: un ratito corto cada día (10 minutos) funciona mejor que un día largo.");
  if(R.palabras_buscadas[0] && R.palabras_buscadas[0].veces >= 3) rec.push("Repasar la palabra «" + R.palabras_buscadas[0].en + "»: la ha buscado " + R.palabras_buscadas[0].veces + " veces.");
  if(!rec.length) rec.push(temas.length ? "¡Va muy bien! Seguir con un repaso corto cada día." : "Pídele que haga el examen de un tema para empezar a ver su progreso.");
  var order = {warn:0, info:1, good:2}; A.sort(function(a, b){ return order[a.n] - order[b.n]; });
  return R;
}
var TIPO_ES = {opcion_multiple:"opción múltiple", verdadero_falso:"verdadero o falso", unir:"unir", completar:"completar la palabra"};

/* ---------------------------------------------------------------- gráficas sencillas */
function hbars(rows){
  return '<div class="hbars">' + rows.map(function(r){
    var w = Math.max(r.v > 0 ? 3 : 0, Math.min(100, r.v));
    return '<div class="hb" title="' + esc(r.title || (r.label + ": " + r.text)) + '"><span class="hl">' + esc(r.label) + '</span><span class="htrack"><i class="' + (r.bad ? "bad" : "") + '" style="width:' + w + '%"></i></span><span class="hv">' + esc(r.text) + '</span></div>';
  }).join("") + '</div>';
}
function vbars(cols, unit){
  var max = Math.max.apply(null, cols.map(function(c){ return c.v; }).concat([0]));
  if(max === 0) return '<p class="small">Sin actividad en estos días.</p>';
  return '<div class="vbars" role="img" aria-label="Gráfica de barras">' + cols.map(function(c){
    var h = c.v > 0 ? Math.max(6, Math.round(c.v / max * 100)) : 0;
    return '<div class="vb" title="' + esc(c.title || (c.label + ": " + c.v + (unit || ""))) + '"><span class="vv">' + (c.v || "") + '</span><span class="vcol"><i style="height:' + h + '%"></i></span><span class="vl">' + esc(c.label) + '</span></div>';
  }).join("") + '</div>';
}
function stat(n, label, cls){ return '<div class="stat ' + (cls || "") + '"><b>' + n + '</b><span>' + label + '</span></div>'; }

/* ---------------------------------------------------------------- pantalla */
function renderProgress(){
  var R = computeReport(), h = momHeader("Progreso y análisis", "mom-go", "← Zona de mamá");
  var al = R.alertas.length ? '<ul class="alerts">' + R.alertas.map(function(a){ return '<li class="al ' + a.n + '"><span aria-hidden="true">' + (a.n === "warn" ? "⚠️" : a.n === "good" ? "🌟" : "ℹ️") + '</span><span>' + esc(a.t) + '</span></li>'; }).join("") + '</ul>' : '<p class="note">Todo tranquilo por ahora. 😊</p>';
  h += '<section class="card mom"><h2 class="sec-title">🔔 Alertas</h2>' + al + '</section>';
  var np = notasPend();
  if(((S.agenda && S.agenda.notas) || []).length) h += '<button class="btn btn-ghost" type="button" data-act="mom-go" data-v="notas">📌 Notas para mamá' + (np ? ' (' + np + ' sin marcar)' : ' ✓') + '</button>';
  /* resumen de la semana */
  var w = R.semana;
  h += '<section class="card mom"><h2 class="sec-title">📅 Resumen de la semana</h2>';
  if(w){
    h += '<p class="small">Agenda del ' + esc(fmtDay(w.inicio)) + ' al ' + esc(fmtDay(w.fin)) + '</p><div class="stats">' +
      stat(w.hechas + ' / ' + w.total, "tareas y videos hechos", "g") + stat(w.vencidas_pendientes, "pendientes de hoy o antes", w.vencidas_pendientes ? "r" : "") + stat(w.por_venir, "por venir") + '</div>';
  } else h += '<p class="note">Todavía no hay una agenda cargada.</p>';
  h += '<div class="stats">' + stat(R.dias_estudiados + ' de 7', "días que practicó") + stat('~' + R.minutos_7d + ' min', "tiempo en la página (7 días)") + stat('⭐ ' + R.estrellas.ultimos_7_dias_aprox, "ganadas en 7 días") + '</div>' +
    '<h3 class="sec-title">Tareas hechas por día</h3>' + vbars(R.dias.map(function(d){ return {label:d.dia, v:d.tareas, title:fmtDay(d.fecha) + ": " + d.tareas + " tareas"}; })) +
    '<h3 class="sec-title">Minutos en la página por día</h3>' + vbars(R.dias.map(function(d){ return {label:d.dia, v:d.minutos, title:fmtDay(d.fecha) + ": " + d.minutos + " min"}; }), " min") +
    '<p class="small">El tiempo se calcula mientras Killian toca la pantalla; es aproximado.</p></section>';
  /* notas */
  h += '<section class="card mom"><h2 class="sec-title">📝 Notas</h2>';
  if(!R.temas.length) h += '<p class="note">Todavía no ha hecho ningún examen.</p>';
  else {
    h += '<h3 class="sec-title">Por materia (promedio de la última nota de cada tema)</h3>' + hbars(R.materias.map(function(m){ return {label:m.materia, v:m.promedio, text:m.promedio + " / 100", bad:m.promedio < 60}; })) +
      '<h3 class="sec-title">Por tema: cómo evolucionan sus intentos</h3>' + R.temas.map(function(x){
        var delta = x.notas.length > 1 ? x.ultima - x.primera : null;
        return '<div class="tevo"><div class="thead"><b>' + esc(x.tema) + '</b><span class="small">' + esc(x.materia) + ' · mejor ' + x.mejor + (delta !== null ? ' · ' + (delta > 0 ? '📈 +' : delta < 0 ? '📉 ' : '➖ ') + delta : '') + '</span></div>' +
          vbars(x.notas.map(function(v, i){ return {label:"#" + (i + 1), v:v, title:"Intento " + (i + 1) + ": " + v + " / 100"}; })) + '</div>';
      }).join("");
  }
  h += '</section>';
  /* notas del colegio vs examen real */
  var sl = schList();
  h += '<section class="card mom"><h2 class="sec-title">🏫 Colegio vs 📝 Examen real</h2>' + (sl.length ? sl.map(function(x){
    var br = x.tid ? bestReal(x.tid) : -1, n = x.tid ? realCount(x.tid) : 0;
    return '<p class="wordrow"><span><b>' + esc(schTitle(x)) + '</b><br><span class="small">' + esc(capFirst(dayLabel(x.fecha))) + '</span></span><span>🏫 <b>' + x.nota + '</b> · 📝 ' + (br >= 0 ? '<b>' + br + '</b> (' + n + (n === 1 ? ' examen' : ' exámenes') + ')' : 'sin examen real') + '</span></p>';
  }).join("") : '<p class="small">Anota las notas del colegio en Zona de mamá → Notas del colegio.</p>') + '</section>';
  /* deficiencias */
  h += '<section class="card mom"><h2 class="sec-title">🎯 Dónde le cuesta más</h2>';
  var subFail = R.subtemas.filter(function(s){ return s.falladas > 0; });
  if(R.subtemas.length && !subFail.length) h += '<p class="goodline">🌟 No ha fallado ningún subtema. ¡Muy bien!</p>';
  if(subFail.length) h += '<h3 class="sec-title">Subtemas (porcentaje de preguntas falladas)</h3>' + hbars(subFail.slice(0, 8).map(function(s){ return {label:s.nombre, v:s.tasa, text:s.tasa + "% (" + s.falladas + "/" + s.vistas + ")", bad:s.tasa >= 50}; }));
  if(R.tipos.length) h += '<h3 class="sec-title">Tipos de pregunta</h3>' + hbars(R.tipos.map(function(s){ return {label:TIPO_ES[s.tipo] || s.tipo, v:s.tasa, text:s.tasa + "% (" + s.falladas + "/" + s.vistas + ")", bad:s.tasa >= 50}; }));
  if(!R.subtemas.length && !R.tipos.length) h += '<p class="note">Aparecerá cuando haga más intentos.</p>';
  h += '<h3 class="sec-title">Palabras que más falla</h3>' + (R.palabras_falladas.length ? '<ul class="wlist">' + R.palabras_falladas.map(function(w){ return '<li><b lang="en">' + esc(w.en) + '</b> ' + esc(w.es) + ' <span class="small">· ' + plural(w.veces, "vez", "veces") + (w.aun_por_practicar ? " · por practicar" : "") + '</span></li>'; }).join("") + '</ul>' : '<p class="small">Todavía no hay palabras falladas.</p>') +
    '<h3 class="sec-title">Palabras que más busca con el búho</h3>' + (R.palabras_buscadas.length ? '<ul class="wlist">' + R.palabras_buscadas.map(function(w){ return '<li><b lang="en">' + esc(w.en) + '</b> ' + esc(w.es) + ' <span class="small">· ' + plural(w.veces, "vez", "veces") + '</span></li>'; }).join("") + '</ul>' : '<p class="small">Todavía no ha buscado palabras.</p>') +
    '<p class="small">🧠 Palabras aprendidas: <b>' + R.palabras_aprendidas + '</b> · Por practicar: <b>' + R.palabras_por_practicar + '</b></p></section>';
  /* recomendaciones y exportar */
  h += '<section class="card mom"><h2 class="sec-title">💡 Qué repasar</h2><ul class="recs">' + R.recomendaciones.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join("") + '</ul></section>';
  h += '<section class="card mom"><h2 class="sec-title">📤 Exportar reporte</h2><p>Copia el reporte y pégalo en el chat con Claude para un análisis más profundo y para que te prepare repasos enfocados en lo que le cuesta.</p>' +
    '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="rep-copy">📋 Copiar reporte</button><button class="btn btn-ghost" type="button" data-act="rep-download">⬇️ Descargar (.json)</button></div>' +
    (progMsg ? '<p class="good-note" role="status">' + esc(progMsg) + '</p>' : '') +
    '<details><summary>Ver el reporte</summary><textarea id="reptxt" class="repbox" readonly rows="10" spellcheck="false">' + esc(reportText(R)) + '</textarea></details></section>';
  return h + footer();
}
var progMsg = "";

/* ---------------------------------------------------------------- reporte */
function reportText(R){
  R = R || computeReport();
  var L = [];
  L.push("# Reporte de Killian (4.º grado) — " + R.generado);
  L.push("");
  L.push("## Resumen");
  if(R.semana) L.push("- Agenda " + R.semana.inicio + " a " + R.semana.fin + ": " + R.semana.hechas + " de " + R.semana.total + " tareas/videos hechos; pendientes de hoy o antes: " + R.semana.vencidas_pendientes + " (atrasadas: " + R.semana.atrasadas + ").");
  L.push("- Días que practicó (últimos 7): " + R.dias_estudiados + ". Tiempo aproximado en la página (7 días): " + R.minutos_7d + " min.");
  L.push("- Estrellas: " + R.estrellas.total + " (disponibles " + R.estrellas.disponibles + "). Palabras aprendidas: " + R.palabras_aprendidas + "; por practicar: " + R.palabras_por_practicar + ".");
  L.push("");
  L.push("## Alertas");
  (R.alertas.length ? R.alertas : [{t:"Ninguna"}]).forEach(function(a){ L.push("- " + a.t); });
  L.push("");
  L.push("## Notas por tema (puntos sobre 100, en orden de intento)");
  if(!R.temas.length) L.push("- Sin exámenes todavía.");
  schList().forEach(function(x){ L.push("- Colegio: " + schTitle(x) + " (" + x.fecha + "): " + x.nota + " · mejor examen real en la página: " + (x.tid && bestReal(x.tid) >= 0 ? bestReal(x.tid) : "sin examen real")); });
  R.temas.forEach(function(x){ L.push("- " + x.tema + " (" + x.materia + "): " + x.notas.join(" → ") + (x.fecha_examen ? " · examen " + x.fecha_examen : "")); });
  L.push("");
  L.push("## Subtemas con más fallas");
  R.subtemas.slice(0, 8).forEach(function(s){ L.push("- " + s.nombre + " (" + s.tema + "): " + s.falladas + " de " + s.vistas + " falladas (" + s.tasa + "%)"); });
  if(!R.subtemas.length) L.push("- Sin datos suficientes.");
  L.push("");
  L.push("## Tipos de pregunta que más falla");
  R.tipos.forEach(function(s){ L.push("- " + (TIPO_ES[s.tipo] || s.tipo) + ": " + s.tasa + "% (" + s.falladas + "/" + s.vistas + ")"); });
  if(!R.tipos.length) L.push("- Sin datos suficientes.");
  L.push("");
  L.push("## Palabras en inglés que más falla");
  R.palabras_falladas.forEach(function(w){ L.push("- " + w.en + " = " + w.es + " (" + w.veces + " veces" + (w.aun_por_practicar ? ", por practicar" : "") + ")"); });
  if(!R.palabras_falladas.length) L.push("- Ninguna todavía.");
  L.push("");
  L.push("## Palabras que más busca con el búho");
  R.palabras_buscadas.forEach(function(w){ L.push("- " + w.en + " = " + w.es + " (" + w.veces + " veces)"); });
  if(!R.palabras_buscadas.length) L.push("- Ninguna todavía.");
  if(R.preguntas_para_mama.length){ L.push(""); L.push("## Palabras que el búho no supo"); R.preguntas_para_mama.forEach(function(w){ L.push("- " + w); }); }
  L.push("");
  L.push("## Recomendaciones automáticas");
  R.recomendaciones.forEach(function(x){ L.push("- " + x); });
  L.push("");
  L.push("## Pedido para Claude");
  L.push("Analiza este reporte, dime en qué necesita ayuda Killian (8 años, 4.º grado, el inglés le cuesta) y prepárame un repaso enfocado en lo que más falla, con un tema nuevo en el formato de FORMATO_IMPORTACION.md.");
  L.push("");
  L.push("## Datos (JSON)");
  L.push("```json");
  L.push(JSON.stringify(R, null, 1));
  L.push("```");
  return L.join("\n");
}

/* ---------------------------------------------------------------- premios (zona de mamá) */
function renderPrizesMom(){
  var list = prizeList(), av = starsAvail(), red = S.home.redeem;
  var h = momHeader("Premios", "mom-go", "← Zona de mamá") + (momNote ? '<p class="good-note">' + esc(momNote) + '</p>' : '');
  h += '<section class="card mom"><p>Define premios reales para cambiar por estrellas. Killian tiene ahora <b>⭐ ' + av + '</b> disponibles (ganó ' + starCount() + ' y ya canjeó ' + spentStars() + ').</p>' +
    (list.length ? list.map(function(p, i){
      var ok = av >= p.costo;
      return '<div class="erow"><div><b>' + esc(p.nombre) + '</b> <span class="pill">⭐ ' + p.costo + '</span></div>' +
        '<div class="stack">' + (ok ? '<button class="btn btn-sun" type="button" data-act="prize-redeem" data-i="' + i + '">🎁 Marcar como canjeado (−' + p.costo + ' ⭐)</button>' : '<p class="small">Le faltan ' + (p.costo - av) + ' ⭐.</p>') +
        '<button class="link-btn del" type="button" data-act="prize-del" data-i="' + i + '">🗑 Quitar premio</button></div></div>';
    }).join("") : '<p class="note">Todavía no hay premios.</p>') + '</section>' +
    '<section class="card mom"><h2 class="sec-title">Agregar un premio</h2>' +
    '<label class="fld"><span>Premio (por ejemplo: 30 minutos de videojuegos)</span><input id="pz-n" type="text" maxlength="60"></label>' +
    '<label class="fld"><span>Cuesta (estrellas)</span><input id="pz-c" type="number" inputmode="numeric" min="1" max="999" value="50"></label>' +
    '<button class="btn btn-sun btn-big" type="button" data-act="prize-add">+ Agregar premio</button></section>';
  var keys = Object.keys(red).sort().reverse();
  if(keys.length) h += '<section class="card mom"><h2 class="sec-title">Ya canjeados</h2>' + keys.map(function(k){
    var p = k.split("|"), d = ""; try{ d = new Date(+p[0]).toLocaleDateString("es", {day:"numeric", month:"short"}); }catch(e){}
    return '<p class="wordrow"><b>' + esc(p.slice(1).join("|")) + '</b><span class="small">' + esc(d) + ' · −' + red[k] + ' ⭐</span></p>';
  }).join("") + '</section>';
  return h + footer();
}

function progClick(act, el){
  switch(act){
    case "rep-copy":
      var txt = reportText(), done = function(ok){ progMsg = ok ? "✅ Reporte copiado. Pégalo en el chat con Claude." : "No pude copiar solo. Abre «Ver el reporte», selecciona todo y cópialo."; render(); };
      try{ navigator.clipboard.writeText(txt).then(function(){ done(true); }, function(){ done(false); }); }catch(e){ done(false); }
      return true;
    case "rep-download":
      try{
        var blob = new Blob([JSON.stringify(computeReport(), null, 2)], {type:"application/json"}), a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "reporte-killian-" + todayKey() + ".json"; document.body.appendChild(a); a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000); progMsg = "⬇️ Descargado.";
      }catch(e){ progMsg = "No pude descargarlo. Usa «Copiar reporte»."; }
      render(); return true;
    case "prize-add":
      var nm = (val("pz-n") || "").trim(), cs = Math.round(+val("pz-c"));
      if(!nm || !(cs >= 1)){ momNote = ""; render(); return true; }
      S.prizes = prizeList().concat([{id:newId("p"), nombre:nm, costo:Math.min(cs, 999)}]); saveContent(); momNote = "✅ Premio agregado."; render(); return true;
    case "prize-del": S.prizes = prizeList().filter(function(p, i){ return i !== +el.getAttribute("data-i"); }); saveContent(); momNote = ""; render(); return true;
    case "prize-redeem":
      var pz = prizeList()[+el.getAttribute("data-i")]; if(!pz || starsAvail() < pz.costo) return true;
      S.home.redeem[Date.now() + "|" + pz.nombre] = pz.costo; saveHome(); momNote = "🎁 Canjeado: " + pz.nombre + "."; render(); return true;
  }
  return false;
}
