let data = [];
let activeFilter = 'all';
let activeRisks = new Set(['high', 'medium', 'low']);

/* ─── Risk badge meta ─── */
const riskMeta = {
  high: { cls: 'high', label: 'HIGH RISK', color: '#f87171' },
  medium: { cls: 'medium', label: 'MEDIUM RISK', color: '#fbbf24' },
  low: { cls: 'low', label: 'LOW RISK', color: '#34d399' }
};

/* ─── Render circular risk chart (conic-gradient) ─── */
function renderRiskChart(counts) {
  const chart = document.getElementById('risk-chart');
  const legend = document.getElementById('risk-legend');
  const total = counts.high + counts.medium + counts.low;

  if (total === 0) {
    chart.style.background = 'var(--border-color)';
    legend.innerHTML = '';
    return;
  }

  const hp = (counts.high / total) * 100;
  const mp = (counts.medium / total) * 100;
  const lp = (counts.low / total) * 100;

  // conic-gradient segments
  chart.style.background = `conic-gradient(
    #f87171 0% ${hp}%,
    #fbbf24 ${hp}% ${hp + mp}%,
    #34d399 ${hp + mp}% 100%
  )`;

  // Legend
  legend.innerHTML = `
    <div class="legend-item"><span class="legend-dot" style="background:#f87171"></span> High (${counts.high})</div>
    <div class="legend-item"><span class="legend-dot" style="background:#fbbf24"></span> Med (${counts.medium})</div>
    <div class="legend-item"><span class="legend-dot" style="background:#34d399"></span> Low (${counts.low})</div>
  `;
}

/* ─── Generate dynamic summary text ─── */
function generateSummary(counts, readabilityGrade, privacyRiskPct) {
  const textEl = document.getElementById('summary-text');
  const recSection = document.getElementById('recommendation-section');
  const risksSection = document.getElementById('detailed-risks-section');
  const risksList = document.getElementById('detailed-risks-list');
  const recCard = document.querySelector('.rec-card');
  const recIcon = document.getElementById('rec-icon');
  const recTitle = document.getElementById('rec-title');
  const recDesc = document.getElementById('rec-desc');

  let riskLevel = privacyRiskPct > 60 ? 'high-risk' : (privacyRiskPct > 30 ? 'moderate risk' : 'low-risk');
  let overview = `This policy is <strong>${readabilityGrade.toLowerCase()}</strong> to read and holds a <strong>${riskLevel}</strong> profile. `;

  let findings = '';
  if (counts.high > 0) {
    findings += `It contains <strong>${counts.high} high-risk</strong> clauses, which is a significant concern for your privacy. `;
  } else if (counts.medium > 0) {
    findings += `It features ${counts.medium} medium-risk clauses that warrant careful review. `;
  } else {
    findings += `It contains mostly low-risk or standard practices. `;
  }

  if (data.some(c => c.type === 'Data Sharing' && c.risk === 'high')) {
    findings += `Key issues include aggressive <strong>Data Sharing</strong> practices. `;
  }

  textEl.innerHTML = overview + findings;

  // ─── Recommendation Logic ───
  recSection.classList.remove('hidden');
  if (privacyRiskPct > 45 || counts.high > 5) {
    recCard.className = 'rec-card reject';
    recIcon.textContent = '⚠️';
    recTitle.textContent = "Shouldn't Accept Policy";
    recDesc.textContent = "This policy has a high risk profile or contains multiple concerning clauses regarding your personal data.";
  } else {
    recCard.className = 'rec-card accept';
    recIcon.textContent = '✅';
    recTitle.textContent = "Recommended to Accept";
    recDesc.textContent = "This policy follows relatively standard privacy practices with manageable risk levels.";
  }

  // ─── Detailed Risks Logic ───
  const detailedRisks = [];
  data.forEach(c => {
    if (c.detectedData && (c.risk === 'high' || c.risk === 'medium')) {
      c.detectedData.forEach(item => {
        if (!detailedRisks.find(r => r.name === item)) {
          detailedRisks.push({ name: item, type: c.type });
        }
      });
    }
  });

  if (detailedRisks.length > 0) {
    risksSection.classList.remove('hidden');
    risksList.innerHTML = detailedRisks.map(risk => `
      <div class="risk-item">
        <div class="risk-bullet"></div>
        <div class="risk-text">
          <span>Your <strong>${risk.name.toLowerCase()}</strong> would be shared or collected</span>
          <div class="risk-context">Detected in ${risk.type}</div>
        </div>
      </div>
    `).join('');
  } else {
    risksSection.classList.add('hidden');
  }
}

/* ─── Render clauses or summary ─── */
function render(filter) {
  if (filter !== undefined) activeFilter = filter;

  const cardsBox = document.getElementById('cards');
  const summaryView = document.getElementById('summary-view');

  // Handle Visibility
  if (activeFilter === 'summary') {
    cardsBox.classList.add('hidden');
    summaryView.classList.remove('hidden');
    cardsBox.innerHTML = '';
  } else {
    cardsBox.classList.remove('hidden');
    summaryView.classList.add('hidden');
    cardsBox.innerHTML = '';
  }

  // Sync active tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === activeFilter);

    const tabMatchCount = data.filter(c => {
      const tabMatch =
        btn.id === 'all' ||
        (btn.id === 'share' && c.type === 'Data Sharing');
      const riskMatch = activeRisks.has(c.risk);
      return tabMatch && riskMatch;
    }).length;

    let icon = '', label = '';
    if (btn.id === 'all') { icon = '✦'; label = 'All'; }
    if (btn.id === 'summary') { icon = '📊'; label = 'Summary'; }
    if (btn.id === 'share') { icon = '⇄'; label = 'Sharing'; }

    const badge = btn.id === 'summary' ? '' : `<span class="tab-badge">${tabMatchCount}</span>`;
    btn.innerHTML = `<span class="tab-icon">${icon}</span> ${label} ${badge}`;
  });

  if (activeFilter === 'summary') return;

  const filtered = data.filter(c => {
    const tabMatch =
      activeFilter === 'all' ||
      (activeFilter === 'share' && c.type === 'Data Sharing');
    const riskMatch = activeRisks.has(c.risk);
    return tabMatch && riskMatch;
  });

  if (filtered.length === 0) {
    cardsBox.innerHTML = `<div class="empty-state">✅ No matching clauses found.</div>`;
    return;
  }

  filtered.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'card';
    d.style.animationDelay = `${i * 45}ms`;

    const m = riskMeta[c.risk] || riskMeta.medium;
    const confColor = c.confidence >= 66 ? '#f87171' : c.confidence >= 33 ? '#fbbf24' : '#94a3b8';

    // Preview logic
    const preview = c.text.length > 120 ? c.text.substring(0, 120) + '...' : c.text;
    const hasMore = c.text.length > 120;

    d.innerHTML = `
      <div class="card-header">
        <span class="${m.cls}">${m.label}</span>
        <span class="card-type">${c.type}</span>
      </div>
      <div class="clause-preview">${preview}</div>
      ${hasMore ? `<div class="clause-full">${c.text}</div><button class="toggle-btn">View More</button>` : ''}
      <div class="exp">${c.simple}</div>
      <div class="card-meta">
        <span class="confidence-badge" style="color:${confColor};">⬡ ${c.confidence}% match</span>
        <span class="clause-score-chip">Score: ${c.clauseScore}</span>
      </div>
    `;

    cardsBox.appendChild(d);

    // Expand/Collapse logic (Vanilla JS)
    const toggleBtn = d.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const full = d.querySelector('.clause-full');
        const prev = d.querySelector('.clause-preview');
        const isHidden = window.getComputedStyle(full).display === 'none';

        if (isHidden) {
          full.style.display = 'block';
          prev.style.display = 'none';
          toggleBtn.textContent = 'View Less';
        } else {
          full.style.display = 'none';
          prev.style.display = 'block';
          toggleBtn.textContent = 'View More';
        }
      });
    }
  });
}

/* ─── Shared Logic ─── */
const filterBtn = document.getElementById('filter-btn');
const filterDropdown = document.getElementById('filter-dropdown');

filterBtn.onclick = (e) => {
  e.stopPropagation();
  filterDropdown.classList.toggle('hidden');
  filterBtn.classList.toggle('active');
};

document.addEventListener('click', () => {
  filterDropdown.classList.add('hidden');
  filterBtn.classList.remove('active');
});

['high', 'medium', 'low'].forEach(risk => {
  document.getElementById(`chk-${risk}`).addEventListener('change', function () {
    if (this.checked) activeRisks.add(risk);
    else activeRisks.delete(risk);
    render();
  });
});

function updateGauge(s) {
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = s;
  scoreEl.className = 'score ' + (s >= 70 ? 'good' : s >= 50 ? 'moderate' : 'high-risk');

  const offset = 251 - (s / 100) * 251;
  const arc = document.getElementById('arc');
  const arcGlow = document.getElementById('arc-glow');
  arc.style.strokeDashoffset = offset;
  arc.setAttribute('opacity', '1');
  arcGlow.style.strokeDashoffset = offset;
  arcGlow.setAttribute('opacity', '0.2');
  arcGlow.style.stroke = s >= 70 ? '#34d399' : s >= 50 ? '#fbbf24' : '#f87171';
}

function updateRiskPanel(privacyRiskPct, riskCategory) {
  const panel = document.getElementById('risk-panel');
  const pctEl = document.getElementById('risk-pct');
  const catEl = document.getElementById('risk-category');
  const barFill = document.getElementById('risk-bar-fill');

  pctEl.textContent = privacyRiskPct;
  catEl.textContent = riskCategory;

  let color = privacyRiskPct <= 30 ? '#34d399' : (privacyRiskPct <= 60 ? '#fbbf24' : '#f87171');
  let glowColor = color + '66';

  pctEl.style.color = color;
  catEl.style.color = color;
  catEl.style.background = color + '22';
  barFill.style.background = `linear-gradient(90deg, ${color}88, ${color})`;
  barFill.style.width = `${privacyRiskPct}%`;

  panel.classList.remove('hidden');
}

/* ─── Analyze ─── */
document.getElementById('analyze').onclick = async () => {
  const btn = document.getElementById('analyze');
  btn.classList.add('loading');
  btn.innerHTML = '⏳ Analyzing…';

  // 1. Clear stale data FIRST to avoid reading old results
  // But preserve theme preference
  const stored = await chrome.storage.local.get('theme');
  await chrome.storage.local.clear();
  if (stored.theme) {
    await chrome.storage.local.set({ theme: stored.theme });
  }

  // 2. Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 3. Try sending message; if content script isn't injected, inject it
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
  } catch (e) {
    // Content script not yet injected on this tab — inject and run
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Wait a moment for script to load, then send message
      await new Promise(r => setTimeout(r, 200));
      await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
    } catch (err) {
      document.getElementById('gradeLabel').textContent = 'Cannot analyze this page';
      btn.classList.remove('loading');
      btn.innerHTML = '🔍 Analyze Policy';
      return;
    }
  }

  // 4. Poll for fresh results (max 5s, check every 300ms)
  let attempts = 0;
  const maxAttempts = 17; // ~5 seconds
  const poll = setInterval(() => {
    attempts++;
    chrome.storage.local.get(null, d => {
      // Check if we have fresh data (score exists) or error
      if (d.score !== undefined || d.error || attempts >= maxAttempts) {
        clearInterval(poll);

        data = d.clauses || [];
        if (d.error || !d.score) {
          document.getElementById('gradeLabel').textContent = 'No policy found';
          btn.classList.remove('loading');
          btn.innerHTML = '🔍 Analyze Policy';
          return;
        }

        const counts = {
          high: data.filter(c => c.risk === 'high').length,
          medium: data.filter(c => c.risk === 'medium').length,
          low: data.filter(c => c.risk === 'low').length
        };

        updateGauge(d.score);
        updateRiskPanel(d.privacyRiskPct, d.riskCategory);
        renderRiskChart(counts);
        generateSummary(counts, d.grade, d.privacyRiskPct);

        document.getElementById('gradeLabel').textContent = d.grade;
        btn.classList.remove('loading');
        btn.innerHTML = '🔍 Analyze Policy';

        render('summary'); // Default to summary view after analysis
      }
    });
  }, 300);
};

/* ─── Tabs ─── */
document.getElementById('all').onclick = () => render('all');
document.getElementById('summary').onclick = () => render('summary');
document.getElementById('share').onclick = () => render('share');

/* ─── Themes ─── */
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');

  chrome.storage.local.get('theme', (result) => {
    if (result.theme === 'light') {
      document.body.classList.add('light-theme');
      if (sunIcon) sunIcon.classList.remove('hidden');
      if (moonIcon) moonIcon.classList.add('hidden');
    }
  });

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });

      if (sunIcon) sunIcon.classList.toggle('hidden', !isLight);
      if (moonIcon) moonIcon.classList.toggle('hidden', isLight);
    });
  }
}

document.addEventListener('DOMContentLoaded', initTheme);
