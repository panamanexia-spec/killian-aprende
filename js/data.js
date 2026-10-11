"use strict";
/* ------------------------------------------------------------------ DATOS */
var POINTS = 4;
var STORE_KEY = "kx-over-under-v1";

var SECTIONS = {
  1:{name:"Complete the word",   es:"Completa cada palabra con OVER- o UNDER-."},
  2:{name:"Choose the correct word", es:"Lee la oración y selecciona la palabra que tenga sentido."},
  3:{name:"Complete the sentence", es:"Escribe la palabra completa en inglés que falta en cada oración."},
  4:{name:"Match the word to its meaning", es:"Relaciona cada palabra en inglés con su significado en español."},
  5:{name:"Challenge time", es:"Lee con atención. Algunas preguntas pueden ser un poco más difíciles."}
};

/* Conceptos: sirven para explicar y para armar la práctica de errores. */
var C = {
  overuse:{word:"OVERUSE", parts:"OVER + USE", es:"usar demasiado",
    exp:"OVERUSE significa usar demasiado. OVER- aquí quiere decir «demasiado».",
    ex:"Don't OVERUSE salt in your soup.", exEs:"No uses demasiada sal en tu sopa."},
  overheat:{word:"OVERHEAT", parts:"OVER + HEAT", es:"calentarse demasiado",
    exp:"OVERHEAT significa calentarse demasiado. Algo está tan caliente que puede fallar.",
    ex:"Phones can OVERHEAT in the hot sun.", exEs:"Los teléfonos pueden calentarse demasiado bajo el sol."},
  underwater:{word:"UNDERWATER", parts:"UNDER + WATER", es:"debajo del agua",
    exp:"UNDERWATER significa debajo del agua. UNDER- quiere decir «debajo».",
    ex:"The fish swim UNDERWATER.", exEs:"Los peces nadan debajo del agua."},
  overflow:{word:"OVERFLOW", parts:"OVER + FLOW", es:"desbordarse",
    exp:"OVERFLOW significa desbordarse: el agua se sale porque hay demasiada.",
    ex:"The river can OVERFLOW after heavy rain.", exEs:"El río puede desbordarse después de mucha lluvia."},
  overestimate:{word:"OVERESTIMATE", parts:"OVER + ESTIMATE", es:"calcular una cantidad mayor de la real",
    exp:"OVERESTIMATE significa calcular una cantidad mayor de la real. Su opuesto es UNDERESTIMATE, que es calcular menos de lo real.",
    ex:"I OVERESTIMATED the time. I finished early!", exEs:"Calculé más tiempo del necesario. ¡Terminé temprano!"},
  undercooked:{word:"UNDERCOOKED", parts:"UNDER + COOKED", es:"no cocinado lo suficiente",
    exp:"UNDERCOOKED significa que la comida no se ha cocinado lo suficiente. OVERCOOKED significa que se cocinó demasiado. ¡Son opuestos!",
    ex:"The rice is UNDERCOOKED and hard.", exEs:"El arroz está poco cocinado y duro."},
  undercover:{word:"UNDERCOVER", parts:"UNDER + COVER", es:"de incógnito",
    exp:"UNDERCOVER significa de incógnito: trabajar en secreto para que nadie sepa quién eres en realidad.",
    ex:"The agent went UNDERCOVER to find the thief.", exEs:"El agente fue de incógnito para encontrar al ladrón."},
  oversee:{word:"OVERSEE", parts:"OVER + SEE", es:"supervisar",
    exp:"OVERSEE significa supervisar o vigilar que todo se haga bien. No es lo mismo que OVERLOOK.",
    ex:"The coach will OVERSEE the soccer practice.", exEs:"El entrenador supervisará la práctica de fútbol."},
  undershirt:{word:"UNDERSHIRT", parts:"UNDER + SHIRT", es:"camiseta interior",
    exp:"UNDERSHIRT significa camiseta interior: se usa debajo de otra prenda.",
    ex:"It is cold, so I wear an UNDERSHIRT.", exEs:"Hace frío, así que me pongo una camiseta interior."},
  overlook:{word:"OVERLOOK", parts:"OVER + LOOK", es:"pasar algo por alto",
    exp:"OVERLOOK significa pasar algo por alto, es decir, no darte cuenta de algo.",
    ex:"Don't OVERLOOK the last question on the page.", exEs:"No pases por alto la última pregunta de la hoja."},
  overcook:{word:"OVERCOOK", parts:"OVER + COOK", es:"cocinar demasiado",
    exp:"OVERCOOK significa cocinar demasiado. Su opuesto es UNDERCOOK, que es cocinar muy poco.",
    ex:"If you OVERCOOK the pasta, it gets soft and mushy.", exEs:"Si cocinas demasiado la pasta, queda blanda y pastosa."},
  prefix:{word:"OVER- / UNDER-", parts:"", es:"OVER- = demasiado; UNDER- = debajo o poco",
    exp:"OVER- suele expresar exceso (demasiado). UNDER- suele significar debajo o «no suficiente».",
    ex:"OVERWORK means to work too much. UNDERPAID means paid too little.",
    exEs:"OVERWORK es trabajar demasiado. UNDERPAID es que te pagan muy poco."}
};

/* Significado de cada palabra que aparece como opción. */
var D = {
  "OVERUSE":"usar demasiado", "UNDERUSE":"usar muy poco",
  "OVERHEAT":"calentarse demasiado", "UNDERWATER":"debajo del agua",
  "OVERFLOW":"desbordarse", "OVERESTIMATE":"calcular una cantidad mayor de la real",
  "UNDERESTIMATE":"calcular una cantidad menor de la real",
  "OVERCOOKED":"cocinado demasiado", "UNDERCOOKED":"no cocinado lo suficiente",
  "OVERCOOK":"cocinar demasiado", "UNDERCOOK":"cocinar muy poco",
  "UNDERCOVER":"de incógnito (en secreto)", "OVERLOOK":"pasar algo por alto",
  "OVERSEE":"supervisar", "UNDERSHIRT":"camiseta interior",
  "OVER-":"demasiado", "UNDER-":"debajo o «no suficiente»"
};

var MEANINGS = {
  A:"Camiseta interior.", B:"Calcular una cantidad mayor de la real.",
  C:"No cocinar lo suficiente.", D:"Usar demasiado.", E:"Pasar algo por alto."
};

function mc(n, sec, concept, prompt, opts, ans, base, exp){
  return {id:"q"+n, n:n, sec:sec, type:"mc", concept:concept, prompt:prompt, base:base||"", opts:opts, ans:ans, exp:exp||C[concept].exp};
}
function wr(n, concept, prompt, ans, exp){
  return {id:"q"+n, n:n, sec:3, type:"write", concept:concept, prompt:prompt, ans:ans, exp:exp||C[concept].exp};
}
function mt(n, concept, word, letter){
  return {id:"q"+n, n:n, sec:4, type:"match", concept:concept, prompt:word, word:word, ans:letter, exp:C[concept].exp};
}

var EXAM = [
  mc(1,1,"overuse","You should not ______ your eyes by watching too much television.",["OVERUSE","UNDERUSE"],"OVERUSE","USE",
     "OVERUSE significa usar demasiado. Ver demasiada televisión puede cansar tus ojos."),
  mc(2,1,"overheat","The computer may ______ if it gets too hot.",["OVERHEAT","UNDERHEAT"],"OVERHEAT","HEAT",
     "OVERHEAT significa calentarse demasiado. Una computadora puede sobrecalentarse si no puede liberar el calor. Está demasiado caliente, por eso usamos OVER-."),
  mc(3,1,"underwater","A submarine travels ______.",["OVERWATER","UNDERWATER"],"UNDERWATER","WATER",
     "UNDERWATER significa debajo del agua. Los submarinos viajan debajo de la superficie del mar."),
  mc(4,1,"overflow","The bathtub will ______ if you leave the water running.",["OVERFLOW","UNDERFLOW"],"OVERFLOW","FLOW",
     "OVERFLOW significa desbordarse. El agua se sale de la bañera cuando hay demasiada."),
  mc(5,1,"overestimate","We should not ______ how much food we need.",["OVERESTIMATE","UNDERESTIMATE"],"OVERESTIMATE","ESTIMATE",
     "OVERESTIMATE significa calcular una cantidad mayor de la real. Por ejemplo, pensar que necesitamos diez pizzas cuando solo necesitamos cinco."),
  mc(6,2,"undercooked","The cookies need more time in the oven because they are not fully cooked.",["OVERCOOKED","UNDERCOOKED","UNDERWATER"],"UNDERCOOKED","",
     "UNDERCOOKED significa que un alimento no se ha cocinado lo suficiente. Por eso las galletas necesitan más tiempo en el horno."),
  mc(7,2,"undercover","The police officer wore ordinary clothes to hide his identity.",["UNDERCOVER","OVERHEAT","OVERFLOW"],"UNDERCOVER","",
     "UNDERCOVER significa de incógnito. El policía intenta que las personas no sepan que es policía."),
  mc(8,2,"oversee","The teacher asked the assistant to watch and supervise the class.",["OVERLOOK","OVERSEE","UNDERWATER"],"OVERSEE","",
     "OVERSEE significa supervisar o vigilar. La asistente debe asegurarse de que la clase esté trabajando bien."),
  mc(9,2,"undershirt","He wore a shirt beneath his school uniform.",["OVERSHIRT","UNDERSHIRT","UNDERCOOKED"],"UNDERSHIRT","",
     "UNDERSHIRT significa camiseta interior. Es una camiseta que se lleva debajo de otra prenda."),
  mc(10,2,"overlook","You did not notice a small mistake in your homework.",["OVERLOOK","OVERUSE","OVERHEAT"],"OVERLOOK","",
     "OVERLOOK significa pasar algo por alto o no darse cuenta de algo. Si no ves un error pequeño, lo has pasado por alto."),
  wr(11,"overflow","The sink will ______ if you leave the faucet running.","overflow",
     "OVERFLOW significa desbordarse. Si el grifo sigue abierto, el agua se sale del fregadero. Se escribe OVER + FLOW."),
  wr(12,"underwater","A submarine travels ______ to study marine wildlife.","underwater",
     "UNDERWATER significa debajo del agua. Los submarinos viajan bajo la superficie del mar. Se escribe UNDER + WATER."),
  wr(13,"overheat","The laptop may ______ if you block the vents.","overheat",
     "OVERHEAT significa calentarse demasiado. Si tapas las salidas de aire, el calor no puede salir. Se escribe OVER + HEAT."),
  wr(14,"undercover","The police officer worked ______ during the investigation.","undercover",
     "UNDERCOVER significa de incógnito. El policía trabaja en secreto y nadie sabe que es policía. Se escribe UNDER + COVER."),
  wr(15,"oversee","The teacher asked the assistant to ______ the class.","oversee",
     "OVERSEE significa supervisar o vigilar. La asistente se asegura de que la clase trabaje bien. Se escribe OVER + SEE."),
  mt(16,"overuse","OVERUSE","D"),
  mt(17,"overlook","OVERLOOK","E"),
  mt(18,"undershirt","UNDERSHIRT","A"),
  mt(19,"undercooked","UNDERCOOKED","C"),
  mt(20,"overestimate","OVERESTIMATE","B"),
  mc(21,5,"overheat","Which word means “to become too hot”?",["OVERHEAT","UNDERWATER","OVERSEE"],"OVERHEAT","",
     "OVERHEAT significa calentarse demasiado."),
  mc(22,5,"overcook","Which word means “to cook something too much”?",["UNDERCOOK","OVERCOOK","OVERLOOK"],"OVERCOOK","",
     "OVERCOOK significa cocinar demasiado. Por ejemplo, dejar un alimento en el horno durante demasiado tiempo."),
  mc(23,5,"prefix","Which prefix usually means too much or excessive?",["UNDER-","OVER-"],"OVER-","",
     "OVER- suele expresar exceso o algo que se hace demasiado."),
  mc(24,5,"underwater","Which word means “below the surface of the water”?",["OVERWATER","UNDERWATER","OVERUSE"],"UNDERWATER","",
     "UNDERWATER significa debajo del agua."),
  mc(25,5,"overestimate","You think you need 20 sandwiches for a party, but you really need only 10. Which word describes your mistake?",["UNDERESTIMATE","OVERESTIMATE","OVERLOOK"],"OVERESTIMATE","",
     "OVERESTIMATE significa calcular de más. Pensaste que necesitabas más comida de la que realmente necesitabas.")
];

/* Banco para la práctica de errores: preguntas con otra redacción. */
function bm(prompt, opts, ans, base){ return {type:"mc", prompt:prompt, opts:opts, ans:ans, base:base||""}; }
function bw(prompt, ans){ return {type:"write", prompt:prompt, ans:ans}; }
var BANK = {
  overuse:[ bm("Mia plays video games all day. She should not ______ them.",["OVERUSE","UNDERUSE"],"OVERUSE","USE"),
            bw("If you ______ the glue, your paper will get too wet.","overuse") ],
  overheat:[ bm("The car engine is very, very hot. It might ______.",["OVERHEAT","OVERSEE","UNDERWATER"],"OVERHEAT"),
             bw("Do not leave your phone in the sun. It may ______.","overheat") ],
  underwater:[ bm("Fish, turtles and sharks live ______.",["UNDERWATER","OVERUSE","OVERFLOW"],"UNDERWATER"),
               bw("The divers swam ______ to see the coral.","underwater") ],
  overflow:[ bm("If you pour too much juice into a small glass, it will ______.",["OVERFLOW","OVERLOOK","UNDERSHIRT"],"OVERFLOW"),
             bw("The river will ______ after the big storm.","overflow") ],
  overestimate:[ bm("Ana needs only 20 stickers, but she asks for 100. Which word describes her mistake?",["OVERESTIMATE","UNDERESTIMATE","OVERLOOK"],"OVERESTIMATE"),
                 bw("If you say a small dog weighs 50 kilos, you ______ its weight.","overestimate") ],
  undercooked:[ bm("The chicken is still pink inside. It is ______.",["UNDERCOOKED","OVERCOOKED","UNDERWATER"],"UNDERCOOKED"),
                bw("The pasta is hard because it is ______.","undercooked") ],
  undercover:[ bm("A detective dresses like a waiter to secretly watch a thief. She works ______.",["UNDERCOVER","OVERHEAT","OVERFLOW"],"UNDERCOVER"),
               bw("The spy went ______ at the party, so nobody knew who she was.","undercover") ],
  oversee:[ bm("The coach will ______ the game to make sure everyone plays fairly.",["OVERSEE","OVERLOOK","UNDERSHIRT"],"OVERSEE"),
            bw("The principal will ______ the school fair.","oversee") ],
  undershirt:[ bm("It is cold today, so Dad wears a ______ beneath his shirt.",["UNDERSHIRT","UNDERCOVER","UNDERWATER"],"UNDERSHIRT"),
               bw("I wear a white ______ beneath my school shirt.","undershirt") ],
  overlook:[ bm("It is easy to ______ a tiny word when you read too fast.",["OVERLOOK","OVERUSE","OVERHEAT"],"OVERLOOK"),
             bw("If you read too fast, you may ______ a small mistake.","overlook") ],
  overcook:[ bm("If you leave the pizza in the oven for two hours, you will ______ it.",["OVERCOOK","UNDERCOOK","OVERLOOK"],"OVERCOOK"),
             bw("Don't ______ the eggs or they will get hard and dry.","overcook") ],
  prefix:[ bm("In OVERWORK and OVEREAT, what does OVER- usually mean?",["too much","not enough"],"too much"),
           bm("Which prefix can mean “below” or “not enough”, like in UNDERWATER or UNDERCOOKED?",["UNDER-","OVER-"],"UNDER-") ]
};

/* ---------------------------------------------------------------- TRADUCCIONES */
/* «Ver en español»: traducción de cada pregunta del tema OVER-/UNDER-. */
var TR_OFFICIAL = {
  1:"No debes ______ tus ojos viendo demasiada televisión.", 2:"La computadora puede ______ si se pone demasiado caliente.",
  3:"Un submarino viaja ______.", 4:"La bañera va a ______ si dejas el agua corriendo.",
  5:"No debemos ______ cuánta comida necesitamos.", 6:"Las galletas necesitan más tiempo en el horno porque no están completamente cocidas.",
  7:"El policía usó ropa común para esconder su identidad.", 8:"La maestra le pidió a la asistente que vigilara y supervisara la clase.",
  9:"Él usó una camiseta debajo de su uniforme escolar.", 10:"No notaste un pequeño error en tu tarea.",
  11:"El lavamanos va a ______ si dejas el grifo abierto.", 12:"Un submarino viaja ______ para estudiar la vida marina.",
  13:"La laptop puede ______ si tapas las salidas de aire.", 14:"El policía trabajó ______ durante la investigación.",
  15:"La maestra le pidió a la asistente que ______ la clase.",
  21:"¿Qué palabra significa «calentarse demasiado»?", 22:"¿Qué palabra significa «cocinar algo demasiado»?",
  23:"¿Qué prefijo suele significar «demasiado» o «en exceso»?", 24:"¿Qué palabra significa «debajo de la superficie del agua»?",
  25:"Piensas que necesitas 20 sándwiches para una fiesta, pero solo necesitas 10. ¿Qué palabra describe tu error?"
};
var TR_BANK = {
  overuse:["Mia juega videojuegos todo el día. Ella no debería ______ los.", "Si ______ el pegamento, tu papel se mojará demasiado."],
  overheat:["El motor del carro está muy, muy caliente. Podría ______.", "No dejes tu teléfono al sol. Puede ______."],
  underwater:["Los peces, las tortugas y los tiburones viven ______.", "Los buzos nadaron ______ para ver el coral."],
  overflow:["Si echas mucho jugo en un vaso pequeño, se va a ______.", "El río va a ______ después de la gran tormenta."],
  overestimate:["Ana necesita solo 20 calcomanías, pero pide 100. ¿Qué palabra describe su error?", "Si dices que un perro pequeño pesa 50 kilos, ______ su peso."],
  undercooked:["El pollo todavía está rosado por dentro. Está ______.", "La pasta está dura porque está ______."],
  undercover:["Una detective se viste de mesera para vigilar en secreto a un ladrón. Ella trabaja ______.", "La espía fue ______ a la fiesta, así que nadie sabía quién era."],
  oversee:["El entrenador va a ______ el juego para asegurarse de que todos jueguen limpio.", "El director va a ______ la feria escolar."],
  undershirt:["Hoy hace frío, así que papá usa una ______ debajo de su camisa.", "Uso una ______ blanca debajo de mi camisa del colegio."],
  overlook:["Es fácil ______ una palabrita cuando lees muy rápido.", "Si lees muy rápido, puedes ______ un error pequeño."],
  overcook:["Si dejas la pizza dos horas en el horno, la vas a ______.", "No ______ los huevos o quedarán duros y secos."],
  prefix:["En OVERWORK y OVEREAT, ¿qué significa OVER- normalmente?", "¿Qué prefijo puede significar «debajo» o «no suficiente», como en UNDERWATER o UNDERCOOKED?"]
};
var CONCEPT_EMO = {overuse:"📺", overheat:"🔥", underwater:"🌊", overflow:"🛁", overestimate:"🍕", undercooked:"🍪", undercover:"🕵️", oversee:"👀", undershirt:"👕", overlook:"🙈", overcook:"🍳"};

/* ---------------------------------------------------------------- TEMA INCLUIDO */
/* El examen de OVER-/UNDER- escrito en el mismo formato que los temas importados. */
var _builtin = null;
function builtinTemas(){
  if(_builtin) return _builtin;
  var P = [], ids = [], ms = EXAM.filter(function(x){ return x.type === "match"; });
  EXAM.forEach(function(q){
    if(q.type === "match") return;
    var o = {id:q.id, subtema:q.concept, pregunta_en:q.prompt, pregunta_es:TR_OFFICIAL[q.n] || "", explicacion_es:q.exp,
      ejemplo_en:C[q.concept].ex, ejemplo_es:C[q.concept].exEs, base_word:q.base || "", seccion:SECTIONS[q.sec].name, instruccion_es:SECTIONS[q.sec].es, peso:1};
    if(q.type === "mc"){ o.tipo = "opcion_multiple"; o.opciones = q.opts.slice(); o.correcta = q.ans; }
    else { o.tipo = "completar"; o.respuesta = q.ans; o.aceptadas = []; }
    P.push(o); ids.push(o.id);
    if(q.n === 15){
      P.push({id:"q16", subtema:"vocabulario", tipo:"unir", pregunta_en:"Match each word with its meaning.", pregunta_es:"Une cada palabra con su significado.",
        explicacion_es:ms.map(function(m){ return m.exp; }).join(" "), ejemplo_en:"", ejemplo_es:"", peso:5, seccion:SECTIONS[4].name, instruccion_es:SECTIONS[4].es,
        pares:ms.map(function(m){ return {izquierda:m.word, derecha:MEANINGS[m.ans]}; })});
      ids.push("q16");
    }
  });
  Object.keys(BANK).forEach(function(c){
    BANK[c].forEach(function(v, k){
      var o = {id:"b-" + c + "-" + (k + 1), subtema:c, pregunta_en:v.prompt, pregunta_es:(TR_BANK[c] || [])[k] || "", explicacion_es:C[c].exp,
        ejemplo_en:C[c].ex, ejemplo_es:C[c].exEs, base_word:v.base || "", peso:1};
      if(v.type === "mc"){ o.tipo = "opcion_multiple"; o.opciones = v.opts.slice(); o.correcta = v.ans; }
      else { o.tipo = "completar"; o.respuesta = v.ans; o.aceptadas = []; o.pista_es = "Significa «" + C[c].es + "»."; }
      P.push(o);
    });
  });
  var keys = Object.keys(C).filter(function(k){ return k !== "prefix"; });
  var resumen = keys.map(function(k){ return {en:C[k].word + " = " + C[k].parts, es:C[k].es, emoji:CONCEPT_EMO[k] || "📌"}; });
  resumen.unshift({en:"UNDER- = below / not enough", es:"UNDER- = debajo o «no suficiente»", emoji:"⬇️"}, {en:"OVER- = too much", es:"OVER- = demasiado", emoji:"⬆️"});
  _builtin = [{id:"overunder", builtin:true, materia:"English", titulo:"Prefixes OVER- and UNDER-", titulo_es:"Prefijos OVER- y UNDER-", fecha_examen:"",
    resumen:resumen, subtemas:keys.concat(["vocabulario", "prefix"]), preguntas:P, preguntas_por_ronda:10, examen_oficial:ids,
    vocabulario:keys.map(function(k){ var c = C[k], es = CORTA[k] || c.es; return {en:c.word, es:es, aceptadas:[es, c.es], ejemplo_en:c.ex, ejemplo_es:c.exEs}; })}];
  return _builtin;
}

/* ---------------------------------------------------------------- PALABRAS GENERALES */
/* Para los juegos «generales» (no dependen de los temas de la escuela). */
var GENERAL = (function(){
  var raw = [
    ["animals","Animales","🐾","dog perro|cat gato|bird pájaro|fish pez|horse caballo|cow vaca|pig cerdo|rabbit conejo|lion león|monkey mono|elephant elefante|duck pato"],
    ["colors","Colores","🎨","red rojo|blue azul|green verde|yellow amarillo|black negro|white blanco|pink rosado|orange anaranjado|purple morado|brown marrón|gray gris|gold dorado"],
    ["food","Comida","🍎","apple manzana|banana banano|bread pan|milk leche|water agua|egg huevo|rice arroz|cheese queso|chicken pollo|juice jugo|cake pastel|soup sopa"],
    ["family","Familia","👨‍👩‍👧","mother madre|father padre|sister hermana|brother hermano|grandmother abuela|grandfather abuelo|baby bebé|friend amigo|aunt tía|uncle tío|son hijo|daughter hija"],
    ["school","Escuela","🎒","book libro|pencil lápiz|teacher maestro|student estudiante|desk escritorio|chair silla|notebook cuaderno|eraser borrador|ruler regla|backpack mochila|board pizarra|classroom salón"],
    ["body","El cuerpo","🖐️","head cabeza|hand mano|foot pie|eye ojo|ear oreja|nose nariz|mouth boca|arm brazo|leg pierna|hair cabello|finger dedo|tooth diente"],
    ["numbers","Números","🔢","one uno|two dos|three tres|four cuatro|five cinco|six seis|seven siete|eight ocho|nine nueve|ten diez|twenty veinte|hundred cien"],
    ["actions","Acciones","🏃","run correr|jump saltar|eat comer|drink beber|sleep dormir|read leer|write escribir|walk caminar|play jugar|sing cantar|draw dibujar|swim nadar"],
    ["nature","Naturaleza","🌦️","sun sol|rain lluvia|tree árbol|flower flor|moon luna|star estrella|sky cielo|wind viento|snow nieve|sea mar|mountain montaña|cloud nube"],
    ["home","La casa","🏠","house casa|door puerta|window ventana|bed cama|table mesa|kitchen cocina|bathroom baño|room cuarto|floor piso|wall pared|key llave|light luz"]
  ];
  return raw.map(function(r){
    return {id:"gen-" + r[0], title:r[1], emo:r[2], materia:"General", general:true, words:r[3].split("|").map(function(p){
      var i = p.indexOf(" "); var en = p.slice(0, i), es = p.slice(i + 1);
      return {en:en, es:es, aceptadas:[es]};
    })};
  });
})();
