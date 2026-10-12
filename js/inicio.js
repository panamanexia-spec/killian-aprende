"use strict";
/* ------------------------------------------------------------------ INICIO */
var SUBJ_EMO = {math:"🔢", spanish:"📖", español:"📖", english:"🔤", inglés:"🔤", science:"🔬", ciencias:"🔬", art:"🎨", arte:"🎨", music:"🎵", gym:"⚽"};
function subjEmo(m){ return SUBJ_EMO[String(m||"").toLowerCase()] || "📚"; }
function pad2(n){ return (n < 10 ? "0" : "") + n; }
function dkey(d){ return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate()); }
function todayKey(){ return dkey(new Date()); }
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
/* Pendientes que salen solos: estudiar para un examen (3 días de clase antes) y practicar una charla (2 días antes). */
function autoItems(){
  var t = todayKey(), out = [];
  allTemas().forEach(function(tm){
    var E = tm.fecha_examen; if(!E || !isDate(E) || E < t) return;
    var cur = null;   /* un solo pendiente por tema: el del día que toca */
    [3, 2, 1].forEach(function(n){
      var d = prevSchoolDay(E, n); if(d > t) return;
      var rep = n === 1 && wrongIdsOf(tm.id).length > 0, nm = tm.titulo_es || tm.titulo;
      cur = ({kind:"task", id:"ex:" + tm.id + ":" + d, sort:E + "0" + d, x:{id:"ex:" + tm.id + ":" + d, materia:tm.materia || "", fecha:d, entrega:E, auto:"ex", tema:tm.id, modo:rep ? "repasar" : "estudiar",
        titulo:rep ? "🔁 Repasar mis errores de " + nm : "📚 Estudiar: " + nm + " – hacer examen de práctica"}});
    });
    if(cur) out.push(cur);
  });
  S.charlas.forEach(function(c){
    var E = c.fecha; if(!E || !isDate(E) || E < t) return;
    var cur = null;   /* los 3 días de clase antes de la entrega, 3 sesiones por día */
    [3, 2, 1].forEach(function(n){ var d = prevSchoolDay(E, n); if(d <= t) cur = {n:n, d:d}; });
    if(!cur) return;
    var id = "ch:" + c.id + ":" + cur.d, fin = cur.n === 1, nl = chNextLevel(c.id);
    out.push({kind:"task", id:id, sort:E + "0" + cur.d, x:{id:id, materia:c.materia || "", fecha:cur.d, entrega:E, auto:"ch", charla:c.id, modo:fin ? "final" : "",
      titulo:"🎤 Practicar mi charla (5 min)",
      en_casa:["«" + c.titulo + "»: " + (fin ? "hoy toca Sombra y Ensayo final." : "vas en el nivel " + nl + " (" + LEVELS[nl - 1].name + ").") + " Sesión " + Math.min(3, chToday(c.id) + 1) + " de 3 de hoy."]}});
  });
  return out;
}
/* Al terminar una ronda de examen o una práctica de charla, esos pendientes se marcan hechos. */
function markAutoDone(kind, id){
  var H = S.home, ch = false;
  autoItems().forEach(function(it){
    var x = it.x; if(x.auto !== kind || (kind === "ex" ? x.tema : x.charla) !== id || H.tasks[it.id]) return;
    H.tasks[it.id] = Date.now(); ch = true;
  });
  if(ch) saveHome();
}
function dueItems(){
  var ag = agendaData(), t = todayKey(), old = addDays(t, -14), items = [];
  ag.tareas.forEach(function(x){ if(x.fecha <= t && x.fecha >= old) items.push({kind:"task", id:x.id, x:x, sort:(x.entrega||x.fecha)+"1"}); });
  var linked = {};
  ag.tareas.forEach(function(x){ (x.videos || []).forEach(function(id){ linked[id] = 1; }); });
  ag.videos.forEach(function(v){ if(!linked[v.id] && v.fecha <= t && v.fecha >= old) items.push({kind:"vid", id:v.id, x:v, sort:addDays(v.fecha, 1)+"2"}); });
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
    realKeys(H.days).length * 2 + (H.tries > 0 ? 1 : 0) + (H.best >= 80 ? 2 : 0) + (H.best >= 100 ? 2 : 0) + H.prac +
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
  var acts = "";
  if(isVid && videoInfo(x.url)) acts += '<button class="btn btn-blue" type="button" data-act="play" data-id="'+esc(it.id)+'">▶ Ver el video aquí</button>';
  else if(isVid && /^https?:\/\//.test(x.url||"")) acts += '<a class="btn btn-blue" href="'+esc(x.url)+'" target="_blank" rel="noopener">▶ Abrir el enlace ↗</a>';
  if(it.kind === "task") linkedVideos(x).forEach(function(v){
    if(videoInfo(v.url)) acts += '<button class="btn btn-blue" type="button" data-act="play" data-id="'+esc(v.id)+'">▶ '+esc(v.titulo)+'</button>';
    else if(/^https?:\/\//.test(v.url||"")) acts += '<a class="btn btn-blue" href="'+esc(v.url)+'" target="_blank" rel="noopener">▶ '+esc(v.titulo)+' ↗</a>';
  });
  var cc = it.kind === "task" && x.charla ? charlaById(x.charla) : null;
  if(cc && (x.auto || !(cc.fecha && cc.fecha >= todayKey() && prevSchoolDay(cc.fecha, 3) <= todayKey()))) acts += '<button class="btn btn-blue" type="button" data-act="ch-open" data-id="'+esc(x.charla)+'" data-m="'+(x.modo || "")+'">🎤 Practicar mi charla</button>';
  var tmx = it.kind === "task" && x.tema ? temaById(x.tema) : null;
  if(tmx && tmx.resumen && tmx.resumen.length) acts += '<button class="btn btn-blue" type="button" data-act="study" data-id="'+esc(tmx.id)+'">📖 Estudiar mi resumen</button>';
  if(tmx && (x.auto || !(tmx.fecha_examen && tmx.fecha_examen >= todayKey() && prevSchoolDay(tmx.fecha_examen, 3) <= todayKey()))) acts += '<button class="btn btn-blue" type="button" data-act="x-quick" data-id="'+esc(x.tema)+'" data-m="'+(x.modo === "repasar" ? "errors" : "")+'">'+(x.modo === "repasar" ? "🔁 Repasar mis errores" : "📝 Practicar examen")+'</button>';
  if(it.kind === "task" && x.accion === "examen") acts += '<button class="btn btn-blue" type="button" data-act="open-tema" data-id="overunder">📝 Abrir el examen</button>';
  acts += '<button class="btn btn-sun" type="button" data-act="done" data-k="'+it.kind+'" data-id="'+esc(it.id)+'">'+(isVid ? "¡Ya lo vi! ✓" : "¡Ya lo hice! ✓")+'</button>';
  var home = (x.en_casa && x.en_casa.length) ? x.en_casa : (x.en_casa ? [] : kidDetail(x.detalle));
  var rep = x.repaso || [];
  var body = "";
  if(home.length) body += '<div class="blk"><b>🏠 En casa</b>'+home.map(function(l){ return '<p>'+esc(l)+'</p>'; }).join("")+'</div>';
  if(rep.length) body += '<div class="blk rep"><b>📚 Repaso en clase</b>'+rep.map(function(l){ return '<p>'+esc(l)+'</p>'; }).join("")+'</div>';
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
function renderHome(){
  var now = new Date(), hr = now.getHours(), t = todayKey(), ag = agendaData();
  var greet = hr < 12 ? "¡Buenos días" : hr < 19 ? "¡Buenas tardes" : "¡Buenas noches";
  var dateTxt = ""; try{ dateTxt = now.toLocaleDateString("es", {weekday:"long", day:"numeric", month:"long"}); dateTxt = dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1); }catch(e){}
  var mats = urgentMats();
  var due = dueItems();
  var pend = due.filter(function(i){ return !isDone(i.kind, i.id) || cel[i.id]; });
  var shown = pend.slice(0, 3), later = pend.filter(function(i){ return !cel[i.id]; }).length - shown.filter(function(i){ return !cel[i.id]; }).length;
  var doneToday = due.filter(function(i){ var m = i.kind === "task" ? S.home.tasks : S.home.vids; return m[i.id] && dkey(new Date(m[i.id])) === t; }).length;
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
    t.resumen.map(function(r){
      return '<div class="srow"><span class="semo" aria-hidden="true">'+esc(r.emoji||"📌")+'</span><div style="flex:1"><b lang="'+tlang(t.id)+'">'+esc(r.en)+'</b><p>'+esc(r.es)+'</p></div>'+spk(r.en, tlang(t.id))+'</div>';
    }).join("") + '</section>' +
    (t.vocabulario.length ? '<button class="btn btn-blue btn-big" type="button" data-act="dict-open" data-id="'+esc(t.id)+'">🔤 Practicar sus palabras</button>' : "") +
    '<button class="btn btn-sun btn-big" type="button" data-act="open-tema" data-id="'+esc(t.id)+'">📝 Ir al examen</button>' + footer();
}
function renderStars(){
  var H = S.home;
  var rows = [["✅ Tareas hechas", realKeys(H.tasks).length], ["🎬 Videos vistos", realKeys(H.vids).length], ["🎒 Materiales preparados", realKeys(H.mats).length],
    ["🎉 Días completos (2 ⭐ cada uno)", realKeys(H.days).length], ["📝 Exámenes terminados", H.tries], ["🔁 Prácticas de errores", H.prac],
    ["🧠 Palabras aprendidas (1 ⭐ cada 5)", knownCount()], ["🔎 Palabras que buscaste con el búho", Object.keys(H.look).length], ["🎮 Juegos terminados (hasta 3 ⭐ al día)", H.games], ["🎤 Estrellas de mis charlas", chStarTotal()]];
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

