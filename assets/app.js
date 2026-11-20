/* Controls Demonstration: pages and router. Every number is computed in the browser by engine.js. */
import { simulate, runTests, assess, accuracy, CARRIED, FIRM, MONTH_LABEL, MONTH_END, DAYS } from './engine.js';

const DEFAULT_SEED = 2026;
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n0 = v => Number(v).toLocaleString('en-CA');
const pct = (v, d = 0) => (v * 100).toFixed(d) + '%';
const TONE = { Effective: 'good', 'Partially effective': 'warn', Ineffective: 'bad', High: 'bad', Medium: 'warn', Low: 'good',
  Open: 'warn', 'In progress': 'warn', Overdue: 'bad', 'Ready for validation': 'neutral', Closed: 'good' };
const st = t => `<span class="st ${TONE[t] || 'neutral'}">${esc(t)}</span>`;
const daysOpen = (from, to = MONTH_END) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

let S = null;
function compute(seed) {
  const data = simulate(seed); const results = runTests(data); const rows = assess(results);
  S = { seed, data, rows, byId: Object.fromEntries(rows.map(r => [r.id, r])), acc: accuracy(data, results) };
}
function initialSeed() { const q = Number(new URLSearchParams(location.search).get('seed')); return Number.isInteger(q) && q > 0 ? q : DEFAULT_SEED; }
function setSeed(seed) {
  compute(seed);
  history.replaceState(null, '', (seed === DEFAULT_SEED ? location.pathname : `${location.pathname}?seed=${seed}`) + location.hash);
  route();
}
function downloadCSV(name, rows) {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const blob = new Blob([rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------------------------------------------------------------- layout helpers */
const runActions = (extra = '') => `<div class="actions"><button class="btn" data-act="resim">Run another month</button>${extra}
  ${S.seed !== DEFAULT_SEED ? '<button class="btn outline" data-act="reset">Back to the original month</button>' : ''}
  <span class="meta">${esc(MONTH_LABEL)} · simulation ${S.seed}</span></div>`;
const hero = ({ kicker = '', title, lead = '', actions = '', compact = true, crumb = '' }) => `
  <section class="hero${compact ? ' compact' : ''}"><div class="wrap">${crumb}${kicker ? `<div class="kicker">${kicker}</div>` : ''}
  <h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${actions}</div></section>`;
const panel = ({ title = '', intro = '', body = '', table = '' }) => `<section class="panel">
  ${title || intro ? `<div class="ph">${title ? `<h2>${title}</h2>` : ''}${intro ? `<p>${intro}</p>` : ''}</div>` : ''}
  ${table ? `<div class="table">${table}</div>` : ''}${body ? `<div class="pb">${body}</div>` : ''}</section>`;
const page = (heroHtml, bodyHtml) => `${heroHtml}<div class="wrap body">${bodyHtml}</div>`;

/* ---------------------------------------------------------------- overview */
function pageOverview() {
  const R = S.rows; const records = R.reduce((s, r) => s + r.population, 0); const exc = R.reduce((s, r) => s + r.exceptions.length, 0);
  const planted = S.acc.reduce((s, a) => s + a.planted, 0); const caught = S.acc.reduce((s, a) => s + a.caught, 0); const fp = S.acc.reduce((s, a) => s + a.falsePositives, 0);
  const w = R.filter(r => r.exceptions.length && r.population > 25).sort((a, b) => a.sampleCatch - b.sampleCatch)[0];
  const level = lvl => R.filter(r => r.residual === lvl).map(r => `<a href="#/control/${r.id}" title="${esc(r.name)}">${r.id}</a>`).join('') || '<span class="muted">None</span>';
  app.innerHTML = page(hero({
    compact: false, kicker: 'Business risk management · a worked example',
    title: 'A month of control testing at a fictional asset manager',
    lead: `I built this to show how I would approach the Manager, GWAM Business Risk Management role. It creates a month of records for ${esc(FIRM)}, a fictional firm with public- and private-markets businesses, and hides control failures in them. Then it works through the month the way a first-line risk team would: test the controls, rate them, raise issues and propose fixes.`,
    actions: runActions(),
  }), `
  <div class="figures">
    <div><b>${n0(records)}</b><span>Records tested, all of them</span></div>
    <div><b>${R.length}</b><span>Controls tested</span></div>
    <div><b>${exc}</b><span>Exceptions found</span></div>
    <div><b>${R.filter(r => r.issue).length}</b><span>Issues raised</span></div>
  </div>
  ${w ? `<div class="insight"><h3>Why every record is tested</h3><p>${esc(w.name)} had ${plural(w.exceptions.length, 'exception')} among ${n0(w.population)} ${esc(w.unit)}. A standard test sample of 25 would have found even one of them only ${pct(w.sampleCatch)} of the time. Testing every record found all of them.</p></div>` : ''}
  ${panel({ title: 'Results by control', intro: 'Select a row for the exceptions, the ratings and the proposed fix.',
    table: `<table><thead><tr><th>ID</th><th>Control</th><th class="num">Records</th><th class="num">Exceptions</th><th>Operating</th><th>Residual risk</th></tr></thead><tbody>
    ${R.map(r => `<tr class="row-link" data-href="#/control/${r.id}"><td class="mono">${r.id}</td><td>${esc(r.name)}<span class="sub">${esc(r.area)}</span></td><td class="num">${n0(r.population)}</td><td class="num">${r.exceptions.length}</td><td>${st(r.operating)}</td><td>${st(r.residual)}</td></tr>`).join('')}
    </tbody></table>` })}
  <div class="grid-3">
    ${['High', 'Medium', 'Low'].map(l => panel({ body: `<h3>${st(l)} residual risk</h3><div class="level">${level(l)}</div>` })).join('')}
  </div>
  <p class="muted">Residual risk is what remains once the controls are taken into account, based on how they performed this month. The tests caught ${caught} of the ${planted} hidden failures, with ${fp === 0 ? 'no false alarms' : plural(fp, 'false alarm')}. <a href="#/method">How this is checked</a></p>`);
}

/* ---------------------------------------------------------------- processes */
const FLOWS = [
  ['Public markets', 'The path of a stock or bond trade, from the portfolio manager’s decision to the price used in client reports.', ['P1', 'P2', 'P3', 'P4', 'P5']],
  ['Private markets', 'Private equity and credit, real estate, infrastructure, timberland and farmland: where money moves, where value is set, and the outside firms involved.', ['M1', 'M2', 'M3', 'M4']],
  ['Change', 'New products, systems, models and data sources, before they go live.', ['C1']],
];
function pageProcesses() {
  app.innerHTML = page(hero({ title: 'Processes covered', lead: 'An RCSA starts with understanding the process. These are the steps covered here, the control at each one, and how it held up this month.', actions: runActions() }),
  FLOWS.map(([t, d, ids]) => panel({ title: esc(t), intro: esc(d),
    table: `<table><thead><tr><th>Step</th><th>Control</th><th class="num">Records</th><th class="num">Exceptions</th><th>Result</th></tr></thead><tbody>
    ${ids.map(id => { const r = S.byId[id]; return `<tr class="row-link" data-href="#/control/${id}"><td>${esc(r.step)}</td><td><span class="mono">${id}</span> ${esc(r.name)}</td><td class="num">${n0(r.population)}</td><td class="num">${r.exceptions.length}</td><td>${st(r.operating)}</td></tr>`; }).join('')}
    </tbody></table>` })).join('') +
  panel({ title: 'Data and conversations', body: '<p class="measure">The data shows what happened. Talking to the people who run each step shows why: the workarounds, the system limits, the places where nobody is quite sure who owns a check. Root causes and workable fixes usually come from those conversations, so in practice I would pair every data test with a walkthrough.</p>' }));
}

/* ---------------------------------------------------------------- controls */
function pageControls() {
  app.innerHTML = page(hero({ title: 'Controls tested', lead: 'Ten controls across the trade lifecycle, private markets and change management. Each one is tested against every record of the month.', actions: runActions() }),
  panel({ table: `<table><thead><tr><th>ID</th><th>Control</th><th>Owner</th><th class="num">Exceptions</th><th>Result</th></tr></thead><tbody>
  ${S.rows.map(r => `<tr class="row-link" data-href="#/control/${r.id}"><td class="mono">${r.id}</td><td>${esc(r.name)}<span class="sub">${esc(r.risk)}</span></td><td class="muted">${esc(r.owner)}</td><td class="num">${r.exceptions.length}</td><td>${st(r.operating)}</td></tr>`).join('')}
  </tbody></table>` }));
}

function pageControl(id) {
  const r = S.byId[id]; if (!r) { app.innerHTML = '<p class="loading">Unknown control.</p>'; return; }
  const k = r.exceptions.length;
  const result = !k ? `No exceptions in ${n0(r.population)} ${esc(r.unit)}.`
    : `${plural(k, 'exception')} in ${n0(r.population)} ${esc(r.unit)} (${pct(r.rate, 2)}). ${r.zero ? 'This is a zero-tolerance control, so any exception makes it ineffective.' : 'The tolerance is 1% of the population.'}`;
  const sampling = !k ? 'Nothing to find this month.'
    : r.population <= 25 ? 'The whole population is smaller than a typical sample of 25, so a sample would have covered it.'
    : `A standard sample of 25 would have caught at least one of these ${k} with a ${pct(r.sampleCatch)} chance. Testing every record caught all of them.`;
  app.innerHTML = page(hero({
    crumb: '<a class="crumb" href="#/controls">‹ All controls</a>',
    kicker: `${esc(r.area)} · ${esc(r.step)}`, title: `${r.id} · ${esc(r.name)}`,
    lead: `Owner: ${esc(r.owner)}. ${esc(r.nature)}, ${esc(r.freq.toLowerCase())}.`,
  }), `
  ${panel({ body: `<dl class="memo">
    <dt>Risk</dt><dd>${esc(r.risk)}</dd>
    <dt>Control</dt><dd>${esc(r.control)}</dd>
    <dt>How I tested it</dt><dd>${esc(r.how)}</dd>
    <dt>Result</dt><dd>${result}</dd>
    <dt>Sampling</dt><dd>${sampling}</dd></dl>` })}
  ${panel({ title: 'Ratings', table: `<table><thead><tr><th>Design</th><th>Operating</th><th>Inherent risk</th><th>Residual risk</th></tr></thead><tbody>
    <tr><td>${st(r.design)}<span class="sub">${esc(r.designNote)}</span></td><td>${st(r.operating)}</td><td>${st(r.inherent)}<span class="sub">Likelihood ${r.L} × impact ${r.I}</span></td><td>${st(r.residual)}</td></tr></tbody></table>` })}
  ${panel({ title: 'Exceptions', table: k ? `<table><thead><tr><th>Record</th><th>Date</th><th>Finding</th><th>Who</th></tr></thead><tbody>
    ${r.exceptions.map(e => `<tr><td class="mono">${esc(e.id)}</td><td class="mono">${esc(e.date)}</td><td>${esc(e.detail)}</td><td class="muted">${esc(e.who)}</td></tr>`).join('')}
    </tbody></table>` : '', body: k ? '' : '<p class="muted">None this month.</p>' })}
  <div class="grid-2">
    ${panel({ title: 'Proposed fix', body: `<ol>${r.fix.map(f => `<li>${esc(f)}</li>`).join('')}</ol><p class="muted">Most of these move the control from something people have to remember to something the system enforces, then watch the exceptions that remain.</p>` })}
    ${panel({ title: 'Issue', body: r.issue ? `<p><span class="mono">${r.issue.id}</span> · ${st(r.issue.severity)}</p>
      <p>Owner: ${esc(r.issue.owner)}<br>Opened ${r.issue.opened}, due ${r.issue.due}</p>
      <p class="muted">It closes only after a re-test on new data shows the exceptions are gone.</p>` : '<p class="muted">No issue raised; the control worked this month.</p>' })}
  </div>`);
}

/* ---------------------------------------------------------------- register */
function registerRows() {
  return [['Control ID', 'Area', 'Process step', 'Risk', 'Likelihood', 'Impact', 'Inherent risk', 'Control', 'Nature', 'Frequency', 'Design', 'Population tested', 'Exceptions', 'Operating effectiveness', 'Residual risk', 'Control owner', 'Issue ID', 'Issue due']]
    .concat(S.rows.map(r => [r.id, r.area, r.step, r.risk, r.L, r.I, r.inherent, r.control, r.nature, r.freq, r.design, r.population, r.exceptions.length, r.operating, r.residual, r.owner, r.issue?.id || '', r.issue?.due || '']));
}
function pageRegister() {
  app.innerHTML = page(hero({ title: 'RCSA register', lead: 'The record a first-line team keeps in its GRC platform (Archer, at Manulife): each risk with its inherent rating, the control, how it was designed and how it performed, and the risk that remains.',
    actions: `<div class="actions"><button class="btn" data-act="csv-register">Download as CSV</button><span class="meta">${esc(MONTH_LABEL)} · simulation ${S.seed}</span></div>` }), `
  ${panel({ table: `<table><thead><tr><th>ID</th><th>Risk</th><th>Inherent</th><th>Design</th><th>Operating</th><th>Residual</th></tr></thead><tbody>
  ${S.rows.map(r => `<tr class="row-link" data-href="#/control/${r.id}"><td class="mono">${r.id}</td><td>${esc(r.risk)}<span class="sub">${esc(r.owner)}</span></td><td>${st(r.inherent)}</td><td>${st(r.design)}</td><td>${st(r.operating)}<span class="sub">${r.exceptions.length} of ${n0(r.population)}</span></td><td>${st(r.residual)}</td></tr>`).join('')}
  </tbody></table>` })}
  ${panel({ title: 'How the ratings work', body: `<ul class="measure">
    <li><b>Inherent risk</b> is likelihood times impact, each scored 1 to 5. A score of 15 or more is high, 8 to 14 medium, below 8 low.</li>
    <li><b>Operating effectiveness</b> is effective when there are no exceptions, and partially effective when exceptions stay within 1% of the population. Compliance, payments and change sign-off are zero-tolerance, so a single exception makes them ineffective.</li>
    <li><b>Residual risk</b> drops two levels below inherent for a well-designed control that worked, one level when the design or the result is only partial, and not at all when the control failed.</li></ul>` })}`);
}

/* ---------------------------------------------------------------- issues */
function issueRows() {
  const fresh = S.rows.filter(r => r.issue).map(r => r.issue);
  return { fresh, all: [['Issue ID', 'Title', 'Severity', 'Owner', 'Opened', 'Due', 'Status', 'Action plan / note']]
    .concat(fresh.map(i => [i.id, i.title, i.severity, i.owner, i.opened, i.due, i.status, i.actions.join(' | ')]))
    .concat(CARRIED.map(i => [i.id, i.title, i.severity, i.owner, i.opened, i.due, i.status, i.note])) };
}
function pageIssues() {
  const { fresh } = issueRows(); const order = { High: 0, Medium: 1, Low: 2 }; fresh.sort((a, b) => order[a.severity] - order[b.severity]);
  app.innerHTML = page(hero({ title: 'Issues and action plans', lead: 'Each failed control becomes an issue with an owner, a due date and an action plan. Due dates follow severity: 30 days for high, 60 for medium, 90 for low.',
    actions: `<div class="actions"><button class="btn" data-act="csv-issues">Download as CSV</button><span class="meta">${esc(MONTH_LABEL)} · simulation ${S.seed}</span></div>` }), `
  ${panel({ title: 'Raised this month', table: `<table><thead><tr><th>Issue</th><th>Severity</th><th>Owner</th><th>Due</th><th>Action plan</th></tr></thead><tbody>
  ${fresh.map(i => `<tr><td><span class="mono">${i.id}</span><span class="sub"><a href="#/control/${i.control}">${esc(i.title)}</a></span></td><td>${st(i.severity)}</td><td class="muted">${esc(i.owner)}</td><td class="mono">${i.due}</td><td><ol style="margin:0">${i.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ol></td></tr>`).join('')}
  </tbody></table>` })}
  ${panel({ title: 'Carried from earlier months', intro: 'Included to show the rest of the life cycle: an overdue item, one waiting for re-test, one in progress and one closed.',
    table: `<table><thead><tr><th>Issue</th><th>Severity</th><th>Status</th><th class="num">Days open</th><th>Note</th></tr></thead><tbody>
  ${CARRIED.map(i => `<tr><td><span class="mono">${i.id}</span><span class="sub">${esc(i.title)}</span><span class="sub">${esc(i.owner)}</span></td><td>${st(i.severity)}</td><td>${st(i.status)}</td><td class="num">${i.status === 'Closed' ? '–' : daysOpen(i.opened)}</td><td>${esc(i.note)}</td></tr>`).join('')}
  </tbody></table>` })}
  ${panel({ title: 'Closing an issue', body: '<p class="measure">When an owner says a fix is in place, I would re-test the control on fresh data before closing the issue. Anything overdue goes to the Director with a short note on why it slipped and a realistic new date.</p>' })}`);
}

/* ---------------------------------------------------------------- method */
function pageMethod() {
  const d = S.data; const planted = S.acc.reduce((s, a) => s + a.planted, 0);
  app.innerHTML = page(hero({ title: 'How the simulation works', lead: 'A test is only useful if it finds the real problems and leaves clean records alone. So the simulation hides failures it knows about, then checks whether the tests find them, without letting the tests see where they are.', actions: runActions() }), `
  <div class="grid-2 stack-gap">
    ${panel({ title: 'The records', body: `<p>Each simulated month covers the ${DAYS.length} business days of ${MONTH_LABEL} (Thanksgiving excluded):</p><ul>
      <li>${n0(d.orders.length)} orders for ${d.accounts.length} client accounts across ${d.securities.length} securities, and ${n0(d.blocks.length)} block trades</li>
      <li>${n0(d.signoffs.length)} reconciliation sign-offs and ${n0(d.breaks.length)} reconciliation breaks</li>
      <li>${n0(d.prices.length)} daily prices</li>
      <li>${n0(d.payments.length)} private-markets payments and ${d.bankChanges.length} bank-detail changes</li>
      <li>${d.valuations.length} private-asset valuations, ${d.adminRecs.length} administrator reconciliations, ${d.thirdParties.length} outside providers and ${d.changes.length} changes</li></ul>` })}
    ${panel({ title: 'The hidden failures', body: `<p>Between one and six failures are planted in each control at random, ${planted} this month. They include restricted securities traded without an override, orders approved by the person who placed them, unfair allocations, breaks nobody escalated, stale prices, payments after an unverified bank change, late valuation approvals, overdue vendor reviews and changes that went live without sign-off.</p><p>Where they are is stored separately, and the tests never read it.</p>` })}
  </div>
  ${panel({ title: 'Did the tests find them?', intro: 'An automated test suite repeats this check across 50 simulated months. It also confirms the results do not change when the hidden labels are deleted, and checks the rating rules and the sampling maths against hand calculations.',
    table: `<table><thead><tr><th>Control</th><th class="num">Hidden</th><th class="num">Flagged</th><th class="num">Caught</th><th class="num">Missed</th><th class="num">False alarms</th></tr></thead><tbody>
  ${S.acc.map(a => `<tr><td><span class="mono">${a.id}</span> ${esc(S.byId[a.id].name)}</td><td class="num">${a.planted}</td><td class="num">${a.found}</td><td class="num">${a.caught}</td><td class="num">${a.missed}</td><td class="num">${a.falsePositives}</td></tr>`).join('')}
  </tbody></table>` })}
  <div class="grid-2">
    ${panel({ title: 'Why test every record', body: '<p>Control testing often relies on a sample of around 25 items. When exceptions are rare, a sample of that size usually misses them. Where the data is available, testing the whole population is not much more work and is far more reliable. Each control page shows the chance a sample of 25 would have had.</p>' })}
    ${panel({ title: 'Limits', body: `<ul><li>The firm and the data are fictional, and the policies are simplified versions of common practice.</li>
      <li>Real processes have more steps, more systems and messier data, and the conversations with the people involved matter as much as the data.</li>
      <li>At Manulife I would work within its methodology, rating scales and tools, and learn its actual controls before judging any of them.</li></ul>` })}
  </div>`);
}

/* ---------------------------------------------------------------- about */
function pageAbout() {
  const MAP = [
    ['Execute and support RCSAs: process understanding, inherent and residual risk, control evaluation, follow-up', 'Processes, controls, register and issues', '#/register'],
    ['Operational risk across public- and private-market lifecycles, including third parties', 'Five public-markets steps, four private-markets steps', '#/processes'],
    ['Complete records of processes, risks, controls, issues and action plans', 'The register and the issue log, both downloadable', '#/issues'],
    ['Risk-based control testing: evidence, exceptions, deficiencies, remediation', 'Every exception listed with its evidence, for example P1', '#/control/P1'],
    ['Working with portfolio managers, traders, Compliance, Operations, Technology and Legal', 'Each issue has a named owner and an action plan in plain language', '#/issues'],
    ['Assessing material changes to products, strategies, systems, models and data', 'The change sign-off control, C1', '#/control/C1'],
  ];
  app.innerHTML = page(hero({ kicker: 'Manager, GWAM Business Risk Management · JR26110608', title: 'About this demonstration',
    lead: 'The posting describes hands-on first-line work for Manulife Investment Management’s public- and private-markets businesses. This is my attempt to show that work on a simulated month. I used a fictional firm deliberately: I do not know Manulife’s actual controls, and I would want to learn them before forming views.' }), `
  ${panel({ title: 'How it maps to the posting', table: `<table><thead><tr><th>The posting asks for</th><th>Where to see it</th></tr></thead><tbody>
  ${MAP.map(m => `<tr><td>${esc(m[0])}</td><td><a href="${m[2]}">${esc(m[1])}</a></td></tr>`).join('')}
  </tbody></table>` })}
  <div class="grid-2 stack-gap">
    ${panel({ title: 'What would carry over', body: `<ul><li>Start from the process and the people who run it.</li><li>Test with data, on the whole population where possible.</li><li>Write findings plainly, with the evidence attached.</li><li>Give every gap an owner, a date and a fix the system enforces.</li></ul>` })}
    ${panel({ title: 'What would be different', body: `<ul><li>Manulife’s methodology, risk taxonomy and rating scales instead of mine.</li><li>Archer instead of CSV files, and real data only through approved tools.</li><li>Aladdin and the private-markets systems instead of simulated records.</li><li>The Director setting priorities and reviewing conclusions first.</li></ul>` })}
  </div>
  ${panel({ title: 'About me', body: `<p class="measure">Since 2017 I have run my own investment process, from research and portfolio construction to order generation, execution and reconciliation, and built the controls around it: pre-trade checks, automated reconciliations and more than 450 automated tests. Before that I risk-managed EDP’s $2 billion power-contract portfolio and led the launch of EDP Solar. I am an electrical engineer, a Level I Candidate in the CFA Program, and I live in Waterloo.</p>
    <div class="actions" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px"><a class="btn" href="mailto:tiagonbc@gmail.com">Email me</a><a class="btn outline" href="https://www.linkedin.com/in/tiagonbc" target="_blank" rel="noopener">LinkedIn</a></div>` })}`);
}

/* ---------------------------------------------------------------- router */
const ROUTES = { '': pageOverview, processes: pageProcesses, controls: pageControls, control: pageControl, register: pageRegister, issues: pageIssues, method: pageMethod, about: pageAbout };
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const key = parts[0] in ROUTES ? parts[0] : '';
  document.querySelectorAll('#nav a').forEach(a => { const on = a.dataset.route === (key === 'control' ? 'controls' : key); a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  try { ROUTES[key](parts[1]); } catch (e) { console.error(e); app.innerHTML = `<p class="loading">Could not load this page (${esc(e.message)}).</p>`; }
  window.scrollTo(0, 0);
}
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) {
    const act = b.dataset.act;
    if (act === 'resim') setSeed(S.seed === DEFAULT_SEED ? 1 : S.seed + 1);
    if (act === 'reset') setSeed(DEFAULT_SEED);
    if (act === 'csv-register') downloadCSV(`rcsa-register-sim${S.seed}.csv`, registerRows());
    if (act === 'csv-issues') downloadCSV(`issue-log-sim${S.seed}.csv`, issueRows().all);
    return;
  }
  const tr = e.target.closest('[data-href]'); if (tr && !e.target.closest('a,button')) location.hash = tr.dataset.href;
});
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('hashchange', route);
compute(initialSeed()); route();
