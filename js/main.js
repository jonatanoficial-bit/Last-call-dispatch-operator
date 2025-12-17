(()=>{"use strict";

/* =========================
   CONFIG FIXA (GitHub Pages)
   ========================= */
const REPO_BASE = "/Last-call-dispatch-operator";
const APP_VERSION = "lc_dispatch_v1_2_more_cases";
const LS_STATE = APP_VERSION + "_state";
const LS_RANK  = APP_VERSION + "_rank";

/* =========================
   HELPERS
   ========================= */
const $ = (s,r=document)=>r.querySelector(s);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const now = ()=>Date.now();
const pad2 = (n)=>String(n).padStart(2,"0");
const fmtTime = (sec)=>{sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return `${pad2(m)}:${pad2(s)}`;};
const safeJson = (s,f)=>{try{return JSON.parse(s);}catch{return f;}};
const pick = (a)=>a[Math.floor(Math.random()*a.length)];
const rand = (min,max)=>min+Math.floor(Math.random()*(max-min+1));
const chance = (p)=>Math.random()<p;

/* =========================
   DATA (DEMO REALISTA)
   ========================= */
const INCIDENT_TYPES_POLICE=[
  "Agressão / Briga",
  "Roubo / Assalto em andamento",
  "Furto",
  "Violência doméstica",
  "Pessoa desaparecida",
  "Pessoa armada / ameaça",
  "Perturbação do sossego",
  "Acidente de trânsito (apoio)",
  "Ameaça / perseguição",
  "Invasão / arrombamento",
  "Vandalismo / dano ao patrimônio",
  "Transtorno mental com risco"
];
const INCIDENT_TYPES_FIRE=[
  "Incêndio residencial",
  "Incêndio veicular",
  "Resgate (altura / difícil acesso)",
  "Atendimento pré-hospitalar (APH)",
  "Vazamento de gás / risco químico",
  "Alagamento / enchente",
  "Acidente de trânsito (resgate)",
  "Árvore caída / risco de queda",
  "Explosão / princípio de explosão",
  "Desmaio / inconsciente",
  "Pessoa presa em elevador"
];

const UNITS_POLICE=[
  "Viatura Rádio Patrulha",
  "Força Tática",
  "ROTA (apoio tático)",
  "Policiamento comunitário",
  "Trânsito (apoio)"
];
const UNITS_FIRE=[
  "Auto Bomba (AB)",
  "Auto Tanque (AT)",
  "Unidade de Resgate (UR)",
  "Ambulância (APH)",
  "Defesa Civil (apoio)"
];

const CITY_SEEDS={
  "São Paulo":["SP","Zona Norte","Zona Sul","Centro","Leste","Oeste"],
  "Rio de Janeiro":["RJ","Zona Norte","Zona Sul","Centro","Barra","Niterói"],
  "Belo Horizonte":["MG","Centro","Pampulha","Barreiro","Venda Nova"],
  "New York":["NY","Manhattan","Brooklyn","Queens","Bronx"],
  "Washington":["DC","Downtown","Georgetown","Capitol Hill","Navy Yard"],
  "London":["UK","Camden","Westminster","Southwark","Hackney"],
  "Paris":["FR","15e","18e","3e","11e"],
  "Berlin":["DE","Mitte","Kreuzberg","Prenzlauer Berg","Neukölln"],
  "Seoul":["KR","Gangnam","Jongno","Mapo","Songpa"],
  "Beijing":["CN","Chaoyang","Haidian","Dongcheng","Xicheng"],
  "Buenos Aires":["AR","Palermo","Recoleta","Caballito","Belgrano"]
};

function genAddress(city){
  const seed=CITY_SEEDS[city]||["Centro"];
  const area=pick(seed);
  const n=10+Math.floor(Math.random()*890);
  const streets=[
    "Rua das Flores","Avenida Central","Rua São Jorge","Rua do Comércio",
    "Avenida da Liberdade","Rua Nova","Rua do Porto","Avenida Brasil",
    "Rua Vitória","Avenida Norte","Rua Paulista","Rua do Mercado",
    "Avenida da República","Rua do Sol","Rua das Acácias"
  ];
  return `${pick(streets)}, ${n} - ${area}`;
}

function flavorByCity(city){
  const f={
    "São Paulo":["muito barulho de trânsito ao fundo","sirene distante","vozes de vizinhos no corredor"],
    "Rio de Janeiro":["música alta ao fundo","vizinhos gritando na rua","som de moto acelerando"],
    "Belo Horizonte":["cachorro latindo ao fundo","pessoas na varanda falando alto","porta batendo"],
    "New York":["honking e sirenes ao fundo","subway passando ao longe","ruído de rua intensa"],
    "Washington":["sirene distante","ruído urbano moderado","passos e eco no corredor"],
    "London":["tráfego constante","voz em inglês ao fundo","alarme de loja ao longe"],
    "Paris":["buzinas e vozes","porta de prédio rangendo","eco em escadaria"],
    "Berlin":["ruído de rua","bicicleta passando","alarme distante"],
    "Seoul":["notificação de celular repetindo","ruído de rua","voz no corredor"],
    "Beijing":["ruído de rua","buzinas","porta metálica fechando"],
    "Buenos Aires":["música ao fundo","vozes na rua","cachorro latindo"]
  };
  return pick(f[city]||["ruído de fundo"]);
}

/* =========================
   BACKGROUND DINÂMICO (JOGO)
   ========================= */
function setRoomBackgroundAbsolute(imageFile){
  let st = document.getElementById("dynamicRoomStyle");
  if(!st){st=document.createElement("style");st.id="dynamicRoomStyle";document.head.appendChild(st);}
  const url = `${REPO_BASE}/Imagen/${imageFile}`;
  st.textContent = `.page-game::before{background-image:url("${url}") !important;}`;
}

/* =========================
   STATE
   ========================= */
function defaultState(){
  return {
    service:"police",
    city:"São Paulo",
    difficulty:"normal",
    shiftMinutes:10,
    shiftEndsAt: now() + 10*60*1000,
    score:0,
    errors:0,
    stress:0,

    callIndex:0,
    callEndsAt:0,
    callSecondsLimit:90,

    scenarios:[],
    current:null,

    revealed:{},
    asked:{},
    summary:null,
    lastDispatch:null,
    _timePenaltyApplied:false
  };
}
function loadState(){
  const s = safeJson(localStorage.getItem(LS_STATE), null);
  if(!s || !s.service || !s.city) return defaultState();
  return s;
}
function saveState(st){ localStorage.setItem(LS_STATE, JSON.stringify(st)); }
function clearState(){ localStorage.removeItem(LS_STATE); }

/* =========================
   RANKING
   ========================= */
function loadRank(){ return safeJson(localStorage.getItem(LS_RANK), []); }
function saveRank(r){ localStorage.setItem(LS_RANK, JSON.stringify(r)); }
function pushRank(entry){
  const r = loadRank();
  r.push(entry);
  r.sort((a,b)=>b.score-a.score);
  saveRank(r.slice(0,10));
}

/* =========================
   SCORING
   ========================= */
function applyPenalty(st, reason, points){
  st.errors += 1;
  st.score = Math.max(0, st.score - points);
  st.stress = clamp(st.stress + Math.round(points/2), 0, 100);
  st.summary = `Penalidade: -${points} (${reason})`;
}
function applyReward(st, reason, points){
  st.score += points;
  st.stress = clamp(st.stress - Math.round(points/3), 0, 100);
  st.summary = `Bônus: +${points} (${reason})`;
}

/* =========================
   TYPEWRITER
   ========================= */
function addLine(transcriptEl, role, msg, opt={}){
  const line = document.createElement("div");
  line.className = "line";
  line.innerHTML = `<div class="role">${role}</div><div class="msg"></div>`;
  transcriptEl.appendChild(line);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;

  const msgEl = line.querySelector(".msg");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  msgEl.appendChild(cursor);

  const speed = opt.speed ?? 18;
  const text = String(msg);
  let i = 0;

  return new Promise((res)=>{
    const tick = ()=>{
      if(i < text.length){
        cursor.insertAdjacentText("beforebegin", text[i]);
        i++;
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
        setTimeout(tick, speed);
        return;
      }
      cursor.remove();
      res();
    };
    setTimeout(tick, opt.delay ?? 60);
  });
}

/* =========================
   SCENARIOS (MUITO MAIS VARIADOS)
   ========================= */
function mkPoliceScenario(city, preset){
  const addr = genAddress(city);
  const noise = flavorByCity(city);

  const commonAsk = {
    "Perguntar endereço": `É na ${addr}.`,
    "Perguntar se há feridos": pick([
      "Tem uma pessoa com sangramento leve.",
      "Acho que alguém caiu… tá reclamando de dor.",
      "Não vi sangue, mas tem gente chorando.",
      "Ainda não sei, tá confuso aqui."
    ]),
    "Perguntar se há arma": pick([
      "Não vi arma, mas ele colocou a mão na cintura.",
      "Eu vi algo metálico… pode ser faca.",
      "Não tenho certeza, tô com medo de olhar.",
      "Acho que não, mas ele tá ameaçando."
    ]),
    "Perguntar descrição": pick([
      "É um homem de moletom escuro, boné, sozinho.",
      "É uma mulher alterada, gritando com todo mundo.",
      "São dois, um tá filmando e o outro provoca.",
      "Parece alguém conhecido da região."
    ]),
    "Orientar segurança": pick([
      "Ok, vou me afastar e ficar em local seguro.",
      "Vou trancar a porta e esperar em silêncio.",
      "Vou manter distância e não confrontar.",
      "Vou chamar alguém para ficar comigo aqui."
    ]),
    "Orientar não confrontar": pick([
      "Tá bom, não vou discutir com ele.",
      "Ok, eu não vou me aproximar.",
      "Certo, vou só observar de longe.",
      "Entendido, vou aguardar em segurança."
    ]),
    "Perguntar placa/veículo": pick([
      "É um carro prata, acho que é hatch. Não vi a placa inteira.",
      "Tem uma moto preta sem placa visível.",
      "Vi um carro branco saindo rápido, placa começou com 'B'.",
      "Não consigo ver a placa daqui."
    ]),
    "Perguntar se ainda está no local": pick([
      "Sim, ainda tá aqui agora.",
      "Tá saindo, mas ainda dá pra ver.",
      "Já saiu, mas pode estar por perto.",
      "Voltou de novo, tá rodando a rua."
    ])
  };

  const presets = {
    dom: {
      opening: `(voz baixa e tremendo) Ele tá alterado dentro de casa… eu tô com medo. (${noise})`,
      facts: { risk:"Possível violência doméstica", weapon:"Não confirmado", injuries:"Desconhecido" },
      correct: { type:"Violência doméstica", priority:"P1", unit:"Viatura Rádio Patrulha", required:["Perguntar endereço","Perguntar se há feridos","Orientar segurança"] },
      extraAsk: { "Perguntar relação com agressor": "É meu companheiro… ele tá fora de si.", "Perguntar crianças no local":"Tem uma criança aqui comigo." }
    },
    robbery: {
      opening: `Tem alguém tentando arrombar a porta da loja! Eu ouvi barulho de metal e vidro! (${noise})`,
      facts: { risk:"Crime em andamento", weapon:"Não confirmado", injuries:"Nenhum" },
      correct: { type:"Roubo / Assalto em andamento", priority:"P1", unit:"Força Tática", required:["Perguntar endereço","Perguntar descrição","Perguntar se ainda está no local"] },
      extraAsk: { "Perguntar fuga":"Se ele correr, acho que vai pela avenida principal." }
    },
    armed: {
      opening: `Eu vi um homem mostrando algo que parece arma na rua… ele tá ameaçando as pessoas. (${noise})`,
      facts: { risk:"Ameaça com possível arma", weapon:"Possível", injuries:"Desconhecido" },
      correct: { type:"Pessoa armada / ameaça", priority:"P1", unit:"ROTA (apoio tático)", required:["Perguntar endereço","Perguntar descrição","Perguntar se há arma"] },
      extraAsk: { "Orientar manter distância":"Ok, vou sair daqui e não chamar atenção." }
    },
    noise: {
      opening: `Tem uma festa e som altíssimo faz horas, já deu briga aqui no prédio. (${noise})`,
      facts: { risk:"Perturbação com potencial conflito", weapon:"Não confirmado", injuries:"Não confirmado" },
      correct: { type:"Perturbação do sossego", priority:"P3", unit:"Policiamento comunitário", required:["Perguntar endereço","Perguntar se há feridos"] },
      extraAsk: { "Perguntar se há ameaças":"Teve ameaça, mas agora tá mais calmo." }
    },
    missing: {
      opening: `Meu filho sumiu faz algumas horas… eu não sei o que fazer. (${noise})`,
      facts: { risk:"Pessoa desaparecida", weapon:"N/A", injuries:"Desconhecido" },
      correct: { type:"Pessoa desaparecida", priority:"P2", unit:"Viatura Rádio Patrulha", required:["Perguntar endereço","Perguntar descrição"] },
      extraAsk: { "Perguntar roupa":"Ele tava com camiseta azul e tênis branco.", "Perguntar último local":"A última vez foi perto do mercado." }
    },
    crashSupport: {
      opening: `Teve uma batida e os motoristas estão brigando no meio da rua! (${noise})`,
      facts: { risk:"Conflito após acidente", weapon:"Não confirmado", injuries:"Possível" },
      correct: { type:"Acidente de trânsito (apoio)", priority:"P2", unit:"Trânsito (apoio)", required:["Perguntar endereço","Perguntar se há feridos","Orientar não confrontar"] },
      extraAsk: { "Perguntar placa/veículo": commonAsk["Perguntar placa/veículo"] }
    },
    stalking: {
      opening: `Tem um cara me seguindo… eu tô na rua e ele não para. (${noise})`,
      facts: { risk:"Ameaça / perseguição", weapon:"Desconhecido", injuries:"Nenhum" },
      correct: { type:"Ameaça / perseguição", priority:"P1", unit:"Viatura Rádio Patrulha", required:["Perguntar endereço","Perguntar descrição","Orientar segurança"] },
      extraAsk: { "Orientar procurar local público":"Ok, vou entrar numa loja movimentada." }
    },
    forcedEntry: {
      opening: `Tão tentando forçar o portão do prédio agora! Dá pra ouvir o ferro batendo! (${noise})`,
      facts: { risk:"Invasão / arrombamento", weapon:"Não confirmado", injuries:"Nenhum" },
      correct: { type:"Invasão / arrombamento", priority:"P1", unit:"Força Tática", required:["Perguntar endereço","Perguntar descrição","Perguntar se ainda está no local"] },
      extraAsk: { "Orientar não confrontar": commonAsk["Orientar não confrontar"] }
    },
    vandal: {
      opening: `Tem gente quebrando carros estacionados, chutando retrovisor e riscando tudo! (${noise})`,
      facts: { risk:"Vandalismo em andamento", weapon:"Não confirmado", injuries:"Nenhum" },
      correct: { type:"Vandalismo / dano ao patrimônio", priority:"P2", unit:"Viatura Rádio Patrulha", required:["Perguntar endereço","Perguntar descrição","Perguntar se ainda está no local"] },
      extraAsk: { "Perguntar quantos suspeitos":"São dois ou três… difícil contar daqui." }
    },
    mental: {
      opening: `Tem uma pessoa falando coisas sem sentido e querendo pular… eu tô assustado. (${noise})`,
      facts: { risk:"Transtorno mental com risco", weapon:"N/A", injuries:"Risco elevado" },
      correct: { type:"Transtorno mental com risco", priority:"P1", unit:"Viatura Rádio Patrulha", required:["Perguntar endereço","Orientar segurança","Perguntar se há feridos"] },
      extraAsk: { "Orientar manter contato visual à distância":"Ok, vou falar com calma sem chegar perto." }
    }
  };

  const p = presets[preset] || presets.dom;

  const ask = {
    ...commonAsk,
    ...(p.extraAsk||{})
  };

  return {
    service:"police",
    opening: p.opening,
    facts: { location: addr, ...p.facts },
    ask,
    correct: p.correct
  };
}

function mkFireScenario(city, preset){
  const addr = genAddress(city);
  const noise = flavorByCity(city);

  const commonAsk = {
    "Perguntar endereço": `É na ${addr}.`,
    "Perguntar se há chamas": pick([
      "Tem chama pequena, mas tá aumentando rápido.",
      "Ainda não vi chama, só muita fumaça saindo.",
      "Tem labareda na janela!",
      "Tá pegando no sofá, fogo visível."
    ]),
    "Perguntar pessoas presas": pick([
      "Acho que tem gente lá dentro sim!",
      "Ninguém respondeu… pode ter alguém.",
      "Tem um idoso que mora ali.",
      "Vi uma criança pela janela."
    ]),
    "Orientar evacuar": pick([
      "Ok, vou descer pela escada e avisar os vizinhos.",
      "Certo, vou sair do prédio e ir para área aberta.",
      "Entendido, todo mundo vai para fora agora.",
      "Vou evacuar e não vou usar elevador."
    ]),
    "Orientar afastar e ventilar": pick([
      "Ok, vou abrir tudo e sair de perto.",
      "Certo, vou cortar a energia e sair do local.",
      "Vou afastar as pessoas e não acender nada.",
      "Entendido, vou para fora imediatamente."
    ]),
    "Perguntar feridos": pick([
      "Tem alguém com falta de ar por fumaça.",
      "Uma pessoa caiu e não responde direito.",
      "Tem gente tossindo muito.",
      "Ainda não sei, tá todo mundo em pânico."
    ]),
    "Perguntar risco elétrico": pick([
      "Tem faísca perto do quadro de luz.",
      "Não, parece só fumaça do cômodo.",
      "Sim, o disjuntor tá estalando.",
      "Não sei, mas tem cheiro de fio queimado."
    ])
  };

  const presets = {
    aptFire: {
      opening: `Tá saindo muita fumaça do apartamento do vizinho e o corredor tá tomado! (${noise})`,
      facts: { risk:"Incêndio potencial em edifício", injuries:"Desconhecido" },
      correct: { type:"Incêndio residencial", priority:"P1", unit:"Auto Bomba (AB)", required:["Perguntar endereço","Perguntar pessoas presas","Orientar evacuar"] },
      extraAsk: { "Perguntar se há chamas": commonAsk["Perguntar se há chamas"], "Perguntar risco elétrico": commonAsk["Perguntar risco elétrico"] }
    },
    gasLeak: {
      opening: `Tá com cheiro forte de gás e tem gente passando mal aqui! (${noise})`,
      facts: { risk:"Vazamento de gás / intoxicação", injuries:"Possível" },
      correct: { type:"Vazamento de gás / risco químico", priority:"P1", unit:"Unidade de Resgate (UR)", required:["Perguntar endereço","Orientar afastar e ventilar","Perguntar feridos"] },
      extraAsk: { "Orientar não usar fogo":"Ok, ninguém vai acender nada." }
    },
    carFire: {
      opening: `Um carro tá pegando fogo na rua agora, tá saindo fumaça preta! (${noise})`,
      facts: { risk:"Incêndio veicular", injuries:"Desconhecido" },
      correct: { type:"Incêndio veicular", priority:"P1", unit:"Auto Bomba (AB)", required:["Perguntar endereço","Perguntar se há chamas"] },
      extraAsk: { "Perguntar se tem combustível vazando":"Parece que tá vazando algo no chão." }
    },
    crashRescue: {
      opening: `Acidente grave, tem gente presa nas ferragens! (${noise})`,
      facts: { risk:"Resgate veicular", injuries:"Provável" },
      correct: { type:"Acidente de trânsito (resgate)", priority:"P1", unit:"Unidade de Resgate (UR)", required:["Perguntar endereço","Perguntar feridos","Perguntar pessoas presas"] },
      extraAsk: { "Orientar não mover vítima":"Ok, não vou mexer na pessoa presa." }
    },
    fainting: {
      opening: `Uma pessoa desmaiou e não responde direito! (${noise})`,
      facts: { risk:"Inconsciente", injuries:"Possível grave" },
      correct: { type:"Desmaio / inconsciente", priority:"P1", unit:"Ambulância (APH)", required:["Perguntar endereço","Perguntar feridos"] },
      extraAsk: { "Orientar checar respiração":"Ok, vou ver se tá respirando." }
    },
    elevator: {
      opening: `Tem gente presa no elevador, tá muito quente e eles tão em pânico! (${noise})`,
      facts: { risk:"Confinamento", injuries:"Possível" },
      correct: { type:"Pessoa presa em elevador", priority:"P2", unit:"Unidade de Resgate (UR)", required:["Perguntar endereço","Perguntar feridos"] },
      extraAsk: { "Orientar manter calma":"Ok, vou falar pra eles respirarem e aguardarem." }
    },
    flood: {
      opening: `A rua alagou, a água tá entrando nas casas e tem gente ilhada! (${noise})`,
      facts: { risk:"Alagamento", injuries:"Desconhecido" },
      correct: { type:"Alagamento / enchente", priority:"P1", unit:"Defesa Civil (apoio)", required:["Perguntar endereço","Perguntar pessoas presas","Orientar evacuar"] },
      extraAsk: { "Perguntar nível da água":"Tá na altura do joelho e subindo rápido!" }
    },
    tree: {
      opening: `Uma árvore tá caindo e encostando nos fios, tá perigoso demais! (${noise})`,
      facts: { risk:"Risco elétrico e queda", injuries:"Nenhum" },
      correct: { type:"Árvore caída / risco de queda", priority:"P2", unit:"Defesa Civil (apoio)", required:["Perguntar endereço","Orientar afastar e ventilar"] },
      extraAsk: { "Orientar isolar área":"Ok, vou manter todo mundo longe." }
    },
    explosion: {
      opening: `Teve um estouro, cheiro forte e fumaça… pode explodir de novo! (${noise})`,
      facts: { risk:"Explosão / risco repetição", injuries:"Possível" },
      correct: { type:"Explosão / princípio de explosão", priority:"P1", unit:"Auto Bomba (AB)", required:["Perguntar endereço","Perguntar feridos","Orientar evacuar"] },
      extraAsk: { "Perguntar chamas":"Tem chama pequena e muita fumaça." }
    },
    heightRescue: {
      opening: `Tem alguém pendurado em altura… parece que vai cair! (${noise})`,
      facts: { risk:"Queda iminente", injuries:"Risco elevado" },
      correct: { type:"Resgate (altura / difícil acesso)", priority:"P1", unit:"Unidade de Resgate (UR)", required:["Perguntar endereço","Orientar evacuar"] },
      extraAsk: { "Orientar não se aproximar":"Ok, vou manter distância e não puxar a pessoa." }
    }
  };

  const p = presets[preset] || presets.aptFire;
  const ask = { ...commonAsk, ...(p.extraAsk||{}) };

  return {
    service:"fire",
    opening: p.opening,
    facts: { location: addr, ...p.facts },
    ask,
    correct: p.correct
  };
}

function buildScenarioPack(service, city){
  // presets amplos e diferentes para reduzir repetição
  const policePresets = ["dom","robbery","armed","noise","missing","crashSupport","stalking","forcedEntry","vandal","mental"];
  const firePresets   = ["aptFire","gasLeak","carFire","crashRescue","fainting","elevator","flood","tree","explosion","heightRescue"];

  const pool = [];
  if(service==="police"){
    for(const p of policePresets) pool.push(mkPoliceScenario(city,p));
  }else{
    for(const p of firePresets) pool.push(mkFireScenario(city,p));
  }

  // embaralha e seleciona quantidade por turno (pode crescer com dificuldade)
  const desired = 8; // MAIS casos no demo, sem ficar longo demais
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool.slice(0, desired);
}

/* =========================
   RENDER
   ========================= */
function renderHUD(st){
  $("#hudService").textContent = st.service==="police" ? "POLÍCIA" : "BOMBEIROS";
  $("#hudCity").textContent = st.city;
  $("#hudShift").textContent = `Turno: ${st.shiftMinutes} min • Dif.: ${st.difficulty}`;
  $("#hudScore").textContent = String(st.score);
  $("#hudErrors").textContent = String(st.errors);
  $("#hudStress").textContent = String(Math.round(st.stress));
  const left = Math.max(0, Math.floor((st.shiftEndsAt - now())/1000));
  $("#hudTime").textContent = fmtTime(left);
}
function renderFacts(st){
  const el = $("#facts");
  el.innerHTML = "";

  const pills = [];
  pills.push(st.revealed.location ? {t:"📍 Endereço coletado", c:"good"} : {t:"📍 Endereço pendente", c:"warn"});
  pills.push(st.revealed.injuries ? {t:"🩹 Feridos: "+st.revealed.injuries, c:"good"} : {t:"🩹 Feridos: não confirmado", c:"warn"});

  if(st.service==="police"){
    pills.push(st.revealed.weapon ? {t:"🔪 Arma: "+st.revealed.weapon, c:"warn"} : {t:"🔪 Arma: não confirmado", c:"warn"});
  }
  if(st.revealed.risk){
    pills.push({t:"⚠️ Risco: "+st.revealed.risk, c:"warn"});
  }

  for(const p of pills){
    const d = document.createElement("div");
    d.className = "pill " + (p.c||"");
    d.textContent = p.t;
    el.appendChild(d);
  }
}
function renderChecklist(st){
  const el = $("#checklist");
  el.innerHTML = "";

  const req = st.current?.correct?.required || [];
  const items = [
    {key:"address", label:"Coletar endereço com confirmação"},
    {key:"type", label:"Classificar tipo corretamente"},
    {key:"priority", label:"Definir prioridade adequada"},
    {key:"unit", label:"Selecionar unidade coerente"},
    ...req.map(k=>({key:k, label:`Pergunta essencial: ${k}`}))
  ];

  for(const it of items){
    const on =
      (it.key==="address" && !!st.revealed.location) ||
      (it.key==="type" && !!st.lastDispatch?.type) ||
      (it.key==="priority" && !!st.lastDispatch?.priority) ||
      (it.key==="unit" && !!st.lastDispatch?.unit) ||
      !!st.asked[it.key];

    const row = document.createElement("div");
    row.className = "check-item";
    row.innerHTML = `<div class="check-dot ${on?"on":""}"></div><div class="check-text">${it.label}</div>`;
    el.appendChild(row);
  }
}
function renderSummary(st){
  const el = $("#summary");
  const parts = [];
  if(st.summary) parts.push(st.summary);
  if(st.lastDispatch){
    parts.push(`Despacho: ${st.lastDispatch.type} • ${st.lastDispatch.priority} • ${st.lastDispatch.unit}`);
    parts.push(`Endereço: ${st.lastDispatch.address || "—"}`);
  }else{
    parts.push("Nenhum despacho confirmado ainda.");
  }
  el.textContent = parts.join("\n");
}
function setCallTimer(st){
  const left = Math.max(0, Math.floor((st.callEndsAt - now())/1000));
  $("#callTime").textContent = fmtTime(left);
}

/* =========================
   ACTIONS
   ========================= */
function renderActions(st){
  const el = $("#actions");
  el.innerHTML = "";

  const btn = (label, cls, fn)=>{
    const b = document.createElement("button");
    b.className = "action-btn " + (cls||"");
    b.textContent = label;
    b.addEventListener("click", fn);
    el.appendChild(b);
    return b;
  };

  btn("Perguntar endereço","",()=>onAsk(st,"Perguntar endereço"));
  btn("Perguntar feridos","",()=>onAsk(st,"Perguntar se há feridos"));

  if(st.service==="police"){
    btn("Perguntar arma","",()=>onAsk(st,"Perguntar se há arma"));
    btn("Perguntar descrição","",()=>onAsk(st,"Perguntar descrição"));
    btn("Perguntar se ainda está no local","",()=>onAsk(st,"Perguntar se ainda está no local"));
    btn("Orientar segurança","",()=>onAsk(st,"Orientar segurança"));
    btn("Orientar não confrontar","",()=>onAsk(st,"Orientar não confrontar"));
    btn("Perguntar placa/veículo","",()=>onAsk(st,"Perguntar placa/veículo"));
  }else{
    btn("Perguntar chamas","",()=>onAsk(st,"Perguntar se há chamas"));
    btn("Perguntar pessoas presas","",()=>onAsk(st,"Perguntar pessoas presas"));
    btn("Perguntar feridos (APH)","",()=>onAsk(st,"Perguntar feridos"));
    btn("Perguntar risco elétrico","",()=>onAsk(st,"Perguntar risco elétrico"));
    btn("Orientar evacuar","",()=>onAsk(st,"Orientar evacuar"));
    btn("Orientar afastar/ventilar","",()=>onAsk(st,"Orientar afastar e ventilar"));
  }

  btn("Despachar recursos","primary",()=>openDispatchModal(st));
  btn("Encerrar ligação","danger",()=>finishCall(st));
}

async function onAsk(st, key){
  const tr = $("#transcript");

  if(st.asked[key]){
    await addLine(tr, "Sistema", "Você já fez essa pergunta.", {speed:14});
    return;
  }

  const cost = rand(5,9);
  st.callEndsAt -= cost*1000;
  st.shiftEndsAt -= Math.floor(cost/2)*1000;
  st.asked[key] = true;

  await addLine(tr, "Operador", key + "…", {speed:14});
  const ans = st.current.ask[key] || "…";
  await addLine(tr, "Chamador", ans, {speed:18});

  if(key==="Perguntar endereço") st.revealed.location = st.current.facts.location;
  if(key==="Perguntar se há feridos") st.revealed.injuries = st.current.facts.injuries || "Desconhecido";
  if(key==="Perguntar feridos") st.revealed.injuries = st.current.facts.injuries || "Desconhecido";
  if(key==="Perguntar se há arma") st.revealed.weapon = st.current.facts.weapon || "Não confirmado";
  if(key==="Perguntar descrição") st.revealed.description = "Descrição coletada";
  if(key==="Perguntar pessoas presas") st.revealed.trapped = "Possível vítima presa";
  if(key==="Perguntar se ainda está no local") st.revealed.onScene = "Status confirmado";
  if(key==="Perguntar placa/veículo") st.revealed.vehicle = "Informação de veículo coletada";
  if(key==="Perguntar risco elétrico") st.revealed.electric = "Risco elétrico avaliado";
  if(key.includes("Orientar")){
    st.revealed.guidance = "Orientação repassada";
    applyReward(st, "Orientação adequada", 5);
  }

  st.stress = clamp(st.stress + (st.difficulty==="extreme"?2:1), 0, 100);

  renderFacts(st);
  renderChecklist(st);
  renderSummary(st);
  renderHUD(st);
  saveState(st);
}

/* =========================
   DISPATCH MODAL
   ========================= */
function openDispatchModal(st){
  const back = $("#modalBackdrop");
  const typeSel = $("#dispatchType");
  const unitSel = $("#dispatchUnit");
  const addr = $("#dispatchAddress");
  const notes = $("#dispatchNotes");
  const pri = $("#dispatchPriority");

  typeSel.innerHTML = "";
  unitSel.innerHTML = "";

  const types = st.service==="police" ? INCIDENT_TYPES_POLICE : INCIDENT_TYPES_FIRE;
  const units = st.service==="police" ? UNITS_POLICE : UNITS_FIRE;

  for(const t of types){
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    typeSel.appendChild(o);
  }
  for(const u of units){
    const o = document.createElement("option");
    o.value = u; o.textContent = u;
    unitSel.appendChild(o);
  }

  addr.value = st.revealed.location || "";
  notes.value = "";
  pri.value = "P2";

  back.classList.remove("hidden");

  $("#btnDispatchCancel").onclick = ()=> back.classList.add("hidden");
  $("#btnDispatchConfirm").onclick = ()=>{
    const d = {
      type: typeSel.value,
      priority: pri.value,
      unit: unitSel.value,
      address: addr.value.trim(),
      notes: notes.value.trim(),
      at: now()
    };
    confirmDispatch(st, d);
    back.classList.add("hidden");
  };
}

async function confirmDispatch(st, d){
  const tr = $("#transcript");
  st.lastDispatch = d;

  await addLine(tr, "Sistema", "Despacho registrado.", {speed:14});
  await addLine(tr, "Sistema", `${d.type} • ${d.priority} • ${d.unit}`, {speed:14});

  const corr = st.current.correct;

  if(!d.address){
    applyPenalty(st, "Despacho sem endereço", 30);
    await addLine(tr, "Sistema", "Endereço ausente. Confirme antes de despachar.", {speed:14});
  }else{
    if(st.revealed.location && d.address !== st.revealed.location){
      applyPenalty(st, "Endereço divergente do confirmado", 10);
    }else{
      applyReward(st, "Endereço validado", 10);
    }
  }

  if(d.type !== corr.type) applyPenalty(st, "Classificação incorreta", 25);
  else applyReward(st, "Classificação correta", 20);

  if(d.priority !== corr.priority) applyPenalty(st, "Prioridade inadequada", 20);
  else applyReward(st, "Prioridade correta", 15);

  if(!d.unit || d.unit.split(" ")[0] !== corr.unit.split(" ")[0]) applyPenalty(st, "Unidade pouco coerente", 10);
  else applyReward(st, "Unidade coerente", 10);

  for(const q of (corr.required || [])){
    if(!st.asked[q]) applyPenalty(st, "Pergunta essencial não realizada", 12);
  }

  renderFacts(st);
  renderChecklist(st);
  renderSummary(st);
  renderHUD(st);
  saveState(st);
}

/* =========================
   CALL FLOW
   ========================= */
async function finishCall(st){
  const tr = $("#transcript");
  const callLeft = Math.floor((st.callEndsAt - now())/1000);

  if(!st.lastDispatch){
    applyPenalty(st, "Ligação encerrada sem despacho", 35);
    await addLine(tr, "Sistema", "Você encerrou sem registrar despacho. Penalidade aplicada.", {speed:14});
    renderSummary(st); renderHUD(st); saveState(st);
    return;
  }

  if(callLeft > 20) applyReward(st, "Agilidade no atendimento", 10);
  else if(callLeft < 0) applyPenalty(st, "Tempo de ligação excedido", 15);

  await addLine(tr, "Central", "Entendido. As equipes estão a caminho. Mantenha-se em segurança.", {speed:16});
  await addLine(tr, "Chamador", pick(["Obrigado…","Tá… obrigado.","Ok…","Deus te abençoe…","Valeu…"]), {speed:18});

  st.callIndex += 1;
  st.stress = clamp(st.stress + (st.difficulty==="extreme"?3:2), 0, 100);
  saveState(st);

  if(st.callIndex >= st.scenarios.length){
    endShift(st, true);
    return;
  }

  setTimeout(()=>{
    beginCall(st);
    renderHUD(st);
    saveState(st);
  }, 650);
}

function endShift(st, natural){
  pushRank({
    score: st.score,
    errors: st.errors,
    stress: Math.round(st.stress),
    service: st.service,
    city: st.city,
    difficulty: st.difficulty,
    endedAt: new Date().toISOString(),
    reason: natural ? "completed" : "manual"
  });
  clearState();
  location.href = "ranking.html";
}

function beginCall(st){
  st.current = st.scenarios[st.callIndex];
  st.revealed = {};
  st.asked = {};
  st.summary = null;
  st.lastDispatch = null;
  st._timePenaltyApplied = false;

  st.callEndsAt = now() + st.callSecondsLimit*1000;

  $("#callIndex").textContent = String(st.callIndex + 1);
  $("#callTotal").textContent = String(st.scenarios.length);

  setRoomBackgroundAbsolute(st.service==="fire" ? "dispatch_fire_room.jpg" : "dispatch_police_room.jpg");

  const tr = $("#transcript");
  tr.innerHTML = "";

  (async()=>{
    const cityFlavor = flavorByCity(st.city);
    await addLine(tr, "Central", st.service==="police" ? "190. Qual a sua emergência?" : "193. Qual a sua emergência?", {speed:16});
    await addLine(tr, "Chamador", st.current.opening, {speed:18});
    if(chance(0.65)) await addLine(tr, "Sistema", `Nota: ${cityFlavor}.`, {speed:14, delay:120});

    if(st.current.facts?.risk) st.revealed.risk = st.current.facts.risk;
    if(st.current.facts?.weapon && st.current.facts.weapon!=="N/A" && chance(0.25)) st.revealed.weapon = st.current.facts.weapon;

    renderFacts(st);
    renderChecklist(st);
    renderSummary(st);
    renderActions(st);
    saveState(st);
  })();
}

function gameLoop(st){
  renderHUD(st);
  setCallTimer(st);

  if(now() >= st.shiftEndsAt){
    endShift(st, true);
    return;
  }

  if(now() >= st.callEndsAt && !st._timePenaltyApplied){
    st._timePenaltyApplied = true;
    applyPenalty(st, "Tempo de ligação estourado", 12);
    st.callEndsAt = now() + 25*1000;
    saveState(st);
    renderSummary(st);
    renderHUD(st);
  }

  requestAnimationFrame(()=>gameLoop(st));
}

/* =========================
   MENU FLOW
   ========================= */
function startTurnFromMenu(){
  const service = $("#career").value;
  const city = $("#city").value;
  const diff = $("#difficulty").value;
  const shiftMinutes = parseInt($("#shift").value, 10);

  const st = defaultState();
  st.service = service;
  st.city = city;
  st.difficulty = diff;
  st.shiftMinutes = shiftMinutes;
  st.shiftEndsAt = now() + shiftMinutes*60*1000;

  st.callSecondsLimit = diff==="hard" ? 80 : (diff==="extreme" ? 70 : 90);

  // MAIS CASOS E MAIS VARIADOS
  st.scenarios = buildScenarioPack(service, city);

  st.callIndex = 0;
  st.score = 0;
  st.errors = 0;
  st.stress = 0;

  saveState(st);
  location.href = "game.html";
}

/* =========================
   INIT PAGES
   ========================= */
function initCover(){
  const c = document.getElementById("cover");
  if(!c){
    // Se por algum motivo o cover não existe, não redireciona sozinho.
    // A capa precisa ser "tela 1" e só avançar por toque/click.
    return;
  }
  const go = ()=>location.href="menu.html";
  c.addEventListener("pointerdown", go, {passive:true});
  c.addEventListener("click", go);
}

function initMenu(){
  const st = loadState();
  if(st){
    $("#career").value = st.service || "police";
    $("#city").value = st.city || "São Paulo";
    $("#difficulty").value = st.difficulty || "normal";
    $("#shift").value = String(st.shiftMinutes || 10);
  }

  $("#btnStart").addEventListener("click", startTurnFromMenu);
  $("#btnRanking").addEventListener("click", ()=>location.href="ranking.html");
  $("#btnContinue").addEventListener("click", ()=>{
    const cur = loadState();
    if(cur && cur.scenarios && cur.scenarios.length) location.href="game.html";
    else startTurnFromMenu();
  });
  $("#btnReset").addEventListener("click", ()=>{
    clearState();
    location.reload();
  });
}

function initRanking(){
  const list = $("#rankingList");
  const r = loadRank();
  if(!r.length){
    list.innerHTML = `<div class="hint">Sem registros ainda. Faça um turno para aparecer aqui.</div>`;
  }else{
    list.innerHTML = r.map((e,i)=>{
      const dt = new Date(e.endedAt);
      const when = `${pad2(dt.getDate())}/${pad2(dt.getMonth()+1)} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
      const srv = e.service==="police" ? "Polícia" : "Bombeiros";
      return `<div class="row"><strong>#${i+1} • ${e.score} pts</strong><div style="color:rgba(255,255,255,.70);font-size:12px">${srv} • ${e.city} • ${e.difficulty} • ${when}</div></div>`;
    }).join("");
  }

  const btnClear = document.getElementById("btnClearRanking");
  if(btnClear){
    btnClear.addEventListener("click", ()=>{
      localStorage.removeItem(LS_RANK);
      location.reload();
    });
  }
}

function initGame(){
  const st = loadState();
  if(!st || !st.scenarios || !st.scenarios.length){
    location.href = "menu.html";
    return;
  }

  const endBtn = document.getElementById("btnEndShift");
  if(endBtn) endBtn.addEventListener("click", ()=> endShift(st, false));

  beginCall(st);
  renderHUD(st);
  saveState(st);
  gameLoop(st);
}

/* =========================
   ROUTER
   ========================= */
const page = document.body?.dataset?.page || "";
if(page==="cover") initCover();
if(page==="menu") initMenu();
if(page==="ranking") initRanking();
if(page==="game") initGame();

})(); 
