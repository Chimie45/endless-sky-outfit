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

let state = { ship:null, installed:{}, tier:0, cat:"All", q:"", view:"schem", loadoutName:"empty", showUnreleased:false, pickerFac:"all", pickerQ:"", fleet:[], fleetSel:-1 };

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
    (totalBays?row("Bays",v(String(totalBays))):"");
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
  const crew=requiredCrew(), bunks=eff("bunks");
  const row=(l,val)=>`<div class="strow"><span class="lbl">${l}</span><span class="vals"><b class="val mono">${val}</b></span></div>`;
  el("quickStats").innerHTML = row("Cost",MONEY(s.cost))+row("Crew",`${FMT(crew)} / ${FMT(bunks)}`)+row("Cargo",FMT(s.cargo)+" t")+row("Fuel",FMT(s.fuel));
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
function shortVariant(v){
  let t=v;
  for(const pre of [state.ship.displayName, state.ship.name]){ if(pre && t.startsWith(pre)) t=t.slice(pre.length); }
  t=t.replace(/^[\s(]+/,'').replace(/[)\s]+$/,'').trim();
  return t || v;
}
function renderVariants(){
  const ship = state.ship;
  const vnames = Object.keys(ship.variants||{});
  if(!vnames.length){ el("variants").innerHTML = `<span class="novar">No factory variants</span>`; return; }
  el("variants").innerHTML = vnames.map(v=>
    `<button class="vchip" data-load="var:${v.replace(/"/g,'&quot;')}" aria-pressed="${state.loadoutName==='var:'+v}" title="${v}">${shortVariant(v)}</button>`).join("");
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
  const wrap=t=>{ if(t.length<=15) return [t]; const w=t.split(' '); let p='',q=''; for(const x of w){ if(!q && (p?p+' '+x:x).length<=15) p=p?p+' '+x:x; else q=q?q+' '+x:x; } if(!q) return [p]; if(q.length>16) q=q.slice(0,15)+'…'; return [p,q]; };
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
     lab+=`<text x="${l.lx}" y="${y0}" text-anchor="${l.anchor}" font-size="9.5" fill="${l.lit?'var(--bright)':'var(--dim)'}">`+lines.map((ln,i)=>`<tspan x="${l.lx}" dy="${i?10:0}">${ln}</tspan>`).join('')+`</text>`;}
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
  const CAP={"outfit space":"outfit space","weapon capacity":"weapon capacity","engine capacity":"engine capacity","cargo space":"cargo space","fuel capacity":"fuel capacity"};
  const keys=new Set(Object.keys(CAP));
  // guard every capacity-like resource (ammo "* capacity", plus outfit/cargo space) from going negative
  for(const k in o.attributes){ if(o.attributes[k]<0 && /(capacity|space)$/.test(k)) keys.add(k); }
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
function renderFleetSelect(){ const sel=el("fleetSelect"); if(!sel) return; sel.innerHTML=Object.keys(state.fleets).map(n=>`<option value="${n.replace(/"/g,'&quot;')}"${n===state.fleetName?" selected":""}>${n}</option>`).join(""); }
function renderFleet(){ const panel=el("fleetPanel"); if(!panel) return;
  renderFleetSelect();
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
    fstat("Cost", dailyTxt) +
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
  else{ list.innerHTML = state.fleet.map((e,i)=>{ const sh=DATA.ships[e.ship]; const base=sh?(sh.displayName||sh.name):e.ship; const nm=e.label||base;
      const dr=buildDrive(e), iss=buildIssue(e);
      const drB=dr?`<span class="fs-drive ${dr==="J"?"dj":"dg"}" title="${dr==="J"?"Jump drive":dr==="S"?"Scram drive":"Hyperdrive"}">${dr}</span>`:"";
      const wB=iss?`<span class="fs-warn ${iss.lvl}" title="${iss.msg}">⚠︎</span>`:"";
      return `<button class="fleet-ship${i===state.fleetSel?' sel':''}${e.flag?' flag':''}" data-fleet="${i}" title="${base}">`+
        `<span class="fs-art">${artTile(sh?(sh.thumbnail||sh.sprite):null, mono2(base), "var(--accent)")}${drB}${wB}</span>`+
        `<span class="fs-nm">${nm}</span></button>`; }).join(""); }
  const hasSel = state.fleetSel>=0 && state.fleetSel<state.fleet.length;
  el("fleetRemove").disabled=!hasSel; el("fleetCopy").disabled=!hasSel; el("fleetFlag").disabled=!hasSel;
  el("fleetClearBtn").disabled=!state.fleet.length; el("fleetShare").disabled=!state.fleet.length; }
/* ---- hover card ---- */
function fleetHoverShow(ev){ const b=ev.target.closest("[data-fleet]"); const box=el("fleetHover"); if(!box) return;
  if(!b){ box.classList.remove("show"); return; }
  const e=state.fleet[+b.dataset.fleet]; if(!e){ box.classList.remove("show"); return; }
  const sh=DATA.ships[e.ship]; const base=sh?(sh.displayName||sh.name):e.ship;
  let cost=0,crew=0,cargo=0; _withBuild(e,()=>{ cost=shipCost(); crew=requiredCrew(); cargo=eff("cargo space"); });
  const dps=buildDPS(e), dr=buildDrive(e), drT=dr==="J"?"Jump drive":dr==="S"?"Scram drive":dr==="H"?"Hyperdrive":"No drive";
  const row=(l,v)=>`<div class="fh-row"><span>${l}</span><b>${v}</b></div>`;
  box.innerHTML=`<div class="fh-nm">${base}${e.label?` <span style="color:var(--dim)">(${e.label})</span>`:""}${e.flag?" ★":""}</div>`+
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
  const sh=state.ship; if(!sh) return;
  el("spArt").innerHTML = artTile(sh.thumbnail||sh.sprite, mono2(sh.displayName||sh.name), "var(--accent)");
  el("spName").textContent = sh.displayName || sh.name;
  el("spMeta").textContent = FACLABEL(sh.faction)+" · "+sh.category;
}
function openShipPicker(){ renderPickerFac(); renderPickerGrid(); el("shipPicker").classList.add("open"); const ps=el("pickerSearch"); if(ps){ps.value=state.pickerQ||"";setTimeout(()=>ps.focus(),30);} }
function closeShipPicker(){ el("shipPicker").classList.remove("open"); }
function renderPickerFac(){
  const byFac=shipsByFaction();
  const facOrder=Object.keys(byFac).sort((a,b)=>factionTier(a)-factionTier(b)||a.localeCompare(b));
  const total=Object.values(byFac).reduce((a,b)=>a+b.length,0);
  let html=`<button class="fchip" data-fac="all" aria-pressed="${state.pickerFac==='all'}">All (${total})</button>`;
  for(const fobj of facOrder) html+=`<button class="fchip" data-fac="${fobj}" aria-pressed="${state.pickerFac===fobj}">${FACLABEL(fobj)} (${byFac[fobj].length})</button>`;
  el("pickerFac").innerHTML=html;
}
function renderPickerGrid(){
  const byFac=shipsByFaction();
  let list=[];
  for(const f in byFac){ if(state.pickerFac==='all'||state.pickerFac===f) list.push(...byFac[f]); }
  const q=(state.pickerQ||"").toLowerCase();
  if(q) list=list.filter(s=>(s.displayName||s.name).toLowerCase().includes(q)||s.name.toLowerCase().includes(q));
  list.sort((a,b)=> a.category.localeCompare(b.category) || (a.displayName||a.name).localeCompare(b.displayName||b.name));
  el("pickerGrid").innerHTML = list.length ? list.map(s=>`
    <button class="shipcell ${state.ship&&state.ship.name===s.name?'sel':''}" data-ship="${s.name.replace(/"/g,'&quot;')}" title="${s.displayName||s.name}">
      <div class="sc-art">${artTile(s.thumbnail||s.sprite, mono2(s.displayName||s.name), "var(--accent)")}</div>
      <div class="sc-nm">${s.displayName||s.name}</div>
      <div class="sc-cat">${s.category}</div>
    </button>`).join("") : `<div class="empty">No ships match.</div>`;
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
  renderCatbar();
  loadFleet();
  const def = DATA.ships["Bactrian"]||DATA.ships["Falcon"]||DATA.ships["Leviathan"]||Object.values(DATA.ships)[0];
  setShip(def.name);
  document.querySelectorAll("#tierBtns button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.tier==="0"));
  let savedTheme=null; try{ savedTheme=localStorage.getItem("drydock-theme"); }catch(e){}
  setTheme(savedTheme||"blue");

  el("shipPickBtn").addEventListener("click",openShipPicker);
  el("pickerX").addEventListener("click",closeShipPicker);
  el("shipPicker").addEventListener("click",e=>{ if(e.target===el("shipPicker")) closeShipPicker(); });
  el("pickerSearch").addEventListener("input",e=>{ state.pickerQ=e.target.value; renderPickerGrid(); });
  el("pickerFac").addEventListener("click",e=>{const b=e.target.closest("[data-fac]");if(!b)return;state.pickerFac=b.dataset.fac;renderPickerFac();renderPickerGrid();});
  el("pickerGrid").addEventListener("click",e=>{const b=e.target.closest("[data-ship]");if(!b)return;setShip(b.dataset.ship);closeShipPicker();});
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeShipPicker(); el("settings").classList.remove("open"); el("drawer").classList.remove("open"); } });
  el("variants").addEventListener("click",e=>{const b=e.target.closest("[data-load]");if(!b)return;loadLoadout(b.dataset.load);});
  el("presetGrid").addEventListener("click",e=>{const b=e.target.closest("[data-load]");if(!b)return;loadLoadout(b.dataset.load);});
  el("fleetAddBtn").addEventListener("click",addToFleet);
  el("shareBtn").addEventListener("click",shareBuild);
  el("fleetList").addEventListener("click",e=>{const b=e.target.closest("[data-fleet]");if(b)selectFleet(+b.dataset.fleet);});
  el("fleetList").addEventListener("dblclick",e=>{const b=e.target.closest("[data-fleet]");if(b){state.fleetSel=+b.dataset.fleet;renameSelected();}});
  el("fleetList").addEventListener("mouseover",fleetHoverShow);
  el("fleetList").addEventListener("mousemove",fleetHoverMove);
  el("fleetList").addEventListener("mouseout",fleetHoverHide);
  el("fleetRemove").addEventListener("click",removeSelected);
  el("fleetCopy").addEventListener("click",copySelected);
  el("fleetFlag").addEventListener("click",setFlagship);
  el("fleetClearBtn").addEventListener("click",clearFleet);
  el("fleetShare").addEventListener("click",shareFleet);
  el("fleetImport").addEventListener("click",importFleet);
  el("fleetSelect").addEventListener("change",e=>switchFleet(e.target.value));
  el("fleetNew").addEventListener("click",newFleet);
  el("fleetRenameF").addEventListener("click",renameFleet);
  el("fleetDelete").addEventListener("click",deleteFleet);
  el("themeBtns").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;setTheme(b.dataset.theme);});
  el("unrelBtn").addEventListener("click",()=>{
    state.showUnreleased=!state.showUnreleased;
    try{ localStorage.setItem("drydock-unreleased", state.showUnreleased?"1":"0"); }catch(e){}
    el("unrelBtn").setAttribute("aria-pressed", state.showUnreleased);
    if(el("shipPicker").classList.contains("open")){ renderPickerFac(); renderPickerGrid(); } renderCatalog();
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
  loadFromHash();
}
let _rz=null;
window.addEventListener("resize",()=>{ clearTimeout(_rz); _rz=setTimeout(()=>{ if(state.ship) renderShipCard(); },150); });
init();
