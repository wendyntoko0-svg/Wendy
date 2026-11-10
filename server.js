// FinServ Solutions customer portal - demo API + static front end (in-memory data).
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Demo customers (surname first, then given names) ----------
const RAW = `Basi Senzo Siyanda|basi@gmail.com
Buthelezi Amukelwa Nokubonga|buthelezi@gmail.com
Dlamini Olwethu|dlamini@gmail.com
Gumede Sphesihle|gumede@gmail.com
Hlatshwayo Nontokozo Wendy|hlatshwayo@gmail.com
Khanyile Aphiwe Wordsworth|khanyile@gmail.com
Lutuli Luyanda Samkelo|lutuli@gmail.com
Mabaso Snakhokonke Nkazimulo|mabaso@gmail.com
Mbatha Mncedisi|mbatha@gmail.com
Mchunu Aphelele|mchunu@gmail.com
Mdletshe Nomkhosi Silungile|mdletshe@gmail.com
Meyiwa Amukelani Kholiwe|meyiwa@gmail.com
Mkhize Nokulunga|mbali@gmail.com
Mkhize Sinethemba Velile|mkhize@gmail.com
Mncwabe Sinenhlanhla Yibanathi|mncwabe@gmail.com
Mthembu Busisiwe|mthembu@gmail.com
Ndlovu Siphosethu Joy|ndlovu@gmail.com
Nhlumayo Elihle Nompumelelo|nhlumayo@gmail.com
Shezi Sandile Ngcebo Haustine|shezi@gmail.com
Simelane Nosisa|simelane@gmail.com`;
const DEMO_PASSWORD = "Cloud@26";
const users = RAW.split("\n").map((l, i) => {
  const [full, email] = l.split("|");
  const [surname, ...given] = full.trim().split(/\s+/);
  return { idx: i, email, surname, given, firstName: given[0], role: "customer", password: DEMO_PASSWORD };
});
users.push({ idx: 20, email: "admin@gmail.com", surname: "Administrator", given: ["Admin"], firstName: "Admin", role: "admin", password: DEMO_PASSWORD });

// ---------- Seeded demo data ----------
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const round = (n) => Math.round(n * 100) / 100;
const MERCHANTS = [["Checkers Sandton", "Groceries", 150, 1100], ["Woolworths Food", "Groceries", 120, 900], ["Engen Fuel", "Transport", 400, 900], ["Uber trip", "Transport", 60, 260], ["Netflix", "Entertainment", 199, 199], ["Vodacom airtime", "Utilities", 50, 300], ["City Power prepaid", "Utilities", 300, 700], ["Takealot", "Shopping", 150, 1800], ["Mr Price", "Shopping", 120, 700], ["Nando's", "Dining", 90, 320], ["Clicks Pharmacy", "Health", 80, 600], ["DStv subscription", "Entertainment", 449, 449]];
const NAMES_PAYEES = [["Landlord - Rental", "Capitec", "1234567890"], ["Discovery Health", "FNB", "6200012345"], ["City of Joburg Rates", "ABSA", "4055012233"]];

function buildState(u) {
  const r = rng(u.idx * 977 + 13);
  const rand = (a, b) => a + r() * (b - a);
  const st = { accounts: [], transactions: [], beneficiaries: [], cards: [], loans: [], notifications: [], profile: {} };
  if (u.role === "admin") return st;
  const mk = (type, base, prefix) => ({ id: `${prefix}-${1000 + u.idx * 7 + (prefix === "SAV" ? 3 : 0)}`, type, number: String(Math.floor(1e9 + r() * 9e9)), branch: "632005", balance: round(base), opening: 0 });
  const chk = mk("Cheque account", rand(6000, 38000), "CHK");
  const sav = mk("Savings account", rand(12000, 90000), "SAV");
  st.accounts.push(chk, sav);
  // generate 5-6 weeks of cheque transactions, then derive running balances
  const raw = [];
  [14, 45].forEach((d, i) => raw.push({ date: daysAgo(d), desc: "Salary - Employer Pty Ltd", cat: "Income", amount: round(rand(14000, 34000)) }));
  for (let i = 0; i < 22; i++) { const m = MERCHANTS[Math.floor(r() * MERCHANTS.length)]; raw.push({ date: daysAgo(Math.floor(rand(0, 60))), desc: m[0], cat: m[1], amount: -round(rand(m[2], m[3])) }); }
  raw.sort((a, b) => a.date.localeCompare(b.date));
  const sum = raw.reduce((s, t) => s + t.amount, 0);
  let bal = round(chk.balance - sum); chk.opening = bal;
  raw.forEach((t, i) => { bal = round(bal + t.amount); st.transactions.push({ id: `T${u.idx}-${i}`, acct: chk.id, ...t, balance: bal }); });
  NAMES_PAYEES.slice(0, 2 + (u.idx % 2)).forEach(([name, bank, acc], i) => st.beneficiaries.push({ id: `B${i}`, name, bank, account: acc }));
  st.cards.push({ id: "C1", kind: "Debit card", network: "Visa", last4: String(1000 + Math.floor(r() * 9000)), expiry: "08/29", linked: chk.id, frozen: false, limit: 20000 });
  if (u.idx % 2 === 0) st.cards.push({ id: "C2", kind: "Credit card", network: "Mastercard", last4: String(1000 + Math.floor(r() * 9000)), expiry: "03/28", linked: "Credit", frozen: false, limit: 25000 });
  if (u.idx % 3 === 0) st.loans.push({ id: "L1", type: "Personal loan", principal: 40000, outstanding: round(rand(8000, 32000)), rate: 14.5, instalment: round(rand(1100, 1900)), nextDue: daysAgo(-9), termLeft: Math.floor(rand(6, 30)) });
  st.notifications = [{ date: daysAgo(1), text: "Your October statement is ready to view." }, { date: daysAgo(3), text: "New sign-in detected from Johannesburg." }, { date: daysAgo(6), text: "Savings interest of R" + round(sav.balance * 0.0035).toFixed(2) + " was paid." }];
  st.profile = { phone: "07" + (1 + (u.idx % 9)) + String(Math.floor(1e6 + r() * 9e6)), address: `${10 + u.idx} Jacaranda Street, Johannesburg`, idNumberMasked: "*******" + String(Math.floor(1000 + r() * 9000)).slice(0, 3) + "08*", customerSince: String(2016 + (u.idx % 9)) };
  return st;
}
const states = new Map();
const stateOf = (u) => { if (!states.has(u.email)) states.set(u.email, buildState(u)); return states.get(u.email); };
const fullName = (u) => [...u.given, u.surname].join(" ");

// ---------- Auth ----------
const sessions = new Map();
const auth = (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const email = sessions.get(token);
  const u = users.find((x) => x.email === email);
  if (!u) return res.status(401).json({ error: "Your session has ended. Please sign in again." });
  req.user = u; req.st = stateOf(u); req.token = token; next();
};
const adminOnly = (req, res, next) => (req.user.role === "admin" ? next() : res.status(403).json({ error: "Administrators only." }));
const bad = (res, msg) => res.status(400).json({ error: msg });

app.get("/health", (_q, res) => res.json({ status: "ok", instance: process.env.WEBSITE_INSTANCE_ID || "local", time: new Date().toISOString() }));

app.post("/api/login", (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const u = users.find((x) => x.email === email.trim().toLowerCase());
  if (!u || u.password !== password) return res.status(401).json({ error: "Email or password is incorrect." });
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, u.email);
  res.json({ token });
});
app.post("/api/logout", auth, (req, res) => { sessions.delete(req.token); res.json({ ok: true }); });

app.get("/api/me", auth, (req, res) => {
  const u = req.user;
  res.json({ email: u.email, role: u.role, firstName: u.firstName, fullName: fullName(u), ...req.st.profile });
});
app.put("/api/profile", auth, (req, res) => {
  const { phone, address } = req.body || {};
  if (phone !== undefined && !/^[0-9+ ]{10,15}$/.test(phone)) return bad(res, "Enter a valid cellphone number.");
  if (phone !== undefined) req.st.profile.phone = phone;
  if (address !== undefined) req.st.profile.address = String(address).slice(0, 120);
  res.json({ ok: true });
});
app.post("/api/password", auth, (req, res) => {
  const { current, next } = req.body || {};
  if (current !== req.user.password) return bad(res, "Your current password is incorrect.");
  if (!next || next.length < 8) return bad(res, "Use at least 8 characters for your new password.");
  req.user.password = next; res.json({ ok: true });
});

// ---------- Banking ----------
app.get("/api/dashboard", auth, (req, res) => {
  const { accounts, transactions, notifications, loans } = req.st;
  res.json({ accounts, recent: [...transactions].reverse().slice(0, 6), notifications, loans });
});
app.get("/api/accounts", auth, (req, res) => res.json({ accounts: req.st.accounts }));
app.get("/api/transactions", auth, (req, res) => {
  const { account, q = "", month } = req.query;
  let t = [...req.st.transactions].reverse();
  if (account) t = t.filter((x) => x.acct === account);
  if (month) t = t.filter((x) => x.date.startsWith(month));
  if (q) t = t.filter((x) => (x.desc + x.cat).toLowerCase().includes(String(q).toLowerCase()));
  res.json({ transactions: t });
});
app.get("/api/statement", auth, (req, res) => {
  const { account, month } = req.query;
  const acct = req.st.accounts.find((a) => a.id === account);
  if (!acct) return bad(res, "Choose an account.");
  const all = req.st.transactions.filter((t) => t.acct === account);
  const inMonth = all.filter((t) => t.date.startsWith(month));
  const before = all.filter((t) => t.date < month + "-01");
  const opening = before.length ? before[before.length - 1].balance : acct.opening;
  const closing = inMonth.length ? inMonth[inMonth.length - 1].balance : opening;
  res.json({ account: acct, month, opening, closing, transactions: inMonth });
});
const addTx = (st, acct, desc, cat, amount) => {
  acct.balance = round(acct.balance + amount);
  st.transactions.push({ id: "T" + crypto.randomBytes(4).toString("hex"), acct: acct.id, date: iso(new Date()), desc, cat, amount: round(amount), balance: acct.balance });
};
app.post("/api/transfer", auth, (req, res) => {
  const { from, to, amount } = req.body || {};
  const a = req.st.accounts.find((x) => x.id === from), b = req.st.accounts.find((x) => x.id === to), amt = Number(amount);
  if (!a || !b || a === b) return bad(res, "Choose two different accounts.");
  if (!(amt > 0)) return bad(res, "Enter an amount greater than zero.");
  if (a.balance < amt) return bad(res, "Insufficient funds in the selected account.");
  addTx(req.st, a, `Transfer to ${b.type}`, "Transfer", -amt);
  addTx(req.st, b, `Transfer from ${a.type}`, "Transfer", amt);
  res.json({ ok: true, reference: "TRF" + Date.now().toString().slice(-8) });
});
app.post("/api/pay", auth, (req, res) => {
  const { from, beneficiary, amount, reference = "" } = req.body || {};
  const a = req.st.accounts.find((x) => x.id === from), b = req.st.beneficiaries.find((x) => x.id === beneficiary), amt = Number(amount);
  if (!a || !b) return bad(res, "Choose an account and a beneficiary.");
  if (!(amt > 0)) return bad(res, "Enter an amount greater than zero.");
  if (a.balance < amt) return bad(res, "Insufficient funds in the selected account.");
  addTx(req.st, a, `Payment: ${b.name}${reference ? " (" + String(reference).slice(0, 30) + ")" : ""}`, "Payment", -amt);
  res.json({ ok: true, reference: "PAY" + Date.now().toString().slice(-8) });
});
app.get("/api/beneficiaries", auth, (req, res) => res.json({ beneficiaries: req.st.beneficiaries }));
app.post("/api/beneficiaries", auth, (req, res) => {
  const { name, bank, account } = req.body || {};
  if (!name || !bank || !/^[0-9]{6,15}$/.test(account || "")) return bad(res, "Enter a name, a bank and an account number (6 to 15 digits).");
  req.st.beneficiaries.push({ id: "B" + crypto.randomBytes(3).toString("hex"), name: String(name).slice(0, 40), bank: String(bank).slice(0, 30), account });
  res.json({ ok: true });
});
app.delete("/api/beneficiaries/:id", auth, (req, res) => { req.st.beneficiaries = req.st.beneficiaries.filter((b) => b.id !== req.params.id); res.json({ ok: true }); });
app.get("/api/cards", auth, (req, res) => res.json({ cards: req.st.cards }));
app.post("/api/cards/:id/freeze", auth, (req, res) => {
  const c = req.st.cards.find((x) => x.id === req.params.id);
  if (!c) return bad(res, "Card not found.");
  c.frozen = !c.frozen; res.json({ ok: true, frozen: c.frozen });
});
app.get("/api/loans", auth, (req, res) => res.json({ loans: req.st.loans }));
app.post("/api/support", auth, (req, res) => {
  if (!req.body || !req.body.message) return bad(res, "Write a message first.");
  res.json({ ok: true, reference: "SR" + Date.now().toString().slice(-7) });
});

// ---------- Admin ----------
app.get("/api/admin/customers", auth, adminOnly, (_req, res) => {
  const rows = users.filter((u) => u.role === "customer").map((u) => {
    const s = stateOf(u);
    return { name: fullName(u), email: u.email, accounts: s.accounts.length, total: round(s.accounts.reduce((t, a) => t + a.balance, 0)), cards: s.cards.length, loans: s.loans.length, frozenCards: s.cards.filter((c) => c.frozen).length };
  });
  res.json({ customers: rows, activeSessions: sessions.size, instance: process.env.WEBSITE_INSTANCE_ID || "local" });
});

// Autoscale test: burns CPU for ?seconds=30 (max 120). Remove before real use.
app.get("/api/load", (req, res) => {
  const end = Date.now() + Math.min(Number(req.query.seconds) || 30, 120) * 1000;
  while (Date.now() < end) Math.sqrt(Math.random() * 1e9);
  res.json({ done: true, instance: process.env.WEBSITE_INSTANCE_ID || "local" });
});

app.listen(PORT, () => console.log(`FinServ portal listening on ${PORT}`));
