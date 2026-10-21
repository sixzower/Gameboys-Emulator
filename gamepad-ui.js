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

  const style = document.createElement('style');
  style.textContent = [
    '#gb-controller-panel{--gb-accent:var(--accent,#e3350d);--gb-card:var(--card,#171a24);--gb-text:var(--text,#f5f5fa);--gb-muted:var(--muted,#a8aebb);position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:9000;width:min(350px,calc(100vw - 28px));font-family:inherit;color:var(--gb-text);pointer-events:none}',
    '#gb-controller-panel[hidden],#gb-controller-details[hidden]{display:none!important}',
    '.gb-controller-shell{pointer-events:auto;overflow:hidden;border:1px solid var(--border,rgba(255,255,255,.18));border-radius:17px;background:linear-gradient(125deg,color-mix(in srgb,var(--gb-card) 94%,#fff 6%),color-mix(in srgb,var(--gb-card) 92%,#000 8%));box-shadow:0 14px 45px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.09);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);animation:gb-controller-enter .28s cubic-bezier(.2,.8,.2,1) both}',
    '.gb-controller-toggle{display:flex;align-items:center;gap:11px;width:100%;min-height:62px;padding:10px 12px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit}',
    '.gb-controller-toggle:hover{background:color-mix(in srgb,var(--gb-accent) 7%,transparent)}',
    '.gb-controller-toggle:focus-visible{outline:2px solid var(--gb-accent);outline-offset:-3px;border-radius:14px}',
    '.gb-controller-icon{display:grid;place-items:center;flex:none;width:40px;height:40px;border:1px solid color-mix(in srgb,var(--gb-accent) 32%,transparent);border-radius:12px;background:color-mix(in srgb,var(--gb-accent) 15%,transparent);color:var(--gb-accent)}',
    '.gb-controller-icon svg{width:24px;height:24px}',
    '.gb-controller-heading{display:block;min-width:0;flex:1}',
    '.gb-controller-kicker{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:.045em;color:var(--gb-muted)}',
    '.gb-controller-dot{display:inline-block;width:7px;height:7px;flex:none;border-radius:50%;background:#41d79a;box-shadow:0 0 0 3px rgba(65,215,154,.12),0 0 12px rgba(65,215,154,.35)}',
    '.gb-controller-summary{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;font-size:13px;font-weight:800;line-height:1.35;color:var(--gb-text)}',
    '.gb-controller-arrow{display:grid;place-items:center;flex:none;width:20px;height:20px;color:var(--gb-muted);transition:transform .22s ease}',
    '.gb-controller-arrow svg{width:18px;height:18px}',
    '#gb-controller-panel[data-expanded="true"] .gb-controller-arrow{transform:rotate(180deg)}',
    '.gb-controller-details{border-top:1px solid color-mix(in srgb,var(--gb-text) 10%,transparent);padding:5px 12px 11px;max-height:min(270px,45vh);overflow:auto;scrollbar-width:thin}',
    '.gb-controller-item{padding:10px 0 8px}',
    '.gb-controller-item+.gb-controller-item{border-top:1px solid color-mix(in srgb,var(--gb-text) 9%,transparent)}',
    '.gb-controller-item-top{display:flex;align-items:center;gap:8px}',
    '.gb-controller-slot{flex:none;display:grid;place-items:center;min-width:25px;height:25px;padding:0 5px;border:1px solid color-mix(in srgb,var(--gb-accent) 26%,transparent);border-radius:8px;background:color-mix(in srgb,var(--gb-accent) 12%,transparent);color:var(--gb-accent);font-size:11px;font-weight:900}',
    '.gb-controller-name{min-width:0;overflow-wrap:anywhere;font-size:13px;font-weight:750;line-height:1.45}',
    '.gb-controller-meta{padding-left:33px;margin-top:5px;color:var(--gb-muted);font-size:10.5px;line-height:1.55;overflow-wrap:anywhere}',
    '.gb-controller-raw{margin-top:4px;opacity:.82;overflow-wrap:anywhere}',
    '@keyframes gb-controller-enter{from{opacity:0;transform:translateY(9px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '@media(max-width:650px){#gb-controller-panel{left:10px;bottom:max(10px,env(safe-area-inset-bottom));width:min(310px,calc(100vw - 20px))}.gb-controller-toggle{min-height:54px;padding:8px 10px;gap:9px}.gb-controller-icon{width:35px;height:35px}.gb-controller-details{padding:4px 10px 9px}}',
    '@media(prefers-reduced-motion:reduce){.gb-controller-shell{animation:none}.gb-controller-arrow{transition:none}}'
  ].join('\n');
  style.textContent += `
    #gb-controller-panel .gb-controller-toggle{touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab}
    #gb-controller-panel[data-dragging="true"] .gb-controller-toggle{cursor:grabbing}
    #gb-controller-panel[data-dragging="true"] .gb-controller-shell{box-shadow:0 18px 55px rgba(0,0,0,.48),0 0 0 1px color-mix(in srgb,var(--gb-accent) 38%,transparent)}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.id = 'gb-controller-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'จอยควบคุมที่เชื่อมต่อ');

  const shell = document.createElement('div');
  shell.className = 'gb-controller-shell';
  const toggle = document.createElement('button');
  toggle.className = 'gb-controller-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'gb-controller-details');
  toggle.setAttribute('aria-expanded', 'false');

  const symbol = document.createElement('span');
  symbol.className = 'gb-controller-icon';
  symbol.innerHTML = controllerIcon;
  const heading = document.createElement('span');
  heading.className = 'gb-controller-heading';
  const kicker = document.createElement('span');
  kicker.className = 'gb-controller-kicker';
  const dot = document.createElement('span');
  dot.className = 'gb-controller-dot';
  kicker.append(dot, document.createTextNode('เชื่อมต่อจอยแล้ว'));
  const summary = document.createElement('span');
  summary.className = 'gb-controller-summary';
  heading.append(kicker, summary);
  const arrow = document.createElement('span');
  arrow.className = 'gb-controller-arrow';
  arrow.innerHTML = chevronIcon;
  toggle.append(symbol, heading, arrow);

  const details = document.createElement('div');
  details.id = 'gb-controller-details';
  details.className = 'gb-controller-details';
  details.hidden = true;
  shell.append(toggle, details);
  panel.append(shell);

  let signature = '';
  let expanded = false;
  let collapseTimer = null;
  let userExpanded = false;
  function setExpanded(next) {
    expanded = !!next;
    panel.dataset.expanded = String(expanded);
    details.hidden = !expanded;
    requestAnimationFrame(place);
    toggle.setAttribute('aria-expanded', String(expanded));
  }
  function clearCollapse() {
    if (collapseTimer !== null) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  }
  function autoExpand() {
    clearCollapse();
    if (userExpanded) return;
    setExpanded(true);
    collapseTimer = setTimeout(() => {
      collapseTimer = null;
      if (!userExpanded) setExpanded(false);
    }, 6500);
  }
  function connected() {
    try { return Array.from(navigator.getGamepads() || []).filter(p => p && p.connected); }
    catch { return []; }
  }
  function refresh() {
    const pads = connected();
    const next = pads.map(p => p.index + ':' + p.id + ':' + p.mapping).join('|');
    if (next === signature) return;
    const previous = signature;
    signature = next;
    details.replaceChildren();
    const names = [];
    for (const pad of pads) {
      const info = identity(pad);
      names.push(info.name);
      const item = document.createElement('div');
      item.className = 'gb-controller-item';
      const top = document.createElement('div');
      top.className = 'gb-controller-item-top';
      const slot = document.createElement('span');
      slot.className = 'gb-controller-slot';
      slot.textContent = String(pad.index + 1);
      const name = document.createElement('span');
      name.className = 'gb-controller-name';
      name.textContent = info.name;
      name.title = info.raw || info.name;
      top.append(slot, name);
      const meta = document.createElement('div');
      meta.className = 'gb-controller-meta';
      const source = document.createElement('div');
      source.textContent = info.source + (info.vidpid ? ' · ' + info.vidpid : '') + (pad.mapping === 'standard' ? ' · Standard' : '');
      meta.append(source);
      if (info.raw && info.raw !== info.name) {
        const raw = document.createElement('div');
        raw.className = 'gb-controller-raw';
        raw.textContent = 'ระบบรายงาน: ' + info.raw;
        meta.append(raw);
      }
      item.append(top, meta);
      details.append(item);
    }
    panel.hidden = pads.length === 0;
    if (pads.length) requestAnimationFrame(place);
    kicker.lastChild.textContent = pads.length > 1 ? 'เชื่อมต่อ ' + pads.length + ' จอย' : 'เชื่อมต่อจอยแล้ว';
    summary.textContent = pads.length === 1 ? names[0] : pads.length + ' อุปกรณ์พร้อมใช้งาน';
    toggle.title = pads.length === 1 ? names[0] : names.join(', ');
    if (!pads.length) {
      clearCollapse();
      userExpanded = false;
      setExpanded(false);
    } else if (previous !== next) {
      autoExpand();
    }
  }
  // Drag only the connection indicator. Gamepad input and mappings stay untouched.
  const positionKey = 'gb-controller-hud-position:v1';
  let savedPosition = null;
  try {
    const value = JSON.parse(localStorage.getItem(positionKey) || 'null');
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y))
      savedPosition = {x:value.x, y:value.y};
  } catch {}
  function place() {
    if (!savedPosition || panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    const x = Math.max(0, Math.min(savedPosition.x, Math.max(0, innerWidth - rect.width)));
    const y = Math.max(0, Math.min(savedPosition.y, Math.max(0, innerHeight - rect.height)));
    Object.assign(panel.style, {left:x+'px',top:y+'px',right:'auto',bottom:'auto'});
  }
  let drag = null, suppressClick = false;
  toggle.setAttribute('aria-label','แตะเพื่อดูรายละเอียดจอย หรือลากเพื่อย้ายตำแหน่ง');
  toggle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    const rect = panel.getBoundingClientRect();
    drag = {id:event.pointerId, px:event.clientX, py:event.clientY,
            x:rect.left, y:rect.top, moved:false};
    try {toggle.setPointerCapture(event.pointerId);} catch {}
  });
  toggle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX-drag.px, dy = event.clientY-drag.py;
    if (!drag.moved && Math.hypot(dx,dy)<7) return;
    drag.moved = true;
    suppressClick = true;
    panel.dataset.dragging = 'true';
    savedPosition = {x:drag.x+dx,y:drag.y+dy};
    place();
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    delete panel.dataset.dragging;
    if (moved) {
      const rect = panel.getBoundingClientRect();
      savedPosition = {x:rect.left,y:rect.top};
      try {localStorage.setItem(positionKey,JSON.stringify(savedPosition));} catch {}
      setTimeout(()=>{suppressClick=false;},0);
    }
  }
  for (const name of ['pointerup','pointercancel','lostpointercapture'])
    toggle.addEventListener(name,finishDrag);
  window.addEventListener('resize',place,{passive:true});
  window.addEventListener('orientationchange',place,{passive:true});
  function syncFullscreenHost() {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    const host = fs && fs.tagName !== 'CANVAS' ? fs : document.body;
    if (host && panel.parentElement !== host) host.appendChild(panel);
    requestAnimationFrame(place);
  }
  document.addEventListener('fullscreenchange',syncFullscreenHost);
  document.addEventListener('webkitfullscreenchange',syncFullscreenHost);
  toggle.addEventListener('click', () => {
    if (suppressClick) return;
    clearCollapse();
    userExpanded = !expanded;
    setExpanded(!expanded);
  });

  // Progressive visual upgrade of the emulator's existing tester. Retain the
  // original nodes, handlers and Gamepad API polling so input remains unchanged.
  function enhanceControllerTester() {
    const dialog = document.querySelector('dialog.controller-panel');
    if (!dialog || dialog.dataset.gbTesterEnhanced) return !!dialog;
    dialog.dataset.gbTesterEnhanced = 'true';
    dialog.setAttribute('aria-label','หน้าทดสอบจอย');
    const heading = dialog.querySelector('h3');
    const picker = dialog.querySelector('.controller-picker');
    const status = dialog.querySelector('.controller-status');
    const buttons = dialog.querySelector('.controller-test');
    const sticks = dialog.querySelector('.controller-sticks');
    const axes = dialog.querySelector('.controller-axes');
    const help = dialog.querySelector('.controller-help');
    const close = dialog.querySelector('button[type="button"]');
    if (![heading,picker,status,buttons,sticks,axes,help,close].every(Boolean)) return true;

    heading.textContent = 'หน้าทดสอบจอย';
    const header = document.createElement('div');
    header.className = 'gb-test-header';
    const emblem = document.createElement('div');
    emblem.className = 'gb-test-emblem';
    emblem.innerHTML = controllerIcon;
    const title = document.createElement('div');
    title.className = 'gb-test-titles';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'gb-test-eyebrow';
    eyebrow.textContent = 'CONTROLLER DIAGNOSTICS';
    title.append(eyebrow,heading);
    const live = document.createElement('span');
    live.className = 'gb-test-live';
    live.textContent = 'LIVE';
    close.classList.add('gb-test-close');
    close.textContent = '✕';
    close.setAttribute('aria-label','ปิดหน้าทดสอบจอย');
    close.title = 'ปิด';
    header.append(emblem,title,live,close);

    const body = document.createElement('div');
    body.className = 'gb-test-body';
    const device = document.createElement('section');
    device.className = 'gb-test-section gb-test-device';
    const deviceLabel = document.createElement('label');
    deviceLabel.className = 'gb-test-section-label';
    deviceLabel.textContent = 'อุปกรณ์ที่เชื่อมต่อ';
    const pickerId = 'gb-test-picker';
    picker.id = pickerId;
    deviceLabel.htmlFor = pickerId;
    const identityName = document.createElement('div');
    identityName.className = 'gb-test-device-name';
    identityName.textContent = 'รอการเชื่อมต่อจอย';
    const identityMeta = document.createElement('div');
    identityMeta.className = 'gb-test-device-meta';
    identityMeta.textContent = 'กดปุ่มบนจอยเพื่อให้เบราว์เซอร์ตรวจพบ';
    status.classList.add('gb-test-raw-status');
    device.append(deviceLabel,picker,identityName,identityMeta,status);

    const inputs = document.createElement('section');
    inputs.className = 'gb-test-section gb-test-inputs';
    const inputTitle = document.createElement('h4');
    inputTitle.className = 'gb-test-section-label';
    inputTitle.textContent = 'ทดสอบการกดปุ่ม';
    const inputHint = document.createElement('span');
    inputHint.className = 'gb-test-section-hint';
    inputHint.textContent = 'ปุ่มที่กดจะสว่างขึ้น';
    const inputHeading = document.createElement('div');
    inputHeading.className = 'gb-test-section-heading';
    inputHeading.append(inputTitle,inputHint);
    inputs.append(inputHeading,buttons);

    const analog = document.createElement('section');
    analog.className = 'gb-test-section gb-test-analog';
    const analogTitle = document.createElement('h4');
    analogTitle.className = 'gb-test-section-label';
    analogTitle.textContent = 'ทดสอบอนาล็อก';
    analog.append(analogTitle,sticks);
    const axisDetails = document.createElement('details');
    axisDetails.className = 'gb-test-axis-details';
    const axisSummary = document.createElement('summary');
    axisSummary.textContent = 'ดูค่าตัวเลขแกนอนาล็อก';
    axisDetails.append(axisSummary,axes);
    analog.append(axisDetails);

    const footer = document.createElement('div');
    footer.className = 'gb-test-footer';
    footer.append(help);
    body.append(device,inputs,analog,footer);
    dialog.replaceChildren(header,body);

    let updater = null;
    function updateIdentity() {
      if (!dialog.open) return;
      let pad = null;
      try {
        const pads = Array.from(navigator.getGamepads?.() || []).filter(p => p?.connected);
        pad = pads.find(p => String(p.index) === picker.value) || pads[0];
      } catch {}
      if (!pad) {
        identityName.textContent = 'ยังไม่พบจอยที่เชื่อมต่อ';
        identityMeta.textContent = 'เชื่อมต่อ USB หรือ Bluetooth แล้วกดปุ่มบนจอย';
        live.dataset.connected = 'false';
        return;
      }
      const info = identity(pad);
      identityName.textContent = info.name;
      identityName.title = info.raw || info.name;
      identityMeta.textContent = info.source + (info.vidpid ? ' · VID:PID ' + info.vidpid : '') +
        (pad.mapping === 'standard' ? ' · Standard mapping' : ' · Custom mapping');
      live.dataset.connected = 'true';
    }
    function syncUpdater() {
      clearInterval(updater);
      updater = null;
      if (dialog.open) {
        updateIdentity();
        updater = setInterval(updateIdentity, 450);
      }
    }
    const observer = new MutationObserver(syncUpdater);
    observer.observe(dialog,{attributes:true,attributeFilter:['open']});
    picker.addEventListener('change',updateIdentity);
    dialog.addEventListener('close',()=>{clearInterval(updater);updater=null;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(updater);updater=null;}else syncUpdater();});
    syncUpdater();
    return true;
  }
  function initControllerTester() {
    if (enhanceControllerTester()) return;
    const observer = new MutationObserver(() => {
      if (enhanceControllerTester()) observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  const testerStyle = document.createElement('style');
  testerStyle.id = 'gb-controller-tester-theme';
  testerStyle.textContent = `
    dialog.controller-panel[data-gb-tester-enhanced="true"]{
      --gb-test-accent:var(--accent,#f3a64c);
      --gb-test-ink:var(--text,#f8f8fc);
      --gb-test-surface:var(--panel,var(--card,#191d29));
      box-sizing:border-box;width:min(640px,calc(100vw - 24px));max-width:640px;
      max-height:min(90dvh,860px);margin:auto;padding:0!important;
      border:1px solid color-mix(in srgb,var(--gb-test-accent) 45%,transparent);
      border-radius:24px;background:var(--gb-test-surface);color:var(--gb-test-ink);
      box-shadow:0 32px 90px #000b,0 0 0 1px #ffffff0d,inset 0 1px #ffffff18;
      overflow:auto;overscroll-behavior:contain;font-family:inherit;
      scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--gb-test-accent) 30%,transparent) transparent
    }
    dialog.controller-panel[data-gb-tester-enhanced="true"]::backdrop{
      background:rgba(4,7,17,.76);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)
    }
    .gb-test-header{display:flex;align-items:center;gap:13px;padding:19px 22px;
      border-bottom:1px solid #ffffff16;
      background:linear-gradient(112deg,color-mix(in srgb,var(--gb-test-accent) 15%,transparent),transparent 66%)}
    .gb-test-emblem{flex:none;width:48px;height:48px;display:grid;place-items:center;
      border:1px solid color-mix(in srgb,var(--gb-test-accent) 45%,transparent);
      border-radius:15px;color:var(--gb-test-accent);
      background:color-mix(in srgb,var(--gb-test-accent) 12%,transparent);
      box-shadow:inset 0 1px #ffffff16}
    .gb-test-emblem svg{width:28px;height:28px}
    .gb-test-titles{flex:1;min-width:0}
    .gb-test-eyebrow{display:block;font-size:10px;font-weight:800;letter-spacing:.15em;
      color:var(--gb-test-accent);line-height:1.5}
    dialog.controller-panel .gb-test-titles h3{margin:2px 0 0;font-size:clamp(18px,4vw,23px);
      font-weight:800;line-height:1.35;letter-spacing:-.02em}
    .gb-test-live{display:inline-flex;align-items:center;gap:7px;border:1px solid #43dca344;
      border-radius:999px;padding:5px 9px;color:#53e0aa;background:#43dca310;
      font-size:10px;font-weight:800;letter-spacing:.1em}
    .gb-test-live::before{content:"";width:7px;height:7px;border-radius:50%;
      background:currentColor;box-shadow:0 0 10px currentColor}
    .gb-test-live[data-connected="false"]{color:var(--gb-test-accent);
      border-color:color-mix(in srgb,var(--gb-test-accent) 30%,transparent)}
    dialog.controller-panel button.gb-test-close{flex:none;display:grid;place-items:center;
      width:36px;height:36px;padding:0;border-radius:11px;border:1px solid #ffffff22;
      background:#ffffff0c;color:var(--gb-test-ink);font-size:17px;cursor:pointer}
    dialog.controller-panel button.gb-test-close:hover{background:color-mix(in srgb,var(--gb-test-accent) 18%,transparent)}
    .gb-test-body{display:grid;gap:15px;padding:19px 22px 22px}
    .gb-test-section{min-width:0;padding:17px;border:1px solid #ffffff16;border-radius:17px;
      background:linear-gradient(150deg,#ffffff0b,#ffffff03);
      box-shadow:inset 0 1px #ffffff0c}
    .gb-test-section-label{display:block;margin:0 0 11px;font-size:13px;font-weight:800;
      color:var(--gb-test-ink);line-height:1.5}
    .gb-test-section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .gb-test-section-hint{font-size:11px;opacity:.65}
    dialog.controller-panel .controller-picker{display:block;width:100%;min-height:42px;
      padding:10px 35px 10px 12px;border:1px solid #ffffff25;border-radius:11px;
      color:var(--gb-test-ink);background:var(--card,#242634);font:inherit;font-size:13px;
      outline-offset:2px;cursor:pointer}
    dialog.controller-panel .controller-picker:focus-visible{outline:2px solid var(--gb-test-accent)}
    .gb-test-device-name{margin-top:13px;font-size:15px;font-weight:800;line-height:1.5;overflow-wrap:anywhere}
    .gb-test-device-meta{margin-top:3px;font-size:11px;line-height:1.65;opacity:.72;overflow-wrap:anywhere}
    dialog.controller-panel .gb-test-raw-status{margin:9px 0 0;padding:9px 11px;
      border-left:2px solid var(--gb-test-accent);border-radius:6px;
      background:#ffffff09;font-size:11px;line-height:1.6;opacity:.75;overflow-wrap:anywhere}
    dialog.controller-panel .controller-test{display:flex;flex-wrap:wrap;gap:8px;margin:0}
    dialog.controller-panel .controller-test span{display:grid;place-items:center;
      min-width:39px;min-height:37px;padding:7px 9px;border:1px solid #ffffff28;
      border-radius:10px;background:#ffffff0b;color:var(--gb-test-ink);
      font-size:12px;font-weight:800;line-height:1.2;
      transition:background .1s ease,border-color .1s ease,box-shadow .1s ease}
    dialog.controller-panel .controller-test span.active{
      border-color:var(--gb-test-accent);background:var(--gb-test-accent);
      color:#15151b;box-shadow:0 0 17px color-mix(in srgb,var(--gb-test-accent) 40%,transparent)}
    dialog.controller-panel .controller-test[data-standard="true"]{
      display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;
      margin:0;padding:15px;border:1px solid #ffffff17;border-radius:23px;
      background:radial-gradient(ellipse at 50% 20%,#ffffff0d,transparent 78%),#00000018}
    dialog.controller-panel .controller-test[data-standard="true"] span{min-width:0;padding:6px 2px}
    dialog.controller-panel .controller-sticks{display:flex;justify-content:center;
      flex-wrap:wrap;gap:18px;margin:0}
    dialog.controller-panel .controller-stick{padding:10px 16px;border:1px solid #ffffff13;
      border-radius:14px;background:#00000015;min-width:130px}
    dialog.controller-panel .controller-stick-track{margin:0 auto 10px;width:82px;height:82px;
      border:1px solid #ffffff35;background:
      linear-gradient(transparent 49%,#ffffff25 49%,#ffffff25 51%,transparent 51%),
      linear-gradient(90deg,transparent 49%,#ffffff25 49%,#ffffff25 51%,transparent 51%),
      radial-gradient(circle,#ffffff0c,#00000023)}
    dialog.controller-panel .controller-stick-track i{background:var(--gb-test-accent);
      box-shadow:0 0 12px color-mix(in srgb,var(--gb-test-accent) 30%,transparent)}
    dialog.controller-panel .controller-stick small{font-size:11px;opacity:.8}
    .gb-test-axis-details{margin-top:13px;border-top:1px solid #ffffff17;padding-top:11px}
    .gb-test-axis-details summary{font-size:11px;font-weight:700;opacity:.78;cursor:pointer}
    .gb-test-axis-details .controller-axes{margin:9px 0 0;font-size:11px;
      line-height:1.7;overflow-wrap:anywhere;opacity:.75}
    .gb-test-footer{padding:1px 4px}
    .gb-test-footer .controller-help{margin:0;font-size:11px;line-height:1.75;opacity:.7}
    @media(max-width:480px){
      dialog.controller-panel[data-gb-tester-enhanced="true"]{width:calc(100vw - 16px);
        max-height:calc(100dvh - 24px);border-radius:19px}
      .gb-test-header{padding:14px;gap:9px}
      .gb-test-emblem{width:39px;height:39px;border-radius:12px}
      .gb-test-emblem svg{width:23px;height:23px}
      .gb-test-live{font-size:9px;padding:4px 7px}
      dialog.controller-panel button.gb-test-close{width:32px;height:32px}
      .gb-test-body{padding:12px;gap:10px}
      .gb-test-section{padding:12px;border-radius:13px}
      dialog.controller-panel .controller-test[data-standard="true"]{padding:8px;gap:4px}
      dialog.controller-panel .controller-test[data-standard="true"] span{font-size:10px;min-height:31px}
      dialog.controller-panel .controller-stick{min-width:115px;padding:9px}
    }
    @media(prefers-reduced-motion:reduce){
      dialog.controller-panel .controller-test span{transition:none}
    }
  `;
  document.head.appendChild(testerStyle);
  function start() {
    if (!document.body) return;
    syncFullscreenHost();
    initControllerTester();
    refresh();
    window.addEventListener('gamepadconnected', refresh);
    window.addEventListener('gamepaddisconnected', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    // Browser gamepadconnected events may be delayed until the first button
    // press; lightweight polling covers connection changes without reading input.
    setInterval(() => { if (!document.hidden) refresh(); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
