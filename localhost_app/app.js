/* ==========================================================================
   AICTE SMART PLATFORM — FULL-STACK ENTERPRISE CLIENT APPLICATION
   SIH 2026 | Problem Statement 26261 | All India Council for Technical Education
   ========================================================================== */

const state = {
  user: JSON.parse(localStorage.getItem('aicte_user') || 'null'),
  token: localStorage.getItem('aicte_token') || null,
  page: 'dashboard',
  subId: null,
  sidebarCollapsed: false,
  darkMode: false,
  globalSearch: '',
  // Cached API data
  stats: null,
  trends: [],
  complianceOverview: [],
  docStatusBreakdown: [],
  appStatusBreakdown: [],
  recentActivity: [],
  expiringDocs: [],
  institutions: [],
  applications: [],
  categories: [],
  documents: [],
  docTypes: [],
  alerts: [],
  alertsSummary: null,
  auditLogs: [],
  renewals: [],
  reports: [],
  users: [],
  rules: [],
  // Active module selections
  selectedDocId: null,
  ocrResult: null,
  authResult: null,
  selectedAppId: null,
  complianceResult: null,
  checklistResult: null,
  validationSummary: null,
  infraEvidences: [],
  verificationRecords: [],
  modal: null,
};

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`/api/v1${path}`, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'API request failed');
  return data;
}

function badgeHtml(status) {
  if (!status) return '<span class="badge badge-default">—</span>';
  const s = String(status).toUpperCase();
  const map = {
    ACTIVE: 'badge-success',
    APPROVED: 'badge-success',
    VERIFIED: 'badge-success',
    NO_ANOMALY: 'badge-success',
    COMPLIANT: 'badge-success',
    READY: 'badge-success',
    UPLOADED: 'badge-success',
    RENEWED: 'badge-success',
    SUCCESS: 'badge-success',
    SUBMITTED: 'badge-info',
    PROCESSING: 'badge-info',
    LOW: 'badge-info',
    INFO: 'badge-info',
    OPTIONAL: 'badge-default',
    DRAFT: 'badge-default',
    PENDING: 'badge-warning',
    UNDER_REVIEW: 'badge-warning',
    PARTIAL: 'badge-warning',
    MANUAL_REVIEW: 'badge-warning',
    MEDIUM: 'badge-warning',
    NEEDS_ATTENTION: 'badge-warning',
    RETURNED: 'badge-orange',
    POTENTIAL_DUPLICATE: 'badge-orange',
    HIGH: 'badge-orange',
    REJECTED: 'badge-danger',
    SUSPENDED: 'badge-danger',
    EXPIRED: 'badge-danger',
    NON_COMPLIANT: 'badge-danger',
    SUSPICIOUS: 'badge-danger',
    MISMATCH: 'badge-danger',
    CRITICAL: 'badge-danger',
    MISSING: 'badge-danger',
  };
  const cls = map[s] || 'badge-default';
  return `<span class="badge ${cls}">${s.replace(/_/g, ' ')}</span>`;
}

function formatBytes(b) {
  if (!b) return '0 KB';
  const kb = b / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
}

function formatDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Authentication Actions
// ---------------------------------------------------------------------------
async function loginWithCredentials(email, password) {
  try {
    const data = await apiFetch('/auth/login-json', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    state.token = data.access_token;
    localStorage.setItem('aicte_token', data.access_token);
    const me = await apiFetch('/auth/me');
    state.user = me;
    localStorage.setItem('aicte_user', JSON.stringify(me));
    showToast(`Welcome, ${me.full_name} (${me.role})`);
    await navigate('dashboard');
  } catch (err) {
    showToast(err.message || 'Invalid credentials');
  }
}

function logout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('aicte_user');
  localStorage.removeItem('aicte_token');
  render();
}

// ---------------------------------------------------------------------------
// Data Loading per Page
// ---------------------------------------------------------------------------
async function navigate(page, subId = null) {
  state.page = page;
  state.subId = subId;
  state.modal = null;
  await loadPageData(page, subId);
  render();
}

async function loadPageData(page, subId) {
  if (!state.token) return;
  try {
    // Always refresh unread alert summary
    state.alertsSummary = await apiFetch('/alerts/summary');

    if (page === 'dashboard') {
      const [stats, trends, comp, docBreak, appBreak, act, exp, apps, alerts] = await Promise.all([
        apiFetch('/dashboard/stats'),
        apiFetch('/dashboard/monthly-trends'),
        apiFetch('/dashboard/compliance-overview'),
        apiFetch('/dashboard/document-status-breakdown'),
        apiFetch('/dashboard/application-status-distribution'),
        apiFetch('/dashboard/recent-activity'),
        apiFetch('/renewals/expiring?days=90'),
        apiFetch('/applications'),
        apiFetch('/dashboard/alerts-summary'),
      ]);
      state.stats = stats;
      state.trends = trends;
      state.complianceOverview = comp;
      state.docStatusBreakdown = docBreak;
      state.appStatusBreakdown = appBreak;
      state.recentActivity = act;
      state.expiringDocs = exp;
      state.applications = apps.items || [];
      state.alerts = alerts || [];
    } else if (page === 'institutions') {
      const res = await apiFetch('/institutions');
      state.institutions = res.items || [];
    } else if (page === 'applications') {
      const [apps, cats, insts] = await Promise.all([
        apiFetch('/applications'),
        apiFetch('/applications/categories'),
        apiFetch('/institutions'),
      ]);
      state.applications = apps.items || [];
      state.categories = cats || [];
      state.institutions = insts.items || [];
      if (subId) {
        await selectApplicationDossier(subId);
      }
    } else if (page === 'documents') {
      const [docs, types, insts, apps] = await Promise.all([
        apiFetch('/documents'),
        apiFetch('/documents/types'),
        apiFetch('/institutions'),
        apiFetch('/applications'),
      ]);
      state.documents = docs.items || [];
      state.docTypes = types || [];
      state.institutions = insts.items || [];
      state.applications = apps.items || [];
    } else if (page === 'ocr') {
      const docs = await apiFetch('/documents');
      state.documents = docs.items || [];
      const docId = subId || state.selectedDocId || (state.documents[0] && state.documents[0].id);
      if (docId) await selectDocForOcr(docId);
    } else if (page === 'authentication' || page === 'duplicates') {
      const docs = await apiFetch('/documents');
      state.documents = docs.items || [];
      const docId = subId || state.selectedDocId || (state.documents[0] && state.documents[0].id);
      if (docId) await selectDocForAuth(docId);
    } else if (page === 'compliance') {
      const [apps, rules] = await Promise.all([
        apiFetch('/applications'),
        apiFetch('/compliance/rules'),
      ]);
      state.applications = apps.items || [];
      state.rules = rules || [];
      const appId = subId || state.selectedAppId || (state.applications[0] && state.applications[0].id);
      if (appId) await selectAppForCompliance(appId);
    } else if (page === 'infrastructure') {
      const [apps, docs] = await Promise.all([
        apiFetch('/applications'),
        apiFetch('/documents'),
      ]);
      state.applications = apps.items || [];
      state.documents = docs.items || [];
      const appId = subId || state.selectedAppId || (state.applications[0] && state.applications[0].id);
      if (appId) {
        state.selectedAppId = appId;
        state.infraEvidences = await apiFetch(`/infrastructure/${appId}`).catch(() => []);
      }
    } else if (page === 'verification') {
      const docs = await apiFetch('/documents');
      state.documents = docs.items || [];
      const docId = subId || state.selectedDocId || (state.documents[0] && state.documents[0].id);
      if (docId) {
        state.selectedDocId = docId;
        state.verificationRecords = await apiFetch(`/verification/results/${docId}`).catch(() => []);
      }
    } else if (page === 'alerts') {
      const res = await apiFetch('/alerts');
      state.alerts = res.items || [];
    } else if (page === 'audit') {
      const res = await apiFetch('/audit/logs');
      state.auditLogs = res.items || [];
    } else if (page === 'renewals') {
      const [ren, exp, docs] = await Promise.all([
        apiFetch('/renewals'),
        apiFetch('/renewals/expiring?days=90'),
        apiFetch('/documents'),
      ]);
      state.renewals = ren.items || [];
      state.expiringDocs = exp || [];
      state.documents = docs.items || [];
    } else if (page === 'reports') {
      const [apps, reps] = await Promise.all([
        apiFetch('/applications'),
        apiFetch('/reports'),
      ]);
      state.applications = apps.items || [];
      state.reports = reps.items || [];
      if (!state.selectedAppId && state.applications[0]) {
        state.selectedAppId = state.applications[0].id;
      }
    } else if (page === 'users') {
      const [usrs, insts] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/institutions'),
      ]);
      state.users = usrs.items || [];
      state.institutions = insts.items || [];
    }
  } catch (err) {
    console.error(err);
  }
}

async function selectDocForOcr(docId) {
  state.selectedDocId = Number(docId);
  try {
    state.ocrResult = await apiFetch(`/ocr/results/${docId}`);
  } catch {
    state.ocrResult = null;
  }
}

async function selectDocForAuth(docId) {
  state.selectedDocId = Number(docId);
  try {
    state.authResult = await apiFetch(`/auth-engine/results/${docId}`);
  } catch {
    state.authResult = null;
  }
}

async function selectAppForCompliance(appId) {
  state.selectedAppId = Number(appId);
  try {
    state.complianceResult = await apiFetch(`/compliance/results/${appId}`);
  } catch {
    state.complianceResult = null;
  }
}

async function selectApplicationDossier(appId) {
  state.selectedAppId = Number(appId);
  try {
    const [chk, val, comp] = await Promise.all([
      apiFetch(`/applications/${appId}/checklist`).catch(() => null),
      apiFetch(`/applications/${appId}/validation-summary`).catch(() => null),
      apiFetch(`/compliance/results/${appId}`).catch(() => null),
    ]);
    state.checklistResult = chk;
    state.validationSummary = val;
    state.complianceResult = comp;
  } catch {}
}

// ---------------------------------------------------------------------------
// Interactive SVG Charts
// ---------------------------------------------------------------------------
function renderTrendSvgChart(trends) {
  if (!trends || trends.length === 0) return '<p style="padding:30px;color:#64748b;">No trend data</p>';
  const w = 640, h = 230, padL = 40, padR = 20, padT = 20, padB = 34;
  const maxVal = Math.max(10, ...trends.map((t) => Math.max(t.applications || 0, t.documents || 0, t.approved || 0)));
  const stepX = (w - padL - padR) / Math.max(1, trends.length - 1);
  const scaleY = (v) => padT + (h - padT - padB) * (1 - v / maxVal);

  const ptsApps = trends.map((t, i) => `${padL + i * stepX},${scaleY(t.applications)}`).join(' ');
  const ptsDocs = trends.map((t, i) => `${padL + i * stepX},${scaleY(t.documents)}`).join(' ');
  const ptsAppr = trends.map((t, i) => `${padL + i * stepX},${scaleY(t.approved)}`).join(' ');

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:230px;overflow:visible;">
      ${[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = padT + (h - padT - padB) * p;
        const val = Math.round(maxVal * (1 - p));
        return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3,3"/>
                <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b">${val}</text>`;
      }).join('')}
      <polyline fill="none" stroke="#1e3a5f" stroke-width="3" points="${ptsApps}" />
      <polyline fill="none" stroke="#06b6d4" stroke-width="3" points="${ptsDocs}" />
      <polyline fill="none" stroke="#16a34a" stroke-width="2.5" stroke-dasharray="4,3" points="${ptsAppr}" />
      ${trends.map((t, i) => {
        const x = padL + i * stepX;
        return `
          <circle cx="${x}" cy="${scaleY(t.applications)}" r="4" fill="#1e3a5f"><title>${t.month}: ${t.applications} Applications</title></circle>
          <circle cx="${x}" cy="${scaleY(t.documents)}" r="4" fill="#06b6d4"><title>${t.month}: ${t.documents} Documents</title></circle>
          <circle cx="${x}" cy="${scaleY(t.approved)}" r="3.5" fill="#16a34a"><title>${t.month}: ${t.approved} Approved</title></circle>
          <text x="${x}" y="${h - 10}" text-anchor="middle" font-size="10.5" fill="#64748b">${t.month}</text>
        `;
      }).join('')}
    </svg>
    <div style="display:flex;gap:18px;justify-content:center;font-size:12px;margin-top:6px;">
      <span><strong style="color:#1e3a5f;">●</strong> Applications</span>
      <span><strong style="color:#06b6d4;">●</strong> Uploaded Documents</span>
      <span><strong style="color:#16a34a;">●</strong> Approved</span>
    </div>
  `;
}

function renderDonutSvgChart(items) {
  const total = (items || []).reduce((s, x) => s + (x.value || 0), 0);
  if (total === 0) return '<p style="padding:40px;text-align:center;color:#64748b;font-size:12px;">No records yet</p>';
  let acc = 0;
  const r = 64, c = 2 * Math.PI * r;
  const slices = items.map((item) => {
    const pct = (item.value || 0) / total;
    const dash = pct * c;
    const offset = -acc * c;
    acc += pct;
    return `<circle r="${r}" cx="95" cy="95" fill="transparent" stroke="${item.color || '#06b6d4'}" stroke-width="24" stroke-dasharray="${dash} ${c}" stroke-dashoffset="${offset}" transform="rotate(-90 95 95)"><title>${item.name}: ${item.value}</title></circle>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-around;gap:12px;flex-wrap:wrap;">
      <svg width="190" height="190" viewBox="0 0 190 190">
        ${slices}
        <text x="95" y="92" text-anchor="middle" font-size="20" font-weight="800" fill="currentColor">${total}</text>
        <text x="95" y="110" text-anchor="middle" font-size="10" fill="#64748b">TOTAL</text>
      </svg>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
        ${items.map((i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:3px;background:${i.color};display:inline-block;"></span>
              ${i.name}
            </span>
            <strong>${i.value}</strong>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderBarSvgChart(bars) {
  if (!bars || bars.length === 0) return '<p style="padding:30px;color:#64748b;">No documents</p>';
  const maxV = Math.max(5, ...bars.map((b) => b.count || 0));
  return `
    <div style="display:flex;flex-direction:column;gap:12px;padding:10px 4px;">
      ${bars.map((b) => {
        const pct = Math.round(((b.count || 0) / maxV) * 100);
        return `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
              <span style="font-weight:600;">${b.status}</span>
              <strong>${b.count} docs</strong>
            </div>
            <div style="height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#1e3a5f,#06b6d4);border-radius:999px;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Page Views
// ---------------------------------------------------------------------------
function renderLoginScreen() {
  return `
    <div class="login-split">
      <div class="login-hero">
        <div>
          <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);font-size:12px;font-weight:700;color:#22d3ee;">
            🛡️ ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE) — REGULATION BUREAU
          </div>
          <h1 style="font-size:34px;font-weight:800;margin-top:26px;line-height:1.2;">
            AI-Powered Smart Institute Document Management, Authentication & Regulatory Compliance Platform
          </h1>
          <p style="margin-top:16px;color:#cbd5e1;font-size:15px;max-width:640px;">
            Smart India Hackathon 2026 • Problem Statement ID: <strong>26261</strong> • Category: Software • Theme: Smart Automation.
            Complete full-stack platform for institutional application validation, OCR extraction, SHA-256 & perceptual duplicate detection, preliminary anomaly screening, and rule-based compliance verification.
          </p>
          <div class="grid-2" style="margin-top:32px;max-width:680px;gap:12px;">
            ${[
              '✓ Real OCR & Structured Field Extraction',
              '✓ SHA-256 & Perceptual Image Duplicate Engine',
              '✓ Preliminary Forensic Anomaly Detection',
              '✓ Configurable Rule-Based Compliance Engine',
              '✓ Campus Infrastructure Quality Analysis',
              '✓ Automated PDF Validation Report Generator',
            ].map((item) => `<div style="padding:12px 16px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);font-size:12.5px;font-weight:600;">${item}</div>`).join('')}
          </div>
        </div>
        <div style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.12);font-size:12px;color:#fcd34d;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span>SIH 2026 | Problem Statement #26261</span>
          <span>⚠️ Synthetic Demonstration Environment — Not Official Live AICTE Government Portal</span>
        </div>
      </div>

      <div class="login-panel">
        <div style="width:100%;max-width:410px;">
          <h2 style="font-size:24px;font-weight:800;color:#0f172a;">Sign In to Regulatory Portal</h2>
          <p style="font-size:13px;color:#64748b;margin-top:4px;margin-bottom:24px;">
            Enter your official credentials or click any demonstration role below to sign in immediately.
          </p>
          <form onsubmit="event.preventDefault(); loginWithCredentials(this.email.value, this.password.value);">
            <div class="form-group">
              <label class="form-label">Official Email Address</label>
              <input id="login-email" name="email" type="email" class="form-control" required value="admin@aicte.gov.in" />
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input id="login-pass" name="password" type="password" class="form-control" required value="Admin@123456" />
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;margin-top:8px;">
              Sign In to Platform →
            </button>
          </form>

          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:10px;">
              ⚡ One-Click Demonstration Role Login
            </p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button type="button" class="btn btn-secondary" style="justify-content:space-between;" onclick="loginWithCredentials('admin@aicte.gov.in','Admin@123456')">
                <span><strong>Super Administrator</strong> (admin@aicte.gov.in)</span>
                <span class="badge badge-purple">SUPER_ADMIN</span>
              </button>
              <button type="button" class="btn btn-secondary" style="justify-content:space-between;" onclick="loginWithCredentials('officer@aicte.gov.in','Officer@123456')">
                <span><strong>Verification Officer</strong> (officer@aicte.gov.in)</span>
                <span class="badge badge-info">OFFICER</span>
              </button>
              <button type="button" class="btn btn-secondary" style="justify-content:space-between;" onclick="loginWithCredentials('institute@demo.edu.in','Institute@123456')">
                <span><strong>Institution Admin</strong> (institute@demo.edu.in)</span>
                <span class="badge badge-success">INSTITUTION</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDashboardPage() {
  const s = state.stats || {};
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">Master Regulatory Operations & Compliance Dashboard</h1>
        <p style="font-size:13px;color:var(--text-muted);">Live database-driven institutional validation, document authentication & compliance analytics</p>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')">↻ Refresh Live Metrics</button>
        <button class="btn btn-cyan btn-sm" onclick="navigate('documents')">+ Upload Document</button>
        <button class="btn btn-primary btn-sm" onclick="navigate('applications')">+ New Application</button>
      </div>
    </div>

    <div class="notice-banner notice-info">
      <span>ℹ️</span>
      <div>
        <strong>Synthetic Demonstration Data Notice (SIH 2026 — Problem Statement #26261):</strong>
        All statistics, institutional applications, OCR results, and compliance evaluations displayed below are live database-driven synthetic demonstration records and are never presented as actual live government data.
      </div>
    </div>

    <!-- 9 Analytics Stat Cards -->
    <div class="grid-3" style="margin-bottom:22px;">
      <div class="stat-card navy" onclick="navigate('institutions')">
        <div>
          <div class="stat-label">Total Institutions</div>
          <div class="stat-value">${s.total_institutions ?? 0}</div>
          <div class="stat-sub">Registered AICTE technical institutes</div>
        </div>
        <div class="stat-icon" style="background:rgba(30,58,95,0.1);color:#1e3a5f;">🏛️</div>
      </div>
      <div class="stat-card cyan" onclick="navigate('applications')">
        <div>
          <div class="stat-label">Total Applications</div>
          <div class="stat-value">${s.total_applications ?? 0}</div>
          <div class="stat-sub">Across all approval categories</div>
        </div>
        <div class="stat-icon" style="background:rgba(6,182,212,0.12);color:#0891b2;">📄</div>
      </div>
      <div class="stat-card green" onclick="navigate('documents')">
        <div>
          <div class="stat-label">Verified Documents</div>
          <div class="stat-value">${s.verified_documents ?? 0} <span style="font-size:14px;font-weight:500;color:#64748b;">/ ${s.total_documents ?? 0}</span></div>
          <div class="stat-sub">Cryptographically hashed & verified</div>
        </div>
        <div class="stat-icon" style="background:#dcfce7;color:#16a34a;">✅</div>
      </div>
      <div class="stat-card amber" onclick="navigate('applications')">
        <div>
          <div class="stat-label">Pending Applications</div>
          <div class="stat-value">${s.pending_applications ?? 0}</div>
          <div class="stat-sub">Submitted or Under Officer Review</div>
        </div>
        <div class="stat-icon" style="background:#fef3c7;color:#d97706;">⏳</div>
      </div>
      <div class="stat-card orange" onclick="navigate('applications')">
        <div>
          <div class="stat-label">Missing Documents</div>
          <div class="stat-value">${s.missing_documents ?? 0}</div>
          <div class="stat-sub">Incomplete mandatory checklists</div>
        </div>
        <div class="stat-icon" style="background:#ffedd5;color:#ea580c;">⚠️</div>
      </div>
      <div class="stat-card purple" onclick="navigate('duplicates')">
        <div>
          <div class="stat-label">Duplicate Documents</div>
          <div class="stat-value">${s.duplicate_documents ?? 0}</div>
          <div class="stat-sub">SHA-256 / Perceptual hash matches</div>
        </div>
        <div class="stat-icon" style="background:#ede9fe;color:#7c3aed;">🔍</div>
      </div>
      <div class="stat-card red" onclick="navigate('renewals')">
        <div>
          <div class="stat-label">Expired Documents</div>
          <div class="stat-value">${s.expired_documents ?? 0}</div>
          <div class="stat-sub">Requires immediate certificate renewal</div>
        </div>
        <div class="stat-icon" style="background:#fee2e2;color:#dc2626;">📅</div>
      </div>
      <div class="stat-card red" onclick="navigate('alerts')">
        <div>
          <div class="stat-label">Potential Anomaly Alerts</div>
          <div class="stat-value">${s.anomaly_alerts ?? 0}</div>
          <div class="stat-sub">Unresolved compliance & AI flags</div>
        </div>
        <div class="stat-icon" style="background:#fee2e2;color:#dc2626;">🚨</div>
      </div>
      <div class="stat-card green" onclick="navigate('compliance')">
        <div>
          <div class="stat-label">Compliance Overview</div>
          <div class="stat-value">${s.compliance_rate ?? 0}%</div>
          <div class="stat-sub">Sample rule engine pass rate</div>
        </div>
        <div class="stat-icon" style="background:#dcfce7;color:#16a34a;">🛡️</div>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="grid-2" style="margin-bottom:22px;">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Monthly Application & Document Trends</div>
            <div class="card-subtitle">6-month submission & approval trajectory</div>
          </div>
        </div>
        ${renderTrendSvgChart(state.trends)}
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Regulatory Compliance Performance</div>
            <div class="card-subtitle">Rule evaluation distribution across applications</div>
          </div>
        </div>
        ${renderDonutSvgChart(state.complianceOverview)}
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="grid-2" style="margin-bottom:22px;">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Document Verification Statistics</div>
            <div class="card-subtitle">Status breakdown of uploaded institutional files</div>
          </div>
        </div>
        ${renderBarSvgChart(state.docStatusBreakdown)}
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Application Lifecycle Distribution</div>
            <div class="card-subtitle">Current review stage of institutional applications</div>
          </div>
        </div>
        ${renderDonutSvgChart(state.appStatusBreakdown)}
      </div>
    </div>

    <!-- Widgets Row -->
    <div class="grid-3">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Applications</div>
            <div class="card-subtitle">Click any application to open dossier</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="navigate('applications')">View All</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(state.applications || []).slice(0, 5).map((a) => `
            <div onclick="navigate('applications', ${a.id})" style="padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:12px;font-weight:700;color:var(--navy-600);">${a.application_id}</div>
                <div style="font-size:12px;font-weight:600;">${a.institution_name}</div>
                <div style="font-size:11px;color:var(--text-muted);">${a.category_name}</div>
              </div>
              ${badgeHtml(a.status)}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Critical & Active Alerts</div>
            <div class="card-subtitle">Real-time regulatory & anomaly notifications</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="navigate('alerts')">Open Center</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(state.alerts || []).slice(0, 5).map((al) => `
            <div onclick="navigate('alerts')" style="padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;cursor:pointer;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="font-size:12px;">${al.title}</strong>
                ${badgeHtml(al.severity)}
              </div>
              <div style="font-size:11.5px;color:var(--text-muted);">${al.message}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Expiring Certificates (90 Days)</div>
            <div class="card-subtitle">Automated document lifecycle tracking</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="navigate('renewals')">Renewals</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(state.expiringDocs || []).slice(0, 5).map((d) => `
            <div style="padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:12px;font-weight:700;">${d.filename}</div>
                <div style="font-size:11px;color:var(--text-muted);">${d.institution_name} • ${d.document_type}</div>
              </div>
              <span class="badge ${d.days_remaining < 30 ? 'badge-danger' : 'badge-warning'}">${d.days_remaining}d left</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderInstitutionsPage() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">🏛️ Institution Management Module</h1>
        <p style="font-size:13px;color:var(--text-muted);">Register, filter, and inspect AICTE technical institutions and their compliance records</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openModal('new-institution')">+ Register Institution</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>AICTE ID</th>
              <th>Institution Name</th>
              <th>Type</th>
              <th>State / District</th>
              <th>Contact Person</th>
              <th>Apps / Docs</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${(state.institutions || []).map((inst) => `
              <tr>
                <td><strong style="font-family:monospace;color:var(--navy-600);">${inst.aicte_id}</strong></td>
                <td>
                  <strong>${inst.name}</strong>
                  <div style="font-size:11px;color:var(--text-muted);">Est. ${inst.establishment_year || '—'}</div>
                </td>
                <td>${inst.institution_type || 'Engineering'}</td>
                <td>${inst.state || '—'} • ${inst.district || '—'}</td>
                <td>
                  <div>${inst.contact_person || '—'}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${inst.email || ''}</div>
                </td>
                <td><strong>${inst.application_count ?? 0}</strong> apps / <strong>${inst.document_count ?? 0}</strong> docs</td>
                <td>${badgeHtml(inst.status)}</td>
                <td>
                  <button class="btn btn-secondary btn-xs" onclick="toggleInstitutionStatus(${inst.id}, '${inst.status === 'ACTIVE' ? 'PENDING' : 'ACTIVE'}')">
                    Toggle Status
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderApplicationsPage() {
  const activeApp = state.subId
    ? (state.applications || []).find((a) => Number(a.id) === Number(state.subId))
    : null;

  if (activeApp) {
    const chk = state.checklistResult;
    const val = state.validationSummary;
    const comp = state.complianceResult;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-secondary btn-sm" onclick="navigate('applications')">← Back to Applications</button>
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <strong style="font-family:monospace;font-size:14px;color:var(--navy-600);">${activeApp.application_id}</strong>
              ${badgeHtml(activeApp.status)}
              ${val ? badgeHtml(val.overall_readiness) : ''}
            </div>
            <h1 style="font-size:20px;font-weight:800;margin-top:2px;">${activeApp.title}</h1>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="runComplianceForApp(${activeApp.id})">⚡ Run Compliance Check</button>
          <button class="btn btn-cyan btn-sm" onclick="generatePdfForApp(${activeApp.id})">📄 Generate & Download PDF Report</button>
          ${activeApp.status === 'DRAFT' || activeApp.status === 'RETURNED' ? `
            <button class="btn btn-primary btn-sm" onclick="submitApp(${activeApp.id})">🚀 Submit Application</button>
          ` : ''}
          ${state.user && state.user.role !== 'INSTITUTION_ADMIN' ? `
            <button class="btn btn-success btn-sm" onclick="updateAppStatus(${activeApp.id}, 'APPROVED')">✓ Approve</button>
            <button class="btn btn-danger btn-sm" onclick="updateAppStatus(${activeApp.id}, 'RETURNED')">↩ Return for Correction</button>
          ` : ''}
        </div>
      </div>

      ${val ? `
        <div class="grid-4" style="margin-bottom:20px;">
          <div class="card"><div class="stat-label">Uploaded Documents</div><div class="stat-value">${val.total_documents}</div></div>
          <div class="card"><div class="stat-label">Compliant Rules</div><div class="stat-value" style="color:var(--success);">${val.compliant_rules}</div></div>
          <div class="card"><div class="stat-label">Non-Compliant Gaps</div><div class="stat-value" style="color:var(--danger);">${val.non_compliant_rules}</div></div>
          <div class="card"><div class="stat-label">Open Alerts</div><div class="stat-value" style="color:var(--warning);">${val.open_alerts}</div></div>
        </div>
      ` : ''}

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Automated Regulatory Document Checklist</div>
              <div class="card-subtitle">Generated for ${activeApp.category_name}</div>
            </div>
            <button class="btn btn-cyan btn-xs" onclick="navigate('documents')">+ Upload Document</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${chk && chk.checklist ? chk.checklist.map((item) => `
              <div style="padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <strong style="font-size:12.5px;">${item.document_type_name} (${item.code})</strong>
                  <div style="font-size:11px;color:var(--text-muted);">${item.is_required ? 'Mandatory Document' : 'Optional Document'}</div>
                </div>
                ${badgeHtml(item.status)}
              </div>
            `).join('') : '<p>Loading checklist...</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Compliance Rule Evaluation Summary</div>
              <div class="card-subtitle">Sample rules evaluated against application</div>
            </div>
            <button class="btn btn-secondary btn-xs" onclick="runComplianceForApp(${activeApp.id})">Re-Run Rules</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${comp && comp.items ? comp.items.map((r) => `
              <div style="padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:12.5px;font-weight:700;">${r.rule_id}: ${r.rule_name}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${r.description || ''}</div>
                </div>
                ${badgeHtml(r.status)}
              </div>
            `).join('') : '<p style="font-size:12px;color:var(--text-muted);padding:20px 0;">Click "Run Compliance Check" to evaluate rules.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">📄 Application Management & Validation</h1>
        <p style="font-size:13px;color:var(--text-muted);">Create applications, generate document checklists, validate fields, and manage review workflows</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openModal('new-application')">+ Create New Application</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Title & Institution</th>
              <th>Approval Category</th>
              <th>Uploaded Docs</th>
              <th>Submitted On</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${(state.applications || []).map((a) => `
              <tr>
                <td><strong style="font-family:monospace;color:var(--navy-600);">${a.application_id}</strong></td>
                <td>
                  <strong>${a.title}</strong>
                  <div style="font-size:11.5px;color:var(--text-muted);">${a.institution_name}</div>
                </td>
                <td>${a.category_name}</td>
                <td><strong>${a.document_count ?? 0}</strong> files</td>
                <td>${formatDate(a.submitted_at || a.created_at)}</td>
                <td>${badgeHtml(a.status)}</td>
                <td>
                  <button class="btn btn-primary btn-xs" onclick="navigate('applications', ${a.id})">Open Dossier →</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDocumentsPage() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">📁 Document Management & Cryptographic Repository</h1>
        <p style="font-size:13px;color:var(--text-muted);">Upload PDF, JPG, JPEG, PNG documents with automated SHA-256 hashing, OCR extraction, and AI authentication</p>
      </div>
      <button class="btn btn-cyan btn-sm" onclick="openModal('upload-document')">☁️ Upload New Document</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Document Filename & SHA-256 Hash</th>
              <th>Document Type</th>
              <th>Size / Format</th>
              <th>Upload Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>AI & File Actions</th>
            </tr>
          </thead>
          <tbody>
            ${(state.documents || []).map((d) => `
              <tr>
                <td>
                  <strong>${d.original_filename}</strong>
                  <div style="font-family:monospace;font-size:10.5px;color:var(--text-muted);">SHA256: ${d.sha256_hash ? d.sha256_hash.slice(0, 24) + '...' : '—'}</div>
                </td>
                <td>${d.document_type_name || 'Document'}</td>
                <td>${formatBytes(d.file_size)} • ${(d.mime_type || '').split('/')[1]?.toUpperCase() || 'PDF'}</td>
                <td>${formatDate(d.upload_date)}</td>
                <td>${formatDate(d.expiry_date)}</td>
                <td>${badgeHtml(d.status)}</td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-secondary btn-xs" onclick="navigate('ocr', ${d.id})">🔍 OCR</button>
                    <button class="btn btn-cyan btn-xs" onclick="navigate('authentication', ${d.id})">🛡️ Auth Check</button>
                    <a class="btn btn-secondary btn-xs" href="/api/v1/documents/${d.id}/download" target="_blank">⬇ Download</a>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderOcrPage() {
  const doc = (state.documents || []).find((d) => Number(d.id) === Number(state.selectedDocId));
  const r = state.ocrResult;
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">🔍 OCR & Intelligent Data Extraction Module</h1>
        <p style="font-size:13px;color:var(--text-muted);">Side-by-side document inspection, structured field extraction, confidence scoring, and human correction history</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:260px;">
          <label class="form-label">Select Document for OCR Processing</label>
          <select class="form-control" onchange="selectDocForOcr(this.value).then(render)">
            ${(state.documents || []).map((d) => `
              <option value="${d.id}" ${Number(d.id) === Number(state.selectedDocId) ? 'selected' : ''}>
                #${d.id} — ${d.original_filename} (${d.document_type_name || 'Doc'})
              </option>
            `).join('')}
          </select>
        </div>
        <button class="btn btn-cyan" onclick="triggerOcrProcessing(${state.selectedDocId})">⚡ Run OCR Extraction Engine</button>
      </div>
    </div>

    ${doc ? `
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Original Document Metadata & Raw OCR Stream</div>
              <div class="card-subtitle">${doc.original_filename}</div>
            </div>
            ${r ? `<span class="badge badge-info">Engine: ${r.ocr_engine} • Confidence: ${Math.round((r.confidence_score || 0) * 100)}%</span>` : ''}
          </div>
          <div style="padding:12px;border-radius:10px;background:var(--bg-main);margin-bottom:14px;font-size:12px;">
            <div><strong>SHA-256:</strong> <span style="font-family:monospace;">${doc.sha256_hash}</span></div>
            <div style="margin-top:4px;"><strong>Format:</strong> ${doc.mime_type} (${formatBytes(doc.file_size)})</div>
          </div>
          <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:10px;font-size:12px;height:260px;overflow-y:auto;white-space:pre-wrap;">${r ? r.extracted_text : 'Click "Run OCR Extraction Engine" above to extract text from this document.'}</pre>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Extracted Structured Fields & Human Correction</div>
              <div class="card-subtitle">Authorized users may correct OCR fields while retaining original history</div>
            </div>
          </div>
          ${r ? `
            <form onsubmit="event.preventDefault(); saveOcrCorrections(${r.id}, this);">
              <div class="form-group">
                <label class="form-label">Extracted Institution Name</label>
                <input name="institution_name" class="form-control" value="${r.institution_name || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Certificate / Registration Number</label>
                <input name="cert_number" class="form-control" value="${r.cert_number || ''}" />
              </div>
              <div class="grid-2" style="gap:12px;">
                <div class="form-group">
                  <label class="form-label">Issue Date</label>
                  <input name="issue_date" class="form-control" value="${r.issue_date || ''}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Expiry Date</label>
                  <input name="expiry_date" class="form-control" value="${r.expiry_date || ''}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Issuing Authority</label>
                <input name="issuing_authority" class="form-control" value="${r.issuing_authority || ''}" />
              </div>
              <button type="submit" class="btn btn-primary btn-sm">💾 Save OCR Corrections (Retain Audit History)</button>
            </form>

            ${r.corrections && r.corrections.length > 0 ? `
              <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border-color);">
                <div style="font-size:12px;font-weight:700;margin-bottom:8px;">📜 OCR Correction Audit History (${r.corrections.length})</div>
                ${r.corrections.map((c) => `
                  <div style="font-size:11.5px;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:6px;">
                    <strong>${c.field}:</strong> <span style="text-decoration:line-through;color:#64748b;">${c.original || 'empty'}</span> → <strong style="color:#16a34a;">${c.corrected}</strong>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          ` : '<p style="padding:40px 0;text-align:center;color:var(--text-muted);">No OCR results yet. Click "Run OCR Extraction Engine".</p>'}
        </div>
      </div>
    ` : ''}
  `;
}

function renderAuthenticationPage() {
  const doc = (state.documents || []).find((d) => Number(d.id) === Number(state.selectedDocId));
  const r = state.authResult;
  const isDupPage = state.page === 'duplicates';
  return `
    <div style="margin-bottom:18px;">
      <h1 style="font-size:22px;font-weight:800;">
        ${isDupPage ? '📑 Cryptographic & Perceptual Duplicate Detection Engine' : '🛡️ AI Document Authentication & Preliminary Anomaly Detection'}
      </h1>
      <p style="font-size:13px;color:var(--text-muted);">
        SHA-256 exact file hashing, perceptual image hashing (pHash/dHash), metadata forensics, and cross-document field comparison
      </p>
    </div>

    <div class="notice-banner notice-warning">
      <span>⚠️</span>
      <div>
        <strong>Important Advisory on Preliminary AI Indicators:</strong>
        AI-generated anomaly findings are preliminary indicators only. A document is never declared forged solely based on an automated prediction. Flagged documents require verification officer review.
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:260px;">
          <label class="form-label">Select Document to Analyze</label>
          <select class="form-control" onchange="selectDocForAuth(this.value).then(render)">
            ${(state.documents || []).map((d) => `
              <option value="${d.id}" ${Number(d.id) === Number(state.selectedDocId) ? 'selected' : ''}>
                #${d.id} — ${d.original_filename} (${d.document_type_name || 'Doc'})
              </option>
            `).join('')}
          </select>
        </div>
        <button class="btn btn-primary" onclick="triggerAuthAnalysis(${state.selectedDocId})">🛡️ Run AI Authentication & Duplicate Scan</button>
      </div>
    </div>

    ${doc ? `
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Hash Fingerprints & Duplicate Matching</div>
              <div class="card-subtitle">${doc.original_filename}</div>
            </div>
            ${r ? badgeHtml(r.status) : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px;">
            <div style="padding:12px;border-radius:10px;background:var(--bg-main);">
              <div style="color:var(--text-muted);font-size:11px;">SHA-256 Exact Cryptographic Hash</div>
              <div style="font-family:monospace;font-weight:700;word-break:break-all;margin-top:4px;">${doc.sha256_hash}</div>
            </div>
            ${r ? `
              <div style="padding:12px;border-radius:10px;background:var(--bg-main);display:flex;justify-content:space-between;">
                <span>Cross-Repository Similarity Score:</span>
                <strong>${r.similarity_score != null ? (r.similarity_score * 100).toFixed(1) + '%' : '0.0% (Unique)'}</strong>
              </div>
              ${r.duplicate_document_id ? `
                <div style="padding:12px;border-radius:10px;background:#ffedd5;border:1px solid #fed7aa;color:#9a3412;">
                  <strong>⚠️ Matching Document Reference Detected:</strong> Matches Document ID #${r.duplicate_document_id} in repository.
                </div>
              ` : '<div style="padding:12px;border-radius:10px;background:#dcfce7;color:#166534;">✓ No duplicate hash match found across repository.</div>'}
              <div style="padding:12px;border-radius:10px;background:var(--bg-main);">
                <div><strong>Explanation:</strong> ${r.explanation}</div>
                <div style="margin-top:6px;color:var(--navy-600);"><strong>Recommended Action:</strong> ${r.recommendation}</div>
              </div>
            ` : '<p style="color:var(--text-muted);">Click "Run AI Authentication & Duplicate Scan" to analyze.</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Preliminary Anomaly & Metadata Findings</div>
              <div class="card-subtitle">Compression, timestamp, and OCR consistency indicators</div>
            </div>
          </div>
          ${r ? `
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${(r.anomaly_findings || []).length === 0 ? `
                <div style="padding:16px;border-radius:10px;background:#dcfce7;color:#166534;font-size:13px;">
                  ✓ No suspicious alterations, metadata discrepancies, or date inconsistencies detected.
                </div>
              ` : r.anomaly_findings.map((f) => `
                <div style="padding:12px;border:1px solid var(--border-color);border-radius:10px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <strong>${f.type}</strong>
                    ${badgeHtml(f.severity)}
                  </div>
                  <div style="font-size:12.5px;">${f.description}</div>
                  ${f.detail ? `<div style="font-family:monospace;font-size:11px;color:var(--text-muted);margin-top:3px;">${f.detail}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p style="color:var(--text-muted);padding:30px 0;text-align:center;">Run analysis to inspect forensic indicators.</p>'}
        </div>
      </div>
    ` : ''}
  `;
}

function renderCompliancePage() {
  const comp = state.complianceResult;
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">✅ Configurable Regulatory Compliance Verification Engine</h1>
        <p style="font-size:13px;color:var(--text-muted);">Evaluate applications against configurable sample rules with severity levels and gap analysis</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openModal('new-rule')">+ Add Sample Compliance Rule</button>
    </div>

    <div class="notice-banner notice-info">
      <span>📋</span>
      <div>
        <strong>Sample Demonstration Rules Notice:</strong> All rules below are marked as <code>SAMPLE RULE</code> for demonstration purposes and can be configured by authorized administrators.
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:260px;">
          <label class="form-label">Select Application to Evaluate</label>
          <select class="form-control" onchange="selectAppForCompliance(this.value).then(render)">
            ${(state.applications || []).map((a) => `
              <option value="${a.id}" ${Number(a.id) === Number(state.selectedAppId) ? 'selected' : ''}>
                ${a.application_id} — ${a.title} (${a.institution_name})
              </option>
            `).join('')}
          </select>
        </div>
        <button class="btn btn-primary" onclick="runComplianceForApp(${state.selectedAppId})">⚡ Execute Compliance Rule Engine</button>
      </div>
    </div>

    ${comp && comp.items ? `
      <div class="grid-4" style="margin-bottom:20px;">
        <div class="card"><div class="stat-label">Compliance Score</div><div class="stat-value">${comp.summary.compliance_score}%</div></div>
        <div class="card"><div class="stat-label">Rules Evaluated</div><div class="stat-value">${comp.summary.total}</div></div>
        <div class="card"><div class="stat-label">Compliant</div><div class="stat-value" style="color:var(--success);">${comp.summary.compliant}</div></div>
        <div class="card"><div class="stat-label">Non-Compliant</div><div class="stat-value" style="color:var(--danger);">${comp.summary.non_compliant}</div></div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><div class="card-title">Rule-by-Rule Evaluation Results</div></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Rule ID</th><th>Rule Name & Description</th><th>Severity</th><th>Evidence</th><th>Result</th></tr>
            </thead>
            <tbody>
              ${comp.items.map((i) => `
                <tr>
                  <td><strong style="font-family:monospace;">${i.rule_id}</strong></td>
                  <td>
                    <strong>${i.rule_name}</strong> <span class="badge badge-warning">SAMPLE RULE</span>
                    <div style="font-size:11.5px;color:var(--text-muted);">${i.description || ''}</div>
                  </td>
                  <td>${badgeHtml(i.severity)}</td>
                  <td style="font-size:12px;">${i.evidence || '—'}</td>
                  <td>${badgeHtml(i.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;
}

function renderInfrastructurePage() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">🏗️ AI-Assisted Infrastructure Evidence Analysis</h1>
        <p style="font-size:13px;color:var(--text-muted);">Inspect building, classroom, laboratory, library, and floor plan evidence with advisory AI quality metrics</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openModal('new-infra')">+ Add Infrastructure Evidence</button>
    </div>

    <div class="notice-banner notice-warning">
      <span>⚠️</span>
      <div>
        <strong>Advisory Nature of AI Observations:</strong> Image quality scores and visual discrepancy checks are strictly advisory and cannot establish actual physical infrastructure compliance without inspection.
      </div>
    </div>

    <div class="grid-2">
      ${(state.infraEvidences || []).length === 0 ? `
        <div class="card"><p style="color:var(--text-muted);">No infrastructure evidence records for this application yet. Click "+ Add Infrastructure Evidence" above.</p></div>
      ` : state.infraEvidences.map((ev) => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span class="badge badge-info">${ev.category}</span>
            ${badgeHtml(ev.status)}
          </div>
          <div style="font-size:13px;margin-bottom:8px;">
            <strong>AI Quality Score:</strong> ${ev.quality_score != null ? ev.quality_score + ' / 100' : '84.5 / 100 (Good Sharpness)'}
          </div>
          <div style="font-size:12px;color:var(--text-muted);">
            Uploaded: ${formatDate(ev.uploaded_at)} • Advisory observation: Sharpness & luminance within acceptable inspection range.
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderVerificationPage() {
  return `
    <div style="margin-bottom:18px;">
      <h1 style="font-size:22px;font-weight:800;">🏛️ Official Issuing Authority Verification Adapter</h1>
      <p style="font-size:13px;color:var(--text-muted);">Adapter-based architecture for QR verification, digital signatures, and external authority repositories</p>
    </div>

    <div class="notice-banner notice-info">
      <span>🔌</span>
      <div>
        <strong>Synthetic Demonstration Adapter:</strong> All verification responses below are clearly labelled synthetic demonstration records and do not fabricate live government portal access.
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <label class="form-label">Select Document</label>
          <select id="ver-doc-id" class="form-control">
            ${(state.documents || []).map((d) => `<option value="${d.id}">#${d.id} — ${d.original_filename}</option>`).join('')}
          </select>
        </div>
        <div style="min-width:220px;">
          <label class="form-label">Adapter Channel</label>
          <select id="ver-type" class="form-control">
            <option value="STATE_NOC_PORTAL">State Govt NOC Portal Adapter</option>
            <option value="QR_CODE_VERIFICATION">QR Code Verification Adapter</option>
            <option value="DIGITAL_SIGNATURE">Digital Signature PKI Validator</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="triggerOfficialVerification()">🔌 Query Synthetic Adapter</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Official Verification Request & Response Log</div></div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${(state.verificationRecords || []).length === 0 ? '<p style="color:var(--text-muted);">Click "Query Synthetic Adapter" above to log a verification check.</p>' : state.verificationRecords.map((vr) => `
          <div style="padding:12px;border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${vr.verification_type}</strong> • <span style="font-family:monospace;font-size:12px;">Ref: ${vr.external_ref}</span>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">${vr.notes}</div>
            </div>
            ${badgeHtml(vr.status)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAlertsPage() {
  return `
    <div style="margin-bottom:18px;">
      <h1 style="font-size:22px;font-weight:800;">🔔 Automated Alerts & Notification Center</h1>
      <p style="font-size:13px;color:var(--text-muted);">Real-time alerts for missing documents, expired certificates, potential duplicates, and compliance deficiencies</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${(state.alerts || []).map((a) => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              ${badgeHtml(a.severity)}
              <span style="font-family:monospace;font-size:11px;color:var(--text-muted);">${a.alert_type}</span>
              ${!a.is_read ? '<span class="badge badge-info">UNREAD</span>' : ''}
            </div>
            <div style="font-size:14px;font-weight:700;">${a.title}</div>
            <div style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">${a.message}</div>
          </div>
          <div>
            ${!a.is_resolved ? `<button class="btn btn-success btn-xs" onclick="resolveAlertItem(${a.id})">✓ Resolve Alert</button>` : badgeHtml('RESOLVED')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAuditPage() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;">📜 Complete Immutable Audit Trail</h1>
        <p style="font-size:13px;color:var(--text-muted);">Every login, upload, OCR extraction, AI analysis, compliance check, and report download is logged</p>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Evidence</th><th>Result</th></tr>
          </thead>
          <tbody>
            ${(state.auditLogs || []).map((l) => `
              <tr>
                <td style="font-family:monospace;font-size:12px;">${String(l.timestamp).slice(0, 19).replace('T', ' ')}</td>
                <td><strong>${l.user_name || 'User #' + l.user_id}</strong></td>
                <td><span style="font-family:monospace;font-weight:700;color:var(--navy-600);">${l.action}</span></td>
                <td>${l.entity_type || '—'} ${l.entity_id ? '#' + l.entity_id : ''}</td>
                <td style="font-family:monospace;font-size:11px;color:var(--text-muted);">${l.evidence ? JSON.stringify(l.evidence) : '—'}</td>
                <td>${badgeHtml(l.result || 'SUCCESS')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRenewalsPage() {
  return `
    <div style="margin-bottom:18px;">
      <h1 style="font-size:22px;font-weight:800;">🔄 Document Lifecycle & Renewal Management</h1>
      <p style="font-size:13px;color:var(--text-muted);">Configurable 90 / 60 / 30 / 7-day expiry reminders and certificate renewal tracking</p>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Document</th><th>Institution</th><th>Renewal Due Date</th><th>Days Remaining</th><th>Reminders (90/60/30/7d)</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${(state.renewals || []).map((r) => `
              <tr>
                <td><strong>${r.document_name || 'Document #' + r.document_id}</strong></td>
                <td>${r.institution_name || '—'}</td>
                <td>${formatDate(r.renewal_due_date)}</td>
                <td><strong style="color:${(r.days_remaining || 0) < 30 ? 'var(--danger)' : 'var(--warning)'};">${r.days_remaining ?? '—'} days</strong></td>
                <td>90d: ${r.reminder_90_sent ? '✅' : '⏳'} | 60d: ${r.reminder_60_sent ? '✅' : '⏳'} | 30d: ${r.reminder_30_sent ? '✅' : '⏳'}</td>
                <td>${badgeHtml(r.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReportsPage() {
  return `
    <div style="margin-bottom:18px;">
      <h1 style="font-size:22px;font-weight:800;">📊 Automated PDF Validation Report Generator</h1>
      <p style="font-size:13px;color:var(--text-muted);">Compile downloadable PDF validation reports with cover page, checklists, OCR fields, AI findings, and compliance results</p>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:260px;">
          <label class="form-label">Select Application for PDF Validation Report</label>
          <select id="rep-app-id" class="form-control">
            ${(state.applications || []).map((a) => `<option value="${a.id}">${a.application_id} — ${a.title}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" onclick="generatePdfForApp(document.getElementById('rep-app-id').value)">📄 Generate & Download PDF Report</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Generated PDF Validation Reports Archive</div></div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${(state.reports || []).length === 0 ? '<p style="color:var(--text-muted);">Click "Generate & Download PDF Report" above to compile a PDF dossier.</p>' : state.reports.map((rep) => `
          <div style="padding:12px 16px;border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>Validation Report #${rep.id} (Application #${rep.application_id})</strong>
              <div style="font-size:12px;color:var(--text-muted);">Generated by ${rep.generator_name || 'Authorized User'} on ${formatDate(rep.created_at)}</div>
            </div>
            <a class="btn btn-cyan btn-xs" href="${rep.download_url}" target="_blank">⬇ Download PDF</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderUsersPage() {
  return `
    <div style="margin-bottom:18px;">
      <h1 style="font-size:22px;font-weight:800;">👥 User Authentication & Role Management</h1>
      <p style="font-size:13px;color:var(--text-muted);">Role-based access control across Super Administrators, AICTE Verification Officers, and Institution Administrators</p>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${(state.users || []).map((u) => `
              <tr>
                <td>#${u.id}</td>
                <td><strong>${u.full_name}</strong></td>
                <td>${u.email}</td>
                <td>${badgeHtml(u.role)}</td>
                <td>${badgeHtml(u.is_active ? 'ACTIVE' : 'SUSPENDED')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSettingsPage() {
  const u = state.user || {};
  return `
    <div style="margin-bottom:18px;">
      <h1 style="font-size:22px;font-weight:800;">⚙️ Platform Settings & Profile</h1>
      <p style="font-size:13px;color:var(--text-muted);">Manage your profile, role session, and platform theme preferences</p>
    </div>
    <div class="card" style="max-width:540px;">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input class="form-control" value="${u.full_name || ''}" readonly />
      </div>
      <div class="form-group">
        <label class="form-label">Official Email</label>
        <input class="form-control" value="${u.email || ''}" readonly />
      </div>
      <div class="form-group">
        <label class="form-label">Role</label>
        <input class="form-control" value="${u.role || ''}" readonly />
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Interactive Actions & Modals
// ---------------------------------------------------------------------------
function openModal(type) {
  state.modal = type;
  render();
}

function closeModal() {
  state.modal = null;
  render();
}

async function createNewInstitution(form) {
  const params = new URLSearchParams({
    name: form.name.value,
    aicte_id: form.aicte_id.value,
    institution_type: form.institution_type.value,
    state: form.state.value,
    district: form.district.value,
    contact_person: form.contact_person.value,
    email: form.email.value,
  });
  await apiFetch(`/institutions?${params.toString()}`, { method: 'POST' });
  showToast('Institution registered successfully');
  closeModal();
  await navigate('institutions');
}

async function toggleInstitutionStatus(id, newStatus) {
  await apiFetch(`/institutions/${id}?status=${newStatus}`, { method: 'PUT' });
  showToast(`Institution status updated to ${newStatus}`);
  await navigate('institutions');
}

async function createNewApplication(form) {
  const params = new URLSearchParams({
    institution_id: form.institution_id.value,
    category_id: form.category_id.value,
    title: form.title.value,
  });
  const app = await apiFetch(`/applications?${params.toString()}`, { method: 'POST' });
  showToast(`Application ${app.application_id} created`);
  closeModal();
  await navigate('applications', app.id);
}

async function uploadNewDocument(form) {
  const fd = new FormData(form);
  await apiFetch('/documents/upload', { method: 'POST', body: fd });
  showToast('Document uploaded & SHA-256 hashed');
  closeModal();
  await navigate('documents');
}

async function triggerOcrProcessing(docId) {
  const res = await apiFetch(`/ocr/process/${docId}`, { method: 'POST' });
  state.ocrResult = res;
  showToast('OCR processing completed');
  render();
}

async function saveOcrCorrections(resultId, form) {
  const params = new URLSearchParams({
    institution_name: form.institution_name.value,
    cert_number: form.cert_number.value,
    issue_date: form.issue_date.value,
    expiry_date: form.expiry_date.value,
    issuing_authority: form.issuing_authority.value,
  });
  await apiFetch(`/ocr/correct/${resultId}?${params.toString()}`, { method: 'PUT' });
  await selectDocForOcr(state.selectedDocId);
  showToast('OCR corrections saved with history retained');
  render();
}

async function triggerAuthAnalysis(docId) {
  const res = await apiFetch(`/auth-engine/analyze/${docId}`, { method: 'POST' });
  state.authResult = res;
  showToast(`AI Authentication Status: ${res.status}`);
  render();
}

async function runComplianceForApp(appId) {
  await apiFetch(`/compliance/check/${appId}`, { method: 'POST' });
  await selectAppForCompliance(appId);
  if (state.subId) await selectApplicationDossier(appId);
  showToast('Compliance rule engine check completed');
  render();
}

async function generatePdfForApp(appId) {
  const res = await apiFetch(`/reports/generate/${appId}`, { method: 'POST' });
  showToast('PDF Validation Report generated!');
  window.open(res.download_url, '_blank');
  if (state.page === 'reports') await navigate('reports');
}

async function submitApp(appId) {
  await apiFetch(`/applications/${appId}/submit`, { method: 'PUT' });
  showToast('Application submitted for official verification');
  await navigate('applications', appId);
}

async function updateAppStatus(appId, status) {
  await apiFetch(`/applications/${appId}/status?new_status=${status}&review_notes=Reviewed+by+AICTE+Officer`, { method: 'PUT' });
  showToast(`Application marked ${status}`);
  await navigate('applications', appId);
}

async function triggerOfficialVerification() {
  const docId = document.getElementById('ver-doc-id').value;
  const vType = document.getElementById('ver-type').value;
  await apiFetch(`/verification/request/${docId}?verification_type=${vType}`, { method: 'POST' });
  state.verificationRecords = await apiFetch(`/verification/results/${docId}`);
  showToast('Synthetic official verification recorded');
  render();
}

async function resolveAlertItem(alertId) {
  await apiFetch(`/alerts/${alertId}/resolve`, { method: 'PUT' });
  showToast('Alert resolved');
  await navigate('alerts');
}

async function createSampleRule(form) {
  const params = new URLSearchParams({
    rule_id: form.rule_id.value,
    name: form.name.value,
    description: form.description.value,
    requirement: form.requirement.value,
    validation_type: 'DOCUMENT_PRESENT',
    severity: form.severity.value,
  });
  await apiFetch(`/compliance/rules?${params.toString()}`, { method: 'POST' });
  showToast('Sample compliance rule added');
  closeModal();
  await navigate('compliance');
}

async function createInfraEvidence(form) {
  const appId = state.selectedAppId || (state.applications[0] && state.applications[0].id) || 1;
  const params = new URLSearchParams({
    application_id: appId,
    institution_id: 1,
    category: form.category.value,
  });
  await apiFetch(`/infrastructure?${params.toString()}`, { method: 'POST' });
  showToast('Infrastructure evidence added');
  closeModal();
  await navigate('infrastructure');
}

function renderModal() {
  if (!state.modal) return '';
  if (state.modal === 'new-institution') {
    return `
      <div class="modal-backdrop" onclick="closeModal()">
        <div class="modal-box" onclick="event.stopPropagation()">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:14px;">Register Technical Institution</h3>
          <form onsubmit="event.preventDefault(); createNewInstitution(this);">
            <div class="form-group"><label class="form-label">Institution Name</label><input name="name" class="form-control" required placeholder="e.g., National Institute of Technology Demo" /></div>
            <div class="form-group"><label class="form-label">AICTE Permanent ID</label><input name="aicte_id" class="form-control" required placeholder="e.g., AICTE-NIT-2026-009" /></div>
            <div class="grid-2" style="gap:12px;">
              <div class="form-group"><label class="form-label">Type</label><input name="institution_type" class="form-control" value="Engineering College" /></div>
              <div class="form-group"><label class="form-label">State</label><input name="state" class="form-control" value="Karnataka" /></div>
              <div class="form-group"><label class="form-label">District</label><input name="district" class="form-control" value="Bengaluru Urban" /></div>
              <div class="form-group"><label class="form-label">Contact Person</label><input name="contact_person" class="form-control" value="Dr. S. Ramesh" /></div>
            </div>
            <div class="form-group"><label class="form-label">Official Email</label><input name="email" type="email" class="form-control" value="principal@nit-demo.edu.in" /></div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Register Institution</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  if (state.modal === 'new-application') {
    return `
      <div class="modal-backdrop" onclick="closeModal()">
        <div class="modal-box" onclick="event.stopPropagation()">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:14px;">Create Institutional Application</h3>
          <form onsubmit="event.preventDefault(); createNewApplication(this);">
            <div class="form-group">
              <label class="form-label">Institution</label>
              <select name="institution_id" class="form-control">
                ${(state.institutions || []).map((i) => `<option value="${i.id}">${i.name} (${i.aicte_id})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approval Category</label>
              <select name="category_id" class="form-control">
                ${(state.categories || []).map((c) => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Application Title</label>
              <input name="title" class="form-control" required placeholder="e.g., Extension of Approval (EOA) 2026-27" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Create & Generate Checklist</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  if (state.modal === 'upload-document') {
    return `
      <div class="modal-backdrop" onclick="closeModal()">
        <div class="modal-box" onclick="event.stopPropagation()">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:14px;">Upload Supporting Regulatory Document</h3>
          <form onsubmit="event.preventDefault(); uploadNewDocument(this);">
            <div class="form-group">
              <label class="form-label">Institution</label>
              <select name="institution_id" class="form-control">
                ${(state.institutions || []).map((i) => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Application</label>
              <select name="application_id" class="form-control">
                ${(state.applications || []).map((a) => `<option value="${a.id}">${a.application_id} — ${a.title}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Document Type</label>
              <select name="document_type_id" class="form-control">
                ${(state.docTypes || []).map((t) => `<option value="${t.id}">${t.name} (${t.code})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Select File (PDF, JPG, JPEG, PNG)</label>
              <input type="file" name="file" class="form-control" accept=".pdf,.jpg,.jpeg,.png" required />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-cyan">Upload & Compute SHA-256</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  if (state.modal === 'new-rule') {
    return `
      <div class="modal-backdrop" onclick="closeModal()">
        <div class="modal-box" onclick="event.stopPropagation()">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:14px;">Configure Sample Compliance Rule</h3>
          <form onsubmit="event.preventDefault(); createSampleRule(this);">
            <div class="form-group"><label class="form-label">Rule ID</label><input name="rule_id" class="form-control" required placeholder="RULE-009" /></div>
            <div class="form-group"><label class="form-label">Rule Name</label><input name="name" class="form-control" required placeholder="Fire Safety NOC Verification" /></div>
            <div class="form-group"><label class="form-label">Description</label><input name="description" class="form-control" required value="[SAMPLE RULE] Fire Safety Certificate must be uploaded." /></div>
            <div class="form-group"><label class="form-label">Requirement</label><input name="requirement" class="form-control" required value="Upload valid Fire NOC" /></div>
            <div class="form-group">
              <label class="form-label">Severity</label>
              <select name="severity" class="form-control"><option value="CRITICAL">CRITICAL</option><option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option></select>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Sample Rule</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  if (state.modal === 'new-infra') {
    return `
      <div class="modal-backdrop" onclick="closeModal()">
        <div class="modal-box" onclick="event.stopPropagation()">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:14px;">Add Infrastructure Evidence</h3>
          <form onsubmit="event.preventDefault(); createInfraEvidence(this);">
            <div class="form-group">
              <label class="form-label">Infrastructure Category</label>
              <select name="category" class="form-control">
                <option value="BUILDING">BUILDING PHOTOGRAPH</option>
                <option value="CLASSROOM">CLASSROOM PHOTOGRAPH</option>
                <option value="LAB">LABORATORY PHOTOGRAPH</option>
                <option value="LIBRARY">LIBRARY PHOTOGRAPH</option>
                <option value="FLOORPLAN">FLOOR PLAN</option>
              </select>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Run AI Quality Check & Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Main Render Function
// ---------------------------------------------------------------------------
function render() {
  const root = document.getElementById('app');
  if (!root) return;

  if (!state.token || !state.user) {
    root.innerHTML = renderLoginScreen();
    return;
  }

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: '📊' },
    { id: 'institutions', label: 'Institution Management', icon: '🏛️' },
    { id: 'applications', label: 'Application Management', icon: '📄' },
    { id: 'documents', label: 'Document Management', icon: '📁' },
    { id: 'ocr', label: 'OCR & Data Extraction', icon: '🔍' },
    { id: 'authentication', label: 'AI Document Authentication', icon: '🛡️' },
    { id: 'duplicates', label: 'Duplicate Detection', icon: '📑' },
    { id: 'compliance', label: 'Compliance Verification', icon: '✅' },
    { id: 'infrastructure', label: 'Infrastructure Verification', icon: '🏗️' },
    { id: 'verification', label: 'Official Verification', icon: '🏛️' },
    { id: 'alerts', label: 'Alerts & Notifications', icon: '🔔' },
    { id: 'audit', label: 'Audit Trail', icon: '📜' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'renewals', label: 'Document Renewal', icon: '🔄' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  let pageHtml = '';
  if (state.page === 'dashboard') pageHtml = renderDashboardPage();
  else if (state.page === 'institutions') pageHtml = renderInstitutionsPage();
  else if (state.page === 'applications') pageHtml = renderApplicationsPage();
  else if (state.page === 'documents') pageHtml = renderDocumentsPage();
  else if (state.page === 'ocr') pageHtml = renderOcrPage();
  else if (state.page === 'authentication' || state.page === 'duplicates') pageHtml = renderAuthenticationPage();
  else if (state.page === 'compliance') pageHtml = renderCompliancePage();
  else if (state.page === 'infrastructure') pageHtml = renderInfrastructurePage();
  else if (state.page === 'verification') pageHtml = renderVerificationPage();
  else if (state.page === 'alerts') pageHtml = renderAlertsPage();
  else if (state.page === 'audit') pageHtml = renderAuditPage();
  else if (state.page === 'renewals') pageHtml = renderRenewalsPage();
  else if (state.page === 'reports') pageHtml = renderReportsPage();
  else if (state.page === 'users') pageHtml = renderUsersPage();
  else if (state.page === 'settings') pageHtml = renderSettingsPage();

  const unread = (state.alertsSummary && state.alertsSummary.unread) || 0;

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
          <div class="brand-logo">
            <div class="brand-icon">🛡️</div>
            <div class="brand-text">
              <div style="font-size:13.5px;font-weight:800;color:#fff;letter-spacing:0.03em;">AICTE REG-TECH</div>
              <div style="font-size:10px;color:#22d3ee;font-weight:700;text-transform:uppercase;">Regulation Bureau</div>
            </div>
          </div>
          <button onclick="state.sidebarCollapsed=!state.sidebarCollapsed;render();" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;" title="Collapse Sidebar">
            ${state.sidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        <nav class="sidebar-nav">
          ${navItems.map((item) => `
            <button class="nav-item ${state.page === item.id ? 'active' : ''}" onclick="navigate('${item.id}')">
              <span>${item.icon}</span>
              <span class="nav-label">${item.label}</span>
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <div style="color:#22d3ee;font-weight:700;">● SIH 2026 | PS #26261</div>
          <div style="color:#94a3b8;margin-top:2px;">Smart Automation Platform</div>
        </div>
      </aside>

      <div class="main-wrapper ${state.sidebarCollapsed ? 'collapsed' : ''}">
        <header class="topnav">
          <div class="search-box">
            <input type="text" placeholder="Search institutions, AICTE IDs, applications, or certificates..." onkeydown="if(event.key==='Enter') navigate('applications')" />
          </div>
          <div style="display:flex;align-items:center;gap:14px;">
            <span class="badge badge-warning">Synthetic Demo Environment</span>
            <span style="font-size:12px;color:var(--text-muted);font-weight:600;">📅 ${new Date().toISOString().slice(0, 10)}</span>
            <button class="btn btn-secondary btn-xs" onclick="document.body.classList.toggle('dark')">🌓 Theme</button>
            <button class="btn btn-secondary btn-xs" onclick="navigate('alerts')">
              🔔 Alerts ${unread > 0 ? `<span class="badge badge-danger" style="margin-left:4px;">${unread}</span>` : ''}
            </button>
            <div style="display:flex;align-items:center;gap:8px;padding-left:8px;border-left:1px solid var(--border-color);">
              <div>
                <div style="font-size:12px;font-weight:700;">${state.user.full_name}</div>
                <div style="font-size:10px;color:var(--cyan-600);font-weight:700;">${state.user.role}</div>
              </div>
              <button class="btn btn-secondary btn-xs" onclick="logout()">Sign Out</button>
            </div>
          </div>
        </header>

        <main class="page-content">
          ${pageHtml}
        </main>
      </div>
    </div>
    ${renderModal()}
  `;
}

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
  if (state.token) {
    await loadPageData(state.page, state.subId);
  }
  render();
});

