/* ─── Syllable counter ─── */
function countSyllables(word) {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:es|ed|e)$/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

/* ─── Flesch Reading Ease (0–100, higher = easier) ─── */
function flesch(text) {
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
  const words = text.split(/\s+/).filter(Boolean);
  const w = words.length || 1;
  let syllables = 0;
  words.forEach(x => syllables += countSyllables(x));
  const raw = 206.835 - 1.015 * (w / sentences) - 84.6 * (syllables / w);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/* ─── Flesch grade label ─── */
function fleschGrade(score) {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

/* ─── Risk weight map (scale 1–10) ─── */
// High = 9  → severe, direct harm to user privacy
// Medium = 5 → moderate / indirect risk
// Low = 2   → minor, often user-protective clauses
const riskWeights = { high: 9, medium: 5, low: 2 };

/* ─── Keyword rules ─── */
const rules = [
  {
    k: ['share', 'disclosure', 'disclose'],
    type: 'Data Sharing', risk: 'medium',
    esc: { k: ['third-party', 'third parties', 'advertisers', 'marketing', 'partners', 'affiliates'], risk: 'high' },
    simple: 'Your personal data may be shared with external entities.',
    dataTypes: { 'email': 'Email address', 'phone': 'Phone number', 'address': 'Physical address', 'location': 'Location data' }
  },
  {
    k: ['sell', 'sale of', 'sold', 'monetize', 'commercial purpose'],
    type: 'Data Sale', risk: 'high',
    simple: 'Your data may be sold to other companies for commercial or advertising purposes.',
    dataTypes: { 'email': 'Email address', 'phone': 'Phone number', 'contact': 'Contact details', 'identity': 'Identity information' }
  },
  {
    k: ['retain', 'storage', 'store'],
    type: 'Data Retention', risk: 'medium',
    esc: { k: ['indefinite', 'unlimited period', 'forever', 'as long as we want'], risk: 'high' },
    simple: 'Your data could be stored for an extended period of time.'
  },
  {
    k: ['cookies', 'tracking', 'web beacon', 'pixel'],
    type: 'Tracking', risk: 'medium',
    esc: { k: ['fingerprint', 'across websites', 'cross-site', 'behavioral'], risk: 'high' },
    simple: 'Your browsing behavior is tracked using cookies or similar technologies.',
    dataTypes: { 'behavior': 'Browsing behavior', 'interest': 'Personal interests', 'history': 'Search history' }
  },
  {
    k: ['location', 'gps', 'geolocation', 'precise location'],
    type: 'Location Data', risk: 'high',
    simple: 'Your precise or approximate location may be collected and used.',
    dataTypes: { 'gps': 'Precise GPS location', 'ip': 'IP address location', 'movement': 'Real-time movement' }
  },
  {
    k: ['biometric', 'facial recognition', 'fingerprint', 'voice print', 'retina'],
    type: 'Biometric Data', risk: 'high',
    simple: 'Sensitive biometric data (such as face, fingerprint, or voice) may be collected.',
    dataTypes: { 'face': 'Facial recognition data', 'fingerprint': 'Fingerprint data', 'voice': 'Voice patterns' }
  },
  {
    k: ['social', 'facebook', 'twitter', 'google', 'linkedin', 'instagram', 'account linking'],
    type: 'Social Media Data', risk: 'medium',
    simple: 'Data from your linked social media accounts may be accessed.',
    dataTypes: { 'profile': 'Social media profile info', 'friends': 'Social connections', 'posts': 'Social media activity' }
  },
  {
    k: ['contact', 'address book', 'contacts list', 'friends list'],
    type: 'Contact Access', risk: 'high',
    simple: 'Your private contact list or address book may be accessed.',
    dataTypes: { 'contacts': 'Contact list', 'emails': 'Friend emails', 'phonebook': 'Phonebook entries' }
  },
  {
    k: ['financial', 'credit card', 'payment', 'billing', 'bank account', 'transaction'],
    type: 'Financial Data', risk: 'high',
    simple: 'Sensitive financial or payment information may be collected.',
    dataTypes: { 'card': 'Credit card details', 'billing': 'Billing address', 'transaction': 'Purchase history' }
  },
  {
    k: ['children', 'minor', 'under 13', 'coppa', 'parental consent'],
    type: "Children's Data", risk: 'high',
    simple: "This policy references children's data. Parental consent may be required under COPPA."
  },
  {
    k: ['profile', 'profiling', 'infer', 'behavioral', 'interest-based'],
    type: 'User Profiling', risk: 'medium',
    simple: 'Your data may be used to build a profile of your behavior, interests, or preferences.'
  },
  {
    k: ['automated decision', 'algorithm', 'machine learning', 'ai-based', 'automated processing'],
    type: 'Automated Decisions', risk: 'medium',
    simple: 'Automated systems or AI may make decisions about you based on your data.'
  },
  {
    k: ['transfer', 'international', 'cross-border', 'outside your country', 'gdpr', 'standard contractual'],
    type: 'International Transfer', risk: 'medium',
    simple: 'Your data may be transferred to and stored in other countries with different privacy laws.'
  },
  {
    k: ['breach', 'security incident', 'unauthorized access', 'data leak', 'notify you'],
    type: 'Breach Notification', risk: 'medium',
    simple: 'In the event of a data breach, you may (or may not) be notified.'
  },
  {
    k: ['opt-out', 'opt out', 'unsubscribe', 'do not sell', 'withdraw consent'],
    type: 'Opt-Out Rights', risk: 'low',
    simple: 'You may have the right to opt out of certain data uses, like marketing or data sale.'
  },
  {
    k: ['delete', 'erasure', 'right to be forgotten', 'remove your data', 'account deletion'],
    type: 'Right to Delete', risk: 'low',
    simple: 'You may have the right to request deletion of your personal data.'
  },
  {
    k: ['health', 'medical', 'diagnosis', 'prescription', 'mental health'],
    type: 'Health Data', risk: 'high',
    simple: 'Sensitive health or medical information may be collected and processed.',
    dataTypes: { 'medical': 'Medical history', 'health': 'Health indicators', 'fitness': 'Activity/Fitness data' }
  },
  {
    k: ['password', 'encrypt', 'ssl', 'tls', 'secure'],
    type: 'Security Measures', risk: 'low',
    simple: 'The service describes security measures such as encryption to protect your data.'
  }
];

/* ─── Per-paragraph Flesch helper ─── */
function paraFlesch(text) {
  if (!text || text.trim().split(/\s+/).length < 5) return 60; // too short to score
  return flesch(text);
}

/* ─── Count how many keywords from a rule match in a text ─── */
function countKeywordMatches(rule, text) {
  return rule.k.filter(k => text.includes(k)).length;
}

/* ─── Compute clause-level risk score ─── */
function clauseScore(rule, matchCount) {
  const weight = riskWeights[rule.risk] ?? 1;
  return weight * matchCount;
}

/* ─── Privacy risk category label ─── */
function privacyRiskCategory(pct) {
  if (pct <= 30) return 'Low Risk';
  if (pct <= 60) return 'Moderate Risk';
  return 'High Risk';
}

/* ─── Main analysis ─── */
function analyze() {
  // 1. Try to locate the actual policy text container to ignore nav/footers
  const selectors = [
    'main', 'article', '[role="main"]',
    '.policy', '.terms', '.legal', '#content', '.content', '.main-content'
  ];
  let container = document.body;
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && el.innerText.length > 500) {
      container = el;
      break;
    }
  }

  // 2. Extract only meaningful paragraphs and list items from this container
  const rawElements = Array.from(container.querySelectorAll('p, li'));
  const paragraphs = rawElements.filter(el => {
    const t = el.innerText?.trim() || '';
    return t.length > 50 && t.split(/\s+/).length > 8;
  });

  // 3. Rebuild the body text ONLY from these valid paragraphs
  const validText = paragraphs.map(p => p.innerText.trim()).join('\n\n');

  // If no substantial policy text found, emit an error
  if (validText.length < 200) {
    chrome.storage.local.set({ score: null, grade: 'Not Found', clauses: [], error: true });
    return;
  }

  // 4. Calculate readability score purely on the valid policy text
  const globalScore = flesch(validText);
  const grade = fleschGrade(globalScore);

  const clauses = [];
  const seen = new Set(); // Track seen paragraph texts to avoid duplicates

  let totalRiskScore = 0;
  let maxPossibleScore = 0;

  paragraphs.forEach((el, i) => {
    const raw = el.innerText.trim();
    const text = raw.toLowerCase();
    if (seen.has(raw)) return; // avoid duplicate clauses

    let bestRule = null;
    let bestRisk = -1;
    let bestMatchCount = 0;
    const riskOrder = { high: 2, medium: 1, low: 0 };

    rules.forEach(r => {
      const baseMatches = r.k.filter(k => text.includes(k));
      if (baseMatches.length > 0) {
        let currentRisk = r.risk;
        let escMatches = [];

        // Context-Based Risk Escalation
        if (r.esc) {
          escMatches = r.esc.k.filter(k => text.includes(k));
          if (escMatches.length > 0) {
            currentRisk = r.esc.risk;
          }
        }

        const rv = riskOrder[currentRisk] ?? 0;
        if (rv > bestRisk) {
          bestRisk = rv;
          bestRule = { ...r, risk: currentRisk };
          // Combined keyword matches for scoring
          bestMatchCount = baseMatches.length + escMatches.length;
          // Store total possible keywords for confidence calculation
          bestRule.totalKeywords = r.k.length + (r.esc ? r.esc.k.length : 0);
        }
      }
    });

    if (bestRule) {
      seen.add(raw);
      const ps = paraFlesch(raw);
      const weight = riskWeights[bestRule.risk] ?? 1;
      const cScore = weight * bestMatchCount;
      const maxKeywords = bestRule.totalKeywords || bestRule.k.length;
      const confidence = Math.round((bestMatchCount / maxKeywords) * 100);

      // Extract specific data types if defined in the rule
      const detectedData = [];
      if (bestRule.dataTypes) {
        for (const [key, label] of Object.entries(bestRule.dataTypes)) {
          if (text.includes(key)) {
            detectedData.push(label);
          }
        }
      }

      totalRiskScore += cScore;
      maxPossibleScore += weight * maxKeywords;

      clauses.push({
        id: i + 1,
        text: raw.length > 200 ? raw.slice(0, 200) + '…' : raw,
        type: bestRule.type,
        risk: bestRule.risk,
        simple: bestRule.simple,
        difficult: ps < 50,
        paraScore: ps,
        matchCount: bestMatchCount,
        clauseScore: cScore,
        confidence,
        detectedData: detectedData.length > 0 ? detectedData : null
      });
    }
  });

  // 5. Overall Privacy Risk Score (%)
  const rawPrivacyPct = maxPossibleScore > 0
    ? (totalRiskScore / maxPossibleScore) * 100
    : 0;
  const privacyRiskPct = Math.min(100, Math.max(0, Math.round(rawPrivacyPct)));
  const riskCategory = privacyRiskCategory(privacyRiskPct);

  chrome.storage.local.set({
    score: globalScore,
    grade,
    clauses,
    privacyRiskPct,
    riskCategory,
    totalRiskScore,
    maxPossibleScore
  });
}

/* ─── Message listener ─── */
chrome.runtime.onMessage.addListener(m => {
  if (m.action === 'analyze') analyze();
});
