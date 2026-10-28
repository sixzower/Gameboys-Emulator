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
    '#dashboardModalBg #dashTopGames .dash-game-row{display:flex;align-items:center;gap:10px;min-height:46px;padding:6px 4px;box-sizing:border-box;}',
    '#dashboardModalBg #dashTopGames .gb-rank-cover{display:flex;align-items:center;justify-content:center;width:36px;height:43px;flex:0 0 36px;overflow:hidden;background:color-mix(in srgb,var(--border) 38%,var(--card));border:1px solid var(--border);border-radius:6px;box-sizing:border-box;color:var(--sub);}',
    '#dashboardModalBg #dashTopGames .gb-rank-cover img{display:block;max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;}',
    '#dashboardModalBg #dashTopGames .gb-rank-cover .gb-rank-placeholder{font-size:15px;line-height:1;opacity:.55;}',
    '#dashboardModalBg #dashTopGames .g-name{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700;color:var(--text);}',
    '#dashboardModalBg #dashTopGames .g-meta{flex:0 0 auto;max-width:41%;text-align:right;font-variant-numeric:tabular-nums;font-size:11px;color:var(--sub);white-space:nowrap;}',
    '@media(max-width:679px){#dashboardModalBg .gb-dash-heading-label{font-size:12px;}#dashboardModalBg .gb-dash-range select{font-size:11px;padding:7px 26px 7px 9px;}#dashboardModalBg #dashTopGames .gb-rank-cover{width:31px;height:38px;flex-basis:31px;}#dashboardModalBg #dashTopGames .g-meta{font-size:10px;max-width:43%;}}'
  ].join('');
  document.head.append(style);

  function decorateHeading(el,kind){
    if(!el)return;
    const raw=el.textContent.trim();
    const text=kind==='calendar'?raw.replace(/\s*\(\d+\s*วันล่าสุด\)\s*$/,''):raw;
    el.replaceChildren();
    el.classList.add('gb-dash-heading');
    const title=document.createElement('span');title.className='gb-dash-heading-label';
    const pict=document.createElement('span');pict.className='gb-dash-heading-icon';pict.innerHTML=svg(kind);
    const label=document.createElement('span');label.textContent=text;
    title.append(pict,label);el.append(title);
    return el;
  }
  const dayHeading=decorateHeading(dailyHeading,'calendar');
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
  }
  let queued=false;
  const schedule=()=>{
    if(queued)return;queued=true;
    queueMicrotask(()=>{queued=false;decorateRanking();});
  };
  new MutationObserver(schedule).observe(rankList,{childList:true});
  schedule();
})();
