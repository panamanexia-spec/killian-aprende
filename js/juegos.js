"use strict";
/* ===================================================================== JUEGOS */
var gm = {mode:null, pool:"all", game:null, s:null, lockMsg:false}, gmTimer = null;
function gamesUnlocked(){ return dueItems().every(function(i){ return isDone(i.kind, i.id); }); }
/* Dos tipos de juego: «generales» (palabras de todos los días) y «de la escuela» (los temas). */
function gmTopics(){ return gm.mode === "general" ? GENERAL : vocabTopics(); }
function poolWords(){
  var out = [];
  gmTopics().forEach(function(t){
    if(gm.pool !== "all" && t.id !== gm.pool) return;
    t.words.forEach(function(w){ out.push({tid:t.id, en:w.en, es:w.es, w:w}); });
  });
  return out;
}
function markKnown(tid, w){ var k = wkey(tid, w); if(!S.home.known[k]) S.home.known[k] = Date.now(); }
function gameDone(){ var H = S.home, k = todayKey(); H.games++; H.gdays[k] = (H.gdays[k] || 0) + 1; saveHome(); }
function stopTimer(){ if(gmTimer){ clearInterval(gmTimer); gmTimer = null; } }
function gmEnd(){ gm.game = null; gm.s = null; stopTimer(); }

function renderGames(){
  if(gm.game === "memory") return renderMemory();
  if(gm.game === "build") return renderBuild();
  if(gm.game === "speed") return renderSpeed();
  if(!gm.mode){
    var nS = vocabTopics().reduce(function(n, t){ return n + t.words.length; }, 0), nG = GENERAL.reduce(function(n, t){ return n + t.words.length; }, 0);
    return subHeader("Juegos") + '<p class="lead">¡Jugar también es aprender! ¿Con qué palabras quieres jugar? 🎮</p><div class="gmodes">' +
      '<button class="gmode" type="button" data-act="gm-mode" data-v="general"><span class="big">🌎</span><b>Generales</b><span>Animales, colores, comida, familia…</span><span class="small">' + nG + ' palabras</span></button>' +
      '<button class="gmode" type="button" data-act="gm-mode" data-v="school"><span class="big">🏫</span><b>De la escuela</b><span>Las palabras de tus temas</span><span class="small">' + nS + ' palabras</span></button></div>' +
      '<p class="small" style="text-align:center">Cada juego terminado da ⭐ (hasta 3 por día) y las palabras que aciertas cuentan como aprendidas.</p>' + footer();
  }
  var pool = poolWords(), topics = gmTopics();
  var chips = '<div class="tabs"><button type="button" class="tab" data-act="gm-pool" data-id="all" aria-pressed="' + (gm.pool === "all") + '">Todas</button>' +
    topics.map(function(t){ return '<button type="button" class="tab" data-act="gm-pool" data-id="' + esc(t.id) + '" aria-pressed="' + (gm.pool === t.id) + '">' + esc((t.emo ? t.emo + " " : "") + t.title) + '</button>'; }).join("") + '</div>';
  var h = subHeader(gm.mode === "general" ? "🌎 Juegos generales" : "🏫 Juegos de la escuela", "gm-modes", "← Juegos") +
    '<p class="lead">Elige las palabras y un juego. 🎮</p>' + chips;
  if(pool.length < 4) return h + '<p class="note">Este grupo tiene pocas palabras. Elige otro' + (gm.mode === "school" ? ', o pídele a mamá que agregue un tema' : '') + '.</p>' + footer();
  var best = S.home.speed ? ' · Tu récord: ' + S.home.speed : '';
  return h + '<div class="gcards">' +
    '<button class="gcard" type="button" data-act="gm-start" data-g="memory"><span class="big">🧠</span><b>Memoria</b><span>Une cada palabra con su significado</span></button>' +
    '<button class="gcard" type="button" data-act="gm-start" data-g="build"><span class="big">🔤</span><b>Arma la palabra</b><span>Ordena las letras</span></button>' +
    '<button class="gcard" type="button" data-act="gm-start" data-g="speed"><span class="big">⚡</span><b>Relámpago</b><span>30 segundos' + best + '</span></button></div>' + footer();
}
function gmBack(txt){ return subHeader(txt, "gm-hub", "← Juegos"); }
function resultCard(title, big, sub){
  return '<section class="card res"><svg class="owl" aria-hidden="true"><use href="#owl"/></svg><h2 class="sec-title">'+title+'</h2>' +
    '<div class="score">'+big+'</div><p>'+sub+'</p><div class="stack"><button class="btn btn-sun btn-big" type="button" data-act="gm-start" data-g="'+gm.game+'">🎮 Jugar otra vez</button>' +
    '<button class="btn btn-ghost" type="button" data-act="gm-hub">Elegir otro juego</button></div></section>';
}

/* --- Memoria --- */
function startMemory(){
  var words = shuffle(poolWords()).slice(0, 6), cards = [];
  words.forEach(function(w, i){ cards.push({k:i+"a", p:i, t:w.en, lang:"en"}); cards.push({k:i+"b", p:i, t:w.es, lang:"es"}); });
  gm.s = {words:words, cards:shuffle(cards), open:[], done:{}, moves:0, lock:false, fin:false};
}
function renderMemory(){
  var s = gm.s;
  if(s.fin) return gmBack("Memoria") + resultCard("¡Lo lograste! 🌟", s.moves + ' <small>intentos</small>', "Encontraste todas las parejas. Esas palabras ya cuentan como aprendidas.") + footer();
  return gmBack("Memoria") + '<p class="lead">Toca dos tarjetas: una en inglés y su significado en español.</p>' +
    '<div class="mem">' + s.cards.map(function(c, i){
      var up = s.open.indexOf(i) >= 0 || s.done[c.p];
      return '<button type="button" class="mcard'+(up?" up":"")+(s.done[c.p]?" ok":"")+'" data-act="gm-flip" data-i="'+i+'"'+(up?" disabled":"")+' aria-label="'+(up ? esc(c.t) : "Tarjeta sin voltear")+'">' +
        (up ? '<span lang="'+c.lang+'">'+esc(c.t)+'</span>' : '<svg aria-hidden="true"><use href="#owl"/></svg>') + '</button>';
    }).join("") + '</div><p class="more">Intentos: '+s.moves+' · Parejas: '+Object.keys(s.done).length+' de '+s.words.length+'</p>' + footer();
}

/* --- Arma la palabra --- */
function scramble(w){
  var L = w.toUpperCase().split(""), r, n = 0;
  do { r = shuffle(L); n++; } while(r.join("") === L.join("") && n < 8);
  return r.map(function(ch, i){ return {id:i, ch:ch}; });
}
function startBuild(){
  var words = shuffle(poolWords().filter(function(x){ return /^[a-z]{3,12}$/i.test(x.en); })).slice(0, 5);
  if(words.length < 3) return false;
  gm.s = {items:words.map(function(x){ return {x:x, letters:scramble(x.en)}; }), i:0, slots:[], solved:false, wrong:false, hint:false, ok:0, fin:false};
  return true;
}
function renderBuild(){
  var s = gm.s;
  if(s.fin) return gmBack("Arma la palabra") + resultCard("¡Muy bien! 🎉", s.ok + ' <small>de '+s.items.length+'</small>', "Las palabras que armaste ya cuentan como aprendidas.") + footer();
  var it = s.items[s.i], len = it.x.en.length, word = it.x.en.toUpperCase();
  var slots = ""; for(var j=0;j<len;j++){
    var id = s.slots[j], ch = id == null ? (s.hint && j === 0 ? word[0] : "") : it.letters[id].ch;
    slots += '<span class="slot'+(id != null ? " fill" : (ch ? " hintch" : ""))+'">'+esc(ch)+'</span>';
  }
  var letters = it.letters.map(function(l){
    var used = s.slots.indexOf(l.id) >= 0;
    return '<button type="button" class="lt" data-act="gm-letter" data-i="'+l.id+'"'+((used || s.solved) ? " disabled" : "")+'>'+esc(l.ch)+'</button>';
  }).join("");
  var last = s.i === s.items.length - 1;
  return gmBack("Arma la palabra") + '<div class="prog-row"><span>Palabra '+(s.i+1)+' de '+s.items.length+'</span></div>' +
    '<main class="card qcard"><span class="chip">En español significa</span><p class="qtext">'+esc(it.x.es)+'</p>' +
    '<div class="slots" lang="en" aria-label="Tu palabra">'+slots+'</div>' +
    (s.wrong ? '<p class="fb bad">¡Casi! Inténtalo otra vez. 💙</p>' : '') +
    (s.solved ? '<p class="fb good">🎉 ¡Muy bien! Es <b lang="en">'+esc(word)+'</b></p>' : '') +
    '<div class="letters" lang="en">'+letters+'</div>' +
    (s.solved ? '<button class="btn btn-sun btn-big" type="button" data-act="gm-next">'+(last ? "Ver mi resultado" : "Siguiente →")+'</button>'
              : '<div class="nav"><button class="btn btn-ghost" type="button" data-act="gm-undo">⌫ Borrar</button><button class="btn btn-ghost" type="button" data-act="gm-hint">💡 Pista</button></div>') +
    '</main>' + footer();
}

/* --- Relámpago --- */
function nextSpeed(){
  var pool = poolWords(), w = pool[Math.floor(Math.random() * pool.length)];
  var others = shuffle(pool.filter(function(x){ return x.es !== w.es; })).map(function(x){ return x.es; });
  var uniq = []; others.forEach(function(o){ if(uniq.indexOf(o) < 0) uniq.push(o); });
  gm.s.cur = {w:w, opts:shuffle([w.es].concat(uniq.slice(0, 2)))};
}
function startSpeed(){
  gm.s = {t0:Date.now(), dur:30, score:0, tries:0, over:false, cur:null};
  nextSpeed(); stopTimer();
  gmTimer = setInterval(function(){
    if(S.screen !== "games" || gm.game !== "speed" || !gm.s || gm.s.over){ stopTimer(); return; }
    var left = Math.max(0, gm.s.dur - (Date.now() - gm.s.t0) / 1000);
    var tx = document.getElementById("gtime"), bar = document.getElementById("gbar");
    if(tx) tx.textContent = Math.ceil(left); if(bar) bar.style.width = (left / gm.s.dur * 100) + "%";
    if(left <= 0){
      stopTimer(); gm.s.over = true;
      var newBest = gm.s.score > S.home.speed; if(newBest) S.home.speed = gm.s.score;
      gm.s.newBest = newBest; gameDone(); render({top:true});
    }
  }, 200);
}
function renderSpeed(){
  var s = gm.s;
  if(s.over) return gmBack("Relámpago") + resultCard(s.newBest && s.score > 0 ? "¡Nuevo récord! 🏆" : "¡Tiempo! ⚡", s.score + ' <small>aciertos</small>', "Tu récord es "+S.home.speed+". ¡Puedes superarlo!") + footer();
  var left = Math.max(0, Math.ceil(s.dur - (Date.now() - s.t0) / 1000));
  return gmBack("Relámpago") +
    '<div class="prog-row"><span>⏱️ <b id="gtime">'+left+'</b> s</span><span>✅ '+s.score+'</span></div><div class="bar"><i id="gbar" style="width:'+(left/s.dur*100)+'%"></i></div>' +
    '<main class="card qcard"><span class="chip">¿Qué significa?</span><div class="qrow"><p class="qtext" lang="en" style="font-size:2.2rem">'+esc(s.cur.w.en)+'</p>'+spk(s.cur.w.en,"en")+'</div>' +
    '<div class="opts">' + s.cur.opts.map(function(o, i){ return '<button type="button" class="opt" data-act="gm-speed" data-v="'+esc(o)+'"><span class="let">'+LET[i]+'</span><span>'+esc(o)+'</span></button>'; }).join("") + '</div></main>' + footer();
}

function gamesClick(act, el){
  switch(act){
    case "gm-pool": gm.pool = el.getAttribute("data-id"); render(); return true;
    case "gm-mode": gm.mode = el.getAttribute("data-v"); gm.pool = "all"; render({top:true}); return true;
    case "gm-modes": gmEnd(); gm.mode = null; gm.pool = "all"; render({top:true}); return true;
    case "gm-hub": gmEnd(); render({top:true}); return true;
    case "gm-start":
      var g = el.getAttribute("data-g"); gm.game = g; stopTimer();
      if(g === "memory") startMemory();
      else if(g === "build"){ if(!startBuild()){ gm.game = null; gm.s = null; render(); return true; } }
      else startSpeed();
      render({top:true}); return true;
    case "gm-flip":
      var s = gm.s, i = +el.getAttribute("data-i"), c = s.cards[i];
      if(s.lock || s.done[c.p] || s.open.indexOf(i) >= 0) return true;
      s.open.push(i);
      if(s.open.length === 2){
        s.moves++;
        var a = s.cards[s.open[0]], b = s.cards[s.open[1]];
        if(a.p === b.p && a.k !== b.k){
          s.done[a.p] = 1; s.open = [];
          if(Object.keys(s.done).length === s.words.length){ s.fin = true; s.words.forEach(function(w){ markKnown(w.tid, w.w); }); gameDone(); }
        } else {
          s.lock = true; render();
          setTimeout(function(){ s.open = []; s.lock = false; if(gm.game === "memory" && gm.s === s) render(); }, 900);
          return true;
        }
      }
      render(); return true;
    case "gm-letter":
      var b2 = gm.s; if(b2.solved) return true;
      var it = b2.items[b2.i], id = +el.getAttribute("data-i");
      if(b2.slots.indexOf(id) >= 0) return true;
      b2.wrong = false; b2.slots.push(id);
      if(b2.slots.length === it.x.en.length){
        var tried = b2.slots.map(function(k){ return it.letters[k].ch; }).join("");
        if(tried === it.x.en.toUpperCase()){ b2.solved = true; b2.ok++; markKnown(it.x.tid, it.x.w); }
        else { b2.wrong = true; render(); setTimeout(function(){ if(gm.s === b2 && b2.wrong){ b2.slots = []; b2.wrong = false; render(); } }, 900); return true; }
      }
      render(); return true;
    case "gm-undo": gm.s.slots.pop(); gm.s.wrong = false; render(); return true;
    case "gm-hint": gm.s.hint = true; render(); return true;
    case "gm-next":
      var b3 = gm.s;
      if(b3.i >= b3.items.length - 1){ b3.fin = true; gameDone(); }
      else { b3.i++; b3.slots = []; b3.solved = false; b3.wrong = false; b3.hint = false; }
      render({top:true}); return true;
    case "gm-speed":
      var sp = gm.s; if(sp.over) return true;
      sp.tries++;
      if(el.getAttribute("data-v") === sp.cur.w.es){ sp.score++; markKnown(sp.cur.w.tid, sp.cur.w.w); saveHome(); }
      nextSpeed(); render(); return true;
    case "games-locked": gm.lockMsg = true; render(); setTimeout(function(){ gm.lockMsg = false; if(S.screen === "home") render(); }, 3500); return true;
  }
  return false;
}

