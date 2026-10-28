/* Gameboys Emulator — desktop library overview.
   Uses the already-loaded game catalog; no new service, timer or image requests. */
(()=>{
 'use strict';
 const modal=document.getElementById('dashboardModalBg');
 const topList=document.getElementById('dashTopGames');
 if(!modal||!topList||document.getElementById('gbLibraryOverview'))return;

 const style=document.createElement('style');
 style.id='gb-library-overview-style-v1';
 style.textContent=[
  '#dashboardModalBg #gbLibraryOverview{margin-top:18px;padding:14px;border:1px solid var(--border);border-radius:12px;background:color-mix(in srgb,var(--card) 82%,var(--bg));}',
  '#dashboardModalBg .gb-lib-heading{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:12px;}',
  '#dashboardModalBg .gb-lib-heading strong{font-size:14px;font-weight:800;color:var(--text);}',
  '#dashboardModalBg .gb-lib-heading small{font-size:10px;color:var(--sub);text-align:right;}',
  '#dashboardModalBg .gb-lib-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:15px;}',
  '#dashboardModalBg .gb-lib-metric{min-width:0;padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--bg);}',
  '#dashboardModalBg .gb-lib-metric .v{display:block;font-size:21px;line-height:1.15;font-weight:800;font-variant-numeric:tabular-nums;color:var(--text);}',
  '#dashboardModalBg .gb-lib-metric .k{display:block;margin-top:5px;font-size:11px;line-height:1.3;color:var(--sub);}',
  '#dashboardModalBg .gb-lib-metric.good .v{color:#39bd85;}',
  '#dashboardModalBg .gb-lib-metric.warn .v:not(.zero){color:#e0a52c;}',
  '#dashboardModalBg .gb-lib-section{display:flex;justify-content:space-between;align-items:center;margin:0 0 10px;gap:10px;font-size:12px;font-weight:700;color:var(--text);}',
  '#dashboardModalBg .gb-lib-systems{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:15px;row-gap:13px;}',
  '#dashboardModalBg .gb-lib-system{min-width:0;}',
  '#dashboardModalBg .gb-lib-system .head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;font-size:11px;color:var(--sub);}',
  '#dashboardModalBg .gb-lib-system .head b{color:var(--text);font-variant-numeric:tabular-nums;font-size:11px;}',
  '#dashboardModalBg .gb-lib-track{height:6px;overflow:hidden;background:var(--border);border-radius:99px;}',
  '#dashboardModalBg .gb-lib-track > span{display:block;height:100%;background:var(--accent);border-radius:99px;min-width:0;}',
  '#dashboardModalBg .gb-lib-none{padding:14px 0;text-align:center;color:var(--sub);font-size:12px;}',
  '@media(max-width:959px){#dashboardModalBg #gbLibraryOverview{display:none!important;}}'
 ].join('');
 document.head.appendChild(style);

 const panel=document.createElement('section');
 panel.id='gbLibraryOverview';
 panel.setAttribute('aria-label','ภาพรวมคลังเกม');
 panel.innerHTML='<div class="gb-lib-heading"><strong>ภาพรวมคลังเกม</strong><small>ข้อมูลจากรายการเกมปัจจุบัน</small></div><div class="gb-lib-metrics" id="gbLibMetrics"></div><div class="gb-lib-section"><span>จำนวนเกมแยกตามเครื่อง</span><span id="gbLibConsoleTotal"></span></div><div class="gb-lib-systems" id="gbLibSystems"></div>';
 topList.insertAdjacentElement('afterend',panel);

 const metrics=panel.querySelector('#gbLibMetrics');
 const systemsEl=panel.querySelector('#gbLibSystems');
 const totalEl=panel.querySelector('#gbLibConsoleTotal');
 const categories=[['gb','GB'],['gbc','GBC'],['gba','GBA'],['nds','NDS'],['3ds','3DS'],['psp','PSP']];
 const fmt=value=>Number(value).toLocaleString('th-TH');
 let requested=false,generation=0;

 function metric(label,value,kind){
  const card=document.createElement('div');
  card.className='gb-lib-metric'+(kind?' '+kind:'');
  const number=document.createElement('span');
  number.className='v'+(value===0?' zero':'');
  number.textContent=fmt(value);
  const caption=document.createElement('span');
  caption.className='k';
  caption.textContent=label;
  card.append(number,caption);
  return card;
 }
 function gameRows(items){
  const unique=new Map();
  for(const g of items){
   if(!g||typeof g!=='object')continue;
   const key=String(g.id||'').trim()||String(g.core||'')+':'+String(g.name||'');
   if(!key||key===':')continue;
   unique.set(key,g);
  }
  return [...unique.values()];
 }
 async function update(){
  if(!panel.isConnected||!modal.classList.contains('show'))return;
  const seq=++generation;
  let games=typeof currentGames!=='undefined'&&Array.isArray(currentGames)&&currentGames.length
   ?currentGames:null;
  if(!games&&typeof gbCatalog==='function'){
   try{const snapshot=await gbCatalog();games=Array.isArray(snapshot?.games)?snapshot.games:[];}
   catch(error){console.warn('Library overview catalog unavailable',error);games=[];}
  }
  if(seq!==generation||!panel.isConnected)return;
  const rows=gameRows(games||[]);
  if(!rows.length){
   metrics.replaceChildren();
   systemsEl.replaceChildren();
   totalEl.textContent='';
   const empty=document.createElement('div');
   empty.className='gb-lib-none';
   empty.textContent='ยังไม่มีข้อมูลคลังเกม';
   systemsEl.append(empty);
   return;
  }
  const total=rows.length;
  const thai=rows.filter(g=>g.has_thai===true||g.has_thai===1||g.has_thai==='true').length;
  const noCover=rows.filter(g=>!String(g.cover_path||'').trim()).length;
  const noDescription=rows.filter(g=>!String(g.description||'').trim()).length;
  metrics.replaceChildren(
   metric('เกมทั้งหมด',total,''),
   metric('รองรับภาษาไทย',thai,'good'),
   metric('ยังไม่มีภาพปก',noCover,'warn'),
   metric('ยังไม่มีคำโปรย',noDescription,'warn')
  );
  const counts=new Map();
  for(const row of rows){
   const core=String(row.core||'').trim().toLowerCase();
   counts.set(core,(counts.get(core)||0)+1);
  }
  const named=categories.map(([key,label])=>({key,label,count:counts.get(key)||0}));
  const other=total-named.reduce((sum,x)=>sum+x.count,0);
  if(other>0)named.push({key:'other',label:'อื่น ๆ',count:other});
  const visible=named.filter(x=>x.count>0);
  totalEl.textContent=fmt(total)+' เกม';
  const fragment=document.createDocumentFragment();
  for(const group of visible){
   const row=document.createElement('div');
   row.className='gb-lib-system';
   const head=document.createElement('div');
   head.className='head';
   const label=document.createElement('span');label.textContent=group.label;
   const count=document.createElement('b');count.textContent=fmt(group.count);
   head.append(label,count);
   const track=document.createElement('div');
   track.className='gb-lib-track';
   track.setAttribute('role','progressbar');
   track.setAttribute('aria-label',group.label);
   track.setAttribute('aria-valuemin','0');
   track.setAttribute('aria-valuemax',String(total));
   track.setAttribute('aria-valuenow',String(group.count));
   const fill=document.createElement('span');
   fill.style.width=Math.min(100,Math.max(0,group.count/total*100))+'%';
   track.append(fill);
   row.append(head,track);
   fragment.append(row);
  }
  systemsEl.replaceChildren(fragment);
 }
 function schedule(){
  if(requested||!modal.classList.contains('show'))return;
  requested=true;
  queueMicrotask(()=>{requested=false;void update();});
 }
 // Existing dashboard re-renders the ranking when refreshed; observe only its
 // small list and the modal's visibility, not the full page.
 new MutationObserver(schedule).observe(topList,{childList:true});
 new MutationObserver(schedule).observe(modal,{attributes:true,attributeFilter:['class']});
 schedule();
})();
