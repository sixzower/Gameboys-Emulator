/* Gameboys Emulator — dashboard chart range and ranking presentation.
   Existing Chart.js line/bar charts and existing play-session queries are retained. */
(()=>{
  'use strict';
  const modal=document.getElementById('dashboardModalBg');
  const column=modal?.querySelector('.dash-column-charts');
  const rankList=document.getElementById('dashTopGames');
  if(!modal||!column||!rankList||document.getElementById('gbDailyRangeSelect'))return;
  const headings=[...column.querySelectorAll(':scope > .dash-section-title')];
  const dailyHeading=headings.find(el=>el.nextElementSibling?.querySelector('#dashDailyChart'));
  const rankHeading=headings.find(el=>el.nextElementSibling===rankList);
  const svg=(name)=>{
    const path=name==='calendar'
      ?'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>'
      :name==='flame'
      ?'<path d="M12 22c5 0 8-3.3 8-8.1 0-3.5-2-5.8-4.3-8.3-.3 3.2-2 4.2-2.3 4.4C12.9 6.3 11.9 4 9 2c.1 4.2-1.3 5.6-2.8 7.5C3 12 4 22 12 22Z"/>'
      :'<path d="M6.4 8h11.2c2 0 3.7 1.4 4 3.4l.7 5.2c.3 2.6-2.7 4.1-4.6 2.3L15.1 16H8.9l-2.6 2.9c-1.9 1.8-4.9.3-4.6-2.3l.7-5.2C2.7 9.4 4.4 8 6.4 8Z"/><path d="M7.5 11.5v4M5.5 13.5h4M16.1 12.5h.01M18.4 14.3h.01"/>';
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  };
  const style=document.createElement('style');
  style.id='gb-dashboard-analytics-polish-v1-style';
  style.textContent=[
    '#dashboardModalBg .gb-dash-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:16px;margin-bottom:10px;min-height:34px;}',
    '#dashboardModalBg .gb-dash-heading:first-child{margin-top:0;}',
    '#dashboardModalBg .gb-dash-heading-label{min-width:0;display:flex;align-items:center;gap:9px;font-weight:800;font-size:14px;color:var(--text);}',
    '#dashboardModalBg .gb-dash-heading-icon{color:var(--accent,#e3350d);display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;}',
    '#dashboardModalBg .gb-dash-range{position:relative;display:inline-flex;flex:0 0 auto;align-items:center;}',
    '#dashboardModalBg .gb-dash-range select{appearance:none;-webkit-appearance:none;border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:10px;padding:8px 30px 8px 12px;min-height:34px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;line-height:1.25;}',
    '#dashboardModalBg .gb-dash-range select:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}',
    '#dashboardModalBg .gb-dash-range::after{content:"";position:absolute;right:12px;top:calc(50% - 3px);width:6px;height:6px;border-bottom:1.8px solid var(--sub);border-right:1.8px solid var(--sub);transform:rotate(45deg);pointer-events:none;}',
    '#dashboardModalBg #dashTopGames .dash-game-row{display:flex;align-items:center;gap:10px;min-height:56px;padding:6px 4px;box-sizing:border-box;}',
    '#dashboardModalBg #dashTopGames.gb-rank-scroll{max-height:336px;overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain;scrollbar-gutter:stable;}',
    /* Eight 56px rows fit the previously unused space over the library overview. */
    '@media(min-width:960px){#dashboardModalBg #dashTopGames.gb-rank-scroll{max-height:448px;}}',
    '#dashboardModalBg #dashTopGames.gb-rank-scroll:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px;}',
    '#dashboardModalBg #dashTopGames .gb-rank-cover{display:flex;align-items:center;justify-content:center;width:36px;height:43px;flex:0 0 36px;overflow:hidden;background:color-mix(in srgb,var(--border) 38%,var(--card));border:1px solid var(--border);border-radius:6px;box-sizing:border-box;color:var(--sub);}',
    '#dashboardModalBg #dashTopGames .gb-rank-cover img{display:block;max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;}',
    '#dashboardModalBg #dashTopGames .gb-rank-cover .gb-rank-placeholder{font-size:15px;line-height:1;opacity:.55;}',
    '#dashboardModalBg #dashTopGames .g-name{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700;color:var(--text);}',
    '#dashboardModalBg #dashTopGames .g-meta{flex:0 0 auto;max-width:41%;text-align:right;font-variant-numeric:tabular-nums;font-size:11px;color:var(--sub);white-space:nowrap;}',
    /* Keep summary cards at their original intrinsic height; overlay the artwork. */
    '#dashboardModalBg #dashSummary .dash-card:has(> .n.gb-topgame-with-cover){position:relative;display:block!important;min-height:0!important;height:auto!important;box-sizing:border-box;padding:10px 12px;overflow:hidden;}',
    '#dashboardModalBg #dashSummary .dash-card:has(.gb-topgame-cover){padding-right:88px!important;}',
    '#dashboardModalBg #dashSummary .dash-card>.n.gb-topgame-with-cover{display:block!important;min-width:0;}',
    '#dashboardModalBg #dashSummary .dash-card .gb-topgame-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;min-width:0;max-width:100%;margin:0;overflow:hidden;color:var(--accent);font-size:clamp(15px,1.6vw,19px);font-weight:800;line-height:1.18;overflow-wrap:break-word;word-break:normal;white-space:normal;}',
    '#dashboardModalBg #dashSummary .dash-card .gb-topgame-cover{position:absolute!important;right:7px;top:5px;display:block;width:70px!important;max-width:calc(100% - 20px);height:calc(100% - 10px)!important;max-height:none;min-width:0;object-fit:contain;border:1px solid var(--border);border-radius:6px;background:var(--card);box-sizing:border-box;box-shadow:0 3px 9px #0004;}',
    '#dashboardModalBg #dashSummary .dash-card:has(> .n.gb-topgame-with-cover)>.l{display:block;margin-top:2px;min-width:0;font-size:12px;line-height:1.25;}',
    '@media(max-width:420px){#dashboardModalBg #dashSummary .dash-card:has(> .n.gb-topgame-with-cover){padding:9px;}#dashboardModalBg #dashSummary .dash-card:has(.gb-topgame-cover){padding-right:60px!important;}#dashboardModalBg #dashSummary .dash-card .gb-topgame-cover{right:5px;top:5px;width:48px!important;height:calc(100% - 10px)!important;}#dashboardModalBg #dashSummary .dash-card .gb-topgame-name{font-size:14px;}}',
    '@media(min-width:960px){#dashboardModalBg .dash-desktop-grid{align-items:stretch!important;}#dashboardModalBg .dash-column-charts,#dashboardModalBg .dash-column-system{min-height:0;}#dashboardModalBg .dash-column-system{display:flex;flex-direction:column;}#dashboardModalBg .dash-column-system>.gb-rom-download-tiles{margin-top:auto;}#dashboardModalBg .dash-column-charts .dash-chart-box{height:185px;}}',
    /* Compact the whole statistics row; image cannot affect grid row height. */
    '@media(min-width:680px){#dashboardModalBg #dashSummary .dash-card{height:82px!important;min-height:82px!important;max-height:82px!important;box-sizing:border-box;padding:8px 10px!important;overflow:hidden;}#dashboardModalBg #dashSummary .dash-card:has(> .n.gb-topgame-with-cover){height:82px!important;min-height:82px!important;max-height:82px!important;padding:8px 10px!important;}#dashboardModalBg #dashSummary .dash-card:has(> .n.gb-topgame-with-cover):has(.gb-topgame-cover){padding-right:88px!important;}#dashboardModalBg #dashSummary .dash-card .gb-topgame-cover{right:6px;top:5px;width:70px!important;height:calc(100% - 10px)!important;max-height:72px;}#dashboardModalBg #dashSummary .dash-card .gb-topgame-name{font-size:clamp(15px,1.5vw,18px);line-height:1.16;width:100%;max-width:100%;overflow-wrap:anywhere;white-space:normal!important;}}',
    '@media(min-width:960px){#dashboardModalBg .dash-desktop-grid{align-items:stretch!important;}#dashboardModalBg .dash-desktop-grid>.dash-column{align-self:stretch;box-sizing:border-box;}#dashboardModalBg .dash-column-charts{display:flex;flex-direction:column;}#dashboardModalBg #gbLibraryOverview{margin-top:auto!important;}#dashboardModalBg .dash-column-system{display:flex;flex-direction:column;}#dashboardModalBg .dash-column-system>.gb-rom-download-tiles{margin-top:auto;}}',
    /* Reserve a stable storage panel while the existing Vercel/R2/B2/Oracle requests resolve. */
    '@media(min-width:960px){#dashboardModalBg #dashStorage{min-height:var(--gb-storage-reserved-height,480px);box-sizing:border-box;}#dashboardModalBg #dashStorage:not(:has(#storageMoveBtn)):has(.usage-provider-block)::after{content:"";display:block;height:155px;margin:10px 0 14px;border:1px solid var(--border);border-radius:11px;background:linear-gradient(180deg,color-mix(in srgb,var(--text) 4%,var(--card)) 0 45%,transparent 45% 53%,color-mix(in srgb,var(--text) 4%,var(--card)) 53% 100%);opacity:.65;pointer-events:none;}}',
    /* The preview lives above clipped cards, ranks and the scrolling dashboard. */
    '#gb-dashboard-cover-peek{position:fixed;z-index:2147483100;display:none;flex-direction:column;gap:7px;align-items:center;box-sizing:border-box;width:212px;max-width:calc(100vw - 20px);padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--card);box-shadow:0 16px 36px #000a;pointer-events:none;contain:layout style;}',
    '#gb-dashboard-cover-peek img{display:block;width:100%;max-height:min(265px,56dvh);height:auto;aspect-ratio:1;object-fit:contain;border-radius:6px;background:var(--bg);}',
    '#gb-dashboard-cover-peek .gb-cover-peek-label{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;max-width:100%;overflow-wrap:anywhere;color:var(--text);font:700 12px/1.35 Prompt,sans-serif;text-align:center;}',
    '@media(max-width:679px){#dashboardModalBg .gb-dash-heading-label{font-size:12px;}#dashboardModalBg .gb-dash-range select{font-size:11px;padding:7px 26px 7px 9px;}#dashboardModalBg #dashTopGames .gb-rank-cover{width:31px;height:38px;flex-basis:31px;}#dashboardModalBg #dashTopGames .g-meta{font-size:10px;max-width:43%;}}'
  ].join('');
  document.head.append(style);

  function decorateHeading(el,kind){
    if(!el)return;
    const raw=el.textContent.trim();
    const text=kind==='gamepad'?raw.replace(/\s*\(\d+\s*วันล่าสุด\)\s*$/,''):raw;
    el.replaceChildren();
    el.classList.add('gb-dash-heading');
    const title=document.createElement('span');title.className='gb-dash-heading-label';
    const pict=document.createElement('span');pict.className='gb-dash-heading-icon';pict.innerHTML=svg(kind);
    const label=document.createElement('span');label.textContent=text;
    title.append(pict,label);el.append(title);
    return el;
  }
  const dayHeading=decorateHeading(dailyHeading,'gamepad');
  if(dayHeading){
    const picker=document.createElement('label');
    picker.className='gb-dash-range';
    const select=document.createElement('select');
    select.id='gbDailyRangeSelect';
    select.setAttribute('aria-label','เลือกช่วงวันสำหรับกราฟเวลาเล่นรวมรายวัน');
    for(const days of [7,14,30]){
      const option=document.createElement('option');option.value=String(days);
      option.textContent=days+' วันล่าสุด';select.append(option);
    }
    select.value='7';
    window.GB_DASH_DAY_RANGE=7;
    select.addEventListener('change',()=>{
      window.GB_DASH_DAY_RANGE=Number(select.value);
      if(typeof renderDashCharts==='function')renderDashCharts(true);
    });
    picker.append(select);dayHeading.append(picker);
  }
  decorateHeading(rankHeading,'flame');

  const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ');
  function decorateRanking(){
    const games=typeof currentGames!=='undefined'&&Array.isArray(currentGames)?currentGames:[];
    const covers=new Map();
    for(const game of games){
      if(game?.name&&game?.cover_path) {
        const key=normalize(game.name);
        if(!covers.has(key))covers.set(key,game.cover_path);
      }
    }
    for(const row of rankList.querySelectorAll(':scope > .dash-game-row')){
      if(row.querySelector('.gb-rank-cover'))continue;
      const label=row.querySelector('.g-name');
      if(!label)continue;
      const holder=document.createElement('span');holder.className='gb-rank-cover';
      const path=covers.get(normalize(label.textContent));
      let url='';
      if(path&&typeof publicUrl==='function'){
        try{url=publicUrl(path)||'';}catch(e){url='';}
      }
      if(url){
        const img=document.createElement('img');
        img.alt='';img.setAttribute('aria-hidden','true');
        img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
        img.addEventListener('error',()=>{
          holder.replaceChildren();
          const fallback=document.createElement('span');
          fallback.className='gb-rank-placeholder';fallback.textContent='▣';
          holder.append(fallback);
        },{once:true});
        img.src=url;holder.append(img);
      }else{
        const fallback=document.createElement('span');
        fallback.className='gb-rank-placeholder';fallback.textContent='▣';
        holder.append(fallback);
      }
      row.insertBefore(holder,label);
    }
    const count=rankList.querySelectorAll(':scope > .dash-game-row').length;
    const scroll=count>(window.matchMedia('(min-width:960px)').matches?8:6);
    rankList.classList.toggle('gb-rank-scroll',scroll);
    if(scroll){
      rankList.setAttribute('tabindex','0');
      rankList.setAttribute('role','region');
      rankList.setAttribute('aria-label','รายละเอียดเกมยอดนิยม เลื่อนดูได้สูงสุด 10 อันดับ');
    }else{
      rankList.removeAttribute('tabindex');
      rankList.removeAttribute('role');
      rankList.removeAttribute('aria-label');
    }
  }
  let queued=false;
  const schedule=()=>{
    if(queued)return;queued=true;
    queueMicrotask(()=>{queued=false;decorateRanking();});
  };
  new MutationObserver(schedule).observe(rankList,{childList:true});
  // The scroll threshold changes with the desktop two-column layout.
  window.matchMedia('(min-width:960px)').addEventListener?.('change',schedule);

  // Keep the storage section's last measured height on subsequent refreshes so
  // the right column never collapses to the tiny asynchronous loading placeholder.
  const storage=modal.querySelector('#dashStorage');
  if(storage){
    const refreshStorageReserve=()=>{
      if(!storage.querySelector('#storageMoveBtn'))return;
      const measured=Math.ceil(storage.scrollHeight);
      if(Number.isFinite(measured)&&measured>0){
        const reserved=Math.max(480,Math.min(measured,1000));
        storage.style.setProperty('--gb-storage-reserved-height',reserved+'px');
      }
    };
    new MutationObserver(refreshStorageReserve).observe(storage,{childList:true});
    refreshStorageReserve();
  }

  // One floating preview, only while hovering an image already loaded in the
  // dashboard. Reusing the same image URL uses the browser's existing cache.
  const hoverQuery='.gb-rank-cover img,.gb-topgame-cover,.gb-rom-cover,.gb-stat-cover';
  const peek=document.createElement('div');
  peek.id='gb-dashboard-cover-peek';
  peek.setAttribute('aria-hidden','true');
  const peekImage=document.createElement('img');
  peekImage.alt='';
  peekImage.referrerPolicy='no-referrer';
  const peekTitle=document.createElement('span');
  peekTitle.className='gb-cover-peek-label';
  peek.append(peekImage,peekTitle);
  document.body.append(peek);
  let hoveredImage=null;
  const hidePeek=()=>{hoveredImage=null;peek.style.display='none';};
  function positionPeek(e){
    if(!hoveredImage)return;
    const pad=10;
    const w=peek.offsetWidth||212,h=peek.offsetHeight||250;
    const x=e.clientX+18+w>window.innerWidth-pad?e.clientX-w-18:e.clientX+18;
    const y=e.clientY+16+h>window.innerHeight-pad?e.clientY-h-16:e.clientY+16;
    peek.style.left=Math.max(pad,Math.min(x,window.innerWidth-pad-w))+'px';
    peek.style.top=Math.max(pad,Math.min(y,window.innerHeight-pad-h))+'px';
  }
  modal.addEventListener('pointerover',e=>{
    if(e.pointerType!=='mouse'||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    const img=e.target.closest?.(hoverQuery);
    if(!img||!img.complete||!img.naturalWidth||!modal.classList.contains('show'))return;
    if(hoveredImage!==img){
      hoveredImage=img;
      peekImage.src=img.currentSrc||img.src;
      peekTitle.textContent=img.closest('.dash-game-row')?.querySelector('.g-name')?.textContent
        ||img.closest('.dash-card')?.querySelector('.gb-topgame-name')?.textContent
        ||img.alt||'ภาพปกเกม';
      peek.style.display='flex';
    }
    positionPeek(e);
  });
  modal.addEventListener('pointermove',positionPeek,{passive:true});
  modal.addEventListener('pointerout',e=>{
    if(!hoveredImage)return;
    const next=e.relatedTarget?.closest?.(hoverQuery);
    if(next===hoveredImage)return;
    if(e.target===hoveredImage||e.target.closest?.(hoverQuery)===hoveredImage)hidePeek();
  });
  modal.addEventListener('pointerleave',hidePeek);
  modal.addEventListener('scroll',hidePeek,true);
  window.addEventListener('resize',hidePeek,{passive:true});
  new MutationObserver(()=>{if(!modal.classList.contains('show'))hidePeek();})
    .observe(modal,{attributes:true,attributeFilter:['class']});
  schedule();
})();
