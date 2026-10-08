/* Sincronización con Supabase (plan gratis). La clave "publishable" es pública por diseño:
   los datos están protegidos por las reglas de la tabla (cada cuenta solo ve lo suyo). */
(function(){
"use strict";
var SB_URL = "https://hhpoezwionzxmayebbpx.supabase.co";
var SB_KEY = "sb_publishable_0R-GV1JwJOl8125gNiZ4ZA_yw5CDssI";
var ROW = "estado";

var sb = null, session = null, pending = null, timer = null, retry = null, busy = false, cbs = {};
var api = {enabled:false, status:"none"};

function setStatus(s){ api.status = s; if(cbs.onStatus) cbs.onStatus(s); }
function isNetErr(e){
  var m = String((e && (e.message || e)) || "");
  return !navigator.onLine || /fetch|network|failed to|load failed|timeout/i.test(m);
}
api.hasSession = function(){ return !!session; };
api.hasPending = function(){ return !!pending; };

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
  pending = null; clearTimeout(timer); clearTimeout(retry);
  return sb.auth.signOut().then(function(){ session = null; });
};

/* Guarda en la nube (con un pequeño retraso para juntar cambios). */
api.push = function(payload){
  if(!sb || !session) return;
  pending = payload;
  clearTimeout(timer);
  timer = setTimeout(flush, 700);
};
function flush(){
  if(!sb || !session || !pending) return;
  if(busy){ clearTimeout(timer); timer = setTimeout(flush, 500); return; }
  if(!navigator.onLine){ setStatus("offline"); return; }
  var sending = pending;
  busy = true; setStatus("syncing");
  sb.from("kv").upsert(
    {user_id:session.user.id, key:ROW, value:sending, updated_at:new Date().toISOString()},
    {onConflict:"user_id,key"}
  ).then(function(r){
    busy = false;
    if(r.error) throw r.error;
    if(pending === sending){ pending = null; setStatus("ok"); }
    else flush();
  }).catch(function(e){
    busy = false;
    setStatus(isNetErr(e) ? "offline" : "error");
    clearTimeout(retry); retry = setTimeout(flush, 15000);
  });
}
api.flush = flush;

/* Lee lo que hay en la nube. Resuelve a {ok:true, value} o {ok:false}. */
api.pull = function(){
  if(!sb || !session) return Promise.resolve({ok:false});
  return sb.from("kv").select("value").eq("key", ROW).maybeSingle().then(function(r){
    if(r.error) throw r.error;
    return {ok:true, value: r.data ? r.data.value : null};
  }).catch(function(e){
    setStatus(isNetErr(e) ? "offline" : "error");
    return {ok:false};
  });
};
api.markOk = function(){ if(!pending) setStatus("ok"); };

window.KXSync = api;
})();
