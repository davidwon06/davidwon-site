/* davidwon.org project pages: scroll-driven exploded view of a project's CAD.
   Two presets: 'balancer' (3-RRS ball balancer) and 'arm' (6-DOF arm). The preset comes from the mount's
   data-model attribute, else window.DW_EXPLODE_MODEL, else the page URL (/robot-arm -> arm).
   Mounts into window.DW_EXPLODE_MOUNT (default '#dw-explode'), or after the page's first section.
   Needs three.js r128 + GLTFLoader (loaded on demand) and the preset's .glb next to this script. */
(function () {
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  var DIR = SCRIPT_SRC ? SCRIPT_SRC.replace(/[^\/]*(\?.*)?$/, '') : '';
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  var LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';

  // move: how far each part group travels when fully exploded, in metres. r = outward along its leg
  // (balancer legs only), y = up, v = any extra [x,y,z]; at = when it starts moving (0..1 of the explode).
  var PRESETS = {
    balancer: {
      model: 'balancer_explode.glb',
      title: 'What&rsquo;s inside the balancer',
      // Leg directions (unit vectors in the plate plane) from balancer_explode.json, legs 0..2.
      legs: [[-0.866727, 0, -0.498783], [-0.000166, 0, 1.0], [0.860689, 0, -0.509131]],
      move: {
        plate:    { r: 0,     y: 0.125, at: 0.00 },
        joint:    { r: 0.030, y: 0.085, at: 0.10 },
        rodend:   { r: 0.052, y: 0.052, at: 0.20 },
        coupler:  { r: 0.078, y: 0.020, at: 0.30 },
        crank:    { r: 0.098, y: -0.004, at: 0.40 },
        servo:    { r: 0.060, y: -0.042, at: 0.50 },
        camera:   { r: 0,     y: 0.050, at: 0.55 },
        cammount: { r: 0,     y: 0.018, at: 0.60 },
        base:     { r: 0,     y: 0,     at: 0 }
      },
      labels: [
        { g: 'plate',    t: 'Clear plate',             d: '180 mm dia., ball rolls on top' },
        { g: 'joint',    t: 'Plate clamp + ball stud', d: 'on a 97.74 mm radius', q: 3 },
        { g: 'rodend',   t: 'Rod-end spherical joint', d: 'the S in 3-RRS', q: 3 },
        { g: 'coupler',  t: 'Coupler',                 d: '66.96 mm, crank to plate', q: 3 },
        { g: 'crank',    t: 'Crank',                   d: '43.5 mm, on the servo horn', q: 3 },
        { g: 'servo',    t: 'MG996R servo',            d: 'legs 120° apart', q: 3 },
        { g: 'camera',   t: 'Camera Module 3 Wide',    d: 'looks up through the plate' },
        { g: 'cammount', t: 'Camera ring mount',       d: 'centred under the plate' },
        { g: 'base',     t: 'Printed base',            d: 'servo pockets + wiring', dy: -0.03 }
      ],
      last: 'base',
      view: { dist: 0.7, grow: 0.22, y0: -0.02, y1: 0.025, ground: -0.105, grid: 0.5, side: 0.07, shadow: 0.34 }
    },
    arm: {
      model: 'arm_explode.glb',
      title: 'Inside the 6-DOF arm',
      legs: null,
      move: {
        hand:         { v: [0, 0.12, -0.17],    at: 0.00 },
        hand_belt:    { v: [0.11, 0.12, -0.13], at: 0.05 },
        j4_gear:      { v: [0, 0.16, 0.03],     at: 0.10 },
        wrist:        { v: [0, 0.10, -0.07],    at: 0.15 },
        j4_motor:     { v: [-0.11, 0.07, -0.02], at: 0.20 },
        elbow:        { v: [0.06, 0.07, 0],     at: 0.25 },
        elbow_pulley: { v: [0.14, 0.06, 0],     at: 0.30 },
        j2_pulley:    { v: [0.10, 0.04, 0],     at: 0.35 },
        j2_motor:     { v: [-0.13, 0.04, 0.02], at: 0.40 },
        shoulder:     { v: [0, 0.04, 0],        at: 0.45 },
        j1_pulley:    { v: [0, 0.02, 0],        at: 0.50 },
        j3_motor:     { v: [0.15, 0.03, -0.01], at: 0.38 },
        j1_motor:     { v: [0, 0.01, 0.11],     at: 0.55 },
        base:         { v: [0, 0.01, 0],        at: 0.60 },
        frame:        { v: [0, 0, 0],           at: 0 }
      },
      labels: [
        { g: 'hand',      t: 'J5 housing',          d: 'end of the wrist' },
        { g: 'hand_belt', t: 'GT2 belt pulleys',    d: 'drive the last joints' },
        { g: 'wrist',     t: 'J4 wrist housing',    d: 'rides on the elbow pin' },
        { g: 'j4_motor',  t: 'Wrist stepper',       d: 'NEMA 14 (14HS17)' },
        { g: 'elbow',     t: 'Elbow brackets',      d: 'J3 main + support bracket', q: 2 },
        { g: 'j3_motor',  t: 'J3 gearmotor',        d: 'NEMA 17, 5.18:1 planetary' },
        { g: 'j2_pulley', t: '120-tooth pulley',    d: 'HTD-3M belt reduction' },
        { g: 'j2_motor',  t: 'J2 geared stepper',   d: 'NEMA 23 + planetary gearbox' },
        { g: 'shoulder',  t: 'Shoulder housing',    d: 'J1 turntable + J2 bearings' },
        { g: 'j1_motor',  t: 'J1 stepper',          d: 'turns the base through a belt' },
        { g: 'base',      t: 'Base housing',        d: 'J1 thrust + ball bearings' }
      ],
      last: 'base',
      view: { dist: 1.45, grow: 0.35, y0: 0.2, y1: 0.05, ground: 0, grid: 0.8, side: 0.12, rot0: -0.95, rot1: 0.55, shadow: 0.5 }
    }
  };
  var P, MOVE, LABELS, LEGS, MODEL_URL;

  function start() {
    var host = document.querySelector(window.DW_EXPLODE_MOUNT || '#dw-explode');
    // Loaded site-wide from the footer: without an explicit mount, only run on the two project pages.
    var path = location.pathname;
    if (!host && !/\/ball-balancing-robot\/?$|\/robot-arm\/?$/.test(path)) return;
    var key = (host && host.getAttribute('data-model')) || window.DW_EXPLODE_MODEL ||
      (/robot-arm/.test(path) ? 'arm' : 'balancer');
    P = PRESETS[key] || PRESETS.balancer;
    MOVE = P.move; LABELS = P.labels; LEGS = P.legs;
    MODEL_URL = window.DW_EXPLODE_MODEL_URL || DIR + P.model;
    if (!host) {
      var first = document.querySelector('section.page-section');
      if (!first) return;
      host = document.createElement('div'); first.parentNode.insertBefore(host, first.nextSibling);
    }
    if (host.querySelector('.dwx-pin')) return;
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;
    if (window.THREE && THREE.GLTFLoader) return mount(host);
    load(THREE_URL, function () { load(LOADER_URL, function () { mount(host); }); });
  }
  function load(src, cb) {
    if (src === THREE_URL && window.THREE) return cb();
    var s = document.createElement('script'); s.src = src; s.async = true; s.onload = cb; document.head.appendChild(s);
  }
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var ease = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };

  function mount(host) {
    var T = window.THREE;
    var css = document.createElement('style');
    css.textContent =
      '.dwx{position:relative;height:320vh;margin:0;background:#F4F3EF;color:#111418}' +
      '.dwx-pin{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden}' +
      '.dwx canvas{display:block;position:absolute;inset:0}' +
      '.dwx-head{position:absolute;left:4vw;top:max(86px,11vh);z-index:2;font-family:"IBM Plex Mono",ui-monospace,monospace;pointer-events:none}' +
      '.dwx-head .k{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#FF5A1F}' +
      '.dwx-head .t{margin-top:8px;font:600 clamp(22px,2.4vw,32px)/1.15 "IBM Plex Sans",system-ui,sans-serif;color:#111418}' +
      '.dwx-head .s{margin-top:8px;font-size:12px;letter-spacing:.06em;color:#6B7079;max-width:34ch;line-height:1.6}' +
      '.dwx-bar{position:absolute;left:4vw;right:4vw;bottom:28px;z-index:2;display:flex;align-items:center;gap:14px;font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#6B7079;pointer-events:none}' +
      '.dwx-bar i{flex:1;height:1px;background:#D6D3CB;position:relative}.dwx-bar i b{position:absolute;left:0;top:-1px;height:3px;background:#FF5A1F;width:0}' +
      '.dwx-lab{position:absolute;left:0;top:0;z-index:2;opacity:0;transition:opacity .35s ease;pointer-events:auto;cursor:default;white-space:nowrap;font-family:"IBM Plex Mono",ui-monospace,monospace}' +
      '.dwx-lab .dot{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#111418;box-shadow:0 0 0 2px rgba(244,243,239,.9)}' +
      '.dwx-lab .ln{position:absolute;top:0;height:1px;background:#111418;opacity:.6}' +
      '.dwx-lab .box{position:absolute;top:0;transform:translateY(-50%);display:flex;align-items:center;gap:8px;padding:5px 9px 5px 5px;background:rgba(244,243,239,.94);border:1px solid #CFCBC2}' +
      '.dwx-lab .n{flex:none;width:22px;height:22px;border-radius:50%;border:1px solid #111418;display:grid;place-items:center;font:500 10.5px/1 "IBM Plex Mono",ui-monospace,monospace;color:#111418;background:#F4F3EF}' +
      '.dwx-lab .tx{display:block}.dwx-lab .t{display:block;font:600 12.5px/1.2 "IBM Plex Sans",system-ui,sans-serif;color:#111418}' +
      '.dwx-lab .d{display:block;margin-top:2px;font-size:10.5px;letter-spacing:.02em;color:#5E636B}' +
      '.dwx-lab.on{opacity:1}.dwx-lab.hl .box{border-color:#FF5A1F}.dwx-lab.hl .n{background:#FF5A1F;border-color:#FF5A1F;color:#fff}' +
      '.dwx-bom{position:absolute;left:4vw;bottom:64px;z-index:2;font:11px/1 "IBM Plex Mono",ui-monospace,monospace;color:#3A3F47;border-collapse:collapse;background:rgba(244,243,239,.9)}' +
      '.dwx-bom caption{text-align:left;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6B7079;padding:0 0 6px}' +
      '.dwx-bom th{font-weight:500;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#6B7079;text-align:left;padding:4px 10px 4px 0;border-bottom:1px solid #111418}' +
      '.dwx-bom td{padding:4px 10px 4px 0;border-bottom:1px solid #DDD9D0;white-space:nowrap}.dwx-bom td:last-child,.dwx-bom th:last-child{text-align:right;padding-right:0}' +
      '.dwx-bom tr.hl td{color:#FF5A1F}' +
      '@media (max-height:760px){.dwx-bom{display:none}}' +
      '.dwx-cap{display:none;position:absolute;left:16px;right:16px;bottom:58px;z-index:2;font-family:"IBM Plex Mono",ui-monospace,monospace;border-left:2px solid #FF5A1F;padding:4px 0 4px 12px;pointer-events:none}' +
      '.dwx-cap .t{display:block;font:600 16px/1.25 "IBM Plex Sans",system-ui,sans-serif;color:#111418}.dwx-cap .d{display:block;margin-top:4px;font-size:12px;color:#6B7079}' +
      '@media (max-width:767px){.dwx-lab,.dwx-bom{display:none}.dwx-cap{display:block}.dwx{height:260vh}.dwx-head{top:72px}.dwx-head .s{display:none}.dwx-lab .d{display:none}.dwx-lab .t{font-size:11.5px}.dwx-lab .box{padding:4px 7px}}' +
      '@media (prefers-reduced-motion:reduce){.dwx{height:auto}.dwx-pin{position:relative;height:80vh}}';
    document.head.appendChild(css);

    var wrap = document.createElement('div'); wrap.className = 'dwx';
    var pin = document.createElement('div'); pin.className = 'dwx-pin'; wrap.appendChild(pin);
    host.appendChild(wrap);
    var head = document.createElement('div'); head.className = 'dwx-head';
    head.innerHTML = '<div class="k">Exploded view</div><div class="t">' + P.title + '</div>' +
      '<div class="s">Scroll to take it apart. Hover a label to find the part.</div>';
    pin.appendChild(head);
    var bar = document.createElement('div'); bar.className = 'dwx-bar';
    bar.innerHTML = '<span>Assembled</span><i><b></b></i><span>Exploded</span>';
    pin.appendChild(bar);
    var barFill = bar.querySelector('b');
    var cap = document.createElement('div'); cap.className = 'dwx-cap';
    cap.innerHTML = '<span class="t"></span><span class="d"></span>'; pin.appendChild(cap);
    var capT = cap.querySelector('.t'), capD = cap.querySelector('.d'), capKey = '';

    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xF4F3EF, 0);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.physicallyCorrectLights = true;
    pin.appendChild(renderer.domElement);
    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(28, 1, 0.01, 10);

    // Studio environment for reflections: a grey room with three soft-box panels, prefiltered once.
    (function () {
      var env = new T.Scene();
      env.add(new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x5E6266, side: T.BackSide })));
      [[0, 4.9, 0, -Math.PI / 2, 0, 6, 6, 5], [-4.9, 1.5, 1, 0, Math.PI / 2, 3, 4, 3.2], [4.9, 1, -1.5, 0, -Math.PI / 2, 2.5, 3, 1.6], [0, 1, 4.9, 0, Math.PI, 5, 2, 1.2]]
        .forEach(function (b) {
          var mat = new T.MeshBasicMaterial({ side: T.DoubleSide }); mat.color.setScalar(b[7]);
          var p = new T.Mesh(new T.PlaneGeometry(b[5], b[6]), mat); p.position.set(b[0], b[1], b[2]); p.rotation.set(b[3], b[4], 0); env.add(p);
        });
      var pm = new T.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(env, 0.035).texture; pm.dispose();
    })();
    var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(0.6, 1.4, 0.9); scene.add(key);
    scene.add(new T.HemisphereLight(0xffffff, 0xB8B3A8, 0.35));
    var root = new T.Group(); scene.add(root);
    var grid = new T.GridHelper(P.view.grid, 24, 0xD9D5CC, 0xE6E2DA); grid.position.y = P.view.ground; root.add(grid);
    // Soft contact shadow under the fixed base.
    (function () {
      var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
      var rg = g.createRadialGradient(64, 64, 4, 64, 64, 62); rg.addColorStop(0, 'rgba(17,20,24,.38)'); rg.addColorStop(1, 'rgba(17,20,24,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
      var sh = new T.Mesh(new T.PlaneGeometry(P.view.shadow, P.view.shadow), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = P.view.ground + 0.0005; root.add(sh);
    })();

    var ACC = 0xFF5A1F;
    function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }
    // Material library, keyed by the '__suffix' on each node name.
    var MATS = {
      print: { color: 0xD3D0C9, roughness: 0.62, metalness: 0 },          // printed PLA, light grey
      metal: { color: 0xC2C6CB, roughness: 0.32, metalness: 0.95 },       // aluminium: frame, pulleys
      steel: { color: 0xA9AEB4, roughness: 0.26, metalness: 1 },          // bearings, shafts, rod ends
      motor: { color: 0x2C2F34, roughness: 0.42, metalness: 0.6 },        // stepper bodies
      servo: { color: 0x202226, roughness: 0.55, metalness: 0.05 },       // black plastic servos
      pcb:   { color: 0x1F5E3A, roughness: 0.5, metalness: 0.1 },
      dark:  { color: 0x26292D, roughness: 0.45, metalness: 0.3 },
      glass: { color: 0xC9DCE6, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide }
    };
    function makeMat(name) {
      var d = MATS[name] || MATS.print, o = {};
      for (var k in d) o[k] = d[k];
      o.color = lin(d.color); o.envMapIntensity = name === 'print' ? 0.55 : 1;
      if (name !== 'glass') { o.polygonOffset = true; o.polygonOffsetFactor = 1; o.polygonOffsetUnits = 1; }
      return new T.MeshStandardMaterial(o);
    }

    // Normals that stay smooth across curved faces but break at sharp edges (like a CAD shaded view).
    function creased(geo, angle) {
      var g = geo.index ? geo.toNonIndexed() : geo.clone(), pos = g.attributes.position, n = pos.count;
      var nrm = new Float32Array(n * 3), fn = new Float32Array(n), cosA = Math.cos(angle), map = {};
      var a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
      var face = new Float32Array(n);
      var fnorm = [];
      for (var f = 0; f < n / 3; f++) {
        a.fromBufferAttribute(pos, f * 3); b.fromBufferAttribute(pos, f * 3 + 1); c.fromBufferAttribute(pos, f * 3 + 2);
        e1.subVectors(c, b); e2.subVectors(a, b); e1.cross(e2);
        var w = e1.length(); if (w > 0) e1.divideScalar(w);
        fnorm.push(e1.x, e1.y, e1.z, w);
        for (var k = 0; k < 3; k++) {
          var i = f * 3 + k;
          var h = Math.round(pos.getX(i) * 1e5) + ',' + Math.round(pos.getY(i) * 1e5) + ',' + Math.round(pos.getZ(i) * 1e5);
          (map[h] = map[h] || []).push(f);
        }
      }
      for (f = 0; f < n / 3; f++) {
        var fx = fnorm[f * 4], fy = fnorm[f * 4 + 1], fz = fnorm[f * 4 + 2];
        for (k = 0; k < 3; k++) {
          i = f * 3 + k;
          h = Math.round(pos.getX(i) * 1e5) + ',' + Math.round(pos.getY(i) * 1e5) + ',' + Math.round(pos.getZ(i) * 1e5);
          var sx = 0, sy = 0, sz = 0, L = map[h];
          for (var j = 0; j < L.length; j++) {
            var q = L[j] * 4, gx = fnorm[q], gy = fnorm[q + 1], gz = fnorm[q + 2];
            if (gx * fx + gy * fy + gz * fz >= cosA) { var ww = fnorm[q + 3]; sx += gx * ww; sy += gy * ww; sz += gz * ww; }
          }
          var l = Math.hypot(sx, sy, sz) || 1;
          nrm[i * 3] = sx / l; nrm[i * 3 + 1] = sy / l; nrm[i * 3 + 2] = sz / l;
        }
      }
      g.setAttribute('normal', new T.BufferAttribute(nrm, 3));
      return g;
    }

    var parts = {};   // group key (e.g. 'crank') -> [{obj, mats, edges, dir, leg, at}]
    var centres = {}; // 'key|leg' -> centre of that group's parts (model space)
    function legDir(i) { return new T.Vector3(LEGS[i][0], 0, LEGS[i][2]); }

    new T.GLTFLoader().load(MODEL_URL, function (gltf) {
      var boxes = {};
      gltf.scene.traverse(function (o) {
        if (!o.isMesh) return;
        var full = o.name.replace(/_\d+$/, ''), sp = full.split('__'), name = sp[0], matName = sp[1] || 'print';
        var m = name.match(/^([a-z0-9_]*?[a-z_])(\d)?$/); if (!m) return;
        var key = m[1], leg = m[2] === undefined || !LEGS ? -1 : +m[2];
        if (!LEGS && m[2] !== undefined) key = name;
        var holder = new T.Group();
        var mat = makeMat(matName);
        var mesh = new T.Mesh(creased(o.geometry, 32 * Math.PI / 180), mat);
        var edgeOp = matName === 'print' ? 0.45 : matName === 'glass' ? 0.7 : 0.22;
        var edges = new T.LineSegments(new T.EdgesGeometry(o.geometry, matName === 'metal' || matName === 'steel' ? 50 : 33),
          new T.LineBasicMaterial({ color: 0x15181C, transparent: true, opacity: edgeOp }));
        holder.add(mesh); holder.add(edges); root.add(holder);
        o.geometry.computeBoundingBox();
        var bk = key + '|' + leg; (boxes[bk] = boxes[bk] || new T.Box3()).union(o.geometry.boundingBox);
        var mv = MOVE[key] || { at: 0 };
        var dir = (leg >= 0 ? legDir(leg).multiplyScalar(mv.r || 0) : new T.Vector3()).add(new T.Vector3(0, mv.y || 0, 0));
        if (mv.v) dir.add(new T.Vector3(mv.v[0], mv.v[1], mv.v[2]));
        (parts[key] = parts[key] || []).push({ obj: holder, mat: mat, edges: edges, edgeOp: edgeOp, dir: dir, leg: leg, at: mv.at });
      });
      for (var bk in boxes) centres[bk] = boxes[bk].getCenter(new T.Vector3());
      if (/[?&]dwxdebug/.test(location.search)) window.__dwx = { parts: parts, render: function () { render(); } };
      buildLabels(); resize(); render(); wrap.classList.add('ready');
    });

    // ---------- labels ----------
    var labs = [], bomRows = {};
    function buildLabels() {
      var bom = document.createElement('table'); bom.className = 'dwx-bom';
      bom.innerHTML = '<caption>Parts list</caption><thead><tr><th>No.</th><th>Part</th><th>Qty</th></tr></thead><tbody></tbody>';
      var tb = bom.querySelector('tbody'), num = 0;
      LABELS.forEach(function (L) {
        if (!parts[L.g]) return;
        var no = ('0' + (++num)).slice(-2);
        var el = document.createElement('div'); el.className = 'dwx-lab';
        el.innerHTML = '<span class="ln"></span><span class="dot"></span><span class="box"><span class="n"></span><span class="tx"><span class="t"></span><span class="d"></span></span></span>';
        el.querySelector('.n').textContent = no; el.querySelector('.t').textContent = L.t; el.querySelector('.d').textContent = L.d;
        el.addEventListener('mouseenter', function () { hl = L.g; render(); });
        el.addEventListener('mouseleave', function () { hl = null; render(); });
        pin.appendChild(el);
        labs.push({ L: L, el: el, ln: el.querySelector('.ln'), box: el.querySelector('.box') });
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + no + '</td><td></td><td>' + (L.q || 1) + '</td>'; tr.children[1].textContent = L.t;
        tr.addEventListener('mouseenter', function () { hl = L.g; render(); });
        tr.addEventListener('mouseleave', function () { hl = null; render(); });
        tb.appendChild(tr); bomRows[L.g] = tr;
      });
      if (!P.noBom) pin.appendChild(bom);
    }
    var hl = null;

    // Pick which leg to label: the one pointing most toward the viewer.
    var tmp = new T.Vector3(), tmp2 = new T.Vector3();
    function frontLeg() {
      if (!LEGS) return -1;
      var best = 0, bd = -9, view = tmp2.copy(cam.position).sub(root.position).setY(0).normalize();
      for (var i = 0; i < 3; i++) {
        var d = legDir(i).applyAxisAngle(new T.Vector3(0, 1, 0), root.rotation.y).dot(view);
        if (d > bd) { bd = d; best = i; }
      }
      return best;
    }

    // ---------- layout ----------
    var W = 1, H = 1, mobile = false;
    function resize() {
      W = pin.clientWidth; H = pin.clientHeight; mobile = W < 768;
      renderer.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix();
      render();
    }
    window.addEventListener('resize', resize);

    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function progress() {
      if (reduce) return 1;
      var r = wrap.getBoundingClientRect(), span = r.height - H;
      return span > 0 ? clamp01(-r.top / span) : 1;
    }

    function render() {
      var p = progress();
      var e = clamp01((p - 0.06) / 0.72);         // explode progress (holds assembled briefly, then exploded at the end)
      barFill.style.width = (e * 100).toFixed(1) + '%';
      // camera: slow orbit and pull back as it opens up
      root.rotation.y = P.view.rot0 !== undefined ? P.view.rot0 + p * P.view.rot1 : 0.35 + p * 0.9;
      var asp = W / H;
      var V = P.view;
      var dist = (V.dist + e * V.grow) * (asp < 1.3 ? Math.max(1.25, (0.8 + 0.2 * e) / asp) : 1);
      var el = 0.5 - e * 0.14;
      var look = new T.Vector3(!mobile && asp > 1.3 ? -V.side - e * V.side * 0.7 : 0, V.y0 + e * V.y1, 0);
      cam.position.set(look.x, look.y + Math.sin(el) * dist, Math.cos(el) * dist);
      cam.lookAt(look);
      // phones: one caption for the part that is moving right now, highlighted in orange
      var cur = null;
      if (mobile) {
        cur = e < 0.03 ? null : LABELS[0].g;
        LABELS.forEach(function (L) { if (L.g !== P.last && e >= MOVE[L.g].at + 0.03) cur = L.g; });
        if (e > 0.97) cur = P.last;
        var key = cur || '';
        if (key !== capKey) {
          capKey = key;
          var L = LABELS.filter(function (x) { return x.g === key; })[0];
          capT.textContent = L ? L.t : 'Scroll to take it apart';
          capD.textContent = L ? L.d : 'it comes apart one layer at a time';
        }
      }
      // move parts
      Object.keys(parts).forEach(function (k) {
        parts[k].forEach(function (pt) {
          var t = ease((e - pt.at) / (1 - pt.at) * 1.6);
          pt.obj.position.copy(pt.dir).multiplyScalar(t);
          if (mobile) { pt.obj.position.x *= 0.7; pt.obj.position.z *= 0.7; }
          var on = hl === k || (mobile && cur === k);
          pt.mat.emissive.setHex(on ? ACC : 0x000000); pt.mat.emissiveIntensity = on ? 0.55 : 0;
          pt.edges.material.color.setHex(on ? ACC : 0x15181C); pt.edges.material.opacity = on ? 0.9 : pt.edgeOp;
        });
      });
      renderer.render(scene, cam);
      placeLabels(e);
    }

    function placeLabels(e) {
      var leg = frontLeg(), placed = [];
      labs.forEach(function (lb) {
        var list = parts[lb.L.g], pt = list[0];
        for (var i = 0; i < list.length; i++) if (list[i].leg === leg) pt = list[i];
        var show = e > pt.at + 0.18 || (lb.L.g === P.last && e > 0.7);
        tmp.copy(centres[lb.L.g + '|' + pt.leg]).add(pt.obj.position);
        if (lb.L.dy) tmp.y += lb.L.dy;
        tmp.applyMatrix4(root.matrixWorld).project(cam);
        var x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
        var right = mobile ? x < W * 0.5 : x > W * 0.55;
        var len = mobile ? 14 : 28, bw = lb.box.offsetWidth || 200, bh = lb.box.offsetHeight || 40;
        if (right && x + len + bw > W - 12) right = false;
        else if (!right && x - len - bw < 12) right = true;
        var x0 = right ? x + len : x - len - bw;
        // keep clear of the parts list in the lower left
        var bomEl = pin.querySelector('.dwx-bom');
        if (!right && bomEl && bomEl.offsetWidth) {
          var br = bomEl.getBoundingClientRect(), pr = pin.getBoundingClientRect();
          if (x0 < br.right - pr.left + 8 && y + bh / 2 > br.top - pr.top - 8) { right = true; x0 = x + len; }
        }
        placed.push({ lb: lb, x: x, y: y, by: y, right: right, len: len, x0: x0, x1: x0 + bw, bh: bh, show: show });
      });
      // Push overlapping label boxes apart vertically (the dot stays on the part; the leader line angles).
      var vis = placed.filter(function (q) { return q.show; }).sort(function (a, b) { return a.y - b.y; });
      for (var it = 0; it < 4; it++) {
        for (var i = 0; i < vis.length; i++) for (var j = i + 1; j < vis.length; j++) {
          var a = vis[i], b = vis[j];
          if (a.x1 < b.x0 || b.x1 < a.x0) continue;
          var need = (a.bh + b.bh) / 2 + 4 - (b.by - a.by);
          if (need > 0) { a.by -= need / 2; b.by += need / 2; }
        }
      }
      placed.forEach(function (q) {
        var lb = q.lb, dy = q.by - q.y, ex = q.right ? q.len : -q.len;
        lb.el.style.transform = 'translate(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px)';
        lb.ln.style.left = '0'; lb.ln.style.transformOrigin = '0 0';
        lb.ln.style.width = Math.hypot(ex, dy).toFixed(1) + 'px';
        lb.ln.style.transform = 'rotate(' + Math.atan2(dy, ex).toFixed(4) + 'rad)';
        lb.box.style.top = dy.toFixed(1) + 'px';
        lb.box.style.left = q.right ? q.len + 'px' : 'auto'; lb.box.style.right = q.right ? 'auto' : q.len + 'px';
        lb.box.style.flexDirection = q.right ? 'row' : 'row-reverse';
        lb.box.style.padding = q.right ? '5px 9px 5px 5px' : '5px 5px 5px 9px';
        lb.box.style.textAlign = q.right ? 'left' : 'right';
        lb.el.classList.toggle('on', q.show);
        lb.el.classList.toggle('hl', hl === lb.L.g);
        if (bomRows[lb.L.g]) bomRows[lb.L.g].classList.toggle('hl', hl === lb.L.g);
      });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; render(); });
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
