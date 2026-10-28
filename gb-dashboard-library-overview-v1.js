/* Desktop library dashboard — Gameboys Emulator.
   Read from the existing catalog only. No API calls, tracking or new images. */
(()=>{
  'use strict';
  const modal=document.getElementById('dashboardModalBg');
  const topList=document.getElementById('dashTopGames');
  if(!modal||!topList||document.getElementById('gbLibraryOverview'))return;

  const iconPaths={
   library:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v7c0 1.7 4 3 9 3s9-1.3 9-3v-7"/>',
   gamepad:'<path d="M6.6 12.7h2.8m-1.4-1.4v2.8M16.2 12h.01M18.5 14h.01"/><path d="M6.2 7.2h11.6a4 4 0 0 1 3.8 3l1 6.2a2.5 2.5 0 0 1-4.1 2.3l-2.4-2H7.9l-2.4 2a2.5 2.5 0 0 1-4.1-2.3l1-6.2a4 4 0 0 1 3.8-3Z"/>',
   languages:'<path d="m5 8 6 0M8 5v3a10 10 0 0 1-5 9m1-5a15 15 0 0 0 7 7M14 19l4-10 4 10m-6.5-3h5"/>',
   image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
   file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
   handheld:'<rect x="6" y="2.5" width="12" height="19" rx="2"/><rect x="8.5" y="5.5" width="7" height="8" rx=".5"/><path d="M9 17h3m-1.5-1.5v3"/><circle cx="15" cy="17.5" r=".6"/>',
   gba:'<rect x="2.5" y="5.5" width="19" height="13" rx="3"/><rect x="8" y="7" width="8" height="7" rx=".6"/><path d="M5 15h3m-1.5-1.5v3"/><circle cx="18.4" cy="15.5" r=".7"/>',
   ds:'<rect x="5" y="2" width="14" height="20" rx="2"/><rect x="7.5" y="4" width="9" height="7" rx=".5"/><path d="M5 12h14"/><rect x="7.5" y="14" width="9" height="5" rx=".5"/>',
   psp:'<rect x="2.5" y="6" width="19" height="12" rx="4"/><rect x="7" y="8" width="10" height="8" rx="1"/><path d="M4.5 11v3M3 12.5h3"/><circle cx="19" cy="13" r=".6"/>'
  };
  const icon=(name)=>'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(iconPaths[name]||iconPaths.handheld)+'</svg>';
  const style=document.createElement('style');
  style.id='gb-library-overview-style-v2';
  style.textContent=[
    '#dashboardModalBg #gbLibraryOverview{margin-top:16px;padding:13px 14px 14px;min-width:0;border:2px solid var(--accent,#e3350d);border-radius:13px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 4%,var(--card)),var(--card));box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 17%,transparent),0 5px 20px #0003;box-sizing:border-box;}',
    '#dashboardModalBg .gb-lib-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}',
    '#dashboardModalBg .gb-lib-heading-title{display:flex;align-items:center;min-width:0;gap:9px;font-size:15px;font-weight:800;color:var(--text);}',
    '#dashboardModalBg .gb-lib-heading-title .gb-lib-icon{color:#f05a46;background:color-mix(in srgb,var(--accent) 16%,var(--card));border-radius:9px;width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;}',
    '#dashboardModalBg .gb-lib-action{font:600 11px inherit!important;white-space:nowrap;border:1px solid var(--border);background:var(--bg);color:var(--text);padding:8px 10px;border-radius:999px;cursor:pointer;flex-shrink:0;}',
    '#dashboardModalBg .gb-lib-action:hover{border-color:var(--accent);}',
    '#dashboardModalBg .gb-lib-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:14px;}',
    '#dashboardModalBg .gb-lib-metric{min-width:0;min-height:96px;box-sizing:border-box;border:1px solid var(--border);border-radius:10px;padding:10px;background:linear-gradient(155deg,color-mix(in srgb,var(--text) 4%,var(--card)),var(--bg));}',
    '#dashboardModalBg .gb-lib-metric-head{display:flex;align-items:center;gap:6px;min-height:27px;}',
    '#dashboardModalBg .gb-lib-metric .gb-lib-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;flex:0 0 28px;background:color-mix(in srgb,var(--metric-color) 22%,var(--card));color:var(--metric-color);}',
    '#dashboardModalBg .gb-lib-metric .k{min-width:0;font-size:10px;font-weight:600;line-height:1.28;color:var(--text);}',
    '#dashboardModalBg .gb-lib-metric .v{display:block;margin:7px 0 0 34px;color:var(--text);font-weight:800;font-size:clamp(19px,1.7vw,26px);line-height:1;font-variant-numeric:tabular-nums;}',
    '#dashboardModalBg .gb-lib-metric .note{display:block;margin:4px 0 0 34px;color:var(--sub);font-size:10px;line-height:1.2;}',
    '#dashboardModalBg .gb-lib-section{display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid var(--border);padding-top:11px;margin-bottom:9px;font-size:12px;font-weight:800;color:var(--text);}',
    '#dashboardModalBg .gb-lib-section .total{color:var(--sub);font-size:11px;font-weight:600;}',
    '#dashboardModalBg .gb-lib-systems{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;}',
    '#dashboardModalBg .gb-lib-system{min-width:0;padding:9px 7px 10px;border:1px solid var(--border);border-radius:10px;background:var(--bg);box-sizing:border-box;}',
    '#dashboardModalBg .gb-lib-system-head{display:flex;align-items:center;gap:6px;min-width:0;margin-bottom:7px;}',
    '#dashboardModalBg .gb-lib-system-icon{color:var(--system-color);flex:0 0 20px;height:20px;}',
    '#dashboardModalBg .gb-lib-system-label{min-width:0;color:var(--text);font-size:11px;font-weight:800;}',
    '#dashboardModalBg .gb-lib-system-count{font-size:12px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;color:var(--text);}',
    '#dashboardModalBg .gb-lib-track{margin-top:8px;height:7px;border-radius:99px;overflow:hidden;background:var(--border);}',
    '#dashboardModalBg .gb-lib-track span{height:100%;display:block;border-radius:99px;background:var(--system-color);}',
    '#dashboardModalBg .gb-lib-pct{display:block;margin-top:5px;font-size:10px;font-variant-numeric:tabular-nums;color:var(--sub);}',
    '#dashboardModalBg .gb-lib-none{padding:16px 4px;text-align:center;color:var(--sub);font-size:12px;grid-column:1/-1;}',
    '@media(min-width:960px) and (max-width:1200px){#dashboardModalBg .gb-lib-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}#dashboardModalBg .gb-lib-systems{grid-template-columns:repeat(3,minmax(0,1fr));}}',
    '@media(max-width:959px){#dashboardModalBg #gbLibraryOverview{display:none!important;}}'
  ].join('');
  document.head.appendChild(style);

  const panel=document.createElement('section');
  panel.id='gbLibraryOverview';
  panel.setAttribute('aria-label','ภาพรวมคลังเกม');
  panel.innerHTML='<header class="gb-lib-heading"><div class="gb-lib-heading-title"><span class="gb-lib-icon">'+icon('library')+'</span><strong>ภาพรวมคลังเกม</strong></div><button type="button" class="gb-lib-action">ดูคลังเกมทั้งหมด →</button></header><div class="gb-lib-metrics" id="gbLibMetrics"></div><div class="gb-lib-section"><span>จำนวนเกมแยกตามเครื่อง</span><span class="total" id="gbLibConsoleTotal"></span></div><div class="gb-lib-systems" id="gbLibSystems"></div>';
  topList.insertAdjacentElement('afterend',panel);

  panel.querySelector('.gb-lib-action').addEventListener('click',()=>{
    document.getElementById('dashCloseBtn')?.click();
    requestAnimationFrame(()=>document.getElementById('grid')?.scrollIntoView({behavior:'smooth',block:'start'}));
  });
  const metrics=panel.querySelector('#gbLibMetrics');
  const systemsEl=panel.querySelector('#gbLibSystems');
  const totalEl=panel.querySelector('#gbLibConsoleTotal');
  const categories=[
    {key:'gb',label:'GB',theme:'#aeb3ba',icon:'handheld'},
    {key:'gbc',label:'GBC',theme:'#ac65df',icon:'handheld'},
    {key:'gba',label:'GBA',theme:'#ef4337',icon:'gba'},
    {key:'nds',label:'NDS',theme:'#27c8bd',icon:'ds'},
    {key:'3ds',label:'3DS',theme:'#e8b82d',icon:'ds'},
    {key:'psp',label:'PSP',theme:'#ec468d',icon:'psp'}
  ];
  const fmt=n=>Number(n).toLocaleString('th-TH');
  let queued=false,sequence=0;

  function stat(label,number,color,iconName,total,showShare){
    const card=document.createElement('div');
    card.className='gb-lib-metric';
    card.style.setProperty('--metric-color',color);
    const head=document.createElement('div');
    head.className='gb-lib-metric-head';
    head.innerHTML='<span class="gb-lib-icon">'+icon(iconName)+'</span>';
    const text=document.createElement('span');text.className='k';text.textContent=label;
    head.append(text);
    const amount=document.createElement('strong');amount.className='v';amount.textContent=fmt(number);
    const note=document.createElement('span');note.className='note';
    note.textContent=showShare?(total?(number/total*100).toFixed(1)+'%':'0%'):'เกม';
    card.append(head,amount,note);
    return card;
  }
  function rows(items){
    const unique=new Map();
    for(const g of items){
      if(!g||typeof g!=='object')continue;
      const key=String(g.id||'').trim()||String(g.core||'')+':'+String(g.name||'');
      if(key===':')continue;
      unique.set(key,g);
    }
    return [...unique.values()];
  }
  async function render(){
    if(!panel.isConnected||!modal.classList.contains('show'))return;
    const seq=++sequence;
    let games=typeof currentGames!=='undefined'&&Array.isArray(currentGames)&&currentGames.length?currentGames:null;
    if(!games&&typeof gbCatalog==='function'){
      try{const snapshot=await gbCatalog();games=Array.isArray(snapshot?.games)?snapshot.games:[];}
      catch(error){console.warn('Library overview catalog unavailable',error);games=[];}
    }
    if(seq!==sequence||!panel.isConnected)return;
    const gamesList=rows(games||[]);
    if(!gamesList.length){
      metrics.replaceChildren();
      totalEl.textContent='';
      const empty=document.createElement('div');
      empty.className='gb-lib-none';empty.textContent='ยังไม่มีข้อมูลคลังเกม';
      systemsEl.replaceChildren(empty);
      return;
    }
    const total=gamesList.length;
    const thai=gamesList.filter(g=>g.has_thai===true||g.has_thai===1||g.has_thai==='true').length;
    const noCover=gamesList.filter(g=>!String(g.cover_path||'').trim()).length;
    const noDesc=gamesList.filter(g=>!String(g.description||'').trim()).length;
    metrics.replaceChildren(
      stat('เกมทั้งหมด',total,'#ef422e','gamepad',total,false),
      stat('เกมที่มีภาษาไทย',thai,'#22b96a','languages',total,true),
      stat('เกมที่ยังไม่มีภาพปก',noCover,'#b768ef','image',total,true),
      stat('เกมที่ยังไม่มีคำโปรย',noDesc,'#338de5','file',total,true)
    );
    const counts=new Map();
    for(const game of gamesList){
      const core=String(game.core||'').trim().toLowerCase();
      counts.set(core,(counts.get(core)||0)+1);
    }
    const groups=categories.map(cat=>({...cat,count:counts.get(cat.key)||0}));
    const other=total-groups.reduce((acc,cat)=>acc+cat.count,0);
    if(other>0)groups.push({key:'other',label:'อื่น ๆ',theme:'#8b969e',icon:'handheld',count:other});
    totalEl.textContent=fmt(total)+' เกม';
    const fragment=document.createDocumentFragment();
    for(const cat of groups){
      const row=document.createElement('div');row.className='gb-lib-system';
      row.style.setProperty('--system-color',cat.theme);
      const head=document.createElement('div');head.className='gb-lib-system-head';
      head.innerHTML='<span class="gb-lib-system-icon">'+icon(cat.icon)+'</span>';
      const label=document.createElement('span');label.className='gb-lib-system-label';label.textContent=cat.label;
      head.append(label);
      const count=document.createElement('div');count.className='gb-lib-system-count';
      count.textContent=fmt(cat.count)+' เกม';
      const bar=document.createElement('div');bar.className='gb-lib-track';
      bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',cat.label);
      bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(total));bar.setAttribute('aria-valuenow',String(cat.count));
      const fill=document.createElement('span');fill.style.width=(cat.count/total*100)+'%';bar.append(fill);
      const pct=document.createElement('span');pct.className='gb-lib-pct';pct.textContent=(cat.count/total*100).toFixed(1)+'%';
      row.append(head,count,bar,pct);fragment.append(row);
    }
    systemsEl.replaceChildren(fragment);
  }
  function schedule(){
    if(queued||!modal.classList.contains('show'))return;
    queued=true;
    queueMicrotask(()=>{queued=false;void render();});
  }
  new MutationObserver(schedule).observe(topList,{childList:true});
  new MutationObserver(schedule).observe(modal,{attributes:true,attributeFilter:['class']});
  schedule();
})();
