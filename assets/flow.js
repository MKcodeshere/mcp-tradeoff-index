/* Data flow: Plain MCP vs Smart MCP. Two SVG charts on one virtual clock,
   so pausing freezes both mid-flight and nothing jumps on resume. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- virtual clock ----------
  var now = 0, last = null, paused = false, running = false, timers = [], tweens = [];
  function frame(t) {
    if (last !== null && !paused) now += Math.min(64, t - last);
    last = t;
    timers = timers.filter(function (w) { if (now >= w.at) { w.res(); return false; } return true; });
    tweens = tweens.filter(function (tw) { var k = Math.min(1, (now - tw.t0) / tw.ms); tw.step(k); if (k >= 1) { tw.res(); return false; } return true; });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  function wait(ms) { return new Promise(function (res) { timers.push({ at: now + ms, res: res }); }); }
  function tween(ms, step) { return new Promise(function (res) { tweens.push({ t0: now, ms: ms, step: step, res: res }); }); }
  var ease = function (k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; };

  // ---------- geometry (viewBox 1120 x 300) ----------
  var X = { clients: [20, 180], llm: [230, 410], mcp: [460, 640], plat: [690, 870], data: [920, 1100] };
  var LANE = { fwd: 134, ret: 170 };

  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function node(svg, key, title, sub, cls) {
    var g = el('g', { 'class': 'fn ' + (cls || ''), 'data-node': key }, svg);
    var x = X[key][0], w = X[key][1] - X[key][0];
    el('rect', { x: x, y: 92, width: w, height: 116, rx: 14, 'class': 'fn-box' }, g);
    el('text', { x: x + 16, y: 124, 'class': 'fn-title' }, g, title);
    sub.forEach(function (s, i) { el('text', { x: x + 16, y: 148 + i * 18, 'class': 'fn-sub' }, g, s); });
    return g;
  }

  function build(svg, kind) {
    svg.setAttribute('viewBox', '0 36 1120 238');
    // lanes first, under the nodes
    var lanes = el('g', { 'class': 'flanes' }, svg);
    var pairs = kind === 'plain' ? [['clients', 'llm'], ['llm', 'mcp'], ['mcp', 'data']] : [['clients', 'llm'], ['llm', 'mcp'], ['mcp', 'plat'], ['plat', 'data']];
    pairs.forEach(function (p) {
      var x1 = X[p[0]][1], x2 = X[p[1]][0];
      el('line', { x1: x1, y1: LANE.fwd, x2: x2, y2: LANE.fwd, 'class': 'flane' }, lanes);
      el('line', { x1: x1, y1: LANE.ret, x2: x2, y2: LANE.ret, 'class': 'flane' }, lanes);
    });
    // clients
    var cg = el('g', { 'class': 'fn fn-clients', 'data-node': 'clients' }, svg);
    el('rect', { x: 20, y: 40, width: 160, height: 220, rx: 14, 'class': 'fn-box' }, cg);
    el('text', { x: 36, y: 68, 'class': 'fn-eyebrow' }, cg, 'AI CLIENTS');
    ['Cursor', 'Claude Code', 'Codex', 'Pi'].forEach(function (n, i) {
      el('rect', { x: 36, y: 84 + i * 42, width: 128, height: 32, rx: 8, 'class': 'fn-chip' }, cg);
      el('text', { x: 50, y: 105 + i * 42, 'class': 'fn-chiptext' }, cg, n);
    });
    node(svg, 'llm', "Your client's model", kind === 'plain' ? ['Plans the query', 'Writes every SQL statement', 'Reads the raw rows'] : ['Picks the Smart MCP tool', 'Writes no SQL', 'Reads the answer'], 'fn-llm');
    node(svg, 'mcp', 'MCP server', kind === 'plain' ? ['list_tables', 'describe_table', 'run_sql'] : ['sales_copilot(question)', 'one tool call', ''], 'fn-mcp');
    if (kind === 'plain') {
      var gh = el('g', { 'class': 'fn fn-ghost', 'data-node': 'plat' }, svg);
      el('rect', { x: X.plat[0], y: 92, width: 180, height: 116, rx: 14, 'class': 'fn-box' }, gh);
      el('text', { x: X.plat[0] + 16, y: 124, 'class': 'fn-title' }, gh, 'No model here');
      el('text', { x: X.plat[0] + 16, y: 148, 'class': 'fn-sub' }, gh, 'SQL passes straight');
      el('text', { x: X.plat[0] + 16, y: 166, 'class': 'fn-sub' }, gh, 'through to the data');
    } else {
      var pg = node(svg, 'plat', "Platform's model", [], 'fn-plat');
      ['Plan', 'Semantic model', 'Text-to-SQL'].forEach(function (t, i) {
        var y = 140 + i * 22;
        el('circle', { cx: X.plat[0] + 22, cy: y, r: 6, 'class': 'fn-tick', 'data-tick': i }, pg);
        el('text', { x: X.plat[0] + 36, y: y + 4, 'class': 'fn-sub' }, pg, t);
      });
    }
    node(svg, 'data', 'Data platform', ['Snowflake, Databricks,', 'BigQuery, ClickHouse…', 'runs the SQL'], 'fn-data');
    // thinking dots for the two model nodes
    ['llm', 'plat'].forEach(function (k) {
      if (kind === 'plain' && k === 'plat') return;
      var g = el('g', { 'class': 'fthink', 'data-think': k }, svg);
      for (var i = 0; i < 3; i++) el('circle', { cx: X[k][1] - 40 + i * 11, cy: 118, r: 3.5, style: 'animation-delay:' + (i * 0.15) + 's' }, g);
    });
    // packet layer
    el('g', { 'class': 'fpackets' }, svg);
  }

  function hl(svg, keys) {
    Array.prototype.forEach.call(svg.querySelectorAll('.fn'), function (n) { n.toggleAttribute('data-on', keys.indexOf(n.getAttribute('data-node')) >= 0); });
  }
  function think(svg, key, on) { var t = svg.querySelector('[data-think="' + key + '"]'); if (t) t.toggleAttribute('data-on', on); }

  // A packet travels along a lane through a list of node keys
  function packet(svg, hops, lane, label, kind, ms) {
    var layer = svg.querySelector('.fpackets');
    var g = el('g', { 'class': 'fpk fpk-' + kind }, layer);
    var y = LANE[lane];
    var ty = lane === 'fwd' ? 64 : 254;
    var stem = el('line', { x1: 0, y1: y, x2: 0, y2: lane === 'fwd' ? 72 : 238, 'class': 'fpk-stem' }, g);
    var txt = el('text', { x: 0, y: ty, 'class': 'fpk-label', 'text-anchor': 'middle' }, g, label);
    var bb = txt.getBBox();
    var bg = el('rect', { x: -bb.width / 2 - 8, y: bb.y - 4, width: bb.width + 16, height: bb.height + 8, rx: 6, 'class': 'fpk-bg' }, null);
    g.insertBefore(bg, txt);
    el('circle', { cx: 0, cy: y, r: 6, 'class': 'fpk-dot' }, g);
    // waypoints: edge of first node to edge of last node, in direction of travel
    var dir = X[hops[hops.length - 1]][0] > X[hops[0]][0] ? 1 : -1;
    var x1 = dir > 0 ? X[hops[0]][1] : X[hops[0]][0];
    var x2 = dir > 0 ? X[hops[hops.length - 1]][0] : X[hops[hops.length - 1]][1];
    var clampX = function (x) { return Math.max(200 + bb.width / 2, Math.min(1100 - bb.width / 2, x)); };
    g.style.opacity = 0;
    return tween(ms, function (k) {
      var e = ease(k), x = x1 + (x2 - x1) * e;
      g.style.opacity = k < 0.08 ? k / 0.08 : k > 0.92 ? (1 - k) / 0.08 : 1;
      g.querySelector('.fpk-dot').setAttribute('cx', x);
      stem.setAttribute('x1', x); stem.setAttribute('x2', x);
      var lx = clampX(x);
      txt.setAttribute('x', lx);
      bg.setAttribute('x', lx - bb.width / 2 - 8);
    }).then(function () { g.remove(); });
  }

  // ---------- the two stories ----------
  var STEPS = {
    plain: [
      'You ask in Cursor, Claude Code, Codex or Pi.',
      "Your client's model plans. It sees only table and column names.",
      'It calls run_sql. The MCP server passes the SQL straight to the data platform.',
      "Raw customer rows come back into your model's context.",
      "It samples again to guess what 'active' means.",
      'Your model answers with its own definition. One model did everything.'
    ],
    smart: [
      'You ask in Cursor, Claude Code, Codex or Pi.',
      "Your client's model picks the Smart MCP tool. It writes no SQL.",
      'One tool call carries the question in plain English.',
      "The platform's model plans, reads the semantic model and writes the SQL.",
      'The data platform runs it. Rows stay inside the platform.',
      'An answer comes back. Two models ran; the platform bills AI credits on top of your tokens.'
    ]
  };

  function setStep(chart, i) {
    Array.prototype.forEach.call(chart.querySelectorAll('.fsteps li'), function (li, j) {
      li.toggleAttribute('data-on', j === i);
      li.toggleAttribute('data-done', j < i);
    });
  }
  function setCalls(chart, n) { var c = chart.querySelector('[data-calls]'); if (c) c.textContent = n; }

  async function runPlain(chart) {
    var svg = chart.querySelector('svg');
    setCalls(chart, 0);
    setStep(chart, 0); hl(svg, ['clients']);
    await packet(svg, ['clients', 'llm'], 'fwd', 'How many active customers in Chennai?', 'q', 1300);
    setStep(chart, 1); hl(svg, ['llm']); think(svg, 'llm', true);
    await wait(1200); think(svg, 'llm', false);
    var trips = [['SELECT * FROM dim_cust LIMIT 20', '20 customer rows', 3], ['SELECT DISTINCT cust_flg_3', '0, 1, 2', 4], ["SELECT count(*) … cust_flg_3 = 0", '4,812', 5]];
    for (var i = 0; i < trips.length; i++) {
      setStep(chart, i === 0 ? 2 : 4); hl(svg, ['llm', 'mcp', 'data']);
      setCalls(chart, trips[i][2]);
      await packet(svg, ['llm', 'data'], 'fwd', 'run_sql: ' + trips[i][0], 'sql', 1500);
      if (i === 0) setStep(chart, 3);
      await packet(svg, ['data', 'llm'], 'ret', trips[i][1], i === 0 ? 'rows' : 'data', 1400);
      think(svg, 'llm', true); await wait(500); think(svg, 'llm', false);
    }
    setStep(chart, 5); hl(svg, ['llm', 'clients']);
    await packet(svg, ['llm', 'clients'], 'ret', 'About 4,812 (guessed)', 'ans-bad', 1300);
  }

  async function runSmart(chart) {
    var svg = chart.querySelector('svg');
    var ticks = svg.querySelectorAll('.fn-tick');
    Array.prototype.forEach.call(ticks, function (t) { t.removeAttribute('data-on'); });
    setCalls(chart, 0);
    setStep(chart, 0); hl(svg, ['clients']);
    await packet(svg, ['clients', 'llm'], 'fwd', 'How many active customers in Chennai?', 'q', 1300);
    setStep(chart, 1); hl(svg, ['llm']); think(svg, 'llm', true);
    await wait(900); think(svg, 'llm', false);
    setStep(chart, 2); hl(svg, ['llm', 'mcp']); setCalls(chart, 1);
    await packet(svg, ['llm', 'mcp'], 'fwd', 'sales_copilot(question)', 'smart', 1300);
    await packet(svg, ['mcp', 'plat'], 'fwd', 'question', 'smart', 900);
    setStep(chart, 3); hl(svg, ['plat']); think(svg, 'plat', true);
    for (var i = 0; i < 3; i++) { await wait(700); ticks[i].setAttribute('data-on', ''); }
    think(svg, 'plat', false);
    setStep(chart, 4); hl(svg, ['plat', 'data']);
    await packet(svg, ['plat', 'data'], 'fwd', 'SQL', 'sql', 1000);
    await packet(svg, ['data', 'plat'], 'ret', 'rows', 'rows-in', 1000);
    setStep(chart, 5); hl(svg, ['plat', 'mcp', 'llm']);
    await packet(svg, ['plat', 'llm'], 'ret', 'Answer: 3,967 + summary', 'ans', 1500);
    hl(svg, ['llm', 'clients']);
    await packet(svg, ['llm', 'clients'], 'ret', '3,967 active customers', 'ans', 1200);
  }

  function finalState(chart, kind) {
    var svg = chart.querySelector('svg');
    setStep(chart, STEPS[kind].length);
    setCalls(chart, kind === 'plain' ? 5 : 1);
    hl(svg, kind === 'plain' ? ['llm', 'mcp', 'data'] : ['llm', 'mcp', 'plat', 'data']);
    Array.prototype.forEach.call(svg.querySelectorAll('.fn-tick'), function (t) { t.setAttribute('data-on', ''); });
  }

  async function loop(charts) {
    if (running) return; running = true;
    while (true) {
      await Promise.all([runPlain(charts.plain), runSmart(charts.smart)]);
      finalState(charts.plain, 'plain'); finalState(charts.smart, 'smart');
      await wait(2600);
    }
  }

  window.mountFlow = function (root) {
    if (root.dataset.mounted) { paused = false; syncBtn(); return; }
    root.dataset.mounted = '1';
    var charts = {};
    ['plain', 'smart'].forEach(function (kind) {
      var chart = root.querySelector('[data-flow="' + kind + '"]');
      chart.querySelector('.fsteps').innerHTML = STEPS[kind].map(function (s) { return '<li>' + s + '</li>'; }).join('');
      build(chart.querySelector('svg'), kind);
      charts[kind] = chart;
    });
    var btn = document.getElementById('flow-play');
    function syncBtn() { btn.textContent = paused ? 'Play' : 'Pause'; btn.setAttribute('aria-pressed', String(!paused)); }
    window.mountFlow.sync = syncBtn;
    btn.addEventListener('click', function () { paused = !paused; syncBtn(); });
    if (reduce) { finalState(charts.plain, 'plain'); finalState(charts.smart, 'smart'); btn.hidden = true; return; }
    syncBtn();
    loop(charts);
  };
  function syncBtn() { if (window.mountFlow.sync) window.mountFlow.sync(); }
  window.pauseFlow = function () { paused = true; syncBtn(); };
})();
