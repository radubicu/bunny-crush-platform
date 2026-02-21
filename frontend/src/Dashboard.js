import React, { useState, useEffect } from 'react';
import { getMe, listCharacters, getPackages, createCheckout, getTransactions, deleteCharacter } from './api';
import './Dashboard.css';

// Level thresholds (in USD / euro spent via credits)
// 1 credit ≈ €0.01 roughly, but levels use total_spent (credits count)
// Backend: total_spent is in CREDITS spent. We display levels in €.
// Level 1: 0-500 credits spent  (~€0-50)
// Level 2: 500-1500             (~€50-150)
// Level 3: 1500-3000            (~€150-300)
// Level 4: 3000-5000            (~€300-500)
// Level 5: 5000+                (~€500+)
const LEVELS = [
  { num: 1, name: 'Starter',   color: '#8b8b9e', min: 0,    max: 500,  desc: '€0 – €50' },
  { num: 2, name: 'Regular',   color: '#4ade80', min: 500,  max: 1500, desc: '€50 – €150' },
  { num: 3, name: 'Premium',   color: '#60a5fa', min: 1500, max: 3000, desc: '€150 – €300' },
  { num: 4, name: 'Elite',     color: '#a78bfa', min: 3000, max: 5000, desc: '€300 – €500' },
  { num: 5, name: 'VIP',       color: '#ff6bbd', min: 5000, max: null, desc: '€500+' },
];

const PACKAGES = [
  { id: 'starter',    name: 'Starter',    credits: 100,  bonus: 0,    price: '€9.99' },
  { id: 'basic',      name: 'Basic',      credits: 250,  bonus: 10,   price: '€19.99' },
  { id: 'popular',    name: 'Popular',    credits: 600,  bonus: 60,   price: '€39.99',  badge: 'Most popular' },
  { id: 'pro',        name: 'Pro',        credits: 1500, bonus: 300,  price: '€89.99' },
  { id: 'vip',        name: 'VIP',        credits: 4000, bonus: 1200, price: '€199.99', badge: 'Best value' },
];

function getCurrentLevel(totalSpent) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalSpent >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(totalSpent) {
  const lvl = getCurrentLevel(totalSpent);
  return LEVELS.find(l => l.num === lvl.num + 1) || null;
}

function getLevelProgress(totalSpent) {
  const cur = getCurrentLevel(totalSpent);
  if (!cur.max) return 100;
  return Math.min(100, ((totalSpent - cur.min) / (cur.max - cur.min)) * 100);
}

function Dashboard({ user: initialUser, onClose, onStartChat, onNewCharacter, onCreditsUpdate, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [tab, setTab] = useState('overview');
  const [characters, setCharacters] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingCheckout, setLoadingCheckout] = useState(null);

  useEffect(() => {
    getMe().then(r => { setUser(r.data); onCreditsUpdate(r.data.credits); }).catch(() => {});
    listCharacters().then(r => setCharacters(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'transactions') {
      getTransactions().then(r => setTransactions(r.data)).catch(() => {});
    }
  }, [tab]);

  const handleBuy = async (pkgId) => {
    setLoadingCheckout(pkgId);
    try {
      const origin = window.location.origin;
      const res = await createCheckout(
        pkgId,
        `${origin}/?payment=success`,
        `${origin}/?payment=cancelled`
      );
      window.location.href = res.data.checkout_url;
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not start checkout. Make sure Stripe is configured.');
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleDeleteChar = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteCharacter(id);
      setCharacters(prev => prev.filter(c => c.id !== id));
    } catch {
      alert('Failed to delete character.');
    }
  };

  const currentLevel = getCurrentLevel(user?.total_spent || 0);
  const nextLevel = getNextLevel(user?.total_spent || 0);
  const progress = getLevelProgress(user?.total_spent || 0);

  const tabs = [
    { id: 'overview',      label: 'Overview' },
    { id: 'companions',    label: 'Companions' },
    { id: 'credits',       label: 'Credits' },
    { id: 'transactions',  label: 'History' },
  ];

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <button className="modal-close" onClick={onClose}>&#x2715;</button>
        <h2 className="modal-title" style={{ textAlign: 'left', marginBottom: '0', fontSize: '1.6rem' }}>
          Account
        </h2>
        <p className="dash-email">{user?.username || user?.email}</p>

        {/* Tabs */}
        <div className="dash-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`dash-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="dash-section">
            {/* Stats row */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">Credits</div>
                <div className="stat-value" style={{ color: 'var(--primary)' }}>{user?.credits ?? '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Level</div>
                <div className="stat-value" style={{ color: currentLevel.color }}>{currentLevel.name}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Companions</div>
                <div className="stat-value">{characters.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Credits spent</div>
                <div className="stat-value">{user?.total_spent ?? 0}</div>
              </div>
            </div>

            {/* Level card */}
            <div className="level-card" style={{ borderColor: currentLevel.color + '60' }}>
              <div className="level-header">
                <div>
                  <div className="level-badge" style={{ background: currentLevel.color + '25', color: currentLevel.color, borderColor: currentLevel.color + '50' }}>
                    Level {currentLevel.num} — {currentLevel.name}
                  </div>
                  <div className="level-range">{currentLevel.desc}</div>
                </div>
                {nextLevel && (
                  <div className="level-next">
                    <span>Next: </span>
                    <span style={{ color: nextLevel.color }}>{nextLevel.name}</span>
                  </div>
                )}
              </div>

              <div className="level-bar-wrap">
                <div className="level-bar">
                  <div
                    className="level-bar-fill"
                    style={{ width: `${progress}%`, background: currentLevel.color }}
                  />
                </div>
                {nextLevel && (
                  <div className="level-bar-labels">
                    <span>{user?.total_spent || 0} cr spent</span>
                    <span>{nextLevel.min} cr needed</span>
                  </div>
                )}
                {!nextLevel && (
                  <div className="level-max-msg" style={{ color: currentLevel.color }}>
                    Maximum level reached
                  </div>
                )}
              </div>

              <div className="all-levels">
                {LEVELS.map(l => (
                  <div key={l.num} className={`level-pip ${currentLevel.num >= l.num ? 'reached' : ''}`} style={{ '--lcolor': l.color }}>
                    <div className="pip-dot" style={{ background: currentLevel.num >= l.num ? l.color : 'var(--border)' }} />
                    <span>{l.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-actions-row">
              <button className="btn-primary" onClick={() => setTab('credits')}>Buy credits</button>
              <button className="btn-ghost" onClick={onNewCharacter}>New companion</button>
              <button className="btn-danger" onClick={onLogout}>Sign out</button>
            </div>
          </div>
        )}

        {/* ── COMPANIONS ───────────────────────────────── */}
        {tab === 'companions' && (
          <div className="dash-section">
            {characters.length === 0 ? (
              <div className="dash-empty">
                <p>No companions yet</p>
                <button className="btn-primary" onClick={onNewCharacter}>Create one</button>
              </div>
            ) : (
              <div className="companions-list">
                {characters.map(char => (
                  <div key={char.id} className="companion-row">
                    <div className="companion-avatar">
                      {char.avatar_url
                        ? <img src={char.avatar_url} alt={char.name} />
                        : <div className="avatar-placeholder">{char.name.charAt(0)}</div>
                      }
                    </div>
                    <div className="companion-info">
                      <div className="companion-name">{char.name}</div>
                      <div className="companion-meta">{char.age} yrs — {char.total_images_generated} photos generated</div>
                    </div>
                    <div className="companion-actions">
                      <button className="btn-primary btn-sm" onClick={() => { onStartChat(char); onClose(); }}>
                        Chat
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDeleteChar(char.id, char.name)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '20px' }}>
              <button className="btn-ghost" onClick={onNewCharacter}>+ New companion</button>
            </div>
          </div>
        )}

        {/* ── CREDITS ──────────────────────────────────── */}
        {tab === 'credits' && (
          <div className="dash-section">
            <div className="credits-current">
              <div className="credits-big">{user?.credits}</div>
              <div className="credits-sub">credits available</div>
              <div className="credits-hint">Chat: 1 cr &nbsp;/&nbsp; Photo: 7 cr &nbsp;/&nbsp; NSFW photo: 15 cr</div>
            </div>

            <div className="packages-grid">
              {PACKAGES.map(pkg => (
                <div key={pkg.id} className={`package-card ${pkg.badge ? 'featured' : ''}`}>
                  {pkg.badge && <div className="package-badge">{pkg.badge}</div>}
                  <div className="package-name">{pkg.name}</div>
                  <div className="package-credits">{pkg.credits + pkg.bonus}</div>
                  <div className="package-credits-label">
                    credits
                    {pkg.bonus > 0 && <span className="package-bonus">+{pkg.bonus} bonus</span>}
                  </div>
                  <div className="package-price">{pkg.price}</div>
                  <button
                    className={`btn-primary ${pkg.badge ? '' : 'btn-ghost-alt'}`}
                    onClick={() => handleBuy(pkg.id)}
                    disabled={loadingCheckout === pkg.id}
                    style={{ width: '100%', marginTop: '14px', borderRadius: '10px' }}
                  >
                    {loadingCheckout === pkg.id ? 'Redirecting...' : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ─────────────────────────────── */}
        {tab === 'transactions' && (
          <div className="dash-section">
            {transactions.length === 0 ? (
              <div className="dash-empty"><p>No transactions yet</p></div>
            ) : (
              <div className="tx-list">
                {transactions.map(tx => (
                  <div key={tx.id} className="tx-row">
                    <div className={`tx-dot ${tx.amount > 0 ? 'positive' : 'negative'}`} />
                    <div className="tx-info">
                      <div className="tx-desc">{tx.description}</div>
                      <div className="tx-date">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} cr
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
