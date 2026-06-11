const DATA = /*__DATA__*/{};
const FMT = n => {
  if(!isFinite(n)) return "—";
  const a=Math.abs(n);
  let s;
  if(a>=1000) s=Math.round(n).toLocaleString();
  else if(a>=100) s=(Math.round(n*10)/10).toLocaleString();
  else if(a>=10) s=(Math.round(n*100)/100).toString();
  else s=(Math.round(n*1000)/1000).toString();
  return s;
};
const MONEY = n => n>=1e6 ? (n/1e6).toFixed(n>=1e7?1:2).replace(/\.0$/,'')+"M"
  : n>=1e3 ? Math.round(n).toLocaleString() : Math.round(n).toString();

// faction -> spoiler tier
const TIER = {
  human:0,
  hai:1, quarg:1, pug:1,
  wanderer:2, korath:2, remnant:2, coalition:2,
};   // everything else => 3
const factionTier = f => (f in TIER) ? TIER[f] : 3;
const FACLABEL = f => (f||"").replace(/(^|\s)\w/g,m=>m.toUpperCase());
const CAT_COLOR = {
  "Guns":"var(--gun)","Turrets":"var(--turret)","Secondary Weapons":"#5fd0ff",
  "Ammunition":"#9aa6bd","Systems":"#3ddc97","Power":"#ffb13c","Engines":"#ff8f5c",
  "Hand to Hand":"#c98bff","Minerals":"#8fa0bb","Special":"#8fa0bb",
  "Unique":"#ffd76b","Licenses":"#8fa0bb"
};

let state = { ship:null, installed:{}, tier:0, cat:"All", q:"", view:"schem", loadoutName:"empty", showUnreleased:false };

/* ---------- art helpers ---------- */
function imgURL(path){ return path ? "images/"+encodeURI(path)+".png" : null; }
function mono2(nm){ const p=nm.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase(); return p||'··'; }
// returns a .tile element HTML with <img> + lettered fallback if the art is missing
function artTile(path, text, color, extraStyle){
  const url = imgURL(path);
  const fb = `<span class="fb" style="background:${color}${url?';display:none':''}">${text}</span>`;
  const img = url ? `<img loading="lazy" src="${url}" alt="" onerror="this.style.display='none';this.parentNode.querySelector('.fb').style.display='grid'">` : "";
  return `<span class="tile" style="${extraStyle||''}">${img}${fb}</span>`;
}

/* ---------- stat engine (formulas verbatim from ShipInfoDisplay.cpp / Ship.cpp) ---------- */
function num(v){ return typeof v==="number" ? v : 0; }
function eff(key){            // chassis attribute + sum of installed outfit contributions
  let v = num(state.ship.attributes[key]);
  for(const [nm,c] of Object.entries(state.installed)){
    const o = DATA.outfits[nm]; if(!o) continue;
    v += c * num(o.attributes[key]);
  }
  return v;
}
function capacity(key){       // returns {free,total,used} matching the game's display
  let free = eff(key);
  let total = num(state.ship.attributes[key]);
  for(const [nm,c] of Object.entries(state.installed)){
    const o = DATA.outfits[nm]; if(!o) continue;
    total -= Math.min(0, c*num(o.attributes[key]));
  }
  return {free, total, used: total-free};
}
function coolingEfficiency(x){ return 2 + 2/(1+Math.exp(-x/2)) - 4/(1+Math.exp(-x/4)); }

function computeStats(){
  const A = key => eff(key);
  const emptyMass = A("mass");
  const cargo = A("cargo space");
  const reduction = 1 + A("inertia reduction");
  const eM = emptyMass/reduction, fM = (emptyMass+cargo)/reduction;
  const thrust = A("thrust") || A("afterburner thrust");
  const drag = A("drag") || 1;
  const maxSpeed = 60*thrust/drag;
  const baseAccel = 3600*thrust*(1+A("acceleration multiplier"));
  const baseTurn = 60*A("turn")*(1+A("turn multiplier"));

  const shieldRegen = (A("shield generation")+A("delayed shield generation"))*(1+A("shield generation multiplier"));
  const hullRepair  = (A("hull repair rate")+A("delayed hull repair rate"))*(1+A("hull repair multiplier"));

  const ce = coolingEfficiency(A("cooling inefficiency"));
  const idleE = A("energy generation")+A("solar collection")+A("fuel energy")-A("energy consumption")-A("cooling energy");
  const idleH = A("heat generation")+A("solar heat")+A("fuel heat") - ce*(A("cooling")+A("active cooling"));
  const movE = Math.max(A("thrusting energy"),A("reverse thrusting energy"))+A("turning energy")+A("afterburner energy");
  const movH = Math.max(A("thrusting heat"),A("reverse thrusting heat"))+A("turning heat")+A("afterburner heat");
  let firE=0, firH=0;
  for(const [nm,c] of Object.entries(state.installed)){
    const w = DATA.outfits[nm]?.weapon; if(w && w.reload){ firE += c*num(w["firing energy"])/w.reload; firH += c*num(w["firing heat"])/w.reload; }
  }
  const hasSR = shieldRegen>0, hasHR = hullRepair>0;
  const shE = hasSR ? (A("shield energy")+A("delayed shield energy"))*(1+A("shield energy multiplier")) : 0;
  const huE = hasHR ? (A("hull energy")+A("delayed hull energy"))*(1+A("hull energy multiplier")) : 0;
  const shH = hasSR ? (A("shield heat")+A("delayed shield heat"))*(1+A("shield heat multiplier")) : 0;
  const huH = hasHR ? (A("hull heat")+A("delayed hull heat"))*(1+A("hull heat multiplier")) : 0;

  const maxHeat = 60*(0.001*A("heat dissipation"))*(100*(emptyMass + A("heat capacity")));
  const maxEnergy = A("energy capacity");

  const eh = {
    idle:[60*idleE, 60*idleH], moving:[-60*movE, 60*movH],
    firing:[-60*firE, 60*firH], shieldhull:[-60*(shE+huE), 60*(shH+huH)],
    net:[60*(idleE-movE-firE-shE-huE), 60*(idleH+movH+firH+shH+huH)],
    max:[maxEnergy, maxHeat]
  };
  // sustainability
  const energyOK = eh.net[0] >= -0.0001;
  const totalHeatIn = Math.max(0,eh.idle[1]) + eh.moving[1] + eh.firing[1] + eh.shieldhull[1];
  const heatOK = totalHeatIn <= maxHeat + 0.0001;

  return {emptyMass,cargo,maxSpeed,
    accel:[baseAccel/fM, baseAccel/eM], turn:[baseTurn/fM, baseTurn/eM],
    shields:A("shields"), shieldRegen:60*shieldRegen, hasSR,
    hull:A("hull"), hullRepair:60*hullRepair, hasHR,
    fuel:A("fuel capacity"), eh, energyOK, heatOK, totalHeatIn, maxHeat,
    cost: shipCost()};
}
function shipCost(){
  let c = num(state.ship.attributes.cost);
  for(const [nm,n] of Object.entries(state.installed)) c += n*(DATA.outfits[nm]?.cost||0);
  return c;
}
function requiredCrew(){
  let c = eff("required crew"); return Math.max(1, Math.round(c));
}

/* ---------- weapon mount accounting ---------- */
function installedOf(predicate){
  let n=0; for(const [nm,c] of Object.entries(state.installed)) if(predicate(DATA.outfits[nm])) n+=c; return n;
}

/* ---------- rendering ---------- */
const el = id => document.getElementById(id);

function renderMeters(){
  const s = computeStats();
  const hp = state.ship.hardpoints;
  const totalBays = Object.values(hp.bays||{}).reduce((a,b)=>a+b,0);
  const crew = requiredCrew(), bunks = eff("bunks");
  const guns = installedOf(o=>num(o.attributes["gun ports"])<0);
  const turrets = installedOf(o=>num(o.attributes["turret mounts"])<0);

  const meters = [];
  const cap = (label,key,unit)=>{const c=capacity(key); meters.push(meter(label,c.used,c.total,unit));};
  cap("Outfit space","outfit space"," t");
  cap("Weapon capacity","weapon capacity"," t");
  cap("Engine capacity","engine capacity"," t");
  meters.push(meter("Gun ports", guns, hp.guns,""));
  meters.push(meter("Turret mounts", turrets, hp.turrets,""));
  if(totalBays) meters.push(meter("Fighter / drone bays", 0, totalBays,"", true));
  el("meters").innerHTML = meters.join("");
  el("massReadout").textContent = FMT(s.emptyMass)+" t";

  el("moveRows").innerHTML = `
    <div class="k">Max speed</div><div class="v mono">${FMT(s.maxSpeed)}</div>
    <div class="k">Acceleration</div><div class="v mono">${FMT(s.accel[0])} – ${FMT(s.accel[1])}</div>
    <div class="k">Turning</div><div class="v mono">${FMT(s.turn[0])} – ${FMT(s.turn[1])}</div>
    <div class="k">Shields</div><div class="v mono">${FMT(s.shields)}${s.hasSR?` <span style="color:var(--dim)">(${FMT(s.shieldRegen)}/s)</span>`:''}</div>
    <div class="k">Hull</div><div class="v mono">${FMT(s.hull)}${s.hasHR?` <span style="color:var(--dim)">(${FMT(s.hullRepair)}/s)</span>`:''}</div>`;

  const row=(lab,e,h,cls="")=>`<tr class="${cls}"><td>${lab}</td><td class="mono en">${FMT(e)}</td><td class="mono ht">${FMT(h)}</td></tr>`;
  el("ehBody").innerHTML =
    row("idle",s.eh.idle[0],s.eh.idle[1])+
    row("moving",s.eh.moving[0],s.eh.moving[1])+
    row("firing",s.eh.firing[0],s.eh.firing[1])+
    row("shields / hull",s.eh.shieldhull[0],s.eh.shieldhull[1])+
    row("net change",s.eh.net[0],s.eh.net[1],"net")+
    row("max",s.eh.max[0],s.eh.max[1],"max");

  el("totalCost").textContent = MONEY(s.cost);
  renderQuickStats(s); renderAlerts(s);
}
function meter(label, used, total, unit, infoOnly){
  const over = used>total+1e-6;
  const pct = total>0 ? Math.min(100, Math.max(0, used/total*100)) : (used>0?100:0);
  const right = infoOnly ? `${FMT(total)}${unit}` : `${FMT(used)} / ${FMT(total)}${unit}`;
  return `<div class="meter ${over?'over':''}">
    <div class="top"><span class="lab">${label}</span><span class="val mono">${right}</span></div>
    <div class="bar"><i style="width:${infoOnly?0:pct}%"></i></div></div>`;
}
function flag(ok, goodText, badText){
  return `<div class="flag ${ok?'good':'bad'}"><span class="dot"></span><span>${ok?goodText:badText}</span></div>`;
}

function renderQuickStats(s){
  const hp=state.ship.hardpoints;
  const totalBays=Object.values(hp.bays||{}).reduce((a,b)=>a+b,0);
  const crew=requiredCrew(), bunks=eff("bunks");
  const rows=[["Cost",MONEY(s.cost)],["Speed",FMT(s.maxSpeed)],
    ["Shields",FMT(s.shields)],["Hull",FMT(s.hull)],
    ["Crew",`${FMT(crew)}/${FMT(bunks)}`],["Cargo",FMT(s.cargo)+"t"],["Fuel",FMT(s.fuel)]];
  if(totalBays) rows.push(["Bays",String(totalBays)]);
  el("quickStats").innerHTML = rows.map(([k,v])=>`<div class="qs"><span>${k}</span><b class="mono">${v}</b></div>`).join("");
}
function renderAlerts(s){
  const hasThrust=eff("thrust")>0, hasTurn=eff("turn")>0;
  const ne=s.eh.net[0];                       // net energy /s
  const over=s.totalHeatIn-s.maxHeat;         // heat over dissipation /s
  const A=[];
  A.push(`<span class="pill ${hasThrust?'good':'bad'}">${hasThrust?'Thrusters ✓':'No thrusters'}</span>`);
  A.push(`<span class="pill ${hasTurn?'good':'bad'}">${hasTurn?'Steering ✓':'No steering'}</span>`);
  A.push(`<span class="pill ${s.energyOK?'good':'bad'}">Energy ${ne>=0?'+':''}${FMT(ne)}/s</span>`);
  A.push(`<span class="pill ${s.heatOK?'good':'bad'}">${s.heatOK?'Heat OK ('+FMT(s.totalHeatIn)+'/'+FMT(s.maxHeat)+')':'Overheats +'+FMT(over)+'/s'}</span>`);
  el("alerts").innerHTML=A.join("");
}
function renderShipCard(){
  const ship = state.ship;
  el("hullName").textContent = ship.displayName || ship.name;
  el("hullCat").textContent = ship.category;
  el("hullFaction").textContent = FACLABEL(ship.faction);
  renderArtbox();
  renderSchem();
  renderVariants();
}
function renderArtbox(){
  const ship = state.ship;
  const url = imgURL(ship.thumbnail || ship.sprite);
  const box = el("artbox"); if(!box) return;
  if(url){ box.style.display=""; box.innerHTML=`<img src="${url}" alt="" onerror="this.parentNode.style.display='none'">`; }
  else { box.style.display="none"; box.innerHTML=""; }
}
function renderVariants(){
  const ship = state.ship;
  const vnames = Object.keys(ship.variants||{});
  let html = `<span class="vlabel">Loadout</span>`;
  html += `<button class="vchip" data-load="empty" aria-pressed="${state.loadoutName==='empty'}">Empty hull</button>`;
  if(ship.defaultOutfits && Object.keys(ship.defaultOutfits).length)
    html += `<button class="vchip" data-load="stock" aria-pressed="${state.loadoutName==='stock'}">Stock</button>`;
  for(const v of vnames)
    html += `<button class="vchip" data-load="var:${v.replace(/"/g,'&quot;')}" aria-pressed="${state.loadoutName==='var:'+v}" title="${v}">${v}</button>`;
  el("variants").innerHTML = html;
}

function renderSchem(){
  const ship = state.ship;
  const url = imgURL(ship.sprite);
  const stage = el("stage");
  if(url){
    stage.innerHTML = `<img id="shipSprite" class="shipsprite" src="${url}" alt=""
      onload="drawHardpoints()" onerror="spriteFail()"><svg id="hpOverlay" class="hpoverlay"></svg>`;
    const img = el("shipSprite");
    if(img.complete && img.naturalWidth) requestAnimationFrame(drawHardpoints);
  } else {
    drawEllipse();
  }
}
function spriteFail(){ drawEllipse(); }
function weaponSlots(){
  const guns=[], turrets=[];
  for(const [nm,c] of Object.entries(state.installed)){
    const o=DATA.outfits[nm]; if(!o) continue;
    if(num(o.attributes["gun ports"])<0) for(let i=0;i<c;i++) guns.push(nm);
    if(num(o.attributes["turret mounts"])<0) for(let i=0;i<c;i++) turrets.push(nm);
  }
  return {guns,turrets};
}
function drawHardpoints(){
  const ship=state.ship, img=el("shipSprite"), stage=el("stage"), svg=el("hpOverlay");
  if(!img||!svg||!stage||!img.naturalWidth) return;
  const SW=stage.clientWidth, SH=stage.clientHeight;
  const dispW=img.clientWidth||img.offsetWidth, dispH=img.clientHeight||img.offsetHeight;
  if(!dispW||!dispH){ requestAnimationFrame(drawHardpoints); return; }
  const scale=dispW/img.naturalWidth;            // coords map 1:1 to native sprite px
  const cx=(SW)/2, cy=(SH)/2;                     // sprite is centered in the stage
  svg.setAttribute("viewBox",`0 0 ${SW} ${SH}`);
  const pts=ship.points||[];
  const {guns,turrets}=weaponSlots();
  let gi=0,ti=0;
  const COLORS={gun:'var(--gun)',turret:'var(--turret)',engine:'var(--engine)',reverse:'var(--engine)',bay:'var(--bay)'};
  const trunc=t=>t.length>18?t.slice(0,17)+'…':t;
  let body="", labels=[];
  for(const p of pts){
    const x=cx+p.x*scale, y=cy+p.y*scale, col=COLORS[p.t];
    let label=null, lit=true;
    if(p.t==='gun'){ const w=guns[gi++]; label=w||'[empty]'; lit=!!w; }
    else if(p.t==='turret'){ const w=turrets[ti++]; label=w||'[empty]'; lit=!!w; }
    else if(p.t==='engine'||p.t==='reverse'){ lit=(eff("thrust")||eff("turn"))>0; }
    const op=lit?1:0.45;
    if(p.t==='gun')
      body+=`<polygon points="${x},${y-5} ${x-4},${y+4} ${x+4},${y+4}" fill="${col}" opacity="${op}" stroke="#05080d" stroke-width="0.6"/>`;
    else if(p.t==='turret')
      body+=`<rect x="${x-4.5}" y="${y-4.5}" width="9" height="9" transform="rotate(45 ${x} ${y})" fill="${col}" opacity="${op}" stroke="#05080d" stroke-width="0.6"/>`;
    else if(p.t==='bay')
      body+=`<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${col}" stroke-width="2" opacity="${op}"/>`;
    else
      body+=`<rect x="${x-2.5}" y="${y-3}" width="5" height="8" rx="1.5" fill="${col}" opacity="${op}"/>`;
    if(label!==null){
      const left=p.x<0, halfW=dispW/2, pad=16;
      const lx = left ? Math.max(4, cx-halfW-pad) : Math.min(SW-4, cx+halfW+pad);
      labels.push({x,y,left,label,lit,lx,anchor:left?'end':'start'});
    }
  }
  for(const side of [true,false]){
    const arr=labels.filter(l=>l.left===side).sort((a,b)=>a.y-b.y);
    let prev=-1e9; for(const l of arr){ l.ly=Math.max(l.y, prev+13); prev=l.ly; }
  }
  let lab="";
  for(const l of labels){
    lab+=`<line x1="${l.x}" y1="${l.y}" x2="${l.lx}" y2="${l.ly}" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>`;
    lab+=`<circle cx="${l.x}" cy="${l.y}" r="2" fill="var(--accent)" opacity="0.7"/>`;
    lab+=`<text x="${l.lx}" y="${l.ly+3}" text-anchor="${l.anchor}" font-size="9.5" fill="${l.lit?'var(--bright)':'var(--dim)'}">${trunc(l.label)}</text>`;
  }
  svg.innerHTML=body+lab;
}
function drawEllipse(){
  const ship = state.ship;
  const pts = ship.points||[];
  const W=520,H=340,cx=W/2,cy=H/2;
  let maxR=70;
  for(const p of pts) maxR=Math.max(maxR, Math.abs(p.x), Math.abs(p.y));
  const sc = (H*0.40)/maxR;
  const {guns,turrets}=weaponSlots();
  const filledEngines = (eff("thrust")||eff("turn")) ? 1 : 0;
  let gi=0,ti=0;
  const COLORS={gun:'var(--gun)',turret:'var(--turret)',engine:'var(--engine)',reverse:'var(--engine)',bay:'var(--bay)'};
  const trunc = t => t.length>18 ? t.slice(0,17)+'…' : t;
  let body=`<defs><radialGradient id="hg" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="var(--tile1)"/><stop offset="100%" stop-color="var(--tile2)"/></radialGradient></defs>`;
  body+=`<ellipse cx="${cx}" cy="${cy}" rx="${Math.min(92,maxR*sc*0.8)}" ry="${Math.min(150,maxR*sc*1.05)}"
      fill="url(#hg)" stroke="var(--line2)" stroke-width="1.2"/>`;
  const labels=[];
  for(const p of pts){
    const x=cx+p.x*sc, y=cy+p.y*sc;
    const col=COLORS[p.t];
    let label=null, lit=true;
    if(p.t==='gun'){ const w=guns[gi++]; label=w||'[empty]'; lit=!!w; }
    else if(p.t==='turret'){ const w=turrets[ti++]; label=w||'[empty]'; lit=!!w; }
    else if(p.t==='engine'||p.t==='reverse'){ lit=filledEngines>0; }
    const op=lit?1:0.3;
    if(p.t==='gun') body+=`<polygon points="${x},${y-6} ${x-5},${y+5} ${x+5},${y+5}" fill="${col}" opacity="${op}"/>`;
    else if(p.t==='turret') body+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" transform="rotate(45 ${x} ${y})" fill="${col}" opacity="${op}"/>`;
    else if(p.t==='bay') body+=`<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${col}" stroke-width="2" opacity="${op}"/>`;
    else body+=`<rect x="${x-3}" y="${y-3}" width="6" height="9" rx="1.5" fill="${col}" opacity="${op}"/>`;
    if(label!==null){ const left=p.x<0; labels.push({x,y,left,label,lit,lx:left?12:W-12, anchor:left?'start':'end'}); }
  }
  for(const side of [true,false]){
    const arr=labels.filter(l=>l.left===side).sort((a,b)=>a.y-b.y);
    let prev=-1e9; for(const l of arr){ l.ly=Math.max(l.y, prev+13); prev=l.ly; }
  }
  for(const l of labels){
    body+=`<line class="lead" x1="${l.x}" y1="${l.y}" x2="${l.lx}" y2="${l.ly}"/>`;
    body+=`<text class="${l.lit?'':'empty'}" x="${l.lx}" y="${l.ly+3}" text-anchor="${l.anchor}">${trunc(l.label)}</text>`;
  }
  el("stage").innerHTML = `<svg class="schem" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}

function renderLoadout(){
  const groups={};
  for(const [nm,c] of Object.entries(state.installed)){
    const o=DATA.outfits[nm]; if(!o) continue;
    (groups[o.category] ||= []).push([nm,c,o]);
  }
  const order = DATA.categoryOrder.filter(k=>groups[k]);
  const box = el("loadout");
  let count = Object.values(state.installed).reduce((a,b)=>a+b,0);
  el("installCount").textContent = count?`${count} item${count>1?'s':''}`:"";
  if(!order.length){ box.innerHTML=`<div class="empty">Empty hull. Pick a loadout above, drag outfits onto the ship, or use the + buttons →</div>`; return; }
  box.innerHTML = order.map(cat=>{
    const rows = groups[cat].sort((a,b)=>a[0].localeCompare(b[0])).map(([nm,c,o])=>`
      <div class="litem">
        ${artTile(o.thumbnail, mono2(nm), CAT_COLOR[cat]||'var(--dim)')}
        <div class="nm"><b data-detail="${nm.replace(/"/g,'&quot;')}" title="${nm}">${nm}</b><small>${FMT(o.mass)} t · ${MONEY(o.cost)}</small></div>
        <div class="stepper">
          <button data-dec="${nm.replace(/"/g,'&quot;')}">−</button><span class="cnt mono">${c}</span><button data-inc="${nm.replace(/"/g,'&quot;')}">+</button>
        </div>
      </div>`).join("");
    return `<div class="loadgroup"><h3>${cat}<span class="catcount">${groups[cat].reduce((a,x)=>a+x[1],0)}</span></h3>${rows}</div>`;
  }).join("");
}

function visibleOutfits(){
  const q=state.q.toLowerCase();
  return Object.values(DATA.outfits).filter(o=>{
    if(!o.thumbnail) return false;            // hide outfits with no bundled art
    if(!state.showUnreleased && !o.obtainable) return false;  // hide unreleased/unused
    if(factionTier(o.faction)>state.tier) return false;
    if(state.cat!=="All" && o.category!==state.cat) return false;
    if(q && !o.name.toLowerCase().includes(q)) return false;
    return true;
  });
}
function renderCatbar(){
  const cats=["All",...DATA.categoryOrder];
  el("catbar").innerHTML = cats.map(c=>`<button data-cat="${c}" aria-pressed="${state.cat===c}">${c}</button>`).join("");
}
function chipFor(o){
  const a=o.attributes, w=o.weapon, chips=[];
  if(w&&w.reload){ const dps=(num(w["shield damage"])+num(w["hull damage"]))*60/w.reload;
    chips.push(`<span class="chip">${FMT(dps)} dps</span>`); }
  if(a["outfit space"]<0) chips.push(`<span class="chip">space ${FMT(Math.abs(a["outfit space"]))}</span>`);
  return `<div class="chips"><span class="chip fac">${o.faction}</span>${chips.slice(0,3).join("")}</div>`;
}
function renderCatalog(){
  const list=visibleOutfits().sort((a,b)=>{
    const ai=DATA.categoryOrder.indexOf(a.category), bi=DATA.categoryOrder.indexOf(b.category);
    return ai-bi || a.cost-b.cost || a.name.localeCompare(b.name);
  });
  el("catalog").innerHTML = list.length? list.slice(0,500).map(o=>`
    <div class="ocard" draggable="true" data-name="${o.name.replace(/"/g,'&quot;')}">
      <div class="art">${artTile(o.thumbnail, mono2(o.name), CAT_COLOR[o.category]||'var(--dim)')}</div>
      <button class="addbtn" data-inc="${o.name.replace(/"/g,'&quot;')}">+</button>
      <div class="meta">
        <b data-detail="${o.name.replace(/"/g,'&quot;')}" title="${o.name}">${o.name}</b>
        <span class="price mono">${MONEY(o.cost)}</span>
        ${chipFor(o)}
      </div>
    </div>`).join("")
    : `<div class="empty">No outfits match. Raise the tech access or clear the search.</div>`;
}

/* ---------- detail drawer ---------- */
function openDetail(nm){
  const o=DATA.outfits[nm]; if(!o) return;
  const a=o.attributes;
  const skip=new Set(["mass"]);
  const kv=Object.entries(a).filter(([k,v])=>typeof v==="number"&&v!==0&&!skip.has(k))
    .sort((x,y)=>x[0].localeCompare(y[0]))
    .map(([k,v])=>`<div class="k">${k}</div><div class="v mono">${FMT(v)}</div>`).join("");
  let wk="";
  if(o.weapon){ const w=o.weapon;
    const rows=[["shield damage",w["shield damage"]],["hull damage",w["hull damage"]],
      ["reload (frames)",w.reload],["firing energy",w["firing energy"]],["firing heat",w["firing heat"]],
      ["velocity",w.velocity],["range",w.velocity&&w.lifetime?w.velocity*w.lifetime:0]];
    wk=`<div class="eyebrow" style="margin-top:14px">Weapon</div><div class="kv">`+
      rows.filter(r=>r[1]).map(r=>`<div class="k">${r[0]}</div><div class="v mono">${FMT(r[1])}</div>`).join("")+`</div>`;
  }
  const sold=o.soldAt||[];
  const soldHTML = sold.length
    ? `<div class="soldlist">${sold.slice(0,40).map(s=>`<div class="p">${s.planet}${s.system?` <small>· ${s.system}</small>`:''}</div>`).join("")}${sold.length>40?`<div class="note">+${sold.length-40} more locations</div>`:''}</div>`
    : `<div class="note">Not sold at any outfitter — this is loot / mission-only / starting equipment.</div>`;
  const heroURL=imgURL(o.thumbnail);
  el("drawerBody").innerHTML=`
    <div class="eyebrow">${o.category} · ${o.faction}</div>
    <h2>${nm}</h2>
    ${heroURL?`<div class="tile hero"><img src="${heroURL}" alt="" style="object-fit:contain;padding:14px" onerror="this.parentNode.style.display='none'"></div>`:""}
    <div class="kv"><div class="k">cost</div><div class="v mono">${MONEY(o.cost)}</div>
      <div class="k">mass</div><div class="v mono">${FMT(o.mass)} t</div></div>
    ${o.description?`<div class="desc">${o.description}</div>`:""}
    <div class="eyebrow">Attributes</div><div class="kv">${kv||'<div class="k">—</div><div class="v">—</div>'}</div>
    ${wk}
    <div class="eyebrow" style="margin-top:14px">Sold at (${sold.length})</div>
    ${soldHTML}
    <button class="addbtn" style="position:static;width:auto;padding:8px 16px;margin-top:16px;border-radius:8px" data-inc="${nm.replace(/"/g,'&quot;')}">+ Install</button>`;
  el("drawer").classList.add("open");
}

/* ---------- mutations ---------- */
/* ---- install limits: an outfit can\'t push a capacity/mount below zero ---- */
function limitBlocked(o, delta){
  if(delta<=0 || !o) return null;
  const hp=state.ship.hardpoints;
  // mount limits come from hardpoint COUNTS (not ship attributes)
  const gunUse=-num(o.attributes["gun ports"]);
  if(gunUse>0 && (hp.guns - installedOf(x=>x&&num(x.attributes["gun ports"])<0)) < delta*gunUse) return "gun ports";
  const turUse=-num(o.attributes["turret mounts"]);
  if(turUse>0 && (hp.turrets - installedOf(x=>x&&num(x.attributes["turret mounts"])<0)) < delta*turUse) return "turret mounts";
  // space / capacity limits are ship attributes -> use eff()
  const CAP={"outfit space":"outfit space","weapon capacity":"weapon capacity","engine capacity":"engine capacity"};
  const keys=new Set(Object.keys(CAP));
  for(const k in o.attributes){ if(o.attributes[k]<0 && /capacity$/.test(k)) keys.add(k); }
  for(const k of keys){
    const consume=num(o.attributes[k]);            // negative => consumes that resource
    if(consume>=0) continue;
    if(eff(k) + delta*consume < -1e-9) return CAP[k] || k;
  }
  return null;
}
let _ac=null;
function beep(){
  try{
    _ac = _ac || new (window.AudioContext||window.webkitAudioContext)();
    if(_ac.state==="suspended") _ac.resume();
    const o=_ac.createOscillator(), g=_ac.createGain();
    o.type="square"; o.frequency.value=200;
    g.gain.setValueAtTime(0.05,_ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,_ac.currentTime+0.16);
    o.connect(g); g.connect(_ac.destination);
    o.start(); o.stop(_ac.currentTime+0.16);
  }catch(e){}
}
let _toastT=null;
function showToast(msg){
  const t=el("toast"); if(!t) return;
  t.textContent=msg; t.classList.add("show");
  clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove("show"),1700);
}
function add(nm,d=1){
  if(d>0){
    const blocked=limitBlocked(DATA.outfits[nm], d);
    if(blocked){ beep(); showToast("Outfit Limit Reached \u2014 no free "+blocked); return; }
  }
  state.installed[nm]=(state.installed[nm]||0)+d;
  if(state.installed[nm]<=0) delete state.installed[nm];
  renderAll();
}
function setShip(name){
  state.ship = DATA.ships[name];
  const stock = state.ship.defaultOutfits || {};
  if(Object.keys(stock).length){ state.installed = {...stock}; state.loadoutName = "stock"; }
  else { state.installed = {}; state.loadoutName = "empty"; }
  renderAll();
}
function loadLoadout(token){
  if(token==="empty"){ state.installed={}; }
  else if(token==="stock"){ state.installed={...(state.ship.defaultOutfits||{})}; }
  else if(token.startsWith("var:")){ const v=token.slice(4); state.installed={...(state.ship.variants[v]||{})}; }
  state.loadoutName=token; renderAll();
}
function renderAll(){ renderMeters(); renderShipCard(); renderLoadout(); renderCatalog(); }

/* ---------- ship pickers (race -> model) ---------- */
function shipsByFaction(){
  const byFac={};
  for(const s of Object.values(DATA.ships)){
    if(!state.showUnreleased && !s.obtainable) continue;
    (byFac[s.faction] ||= []).push(s);
  }
  return byFac;
}
function refreshPickers(){
  const curFac = state.ship ? state.ship.faction : null;
  const curShip = state.ship ? state.ship.name : null;
  buildFactionSelect();
  const facOpts=[...el("facSel").options].map(o=>o.value);
  const fac = facOpts.includes(curFac)?curFac:facOpts[0];
  el("facSel").value=fac; buildModelSelect(fac);
  const shipOpts=[...el("shipSel").options].map(o=>o.value);
  if(curShip && shipOpts.includes(curShip)) el("shipSel").value=curShip;
  else if(shipOpts.length){ el("shipSel").value=shipOpts[0]; setShip(shipOpts[0]); }
}
function buildFactionSelect(){
  const byFac=shipsByFaction();
  const facOrder=Object.keys(byFac).sort((a,b)=>factionTier(a)-factionTier(b)||a.localeCompare(b));
  el("facSel").innerHTML = facOrder.map(f=>`<option value="${f}">${FACLABEL(f)} (${byFac[f].length})</option>`).join("");
}
function buildModelSelect(faction){
  const byFac=shipsByFaction();
  const list=(byFac[faction]||[]).slice();
  const sel=el("shipSel"); sel.innerHTML="";
  const byCat={};
  for(const s of list){ (byCat[s.category] ||= []).push(s); }
  for(const cat of Object.keys(byCat).sort()){
    const og=document.createElement("optgroup"); og.label=cat;
    byCat[cat].sort((a,b)=>(a.displayName||a.name).localeCompare(b.displayName||b.name)).forEach(s=>{
      const op=document.createElement("option"); op.value=s.name; op.textContent=s.displayName||s.name; og.appendChild(op);
    });
    sel.appendChild(og);
  }
}

function setTheme(t){
  document.body.dataset.theme=t;
  try{ localStorage.setItem("drydock-theme",t); }catch(e){}
  document.querySelectorAll("#themeBtns button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.theme===t));
}
function init(){
  el("ver").textContent=DATA.version;
  let su=null; try{ su=localStorage.getItem("drydock-unreleased"); }catch(e){}
  state.showUnreleased = su==="1";
  el("unrelBtn").setAttribute("aria-pressed", state.showUnreleased);
  buildFactionSelect(); renderCatbar();
  const def = DATA.ships["Bactrian"]||DATA.ships["Falcon"]||DATA.ships["Leviathan"]||Object.values(DATA.ships)[0];
  el("facSel").value=def.faction;
  buildModelSelect(def.faction);
  el("shipSel").value=def.name; setShip(def.name);
  document.querySelectorAll("#tierBtns button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.tier==="0"));
  let savedTheme=null; try{ savedTheme=localStorage.getItem("drydock-theme"); }catch(e){}
  setTheme(savedTheme||"blue");

  el("facSel").addEventListener("change",e=>{
    buildModelSelect(e.target.value);
    const first=el("shipSel").value; if(first) setShip(first);
  });
  el("shipSel").addEventListener("change",e=>setShip(e.target.value));
  el("variants").addEventListener("click",e=>{const b=e.target.closest("[data-load]");if(!b)return;loadLoadout(b.dataset.load);});
  el("themeBtns").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;setTheme(b.dataset.theme);});
  el("unrelBtn").addEventListener("click",()=>{
    state.showUnreleased=!state.showUnreleased;
    try{ localStorage.setItem("drydock-unreleased", state.showUnreleased?"1":"0"); }catch(e){}
    el("unrelBtn").setAttribute("aria-pressed", state.showUnreleased);
    refreshPickers(); renderCatalog();
  });
  el("resetBtn").addEventListener("click",()=>loadLoadout("empty"));
  el("tierBtns").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    state.tier=+b.dataset.tier;
    document.querySelectorAll("#tierBtns button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    renderCatalog();});
  el("search").addEventListener("input",e=>{state.q=e.target.value;renderCatalog();});
  el("catbar").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    state.cat=b.dataset.cat; renderCatbar(); renderCatalog();});
  document.body.addEventListener("click",e=>{
    const inc=e.target.closest("[data-inc]"), dec=e.target.closest("[data-dec]"), det=e.target.closest("[data-detail]");
    if(inc){ add(inc.dataset.inc, +1); }
    else if(dec){ add(dec.dataset.dec, -1); }
    else if(det){ openDetail(det.dataset.detail); }
  });
  el("drawerX").addEventListener("click",()=>el("drawer").classList.remove("open"));
  el("drawer").addEventListener("click",e=>{ if(e.target===el("drawer")) el("drawer").classList.remove("open"); });
  el("gearBtn").addEventListener("click",()=>el("settings").classList.add("open"));
  el("settingsX").addEventListener("click",()=>el("settings").classList.remove("open"));
  el("settings").addEventListener("click",e=>{ if(e.target===el("settings")) el("settings").classList.remove("open"); });

  document.body.addEventListener("dragstart",e=>{const c=e.target.closest(".ocard");if(c)e.dataTransfer.setData("text/plain",c.dataset.name);});
  function dropTarget(elm){
    if(!elm) return;
    elm.addEventListener("dragover",e=>{e.preventDefault();elm.classList.add("dragover");});
    elm.addEventListener("dragleave",e=>{ if(!elm.contains(e.relatedTarget)) elm.classList.remove("dragover");});
    elm.addEventListener("drop",e=>{e.preventDefault();elm.classList.remove("dragover");
      const nm=e.dataTransfer.getData("text/plain"); if(DATA.outfits[nm]) add(nm,1);});
  }
  dropTarget(el("shipcard"));
  dropTarget(document.querySelector(".loadpanel"));
}
let _rz=null;
window.addEventListener("resize",()=>{ clearTimeout(_rz); _rz=setTimeout(()=>{ if(state.ship) renderShipCard(); },150); });
init();
