(function () {
  'use strict';
  var A = window.ATLAS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var P = A.platforms;
  var byId = {}; P.forEach(function (p) { byId[p.id] = p; });
  var shortName = function (p) { return p.name.replace(/ \((.*)\)$/, ''); };

  /* ---------- Derived fields ---------- */
  var ROUTE = {
    snowflake: 'Stored procedure over a semantic view, as a GENERIC tool',
    horizon: 'Same as Snowflake: procedure over a semantic view',
    databricks: 'Metric views through the SQL or UC functions MCP',
    'unity-catalog': 'Metric views through the SQL or UC functions MCP',
    fabric: 'DAX over semantic model measures', powerbi: 'DAX over semantic model measures',
    dbt: 'query_metrics, with text_to_sql off', looker: 'query on explores and measures',
    denodo: 'run_vql_query over metric views', 'denodo-catalog': 'metadata_search plus VQL',
    clickhouse: 'Context server from the Add context tab', redshift: 'Comments plus dbt or Cube metrics',
    teradata: 'Semantic cubes declared in the server YAML', tableau: 'query-datasource over published sources',
    bigquery: 'execute_sql_readonly plus Looker or dbt metrics', omni: 'runQuery on topics', thoughtspot: 'Query the warehouse semantic layer directly',
    starburst: 'parametrizedQuery over data products', malloy: 'Already one LLM: query the Malloy model',
    atscale: 'Already one LLM: run_query', kyvos: 'Already one LLM: kyvos_execute_query', wrenai: 'Already one LLM: run_sql on the MDL',
    honeydew: 'get_data_from_fields', strategy: 'Mosaic query tools, not ask_agent', metabase: 'execute_query on metrics and models'
  };
  P.forEach(function (p) {
    p.byo = p.smart && (p.model === 'byo' || (p.model === 'multi' && /your own|bring|key|configure/i.test(p.bill)));
    p.byoPart = p.smart && p.model === 'multi' && !p.byo;
    p.noMcp = /^(None|Third party)$/.test(p.mcp || '');
    p.preview = /Preview|Beta|Announced|Proof/.test(p.mcp || '');
    if (!ROUTE[p.id]) {
      if (p.semantic && (p.group === 'semantic-layer' || p.group === 'bi')) ROUTE[p.id] = 'Its deterministic query tools';
      else if (p.semantic) ROUTE[p.id] = 'Query the semantic object directly';
      else if (p.group === 'catalog' || p.group === 'knowledge-graph') ROUTE[p.id] = 'Glossary and lineage tools next to a SQL MCP';
      else if (p.noMcp) ROUTE[p.id] = 'Small custom server plus a semantic layer';
      else ROUTE[p.id] = 'Read-only SQL MCP plus a semantic layer';
    }
    p.route = ROUTE[p.id];
  });

  /* ---------- Stats ---------- */
  var provs = {}; P.forEach(function (p) { if (p.smart) provs[p.model] = 1; });
  $('#s-n').textContent = P.length;
  $('#s-llm').textContent = P.filter(function (p) { return p.smart; }).length;
  $('#s-sem').textContent = P.filter(function (p) { return p.semantic; }).length;
  $('#s-prov').textContent = Object.keys(provs).filter(function (k) { return k !== 'unnamed'; }).length;

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  function setTheme(t) {
    if (t === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    $('#theme').setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    store.set('olt-theme', t);
  }
  if (store.get('olt-theme') === 'light') setTheme('light');
  $('#theme').addEventListener('click', function () { setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'); });

  /* ---------- Routing ---------- */
  var VIEWS = ['flow', 'matrix', 'models', 'demo', 'compare', 'exposure', 'build', 'choose', 'sources'];
  var explorerMounted = false;
  function show(v) {
    if (VIEWS.indexOf(v) < 0) v = 'flow';
    $$('.view').forEach(function (s) { s.hidden = s.dataset.v !== v; });
    $$('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.view === v)); });
    if (v === 'flow' && window.mountFlowScenes) window.mountFlowScenes($('#flow'));
    if (v === 'demo' && !explorerMounted && window.mountExplorer) { window.mountExplorer($('#explorer')); explorerMounted = true; }
  }
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      if (location.hash !== '#' + t.dataset.view) { try { history.replaceState(null, '', '#' + t.dataset.view); } catch (err) {} }
      show(t.dataset.view);
      var tabs = $('.tabs'); if (tabs.getBoundingClientRect().top > 120 || window.scrollY > tabs.offsetTop) window.scrollTo({ top: tabs.offsetTop - 58, behavior: 'smooth' });
    });
  });

  /* ---------- Matrix ---------- */
  var cat = 'all', mode = 'all', term = '';
  var catCounts = {}; P.forEach(function (p) { catCounts[p.group] = (catCounts[p.group] || 0) + 1; });
  $('#cats').innerHTML = '<button class="chip" type="button" data-c="all" aria-pressed="true">All types <span class="n">' + P.length + '</span></button>' +
    A.groups.filter(function (g) { return catCounts[g.id]; }).map(function (g) {
      return '<button class="chip" type="button" data-c="' + g.id + '" aria-pressed="false">' + g.name + ' <span class="n">' + catCounts[g.id] + '</span></button>';
    }).join('');
  var G = function (cls, label) { return '<i class="g g-' + cls + '" role="img" aria-label="' + label + '"></i>'; };
  var NO = G('no', 'No');
  function stClass(s) { return /^GA|Hosted|Official/.test(s) ? 'ga' : /Preview|Beta|Announced|Proof/.test(s) ? 'pre' : /None/.test(s) ? 'none' : ''; }
  function row(p) {
    var q = p.noMcp ? NO : p.preview ? G('part', 'Preview') : G('yes', 'Yes');
    return '<tr class="pr" tabindex="0" data-id="' + p.id + '">' +
      '<td><span class="pname"><b>' + esc(shortName(p)) + '</b><span>' + esc(p.kind) + (p.fromIndex ? '' : ' · <span class="add">added</span>') + '</span></span></td>' +
      '<td><span class="st ' + stClass(p.mcp || '') + '">' + esc(p.mcp || 'Unknown') + '</span></td>' +
      '<td>' + q + '</td>' +
      '<td>' + (p.semantic ? G('yes', 'Yes') : NO) + '</td>' +
      '<td class="c-llm">' + (p.smart ? G('llm', 'Yes, runs the vendor LLM') : NO) + '</td>' +
      '<td class="c-llm">' + (p.uiOnly ? G('ui', 'In the product UI only') : NO) + '</td>' +
      '<td class="c-llm">' + (p.smart ? '<span class="model"><i class="mdot m-' + p.model + '"></i>' + A.models[p.model][0].replace('Vendor model, not named', 'Not named') + '</span>' : '<span class="dash">None</span>') + '</td>' +
      '<td class="c-llm">' + (p.byo ? G('yes', 'Yes') : p.byoPart ? G('part', 'Option') : NO) + '</td>' +
      '<td class="route">' + esc(p.route) + '</td></tr>';
  }
  function matches(p, skip) {
    if (skip !== 'cat' && cat !== 'all' && p.group !== cat) return false;
    var m = skip === 'mode' ? 'all' : (typeof skip === 'string' && skip.indexOf('m:') === 0 ? skip.slice(2) : mode);
    if (m === 'llm' && !p.smart) return false;
    if (m === 'plain' && p.smart) return false;
    if (m === 'sem' && !p.semantic) return false;
    if (m === 'byo' && !p.byo) return false;
    if (term && JSON.stringify(p).toLowerCase().indexOf(term) < 0) return false;
    return true;
  }
  function countCat(c) { return P.filter(function (p) { return matches(p, 'cat') && (c === 'all' || p.group === c); }).length; }
  function countMode(m) { return P.filter(function (p) { return matches(p, 'm:' + m); }).length; }
  function updateCounts() {
    // Category chips: count what the active Show filter and search would list.
    // A type with nothing to show is hidden rather than offered with a 0.
    $$('#cats .chip').forEach(function (b) {
      var n = countCat(b.dataset.c);
      $('.n', b).textContent = n;
      b.hidden = n === 0 && b.dataset.c !== 'all';
    });
    // Show filters: count within the active type; a filter with no match is disabled
    $$('#show button').forEach(function (b) {
      var n = countMode(b.dataset.s);
      var el = $('.n', b);
      if (!el) { el = document.createElement('span'); el.className = 'n'; b.appendChild(el); }
      el.textContent = n;
      b.disabled = n === 0 && b.dataset.s !== 'all';
      b.title = b.disabled ? 'None in this product type' : '';
    });
  }
  function renderMatrix() {
    updateCounts();
    var order = $('#order').value;
    var list = P.filter(function (p) { return matches(p); });
    var html = '';
    if (order === 'type') {
      A.groups.forEach(function (g) {
        var items = list.filter(function (p) { return p.group === g.id; });
        if (!items.length) return;
        html += '<tr class="gh"><td colspan="9">' + g.name + '<span class="n">' + items.length + '</span></td></tr>' + items.map(row).join('');
      });
    } else {
      list = list.slice().sort(function (a, b) {
        if (order === 'llm' && a.smart !== b.smart) return a.smart ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      html = list.map(row).join('');
    }
    var why = mode !== 'all' ? 'No ' + (cat === 'all' ? 'product' : A.groups.filter(function (g) { return g.id === cat; })[0].name.toLowerCase()) + ' matches "' + $('#show button[aria-pressed="true"]').firstChild.textContent.trim() + '". Switch Show to All or pick another type.' : 'No product matches. Try another type or clear the search.';
    $('#mx tbody').innerHTML = html || '<tr><td colspan="9" class="empty">' + why + '</td></tr>';
    $('#count').textContent = list.length + ' of ' + P.length;
    if (current) { var r = $('#mx tr[data-id="' + current + '"]'); if (r) r.setAttribute('aria-current', 'true'); }
  }
  $('#cats').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    cat = b.dataset.c;
    if (mode !== 'all' && countMode(mode) === 0) setMode('all');
    $$('#cats .chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); renderMatrix();
  });
  $('#show').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.disabled) return;
    setMode(b.dataset.s);
    if (cat !== 'all' && countCat(cat) === 0) { cat = 'all'; $$('#cats .chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.c === 'all')); }); }
    renderMatrix();
  });
  function setMode(m) { mode = m; $$('#show button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.s === m)); }); }
  $('#order').addEventListener('change', renderMatrix);
  $('#q').addEventListener('input', function () {
    term = this.value.trim().toLowerCase();
    if (location.hash !== '#matrix' && term) { try { history.replaceState(null, '', '#matrix'); } catch (err) {} show('matrix'); }
    renderMatrix();
  });
  $('#mx tbody').addEventListener('click', function (e) { var r = e.target.closest('tr.pr'); if (r) openDrawer(r.dataset.id); });
  $('#mx tbody').addEventListener('keydown', function (e) {
    var r = e.target.closest('tr.pr'); if (!r) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(r.dataset.id); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var rows = $$('#mx tr.pr'), i = rows.indexOf(r) + (e.key === 'ArrowDown' ? 1 : -1);
      if (rows[i]) rows[i].focus();
    }
  });

  /* ---------- Drawer ---------- */
  var current = null, lastFocus = null;
  function ul(items) { return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function tags(p) {
    return '<span class="st ' + stClass(p.mcp || '') + '">MCP ' + esc(p.mcp || '') + '</span>' +
      (p.semantic ? '<span class="st ga">Semantic object</span>' : '') +
      (p.smart ? '<span class="st" style="background:var(--amber-soft);color:var(--amber);box-shadow:none">Smart MCP</span>' : p.uiOnly ? '<span class="st">Plain MCP, AI in UI only</span>' : '<span class="st">Plain MCP</span>');
  }
  function openDrawer(id) {
    var p = byId[id]; if (!p) return;
    current = id; lastFocus = document.activeElement;
    $$('#mx tr.pr').forEach(function (r) { r.toggleAttribute('aria-current', r.dataset.id === id); if (r.dataset.id === id) r.setAttribute('aria-current', 'true'); });
    $('#d-head').innerHTML = '<span class="muted">' + esc(p.kind) + (p.fromIndex ? '' : ' · added beyond the index') + '</span><h3>' + esc(p.name) + '</h3><p>' + p.line + '</p><div class="dtags">' + tags(p) + '</div>';
    var smartHtml = p.smart ? ul(p.smartTools) + '<p><span class="model"><i class="mdot m-' + p.model + '"></i>' + A.models[p.model][0] + '</span></p>'
      : p.uiOnly ? '<p>Nothing on the MCP server runs a model. In the product only:</p>' + ul(p.smartTools)
      : '<p>None. Nothing on the platform side runs a model.</p>';
    $('#d-body').innerHTML =
      '<div class="dsec plain"><h4>Plain MCP tools</h4>' + ul(p.plain) + '</div>' +
      '<div class="dsec smart"><h4>Smart MCP tools</h4>' + smartHtml + (p.bill ? '<p class="bill">' + p.bill + '</p>' : '') + '</div>' +
      '<div class="dsec do"><h4>One-LLM setup</h4><p>' + p.setup + '</p></div>' +
      '<div class="dsec"><h4>Sources</h4><div class="dsrc">' + (p.src.length ? p.src.map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a>'; }).join('') : '<span class="muted">No primary source found; community projects only.</span>') + '</div></div>';
    $('#drawer').setAttribute('data-open', ''); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').setAttribute('data-open', '');
    $('#d-body').scrollTop = 0;
    $('#d-close').focus({ preventScroll: true });
  }
  function closeDrawer() {
    $('#drawer').removeAttribute('data-open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').removeAttribute('data-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  $('#d-close').addEventListener('click', closeDrawer);
  $('#scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#drawer').hasAttribute('data-open')) closeDrawer(); });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-open-id]'); if (b) openDrawer(b.dataset.openId); });

  /* ---------- Smart MCP models view ---------- */
  var ORDER = ['azure', 'gemini', 'claude', 'openai', 'bedrock', 'multi', 'byo', 'unnamed'];
  var COLORS = { azure: '#4ea8ff', gemini: '#a78bfa', claude: '#e3926b', openai: 'var(--fg)', bedrock: '#f59e0b', multi: '#2dd4bf', byo: '#86efac', unnamed: '#7183a0' };
  var groups = ORDER.map(function (k) { return { k: k, ps: P.filter(function (p) { return p.smart && p.model === k; }) }; }).filter(function (g) { return g.ps.length; });
  var max = Math.max.apply(null, groups.map(function (g) { return g.ps.length; }));
  $('#bars').innerHTML = groups.map(function (g) {
    return '<div class="bar"><span class="lbl"><i class="mdot m-' + g.k + '"></i>' + A.models[g.k][0] + '</span><span class="trk"><span class="fill" style="width:' + (100 * g.ps.length / max) + '%;background:' + COLORS[g.k] + '"></span></span><span class="v">' + g.ps.length + '</span></div>';
  }).join('');
  $('#mgrid').innerHTML = groups.map(function (g) {
    return '<div class="mcol"><div class="mhead"><i class="mdot m-' + g.k + '"></i><b>' + A.models[g.k][0] + '</b><span>' + g.ps.length + '</span></div><p>' + A.models[g.k][1] + '</p><div class="mlist">' +
      g.ps.map(function (p) { return '<button type="button" class="plink" data-open-id="' + p.id + '">' + esc(shortName(p)) + '</button>'; }).join('') + '</div></div>';
  }).join('');
  $('#cost').innerHTML = A.costTable.replace('class="cost-table"', 'class="tbl"');

  /* ---------- Map ---------- */
  var rowsDef = [
    { k: 'one', b: 'Your client’s model', s: 'Plain MCP: one LLM, whatever your client runs.' },
    { k: 'two', b: 'The platform’s model', s: 'Smart MCP: two LLMs. The tool runs its own model first.' }
  ];
  var cols = ['Raw schema', 'Catalog context', 'Semantic layer'];
  var mh = '';
  rowsDef.forEach(function (r, ri) {
    mh += '<div class="map-row ' + r.k + '"><b>' + r.b + '</b><span>' + r.s + '</span></div>';
    for (var ci = 0; ci < 3; ci++) {
      var c = A.map[ri * 3 + ci];
      mh += '<button type="button" class="cell ' + r.k + '" data-i="' + (ri * 3 + ci) + '" data-col="' + cols[ci] + '" aria-pressed="false"><span class="lvl">' + c.lvl + '</span><span class="name">' + c.name + '</span><span class="gist">' + c.gist + '</span><span class="verdict ' + c.vt + '">' + c.verdict + '</span></button>';
    }
  });
  $('#map').insertAdjacentHTML('beforeend', mh);
  function showCell(i) {
    var c = A.map[i];
    $$('.cell').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.i === i)); });
    $('#map-detail').innerHTML = '<div><h3>' + c.lvl + ' · ' + c.name + '</h3><p>' + c.detail + '</p></div><dl class="kv">' +
      '<div><dt>Knows "active customer"?</dt><dd>' + c.knows + '</dd></div><div><dt>Models reasoning</dt><dd>' + c.llms + '</dd></div>' +
      '<div><dt>Reaches your model</dt><dd>' + c.reach + '</dd></div><div><dt>Examples</dt><dd>' + c.ex + '</dd></div></dl>';
  }
  $$('.cell').forEach(function (b) { b.addEventListener('click', function () { showCell(+b.dataset.i); }); });
  showCell(3);

  /* ---------- Compare ---------- */
  var picks = (store.get('olt-cmp') || 'snowflake,databricks,denodo').split(',').filter(function (id) { return byId[id]; });
  while (picks.length < 3) picks.push(['snowflake', 'databricks', 'denodo'][picks.length]);
  var opts = A.groups.map(function (g) {
    var items = P.filter(function (p) { return p.group === g.id; });
    return items.length ? '<optgroup label="' + g.name + '">' + items.map(function (p) { return '<option value="' + p.id + '">' + esc(shortName(p)) + '</option>'; }).join('') + '</optgroup>' : '';
  }).join('');
  $('#cmp-pick').innerHTML = [0, 1, 2].map(function (i) {
    return '<label><span class="sr">Product ' + (i + 1) + '</span><select id="cmp-' + i + '" data-i="' + i + '"><option value="">None</option>' + opts + '</select></label>';
  }).join('');
  [0, 1, 2].forEach(function (i) { $('#cmp-' + i).value = picks[i] || ''; });
  function renderCompare() {
    var ps = picks.map(function (id) { return byId[id]; }).filter(Boolean);
    var rowsC = [
      ['MCP server', function (p) { return '<span class="st ' + stClass(p.mcp || '') + '">' + esc(p.mcp || '') + '</span>'; }],
      ['In one line', function (p) { return p.line; }],
      ['Plain tools', function (p) { return ul(p.plain); }],
      ['Semantic object', function (p) { return p.semantic ? 'Yes' : 'No'; }],
      ['Smart MCP', function (p) { return p.smart ? ul(p.smartTools) : p.uiOnly ? 'Only in the product UI' : 'None'; }],
      ['Model', function (p) { return p.smart ? '<span class="model"><i class="mdot m-' + p.model + '"></i>' + A.models[p.model][0] + '</span>' : '<span class="dash">None</span>'; }],
      ['Billing', function (p) { return p.bill || '<span class="dash">Compute only</span>'; }],
      ['One-LLM setup', function (p) { return p.setup; }]
    ];
    $('#cmp').innerHTML = '<colgroup><col style="width:170px">' + ps.map(function () { return '<col>'; }).join('') + '</colgroup><thead><tr><th></th>' +
      ps.map(function (p) { return '<th scope="col">' + esc(shortName(p)) + '<div class="muted" style="font:400 .78rem/1.3 var(--body);margin-top:2px">' + esc(p.kind) + '</div></th>'; }).join('') + '</tr></thead><tbody>' +
      rowsC.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th>' + ps.map(function (p) { return '<td>' + r[1](p) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>';
    store.set('olt-cmp', picks.join(','));
  }
  $('#cmp-pick').addEventListener('change', function (e) { picks[+e.target.dataset.i] = e.target.value; renderCompare(); });
  renderCompare();

  /* ---------- Code boxes ---------- */
  function hl(code, lang) {
    var s = esc(code);
    if (lang === 'md') return s;
    var cm = lang === 'sql' ? '\\-\\-' : '#';
    var re = new RegExp('("(?:[^"\\\\\\n]|\\\\.)*"' + (lang === 'json' ? '' : '|\'(?:[^\'\\\\\\n]|\\\\.)*\'') + ')' + (lang === 'json' ? '' : '|(' + cm + '[^\\n]*)'), 'g');
    return s.replace(re, function (m, str, com) { return com ? '<span class="tok-c">' + com + '</span>' : '<span class="tok-s">' + str + '</span>'; });
  }
  function copyText(btn, text, box) {
    var done = function (msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); };
    var fallback = function () { var r = document.createRange(); r.selectNodeContents($('pre', box)); var s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected'); };
    try { navigator.clipboard.writeText(text).then(function () { done('Copied'); }, fallback); } catch (e) { fallback(); }
  }
  function codebox(box, files, first) {
    var cur = first, pre = $('pre code', box), note = $('.note', box);
    function sel(k) {
      cur = k; pre.innerHTML = hl(files[k].code, files[k].lang); note.innerHTML = files[k].note || ''; note.hidden = !files[k].note;
      $$('.ctab', box).forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.k === k)); });
    }
    $$('.ctab', box).forEach(function (t) { t.addEventListener('click', function () { sel(t.dataset.k); }); });
    $('.copy', box).addEventListener('click', function (e) { copyText(e.currentTarget, files[cur].code, box); });
    sel(first);
  }
  codebox($('[data-codebox="clients"]'), A.clients, 'claude');
  $('#client-notes').innerHTML = A.clientNotes;
  function showPath(k) {
    var p = A.paths[k];
    $$('.subtab').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.path === k)); });
    var keys = Object.keys(p.files);
    $('#path-body').innerHTML = '<div class="build-grid"><div style="display:grid;gap:14px;align-content:start">' + p.intro + '</div><div class="codebox" data-codebox="path"><div class="codebar" role="tablist" aria-label="File">' +
      keys.map(function (f, i) { return '<button class="ctab" role="tab" type="button" aria-selected="' + (i === 0) + '" data-k="' + f + '">' + f + '</button>'; }).join('') +
      '<button class="copy" type="button">Copy</button></div><pre><code></code></pre><div class="note"></div></div></div>';
    codebox($('[data-codebox="path"]'), p.files, keys[0]);
    store.set('olt-path', k);
  }
  $$('.subtab').forEach(function (t) { t.addEventListener('click', function () { showPath(t.dataset.path); }); });
  showPath(A.paths[store.get('olt-path')] ? store.get('olt-path') : 'native');

  /* ---------- Chooser ---------- */
  var form = $('#qs');
  function recommend() {
    var r = A.recommend(form.who.value, form.sem.value, form.data.value);
    $('#rec').innerHTML = '<div class="eyebrow" style="color:var(--fg-3)">Recommended setup</div><h3>' + r.title + '</h3><span class="pill ' + (r.llms === 2 ? 'two' : 'one') + '">' +
      (r.llms === 2 ? 'Smart MCP for the business-user path' : 'Plain MCP, one LLM') + '</span><p>' + r.why + '</p>' + ul(r.steps);
  }
  form.addEventListener('change', recommend);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  recommend();

  /* ---------- Sources ---------- */
  $('#src').innerHTML = A.sources.map(function (g) {
    return '<h4>' + g[0] + '</h4><ul>' + g[1].map(function (s) { return '<li><a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + '</a></li>'; }).join('') + '</ul>';
  }).join('');

  renderMatrix();
  show(location.hash.slice(1));
})();
