/* Controller identity HUD — read-only Gamepad API integration.
   Never modifies input mapping, emulator state, or button handling. */
(() => {
  'use strict';
  if (typeof navigator.getGamepads !== 'function') return;

  // Use precise, well-established USB vendor/product pairs only. Do not
  // infer a specific product from a generic XInput / standard mapping.
  const models = {
    '054c:05c4': 'Sony DUALSHOCK 4',
    '054c:09cc': 'Sony DUALSHOCK 4',
    '054c:0ce6': 'Sony DualSense',
    '054c:0df2': 'Sony DualSense Edge',
    '057e:2006': 'Nintendo Joy-Con (L)',
    '057e:2007': 'Nintendo Joy-Con (R)',
    '057e:2009': 'Nintendo Switch Pro Controller',
    '045e:02ea': 'Xbox Wireless Controller',
    '045e:02fd': 'Xbox Wireless Controller',
    '045e:0b12': 'Xbox Wireless Controller',
    '045e:0b13': 'Xbox Wireless Controller'
  };
  const controllerIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M7.4 8h9.2c2.2 0 3.7 1.3 4.2 3.5l.9 3.7c.6 2.4-1.6 3.9-3.5 2.5l-2.3-1.8H8.1l-2.3 1.8c-1.9 1.4-4.1-.1-3.5-2.5l.9-3.7C3.7 9.3 5.2 8 7.4 8Z"/><path d="M7.5 11v4m-2-2h4"/><circle cx="16.3" cy="11.5" r=".75"/><circle cx="18.5" cy="13.5" r=".75"/></svg>';
  const chevronIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 10 5 5 5-5"/></svg>';

  function identity(pad) {
    const raw = String(pad.id || '').trim();
    // Chromium commonly reports "xxxx-yyyy-Name"; other browsers report
    // "Name (STANDARD GAMEPAD Vendor: xxxx Product: yyyy)".
    const tagged = raw.match(/Vendor:\s*([0-9a-f]{4})\s*Product:\s*([0-9a-f]{4})/i);
    const prefixed = raw.match(/^([0-9a-f]{4})-([0-9a-f]{4})-(.+)$/i);
    const vid = (tagged ? tagged[1] : prefixed ? prefixed[1] : '').toLowerCase();
    const pid = (tagged ? tagged[2] : prefixed ? prefixed[2] : '').toLowerCase();
    const exact = vid && pid ? models[vid + ':' + pid] : '';
    let reported = prefixed ? prefixed[3] : raw;
    reported = reported
      .replace(/\s*\((?:STANDARD GAMEPAD|XInput STANDARD GAMEPAD)[^)]*\)/ig, '')
      .replace(/\s*\(Vendor:\s*[0-9a-f]{4}\s*Product:\s*[0-9a-f]{4}\)/ig, '')
      .replace(/\s*\((?:XInput|DInput|standard mapping)\)\s*$/ig, '')
      .trim();
    const generic = /^(?:unknown|generic|standard gamepad|gamepad|controller|wireless controller|xinput|xinput controller)$/i.test(reported);
    // A known VID:PID can identify the model; otherwise use the browser's
    // actual device string, never a guessed Xbox/PlayStation brand.
    const name = exact || reported || 'จอยเกม (เบราว์เซอร์ไม่ระบุรุ่น)';
    return {
      name,
      raw,
      vidpid: vid && pid ? vid.toUpperCase() + ':' + pid.toUpperCase() : '',
      source: exact ? 'รุ่นจากรหัสอุปกรณ์' : generic ? 'ชื่อทั่วไปที่เบราว์เซอร์รายงาน' : 'ชื่อที่เบราว์เซอร์รายงาน'
    };
  }


  // The packed emulator already creates the right-hand status widget and
  // the classic button tester. Enhance those in place; never create a duplicate.
  const nameKey = 'gb-gamepad-real-names:v1';
  const positionKey = 'gb-gamepad-right-position:v1';
  let overrides = {};
  let savedPosition = null;
  try {
    const value = JSON.parse(localStorage.getItem(nameKey) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) overrides = value;
  } catch {}
  try {
    const pos = JSON.parse(localStorage.getItem(positionKey) || 'null');
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y))
      savedPosition = {x:pos.x,y:pos.y};
  } catch {}
  const pads = () => {
    try { return Array.from(navigator.getGamepads() || []).filter(p => p?.connected); }
    catch { return []; }
  };
  function actualName(pad) {
    const info = identity(pad);
    const custom = overrides[info.raw];
    return {
      ...info,
      name: typeof custom === 'string' && custom.trim() ? custom.trim() : info.name,
      custom: typeof custom === 'string' && !!custom.trim()
    };
  }
  const testerStyle = document.createElement('style');
  testerStyle.id = 'gb-controller-ui-refinement';
  testerStyle.textContent = `
    /* Keep the original tester layout, with a subtle themed polish. */
    dialog.controller-panel{
      box-sizing:border-box!important;width:min(440px,calc(100vw - 28px))!important;
      max-height:min(83dvh,750px)!important;padding:20px!important;
      border:1px solid color-mix(in srgb,var(--accent,#f3a64c) 52%,transparent)!important;
      border-radius:19px!important;
      background:linear-gradient(155deg,var(--panel,var(--card,#242120)),var(--bg,#171719))!important;
      color:var(--text,#f6f5f8)!important;
      box-shadow:0 26px 75px #000a,inset 0 1px #ffffff16!important;
      scrollbar-width:thin
    }
    dialog.controller-panel::backdrop{background:#03050bc2;backdrop-filter:blur(5px)}
    dialog.controller-panel>h3{font-size:19px;font-weight:800;letter-spacing:-.025em;
      margin:0 0 15px;padding-bottom:13px;border-bottom:1px solid #ffffff18}
    dialog.controller-panel>h3::before{content:"🎮";margin-right:9px;font-size:18px}
    dialog.controller-panel .controller-picker{min-height:39px;padding:8px 11px;
      border-radius:10px;border:1px solid #ffffff30;background:var(--card,#28252a);
      color:var(--text,#fff);font-size:12px}
    dialog.controller-panel .controller-status[data-real-name]{font-size:0!important}
    dialog.controller-panel .controller-status[data-real-name]::after{
      content:attr(data-real-name);font-size:12px;line-height:1.5
    }
    dialog.controller-panel .controller-status{margin:11px 0;padding:10px 11px;
      border-radius:10px;background:#ffffff0b;border-left:3px solid var(--accent,#f3a64c);
      line-height:1.5;font-size:12px}
    dialog.controller-panel .controller-test{gap:6px;margin:14px 0}
    dialog.controller-panel .controller-test span{border-radius:9px;background:#ffffff09;
      border:1px solid #ffffff24;transition:background .1s,border-color .1s}
    dialog.controller-panel .controller-test span.active{border-color:var(--accent,#f3a64c);
      background:var(--accent,#f3a64c);color:#17151a;
      box-shadow:0 0 13px color-mix(in srgb,var(--accent,#f3a64c) 38%,transparent)}
    dialog.controller-panel .controller-test[data-standard="true"]{
      border-radius:30px 30px 20px 20px;padding:13px;
      border:1px solid #ffffff20;background:var(--card,#292630)}
    dialog.controller-panel .controller-sticks{gap:17px}
    dialog.controller-panel .controller-stick-track{border-color:#ffffff40}
    dialog.controller-panel .controller-stick-track i{background:var(--accent,#f3a64c)}
    dialog.controller-panel .controller-help{font-size:11px;line-height:1.7;opacity:.75}
    dialog.controller-panel>button[type="button"]{display:block;margin:13px 0 0 auto;
      border-radius:10px;padding:9px 19px;border:1px solid
      color-mix(in srgb,var(--accent,#f3a64c) 50%,transparent);
      background:color-mix(in srgb,var(--accent,#f3a64c) 14%,transparent);
      color:var(--text,#fff);font-weight:750;cursor:pointer}
    dialog.controller-panel>button[type="button"]:hover{background:color-mix(in srgb,var(--accent,#f3a64c) 26%,transparent)}
    /* Only the original right-side status indicator remains. */
    #gb-controller-panel{display:none!important}
    .controller-status-panel.gb-pad-refined{
      box-sizing:border-box;width:min(255px,calc(100vw - 20px));
      max-height:min(55dvh,460px);overflow:auto;z-index:10005;
      border:1px solid color-mix(in srgb,var(--accent,#f3a64c) 26%,var(--border,#49444a));
      border-radius:13px;
      background:linear-gradient(140deg,var(--card,#252124),var(--panel,#1c1a20));
      color:var(--text,#f4f4f8);
      box-shadow:0 12px 38px #0008,inset 0 1px #ffffff14;
      backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);
      font-family:inherit;scrollbar-width:thin
    }
    .controller-status-panel.gb-pad-refined[hidden]{display:none!important}
    .controller-status-panel.gb-pad-refined>summary{
      display:flex;align-items:center;gap:8px;min-height:41px;
      box-sizing:border-box;padding:8px 10px;cursor:grab;
      touch-action:none;user-select:none;-webkit-user-select:none;
      list-style:none;overflow:hidden;white-space:nowrap;
      font-size:0!important
    }
    .controller-status-panel.gb-pad-refined>summary::-webkit-details-marker{display:none}
    .controller-status-panel.gb-pad-refined>summary::before{
      content:"";display:inline-block;flex:none;width:24px;height:24px;
      margin:0;border-radius:7px;border:1px solid color-mix(in srgb,var(--accent,#f3a64c) 35%,transparent);
      background-color:color-mix(in srgb,var(--accent,#f3a64c) 12%,transparent);
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e9a85b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 8h10c2 0 3 1.5 3.5 3.5l.8 3.5c.5 2-1.3 3.4-3 2.1l-2.3-1.7H8l-2.3 1.7c-1.7 1.3-3.5-.1-3-2.1l.8-3.5C4 9.5 5 8 7 8Z'/%3E%3Cpath d='M7.5 11v4m-2-2h4'/%3E%3Ccircle cx='16' cy='11.5' r='.8'/%3E%3Ccircle cx='18.5' cy='13.5' r='.8'/%3E%3C/svg%3E");
      background-size:19px 19px;background-position:center;background-repeat:no-repeat
    }
    .controller-status-panel.gb-pad-refined>summary::after{
      content:attr(data-display);display:block;flex:1;min-width:0;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      color:var(--text,#f4f4f8);font-size:11px;font-weight:800;line-height:1.4
    }
    .controller-status-panel.gb-pad-refined.gb-pad-dragging>summary{cursor:grabbing}
    .controller-status-panel.gb-pad-refined .controller-status-body{
      padding:0 10px 10px;border-top:1px solid #ffffff16
    }
    .controller-status-panel.gb-pad-refined .gb-pad-real-name{
      margin:10px 0 3px;font-size:12px;font-weight:800;line-height:1.4;
      overflow-wrap:anywhere
    }
    .controller-status-panel.gb-pad-refined .gb-pad-description{
      margin:3px 0 7px;font-size:10px;opacity:.7;line-height:1.6;
      overflow-wrap:anywhere
    }
    .controller-status-panel.gb-pad-refined .gb-pad-tools{display:flex;gap:7px;align-items:center;margin:8px 0}
    .controller-status-panel.gb-pad-refined .gb-pad-edit{
      padding:5px 9px;border:1px solid #ffffff2a;border-radius:8px;
      background:#ffffff0b;color:inherit;font:inherit;font-size:10px;
      cursor:pointer
    }
    .controller-status-panel.gb-pad-refined .gb-pad-edit:hover{
      border-color:var(--accent,#f3a64c)}
    .controller-status-panel.gb-pad-refined .gb-pad-editor[hidden]{display:none!important}
    .controller-status-panel.gb-pad-refined .gb-pad-editor{
      display:grid;gap:7px;margin:8px 0;padding:9px;
      background:#ffffff0b;border-radius:10px
    }
    .controller-status-panel.gb-pad-refined .gb-pad-editor input{
      box-sizing:border-box;min-width:0;width:100%;padding:8px 9px;
      border-radius:7px;border:1px solid #ffffff35;
      background:var(--bg,#17171b);color:inherit;font:inherit;font-size:11px
    }
    .controller-status-panel.gb-pad-refined .gb-pad-editor button{
      padding:6px 10px;border:1px solid var(--accent,#f3a64c);
      border-radius:7px;background:color-mix(in srgb,var(--accent,#f3a64c) 18%,transparent);
      color:inherit;font:inherit;font-size:10px;cursor:pointer
    }
    .controller-status-panel.gb-pad-refined .gb-pad-more{
      border-top:1px solid #ffffff13;padding-top:8px;margin-top:7px
    }
    .controller-status-panel.gb-pad-refined .gb-pad-more>summary{
      padding:2px 0;font-size:10px;opacity:.75;cursor:pointer;list-style:revert
    }
    .controller-status-panel.gb-pad-refined .gb-pad-more p{
      font-size:10px;line-height:1.5;margin:5px 0;overflow-wrap:anywhere
    }
    .controller-status-panel.gb-pad-refined .gb-pad-more small{
      display:block;margin-top:7px;font-size:10px;opacity:.7;line-height:1.5
    }
    @media(max-width:480px){
      dialog.controller-panel{padding:14px!important}
      .controller-status-panel.gb-pad-refined{width:min(240px,calc(100vw - 20px))}
    }
    @media(prefers-reduced-motion:reduce){
      dialog.controller-panel .controller-test span{transition:none}
    }
  `;
  document.head.appendChild(testerStyle);

  // The Gamepad API may expose only an emulated XInput identity. The browser
  // cannot recover the physical 8BitDo model from "Xbox 360 Controller".
  // Let the owner explicitly save the driver-reported name for that ID.
  function enhanceRightPanel() {
    const panel = document.querySelector('details.controller-status-panel');
    if (!panel || panel.classList.contains('gb-pad-refined')) return !!panel;
    panel.classList.add('gb-pad-refined');
    const summary = panel.querySelector(':scope>summary');
    const body = panel.querySelector('.controller-status-body');
    if (!summary || !body) return true;
    const name = document.createElement('div');
    name.className = 'gb-pad-real-name';
    const description = document.createElement('div');
    description.className = 'gb-pad-description';
    const tools = document.createElement('div');
    tools.className = 'gb-pad-tools';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'gb-pad-edit';
    edit.textContent = 'แก้ชื่อจอย';
    const editor = document.createElement('form');
    editor.className = 'gb-pad-editor';
    editor.hidden = true;
    const field = document.createElement('input');
    field.type = 'text';
    field.maxLength = 120;
    field.setAttribute('aria-label','ชื่อรุ่นจอยจริง');
    field.placeholder = 'เช่น 8BitDo Ultimate 2 Wireless Controller for PC';
    const save = document.createElement('button');
    save.type = 'submit';
    save.textContent = 'บันทึกชื่อ';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'ใช้ชื่อจากระบบ';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap';
    actions.append(save,reset);
    editor.append(field,actions);
    tools.append(edit);
    const more = document.createElement('details');
    more.className = 'gb-pad-more';
    const moreTitle = document.createElement('summary');
    moreTitle.textContent = 'รายละเอียดสัญญาณจอย';
    more.append(moreTitle);
    for (const selector of ['[data-pad-name]','[data-pad-mapping]','[data-pad-buttons]','[data-pad-axes]','small']) {
      const node = body.querySelector(selector);
      if (node) more.append(node);
    }
    body.prepend(name,description,tools,editor);
    body.append(more);
    let activePad = null;
    edit.addEventListener('click',()=>{
      editor.hidden = !editor.hidden;
      if (!editor.hidden) {
        const current = activePad ? actualName(activePad) : null;
        field.value = current ? (current.custom ? current.name :
          /Xbox 360 Controller for Windows/i.test(current.raw) ?
          '8BitDo Ultimate 2 Wireless Controller for PC' : current.name) : '';
        field.focus();
        field.select();
      }
    });
    editor.addEventListener('submit',event=>{
      event.preventDefault();
      if (!activePad) return;
      const text = field.value.trim();
      if (!text) {field.focus();return;}
      overrides[activePad.id] = text;
      try {localStorage.setItem(nameKey,JSON.stringify(overrides));} catch {}
      editor.hidden = true;
      updateName();
    });
    reset.addEventListener('click',()=>{
      if (!activePad) return;
      delete overrides[activePad.id];
      try {localStorage.setItem(nameKey,JSON.stringify(overrides));} catch {}
      editor.hidden = true;
      updateName();
    });
    function updateName() {
      const list = pads();
      // The built-in panel chooses the most recently active pad.
      const rawSummary = summary.textContent || '';
      activePad = list.find(p => rawSummary.includes(p.id)) || list[0] || null;
      if (!activePad) {
        summary.dataset.display = 'จอยยังไม่เชื่อมต่อ';
        name.textContent = 'ไม่มีจอย';
        description.textContent = '';
        return;
      }
      const info = actualName(activePad);
      summary.dataset.display = info.name;
      summary.title = info.name + ' · ลากเพื่อย้าย';
      summary.setAttribute('aria-label',info.name + ' แตะเพื่อขยายรายละเอียด หรือลากเพื่อย้าย');
      name.textContent = info.name;
      description.textContent = info.custom ? 'ชื่อรุ่นที่บันทึกไว้ · เชื่อมต่อแล้ว' :
        (info.source + ' · เชื่อมต่อแล้ว');
      if (!info.custom && /Xbox 360 Controller for Windows/i.test(info.raw)) {
        description.textContent = 'เบราว์เซอร์รายงานชื่อ XInput · แก้ชื่อให้ตรงรุ่นได้';
      }
    }
    const observer = new MutationObserver(()=>{
      updateName();
      requestAnimationFrame(place);
    });
    observer.observe(summary,{childList:true,characterData:true,subtree:true});
    observer.observe(panel,{attributes:true,attributeFilter:['hidden','open']});
    function place() {
      if (!savedPosition || panel.hidden) return;
      const rect = panel.getBoundingClientRect();
      const x = Math.max(0,Math.min(savedPosition.x,Math.max(0,innerWidth-rect.width)));
      const y = Math.max(0,Math.min(savedPosition.y,Math.max(0,innerHeight-rect.height)));
      Object.assign(panel.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});
    }
    let drag = null, suppress = false;
    summary.addEventListener('pointerdown',event=>{
      if (event.button !== 0 || !event.isPrimary) return;
      const rect = panel.getBoundingClientRect();
      drag = {id:event.pointerId,px:event.clientX,py:event.clientY,
        x:rect.left,y:rect.top,moved:false};
      try {summary.setPointerCapture(event.pointerId);} catch {}
    });
    summary.addEventListener('pointermove',event=>{
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX-drag.px,dy=event.clientY-drag.py;
      if (!drag.moved && Math.hypot(dx,dy)<7) return;
      drag.moved = true;
      suppress = true;
      panel.classList.add('gb-pad-dragging');
      savedPosition = {x:drag.x+dx,y:drag.y+dy};
      place();
    });
    function finish(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const moved = drag.moved;
      drag = null;
      panel.classList.remove('gb-pad-dragging');
      if (moved) {
        const rect = panel.getBoundingClientRect();
        savedPosition = {x:rect.left,y:rect.top};
        try {localStorage.setItem(positionKey,JSON.stringify(savedPosition));} catch {}
        setTimeout(()=>{suppress=false;},0);
      }
    }
    for (const type of ['pointerup','pointercancel','lostpointercapture'])
      summary.addEventListener(type,finish);
    summary.addEventListener('click',event=>{
      if (suppress) {event.preventDefault();event.stopImmediatePropagation();}
    },true);
    window.addEventListener('resize',place,{passive:true});
    window.addEventListener('orientationchange',place,{passive:true});
    document.addEventListener('fullscreenchange',()=>requestAnimationFrame(place));
    document.addEventListener('webkitfullscreenchange',()=>requestAnimationFrame(place));
    updateName();
    return true;
  }

  function isPlaying() {
    return document.body.classList.contains('in-play') ||
      document.body.classList.contains('player-focus') ||
      !!document.getElementById('playerHeader') ||
      !!document.fullscreenElement;
  }
  function enhanceClassicTester() {
    const dialog = document.querySelector('dialog.controller-panel');
    if (!dialog || dialog.dataset.gbClassicEnhanced) return !!dialog;
    dialog.dataset.gbClassicEnhanced = 'true';
    dialog.setAttribute('aria-label','หน้าทดสอบจอย');
    const heading = dialog.querySelector('h3');
    if (heading) heading.textContent = 'หน้าทดสอบจอย';
    const picker = dialog.querySelector('.controller-picker');
    const status = dialog.querySelector('.controller-status');
    // Keep all the classic tester's existing nodes and event handlers.
    // Its original script uses showModal() for auto-open on controller connect.
    // Prevent the auto-test from interrupting gameplay / game startup.
    const show = dialog.showModal.bind(dialog);
    dialog.showModal = function() {
      if (isPlaying()) return;
      return show();
    };
    function showRealName() {
      if (!dialog.open) return;
      const list = pads();
      const selected = list.find(p => String(p.index) === picker?.value) || list[0];
      if (!selected) return;
      const info = actualName(selected);
      if (picker) {
        const option = Array.from(picker.options).find(o => o.value === String(selected.index));
        if (option) option.label = info.name;
      }
      // Existing status text is updated every frame by the emulator;
      // the picker and compact status widget show the user-saved real name.
      if (status) {status.title = info.name;status.dataset.realName = info.name +
        (selected.mapping === 'standard' ? ' · พร้อมใช้งาน' : ' · รูปแบบเฉพาะ');
        status.setAttribute('aria-label',status.dataset.realName);}
    }
    const timer = setInterval(()=>{
      if (!document.contains(dialog)) {clearInterval(timer);return;}
      if (isPlaying() && dialog.open) dialog.close();
      else showRealName();
    },500);
    document.addEventListener('visibilitychange',()=>{
      if (document.hidden && dialog.open) dialog.close();
    });
    return true;
  }
  function init() {
    if (!document.body) return;
    const check = () => {
      const a = enhanceRightPanel();
      const b = enhanceClassicTester();
      return a && b;
    };
    if (check()) return;
    const observer = new MutationObserver(()=>{
      if (check()) observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
