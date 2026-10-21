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

  testerStyle.textContent += `
    .gb-pad-disconnect-toast{
      position:fixed;z-index:2147483007;left:50%;bottom:max(24px,env(safe-area-inset-bottom));
      transform:translateX(-50%);box-sizing:border-box;display:flex;align-items:center;gap:11px;
      width:max-content;max-width:min(370px,calc(100vw - 28px));padding:12px 15px;
      border:1px solid color-mix(in srgb,var(--accent,#f3a64c) 42%,#ffffff20);
      border-radius:14px;background:linear-gradient(130deg,var(--card,#252124),var(--panel,#1a1b20));
      color:var(--text,#f4f4f8);box-shadow:0 18px 55px #000a,inset 0 1px #ffffff14;
      font:inherit;pointer-events:none;backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px)
    }
    .gb-pad-disconnect-toast[hidden]{display:none!important}
    .gb-pad-disconnect-icon{flex:none;display:grid;place-items:center;width:37px;height:37px;
      border-radius:11px;border:1px solid color-mix(in srgb,var(--accent,#f3a64c) 35%,transparent);
      background:color-mix(in srgb,var(--accent,#f3a64c) 12%,transparent);
      color:var(--accent,#f3a64c)}
    .gb-pad-disconnect-icon svg{width:22px;height:22px}
    .gb-pad-disconnect-copy{min-width:0;flex:1}
    .gb-pad-disconnect-title{font-size:12px;font-weight:800;line-height:1.5}
    .gb-pad-disconnect-name{font-size:12px;font-weight:700;line-height:1.5;
      overflow-wrap:anywhere}
    .gb-pad-disconnect-sub{font-size:10px;opacity:.7;line-height:1.5;margin-top:2px}
    @media(max-width:480px){.gb-pad-disconnect-toast{padding:10px 12px;gap:9px}}
  `;

  testerStyle.textContent += `
    /* Minimal controller tile from the previous HUD, with a proper close X. */
    dialog.controller-panel{position:relative!important;padding-top:64px!important}
    dialog.controller-panel>h3{position:absolute;top:21px;left:73px;right:56px;
      min-height:32px;margin:0;padding:0;border:0;display:flex;align-items:center;
      font-size:19px;line-height:1.4}
    dialog.controller-panel>h3::before{
      content:"";position:absolute;left:-53px;top:-5px;display:block;
      width:40px;height:40px;border-radius:11px;
      border:1px solid color-mix(in srgb,var(--accent,#f3a64c) 40%,transparent);
      background-color:color-mix(in srgb,var(--accent,#f3a64c) 12%,transparent);
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e9a85b' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7.4 8h9.2c2.2 0 3.7 1.3 4.2 3.5l.9 3.7c.6 2.4-1.6 3.9-3.5 2.5l-2.3-1.8H8.1l-2.3 1.8c-1.9 1.4-4.1-.1-3.5-2.5l.9-3.7C3.7 9.3 5.2 8 7.4 8Z'/%3E%3Cpath d='M7.5 11v4m-2-2h4'/%3E%3Ccircle cx='16.3' cy='11.5' r='.75'/%3E%3Ccircle cx='18.5' cy='13.5' r='.75'/%3E%3C/svg%3E");
      background-position:center;background-repeat:no-repeat;background-size:25px 25px
    }
    dialog.controller-panel>button.gb-test-x{
      position:absolute;top:17px;right:17px;margin:0;display:grid;place-items:center;
      width:33px;height:33px;padding:0;border-radius:9px;
      border:1px solid #ffffff24;background:#ffffff0a;
      color:var(--text,#fff);font-size:20px;font-weight:400;line-height:1;
      cursor:pointer
    }
    dialog.controller-panel>button.gb-test-x:hover{
      background:color-mix(in srgb,var(--accent,#f3a64c) 18%,transparent)}
    dialog.controller-panel .gb-test-guide{
      margin:13px 0 0;padding:12px 13px;border:1px solid #ffffff19;
      border-radius:12px;background:linear-gradient(130deg,#ffffff0b,#ffffff04);
      color:var(--text,#fff);font-size:11px;line-height:1.75
    }
    dialog.controller-panel .gb-test-guide strong{
      display:block;margin-bottom:5px;font-size:12px;font-weight:800}
    dialog.controller-panel .gb-test-guide .gb-guide-row{
      display:flex;align-items:baseline;gap:8px;margin:4px 0}
    dialog.controller-panel .gb-test-guide .gb-guide-tag{
      flex:none;min-width:50px;color:var(--accent,#f3a64c);font-weight:800}
    dialog.controller-panel .gb-test-guide .gb-guide-note{
      margin-top:9px;padding-top:8px;border-top:1px solid #ffffff17;opacity:.7}
    /* The right-side connected indicator is now status-only. */
    .controller-status-panel.gb-pad-refined .controller-status-body{display:none!important}
    .controller-status-panel.gb-pad-refined>summary{cursor:grab}
    @media(max-width:480px){
      dialog.controller-panel{padding-top:61px!important}
      dialog.controller-panel>h3{top:18px;left:65px;right:52px;font-size:17px}
      dialog.controller-panel>h3::before{left:-49px;width:36px;height:36px}
      dialog.controller-panel>button.gb-test-x{top:15px;right:13px}
    }
  `;

  testerStyle.textContent += `
    dialog.controller-panel>h3::before{border:0!important;border-radius:0!important;
      background-color:transparent!important}
    .controller-disconnect-notice,.controller-notice{display:none!important}
  `;
  testerStyle.textContent += `
    dialog.controller-panel>h3::before{
      background-image:none!important;background-color:var(--accent,#f3a64c)!important;
      -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7.4 8h9.2c2.2 0 3.7 1.3 4.2 3.5l.9 3.7c.6 2.4-1.6 3.9-3.5 2.5l-2.3-1.8H8.1l-2.3 1.8c-1.9 1.4-4.1-.1-3.5-2.5l.9-3.7C3.7 9.3 5.2 8 7.4 8Z'/%3E%3Cpath d='M7.5 11v4m-2-2h4'/%3E%3Ccircle cx='16.3' cy='11.5' r='.75'/%3E%3Ccircle cx='18.5' cy='13.5' r='.75'/%3E%3C/svg%3E") center/25px 25px no-repeat;
      mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7.4 8h9.2c2.2 0 3.7 1.3 4.2 3.5l.9 3.7c.6 2.4-1.6 3.9-3.5 2.5l-2.3-1.8H8.1l-2.3 1.8c-1.9 1.4-4.1-.1-3.5-2.5l.9-3.7C3.7 9.3 5.2 8 7.4 8Z'/%3E%3Cpath d='M7.5 11v4m-2-2h4'/%3E%3Ccircle cx='16.3' cy='11.5' r='.75'/%3E%3Ccircle cx='18.5' cy='13.5' r='.75'/%3E%3C/svg%3E") center/25px 25px no-repeat
    }
    .gb-pad-landscape-button{display:none;align-items:center;justify-content:center;
      width:34px;height:34px;border:1px solid #ffffff36;border-radius:9px;
      background:#ffffff12;color:var(--accent,#f3a64c);cursor:pointer}
    .gb-pad-landscape-button svg{width:20px;height:20px}
    @media(pointer:coarse) and (max-width:900px){
      body.gb-pad-connected .gb-pad-landscape-button{display:inline-flex}
    }
    .gb-pad-landscape-mode canvas,.gb-pad-landscape-mode video{
      object-fit:contain!important;max-width:100vw!important;max-height:100dvh!important}
    .gb-pad-landscape-mode:fullscreen{display:flex!important;align-items:center!important;
      justify-content:center!important;background:#000!important}
    .gb-pad-landscape-mode:fullscreen canvas,.gb-pad-landscape-mode:fullscreen video{
      width:auto!important;height:auto!important;max-width:100vw!important;
      max-height:100dvh!important;object-fit:contain!important}
  `;
  testerStyle.textContent += `
    .gb-pad-connect-toast{position:fixed;z-index:2147483008;right:14px;
      top:max(14px,env(safe-area-inset-top));display:block;box-sizing:border-box;
      width:min(270px,calc(100vw - 28px));padding:0;border-radius:11px;
      border:1px solid #343b44;background:#11151bf5;color:#f4f7fa;
      box-shadow:0 12px 30px #0009;backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);font:inherit}
    .gb-pad-connect-toast.gb-pad-minimized{width:42px;height:42px;border-radius:50%;overflow:visible}
    .gb-pad-minimized .gb-pad-connect-trigger{width:42px;height:42px;border-radius:50%;padding:0;justify-content:center}
    .gb-pad-minimized .gb-pad-connect-copy,.gb-pad-minimized .gb-pad-connect-dot{display:none}
    .gb-pad-connect-game-icon{display:none;width:34px;height:34px;flex:none;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
    .gb-pad-minimized .gb-pad-connect-game-icon{display:block}
    .gb-pad-connect-mini-led{display:none;position:absolute;right:1px;top:1px;width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid #11151b;box-sizing:content-box;box-shadow:0 0 7px #22c55e99;pointer-events:none}
    .gb-pad-minimized .gb-pad-connect-mini-led{display:block;animation:gb-pad-mini-blink 1.2s ease-in-out infinite}
    @keyframes gb-pad-mini-blink{0%,100%{opacity:1;box-shadow:0 0 8px #22c55eaa}50%{opacity:.3;box-shadow:0 0 2px #22c55e33}}
    @media(prefers-reduced-motion:reduce){.gb-pad-connect-mini-led{animation:none!important}}
    .gb-pad-connect-toast[hidden]{display:none!important}
    .gb-pad-connect-toast.gb-pad-dragging .gb-pad-connect-trigger{cursor:grabbing}
    .gb-pad-connect-trigger{touch-action:none}
    .gb-pad-connect-trigger{width:100%;display:flex;align-items:center;gap:9px;
      text-align:left;padding:10px 12px;background:transparent;border:0;
      color:inherit;font:inherit;cursor:pointer}
    .gb-pad-connect-dot{width:9px;height:9px;flex:none;border-radius:50%;
      background:#22c55e;box-shadow:0 0 0 3px #22c55e20,0 0 9px #22c55e75;
      animation:none!important;opacity:1!important}
    @keyframes gb-pad-connected-pulse{
      0%,100%{opacity:1;box-shadow:0 0 0 3px #22c55e24,0 0 9px #22c55e85}
      50%{opacity:.38;box-shadow:0 0 0 1px #22c55e18,0 0 2px #22c55e35}
    }
    @media(prefers-reduced-motion:reduce){.gb-pad-connect-dot{animation:none!important}}
    .gb-pad-connect-copy{min-width:0;flex:1}
    .gb-pad-connect-title{font-size:11px;line-height:1.4;font-weight:800}
    .gb-pad-connect-name{font-size:10px;line-height:1.4;opacity:.76;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .gb-pad-connect-chevron{font-size:12px;opacity:.65}
    .gb-pad-connect-details{border-top:1px solid #ffffff19;padding:9px 12px 11px;
      font-size:10px;line-height:1.6;color:#cbd2da}
    .gb-pad-connect-details[hidden]{display:none!important}
    .gb-pad-connect-action{margin-top:9px;padding:7px 10px;border-radius:7px;
      border:1px solid #56606d;background:#ffffff12;color:#f4f7fa;
      font:inherit;font-size:10px;cursor:pointer}
    .gb-pad-connect-action:hover{background:#ffffff24}
  `;
  document.head.appendChild(testerStyle);

  // The Gamepad API may expose only an emulated XInput identity. The browser
  // cannot recover the physical 8BitDo model from "Xbox 360 Controller".
  // Let the owner explicitly save the driver-reported name for that ID.
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
    const close = dialog.querySelector(':scope>button[type="button"]');
    if (close) {
      close.classList.add('gb-test-x');
      close.textContent = '×';
      close.title = 'ปิดหน้าทดสอบจอย';
      close.setAttribute('aria-label','ปิดหน้าทดสอบจอย');
    }
    const help = dialog.querySelector('.controller-help');
    if (help) {
      help.classList.add('gb-test-guide');
      const title = document.createElement('strong');
      title.textContent = 'วิธีทดสอบจอย';
      const rows = [
        ['ปุ่มกด','กดปุ่มบนจอย ช่องปุ่มที่ตอบสนองจะสว่างขึ้น'],
        ['ก้านซ้าย','โยกเพื่อทดสอบการเคลื่อนที่แนวนอนและแนวตั้ง'],
        ['ก้านขวา','โยกเพื่อดูทิศทางและการตอบสนองของก้านขวา']
      ];
      const nodes = rows.map(([label,description])=>{
        const row = document.createElement('div');
        row.className = 'gb-guide-row';
        const tag = document.createElement('span');
        tag.className = 'gb-guide-tag';
        tag.textContent = label;
        const detail = document.createElement('span');
        detail.textContent = description;
        row.append(tag,detail);
        return row;
      });
      const note = document.createElement('div');
      note.className = 'gb-guide-note';
      note.textContent = 'หน้านี้ใช้ตรวจสอบสัญญาณจอยเท่านั้น ไม่เปลี่ยนการตั้งค่าปุ่มในเกม';
      help.replaceChildren(title,...nodes,note);
    }
    const picker = dialog.querySelector('.controller-picker');
    const status = dialog.querySelector('.controller-status');
    // Keep all the classic tester's existing nodes and event handlers.
    // Its original script uses showModal() for auto-open on controller connect.
    // Prevent the auto-test from interrupting gameplay / game startup.
    const show = dialog.showModal.bind(dialog);
    dialog.showModal = function() {
      if (isPlaying() && !dialog.dataset.gbUserRequested) return;
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

  // The built-in emulator popup displays the raw XInput ID. Suppress that
  // duplicate and show one themed notice using the same saved identity.
  function initDisconnectNotice() {
    const toast = document.createElement('div');
    toast.className = 'gb-pad-disconnect-toast';
    toast.hidden = true;
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    const emblem = document.createElement('span');
    emblem.className = 'gb-pad-disconnect-icon';
    emblem.innerHTML = controllerIcon;
    const copy = document.createElement('div');
    copy.className = 'gb-pad-disconnect-copy';
    const title = document.createElement('div');
    title.className = 'gb-pad-disconnect-title';
    title.textContent = 'จอยยกเลิกการเชื่อมต่อ';
    const name = document.createElement('div');
    name.className = 'gb-pad-disconnect-name';
    const sub = document.createElement('div');
    sub.className = 'gb-pad-disconnect-sub';
    sub.textContent = 'ตรวจสอบ Bluetooth หรือสายเชื่อมต่อ';
    copy.append(title,name,sub);
    toast.append(emblem,copy);
    document.body.append(toast);
    let timer = null;
    let last = new Map();
    function record() {
      for (const pad of pads()) last.set(pad.index,{id:pad.id});
    }
    function show(pad) {
      if (!pad?.id) return;
      const info = actualName(pad);
      name.textContent = info.name;
      toast.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(()=>{toast.hidden=true;},4100);
      // The old notification has no stable device identity, so hide only
      // that notification; leave controller HUD and tester untouched.
      for (const old of document.querySelectorAll('.controller-disconnect-notice')) {
        old.style.setProperty('display','none','important');
      }
    }
    record();
    window.addEventListener('gamepadconnected',record);
    window.addEventListener('gamepaddisconnected',event=>{
      const remembered = last.get(event.gamepad?.index);
      const disconnected = event.gamepad?.id ? event.gamepad : remembered;
      show(disconnected);
      last.delete(event.gamepad?.index);
    });
    // Legacy code may insert its own popup after our event handler.
    const observer = new MutationObserver(()=>{
      for (const old of document.querySelectorAll('.controller-disconnect-notice'))
        old.style.setProperty('display','none','important');
    });
    observer.observe(document.body,{childList:true,subtree:true});
    const previous = document.createElement('style');
    previous.textContent = '.controller-disconnect-notice,.controller-notice{display:none!important}';
    document.head.append(previous);
  }

  // Gamepad navigation on the game-selection screen only. Never synthesize
  // emulator inputs while the player, a dialog, or a text field is active.
  function initLibraryGamepadNavigation() {
    const style = document.createElement('style');
    style.textContent = `
      .gb-pad-game-selected{outline:3px solid var(--accent,#f3a64c)!important;
        outline-offset:3px!important;box-shadow:0 0 0 6px #f3a64c25!important}
    `;
    document.head.append(style);
    const cardSelectors = [
      '[data-game-id]','[data-rom-id]','.game-card','.rom-card',
      '.game-item','.rom-item','.game-tile','.library-card',
      '[class*="gameCard"]','[class*="romCard"]'
    ].join(',');
    let selected = null, nextMove = 0, wasConfirm = false, lastDirection = '';
    const visible = el => {
      const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
      return rect.width > 25 && rect.height > 25 &&
        css.display !== 'none' && css.visibility !== 'hidden' &&
        !el.closest('[hidden],[inert],[aria-hidden="true"],dialog:not([open])');
    };
    const candidates = () => {
      const found = [...document.querySelectorAll(cardSelectors)]
        .filter(visible);
      return found.filter(el => !found.some(other =>
        other !== el && other.contains(el)));
    };
    function playing() {
      return document.body.classList.contains('in-play') ||
        document.body.classList.contains('player-focus') ||
        !!document.fullscreenElement ||
        !!document.querySelector('dialog[open],input:focus,textarea:focus,select:focus') ||
        !!document.querySelector('#playerHeader:not([hidden])');
    }
    function choose(el) {
      if (selected && selected !== el) selected.classList.remove('gb-pad-game-selected');
      selected = el;
      if (!el) return;
      el.classList.add('gb-pad-game-selected');
      el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
    }
    function move(dx,dy,items) {
      const current = items.includes(selected) ? selected : null;
      if (!current) {choose(items[0]);return;}
      const a = current.getBoundingClientRect();
      const cx = a.left+a.width/2,cy = a.top+a.height/2;
      let best = null,score = Infinity;
      for (const item of items) {
        if (item === current) continue;
        const b = item.getBoundingClientRect();
        const x = b.left+b.width/2-cx,y = b.top+b.height/2-cy;
        const along = x*dx+y*dy,side = Math.abs(x*dy-y*dx);
        if (along <= 6) continue;
        const candidate = along+side*2.5;
        if (candidate < score) {score=candidate;best=item;}
      }
      if (best) choose(best);
    }
    function activate() {
      if (!selected || !visible(selected)) return;
      // Never use the first arbitrary button: on favorite cards that is
      // often the destructive "remove favorite" control.
      const forbidden = /favorite|favourite|bookmark|heart|remove|delete|trash|ลบ|รายการโปรด|ชอบ/i;
      const playable = [...selected.querySelectorAll('button,a,[role="button"]')]
        .filter(el=>visible(el) && !forbidden.test([
          el.className,el.getAttribute('aria-label'),el.getAttribute('title'),
          el.dataset.action,el.textContent?.slice(0,50)
        ].join(' ')));
      const target = playable.find(el=>
        /play|start|launch|open|เล่น|เริ่ม/i.test([
          el.className,el.getAttribute('aria-label'),el.getAttribute('title'),
          el.dataset.action,el.textContent?.slice(0,40)
        ].join(' '))) || playable.find(el=>el.matches('a[href]'));
      if (target) target.click();
      else if (selected.matches('a[href],button,[role="button"]') &&
        !forbidden.test([selected.className,selected.getAttribute('aria-label'),
          selected.getAttribute('title')].join(' '))) selected.click();
      else {
        // Most game tiles launch by clicking their non-button card surface.
        const surface = selected.querySelector('[data-action="play"],[data-action="launch"],.game-cover,.game-image,.rom-cover');
        (surface || selected).click();
      }
    }
    function frame(now) {
      requestAnimationFrame(frame);
      if (playing()) {
        if (selected) selected.classList.remove('gb-pad-game-selected');
        selected = null;wasConfirm = false;lastDirection = '';
        return;
      }
      const items = candidates();
      if (!items.length) {
        if (selected) selected.classList.remove('gb-pad-game-selected');
        selected = null;wasConfirm = false;lastDirection = '';
        return;
      }
      const pad = pads()[0];
      if (!pad) {wasConfirm=false;lastDirection='';return;}
      const buttons = pad.buttons || [];
      const pressed = index => !!buttons[index]?.pressed;
      const x = Math.abs(pad.axes?.[0]||0) > .55 ? Math.sign(pad.axes[0]) :
        (pressed(14)?-1:pressed(15)?1:0);
      const y = Math.abs(pad.axes?.[1]||0) > .55 ? Math.sign(pad.axes[1]) :
        (pressed(12)?-1:pressed(13)?1:0);
      const direction = Math.abs(x)>Math.abs(y) ? (x<0?'left':x>0?'right':'') :
        (y<0?'up':y>0?'down':'');
      if (direction && (direction!==lastDirection || now>=nextMove)) {
        move(direction==='left'?-1:direction==='right'?1:0,
          direction==='up'?-1:direction==='down'?1:0,items);
        nextMove=now+190;
      }
      lastDirection=direction;
      const confirm = pressed(0) || pressed(1);
      if (confirm && !wasConfirm) activate();
      wasConfirm=confirm;
    }
    requestAnimationFrame(frame);
  }
  function initMobileLandscape() {
    const button = document.createElement('button');
    button.className = 'gb-pad-landscape-button';
    button.type = 'button';
    button.title = 'เล่นเต็มจอแนวนอน (คงสัดส่วนภาพ)';
    button.setAttribute('aria-label',button.title);
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m6 10 3-3m-3 0h3v3m9 4-3 3m3 0h-3v-3"/></svg>';
    const findPlayer = () => document.querySelector('#playerScreen,#playerContainer,.player-screen,.player-container,.emulator-container,#emulator-container') ||
      [...document.querySelectorAll('canvas')].find(el=>el.getBoundingClientRect().width>100)?.parentElement;
    const findBar = () => document.querySelector('#playerHeader,.player-toolbar,.player-header,.mobile-toolbar,.player-controls,.top-bar,header');
    const update = () => {
      const connected = pads().length>0;
      document.body.classList.toggle('gb-pad-connected',connected);
      const bar = findBar();
      if (bar && button.parentElement!==bar) bar.append(button);
    };
    button.addEventListener('click',async()=>{
      const target = findPlayer();
      if (!target) return;
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          target.classList.remove('gb-pad-landscape-mode');
          return;
        }
        target.classList.add('gb-pad-landscape-mode');
        await target.requestFullscreen();
        try {await screen.orientation.lock('landscape');} catch {}
      } catch {target.classList.remove('gb-pad-landscape-mode');}
    });
    document.addEventListener('fullscreenchange',()=>{
      if (!document.fullscreenElement)
        document.querySelectorAll('.gb-pad-landscape-mode').forEach(el=>el.classList.remove('gb-pad-landscape-mode'));
    });
    window.addEventListener('gamepadconnected',update);
    window.addEventListener('gamepaddisconnected',update);
    setInterval(update,1600);
    update();
  }
  function initCompactConnectNotice() {
    // One black connection notification; do not stack the legacy popup.
    const style = document.createElement('style');
    style.textContent = '.controller-connect-notice,.controller-connected-notice,' +
      '.gamepad-connected-toast,.gamepad-connect-toast,' +
      '.controller-status-panel{display:none!important}';
    document.head.append(style);
    const toast = document.createElement('div');
    toast.className = 'gb-pad-connect-toast';
    toast.hidden = true;
    toast.setAttribute('role','status');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'gb-pad-connect-trigger';
    trigger.setAttribute('aria-expanded','true');
    trigger.setAttribute('aria-label','ย่อช่องสถานะจอย');
    trigger.title = 'กดเพื่อย่อหรือขยายสถานะจอย ลากเพื่อย้ายตำแหน่ง';
    const dot = document.createElement('span');
    dot.className = 'gb-pad-connect-dot';
    const copy = document.createElement('div');
    copy.className = 'gb-pad-connect-copy';
    const heading = document.createElement('div');
    heading.className = 'gb-pad-connect-title';
    heading.textContent = 'เชื่อมต่อจอยแล้ว';
    const name = document.createElement('div');
    name.className = 'gb-pad-connect-name';
    copy.append(heading,name);
    const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('aria-hidden','true');
    icon.classList.add('gb-pad-connect-game-icon');
    icon.innerHTML = '<path d="M6.5 8h11a4 4 0 0 1 3.9 3.1l1.1 5a2.2 2.2 0 0 1-3.5 2.2L16.5 16h-9l-2.5 2.3a2.2 2.2 0 0 1-3.5-2.2l1.1-5A4 4 0 0 1 6.5 8Z"/><path d="M7 11v4m-2-2h4"/><circle cx="16" cy="11.8" r=".8"/><circle cx="18.5" cy="14" r=".8"/>';
    const miniLed = document.createElement('span');
    miniLed.className = 'gb-pad-connect-mini-led';
    trigger.append(dot,copy,icon);
    toast.append(trigger,miniLed);
    document.body.append(toast);
    let drag = null;
    const dock = () => {
      delete toast.dataset.gbMoved;
      Object.assign(toast.style,{left:'auto',right:'14px',top:'auto',bottom:'max(14px,env(safe-area-inset-bottom))'});
    };
    dock();
    let movedRecently = false;
    const setMinimized = value => {
      toast.classList.toggle('gb-pad-minimized',value);
      trigger.setAttribute('aria-expanded',String(!value));
      trigger.setAttribute('aria-label',value?'ขยายช่องสถานะจอย':'ย่อช่องสถานะจอย');
    };
    trigger.addEventListener('click',()=>{
      if (movedRecently) return;
      setMinimized(!toast.classList.contains('gb-pad-minimized'));
    });
    trigger.addEventListener('pointerdown',event=>{
      if (event.button!==0 || !event.isPrimary) return;
      const rect = toast.getBoundingClientRect();
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
      try {trigger.setPointerCapture(event.pointerId);} catch {}
    });
    trigger.addEventListener('pointermove',event=>{
      if (!drag || drag.id!==event.pointerId) return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if (!drag.moved && Math.hypot(dx,dy)<7) return;
      drag.moved=true;
      toast.classList.add('gb-pad-dragging');
      Object.assign(toast.style,{left:Math.max(0,Math.min(innerWidth-toast.offsetWidth,drag.left+dx))+'px',
        top:Math.max(0,Math.min(innerHeight-toast.offsetHeight,drag.top+dy))+'px',right:'auto',bottom:'auto'});
    });
    const finish=event=>{
      if (!drag || drag.id!==event.pointerId) return;
      movedRecently=drag.moved;
      if (drag.moved) {
        toast.dataset.gbMoved='true';
      }
      drag=null;
      toast.classList.remove('gb-pad-dragging');
      if (movedRecently) setTimeout(()=>{movedRecently=false;},0);
    };
    for(const type of ['pointerup','pointercancel','lostpointercapture']) trigger.addEventListener(type,finish);
    const inGame = () => document.body.classList.contains('in-play') ||
      document.body.classList.contains('player-focus') ||
      !!document.fullscreenElement ||
      !!document.querySelector('#playerHeader:not([hidden])') &&
        getComputedStyle(document.querySelector('#playerHeader:not([hidden])')).display !== 'none';
    let wasPlaying = false;
    const refresh = () => {
      const playing = inGame();
      if (playing && !wasPlaying) dock();
      if (!playing && wasPlaying) dock();
      wasPlaying = playing;
      const fullscreenHost = document.fullscreenElement;
      if (fullscreenHost && !fullscreenHost.contains(toast)) fullscreenHost.append(toast);
      else if (!fullscreenHost && toast.parentElement !== document.body) document.body.append(toast);
      const pad = pads()[0];
      const show = !!pad && playing;
      toast.hidden = !show;
      if (show) {
        const info = actualName(pad);
        name.textContent = info.name;
      }
    };
    window.addEventListener('gamepadconnected',refresh);
    window.addEventListener('gamepaddisconnected',refresh);
    let previousFullscreen = !!document.fullscreenElement;
    document.addEventListener('fullscreenchange',()=>{
      const nowFullscreen = !!document.fullscreenElement;
      if (previousFullscreen && !nowFullscreen) dock();
      previousFullscreen = nowFullscreen;
      refresh();
    });
    const observer = new MutationObserver(refresh);
    observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    setInterval(refresh,450);
    refresh();
  }
  function init() {
    if (!document.body) return;
    initDisconnectNotice();
    initCompactConnectNotice();
    initLibraryGamepadNavigation();
    initMobileLandscape();
    const removeLegacyStatus = () => {
      document.querySelectorAll('details.controller-status-panel').forEach(el=>el.remove());
    };
    removeLegacyStatus();
    const check = () => {
      removeLegacyStatus();
      return enhanceClassicTester();
    };
    check();
    const observer = new MutationObserver(()=>{
      check();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
