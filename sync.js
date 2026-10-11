/* Sincronización con Supabase (plan gratis). La clave "publishable" es pública por diseño:
   los datos están protegidos por las reglas de la tabla (cada cuenta solo ve lo suyo).
   Se guardan varias filas independientes (examen, inicio, contenido) para que un aparato
   no pise lo que otro cambió en una parte distinta. */
(function(){
"use strict";
var SB_URL = "https://hhpoezwionzxmayebbpx.supabase.co";
var SB_KEY = "sb_publishable_0R-GV1JwJOl8125gNiZ4ZA_yw5CDssI";
var KEYS = ["examen", "inicio", "contenido"];

var sb = null, session = null, pending = {}, timer = null, retry = null, busy = false, cbs = {};
var api = {enabled:false, status:"none", KEYS:KEYS};

function setStatus(s){ api.status = s; if(cbs.onStatus) cbs.onStatus(s); }
function isNetErr(e){
  var m = String((e && (e.message || e)) || "");
  return !navigator.onLine || /fetch|network|failed to|load failed|timeout/i.test(m);
}
function hasPending(){ return Object.keys(pending).length > 0; }
api.hasSession = function(){ return !!session; };
api.hasPending = hasPending;

api.init = function(callbacks){
  cbs = callbacks || {};
  try{
    if(window.supabase && window.supabase.createClient){
      sb = window.supabase.createClient(SB_URL, SB_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:false}});
      api.enabled = true;
    }
  }catch(e){ sb = null; }
  if(!sb){ setStatus("none"); return Promise.resolve(); }
  sb.auth.onAuthStateChange(function(ev, s){
    session = s;
    if(ev === "SIGNED_OUT" && cbs.onSignedOut) setTimeout(cbs.onSignedOut, 0);
  });
  return sb.auth.getSession().then(function(r){
    session = r && r.data ? r.data.session : null;
  }).catch(function(){ session = null; });
};

api.signIn = function(email, password){
  return sb.auth.signInWithPassword({email:email, password:password}).then(function(r){
    if(!r.error) session = r.data.session;
    return r;
  });
};
api.signUp = function(email, password){
  return sb.auth.signUp({email:email, password:password}).then(function(r){
    if(!r.error && r.data && r.data.session) session = r.data.session;
    return r;
  });
};
api.signOut = function(){
  pending = {}; clearTimeout(timer); clearTimeout(retry);
  return sb.auth.signOut().then(function(){ session = null; });
};

/* Guarda una fila en la nube (con un pequeño retraso para juntar cambios). */
api.push = function(key, value){
  if(!sb || !session) return;
  pending[key] = JSON.parse(JSON.stringify(value));   /* copia: lo que se envía no cambia mientras viaja */
  clearTimeout(timer);
  timer = setTimeout(flush, 700);
};
function flush(){
  if(!sb || !session || !hasPending()) return;
  if(busy){ clearTimeout(timer); timer = setTimeout(flush, 500); return; }
  if(!navigator.onLine){ setStatus("offline"); return; }
  var sending = pending, now = new Date().toISOString();
  var rows = Object.keys(sending).map(function(k){
    return {user_id:session.user.id, key:k, value:sending[k], updated_at:now};
  });
  busy = true; setStatus("syncing");
  sb.from("kv").upsert(rows, {onConflict:"user_id,key"}).then(function(r){
    busy = false;
    if(r.error) throw r.error;
    Object.keys(sending).forEach(function(k){ if(pending[k] === sending[k]) delete pending[k]; });
    if(hasPending()) flush(); else setStatus("ok");
  }).catch(function(e){
    busy = false;
    setStatus(isNetErr(e) ? "offline" : "error");
    clearTimeout(retry); retry = setTimeout(flush, 15000);
  });
}
api.flush = flush;

/* Lee todas las filas de la nube. Resuelve a {ok:true, rows:{clave:valor}} o {ok:false}. */
api.pull = function(){
  if(!sb || !session) return Promise.resolve({ok:false});
  return sb.from("kv").select("key,value").in("key", KEYS).then(function(r){
    if(r.error) throw r.error;
    var rows = {};
    (r.data || []).forEach(function(x){ rows[x.key] = x.value; });
    return {ok:true, rows:rows};
  }).catch(function(e){
    setStatus(isNetErr(e) ? "offline" : "error");
    return {ok:false};
  });
};
api.markOk = function(){ if(!hasPending()) setStatus("ok"); };

window.KXSync = api;
})();
