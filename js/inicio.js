"use strict";
/* ------------------------------------------------------------------ INICIO */
var SUBJ_EMO = {math:"🔢", spanish:"📖", español:"📖", english:"🔤", inglés:"🔤", science:"🔬", ciencias:"🔬", art:"🎨", arte:"🎨", music:"🎵", gym:"⚽"};
function subjEmo(m){ return SUBJ_EMO[String(m||"").toLowerCase()] || "📚"; }
function pad2(n){ return (n < 10 ? "0" : "") + n; }
function dkey(d){ return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate()); }
/* «Hoy» y «ya pasó» siempre con la hora de Panamá, sin importar la hora del aparato. */
var PTZ = null;
function pkey(d){
  try{
    if(!PTZ) PTZ = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Panama", year:"numeric", month:"2-digit", day:"2-digit"});
    var r = PTZ.format(d); if(/^\d{4}-\d{2}-\d{2}$/.test(r)) return r;
  }catch(e){}
  return dkey(d);
}
function todayKey(){ return pkey(new Date()); }
/* El lunes de la semana de una fecha. */
function weekStart(k){ var d = parseD(k), wd = (d.getDay() + 6) % 7; return addDays(k, -wd); }
function addDays(k, n){ var d = parseD(k); d.setDate(d.getDate()+n); return dkey(d); }
function parseD(k){ var p = String(k).split("-"); return new Date(+p[0], (+p[1]||1)-1, +p[2]||1); }
function dayDiff(k){ return Math.round((parseD(k) - parseD(todayKey())) / 864e5); }
function relDay(k){
  var d = dayDiff(k);
  if(d === 0) return "hoy"; if(d === 1) return "mañana"; if(d === -1) return "ayer";
  return d > 1 ? "en " + d + " días" : "hace " + (-d) + " días";
}
function capFirst(s){ s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
function dayLabel(k){ try{ return parseD(k).toLocaleDateString("es", {weekday:"long", day:"numeric"}); }catch(e){ return k; } }

/* Mientras mamá no importe la agenda real, se muestra una de ejemplo con fechas de hoy. */
function demoAgenda(){
  var t = todayKey();
  return {demo:true,
    tareas:[
      {id:"d-t1", materia:"Math", titulo:"Páginas 34 y 35 del libro", detalle:"Sumas con llevada", fecha:t, entrega:addDays(t,1)},
      {id:"d-t2", materia:"English", titulo:"Practicar OVER- y UNDER-", detalle:"Haz tu examen de práctica", fecha:t, entrega:addDays(t,2), accion:"examen"},
      {id:"d-t3", materia:"Spanish", titulo:"Leer la lectura y copiar 5 palabras", detalle:"", fecha:t, entrega:addDays(t,1)},
      {id:"d-t4", materia:"Science", titulo:"Dibujar el ciclo del agua", detalle:"Con colores", fecha:addDays(t,-1), entrega:t},
      {id:"d-t5", materia:"Art", titulo:"Terminar el dibujo", detalle:"", fecha:addDays(t,1), entrega:addDays(t,3)}
    ],
    materiales:[{id:"d-m1", materia:"Art", material:"Cartulina azul y tijeras", llevar_el:addDays(t,2)}],
    videos:[{id:"d-v1", materia:"Science", titulo:"The Water Cycle", url:"https://www.youtube.com/results?search_query=water+cycle+for+kids", fecha:t}]
  };
}
function agendaData(){
  var a = S.agenda || demoAgenda();
  return {demo:!!a.demo, tareas:a.tareas||[], materiales:a.materiales||[], videos:a.videos||[], notas:a.notas||[]};
}
var cel = {};
function isDone(kind, id){ var m = kind === "task" ? S.home.tasks : kind === "vid" ? S.home.vids : S.home.mats; return !!m[id]; }
/* Días de clase (lunes a viernes) hacia atrás desde una fecha. */
function prevSchoolDay(k, n){
  var d = k;
  while(n > 0){ d = addDays(d, -1); var w = parseD(d).getDay(); if(w !== 0 && w !== 6) n--; }
  return d;
}
function wrongIdsOf(tid){ var h = tHist(tid), l = h[h.length - 1]; return l && l.wrong ? l.wrong : []; }
/* El plan de una charla: los 3 días de clase antes de la entrega, 3 sesiones por día; el día antes toca Sombra + Ensayo final. */
function charlaPlan(c){
  var E = c.fecha, t = todayKey(); if(!E || !isDate(E) || E < t) return null;
  var cur = null;
  [3, 2, 1].forEach(function(n){ var d = prevSchoolDay(E, n); if(d <= t) cur = {n:n, d:d, fin:n === 1}; });
  return cur;
}
function charlaLine(c, plan){
  var nl = chNextLevel(c.id);
  return "«" + c.titulo + "»: " + (plan.fin ? "hoy toca Sombra y Ensayo final." : "vas en el nivel " + nl + " (" + LEVELS[nl - 1].name + ").") + " Sesión " + Math.min(3, chToday(c.id) + 1) + " de 3 de hoy.";
}
/* Pendientes que salen solos: estudiar para un examen (3 días de clase antes) y practicar una charla (2 días antes). */
function autoItems(){
  var t = todayKey(), out = [];
  var ag0 = agendaData(), owned = {};   /* si la agenda ya trae tareas de ese tema, la agenda manda y no se repite el pendiente automático */
  ag0.tareas.forEach(function(x){ if(x.tema) owned[x.tema] = 1; });
  allTemas().forEach(function(tm){
    var E = tm.fecha_examen; if(!E || !isDate(E) || E < t || owned[tm.id]) return;
    /* plan antes del examen: 4 y 3 días antes → Entrenar; 2 días antes → Examen real; el día anterior → Repasar mis errores + Examen real */
    var nm = tm.titulo_es || tm.titulo, cur = null;
    [4, 3, 2, 1].forEach(function(n){ var d = prevSchoolDay(E, n); if(d <= t) cur = {n:n, d:d}; });
    if(!cur) return;
    if(aprTs(tm.id) && pkey(new Date(aprTs(tm.id))) >= prevSchoolDay(E, 4)) return;   /* ya sacó 80+ en el examen real: no se le insiste */
    var mk = function(modo, titulo){
      var id = "ex:" + tm.id + ":" + cur.d + ":" + modo;
      out.push({kind:"task", id:id, sort:E + "0" + cur.d + modo, x:{id:id, materia:tm.materia || "", fecha:cur.d, entrega:E, auto:"ex", tema:tm.id, modo:modo, titulo:titulo}});
    };
    if(cur.n >= 3) mk("entrenar", "🏋️ Entrenar: " + nm);
    else if(cur.n === 2) mk("real", "📝 Examen real: " + nm);
    else {
      if(wrongIdsOf(tm.id).length > 0) mk("repasar", "🔁 Repasar mis errores de " + nm);
      mk("real", "📝 Examen real: " + nm);
    }
  });
  S.charlas.forEach(function(c){
    var E = c.fecha; if(!E || !isDate(E) || E < t) return;
    var plan = charlaPlan(c); if(!plan) return;
    /* si una tarea de la agenda ya trae esta charla y está pendiente, el botón va dentro de esa tarea (no se repite) */
    var linked = agendaData().tareas.some(function(x){ return x.charla === c.id && x.fecha <= t && !S.home.tasks[x.id]; });
    if(linked) return;
    var id = "ch:" + ns(c.id) + ":" + plan.d;
    out.push({kind:"task", id:id, sort:E + "0" + plan.d, x:{id:id, materia:c.materia || "", fecha:plan.d, entrega:E, auto:"ch", charla:c.id, modo:plan.fin ? "final" : "",
      titulo:"🎤 Practicar mi charla (5 min)", en_casa:[charlaLine(c, plan)]}});
  });
  return out;
}
/* Al terminar una ronda de examen o una práctica de charla, esos pendientes se marcan hechos. */
function markAutoDone(kind, id, how){
  var H = S.home, ch = false, t = todayKey();
  var allowed = how === "real" ? ["entrenar", "real"] : how === "train" ? ["entrenar"] : how === "repasar" ? ["repasar"] : [];
  autoItems().forEach(function(it){
    var x = it.x; if(x.auto !== kind || (kind === "ex" ? x.tema : x.charla) !== id || H.tasks[it.id]) return;
    if(kind === "ex" && allowed.indexOf(x.modo) < 0) return;
    H.tasks[it.id] = Date.now(); ch = true;
  });
  /* también las tareas de la agenda que traen ese tema (o esa charla) y ya tocan (o se adelantan): ronda completa = hecha (quedan en el registro) */
  agendaData().tareas.forEach(function(x){
    if(x.copiar || H.tasks[x.id] || x.fecha > addDays(t, ADV_DAYS)) return;
    if(kind === "ex" && x.tema === id){
      var rep = /repasar/i.test(x.titulo || "");
      if(rep ? how !== "repasar" : (how !== "real" && how !== "train")) return;
      H.tasks[x.id] = Date.now(); noteAdv(x); ch = true;
    } else if(kind === "ch" && x.charla === id){ H.tasks[x.id] = Date.now(); noteAdv(x); ch = true; }
  });
  if(ch) saveHome();
}
/* Tareas de estudio que ya quedaron hechas hoy (con su puntaje), para que Killian y mamá vean que sí las hizo. */
function doneStudyToday(){
  var t = todayKey(), out = [];
  agendaData().tareas.forEach(function(x){ var ts = S.home.tasks[x.id]; if(x.tema && temaById(x.tema) && ts && pkey(new Date(ts)) === t) out.push({id:x.id, x:x}); });
  autoItems().forEach(function(it){ var ts = S.home.tasks[it.id]; if(it.x.auto === "ex" && ts && pkey(new Date(ts)) === t) out.push({id:it.id, x:it.x}); });
  return out;
}
function doneCard(d){
  var x = d.x, tm = temaById(x.tema);
  return '<article class="task donecard"><div class="emo" aria-hidden="true">✅</div><div class="body"><span class="chip sm">' + esc(x.materia || "") + '</span><h3>' + esc(x.titulo) + '</h3>' +
    '<p class="donebig">✅ ¡Ya lo hiciste!</p><p class="small">Puntaje ' + bestOf(x.tema) + ' · hoy</p>' +
    '<div class="acts"><button class="btn btn-ghost" type="button" data-act="x-quick" data-id="' + esc(x.tema) + '" data-m="">🔁 Practicar otra vez</button></div></div></article>';
}
/* ---- Adelantar tareas: opcional, solo cuando ya terminó lo de hoy y mañana. 1 ⭐ por tarea adelantada, máx. 3 al día. ---- */
var ADV_DAYS = 7, ADV_MAX = 3;
function noteAdv(x){ if(x && x.fecha > todayKey() && !S.home.adv[x.id]) S.home.adv[x.id] = Date.now(); }
function advStars(){
  var per = {}; Object.keys(S.home.adv).forEach(function(id){
    if(!S.home.tasks[id] || /^(d-|demo:)/.test(id)) return;
    var d = pkey(new Date(S.home.adv[id])); per[d] = (per[d] || 0) + 1;
  });
  var n = 0; Object.keys(per).forEach(function(d){ n += Math.min(per[d], ADV_MAX); });
  return n;
}
function advToday(){ var t = todayKey(); return Object.keys(S.home.adv).filter(function(id){ return S.home.tasks[id] && pkey(new Date(S.home.adv[id])) === t; }).length; }
/* Tareas de los próximos días que todavía no son de hoy. Las ya hechas hoy se quedan a la vista con su ✅. */
function advItems(){
  var t = todayKey(), end = addDays(t, ADV_DAYS), items = [];
  agendaData().tareas.forEach(function(x){
    if(x.fecha <= t || x.fecha > end) return;
    var done = !!S.home.tasks[x.id];
    if(done && !(S.home.adv[x.id] && pkey(new Date(S.home.adv[x.id])) === t)) return;
    items.push({kind:"task", id:x.id, x:x, sort:x.fecha + "1"});
  });
  items.sort(function(a, b){ return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; });
  return items;
}
function renderAdelantar(){
  var items = advItems(), n = advToday(), h = subHeader("Adelantar tareas", "home", "← Inicio") +
    '<section class="card"><svg class="owl" aria-hidden="true" style="width:70px;height:70px"><use href="#owl"/></svg><h2 class="sec-title">🚀 Adelantar tareas</h2>' +
    '<p>Si quieres, puedes hacer tareas de los próximos días. ¡Es opcional! Cada una te da ⭐ (hasta ' + ADV_MAX + ' al día).</p>' +
    (n ? '<p class="prize">⭐ ¡Súper! Hoy adelantaste ' + n + (n === 1 ? ' tarea' : ' tareas') + '.</p>' : '') + '</section>';
  if(!items.length) return h + '<div class="card alldone"><h2>¡Ya no hay más por adelantar! 🎉</h2><p>Descansa, campeón.</p></div>' + footer();
  var last = null;
  items.forEach(function(it){
    var g = dayLabel(it.x.fecha); g = g.charAt(0).toUpperCase() + g.slice(1);
    if(g !== last){ h += '<h2 class="sec-title nday">' + esc(g) + '</h2>'; last = g; }
    if(S.home.tasks[it.id]) h += '<article class="task donecard"><div class="emo" aria-hidden="true">✅</div><div class="body"><span class="chip sm">' + esc(it.x.materia || "") + '</span><h3>' + esc(it.x.titulo) + '</h3><p class="donebig">⭐ ¡Súper! Adelantaste una tarea</p></div></article>';
    else h += taskCard(it);
  });
  return h + footer();
}
function dueItems(){
  var ag = agendaData(), t = todayKey(), old = addDays(t, -14), items = [];
  var grace = addDays(t, -2);   /* lo que ya pasó hace más de 2 días ya no se le pide a Killian (mamá lo sigue viendo como atrasado) */
  ag.tareas.forEach(function(x){ if(x.fecha <= t && x.fecha >= old && (x.entrega || x.fecha) >= grace) items.push({kind:"task", id:x.id, x:x, sort:(x.entrega||x.fecha)+"1"}); });
  var linked = {};
  ag.tareas.forEach(function(x){ (x.videos || []).forEach(function(id){ linked[id] = 1; }); });
  ag.videos.forEach(function(v){ if(!linked[v.id] && v.fecha <= t && v.fecha >= old && addDays(v.fecha, 1) >= grace) items.push({kind:"vid", id:v.id, x:v, sort:addDays(v.fecha, 1)+"2"}); });
  autoItems().forEach(function(it){ it.sort = it.x.entrega + "1"; items.push(it); });
  items.sort(function(a, b){ return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; });
  return items;
}
function knownCount(){ return Object.keys(S.home.known).length; }
/* Lo marcado en la agenda de ejemplo (ids «d-…» y días «demo:…») nunca suma estrellas. */
function realKeys(map){ return Object.keys(map).filter(function(k){ return !/^(d-|demo:)/.test(k); }); }
function gameStars(){ var n = 0, g = S.home.gdays; Object.keys(g).forEach(function(k){ n += Math.min(g[k], 3); }); return n; }
function starCount(){
  var H = S.home;
  return realKeys(H.tasks).length + realKeys(H.vids).length + realKeys(H.mats).length +
    realKeys(H.days).length * 2 + (H.tries > 0 ? 1 : 0) + (H.best >= 80 ? 2 : 0) + (H.best >= 100 ? 2 : 0) + Object.keys(H.pxd).length + advStars() +
    Math.min(20, Math.floor(knownCount() / 5)) + gameStars() + chStarTotal();
}
function streak(){
  var ks = realKeys(S.home.days).sort(), best = 0, run = 0, prev = null;
  ks.forEach(function(k){ run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; });
  return best;
}
function medals(){
  var H = S.home, nt = realKeys(H.tasks).length;
  return [
    {e:"✅", n:"Primera tarea", d:"Marca tu primera tarea", ok:nt >= 1},
    {e:"🖐️", n:"Cinco tareas", d:"Completa 5 tareas", ok:nt >= 5},
    {e:"📝", n:"Examen terminado", d:"Termina un examen", ok:H.tries >= 1},
    {e:"💯", n:"Examen perfecto", d:"Saca 100 puntos", ok:H.best >= 100},
    {e:"🔁", n:"Practicando errores", d:"Practica tus errores", ok:H.prac >= 1},
    {e:"🔥", n:"3 días seguidos", d:"Termina todo 3 días seguidos", ok:streak() >= 3},
    {e:"🧠", n:"10 palabras nuevas", d:"Aprende 10 palabras en el diccionario", ok:knownCount() >= 10},
    {e:"🎮", n:"Jugador de palabras", d:"Termina un juego", ok:H.games >= 1},
    {e:"⚡", n:"Relámpago", d:"Acierta 10 palabras en el juego Relámpago", ok:H.speed >= 10}
  ];
}
function markDone(kind, id){
  var H = S.home, map = kind === "task" ? H.tasks : kind === "vid" ? H.vids : H.mats;
  if(map[id]) return;
  map[id] = Date.now();
  if(kind === "task") agendaData().tareas.forEach(function(x){ if(x.id === id) noteAdv(x); });
  if(kind !== "mat"){
    cel[id] = 1;
    setTimeout(function(){ delete cel[id]; if(S.screen === "home") render(); }, 950);
    var left = dueItems().filter(function(i){ return !isDone(i.kind, i.id); });
    if(!left.length) H.days[(agendaData().demo ? "demo:" : "") + todayKey()] = Date.now();
  }
  saveHome(); render();
}
function homeHeader(){
  return '<header class="top"><div class="brand"><svg aria-hidden="true"><use href="#owl"/></svg><b>English Practice<br>with Killian</b></div>' +
    '<span class="starchip" aria-label="Tus estrellas">⭐ '+starsAvail()+'</span></header>';
}
function subHeader(title, backAct, backTxt){
  return '<header class="top"><button class="link-btn" data-act="'+(backAct||"home")+'"'+(backAct === "go-screen" ? ' data-s="topics"' : '')+' type="button">'+(backTxt||"← Inicio")+'</button><b class="sec-title">'+esc(title)+'</b><span class="starchip">⭐ '+starsAvail()+'</span></header>';
}
function confetti(){
  var cols = ["#ffc928","#1d6fd8","#4aa3f0","#ffffff","#12306b"], h = "";
  for(var i=0;i<14;i++){
    var dx = Math.round((Math.random()-.5)*260), dy = Math.round(-30 - Math.random()*110);
    h += '<i class="bit" style="background:'+cols[i%cols.length]+';--dx:'+dx+'px;--dy:'+dy+'px"></i>';
  }
  return h + '<span class="plus">+1 ⭐</span>';
}
/* ---- Copiar en el cuaderno ---- */
var cpId = null, cpMom = false, cpZoom = "";
function cpKey(id, i){ return "cp:" + id + ":" + i; }
function cpDoneCount(id, n){ var c = 0; for(var i = 0; i < n; i++) if(S.home.nchk[cpKey(id, i)] > 0) c++; return c; }
function cpTask(){ var ag = agendaData(), r = null; ag.tareas.forEach(function(x){ if(x.id === cpId) r = x; }); return r; }
function renderCopiar(){
  var x = cpTask();
  if(!x || !x.copiar || !x.copiar.partes || !x.copiar.partes.length){ S.screen = "home"; return renderHome(); }
  var ps = x.copiar.partes, n = ps.length, d = cpDoneCount(x.id, n), lang = ps.some(function(p){ return p.traduccion_es; }) ? "en" : "es";
  var h = (cpMom ? subHeader("Para copiar", "cp-back-mom", "← Zona de mamá") : subHeader("Para copiar", "home", "← Inicio")) +
    (cpMom ? '<p class="note">👩 <b>Vista de mamá:</b> así lo ve Killian. Aquí no se marca nada.</p>' + (x.copiar.instrucciones_mama ? '<p class="small mamanote">Para mamá: '+esc(x.copiar.instrucciones_mama)+'</p>' : '') : '') +
    '<section class="card"><span class="chip">'+esc(x.materia||"")+'</span><h2 class="sec-title">'+esc(x.titulo)+'</h2>' +
    '<div class="progress-day"><div class="prog-row"><span>'+d+' de '+n+' '+(n === 1 ? "parte copiada" : "partes copiadas")+'</span></div><div class="bar"><i style="width:'+Math.round(d / n * 100)+'%"></i></div></div>' +
    '<p class="small">Copia cada parte en tu cuaderno, con letra bonita. Cuando termines una, tócala: ✓</p></section>';
  h += ps.map(function(p, i){
    var ok = S.home.nchk[cpKey(x.id, i)] > 0;
    return '<article class="card cparte'+(ok ? " ok" : "")+'"><h3>'+esc(p.titulo)+'</h3>' +
      (p.imagen ? '<button type="button" class="cpimgbtn" data-act="cp-zoom" data-src="img/copiar/'+esc(p.imagen)+'" aria-label="Ver el dibujo en pantalla completa"><img class="cpimg" src="img/copiar/'+esc(p.imagen)+'" alt="'+esc(p.titulo)+'" loading="lazy"><span class="cpzoomhint">🔍 Toca para verlo grande</span></button>' : '') +
      (p.texto ? '<div class="cptext" lang="'+lang+'">'+esc(p.texto)+'</div><div class="stack">'+spk(p.texto, lang)+'</div>' : '') +
      (p.traduccion_es ? '<p class="trad">'+esc(p.traduccion_es)+'</p>' : '') +
      (p.dibujo ? '<p class="cpdib">🎨 <b>Dibuja al lado:</b> '+esc(p.dibujo)+'</p>' : '') +
      (p.tabla && p.tabla.length ? '<div class="cptabwrap"><table class="cptab">'+p.tabla.map(function(r, ri){ return '<tr>'+r.map(function(c){ return (ri === 0 ? '<th>' : '<td>')+esc(c)+(ri === 0 ? '</th>' : '</td>'); }).join("")+'</tr>'; }).join("")+'</table></div>' : '') +
      (cpMom ? '' : '<button class="btn '+(ok ? "btn-ghost" : "btn-sun")+'" type="button" data-act="cp-part" data-i="'+i+'" aria-pressed="'+ok+'">'+(ok ? "✓ Ya la copié (toca para quitar)" : "✏️ Ya la copié")+'</button>') + '</article>';
  }).join("");
  if(!cpMom) h += '<section class="card alldone">'+(d === n ? '<h2>¡Copiaste todo! 🎉</h2>' : '<p class="small">Cuando copies todas las partes, aquí se activa el botón final.</p>')+
    '<button class="btn btn-sun btn-big" type="button" data-act="cp-done"'+(d === n ? "" : " disabled")+'>✅ ¡Listo, ya lo copié!</button></section>';
  if(cpZoom) h += '<div class="zoomveil" data-act="cp-unzoom" role="dialog" aria-label="Dibujo en pantalla completa"><img src="'+esc(cpZoom)+'" alt="Dibujo"><button type="button" class="btn btn-sun zoomclose" data-act="cp-unzoom">✕ Cerrar</button></div>';
  return h + footer();
}
function copiarClick(act, el){
  switch(act){
    case "cp-open": cpId = el.getAttribute("data-id"); cpMom = false; cpZoom = ""; S.screen = "copiar"; helperOpen = false; render({top:true}); return true;
    case "cp-zoom": cpZoom = el.getAttribute("data-src"); render(); return true;
    case "cp-unzoom": cpZoom = ""; render(); return true;
    case "cp-open-mom": cpId = el.getAttribute("data-id"); cpMom = true; S.screen = "copiar"; helperOpen = false; render({top:true}); return true;
    case "cp-back-mom": cpMom = false; S.screen = "mom"; momView = el.getAttribute("data-v") || "paracopiar"; render({top:true}); return true;
    case "cp-part": if(cpMom) return true; var k = cpKey(cpId, el.getAttribute("data-i")); S.home.nchk[k] = S.home.nchk[k] > 0 ? -Date.now() : Date.now(); saveHome(); render(); return true;
    case "cp-done":
      var tk = cpTask(); if(!tk || cpDoneCount(cpId, tk.copiar.partes.length) < tk.copiar.partes.length) return true;
      markDone("task", cpId); S.screen = "home"; render({top:true}); return true;
  }
  return false;
}
/* Tarjeta de pendiente: tipo de evaluación, qué hacer en casa, repaso y botones de video.
   Los materiales no se repiten aquí (tienen su propia lista). */
function kidDetail(d){
  return String(d || "").split(/\n+/).map(function(l){ return l.trim(); }).filter(function(l){
    return l && !/^(en clase|llevar|observaciones)\b/i.test(l) && !/—.*(sumativa|formativa)/i.test(l);
  });
}
function linkedVideos(x){
  var ag = agendaData();
  return (x.videos || []).map(function(id){ for(var i = 0; i < ag.videos.length; i++) if(ag.videos[i].id === id) return ag.videos[i]; return null; }).filter(Boolean);
}
function evalChip(e){
  if(!e) return "";
  var su = /sumativ/i.test(e), fo = /formativ/i.test(e);
  return '<span class="ev '+(su ? "su" : "fo")+'">'+(su ? "⭐ Sumativa" : "")+(su && fo ? " y " : "")+(fo ? (su ? "formativa" : "✏️ Formativa") : "")+'</span>';
}
function taskCard(it){
  var x = it.x, isVid = it.kind === "vid", c = !!cel[it.id];
  var due = isVid ? "" : (x.entrega ? (x.entrega < todayKey() ? '<p class="due late">⏰ Atrasada · era para el '+esc(dayLabel(x.entrega))+'</p>' : '<p class="due">📅 Para '+esc(relDay(x.entrega))+'</p>') : "");
  var acts = "", hasCp = it.kind === "task" && !!(x.copiar && x.copiar.partes && x.copiar.partes.length);
  if(hasCp){
    var cdone = cpDoneCount(it.id, x.copiar.partes.length);
    acts += '<button class="btn btn-sun btn-big" type="button" data-act="cp-open" data-id="'+esc(it.id)+'">📝 Ver qué copiar'+(cdone ? ' ('+cdone+' de '+x.copiar.partes.length+')' : '')+'</button>';
  }
  if(isVid && videoInfo(x.url)) acts += '<button class="btn btn-blue" type="button" data-act="play" data-id="'+esc(it.id)+'">▶ Ver el video aquí</button>';
  else if(isVid && /^https?:\/\//.test(x.url||"")) acts += '<a class="btn btn-blue" href="'+esc(x.url)+'" target="_blank" rel="noopener">▶ Abrir el enlace ↗</a>';
  if(it.kind === "task") linkedVideos(x).forEach(function(v){
    if(videoInfo(v.url)) acts += '<button class="btn btn-blue" type="button" data-act="play" data-id="'+esc(v.id)+'">▶ '+esc(v.titulo)+'</button>';
    else if(/^https?:\/\//.test(v.url||"")) acts += '<a class="btn btn-blue" href="'+esc(v.url)+'" target="_blank" rel="noopener">▶ '+esc(v.titulo)+' ↗</a>';
  });
  var cc = it.kind === "task" && x.charla ? charlaById(x.charla) : null, cplan = cc ? charlaPlan(cc) : null;
  if(cc) acts += '<button class="btn btn-blue btn-big" type="button" data-act="ch-open" data-id="'+esc(x.charla)+'" data-m="'+((x.modo === "final" || (cplan && cplan.fin)) ? "final" : "")+'">🎤 Practicar mi charla (5 min)</button>';
  var tmx = it.kind === "task" && x.tema ? temaById(x.tema) : null;
  if(tmx && tmx.resumen && tmx.resumen.length) acts += '<button class="btn btn-blue" type="button" data-act="study" data-id="'+esc(tmx.id)+'">📖 Estudiar mi resumen</button>';
  if(tmx){
    var rep = x.modo === "repasar" || (!x.auto && /repasar/i.test(x.titulo || "") && wrongIdsOf(tmx.id).length > 0);
    if(rep) acts += '<button class="btn btn-blue" type="button" data-act="x-quick" data-id="'+esc(x.tema)+'" data-m="errors">🔁 Repasar mis errores</button>';
    if(x.modo !== "real") acts += '<button class="btn btn-blue" type="button" data-act="x-quick" data-id="'+esc(x.tema)+'" data-m="">🏋️ Entrenar</button>';
    if(x.modo !== "entrenar") acts += '<button class="btn btn-sun" type="button" data-act="x-quick" data-id="'+esc(x.tema)+'" data-m="real">📝 Examen real</button>';
  }
  if(it.kind === "task" && x.accion === "examen") acts += '<button class="btn btn-blue" type="button" data-act="open-tema" data-id="overunder">📝 Abrir el examen</button>';
  if(!hasCp) acts += '<button class="btn btn-sun" type="button" data-act="done" data-k="'+it.kind+'" data-id="'+esc(it.id)+'">'+(isVid ? "¡Ya lo vi! ✓" : "¡Ya lo hice! ✓")+'</button>';
  var home = (x.en_casa && x.en_casa.length) ? x.en_casa.slice() : (x.en_casa ? [] : kidDetail(x.detalle));
  if(cc && cplan && !x.auto) home.push(charlaLine(cc, cplan));
  var body = "";
  if(home.length) body += '<div class="blk"><b>🏠 En casa</b>'+home.map(function(l){ return '<p>'+esc(l)+'</p>'; }).join("")+'</div>';
  return '<article class="task'+(c?" cel":"")+'"><div class="emo" aria-hidden="true">'+(isVid ? "🎬" : subjEmo(x.materia))+'</div>' +
    '<div class="body"><span class="chip sm">'+esc(x.materia||"")+'</span>'+(isVid ? "" : evalChip(x.evaluacion))+'<h3>'+esc(x.titulo)+'</h3>' +
    due + body + '<div class="acts">'+acts+'</div></div>' + (c ? confetti() : "") + '</article>';
}
/* Materiales de esta semana y la próxima, para tenerlos listos sin comprar a diario. */
/* Materiales urgentes: los de hoy (si es temprano) y los del próximo día de clases. */
function matFrom(){ return new Date().getHours() >= 15 ? addDays(todayKey(), 1) : todayKey(); }   /* después de las 3 pm lo de hoy ya pasó */
function urgentMats(){
  var t = todayKey(), from = matFrom(), end = addDays(t, 1), wd = parseD(end).getDay();
  if(wd === 6) end = addDays(t, 3); else if(wd === 0) end = addDays(t, 2);
  return agendaData().materiales.filter(function(m){ return !S.home.mats[m.id] && m.llevar_el >= from && m.llevar_el <= end; })
    .sort(function(a, b){ return a.llevar_el < b.llevar_el ? -1 : a.llevar_el > b.llevar_el ? 1 : 0; });
}
/* Lista de la semana: lo urgente ya está arriba; lo que ya está listo pasa al final. */
function renderMatsAside(urgent){
  var t = matFrom(), inUrgent = {}; urgent.forEach(function(m){ inUrgent[m.id] = 1; });
  var list = agendaData().materiales.filter(function(m){ return m.llevar_el >= t && !inUrgent[m.id]; });
  var h = '<aside class="card matsweek" aria-label="Materiales de la semana"><h2 class="sec-title">🎒 Materiales de la semana</h2>';
  if(!list.length) return h + '<p>' + (urgent.length ? 'Lo demás que necesitas está arriba. 😊' : 'No hay materiales por ahora. 🎉') + '</p></aside>';
  h += '<p class="small">Para tenerlos listos y no comprar cada día.</p>';
  function ready(m){ return !!S.home.mats[m.id] || S.home.have[m.id] > 0; }
  var pending = list.filter(function(m){ return !ready(m); }), doneL = list.filter(ready);
  function sorted(a){ return a.slice().sort(function(x, y){ return x.llevar_el < y.llevar_el ? -1 : x.llevar_el > y.llevar_el ? 1 : 0; }); }
  function row(m){
    var taken = !!S.home.mats[m.id], have = S.home.have[m.id] > 0;
    return '<div class="mrow'+(ready(m)?" taken":"")+'"><div class="mtxt"><b>'+esc(m.material)+'</b><span>'+esc(m.materia||"")+' · '+esc(capFirst(dayLabel(m.llevar_el)))+'</span></div>' +
      (taken ? '<span class="pill ok">✓ Listo</span>' :
       '<button class="have'+(have?" on":"")+'" type="button" data-act="have" data-id="'+esc(m.id)+'" aria-pressed="'+have+'">'+(have ? "✓ Ya lo tengo" : "Ya lo tengo")+'</button>') + '</div>';
  }
  var nextMon = addDays(mondayOf(todayKey()), 7);
  [["Esta semana", function(m){ return m.llevar_el < nextMon; }], ["La próxima semana", function(m){ return m.llevar_el >= nextMon; }]].forEach(function(g){
    var it = sorted(pending.filter(g[1])); if(it.length) h += '<h3 class="grp">'+g[0]+'</h3>' + it.map(row).join("");
  });
  if(doneL.length) h += '<h3 class="grp">✓ Ya listos</h3>' + sorted(doneL).map(row).join("");
  return h + '</aside>';
}
/* Si ya aprobó un tema (80 % o más) después de que le tocaba la tarea, esa tarea queda hecha aunque se haya practicado antes de esta versión. */
function retroMark(){
  var H = S.home, t = todayKey(), ch = false;
  agendaData().tareas.forEach(function(x){
    if(!x.tema || x.copiar || H.tasks[x.id] || x.fecha > t || !temaById(x.tema)) return;
    var from = parseD(x.fecha).getTime(), ok = tHist(x.tema).some(function(a){ return a.score >= PASS && a.ts >= from; });
    if(ok){ var last = 0; tHist(x.tema).forEach(function(a){ if(a.score >= PASS && a.ts >= from && (!last || a.ts < last)) last = a.ts; }); H.tasks[x.id] = last || Date.now(); ch = true; }
  });
  if(ch) saveHome();
}
function renderHome(){
  retroMark();
  var now = new Date(), hr = now.getHours(), t = todayKey(), ag = agendaData();
  var greet = hr < 12 ? "¡Buenos días" : hr < 19 ? "¡Buenas tardes" : "¡Buenas noches";
  var dateTxt = ""; try{ dateTxt = now.toLocaleDateString("es", {weekday:"long", day:"numeric", month:"long"}); dateTxt = dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1); }catch(e){}
  var mats = urgentMats();
  var due = dueItems();
  var pend = due.filter(function(i){ return !isDone(i.kind, i.id) || cel[i.id]; });
  var shown = pend.slice(0, 3), later = pend.filter(function(i){ return !cel[i.id]; }).length - shown.filter(function(i){ return !cel[i.id]; }).length;
  var doneToday = due.filter(function(i){ var m = i.kind === "task" ? S.home.tasks : S.home.vids; return m[i.id] && pkey(new Date(m[i.id])) === t; }).length;
  var open = due.filter(function(i){ return !isDone(i.kind, i.id); }).length;
  var tot = doneToday + open;
  var h = homeHeader() +
    '<section class="card hello"><div><h1>'+greet+', Killian!</h1><p class="date">'+esc(dateTxt)+'</p></div>' +
    '<svg class="owl" style="width:84px;height:84px;flex:none" aria-hidden="true"><use href="#owl"/></svg></section>';
  if(gm.lockMsg) h += '<p class="note" role="status">🎮 ¡Casi! Termina tus pendientes de hoy y se abren los juegos.</p>';
  if(ag.demo) h += '<p class="tag-demo">📝 Esto es un ejemplo. Cuando mamá cargue la agenda de la semana (🔒 Zona de mamá), aquí aparecerán las tareas de verdad.</p>';
  h += '<div class="homegrid"><div class="maincol">';
  if(mats.length){
    h += '<article class="mat" aria-label="Para llevar"><div class="mhead"><span class="ico" aria-hidden="true">🎒</span><b>Para llevar ' + (mats.every(function(m){ return m.llevar_el === mats[0].llevar_el; }) ? esc(relDay(mats[0].llevar_el)) : 'hoy y mañana') + '</b></div>' +
      mats.map(function(m){
        return '<div class="mline"><div class="txt"><b>' + esc(m.material) + '</b><span>' + esc(m.materia||"") + ' · ' + esc(dayLabel(m.llevar_el)) + ' (' + esc(relDay(m.llevar_el)) + ')</span></div>' +
          '<button class="btn btn-sun" type="button" data-act="done" data-k="mat" data-id="' + esc(m.id) + '" aria-label="Ya preparé ' + esc(m.material) + '">✓ Listo</button></div>';
      }).join("") + '</article>';
  }
  h += '<section class="tasks" aria-label="Pendientes de hoy"><h2 class="sec-title">Mis pendientes de hoy</h2>';
  if(tot > 0) h += '<div class="progress-day"><div class="prog-row"><span>Hoy llevas '+doneToday+' de '+tot+'</span></div><div class="bar"><i style="width:'+Math.round(doneToday/tot*100)+'%"></i></div></div>';
  if(shown.length){
    h += shown.map(taskCard).join("");
    if(later > 0) h += '<p class="more">Después vienen '+later+' más. ¡Tú puedes! 💪</p>';
  } else if(tot > 0){
    h += '<div class="card alldone"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><h2>¡Terminaste todo por hoy! 🎉</h2>' +
      '<p>¡Eres un campeón, Killian!</p><p class="prize">🏆 Premio de hoy: tienes ⭐ '+starsAvail()+' estrellas</p>' +
      '<button class="btn btn-blue" type="button" data-act="go-screen" data-s="stars">Ver mis estrellas</button></div>';
  } else {
    h += '<div class="card alldone"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><h2>No tienes pendientes por ahora 😊</h2>' +
      '<p>Puedes practicar inglés con tus temas.</p><button class="btn btn-sun" type="button" data-act="go-screen" data-s="topics">📚 Ir a mis temas</button></div>';
  }
  if(!open && !later && advItems().length) h += '<div class="card alldone"><h2>🎉 ¡Terminaste todo lo de mañana!</h2><p>Si quieres, puedes adelantar tareas de otros días. ¡Es opcional!</p>' +
    '<button class="btn btn-sun btn-big" type="button" data-act="go-screen" data-s="adelantar">🚀 Adelantar tareas</button></div>';
  var dn = doneStudyToday();
  if(dn.length) h += '<h2 class="sec-title">✅ Ya hechas hoy</h2>' + dn.map(doneCard).join("");
  h += '</section></div>' + renderMatsAside(mats) + '</div>' +
    '<section class="tiles" aria-label="Más cosas">' +
    '<button class="tile" type="button" data-act="go-screen" data-s="topics"><span class="big">📚</span>Mis temas</button>' +
    (S.charlas.length ? '<button class="tile" type="button" data-act="go-screen" data-s="charlas"><span class="big">🎤</span>Mis charlas</button>' : '') +
    '<button class="tile" type="button" data-act="go-screen" data-s="stars"><span class="big">⭐</span>Mis estrellas</button>' +
    '<button class="tile" type="button" data-act="go-screen" data-s="dict"><span class="big">📖</span>Mi diccionario</button>' +
    (gamesUnlocked() ? '<button class="tile" type="button" data-act="go-screen" data-s="games"><span class="big">🎮</span>Juegos</button>'
      : '<button class="tile locked" type="button" data-act="games-locked" aria-disabled="true"><span class="big">🔒</span>Juegos<span class="small">Termina tus pendientes</span></button>') +
    '<button class="tile" type="button" data-act="helper"><svg class="big-owl" aria-hidden="true"><use href="#owl"/></svg>Mi ayudante</button></section>';
  return h + footer();
}

/* ------------------------------------------------------------------ TEMAS */
var studyId = null;
function renderStudy(){
  var t = temaById(studyId);
  if(!t) return subHeader("Estudiar", "go-screen", "← Mis temas") + '<p class="note">No encuentro ese tema.</p>' + footer();
  return subHeader(t.titulo_es || t.titulo, "go-screen", "← Mis temas") +
    '<section class="card"><span class="chip">'+esc(t.materia||"")+'</span><h2 class="sec-title" lang="'+tlang(t.id)+'">'+esc(t.titulo)+'</h2>' +
    lessonsHtml(t.id, null).replace('<section class="card lessons">', '<section class="lessons-in">').replace('</section>', '</section>') +
    t.resumen.map(function(r){
      return '<div class="srow"><span class="semo" aria-hidden="true">'+esc(r.emoji||"📌")+'</span><div style="flex:1"><b lang="'+tlang(t.id)+'">'+esc(r.en)+'</b><p>'+esc(r.es)+'</p></div>'+spk(r.en, tlang(t.id))+'</div>';
    }).join("") + '</section>' +
    (t.vocabulario.length && t.idioma !== "es" ? '<button class="btn btn-blue btn-big" type="button" data-act="dict-open" data-id="'+esc(t.id)+'">🔤 Practicar sus palabras</button>' : "") +
    '<button class="btn btn-sun btn-big" type="button" data-act="open-tema" data-id="'+esc(t.id)+'">📝 Ir al examen</button>' + footer();
}
function renderStars(){
  var H = S.home;
  var rows = [["✅ Tareas hechas", realKeys(H.tasks).length], ["🎬 Videos vistos", realKeys(H.vids).length], ["🎒 Materiales preparados", realKeys(H.mats).length],
    ["🎉 Días completos (2 ⭐ cada uno)", realKeys(H.days).length], ["📝 Exámenes terminados", H.tries], ["🔁 Prácticas de repaso (máx. 1 ⭐ por día)", Object.keys(H.pxd).length],
    ["🧠 Palabras aprendidas (1 ⭐ cada 5)", knownCount()], ["🚀 Tareas adelantadas (1 ⭐ cada una, hasta 3 al día)", advStars()], ["🔎 Palabras que buscaste con el búho", Object.keys(H.look).length], ["🎮 Juegos terminados (hasta 3 ⭐ al día)", H.games], ["🎤 Estrellas de mis charlas", chStarTotal()]];
  return subHeader("Mis estrellas") +
    '<section class="card res"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><div class="score">⭐ '+starsAvail()+'</div><p>¡Sigue así, Killian!</p>'+(spentStars() ? '<p class="small">Has ganado '+starCount()+' en total y ya canjeaste '+spentStars()+'.</p>' : '')+'</section>' + renderPrizesKid() +
    '<section class="card"><h2 class="sec-title">Así ganas estrellas</h2>' + rows.map(function(r){ return '<p class="wordrow"><b>'+r[1]+'</b><span>'+esc(r[0])+'</span></p>'; }).join("") + '</section>' +
    '<h2 class="sec-title">Mis medallas</h2><div class="medals">' + medals().map(function(m){
      return '<div class="medal'+(m.ok?"":" lock")+'"><span class="e">'+(m.ok ? m.e : "🔒")+'</span><b>'+esc(m.n)+'</b><span>'+esc(m.d)+'</span></div>';
    }).join("") + '</div>' + footer();
}

/* ------------------------------------------------------------ DICCIONARIO */
var dict = {topic:null, flip:{}, quiz:null};
var CORTA = {overuse:"usar demasiado", overheat:"calentarse demasiado", underwater:"debajo del agua", overflow:"desbordarse", overestimate:"calcular de más",
  undercooked:"poco cocinado", undercover:"de incógnito", oversee:"supervisar", undershirt:"camiseta interior", overlook:"pasar por alto", overcook:"cocinar demasiado"};
function tlang(tid){ var t = tid ? temaById(tid) : null; return t && t.idioma === "es" ? "es" : "en"; }
function vocabTopics(){
  var list = [];
  allTemas().forEach(function(t){
    if(t.idioma === "es") return;   /* las palabras de temas en español no van al diccionario de inglés, ni a juegos, ni al búho */
    if(t.vocabulario.length) list.push({id:t.id, materia:t.materia, title:t.titulo_es || t.titulo, emo:t.builtin ? "🔤" : subjEmo(t.materia), words:t.vocabulario});
  });
  return list;
}
/* «Mis palabras para practicar»: las que falló en el mini vocabulario y todavía no recuerda. */
function weakTopic(){
  var words = [], H = S.home;
  vocabTopics().forEach(function(t){ t.words.forEach(function(w){ if(H.weak[wkey(t.id, w)] > 0) words.push({en:w.en, es:w.es, aceptadas:w.aceptadas, ejemplo_en:w.ejemplo_en, ejemplo_es:w.ejemplo_es, _tid:t.id}); }); });
  return words.length ? {id:"weak", title:"Mis palabras para practicar", emo:"⭐", words:words, weak:true} : null;
}
/* «Palabras que busqué»: las que consultó con el búho. */
function lookedTopic(){
  var H = S.home, words = [];
  Object.keys(H.look).sort(function(a, b){ return H.look[b] - H.look[a]; }).forEach(function(k){
    if(H.lookTr[k]) words.push({en:k, es:H.lookTr[k], aceptadas:[H.lookTr[k]], ejemplo_en:"", ejemplo_es:"", _tid:"looked"});
  });
  return words.length ? {id:"looked", title:"Palabras que busqué", emo:"🔎", words:words.slice(0, 60)} : null;
}
function topicById(id){ if(id === "weak") return weakTopic(); if(id === "looked") return lookedTopic(); var l = vocabTopics(); for(var i=0;i<l.length;i++) if(l[i].id === id) return l[i]; return null; }
function wkey(tid, w){ return tid + ":" + String(w.en).toLowerCase(); }
function renderDict(){
  var tp = dict.topic ? topicById(dict.topic) : null;
  if(!tp){ dict.topic = null; dict.quiz = null; }
  if(!tp){
    return subHeader("Mi diccionario") +
      '<p class="lead">Elige un tema y toca las tarjetas para ver qué significan las palabras. 👇</p><div class="dtopics">' +
      [weakTopic(), lookedTopic()].filter(Boolean).concat(vocabTopics()).map(function(t){
        var k = t.words.filter(function(w){ return S.home.known[wkey(w._tid || t.id, w)]; }).length, pct = Math.round(k / t.words.length * 100);
        return '<button class="dtopic" type="button" data-act="dict-open" data-id="'+esc(t.id)+'"><span class="big">'+t.emo+'</span><b>'+esc(t.title)+'</b>' +
          '<span class="small">'+t.words.length+' palabras · '+k+' aprendidas</span><span class="bar"><i style="width:'+pct+'%"></i></span></button>';
      }).join("") + '</div>' + footer();
  }
  if(dict.quiz) return renderQuiz2(tp);
  return subHeader(tp.title, "dict-back", "← Temas") +
    '<button class="btn btn-sun btn-big" type="button" data-act="dict-play">🎮 Jugar con estas palabras</button>' +
    '<p class="small" style="text-align:center">Toca una tarjeta para darle la vuelta.</p><div class="cards">' +
    tp.words.map(function(w, i){
      var on = !!dict.flip[i], known = !!S.home.known[wkey(w._tid || tp.id, w)];
      return '<div class="fwrap"><button class="fcard'+(on?" back":"")+'" type="button" data-act="flip" data-i="'+i+'" aria-pressed="'+on+'">' +
        (known ? '<span class="kn" aria-label="Ya la aprendiste">✓</span>' : '') +
        (on ? '<b class="es">'+esc(w.es)+'</b>' + (w.ejemplo_en ? '<span lang="'+tlang(w._tid || tp.id)+'" class="ex">'+esc(w.ejemplo_en)+'</span><span class="ex2">'+esc(w.ejemplo_es||"")+'</span>' : '')
            : '<b lang="'+tlang(w._tid || tp.id)+'">'+esc(w.en)+'</b><span class="hint">toca para ver</span>') + '</button>' + spk(w.en, tlang(w._tid || tp.id)) + '</div>';
    }).join("") + '</div>' + footer();
}
function startQuiz2(tp){
  var words = shuffle(tp.words).slice(0, 5), all = tp.words;
  var items = words.map(function(w){
    var others = shuffle(all.filter(function(x){ return x.es !== w.es; })).slice(0, 2).map(function(x){ return x.es; });
    if(others.length < 2){
      vocabTopics().forEach(function(t){ t.words.forEach(function(x){ if(others.length < 2 && x.es !== w.es && others.indexOf(x.es) < 0) others.push(x.es); }); });
    }
    return {w:w, opts:shuffle([w.es].concat(others)), pick:null};
  });
  dict.quiz = {items:items, i:0, ok:0, done:false};
}
function renderQuiz2(tp){
  var q = dict.quiz;
  if(q.done){
    var msg = q.ok === q.items.length ? "¡Perfecto! 🌟" : q.ok >= 3 ? "¡Muy bien! 👏" : "¡Buen intento! Sigue practicando 💪";
    return subHeader(tp.title, "dict-back", "← Temas") +
      '<section class="card res"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><h2 class="sec-title">'+msg+'</h2>' +
      '<div class="score">'+q.ok+' <small>de '+q.items.length+'</small></div><p>Las palabras que acertaste ya cuentan como aprendidas.</p>' +
      '<div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="dict-play">🎮 Jugar otra vez</button>' +
      '<button class="btn btn-ghost" type="button" data-act="dict-end">Ver las tarjetas</button></div></section>' + footer();
  }
  var it = q.items[q.i], answered = it.pick !== null, last = q.i === q.items.length - 1;
  var opts = it.opts.map(function(o, i){
    var cls = "opt";
    if(answered){ if(o === it.w.es) cls += " good"; else if(o === it.pick) cls += " bad"; }
    return '<button type="button" class="'+cls+'" data-act="dict-pick" data-v="'+esc(o)+'"'+(answered?" disabled":"")+'><span class="let">'+LET[i]+'</span><span>'+esc(o)+'</span></button>';
  }).join("");
  var fb = "";
  if(answered) fb = it.pick === it.w.es ? '<p class="fb good">🎉 ¡Muy bien!</p>' : '<p class="fb bad">¡Casi! Significa «'+esc(it.w.es)+'». Ya lo sabes para la próxima. 💙</p>';
  return subHeader(tp.title, "dict-end", "← Salir") +
    '<div class="prog-row"><span>Palabra '+(q.i+1)+' de '+q.items.length+'</span></div>' +
    '<main class="card qcard"><span class="chip">¿Qué significa?</span><div class="qrow"><p class="qtext" lang="'+tlang(it.w._tid || tp.id)+'" style="font-size:2.2rem">'+esc(it.w.en)+'</p>'+spk(it.w.en, tlang(it.w._tid || tp.id))+'</div>' +
    '<div class="opts">'+opts+'</div>'+fb+
    (answered ? '<button class="btn btn-sun btn-big" type="button" data-act="dict-next">'+(last ? "Ver mi resultado" : "Siguiente →")+'</button>' : "") + '</main>' + footer();
}

