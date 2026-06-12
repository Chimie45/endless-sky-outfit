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

let state = { ship:null, installed:{}, tier:0, q:"", view:"schem", loadoutName:"empty", showUnreleased:false, pickerFac:"all", pickerQ:"", fleet:[], fleetSel:-1, series:"All", cat:"", openCat:"", faction:"", shopStation:"", shopQ:"", yardStation:"", yardQ:"", shopPage:0, yardPage:0, dock:"parts", catPage:0, catbarPage:0, pickPage:0, pickFacPage:0, loadPage:0 };

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
  // --- sustainability breakpoints ---------------------------------------
  // ENERGY: a build "runs out of power" if it either (a) has no generation
  // source at all (empty hull, no reactor/solar/fuel cell), or (b) its idle
  // draw already exceeds generation so batteries only ever deplete. Judge
  // sustainability at idle (passive systems + cooling): thrust/fire are bursty
  // and buffered by the capacitor, so a non-negative idle balance means the
  // capacitor always recharges. No source at all => never recharges => bad.
  const energyGen = A("energy generation")+A("solar collection")+A("fuel energy");
  const hasEnergySource = energyGen > 1e-9;
  const energyOK = hasEnergySource && eh.idle[0] >= -0.0001;
  // HEAT: heat settles where dissipation == input; the ship overheats if that
  // equilibrium sits above max heat, i.e. sustained heat input > maxHeat. Use
  // the cruise load (idle + movement); weapon fire is bursty and the heat bar
  // tolerates short spikes.
  const cruiseHeatIn = Math.max(0,eh.idle[1]) + Math.max(0,eh.moving[1]);
  const totalHeatIn = cruiseHeatIn + Math.max(0,eh.firing[1]) + Math.max(0,eh.shieldhull[1]);
  const heatOK = cruiseHeatIn <= maxHeat + 0.0001;

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
function _fitCount(id,cw,ch,gap){ const b=el(id); if(!b||!b.clientWidth||!b.clientHeight) return 18; const cols=Math.max(1,Math.floor((b.clientWidth+gap)/(cw+gap))); const rows=Math.max(1,Math.floor((b.clientHeight+gap)/(ch+gap))); return cols*rows; }
function _fitRows(id,rh){ const b=el(id); if(!b||!b.clientHeight) return 10; return Math.max(1,Math.floor(b.clientHeight/rh)); }
function _clampPage(p,pages){ p=p|0; if(p>=pages)p=pages-1; if(p<0)p=0; return p; }
function _pg(page,pages){ return pages>1? `<button data-pg="prev"${page<=0?" disabled":""}>‹</button><span>${page+1}/${pages}</span><button data-pg="next"${page>=pages-1?" disabled":""}>›</button>` : ""; }
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function renderMeters(){
  const s = computeStats();
  const hp = state.ship.hardpoints;
  const totalBays = Object.values(hp.bays||{}).reduce((a,b)=>a+b,0);
  const guns = installedOf(o=>num(o.attributes["gun ports"])<0);
  const turrets = installedOf(o=>num(o.attributes["turret mounts"])<0);
  const v=(val,cls,bad)=>`<b class="val mono ${cls||''}${bad?' bad':''}">${val}</b>`;
  const row=(l,...vals)=>`<div class="strow"><span class="lbl">${l}</span><span class="vals">${vals.join("")}</span></div>`;
  const C=n=>Math.round(n).toLocaleString();
  const capRow=(l,key,unit)=>{const c=capacity(key);return row(l,v(`${C(c.used)}/${C(c.total)}${unit||''}`,'',c.used>c.total+1e-6));};

  el("capPills").innerHTML =
    capRow("Outfit","outfit space"," t")+capRow("Weapon","weapon capacity"," t")+capRow("Engine","engine capacity"," t")+
    row("Gun ports",v(`${guns}/${hp.guns}`,'',guns>hp.guns))+
    row("Turrets",v(`${turrets}/${hp.turrets}`,'',turrets>hp.turrets))+
    row("Bays",v(String(totalBays)));
  el("massReadout").textContent = FMT(s.emptyMass)+" t";

  el("movePills").innerHTML =
    row("Max speed",v(FMT(s.maxSpeed)))+
    row("Acceleration",v(`${FMT(s.accel[0])}–${FMT(s.accel[1])}`))+
    row("Turning",v(`${FMT(s.turn[0])}–${FMT(s.turn[1])}`))+
    row("Shields",v(`${FMT(s.shields)}${s.hasSR?" +"+FMT(s.shieldRegen):""}`))+
    row("Hull",v(`${FMT(s.hull)}${s.hasHR?" +"+FMT(s.hullRepair):""}`));

  el("ehPills").innerHTML =
    row("Idle",v(FMT(s.eh.idle[0]),"en"),v(FMT(s.eh.idle[1]),"ht"))+
    row("Moving",v(FMT(s.eh.moving[0]),"en"),v(FMT(s.eh.moving[1]),"ht"))+
    row("Firing",v(FMT(s.eh.firing[0]),"en"),v(FMT(s.eh.firing[1]),"ht"))+
    row("Net",v(FMT(s.eh.net[0]),"en"),v(FMT(s.eh.net[1]),"ht"))+
    row("Max",v(FMT(s.eh.max[0]),"en"),v(FMT(s.eh.max[1]),"ht"));

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
  const crew=requiredCrew(), bunks=eff("bunks"), mass=eff("mass");
  const row=(l,val)=>`<div class="strow"><span class="lbl">${l}</span><span class="vals"><b class="val mono">${val}</b></span></div>`;
  el("quickStats").innerHTML = row("Cost",MONEY(s.cost))+row("Crew",FMT(crew))+row("Bunks",FMT(bunks))+row("Cargo",FMT(s.cargo)+" t")+row("Fuel",FMT(s.fuel))+row("Mass",FMT(mass)+" t");
}
function renderAlerts(s){
  const hasThrust=eff("thrust")>0, hasTurn=eff("turn")>0;
  const p=(lab,ok,tip)=>`<span class="pill ${ok?'good':'bad'}" title="${tip}">${lab} ${ok?'✓':'✗'}</span>`;
  el("alerts").innerHTML =
    p("Thrust",hasThrust,hasThrust?"Has a thruster \u2014 can accelerate":"No thruster \u2014 can\u2019t accelerate")+
    p("Steering",hasTurn,hasTurn?"Has steering \u2014 can turn":"No steering \u2014 can\u2019t turn")+
    p("Energy",s.energyOK,s.energyOK?"Generates enough power to run":"Will run out of power")+
    p("Heat",s.heatOK,s.heatOK?"Stays cool enough":"Will overheat");
}
function fitShipName(){
  const e=el("hullName"); if(!e||!e.clientWidth) return;   // skip until laid out (avoids stale wide measurement)
  let size=30; e.style.fontSize=size+"px";
  let g=60;
  while(e.scrollWidth>e.clientWidth+1 && size>9 && g-->0){ size-=0.5; e.style.fontSize=size+"px"; }
}
function renderShipCard(){
  const ship = state.ship;
  el("hullName").textContent = ship.displayName || ship.name;
  fitShipName(); requestAnimationFrame(fitShipName); setTimeout(fitShipName,80);
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
function shortVariant(v){
  let t=v;
  for(const pre of [state.ship.displayName, state.ship.name]){ if(pre && t.startsWith(pre)) t=t.slice(pre.length); }
  t=t.replace(/^[\s(]+/,'').replace(/[)\s]+$/,'').trim();
  return t || v;
}
function renderVariants(){
  const ship = state.ship;
  const vnames = Object.keys(ship.variants||{});
  const n = Math.max(6, vnames.length);
  let html="";
  for(let i=0;i<n;i++){
    if(i<vnames.length){ const v=vnames[i]; html+=`<button class="vchip" data-load="var:${v.replace(/"/g,'&quot;')}" aria-pressed="${state.loadoutName==='var:'+v}" title="${v}"><span class="vtxt">${shortVariant(v)}</span></button>`; }
    else html+=`<div class="vchip empty"></div>`;
  }
  el("variants").innerHTML=html;
  fitVariants(); requestAnimationFrame(fitVariants);
}
function fitVariants(){
  const box=el("variants"); if(!box) return;
  box.querySelectorAll(".vchip .vtxt").forEach(t=>{
    t.style.fontSize="";
    let size=parseFloat(getComputedStyle(t).fontSize)||11, g=16;
    while(t.scrollWidth>t.clientWidth+1 && size>8 && g-->0){ size-=0.5; t.style.fontSize=size+"px"; }
  });
}
function setPresetPressed(){
  document.querySelectorAll('#presetGrid [data-load]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.load===state.loadoutName));
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
  const wrap=t=>{ if(t.length<=13) return [t]; const w=t.split(' '); let p='',q=''; for(const x of w){ if(!q && (p?p+' '+x:x).length<=13) p=p?p+' '+x:x; else q=q?q+' '+x:x; } if(!q){ return [p.length>16?p.slice(0,15)+'…':p]; } if(q.length>16) q=q.slice(0,15)+'…'; return [p,q]; };
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
    let prev=-1e9; for(const l of arr){ const h=wrap(l.label).length>1?20:12; l.ly=Math.max(l.y, prev+h); prev=l.ly; }
  }
  let lab="";
  for(const l of labels){
    lab+=`<line x1="${l.x}" y1="${l.y}" x2="${l.lx}" y2="${l.ly}" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>`;
    lab+=`<circle cx="${l.x}" cy="${l.y}" r="2" fill="var(--accent)" opacity="0.7"/>`;
    {const lines=wrap(l.label); const y0=l.ly+3-(lines.length>1?5:0);
     lab+=`<text x="${l.lx}" y="${y0}" text-anchor="${l.anchor}" font-size="9" fill="${l.lit?'var(--bright)':'var(--dim)'}">`+lines.map((ln,i)=>`<tspan x="${l.lx}" dy="${i?10:0}">${ln}</tspan>`).join('')+`</text>`;}
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
  for(const [nm,c] of Object.entries(state.installed)){ const o=DATA.outfits[nm]; if(!o) continue; (groups[o.category] ||= []).push([nm,c,o]); }
  const order = DATA.categoryOrder.filter(k=>groups[k]);
  const box = el("loadout");
  const count = Object.values(state.installed).reduce((a,b)=>a+b,0);
  el("installCount").textContent = count?`${count} item${count>1?'s':''}`:"";
  if(!order.length){ box.innerHTML=`<div class="empty">Empty hull. Pick a loadout, or drag parts from the picker →</div>`; return; }
  box.innerHTML = order.map(cat=>{
    const rows = groups[cat].sort((a,b)=>a[0].localeCompare(b[0])).map(([nm,c,o])=>`<div class="litem">${artTile(o.thumbnail, mono2(nm), CAT_COLOR[cat]||'var(--dim)')}<div class="nm"><b data-detail="${nm.replace(/"/g,'&quot;')}" title="${nm}">${nm}</b><small>${FMT(o.mass)} t · ${MONEY(o.cost)}</small></div><div class="stepper"><button data-dec="${nm.replace(/"/g,'&quot;')}">−</button><span class="cnt mono">${c}</span><button data-inc="${nm.replace(/"/g,'&quot;')}">+</button></div></div>`).join("");
    return `<div class="loadgroup"><h3>${cat}<span class="catcount">${groups[cat].reduce((a,x)=>a+x[1],0)}</span></h3>${rows}</div>`;
  }).join("");
}

function outfitEligible(o){
  if(o.category==="Minerals"||o.category==="Unique"||o.category==="Licenses") return false; // not installable parts
  if(o.name==="Local Map") return false;                    // map item, not installable
  if(!o.thumbnail||o.thumbnail==="outfit/unknown") return false; // need real bundled art
  if(!state.showUnreleased && !o.obtainable) return false;
  if(factionTier(o.faction)>state.tier) return false;
  return true;
}
function visibleOutfits(){
  const q=state.q.toLowerCase();
  return Object.values(DATA.outfits).filter(o=>{
    if(!outfitEligible(o)) return false;
    if(state.cat && o.category!==state.cat) return false;
    if((state.series||"All")!=="All" && subKey(o)!==state.series) return false;
    if(state.faction && o.faction!==state.faction) return false;
    if(q && !o.name.toLowerCase().includes(q)) return false;
    return true;
  });
}
const SERIES_ORDER=["Guns","Turrets","Secondary Weapons","Ammunition","Anti-Missile","H2H","Generators","Batteries","Solar","Shields","Cooling","Repair","Ramscoops","Fuel","Scanners","Jammers","Drives","Special Systems","Fortifications","Tractor Beams","Passenger","Expansions","Engines","Afterburners","Licenses"];
const SERIES_LABEL={"H2H":"Hand to Hand","Cooling":"Coolers"};
const WEAPON_CATS=new Set(["Guns","Turrets","Secondary Weapons","Ammunition"]);
const WFAM=[["anti-missile","Anti-Missile"],["tractor","Tractor Beam"],["mining","Mining"],["flamethrower","Flamethrower"],["beam","Beam"],["laser","Laser"],["blaster","Blaster"],["plasma","Plasma"],["photon","Photon"],["particle","Particle"],["electron","Electron"],["proton","Proton"],["ion","Ion"],["pulse","Pulse"],["meteor","Meteor"],["sidewinder","Missile"],["javelin","Javelin"],["typhoon","Typhoon"],["missile","Missile"],["torpedo","Torpedo"],["rocket","Rocket"],["nuke","Nuclear"],["nuclear","Nuclear"],["gatling","Gatling"],["bullet","Gatling"],["repeater","Repeater"],["cannon","Cannon"],["gun","Gun"]];
function weaponFamily(o){ const n=(o.name||"").toLowerCase(); for(const kf of WFAM){ if(n.includes(kf[0])) return kf[1]; } return "Other"; }
function subKey(o){ return WEAPON_CATS.has(o.category) ? weaponFamily(o) : (o.series||""); }
function renderCatbar(){
  const catMap={};
  for(const o of Object.values(DATA.outfits)){ if(!outfitEligible(o)) continue; (catMap[o.category]=catMap[o.category]||new Set()).add(subKey(o)); }
  const cats=DATA.categoryOrder.filter(c=>catMap[c]);
  const allActive = !state.cat && (!state.series||state.series==="All");
  let html=`<button class="catrow${allActive?' active':''}" data-cat="" data-series="All"><span class="caret"></span><span class="ctxt">All</span></button>`;
  for(const c of cats){
    const series=[...catMap[c]].filter(Boolean).sort((a,b)=>{ if(a==="Other")return 1; if(b==="Other")return -1; const ai=SERIES_ORDER.indexOf(a),bi=SERIES_ORDER.indexOf(b); if(ai>=0&&bi>=0)return ai-bi; if(ai>=0)return -1; if(bi>=0)return 1; return a.localeCompare(b); });
    const multi=series.length>1, open=state.openCat===c, active=state.cat===c;
    html+=`<button class="catrow${active?' active':''}${multi?' has-sub':''}" data-cat="${c}" aria-expanded="${open}"><span class="caret">${multi?(open?'▾':'▸'):''}</span><span class="ctxt">${c}</span></button>`;
    if(multi&&open){ for(const s of series) html+=`<button class="subrow${active&&state.series===s?' active':''}" data-cat="${c}" data-series="${s.replace(/"/g,'&quot;')}">${SERIES_LABEL[s]||s}</button>`; }
  }
  el("catbar").innerHTML=html;
  if(el("catbarPager")) el("catbarPager").innerHTML="";
}
function renderPartsFac(){
  const sel=el("partsFac"); if(!sel) return;
  const facs=new Set();
  for(const o of Object.values(DATA.outfits)){
    if(!outfitEligible(o)) continue;
    facs.add(o.faction);
  }
  if(state.faction && !facs.has(state.faction)) state.faction="";
  const list=[...facs].sort();
  sel.innerHTML=`<option value="">All races</option>`+list.map(f=>`<option value="${f}"${f===state.faction?" selected":""}>${FACLABEL(f)}</option>`).join("");
}
function statChips(o){
  const a=o.attributes, w=o.weapon;
  const kmb=n=> n>=1e6?(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,"")+"M":n>=1e3?Math.round(n/1e3)+"K":String(Math.round(n));
  const chips=[`<span class="chip fac">${FACLABEL(o.faction)}</span>`,`<span class="chip">Price ${kmb(o.cost)}</span>`];
  const dps=(w&&w.reload)?(num(w["shield damage"])+num(w["hull damage"]))*60/w.reload:0;
  chips.push(`<span class="chip">${Math.round(dps)} DPS</span>`);
  if(a["outfit space"]<0) chips.push(`<span class="chip">Outfit ${FMT(Math.abs(a["outfit space"]))}</span>`);
  return chips.join("");
}
function ocardHTML(o){
  const n=o.name.replace(/"/g,'&quot;');
  return `<div class="ocard" draggable="true" data-name="${n}">
      <div class="art">${artTile(o.thumbnail==="outfit/unknown"?null:o.thumbnail, mono2(o.name), CAT_COLOR[o.category]||'var(--dim)')}</div>
      <button class="addbtn" data-inc="${n}">+</button>
      <div class="meta">
        <b data-detail="${n}" title="${o.name}">${o.name}</b>
        <div class="chips">${statChips(o)}</div>
      </div>
    </div>`;
}
function renderCatalog(){
  const list=visibleOutfits().sort((a,b)=>{
    const ai=DATA.categoryOrder.indexOf(a.category), bi=DATA.categoryOrder.indexOf(b.category);
    return ai-bi || a.cost-b.cost || a.name.localeCompare(b.name);
  });
  const per=_fitCount("catalog",128,157,8), pages=Math.max(1,Math.ceil(list.length/per));
  state.catPage=_clampPage(state.catPage,pages);
  const pgi=list.slice(state.catPage*per,(state.catPage+1)*per);
  el("catalog").innerHTML = pgi.length? pgi.map(o=>ocardHTML(o)).join("")
    : `<div class="empty">No outfits match. Raise the tech access or clear the search.</div>`;
  el("catalogPager").innerHTML=_pg(state.catPage,pages);
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
  if(gunUse>0 && (hp.guns - installedOf(x=>x&&num(x.attributes["gun ports"])<0)) < delta*gunUse) return "No free Gun Ports";
  const turUse=-num(o.attributes["turret mounts"]);
  if(turUse>0 && (hp.turrets - installedOf(x=>x&&num(x.attributes["turret mounts"])<0)) < delta*turUse) return "No free Turret Mounts";
  // space / capacity limits are ship attributes -> use eff()
  const CAP={"outfit space":"Not enough Outfit Space","weapon capacity":"Not enough Weapon Capacity","engine capacity":"Not enough Engine Capacity","cargo space":"Not enough Cargo Space","fuel capacity":"Not enough Fuel Capacity"};
  const keys=new Set(Object.keys(CAP));
  // guard every capacity-like resource (ammo "* capacity", plus outfit/cargo space) from going negative
  for(const k in o.attributes){ if(o.attributes[k]<0 && /(capacity|space)$/.test(k)) keys.add(k); }
  for(const k of keys){
    const consume=num(o.attributes[k]);            // negative => consumes that resource
    if(consume>=0) continue;
    if(eff(k) + delta*consume < -1e-9) return CAP[k] || ("Not enough "+k.replace(/\b\w/g,c=>c.toUpperCase()));
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
    if(blocked){ beep(); showToast("Outfit Limit Reached \u2014 "+blocked); return; }
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
  state.fleetSel = -1;            // building a fresh hull: no longer editing a fleet member
  renderAll(); updateShipPickBtn();
}
function _idleEnergy(){ return eff("energy generation")+eff("solar collection")+eff("fuel energy")-eff("energy consumption")-eff("cooling energy"); }
function _idleHeat(){ const ce=coolingEfficiency(eff("cooling inefficiency")); return eff("heat generation")+eff("solar heat")+eff("fuel heat") - ce*(eff("cooling")+eff("active cooling")); }
function _eligibleOutfits(){ return Object.values(DATA.outfits).filter(o=>(state.showUnreleased||o.obtainable) && factionTier(o.faction)<=state.tier); }
function _perSpace(o,k){ const sp=Math.abs(num(o.attributes["outfit space"]))||1; const x=num(o.attributes[k]); return x>0?x/sp:-1; }
function _addBest(scoreFn){ let best=null,bs=0; for(const o of _eligibleOutfits()){ const sc=scoreFn(o); if(sc>0 && sc>bs && !limitBlocked(o,1)){ bs=sc; best=o; } } if(best){ state.installed[best.name]=(state.installed[best.name]||0)+1; return true; } return false; }
function _ensure(cond, scoreFn, cap){ let g=cap||80; while(g-->0 && !cond()){ if(!_addBest(scoreFn)) break; } }
function autoScore(o,kind){
  if(kind==="cargo") return _perSpace(o,"cargo space");
  if(kind==="crew")  return _perSpace(o,"bunks");
  return -1;
}
function _fillStep(kind){      // install one best-scoring outfit that still fits; false if none left
  let best=null,bs=0;
  for(const o of _eligibleOutfits()){ const sc=autoScore(o,kind); if(sc>0 && sc>bs && !limitBlocked(o,1)){ bs=sc; best=o; } }
  if(best){ state.installed[best.name]=(state.installed[best.name]||0)+1; return true; }
  return false;
}
function _expansionOutfit(){   // an outfit that trades cargo space for outfit space ("Outfits Expansion")
  let best=null,bs=0;
  for(const o of _eligibleOutfits()){ const os=num(o.attributes["outfit space"]), cs=num(o.attributes["cargo space"]);
    if(os>0 && cs<0){ const r=os/(-cs); if(r>bs){ bs=r; best=o; } } }
  return best;
}
function computeAutoFill(kind){
  state.installed={};
  // Engines only: just enough thrust + steering. We deliberately add NO reactor
  // and NO cooling - these presets maximise a single stat, so the hull is left
  // power-starved (it has engines but can't actually take off).
  _addBest(o=>_perSpace(o,"thrust"));
  _addBest(o=>_perSpace(o,"turn"));
  let guard=8000;
  while(guard-->0){
    if(_fillStep(kind)) continue;
    if(kind==="crew"){
      // outfit space is full; convert spare cargo into more outfit space via an
      // expansion (e.g. "Outfits Expansion": -20 cargo, +15 outfit space) so we
      // can keep stacking bunk rooms. Stop once there is no cargo left to trade.
      const exp=_expansionOutfit();
      if(exp && eff("cargo space")>=(-num(exp.attributes["cargo space"])) && !limitBlocked(exp,1)){
        state.installed[exp.name]=(state.installed[exp.name]||0)+1; continue;
      }
    }
    break;
  }
}
function loadLoadout(token){
  if(token==="empty"){ state.installed={}; }
  else if(token==="stock"){ state.installed={...(state.ship.defaultOutfits||{})}; }
  else if(token.startsWith("var:")){ const v=token.slice(4); state.installed={...(state.ship.variants[v]||{})}; }
  else if(token.startsWith("auto:")){ computeAutoFill(token.slice(5)); }
  state.loadoutName=token; renderAll();
}
function syncSelectedFleet(){
  // while a fleet ship is selected and you edit the same hull, write the edit
  // back to that fleet entry so its icon badges/totals reflect what you see.
  if(state.fleetSel<0 || state.fleetSel>=state.fleet.length) return;
  const e=state.fleet[state.fleetSel];
  if(!e || !state.ship || e.ship!==state.ship.name) return;
  e.outfits={...state.installed}; saveFleet();
}
function renderAll(){ syncSelectedFleet(); renderMeters(); renderShipCard(); renderLoadout(); renderCatalog(); renderFleet(); setPresetPressed(); }

/* ---------- fleet tracker (named fleets, persisted in localStorage) ---------- */
const FLEETS_KEY="drydock-fleets";
const OLD_FLEET_KEY="drydock-fleet";
const CREW_SALARY=100;   // credits/day per crew member; the flagship pilot is unpaid
function _blankFleets(){ return {active:"Fleet 1", fleets:{"Fleet 1":[]}}; }
function loadFleet(){
  let data=null; try{ data=JSON.parse(localStorage.getItem(FLEETS_KEY)); }catch(e){}
  if(!data || typeof data!=="object" || !data.fleets){
    let old=null; try{ old=JSON.parse(localStorage.getItem(OLD_FLEET_KEY)); }catch(e){}
    data=_blankFleets(); if(Array.isArray(old)&&old.length) data.fleets["Fleet 1"]=old;
  }
  state.fleets=data.fleets;
  state.fleetName=(data.active in state.fleets)?data.active:Object.keys(state.fleets)[0];
  if(!state.fleetName){ state.fleets={"Fleet 1":[]}; state.fleetName="Fleet 1"; }
  state.fleet=state.fleets[state.fleetName]; state.fleetSel=-1;
}
function saveFleet(){ try{ localStorage.setItem(FLEETS_KEY, JSON.stringify({active:state.fleetName, fleets:state.fleets})); }catch(e){} }
function setActiveFleetArr(arr){ state.fleets[state.fleetName]=arr; state.fleet=arr; }
function addToFleet(){ if(!state.ship) return; state.fleet.push({ship:state.ship.name, outfits:{...state.installed}}); state.fleetSel=state.fleet.length-1; saveFleet(); renderFleet(); showToast("Added to fleet ("+state.fleet.length+")"); }
function removeSelected(){ if(state.fleetSel<0||state.fleetSel>=state.fleet.length) return; state.fleet.splice(state.fleetSel,1); state.fleetSel=Math.min(state.fleetSel,state.fleet.length-1); saveFleet(); renderFleet(); }
function copySelected(){ if(state.fleetSel<0||state.fleetSel>=state.fleet.length) return; const e=state.fleet[state.fleetSel]; state.fleet.splice(state.fleetSel+1,0,{ship:e.ship,outfits:{...e.outfits},label:e.label}); state.fleetSel++; saveFleet(); renderFleet(); }
function clearFleet(){ state.fleet.length=0; state.fleetSel=-1; saveFleet(); renderFleet(); }
function setFlagship(){ if(state.fleetSel<0||state.fleetSel>=state.fleet.length) return; const cur=state.fleet[state.fleetSel]; const was=cur.flag; state.fleet.forEach(e=>{ delete e.flag; }); if(!was) cur.flag=true; saveFleet(); renderFleet(); }
function renameSelected(){ if(state.fleetSel<0||state.fleetSel>=state.fleet.length) return; const e=state.fleet[state.fleetSel]; const v=prompt("Label for this ship (blank to clear):", e.label||""); if(v==null) return; if(v.trim()) e.label=v.trim(); else delete e.label; saveFleet(); renderFleet(); }
function selectFleet(i){ const e=state.fleet[i]; if(!e) return; state.fleetSel=i;
  if(DATA.ships[e.ship]){ state.ship=DATA.ships[e.ship]; state.installed={...(e.outfits||{})}; state.loadoutName="fleet:"+i; renderAll(); updateShipPickBtn(); } else renderFleet(); }
/* ---- named-fleet management ---- */
function switchFleet(name){ if(!(name in state.fleets)) return; state.fleetName=name; state.fleet=state.fleets[name]; state.fleetSel=-1; saveFleet(); renderFleet(); }
function newFleet(){ let n=1; while(("Fleet "+n) in state.fleets) n++; const name=prompt("Name the new fleet:", "Fleet "+n); if(name==null) return; const nm=name.trim()||("Fleet "+n); if(!(nm in state.fleets)) state.fleets[nm]=[]; state.fleetName=nm; state.fleet=state.fleets[nm]; state.fleetSel=-1; saveFleet(); renderFleet(); }
function renameFleet(){ const cur=state.fleetName; const name=prompt("Rename fleet:", cur); if(name==null) return; const nm=name.trim(); if(!nm||nm===cur) return; if(nm in state.fleets){ showToast("A fleet with that name already exists"); return; } state.fleets[nm]=state.fleets[cur]; delete state.fleets[cur]; state.fleetName=nm; saveFleet(); renderFleet(); }
function deleteFleet(){ if(Object.keys(state.fleets).length<=1){ clearFleet(); return; } delete state.fleets[state.fleetName]; state.fleetName=Object.keys(state.fleets)[0]; state.fleet=state.fleets[state.fleetName]; state.fleetSel=-1; saveFleet(); renderFleet(); }
/* ---- per-build analysis ---- */
function _withBuild(e,fn){ const sShip=state.ship,sInst=state.installed; state.ship=DATA.ships[e.ship]; state.installed={...(e.outfits||{})}; let r; try{ r=fn(); } finally{ state.ship=sShip; state.installed=sInst; } return r; }
function buildDrive(e){ if(!DATA.ships[e.ship]) return null; return _withBuild(e,()=>{ if(eff("jump drive")>0) return "J"; if(eff("scram drive")>0) return "S"; if(eff("hyperdrive")>0) return "H"; return null; }); }
function buildDPS(e){ if(!DATA.ships[e.ship]) return 0; return _withBuild(e,()=>{ let d=0; for(const [nm,c] of Object.entries(state.installed)){ const w=DATA.outfits[nm]?.weapon; if(w&&w.reload) d+=c*(num(w["shield damage"])+num(w["hull damage"]))*60/w.reload; } return d; }); }
function buildIssue(e){ if(!DATA.ships[e.ship]) return null; return _withBuild(e,()=>{ const noThr=eff("thrust")<=0, noTurn=eff("turn")<=0;
  if(noThr||noTurn) return {lvl:"red", msg:[noThr?"No thrust":null,noTurn?"No steering":null].filter(Boolean).join(" & ")};
  const s=computeStats(); if(!s.energyOK||!s.heatOK){ const m=[]; if(!s.energyOK)m.push("run out of power"); if(!s.heatOK)m.push("overheat"); return {lvl:"yellow", msg:"Will "+m.join(" & ")}; }
  return null; }); }
function fleetTotals(){ let cost=0,crew=0,cargo=0,bunks=0,fuel=0,shields=0,hull=0,figBays=0,droBays=0,figCraft=0,droCraft=0,stranded=0,dps=0,allJump=true,cantThrust=0,cantSteer=0,cantPower=0,overheat=0,jumpsMin=Infinity,missingWeapons=0,noShields=0;
  for(const e of state.fleet){ const sh=DATA.ships[e.ship]; if(!sh) continue;
    const b=sh.hardpoints.bays||{}; figBays+=(b.Fighter||0); droBays+=(b.Drone||0);
    if(sh.category==="Fighter") figCraft++; else if(sh.category==="Drone") droCraft++;
    _withBuild(e,()=>{
      cost+=shipCost(); crew+=requiredCrew(); cargo+=eff("cargo space");
      bunks+=eff("bunks"); fuel+=eff("fuel capacity"); shields+=eff("shields"); hull+=eff("hull");
      if(eff("thrust")<=0) cantThrust++; if(eff("turn")<=0) cantSteer++;
      if(eff("shields")<=0) noShields++;
      if((sh.hardpoints.guns+sh.hardpoints.turrets)>0 && installedOf(o=>o&&(num(o.attributes["gun ports"])<0||num(o.attributes["turret mounts"])<0))===0) missingWeapons++;
      const st=computeStats(); if(!st.energyOK) cantPower++; if(!st.heatOK) overheat++;
      let dr=null; if(eff("jump drive")>0)dr="J"; else if(eff("scram drive")>0)dr="S"; else if(eff("hyperdrive")>0)dr="H";
      if(!dr) stranded++; if(dr!=="J") allJump=false;
      const jf=eff("jump fuel"); if(jf>0) jumpsMin=Math.min(jumpsMin, Math.floor(eff("fuel capacity")/jf));
      for(const [nm,c] of Object.entries(state.installed)){ const wp=DATA.outfits[nm]?.weapon; if(wp&&wp.reload) dps+=c*(num(wp["shield damage"])+num(wp["hull damage"]))*60/wp.reload; }
    }); }
  const bays=figBays+droBays, smallCraft=figCraft+droCraft, lackBay=Math.max(0,figCraft-figBays)+Math.max(0,droCraft-droBays);
  return {cost,crew,cargo,bunks,fuel,shields,hull,jumps:(isFinite(jumpsMin)?jumpsMin:0),daily:CREW_SALARY*Math.max(0,crew-1),n:state.fleet.length,bays,smallCraft,figBays,droBays,figCraft,droCraft,stranded,dps,cantThrust,cantSteer,cantPower,overheat,missingWeapons,noShields,lackBay,
    jumpMode: stranded?"strand":(allJump?"jump":"hyper")}; }
function renderFleetSelect(){ const box=el("fleetSavedList"); if(!box) return; box.innerHTML=Object.keys(state.fleets).map(n=>`<button class="fl-saveditem${n===state.fleetName?' active':''}" data-fleet-name="${n.replace(/"/g,'&quot;')}">${esc(n)}</button>`).join(""); }
function renderFleetDetail(){ const box=el("fleetDetail"); if(!box) return;
  const i=state.fleetSel;
  if(i<0||i>=state.fleet.length){ box.innerHTML=`<div class="fd-empty">Select a ship in the roster to see its details.</div>`; return; }
  const e=state.fleet[i]; const sh=DATA.ships[e.ship];
  if(!sh){ box.innerHTML=`<div class="fd-empty">Unknown ship: ${esc(e.ship)}</div>`; return; }
  const base=sh.displayName||sh.name; const X=String.fromCharCode(215), DS=String.fromCharCode(8211);
  let html="";
  _withBuild(e,()=>{
    const s=computeStats(); const hp=sh.hardpoints;
    const crew=requiredCrew(), bunks=eff("bunks"), mass=eff("mass");
    const guns=installedOf(o=>num(o.attributes["gun ports"])<0);
    const turrets=installedOf(o=>num(o.attributes["turret mounts"])<0);
    const totalBays=Object.values(hp.bays||{}).reduce((a,b)=>a+b,0);
    const C=n=>Math.round(n).toLocaleString();
    const row=(l,val,bad)=>`<div class="strow"><span class="lbl">${l}</span><span class="vals"><b class="val mono${bad?' bad':''}">${val}</b></span></div>`;
    const row2=(l,a,b)=>`<div class="strow"><span class="lbl">${l}</span><span class="vals"><b class="val mono en">${a}</b><b class="val mono ht">${b}</b></span></div>`;
    const cap=(l,key,unit)=>{ const c=capacity(key); return row(l, `${C(c.used)}/${C(c.total)}${unit||''}`, c.used>c.total+1e-6); };
    const hasThrust=eff("thrust")>0, hasTurn=eff("turn")>0;
    const pill=(lab,ok)=>`<span class="pill ${ok?'good':'bad'}">${lab} ${ok?String.fromCharCode(10003):String.fromCharCode(10007)}</span>`;
    const outs=Object.entries(state.installed).filter(([n,c])=>c>0).sort((a,b)=>b[1]-a[1]);
    const loadHTML = outs.length ? outs.map(([n,c])=>`<div class="fd-out"><span>${esc(DATA.outfits[n]?.displayName||n)}</span><b>${X}${c}</b></div>`).join("") : `<div class="fd-out fd-out-none">No outfits installed</div>`;
    html =
      `<div class="fd-head"><div class="fd-art">${artTile(sh.thumbnail||sh.sprite, mono2(base), "var(--accent)")}</div>`+
        `<div class="fd-id"><div class="fd-fac">${esc(FACLABEL(sh.faction))}</div><div class="fd-nm">${esc(e.label||base)}</div><div class="fd-cat">${esc(sh.category)}</div></div>`+
        `<button class="fd-rename" data-rename-ship title="Rename this ship in the fleet">Rename</button></div>`+
      `<div class="fd-cols"><div class="fd-sect">`+
        `<div class="eyebrow">Overview</div>`+
        row("Cost",MONEY(s.cost))+row("Crew",FMT(crew))+row("Bunks",FMT(bunks))+row("Cargo",FMT(s.cargo)+" t")+row("Fuel",FMT(s.fuel))+row("Mass",FMT(mass)+" t")+
        `<div class="eyebrow eb2">Movement &amp; Defense</div>`+
        row("Max speed",FMT(s.maxSpeed))+row("Acceleration",`${FMT(s.accel[0])}${DS}${FMT(s.accel[1])}`)+row("Turning",`${FMT(s.turn[0])}${DS}${FMT(s.turn[1])}`)+
        row("Shields",`${FMT(s.shields)}${s.hasSR?" +"+FMT(s.shieldRegen):""}`)+row("Hull",`${FMT(s.hull)}${s.hasHR?" +"+FMT(s.hullRepair):""}`)+
      `</div><div class="fd-sect">`+
        `<div class="eyebrow">Capacity</div>`+
        cap("Outfit","outfit space"," t")+cap("Weapon","weapon capacity"," t")+cap("Engine","engine capacity"," t")+
        row("Gun ports",`${guns}/${hp.guns}`,guns>hp.guns)+row("Turrets",`${turrets}/${hp.turrets}`,turrets>hp.turrets)+row("Bays",String(totalBays))+
        `<div class="eyebrow eb2">Energy &amp; Heat</div>`+
        row2("Idle",FMT(s.eh.idle[0]),FMT(s.eh.idle[1]))+row2("Moving",FMT(s.eh.moving[0]),FMT(s.eh.moving[1]))+row2("Firing",FMT(s.eh.firing[0]),FMT(s.eh.firing[1]))+row2("Net",FMT(s.eh.net[0]),FMT(s.eh.net[1]))+row2("Max",FMT(s.eh.max[0]),FMT(s.eh.max[1]))+
      `</div></div>`+
      `<div class="eyebrow eb2">Ship Alerts</div><div class="fd-alerts">`+pill("Thrust",hasThrust)+pill("Steering",hasTurn)+pill("Energy",s.energyOK)+pill("Heat",s.heatOK)+`</div>`+
      `<div class="fd-loadtitle eb2">Loadout</div><div class="fd-load">${loadHTML}</div>`;
  });
  box.innerHTML=html;
}
function renderFleet(){ const panel=el("fleetPanel"); if(!panel) return;
  renderFleetSelect();
  { const flag=state.fleet.find(e=>e.flag); const fb=el("flagshipBox");
    if(fb){ if(flag){ const sh=DATA.ships[flag.ship]; const base=sh?(sh.displayName||sh.name):flag.ship;
      fb.innerHTML=`<div class="fs-art">${artTile(sh?(sh.thumbnail||sh.sprite):null, mono2(base), "var(--accent)")}</div><div class="fs-name">${esc(flag.label||base)}</div>`; }
      else fb.innerHTML=`<div class="fs-none">No flagship set</div>`; } }
  const t=fleetTotals();
  el("fleetCount").innerHTML = t.n ? `<span class="fc-ships">${t.n} ship${t.n>1?"s":""}</span> · <span class="fc-cost">${MONEY(t.cost)} to buy</span>` : "";
  const fstat=(l,v)=>`<div class="fstat"><span>${l}</span><b>${v}</b></div>`;
  const cnum=n=> n>=1e6?(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,"")+"M" : n>=1e4?(n/1e3).toFixed(n>=1e5?0:1).replace(/\.0$/,"")+"K" : Math.round(n).toLocaleString();
  const dailyTxt = t.daily>=1000 ? (t.daily/1000).toFixed(t.daily>=1e5?0:1).replace(/\.0$/,"")+"K/day" : t.daily+"/day";
  el("fleetTotals").innerHTML =
    fstat("Cargo", cnum(t.cargo)+" t") +
    fstat("Crew", cnum(t.crew)) +
    fstat("Bunks", cnum(t.bunks)) +
    fstat("Jumps", FMT(t.jumps)) +
    fstat("Upkeep", dailyTxt) +
    fstat("Craft", `${t.smallCraft} / ${t.bays}`);
  const issue=(label,count,lvl,desc)=>`<div class="issue ${count>0?(lvl||"bad"):"ok"}" title="${desc}"><span>${label}</span><b>${count>0?count:"\u2713"}</b></div>`;
  el("fleetIssues").innerHTML =
    issue("Jump", t.stranded, "bad", "Ships with no working drive \u2014 can\u2019t leave the system") +
    issue("Power", t.cantPower, "warn", "Ships that run out of energy at idle (negative power)") +
    issue("Thrust", t.cantThrust, "bad", "Ships with no thruster \u2014 can\u2019t accelerate") +
    issue("Steer", t.cantSteer, "bad", "Ships with no steering \u2014 can\u2019t turn") +
    issue("Bays", t.lackBay, "bad", "Fighters/drones with no bay to dock in") +
    issue("Heat", t.overheat, "warn", "Ships that overheat while cruising") +
    issue("Weapons", t.missingWeapons, "warn", "Hulls that have weapon hardpoints but no weapons installed") +
    issue("Shields", t.noShields, "warn", "Ships with no shields");
  const list=el("fleetList");
  if(!state.fleet.length){ list.innerHTML=`<div class="fleet-empty">No ships yet. Build one and press “+ Add to Fleet”.</div>`; }
  else{ const _ord=state.fleet.map((e,i)=>i).sort((a,b)=>(state.fleet[b].flag?1:0)-(state.fleet[a].flag?1:0)); list.innerHTML = _ord.map(i=>{ const e=state.fleet[i]; const sh=DATA.ships[e.ship]; const base=sh?(sh.displayName||sh.name):e.ship; const nm=e.label||base;
      const dr=buildDrive(e), iss=buildIssue(e);
      const drB=dr?`<span class="fs-drive ${dr==="J"?"dj":"dg"}" title="${dr==="J"?"Jump drive":dr==="S"?"Scram drive":"Hyperdrive"}">${dr}</span>`:"";
      const wB=iss?`<span class="fs-warn ${iss.lvl}" title="${iss.msg}">⚠︎</span>`:"";
      return `<button class="fleet-ship${i===state.fleetSel?' sel':''}${e.flag?' flag':''}" data-fleet="${i}" title="${esc(base)}">`+
        `<span class="fs-art">${artTile(sh?(sh.thumbnail||sh.sprite):null, mono2(base), "var(--accent)")}${drB}${wB}</span>`+
        `<span class="fs-nm">${esc(nm)}</span></button>`; }).join(""); }
  const hasSel = state.fleetSel>=0 && state.fleetSel<state.fleet.length;
  el("fleetRemove").disabled=!hasSel; el("fleetCopy").disabled=!hasSel; el("fleetFlag").disabled=!hasSel;
  el("fleetClearBtn").disabled=!state.fleet.length; el("fleetShare").disabled=!state.fleet.length; renderFleetDetail(); }
/* ---- hover card ---- */
function fleetHoverShow(ev){ const b=ev.target.closest("[data-fleet]"); const box=el("fleetHover"); if(!box) return;
  if(!b){ box.classList.remove("show"); return; }
  const e=state.fleet[+b.dataset.fleet]; if(!e){ box.classList.remove("show"); return; }
  const sh=DATA.ships[e.ship]; const base=sh?(sh.displayName||sh.name):e.ship;
  let cost=0,crew=0,cargo=0; _withBuild(e,()=>{ cost=shipCost(); crew=requiredCrew(); cargo=eff("cargo space"); });
  const dps=buildDPS(e), dr=buildDrive(e), drT=dr==="J"?"Jump drive":dr==="S"?"Scram drive":dr==="H"?"Hyperdrive":"No drive";
  const row=(l,v)=>`<div class="fh-row"><span>${l}</span><b>${v}</b></div>`;
  box.innerHTML=`<div class="fh-nm">${esc(base)}${e.label?` <span style="color:var(--dim)">(${esc(e.label)})</span>`:""}${e.flag?" ★":""}</div>`+
    row("Cost",MONEY(cost))+row("Crew",FMT(crew))+row("Cargo",FMT(cargo)+" t")+row("Firepower",FMT(dps)+" dps")+row("Drive",drT);
  box.classList.add("show"); fleetHoverMove(ev); }
function fleetHoverMove(ev){ const box=el("fleetHover"); if(!box||!box.classList.contains("show")) return; const pad=14; let x=ev.clientX+pad,y=ev.clientY+pad; const w=box.offsetWidth,h=box.offsetHeight; if(x+w>window.innerWidth)x=ev.clientX-w-pad; if(y+h>window.innerHeight)y=ev.clientY-h-pad; box.style.left=x+"px"; box.style.top=y+"px"; }
function fleetHoverHide(ev){ const box=el("fleetHover"); const to=ev.relatedTarget; if(box && !(to&&to.closest&&to.closest("#fleetList"))) box.classList.remove("show"); }
function fleetToHash(){ try{ const payload={n:state.fleetName, s:state.fleet.map(e=>({s:e.ship,o:e.outfits,l:e.label,g:e.flag?1:0}))}; return "#f="+btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }catch(e){ return ""; } }
function shareFleet(){ if(!state.fleet.length){ showToast("Fleet is empty"); return; } const h=fleetToHash(); if(!h) return; const url=location.origin+location.pathname+h;
  try{ history.replaceState(null,"",h); }catch(e){}
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(()=>showToast("Fleet link copied"),()=>prompt("Copy this fleet link:",url)); } else prompt("Copy this fleet link:",url); }
function uniqueFleetName(base){ base=String(base||"").trim()||"Imported fleet"; if(!(base in state.fleets)) return base; let i=2; while((base+" "+i) in state.fleets) i++; return base+" "+i; }
function parseFleetCode(str){ if(!str) return null; const m=String(str).match(/f=([^&\s]+)/); const code=m?m[1]:String(str).trim();
  try{ const data=JSON.parse(decodeURIComponent(escape(atob(code))));
    const arr=Array.isArray(data)?data:(data&&Array.isArray(data.s)?data.s:null); if(!arr) return null;
    const ships=arr.filter(e=>e&&DATA.ships[e.s]).map(e=>({ship:e.s,outfits:e.o||{},label:e.l,flag:!!e.g}));
    return {name:(!Array.isArray(data)&&data.n)?String(data.n):null, ships}; }catch(e){} return null; }
function importFleet(){ const str=prompt("Paste a fleet link or code:"); if(str==null) return; const f=parseFleetCode(str);
  if(!f||!f.ships.length){ showToast("Couldn't read that fleet code"); return; }
  const name=uniqueFleetName(f.name||"Imported fleet"); state.fleets[name]=f.ships; state.fleetName=name; state.fleet=state.fleets[name]; state.fleetSel=-1; saveFleet(); renderFleet();
  showToast("Imported \""+name+"\" ("+f.ships.length+" ship"+(f.ships.length>1?"s":"")+")"); }

/* ---------- share (current build encoded in the URL hash) ---------- */
function buildToHash(){ try{ const payload={s:state.ship.name,o:state.installed,t:state.tier}; return "#b="+btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }catch(e){ return ""; } }
function shareBuild(){ const h=buildToHash(); if(!h) return; const url=location.origin+location.pathname+h;
  try{ history.replaceState(null,"",h); }catch(e){}
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(()=>showToast("Build link copied"),()=>prompt("Copy this build link:",url)); }
  else prompt("Copy this build link:",url); }
function shareBuildText(){ const h=buildToHash(); if(!h||!state.ship) return; const url=location.origin+location.pathname+h;
  try{ history.replaceState(null,"",h); }catch(e){}
  const nm=state.ship.displayName||state.ship.name;
  const msg="Check out my Endless Sky "+nm+" build on Drydock: "+url;
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(msg).then(()=>showToast("Share message copied"),()=>prompt("Copy this:",msg)); }
  else prompt("Copy this:",msg); }
function importBuild(){ const str=prompt("Paste a build link or code:"); if(str==null) return;
  let p=null; try{ const m=String(str).match(/b=([^&\s]+)/); const code=m?m[1]:String(str).trim(); p=JSON.parse(decodeURIComponent(escape(atob(code)))); }catch(e){}
  if(!(p&&p.s&&DATA.ships[p.s])){ showToast("Couldn’t read that build link"); return; }
  if(typeof p.t==="number"){ state.tier=p.t; document.querySelectorAll("#tierBtns button").forEach(x=>x.setAttribute("aria-pressed",+x.dataset.tier===p.t)); }
  state.ship=DATA.ships[p.s]; state.installed={}; for(const k in (p.o||{})){ if(DATA.outfits[k]) state.installed[k]=p.o[k]; }
  state.loadoutName="shared"; renderAll(); updateShipPickBtn(); showToast("Build imported"); }
function loadFromHash(){ const hash=location.hash||"";
  const fm=hash.match(/f=([^&]+)/);
  if(fm){ const f=parseFleetCode("f="+fm[1]); if(f&&f.ships.length){ const name=uniqueFleetName(f.name||"Imported fleet"); state.fleets[name]=f.ships; state.fleetName=name; state.fleet=state.fleets[name]; state.fleetSel=-1; saveFleet(); renderFleet(); } }
  const m=hash.match(/b=([^&]+)/); let okb=false;
  if(m){ try{ const p=JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    if(p&&p.s&&DATA.ships[p.s]){ if(typeof p.t==="number"){ state.tier=p.t; document.querySelectorAll("#tierBtns button").forEach(x=>x.setAttribute("aria-pressed",+x.dataset.tier===p.t)); }
      state.ship=DATA.ships[p.s]; state.installed={}; for(const k in (p.o||{})){ if(DATA.outfits[k]) state.installed[k]=p.o[k]; }
      state.loadoutName="shared"; renderAll(); updateShipPickBtn(); okb=true; } }catch(e){} }
  if(fm||m){ try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){} }
  return okb||!!fm; }

/* ---------- ship pickers (race -> model) ---------- */
const MODEL_RE=/^Model \d+/i;
function shipsByFaction(){
  const byFac={};
  for(const s of Object.values(DATA.ships)){
    if(!state.showUnreleased && !s.obtainable) continue;
    if(!s.thumbnail) continue;                                  // no photo -> hide from picker
    if(MODEL_RE.test(s.displayName||s.name)||MODEL_RE.test(s.name)) continue;  // "Model 8/16/.." automata
    (byFac[s.faction] ||= []).push(s);
  }
  return byFac;
}
function updateShipPickBtn(){
  const sh=state.ship; if(!sh||!el("spName")) return;
  el("spArt").innerHTML = artTile(sh.thumbnail||sh.sprite, mono2(sh.displayName||sh.name), "var(--accent)");
  el("spName").textContent = sh.displayName || sh.name;
  el("spMeta").textContent = FACLABEL(sh.faction)+" · "+sh.category;
}
/* ship-picker open/close handled by the panel system (openPanel/closePanels) */
function renderPickerFac(){
  const byFac=shipsByFaction();
  const facOrder=Object.keys(byFac).sort((a,b)=>factionTier(a)-factionTier(b)||a.localeCompare(b));
  const total=Object.values(byFac).reduce((a,b)=>a+b.length,0);
  const items=[{f:"all",label:`All (${total})`}].concat(facOrder.map(f=>({f,label:`${FACLABEL(f)} (${byFac[f].length})`})));
  el("pickerFac").innerHTML=items.map(it=>`<button class="fchip" data-fac="${it.f}" aria-pressed="${state.pickerFac===it.f}">${it.label}</button>`).join("");
  if(el("pickerFacPager")) el("pickerFacPager").innerHTML="";
}
function renderPickerGrid(){
  const byFac=shipsByFaction();
  let list=[];
  for(const f in byFac){ if(state.pickerFac==='all'||state.pickerFac===f) list.push(...byFac[f]); }
  const q=(state.pickerQ||"").toLowerCase();
  if(q) list=list.filter(s=>(s.displayName||s.name).toLowerCase().includes(q)||s.name.toLowerCase().includes(q));
  list.sort((a,b)=> a.category.localeCompare(b.category) || (a.displayName||a.name).localeCompare(b.displayName||b.name));
  const per=_fitCount("pickerGrid",128,140,12), pages=Math.max(1,Math.ceil(list.length/per));
  state.pickPage=_clampPage(state.pickPage,pages);
  const pgi=list.slice(state.pickPage*per,(state.pickPage+1)*per);
  el("pickerGrid").innerHTML = pgi.length ? pgi.map(shipcellHTML).join("") : `<div class="empty">No ships match.</div>`;
  el("pickerGridPager").innerHTML=_pg(state.pickPage,pages);
}
function shipcellHTML(s){
  return `<button class="shipcell ${state.ship&&state.ship.name===s.name?'sel':''}" draggable="true" data-ship="${s.name.replace(/"/g,'&quot;')}" title="${s.displayName||s.name}">
      <div class="sc-art">${artTile(s.thumbnail||s.sprite, mono2(s.displayName||s.name), "var(--accent)")}</div>
      <div class="sc-nm">${s.displayName||s.name}</div>
      <div class="sc-cat">${s.category}</div>
    </button>`;
}
/* ---------- Outfitters / Shipyards (browse by station) ---------- */
let _shopMap=null,_yardMap=null;
function _stKey(loc){ return (loc.planet||"?")+"  \u00b7  "+(loc.system||"?"); }
function stLabel(k){ const m=k.split(/\s+·\s+/); if(m.length<2) return k;
  return `<b class="st-pl">${m[0]}</b><span class="st-sy"> · ${m.slice(1).join(" · ")}</span>`; }
function buildShopMap(){ if(_shopMap) return _shopMap; _shopMap={};
  for(const o of Object.values(DATA.outfits)){ if(!o.thumbnail) continue; for(const loc of (o.soldAt||[])){ const k=_stKey(loc); (_shopMap[k]=_shopMap[k]||[]).push(o); } } return _shopMap; }
function buildYardMap(){ if(_yardMap) return _yardMap; _yardMap={};
  for(const s of Object.values(DATA.ships)){ if(!s.thumbnail) continue; for(const loc of (s.soldAt||[])){ const k=_stKey(loc); (_yardMap[k]=_yardMap[k]||[]).push(s); } } return _yardMap; }
function renderShop(){
  const map=buildShopMap(), elig=o=>(state.showUnreleased||o.obtainable)&&factionTier(o.faction)<=state.tier;
  const q=(state.shopQ||"").toLowerCase();
  let st=Object.keys(map).filter(k=>map[k].some(elig)); if(q) st=st.filter(k=>k.toLowerCase().includes(q)); st.sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base"}));
  if(!st.includes(state.shopStation)) state.shopStation=st[0]||"";
  const PER=25, sPages=Math.max(1,Math.ceil(st.length/PER));
  state.shopPage=Math.min(Math.max(0,state.shopPage|0),sPages-1);
  const sPager=st.length>PER?`<div class="sp-pager"><button data-pg="prev"${state.shopPage<=0?" disabled":""}>‹ Prev</button><span>${state.shopPage+1} / ${sPages}</span><button data-pg="next"${state.shopPage>=sPages-1?" disabled":""}>Next ›</button></div>`:"";
  const sPage=st.slice(state.shopPage*PER,(state.shopPage+1)*PER);
  el("shopRail").innerHTML = st.length? sPager+sPage.map(k=>`<button data-station="${k.replace(/"/g,'&quot;')}" title="${k.replace(/"/g,'&quot;')}" aria-pressed="${k===state.shopStation}">${stLabel(k)}</button>`).join("") : `<div class="empty">No stations match.</div>`;
  const items=(map[state.shopStation]||[]).filter(elig).sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name));
  el("shopGrid").innerHTML = items.length? items.map(o=>ocardHTML(o)).join("") : `<div class="empty">Nothing here at this tech level.</div>`;
}
function renderYard(){
  const map=buildYardMap(), elig=s=>(state.showUnreleased||s.obtainable)&&factionTier(s.faction)<=state.tier;
  const q=(state.yardQ||"").toLowerCase();
  let st=Object.keys(map).filter(k=>map[k].some(elig)); if(q) st=st.filter(k=>k.toLowerCase().includes(q)); st.sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base"}));
  if(!st.includes(state.yardStation)) state.yardStation=st[0]||"";
  const PER=25, yPages=Math.max(1,Math.ceil(st.length/PER));
  state.yardPage=Math.min(Math.max(0,state.yardPage|0),yPages-1);
  const yPager=st.length>PER?`<div class="sp-pager"><button data-pg="prev"${state.yardPage<=0?" disabled":""}>‹ Prev</button><span>${state.yardPage+1} / ${yPages}</span><button data-pg="next"${state.yardPage>=yPages-1?" disabled":""}>Next ›</button></div>`:"";
  const yPage=st.slice(state.yardPage*PER,(state.yardPage+1)*PER);
  el("yardRail").innerHTML = st.length? yPager+yPage.map(k=>`<button data-station="${k.replace(/"/g,'&quot;')}" title="${k.replace(/"/g,'&quot;')}" aria-pressed="${k===state.yardStation}">${stLabel(k)}</button>`).join("") : `<div class="empty">No stations match.</div>`;
  const ships=(map[state.yardStation]||[]).filter(elig).sort((a,b)=>(a.attributes.cost||0)-(b.attributes.cost||0)||(a.displayName||a.name).localeCompare(b.displayName||b.name));
  el("yardGrid").innerHTML = ships.length? ships.map(shipcellHTML).join("") : `<div class="empty">No ships sold here at this tech level.</div>`;
}

function setTheme(t){
  document.body.dataset.theme=t;
  try{ localStorage.setItem("drydock-theme",t); }catch(e){}
  document.querySelectorAll("#themeBtns button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.theme===t));
}
function openPanel(name){
  document.body.dataset.panel = name;
  if(name==="ship"){ renderPickerFac(); renderPickerGrid(); const ps=el("pickerSearch"); if(ps){ ps.value=state.pickerQ||""; setTimeout(()=>ps.focus(),30); } }
  else if(name==="shop"){ renderShop(); }
  else if(name==="yard"){ renderYard(); }
  try{ localStorage.setItem("drydock-panel", name); }catch(e){}
}
function closePanels(){ delete document.body.dataset.panel; try{ localStorage.setItem("drydock-panel",""); }catch(e){} }
function togglePanel(name){ if(document.body.dataset.panel===name) closePanels(); else openPanel(name); }
function openShipPicker(){ togglePanel("ship"); }
function closeShipPicker(){ closePanels(); }
function setView(v){ document.body.dataset.view=v; try{localStorage.setItem("drydock-view",v);}catch(e){} mountFleet(); if(v==="fleet") renderFleet(); if(v==="ship") requestAnimationFrame(()=>{ renderLoadout(); if(state.dock==="ship"){renderPickerFac();renderPickerGrid();}else if(state.dock==="fleet"){renderFleet();}else{renderCatbar();renderCatalog();} }); }
function mountFleet(){ const fp=el("fleetPanel"); if(!fp) return; const target=(document.body.dataset.view==="ship" && state.dock==="fleet") ? el("dockFleetPane") : el("viewFleetSec"); if(target && fp.parentElement!==target) target.appendChild(fp); }
function setDock(d){ state.dock=d;
  ["parts","ship","fleet"].forEach(k=>{ const pane=el("dock"+k.charAt(0).toUpperCase()+k.slice(1)+"Pane"); if(pane) pane.classList.toggle("show",k===d); const tab=el("dock"+k.charAt(0).toUpperCase()+k.slice(1)+"Tab"); if(tab) tab.setAttribute("aria-pressed",k===d); });
  mountFleet();
  requestAnimationFrame(()=>{ if(d==="parts"){ renderPartsFac(); renderCatbar(); renderCatalog(); } else if(d==="ship"){ renderPickerFac(); renderPickerGrid(); } else { renderFleet(); } });
  try{localStorage.setItem("drydock-dock",d);}catch(e){} }
function fitApp(){ const a=el("app"); if(!a) return; const vw=window.innerWidth, vh=window.innerHeight;
  if(vw>=1101){ a.style.width="1600px"; a.style.height="900px"; a.style.zoom=Math.min(vw/1600, vh/900); }
  else { a.style.width=""; a.style.height=""; a.style.zoom=""; }
}
window.addEventListener("resize",fitApp);
try{ if(window.ResizeObserver){ const _ro=new ResizeObserver(()=>{ if(state.ship) fitShipName(); }); const _st=document.querySelector(".shiptitle"); if(_st) _ro.observe(_st); } }catch(e){}
function init(){
  fitApp();
  el("ver").textContent=DATA.version;
  let su=null; try{ su=localStorage.getItem("drydock-unreleased"); }catch(e){}
  state.showUnreleased = su==="1";
  el("unrelBtn").setAttribute("aria-pressed", state.showUnreleased);
  renderCatbar(); renderPartsFac();
  loadFleet();
  const def = DATA.ships["Bactrian"]||DATA.ships["Falcon"]||DATA.ships["Leviathan"]||Object.values(DATA.ships)[0];
  setShip(def.name);
  document.querySelectorAll("#tierBtns button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.tier==="0"));
  let savedTheme=null; try{ savedTheme=localStorage.getItem("drydock-theme"); }catch(e){}
  setTheme(savedTheme||"blue");

  el("pickerSearch").addEventListener("input",e=>{ state.pickerQ=e.target.value; state.pickPage=0; renderPickerGrid(); });
  el("pickerFac").addEventListener("click",e=>{const b=e.target.closest("[data-fac]");if(!b)return;state.pickerFac=b.dataset.fac;state.pickPage=0;renderPickerFac();renderPickerGrid();});
  el("pickerGrid").addEventListener("click",e=>{const b=e.target.closest("[data-ship]");if(!b)return;setShip(b.dataset.ship);});
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closePanels(); el("settings").classList.remove("open"); el("drawer").classList.remove("open"); } });
  el("variants").addEventListener("click",e=>{const b=e.target.closest("[data-load]");if(!b)return;loadLoadout(b.dataset.load);});
  el("presetGrid").addEventListener("click",e=>{const b=e.target.closest("[data-load]");if(!b)return;loadLoadout(b.dataset.load);});
  el("fleetAddBtn").addEventListener("click",addToFleet);
  el("shareTop").addEventListener("click",shareBuildText);
  el("shareBuildBtn").addEventListener("click",shareBuild);
  el("importBuildBtn").addEventListener("click",importBuild);
  el("fleetList").addEventListener("click",e=>{const b=e.target.closest("[data-fleet]");if(b)selectFleet(+b.dataset.fleet);});
  el("fleetList").addEventListener("dblclick",e=>{const b=e.target.closest("[data-fleet]");if(b){state.fleetSel=+b.dataset.fleet;renameSelected();}});
  el("fleetDetail").addEventListener("click",e=>{ if(e.target.closest("[data-rename-ship]")) renameSelected(); });
  el("fleetList").addEventListener("mouseover",fleetHoverShow);
  el("fleetList").addEventListener("mousemove",fleetHoverMove);
  el("fleetList").addEventListener("mouseout",fleetHoverHide);
  el("fleetRemove").addEventListener("click",removeSelected);
  el("fleetCopy").addEventListener("click",copySelected);
  el("fleetFlag").addEventListener("click",setFlagship);
  el("fleetClearBtn").addEventListener("click",clearFleet);
  el("fleetShare").addEventListener("click",shareFleet);
  el("fleetImport").addEventListener("click",importFleet);
  el("fleetSavedList").addEventListener("click",e=>{const b=e.target.closest("[data-fleet-name]");if(b)switchFleet(b.dataset.fleetName);});
  el("fleetNew").addEventListener("click",newFleet);
  el("fleetRenameF").addEventListener("click",renameFleet);
  el("fleetDelete").addEventListener("click",deleteFleet);
  el("themeBtns").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;setTheme(b.dataset.theme);});
  el("unrelBtn").addEventListener("click",()=>{
    state.showUnreleased=!state.showUnreleased;
    try{ localStorage.setItem("drydock-unreleased", state.showUnreleased?"1":"0"); }catch(e){}
    el("unrelBtn").setAttribute("aria-pressed", state.showUnreleased);
    renderPartsFac(); renderCatbar(); renderCatalog(); renderPickerFac(); renderPickerGrid(); if(document.body.dataset.panel==="shop")renderShop(); if(document.body.dataset.panel==="yard")renderYard();
  });
  el("viewShip").addEventListener("click",()=>setView("ship"));
  el("viewFleet").addEventListener("click",()=>setView("fleet"));
  el("viewInfo").addEventListener("click",()=>setView("info"));
  el("dockPartsTab").addEventListener("click",()=>setDock("parts"));
  el("dockShipTab").addEventListener("click",()=>setDock("ship"));
  el("dockFleetTab").addEventListener("click",()=>setDock("fleet"));
  el("openOutfitters").addEventListener("click",()=>openPanel("shop"));
  el("openShipyards").addEventListener("click",()=>openPanel("yard"));
  el("shopClose").addEventListener("click",closePanels);
  el("yardClose").addEventListener("click",closePanels);
  el("shopRail").addEventListener("click",e=>{const pg=e.target.closest("[data-pg]");if(pg){state.shopPage+=pg.dataset.pg==="next"?1:-1;renderShop();return;}const b=e.target.closest("[data-station]");if(b){state.shopStation=b.dataset.station;renderShop();}});
  el("yardRail").addEventListener("click",e=>{const pg=e.target.closest("[data-pg]");if(pg){state.yardPage+=pg.dataset.pg==="next"?1:-1;renderYard();return;}const b=e.target.closest("[data-station]");if(b){state.yardStation=b.dataset.station;renderYard();}});
  el("yardGrid").addEventListener("click",e=>{const b=e.target.closest("[data-ship]");if(b){setShip(b.dataset.ship);renderYard();}});
  el("shopSearch").addEventListener("input",e=>{state.shopQ=e.target.value;state.shopPage=0;renderShop();});
  el("yardSearch").addEventListener("input",e=>{state.yardQ=e.target.value;state.yardPage=0;renderYard();});
  el("catalogPager").addEventListener("click",e=>{const b=e.target.closest("[data-pg]");if(b){state.catPage+=b.dataset.pg==="next"?1:-1;renderCatalog();}});
  el("catbarPager").addEventListener("click",e=>{const b=e.target.closest("[data-pg]");if(b){state.catbarPage+=b.dataset.pg==="next"?1:-1;renderCatbar();}});
  el("pickerGridPager").addEventListener("click",e=>{const b=e.target.closest("[data-pg]");if(b){state.pickPage+=b.dataset.pg==="next"?1:-1;renderPickerGrid();}});
  el("pickerFacPager").addEventListener("click",e=>{const b=e.target.closest("[data-pg]");if(b){state.pickFacPage+=b.dataset.pg==="next"?1:-1;renderPickerFac();}});
  { let sv=null; try{ sv=localStorage.getItem("drydock-view"); }catch(e){} setView(sv==="fleet"||sv==="info"?sv:"ship"); }
  { let sd=null; try{ sd=localStorage.getItem("drydock-dock"); }catch(e){} setDock(sd==="ship"||sd==="fleet"?sd:"parts"); }
  el("tierBtns").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    state.tier=+b.dataset.tier;
    document.querySelectorAll("#tierBtns button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    renderPartsFac(); renderCatbar(); renderCatalog(); renderPickerFac(); renderPickerGrid();
    if(document.body.dataset.panel==="shop")renderShop(); if(document.body.dataset.panel==="yard")renderYard();});
  el("search").addEventListener("input",e=>{state.q=e.target.value;state.catPage=0;renderCatalog();});
  el("catbar").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; state.catPage=0;
    if(b.classList.contains("subrow")){ state.cat=b.dataset.cat; state.series=b.dataset.series; renderCatbar(); renderCatalog(); return; }
    if(b.dataset.cat===""){ state.cat=""; state.series="All"; state.openCat=""; renderCatbar(); renderCatalog(); return; }
    const c=b.dataset.cat; state.openCat=(state.openCat===c?"":c); state.cat=c; state.series="All"; renderCatbar(); renderCatalog(); });
  document.body.addEventListener("click",e=>{
    const inc=e.target.closest("[data-inc]"), dec=e.target.closest("[data-dec]"), det=e.target.closest("[data-detail]");
    if(inc){ add(inc.dataset.inc, +1); }
    else if(dec){ add(dec.dataset.dec, -1); }
    else if(det){ openDetail(det.dataset.detail); }
  });
  el("drawerX").addEventListener("click",()=>el("drawer").classList.remove("open"));
  el("drawer").addEventListener("click",e=>{ if(e.target===el("drawer")) el("drawer").classList.remove("open"); });
  el("gearBtn").addEventListener("click",e=>{ e.stopPropagation(); el("settings").classList.toggle("open"); });
  document.addEventListener("click",e=>{ if(el("settings").classList.contains("open") && !e.target.closest("#settings") && !e.target.closest("#gearBtn")) el("settings").classList.remove("open"); });

  el("panelScrim").addEventListener("click",closePanels);
  document.body.addEventListener("dragstart",e=>{ const oc=e.target.closest('.ocard'), sc=e.target.closest('.shipcell'); if(oc){ e.dataTransfer.setData("text/plain","o:"+oc.dataset.name); document.body.classList.add("dnd"); } else if(sc){ e.dataTransfer.setData("text/plain","s:"+sc.dataset.ship); document.body.classList.add("dnd"); } });
  document.body.addEventListener("dragend",()=>document.body.classList.remove("dnd"));
  document.addEventListener("dragover",e=>{ if(document.body.classList.contains("dnd") && !e.target.closest('.se-dock')) e.preventDefault(); });
  document.addEventListener("drop",e=>{ if(!document.body.classList.contains("dnd")) return; document.body.classList.remove("dnd"); if(e.target.closest('.se-dock')) return; e.preventDefault(); const d=e.dataTransfer.getData("text/plain"); if(!d) return; if(d[0]==="o"){ const nm=d.slice(2); if(DATA.outfits[nm]) add(nm,1); } else if(d[0]==="s"){ const nm=d.slice(2); if(DATA.ships[nm]) setShip(nm); } });
  loadFromHash();
  setTimeout(()=>{ if(!state.ship)return; if(state.dock==="ship"){renderPickerFac();renderPickerGrid();}else{renderCatbar();renderCatalog();} renderLoadout(); },60);
}
let _rz=null;
window.addEventListener("resize",()=>{ clearTimeout(_rz); _rz=setTimeout(()=>{ if(!state.ship)return; renderShipCard(); renderLoadout(); if(state.dock==="ship"){renderPickerFac();renderPickerGrid();}else{renderCatbar();renderCatalog();} },160); });
init();
