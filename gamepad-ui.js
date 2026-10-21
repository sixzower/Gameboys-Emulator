/* Connected controller identity display. Read-only: never changes emulator mappings or input. */
(() => {
  'use strict';
  if (!('getGamepads' in navigator)) return;
  const style = document.createElement('style');
  style.textContent = `
    #gb-controller-panel{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:9000;max-width:min(370px,calc(100vw - 28px));display:grid;gap:7px;pointer-events:none;font-family:inherit;color:#f4f7ff}
    #gb-controller-panel[hidden]{display:none!important}
    .gb-controller-card{display:flex;align-items:center;gap:11px;min-width:0;padding:11px 13px;border:1px solid rgba(143,179,255,.29);border-radius:17px;background:linear-gradient(120deg,rgba(20,28,48,.94),rgba(9,15,29,.94));box-shadow:0 12px 32px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:gb-controller-in .25s ease-out both}
    .gb-controller-icon{display:grid;place-items:center;flex:none;width:41px;height:41px;border-radius:13px;background:linear-gradient(135deg,rgba(90,138,255,.24),rgba(83,218,206,.12));color:#a9caff;border:1px solid rgba(149,185,255,.18)}
    .gb-controller-icon svg{width:25px;height:25px;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round}
    .gb-controller-copy{min-width:0;flex:1}
    .gb-controller-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.055em;color:#a9bedb}
    .gb-controller-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#42dca5;box-shadow:0 0 10px rgba(66,220,165,.75)}
    .gb-controller-name{margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:750;line-height:1.4;color:#fff}
    .gb-controller-sub{margin-top:2px;color:#95a8c5;font-size:10px}
    @keyframes gb-controller-in{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:650px){#gb-controller-panel{left:10px;bottom:max(10px,env(safe-area-inset-bottom));max-width:min(310px,calc(100vw - 20px))}.gb-controller-card{padding:8px 10px;gap:9px;border-radius:14px}.gb-controller-icon{width:35px;height:35px}.gb-controller-name{font-size:12px}}
    @media(prefers-reduced-motion:reduce){.gb-controller-card{animation:none}}
  `;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'gb-controller-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-label', 'จอยที่เชื่อมต่อ');
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 8h10.4c2 0 3.2 1.2 3.8 3.4l1 4.1c.5 2.2-1.6 3.7-3.4 2.3l-2.5-1.9H7.9l-2.5 1.9C3.6 19.2 1.5 17.7 2 15.5l1-4.1C3.6 9.2 4.8 8 6.8 8Z"/><path d="M7.5 11v4M5.5 13h4"/><circle cx="16.5" cy="11.5" r=".65"/><circle cx="18.5" cy="13.5" r=".65"/></svg>';
  let signature = '';
  function connected() {
    try { return Array.from(navigator.getGamepads() || []).filter(p => p && p.connected); }
    catch { return []; }
  }
  function refresh() {
    const pads = connected();
    const next = pads.map(p => p.index + ':' + p.id + ':' + p.mapping).join('|');
    if (next === signature) return;
    signature = next;
    panel.replaceChildren();
    for (const pad of pads) {
      const card = document.createElement('div');
      card.className = 'gb-controller-card';
      const symbol = document.createElement('span');
      symbol.className = 'gb-controller-icon';
      symbol.innerHTML = icon;
      const copy = document.createElement('span');
      copy.className = 'gb-controller-copy';
      const label = document.createElement('span');
      label.className = 'gb-controller-label';
      const dot = document.createElement('span');
      dot.className = 'gb-controller-dot';
      label.append(dot, document.createTextNode('เชื่อมต่อจอยสำเร็จ'));
      const name = document.createElement('div');
      name.className = 'gb-controller-name';
      // Gamepad.id is the browser/OS-reported identity, not a guessed brand/model.
      const actualName = String(pad.id || '').trim();
      name.textContent = actualName || 'จอยเกม (เบราว์เซอร์ไม่ระบุรุ่น)';
      name.title = actualName || '';
      const sub = document.createElement('div');
      sub.className = 'gb-controller-sub';
      sub.textContent = 'Controller ' + (pad.index + 1) + (pad.mapping === 'standard' ? ' · Standard mapping' : '');
      copy.append(label, name, sub);
      card.append(symbol, copy);
      panel.append(card);
    }
    panel.hidden = pads.length === 0;
  }
  function start() {
    if (!document.body) return;
    document.body.appendChild(panel);
    refresh();
    window.addEventListener('gamepadconnected', refresh);
    window.addEventListener('gamepaddisconnected', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    setInterval(() => { if (!document.hidden) refresh(); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
