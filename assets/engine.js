/* Controls Demonstration engine.
 * 1. simulate(seed): one month of synthetic records for a fictional asset manager, with control failures planted at random.
 * 2. runTests(data): full-population control tests. They read only business fields, never the planted labels.
 * 3. assess(data, results): RCSA ratings, residual risk, issues and action plans.
 * Runs unchanged in the browser and in Node (tests/engine.test.mjs).
 */

export const FIRM = 'Harbourline Investment Management';
export const MONTH_LABEL = 'October 2026';

/* ------------------------------------------------------------ random helpers */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const pad = (n, w) => String(n).padStart(w, '0');
function sample(r, arr, k) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); }
function normal(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/* ------------------------------------------------------------ calendar */
export function businessDays(year = 2026, month = 10, holidays = ['2026-10-12']) {
  const out = []; const d = new Date(Date.UTC(year, month - 1, 1));
  while (d.getUTCMonth() === month - 1) {
    const s = d.toISOString().slice(0, 10); const w = d.getUTCDay();
    if (w !== 0 && w !== 6 && !holidays.includes(s)) out.push(s);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
export const DAYS = businessDays();
export const LAST = DAYS.length - 1;
export const MONTH_END = DAYS[LAST];
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const addDays = (s, n) => new Date(Date.parse(s) + n * 86400000).toISOString().slice(0, 10);

/* ------------------------------------------------------------ fictional people and entities */
export const STAFF = {
  pm: ['PM Avery', 'PM Brooks', 'PM Chen', 'PM Diaz'],
  trader: ['Trader Evans', 'Trader Fofana', 'Trader Gupta', 'Trader Hall', 'Trader Ito'],
  headTrader: ['Head trader Jensen', 'Head trader Kaur'],
  compliance: ['Compliance Lopez', 'Compliance Moreau'],
  ops: ['Ops Nash', 'Ops Okafor', 'Ops Park'],
  treasury: ['Treasury Quinn', 'Treasury Rossi', 'Treasury Silva', 'Treasury Tan'],
};
const ACCOUNT_NAMES = ['Pension plan A', 'Endowment B', 'Balanced fund C', 'Insurance account D', 'Foundation E', 'Pension plan F',
  'Income fund G', 'Growth fund H', 'Sovereign client I', 'Pension plan J', 'Target-date fund K', 'Charity L'];
const PROVIDERS = [
  ['Atlas Fund Services', 'Fund administrator'], ['Beacon Custody', 'Custodian'], ['Cedar Property Management', 'Property manager'],
  ['Delta Market Data', 'Market data vendor'], ['Ember Valuation Advisors', 'Independent appraiser'], ['Fjord Cloud', 'Cloud hosting'],
  ['Granite Transfer Agency', 'Transfer agent'], ['Harbor Fund Admin', 'Fund administrator'], ['Ironwood Forestry Services', 'Timberland manager'],
  ['Juniper Farm Operations', 'Farmland operator'], ['Keystone Payments', 'Payment processor'], ['Lumen Pricing', 'Pricing vendor'],
  ['Meridian Custody', 'Custodian'], ['Northgate Property Partners', 'Property manager'], ['Orchard Analytics', 'Risk analytics vendor'],
  ['Pinecrest Appraisals', 'Independent appraiser'], ['Quarry Infrastructure Ops', 'Infrastructure operator'], ['Redwood IT Services', 'IT outsourcing'],
  ['Summit Legal Services', 'Fund counsel'], ['Tidewater Data', 'Market data vendor'], ['Upland Agri Managers', 'Farmland operator'],
  ['Vantage Proxy Services', 'Proxy voting'], ['Willow Document Hub', 'Investor portal'], ['Yarrow Credit Servicing', 'Loan servicer'],
];

/* ------------------------------------------------------------ simulation */
export function simulate(seed = 2026) {
  const r = rng(seed);
  const planted = {}; const P = (id) => (planted[id] = planted[id] || new Set());

  // securities and client accounts
  const securities = Array.from({ length: 120 }, (_, i) => {
    const equity = i < 80; const u = r();
    return { id: `SEC-${pad(i + 1, 3)}`, cls: equity ? 'Equity' : 'Bond', tier: u < 0.7 ? 1 : u < 0.9 ? 2 : 3 };
  });
  const accounts = ACCOUNT_NAMES.map((name, i) => ({ id: `ACC-${pad(i + 1, 2)}`, name, restricted: new Set(sample(r, securities.map(s => s.id), int(r, 3, 8))) }));
  const acc = Object.fromEntries(accounts.map(a => [a.id, a]));

  /* P1 + P2: orders, pre-trade compliance and four-eyes on large orders */
  const LARGE = 25_000_000;
  const orders = [];
  DAYS.forEach((d) => {
    const n = int(r, 95, 120);
    for (let k = 0; k < n; k++) {
      const a = pick(r, accounts); let sec = pick(r, securities);
      if (a.restricted.has(sec.id) && r() < 0.6) { do { sec = pick(r, securities); } while (a.restricted.has(sec.id)); }
      const notional = round(Math.exp(13.5 + 1.2 * normal(r)), 0);
      const o = { id: `ORD-${pad(orders.length + 1, 5)}`, date: d, account: a.id, security: sec.id, side: r() < 0.5 ? 'Buy' : 'Sell', notional,
        pm: pick(r, STAFF.pm), trader: pick(r, STAFF.trader), compliance: 'Pass', overrideBy: null, secondApprover: null };
      if (a.restricted.has(sec.id)) { o.compliance = 'Override'; o.overrideBy = pick(r, STAFF.compliance); }
      if (notional > LARGE) o.secondApprover = pick(r, STAFF.headTrader);
      orders.push(o);
    }
  });
  const ordPool = sample(r, orders, 40);
  const restrictedFor = (o) => pick(r, [...acc[o.account].restricted]);
  ordPool.slice(0, int(r, 2, 4)).forEach(o => { o.security = restrictedFor(o); o.compliance = 'Pass'; o.overrideBy = null; P('P1').add(o.id); });
  ordPool.slice(4, 4 + int(r, 1, 2)).forEach(o => { o.security = restrictedFor(o); o.compliance = 'Override'; o.overrideBy = o.pm; P('P1').add(o.id); });
  ordPool.slice(6, 6 + int(r, 0, 2)).forEach(o => { o.security = restrictedFor(o); o.compliance = 'Override'; o.overrideBy = null; P('P1').add(o.id); });
  ordPool.slice(10, 10 + int(r, 2, 4)).forEach((o, i) => { o.notional = int(r, 30, 60) * 1_000_000; o.secondApprover = i % 2 ? o.trader : null; P('P2').add(o.id); });

  /* P3: block-trade allocations */
  const blocks = [];
  DAYS.forEach((d) => {
    for (let k = 0, n = int(r, 11, 16); k < n; k++) {
      const accs = sample(r, accounts, int(r, 2, 5)); const w = accs.map(() => 0.5 + r()); const sw = w.reduce((x, y) => x + y, 0);
      const pct = w.map(x => round(100 * x / sw, 1)); pct[pct.length - 1] = round(100 - pct.slice(0, -1).reduce((x, y) => x + y, 0), 1);
      const total = int(r, 20, 400) * 500; const avg = round(20 + r() * 180, 4);
      const fills = accs.map((a, i) => ({ account: a.id, prePct: pct[i], qty: Math.round(total * pct[i] / 100), price: avg }));
      blocks.push({ id: `BLK-${pad(blocks.length + 1, 4)}`, date: d, security: pick(r, securities).id, total, avgPrice: avg, fills });
    }
  });
  sample(r, blocks, int(r, 2, 5)).forEach((b, i) => {
    const f = b.fills;
    if (i % 2 === 0) { f[0].price = round(b.avgPrice * (1 - (0.005 + r() * 0.01)), 4); }
    else { const mv = Math.min(Math.round(b.total * (0.05 + r() * 0.07)), f[1].qty - 1); f[0].qty += mv; f[1].qty -= mv; }
    P('P3').add(b.id);
  });

  /* P4: custodian reconciliation sign-offs and break escalation */
  const signoffs = []; accounts.forEach(a => DAYS.forEach((d, i) => signoffs.push({ id: `REC-${a.id}-${d}`, account: a.id, dayIdx: i, signedBy: pick(r, STAFF.ops), signedIdx: i })));
  sample(r, signoffs.filter(s => s.dayIdx < LAST - 1), int(r, 2, 4)).forEach((s, i) => { if (i % 2) s.signedIdx = s.dayIdx + 2; else { s.signedBy = null; s.signedIdx = null; } P('P4').add(s.id); });
  const breaks = [];
  DAYS.forEach((d, i) => {
    for (let k = 0, n = int(r, 4, 8); k < n; k++) {
      const u = r(); const age = u < 0.7 ? int(r, 0, 1) : u < 0.9 ? int(r, 2, 3) : int(r, 4, 9);
      const closed = i + age <= LAST ? i + age : null; const open = (closed ?? LAST) - i;
      breaks.push({ id: `BRK-${pad(breaks.length + 1, 4)}`, account: pick(r, accounts).id, openedIdx: i, closedIdx: closed, amount: round(Math.exp(9 + 1.5 * normal(r)), 0),
        cause: pick(r, ['Trade not yet settled', 'Corporate action', 'Cash timing', 'Price difference', 'FX rate difference']), escalatedIdx: open > 3 ? i + int(r, 2, 3) : null });
    }
  });
  sample(r, breaks.filter(b => b.openedIdx <= LAST - 6), int(r, 3, 6)).forEach((b, i) => {
    b.closedIdx = Math.min(LAST, b.openedIdx + int(r, 5, 9)); b.escalatedIdx = i % 2 ? b.openedIdx + 5 : null; P('P4').add(b.id);
  });

  /* P5: pricing */
  const prices = [];
  securities.forEach(s => {
    let p = s.cls === 'Equity' ? 20 + r() * 180 : 90 + r() * 20; const vol = s.cls === 'Equity' ? 0.015 : 0.003;
    DAYS.forEach((d, i) => {
      if (i > 0 && !(s.tier === 3 && i % 5 !== 0)) { const np = round(p * (1 + vol * normal(r)), 4); p = np === p ? round(p + 0.0001, 4) : np; }
      prices.push({ id: `${s.id}|${d}`, security: s.id, tier: s.tier, dayIdx: i, price: p, source: 'Vendor', evidence: null });
    });
  });
  prices.filter(x => x.tier < 3 && r() < 0.01).forEach(x => { x.source = 'Manual'; x.evidence = pick(r, ['Broker quote', 'Dealer runs', 'Valuation committee note']); });
  const bySec = {}; prices.forEach(x => (bySec[x.security] = bySec[x.security] || []).push(x));
  const staleSecs = new Set();
  sample(r, securities.filter(s => s.tier === 1), int(r, 2, 4)).forEach(s => {
    const len = int(r, 5, 7); const st = int(r, 1, LAST - len); const ser = bySec[s.id];
    for (let j = st + 1; j < st + len; j++) { ser[j].price = ser[st].price; ser[j].source = 'Vendor'; ser[j].evidence = null; }
    staleSecs.add(s.id); P('P5').add(`${s.id}|stale`);
  });
  sample(r, prices.filter(x => x.tier < 3 && x.source === 'Vendor' && !staleSecs.has(x.security)), int(r, 2, 3)).forEach(x => {
    x.source = 'Manual'; x.evidence = null; x.price = round(x.price * 1.002, 4); P('P5').add(x.id);
  });

  /* M1: private-markets payments (capital calls and distributions) */
  const payees = Array.from({ length: 40 }, (_, i) => `Investor ${pad(i + 1, 2)}`);
  const funds = Array.from({ length: 12 }, (_, i) => `Private fund ${String.fromCharCode(65 + i)}`);
  const bankChanges = sample(r, payees, 9).map((p, i) => { const idx = int(r, -8, LAST - 4); return { id: `BNK-${pad(i + 1, 2)}`, payee: p, changedIdx: idx, callbackBy: pick(r, STAFF.treasury), callbackIdx: idx }; });
  const payments = [];
  DAYS.forEach((d, i) => {
    for (let k = 0, n = int(r, 4, 9); k < n; k++) {
      const amt = round(Math.exp(13 + normal(r)), 2); const a1 = pick(r, STAFF.treasury); let a2; do { a2 = pick(r, STAFF.treasury); } while (a2 === a1);
      payments.push({ id: `PAY-${pad(payments.length + 1, 4)}`, dayIdx: i, fund: pick(r, funds), payee: pick(r, payees), type: r() < 0.5 ? 'Distribution' : 'Capital call funding',
        amount: amt, noticeAmount: amt, approver1: a1, approver2: a2 });
    }
  });
  const bad = sample(r, bankChanges.filter(c => c.changedIdx >= 0 && c.changedIdx <= LAST - 5), 1)[0];
  if (bad) {
    bad.callbackBy = null; bad.callbackIdx = null;
    for (let j = 0, n = int(r, 1, 2); j < n; j++) {
      const p = { id: `PAY-${pad(payments.length + 1, 4)}`, dayIdx: int(r, bad.changedIdx, LAST), fund: pick(r, funds), payee: bad.payee, type: 'Distribution',
        amount: round(Math.exp(13.5 + normal(r)), 2), noticeAmount: 0, approver1: STAFF.treasury[0], approver2: STAFF.treasury[1] };
      p.noticeAmount = p.amount; payments.push(p);
    }
  }
  // ground truth: every payment to that payee after the unverified bank change is exposed
  if (bad) payments.forEach(p => { if (p.payee === bad.payee && p.dayIdx >= bad.changedIdx && p.dayIdx - bad.changedIdx <= 21) P('M1').add(p.id); });
  sample(r, payments, int(r, 2, 4)).forEach((p, i) => {
    if (i % 2) p.amount = round(p.noticeAmount * (r() < 0.5 ? 1.1 : 0.9), 2); // keying error against the notice
    else p.approver2 = r() < 0.5 ? null : p.approver1;                        // dual approval not performed
    P('M1').add(p.id);
  });

  /* M2: private-asset valuations (quarter ended 2026-09-30) */
  const VAL_DATE = '2026-09-30', NAV_RELEASE = '2026-10-23';
  const types = ['Real estate', 'Infrastructure', 'Private credit', 'Private equity', 'Timberland', 'Farmland'];
  const valuations = Array.from({ length: 60 }, (_, i) => {
    const prev = round(20 + r() * 480, 1) * 1e6; const chg = 0.04 * normal(r); const big = Math.abs(chg) > 0.15;
    return { id: `AST-${pad(i + 1, 3)}`, type: types[i % types.length], fund: pick(r, funds), prevValue: prev, value: round(prev * (1 + chg), 0),
      lastAppraisal: addDays(VAL_DATE, -int(r, 10, 330)), committeeIdx: int(r, 6, 13), navReleaseIdx: 15, commentary: big ? 'Cap-rate update and new lease terms' : null };
  });
  const vPool = sample(r, valuations, 6);
  vPool.slice(0, int(r, 1, 2)).forEach(v => { v.lastAppraisal = addDays(VAL_DATE, -int(r, 400, 560)); P('M2').add(v.id); });
  vPool.slice(2, 2 + int(r, 1, 2)).forEach(v => { v.committeeIdx = int(r, 16, 19); P('M2').add(v.id); });
  vPool.slice(4, 4 + int(r, 1, 2)).forEach(v => { v.value = round(v.prevValue * (r() < 0.5 ? 0.78 : 1.21), 0); v.commentary = null; P('M2').add(v.id); });

  /* M3: fund administrator reconciliation */
  const adminRecs = funds.map((f, i) => {
    const nav = round(200 + r() * 1800, 1) * 1e6; const u = r(); const bps = u < 0.75 ? r() * 4 : 5 + r() * 15;
    return { id: `ADM-${pad(i + 1, 2)}`, fund: f, administrator: pick(r, ['Atlas Fund Services', 'Harbor Fund Admin']), internalNav: nav, adminNav: round(nav * (1 + (r() < 0.5 ? -1 : 1) * bps / 1e4), 0), explained: bps >= 5 };
  });
  sample(r, adminRecs, int(r, 1, 2)).forEach(a => { a.adminNav = round(a.internalNav * (1 + (8 + r() * 30) / 1e4), 0); a.explained = false; P('M3').add(a.id); });

  /* M4: third-party oversight (as of month-end) */
  const thirdParties = PROVIDERS.map(([name, service], i) => {
    const crit = ['Fund administrator', 'Custodian', 'Payment processor', 'Cloud hosting', 'Pricing vendor'].includes(service) ? 'Critical' : ['Property manager', 'Transfer agent', 'Independent appraiser', 'Loan servicer', 'Market data vendor', 'IT outsourcing'].includes(service) ? 'High' : 'Moderate';
    return { id: `TP-${pad(i + 1, 2)}`, name, service, criticality: crit, lastReview: addDays(MONTH_END, -int(r, 30, 340)), socReviewed: crit === 'Critical' ? addDays(MONTH_END, -int(r, 20, 300)) : null, exitPlan: crit === 'Critical' };
  });
  const tpPool = sample(r, thirdParties.filter(t => t.criticality !== 'Moderate'), 4);
  tpPool.slice(0, int(r, 1, 2)).forEach(t => { t.lastReview = addDays(MONTH_END, -int(r, 400, 600)); P('M4').add(t.id); });
  const critPool = sample(r, thirdParties.filter(t => t.criticality === 'Critical' && !planted.M4?.has(t.id)), 2);
  critPool.slice(0, int(r, 1, 2)).forEach((t, i) => { if (i % 2) t.exitPlan = false; else t.socReviewed = null; P('M4').add(t.id); });

  /* C1: change management */
  const CHANGES = ['New private credit fund launch', 'Order system upgrade', 'New ESG screening model', 'Switch of pricing vendor for bonds',
    'New FX hedging strategy', 'Valuation model update (real estate)', 'Cloud migration of the reporting database', 'New client mandate type',
    'Trade allocation rule change', 'New timberland co-investment vehicle', 'Data feed from new administrator', 'Liquidity stress model update',
    'Robo-advice portfolio change', 'New derivatives counterparty', 'Performance attribution tool', 'Automated cash sweep'];
  const changes = CHANGES.map((title, i) => { const go = int(r, 0, LAST); return { id: `CHG-${pad(i + 1, 2)}`, title, goLiveIdx: go, signoffIdx: go - int(r, 1, 6), signedBy: 'Business Risk Management' }; });
  sample(r, changes, int(r, 1, 3)).forEach((c, i) => { if (i % 2) c.signoffIdx = c.goLiveIdx + int(r, 1, 4); else { c.signoffIdx = null; c.signedBy = null; } P('C1').add(c.id); });

  return { seed, accounts, securities, orders, blocks, signoffs, breaks, prices, payments, bankChanges, valuations, adminRecs, thirdParties, changes,
    params: { LARGE, VAL_DATE, NAV_RELEASE }, planted };
}

/* ------------------------------------------------------------ control tests (never read data.planted) */
export const CONTROLS = [
  { id: 'P1', area: 'Public markets', step: 'Portfolio decision', name: 'Pre-trade compliance on client restrictions', owner: 'Head of Investment Compliance',
    risk: 'A trade breaks a client’s investment restrictions, leading to client losses, compensation and regulatory breaches.', L: 3, I: 5,
    control: 'The order system checks each order against the client’s restricted list. A restricted order can go ahead only with an override approved by Compliance.',
    nature: 'System + manual approval', freq: 'Every order', design: 'Partially effective', designNote: 'The restriction is a warning, not a hard block, so the control depends on a manual override step.',
    how: 'Re-ran every order of the month against each client’s restricted list, then checked that every override was approved by a Compliance officer who was not the PM.',
    fix: ['Make restricted-list breaches a hard block in the order system.', 'Allow overrides only from Compliance users; the system rejects approvals by the PM or trader on the order.', 'Weekly Compliance review of all overrides, with the evidence kept in Archer.'],
    zero: true, unit: 'orders' },
  { id: 'P2', area: 'Public markets', step: 'Order creation', name: 'Four-eyes check on large orders', owner: 'Head of Trading',
    risk: 'A wrong size or wrong security on a large order (a “fat finger”) causes a large loss before anyone notices.', L: 2, I: 5,
    control: 'Orders above $25 million need a second approver from the head-trader group before release.',
    nature: 'Manual, recorded in the order system', freq: 'Every large order', design: 'Effective', designNote: 'Well designed, but not enforced by the system.',
    how: 'Selected every order above $25 million and checked that a second approver was recorded and was not the trader who placed it.',
    fix: ['Enforce the second approval in the order system: no release without it.', 'Block self-approval at the system level.', 'Daily exception report of large orders to the Head of Trading.'],
    zero: true, unit: 'large orders' },
  { id: 'P3', area: 'Public markets', step: 'Execution and allocation', name: 'Fair allocation of block trades', owner: 'Head of Trading',
    risk: 'One client receives better prices or a larger share of a block trade than its pre-allocation, which is unfair to other clients.', L: 2, I: 4,
    control: 'Block trades are allocated pro rata to the pre-trade allocation, at the block’s average price.',
    nature: 'Automated, with manual adjustments allowed', freq: 'Every block trade', design: 'Effective', designNote: 'Manual adjustments are allowed and are not separately approved.',
    how: 'For every block trade, compared each account’s share with its pre-allocation (tolerance 1 percentage point) and each account’s price with the block average price.',
    fix: ['Lock allocations to the pre-allocation and the average price in the system.', 'Any manual change requires Compliance approval and a reason.', 'Daily allocation exception report.'],
    zero: false, unit: 'block trades' },
  { id: 'P4', area: 'Public markets', step: 'Settlement and reconciliation', name: 'Daily custodian reconciliation and break escalation', owner: 'Head of Investment Operations',
    risk: 'Differences between internal records and the custodian go unnoticed, so positions, cash or client reports are wrong.', L: 3, I: 4,
    control: 'Operations reconciles each account with the custodian every business day and signs off by the next day. Breaks older than 3 business days are escalated.',
    nature: 'Manual', freq: 'Daily', design: 'Effective', designNote: 'Clear standard; relies on people remembering to escalate.',
    how: 'Checked all daily sign-offs for every account (completeness and timeliness), then aged every break of the month and checked escalation by day 3.',
    fix: ['Make the daily sign-off a required task with an automatic reminder.', 'Escalate breaks automatically on business day 3 to the Head of Operations.', 'Weekly aging report for open breaks.'],
    zero: false, unit: 'sign-offs and breaks' },
  { id: 'P5', area: 'Public markets', step: 'Pricing', name: 'Price validation: stale and manual prices', owner: 'Head of Valuation and Pricing',
    risk: 'Stale or unsupported prices misstate holdings, fund values and client reports.', L: 3, I: 3,
    control: 'Prices for liquid securities must move with the market. Manual prices need supporting evidence.',
    nature: 'Manual review', freq: 'Daily', design: 'Partially effective', designNote: 'No automated stale-price report; manual prices can be saved without evidence.',
    how: 'Scanned every daily price of liquid and semi-liquid securities for runs of 5 or more unchanged days, and checked every manual price for evidence. Illiquid securities are out of scope by design.',
    fix: ['Daily automated stale-price report for liquid securities.', 'Manual prices cannot be saved without an attached quote or note.', 'Monthly review of manual prices by the Valuation committee.'],
    zero: false, unit: 'prices' },
  { id: 'M1', area: 'Private markets', step: 'Capital calls and distributions', name: 'Payment controls: call-backs, dual approval, amount match', owner: 'Head of Fund Treasury',
    risk: 'Money is sent to the wrong or a fraudulent account, or in the wrong amount.', L: 3, I: 5,
    control: 'Any change of bank details needs a call-back before the next payment. Every payment needs two different approvers and must match the notice amount.',
    nature: 'Manual, in the payment system', freq: 'Every payment', design: 'Effective', designNote: 'Strong design; the system does not enforce it.',
    how: 'Checked every payment of the month: call-back evidence for recent bank changes, two distinct approvers, and an exact match with the notice amount.',
    fix: ['The payment system blocks release when bank details changed in the last 30 days and no call-back is recorded.', 'System-enforced dual approval by two different people.', 'Automatic match of payment amount to the notice.'],
    zero: true, unit: 'payments' },
  { id: 'M2', area: 'Private markets', step: 'Valuation', name: 'Private-asset valuation governance', owner: 'Head of Private Markets Valuation',
    risk: 'Asset values are stale or optimistic, so fund values and fees are wrong.', L: 3, I: 4,
    control: 'Each asset has an independent appraisal at least every 12 months. The Valuation committee approves values before the NAV is released. Moves above 15% need a written explanation.',
    nature: 'Manual, committee', freq: 'Quarterly', design: 'Effective', designNote: 'Clear policy; tracking is in spreadsheets.',
    how: 'Checked all 60 assets for appraisal age, committee approval before the NAV release date, and commentary on quarter-on-quarter moves above 15%.',
    fix: ['Valuation calendar with appraisal due dates and alerts at 10 months.', 'NAV release blocked until committee approval is logged.', 'Commentary is a required field for moves above 15%.'],
    zero: false, unit: 'assets' },
  { id: 'M3', area: 'Private markets', step: 'Fund administrator', name: 'Administrator NAV reconciliation', owner: 'Head of Fund Accounting',
    risk: 'The administrator’s records and the firm’s disagree, so investor statements or capital accounts are wrong.', L: 2, I: 4,
    control: 'Each month, Fund Accounting reconciles NAV with the administrator. Differences above 5 basis points must be explained and cleared before close.',
    nature: 'Manual', freq: 'Monthly', design: 'Effective', designNote: 'Sound; depends on timely follow-up with the administrator.',
    how: 'Recomputed the difference for every fund and checked that each one above 5 basis points was explained.',
    fix: ['Escalate unexplained differences to the Fund Controller on day 2 of close.', 'Track open items with the administrator in a shared log.', 'Quarterly service review on reconciliation quality.'],
    zero: false, unit: 'funds' },
  { id: 'M4', area: 'Private markets', step: 'Third parties', name: 'Third-party oversight by criticality', owner: 'Vendor Management Office',
    risk: 'A critical outside firm fails or performs poorly and nobody notices in time. OSFI Guideline B-10 sets expectations for this.', L: 3, I: 4,
    control: 'Critical and high-criticality providers get a due-diligence review every 12 months. Critical providers also need a reviewed controls (SOC) report and an exit plan.',
    nature: 'Manual', freq: 'Annual', design: 'Effective', designNote: 'Inventory exists; review dates are tracked by hand.',
    how: 'Checked all 24 providers against the review frequency for their criticality, plus the SOC report and exit plan for critical ones.',
    fix: ['Criticality-based review calendar with automatic reminders.', 'SOC report tracker with sign-off by the business owner.', 'Documented and tested exit plans for every critical provider.'],
    zero: false, unit: 'providers' },
  { id: 'C1', area: 'Change', step: 'New products, systems and models', name: 'Risk sign-off before go-live', owner: 'Chief Operating Officer, Investments',
    risk: 'A new product, system, model or data source goes live with unassessed risks.', L: 3, I: 4,
    control: 'Business Risk Management assesses and signs off every material change before it goes live.',
    nature: 'Manual gate', freq: 'Every change', design: 'Partially effective', designNote: 'The gate is a policy, not a step in the change tool.',
    how: 'Checked every change that went live this month for a risk sign-off dated before go-live.',
    fix: ['Add the risk sign-off as a required step in the change tool.', 'Go-live is blocked until the sign-off exists.', 'Monthly review of changes that went live, presented to the COO.'],
    zero: true, unit: 'changes' },
];

export function runTests(data) {
  const res = {}; const add = (id, pop, ex) => (res[id] = { population: pop, exceptions: ex });
  const acc = Object.fromEntries(data.accounts.map(a => [a.id, a]));
  const comp = new Set(STAFF.compliance); const L = data.params.LARGE;

  add('P1', data.orders.length, data.orders.flatMap(o => {
    const restricted = acc[o.account].restricted.has(o.security);
    if (restricted && o.compliance === 'Pass') return [{ id: o.id, date: o.date, detail: `${o.security} is on ${acc[o.account].name}’s restricted list, but the order passed without an override`, who: o.pm }];
    if (o.compliance === 'Override' && !o.overrideBy) return [{ id: o.id, date: o.date, detail: 'Override recorded with no approver', who: o.pm }];
    if (o.compliance === 'Override' && (!comp.has(o.overrideBy) || o.overrideBy === o.pm || o.overrideBy === o.trader)) return [{ id: o.id, date: o.date, detail: `Override approved by ${o.overrideBy}, who is not in Compliance`, who: o.pm }];
    return [];
  }));

  const large = data.orders.filter(o => o.notional > L);
  add('P2', large.length, large.flatMap(o => !o.secondApprover ? [{ id: o.id, date: o.date, detail: `$${(o.notional / 1e6).toFixed(1)}M order released with no second approver`, who: o.trader }]
    : o.secondApprover === o.trader ? [{ id: o.id, date: o.date, detail: `$${(o.notional / 1e6).toFixed(1)}M order approved by the trader who placed it`, who: o.trader }] : []));

  add('P3', data.blocks.length, data.blocks.flatMap(b => {
    const issues = b.fills.flatMap(f => {
      const share = 100 * f.qty / b.total; const out = [];
      if (Math.abs(share - f.prePct) > 1) out.push(`${acc[f.account].name} got ${share.toFixed(1)}% vs ${f.prePct.toFixed(1)}% pre-allocated`);
      if (Math.abs(f.price / b.avgPrice - 1) > 1e-4) out.push(`${acc[f.account].name} filled at ${f.price.toFixed(4)} vs average ${b.avgPrice.toFixed(4)}`);
      return out;
    });
    return issues.length ? [{ id: b.id, date: b.date, detail: issues.join('; '), who: 'Trading desk' }] : [];
  }));

  const sExc = data.signoffs.flatMap(s => s.signedBy === null ? [{ id: s.id, date: DAYS[s.dayIdx], detail: `No reconciliation sign-off for ${acc[s.account].name}`, who: 'Operations' }]
    : s.signedIdx - s.dayIdx > 1 ? [{ id: s.id, date: DAYS[s.dayIdx], detail: `Signed off ${s.signedIdx - s.dayIdx} business days late`, who: s.signedBy }] : []);
  const bExc = data.breaks.flatMap(b => {
    const age = (b.closedIdx ?? LAST) - b.openedIdx;
    if (age <= 3) return [];
    if (b.escalatedIdx === null) return [{ id: b.id, date: DAYS[b.openedIdx], detail: `Break of $${b.amount.toLocaleString('en-CA')} open ${age} business days, never escalated (${b.cause.toLowerCase()})`, who: 'Operations' }];
    if (b.escalatedIdx - b.openedIdx > 3) return [{ id: b.id, date: DAYS[b.openedIdx], detail: `Break escalated on day ${b.escalatedIdx - b.openedIdx}, after the 3-day limit`, who: 'Operations' }];
    return [];
  });
  add('P4', data.signoffs.length + data.breaks.length, sExc.concat(bExc));

  const inScope = data.prices.filter(x => x.tier < 3);
  const pExc = [];
  const ser = {}; inScope.forEach(x => (ser[x.security] = ser[x.security] || []).push(x));
  Object.entries(ser).forEach(([sec, xs]) => {
    xs.sort((a, b) => a.dayIdx - b.dayIdx); let run = 1, best = 1, start = 0, bestStart = 0;
    for (let i = 1; i < xs.length; i++) { if (xs[i].price === xs[i - 1].price) { run++; if (run > best) { best = run; bestStart = start; } } else { run = 1; start = i; } }
    if (best >= 5) pExc.push({ id: `${sec}|stale`, date: DAYS[xs[bestStart].dayIdx], detail: `${sec} price unchanged for ${best} business days (liquidity tier ${xs[0].tier})`, who: 'Pricing team' });
  });
  inScope.forEach(x => { if (x.source === 'Manual' && !x.evidence) pExc.push({ id: x.id, date: DAYS[x.dayIdx], detail: `Manual price ${x.price.toFixed(4)} for ${x.security} saved with no evidence`, who: 'Pricing team' }); });
  add('P5', inScope.length, pExc);

  add('M1', data.payments.length, data.payments.flatMap(p => {
    const out = [];
    const ch = data.bankChanges.filter(c => c.payee === p.payee && c.changedIdx <= p.dayIdx && p.dayIdx - c.changedIdx <= 21).sort((x, y) => y.changedIdx - x.changedIdx)[0];
    if (ch && (ch.callbackIdx === null || ch.callbackIdx > p.dayIdx)) out.push(`bank details changed ${ch.changedIdx >= 0 ? 'on ' + DAYS[ch.changedIdx] : 'last month'} with no call-back before payment`);
    if (!p.approver2) out.push('only one approver');
    else if (p.approver2 === p.approver1) out.push(`${p.approver1} approved twice`);
    if (Math.abs(p.amount - p.noticeAmount) > 0.005) out.push(`paid $${p.amount.toLocaleString('en-CA')} vs notice $${p.noticeAmount.toLocaleString('en-CA')}`);
    return out.length ? [{ id: p.id, date: DAYS[p.dayIdx], detail: `${p.type} to ${p.payee}: ${out.join('; ')}`, who: 'Fund Treasury' }] : [];
  }));

  const V = data.params.VAL_DATE;
  add('M2', data.valuations.length, data.valuations.flatMap(v => {
    const out = []; const ageM = daysBetween(v.lastAppraisal, V) / 30.44; const chg = v.value / v.prevValue - 1;
    if (ageM > 12) out.push(`last independent appraisal ${ageM.toFixed(0)} months old`);
    if (v.committeeIdx > v.navReleaseIdx) out.push(`committee approved on ${DAYS[v.committeeIdx]}, after the NAV release on ${DAYS[v.navReleaseIdx]}`);
    if (Math.abs(chg) > 0.15 && !v.commentary) out.push(`value moved ${(chg * 100).toFixed(1)}% with no explanation`);
    return out.length ? [{ id: v.id, date: V, detail: `${v.type}, ${v.fund}: ${out.join('; ')}`, who: 'Private markets valuation' }] : [];
  }));

  add('M3', data.adminRecs.length, data.adminRecs.flatMap(a => {
    const bps = Math.abs(a.adminNav / a.internalNav - 1) * 1e4;
    return bps > 5 && !a.explained ? [{ id: a.id, date: MONTH_END, detail: `${a.fund}: ${bps.toFixed(1)} bp unexplained difference with ${a.administrator}`, who: 'Fund Accounting' }] : [];
  }));

  add('M4', data.thirdParties.length, data.thirdParties.flatMap(t => {
    const out = []; const ageM = daysBetween(t.lastReview, MONTH_END) / 30.44;
    if (t.criticality !== 'Moderate' && ageM > 12) out.push(`last due-diligence review ${ageM.toFixed(0)} months ago`);
    if (t.criticality === 'Critical' && !t.socReviewed) out.push('no reviewed SOC report');
    if (t.criticality === 'Critical' && !t.exitPlan) out.push('no exit plan');
    return out.length ? [{ id: t.id, date: MONTH_END, detail: `${t.name} (${t.service}, ${t.criticality.toLowerCase()}): ${out.join('; ')}`, who: 'Vendor Management Office' }] : [];
  }));

  add('C1', data.changes.length, data.changes.flatMap(c => c.signoffIdx === null ? [{ id: c.id, date: DAYS[c.goLiveIdx], detail: `${c.title}: went live with no risk sign-off`, who: 'Change owner' }]
    : c.signoffIdx > c.goLiveIdx ? [{ id: c.id, date: DAYS[c.goLiveIdx], detail: `${c.title}: signed off ${c.signoffIdx - c.goLiveIdx} business days after go-live`, who: 'Change owner' }] : []));
  return res;
}

/* ------------------------------------------------------------ RCSA assessment */
export const band = (score) => score >= 15 ? 'High' : score >= 8 ? 'Medium' : 'Low';
const LEVEL = { High: 2, Medium: 1, Low: 0 }; const NAME = ['Low', 'Medium', 'High'];
const DUE = { High: 30, Medium: 60, Low: 90 };

/** Chance that a random sample of n items, drawn from a population of N with k exceptions, contains at least one exception. */
export function sampleCatchProb(N, k, n = 25) {
  if (k <= 0) return 0; if (n >= N) return 1;
  let miss = 1; for (let i = 0; i < n; i++) miss *= (N - k - i) / (N - i);
  return Math.max(0, 1 - miss);
}

export function assess(results) {
  return CONTROLS.map(c => {
    const t = results[c.id]; const k = t.exceptions.length; const rate = t.population ? k / t.population : 0;
    const operating = k === 0 ? 'Effective' : (!c.zero && rate <= 0.01) ? 'Partially effective' : 'Ineffective';
    const inherentScore = c.L * c.I; const inherent = band(inherentScore);
    const reduce = operating === 'Effective' && c.design === 'Effective' ? 2 : operating === 'Ineffective' ? 0 : 1;
    const residual = NAME[Math.max(0, LEVEL[inherent] - reduce)];
    const issue = k ? { id: `ISS-${c.id}`, control: c.id, title: `${c.name}: ${k} exception${k > 1 ? 's' : ''}`, severity: residual === 'Low' ? 'Low' : residual,
      owner: c.owner, opened: MONTH_END, due: addDays(MONTH_END, DUE[residual === 'Low' ? 'Low' : residual]), status: 'Open', actions: c.fix } : null;
    return { ...c, population: t.population, exceptions: t.exceptions, rate, operating, inherentScore, inherent, residual, issue, sampleCatch: sampleCatchProb(t.population, k) };
  });
}

/** Issues carried from earlier months: shows the full lifecycle, from open to validated closure. */
export const CARRIED = [
  { id: 'ISS-0731', title: 'Trade-error log not reconciled to the P&L adjustments', severity: 'Medium', owner: 'Head of Trading', opened: '2026-07-31', due: '2026-09-29', status: 'Overdue', note: 'Action plan agreed; system change slipped to November. Escalated to the Director.' },
  { id: 'ISS-0831', title: 'Timberland harvest volumes not reconciled to sales invoices', severity: 'Medium', owner: 'Head of Private Markets Operations', opened: '2026-08-31', due: '2026-10-30', status: 'Ready for validation', note: 'Owner reports the fix is in place; BRM to re-test on the October data before closing.' },
  { id: 'ISS-0915', title: 'User access to the order system not reviewed quarterly', severity: 'High', owner: 'Head of Investment Technology', opened: '2026-09-15', due: '2026-10-15', status: 'Closed', note: 'Closed after re-test: Q3 access review completed, 6 leavers removed, evidence filed.' },
  { id: 'ISS-0930', title: 'Proxy-voting vendor has no contingency plan', severity: 'Low', owner: 'Vendor Management Office', opened: '2026-09-30', due: '2026-12-29', status: 'In progress', note: 'Draft plan under review by Investment Stewardship.' },
];

/** Score detection against the planted ground truth (used only for the Method page and the tests). */
export function accuracy(data, results) {
  return CONTROLS.map(c => {
    const found = new Set(results[c.id].exceptions.map(e => e.id)); const truth = data.planted[c.id] || new Set();
    const tp = [...found].filter(x => truth.has(x)).length;
    return { id: c.id, planted: truth.size, found: found.size, caught: tp, missed: truth.size - tp, falsePositives: found.size - tp };
  });
}
