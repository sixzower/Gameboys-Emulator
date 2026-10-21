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
  function start() {
    if (!document.body) return;
    syncFullscreenHost();
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
