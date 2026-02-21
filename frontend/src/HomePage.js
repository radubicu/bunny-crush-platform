import React, { useState, useEffect } from 'react';
import { listCharacters, getPackages, createCheckout, getTransactions, deleteCharacter } from './api';
import './HomePage.css';

const LEVELS = [
  { num: 1, name: 'Starter',  color: '#8b8b9e', min: 0,    max: 500  },
  { num: 2, name: 'Regular',  color: '#4ade80', min: 500,  max: 1500 },
  { num: 3, name: 'Premium',  color: '#60a5fa', min: 1500, max: 3000 },
  { num: 4, name: 'Elite',    color: '#a78bfa', min: 3000, max: 5000 },
  { num: 5, name: 'VIP',      color: '#ff6bbd', min: 5000, max: null },
];

const PACKAGES = [
  { id: 'starter',  name: 'Starter',  credits: 100,  bonus: 0,    price: '€9.99' },
  { id: 'basic',    name: 'Basic',    credits: 250,  bonus: 10,   price: '€19.99' },
  { id: 'popular',  name: 'Popular',  credits: 600,  bonus: 60,   price: '€39.99', badge: 'Most popular' },
  { id: 'pro',      name: 'Pro',      credits: 1500, bonus: 300,  price: '€89.99' },
  { id: 'vip',      name: 'VIP',      credits: 4000, bonus: 1200, price: '€199.99', badge: 'Best value' },
];

function getCurrentLevel(spent) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (spent >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}


function AvatarHP({ url, name }) {
  const [err, setErr] = React.useState(false);
  const initial = name ? name[0].toUpperCase() : '?';
  if (url && !err) {
    return <img src={url} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={() => setErr(true)} />;
  }
  return <div className="hp-char-placeholder">{initial}</div>;
}

export default function HomePage({ user, onStartChat, onNewCharacter, onLogout, onCreditsUpdate }) {
  const [tab, setTab] = useState('companions');
  const [characters, setCharacters] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingCheckout, setLoadingCheckout] = useState(null);
  const [charsLoaded, setCharsLoaded] = useState(false);

  const level = getCurrentLevel(user.total_spent || 0);
  const nextLevel = LEVELS.find(l => l.num === level.num + 1);
  const progress = level.max
    ? Math.min(100, ((user.total_spent - level.min) / (level.max - level.min)) * 100)
    : 100;

  useEffect(() => {
    listCharacters()
      .then(r => { setCharacters(r.data); setCharsLoaded(true); })
      .catch(() => setCharsLoaded(true));
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      getTransactions().then(r => setTransactions(r.data)).catch(() => {});
    }
  }, [tab]);

  const handleBuy = async (pkgId) => {
    setLoadingCheckout(pkgId);
    try {
      const origin = window.location.origin;
      const res = await createCheckout(pkgId, `${origin}/?payment=success`, `${origin}/?payment=cancelled`);
      window.location.href = res.data.checkout_url;
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not start checkout. Make sure Stripe is configured.');
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteCharacter(id);
      setCharacters(prev => prev.filter(c => c.id !== id));
    } catch {
      alert('Failed to delete.');
    }
  };

  const tabs = [
    { id: 'companions', label: 'My Girls' },
    { id: 'credits',    label: 'Credits' },
    { id: 'account',    label: 'Account' },
    { id: 'history',    label: 'History' },
  ];

  return (
    <div className="hp-wrap">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="hp-sidebar">
        <div className="hp-user-card">
          <div className="hp-avatar">
            {(user.username || user.email)[0].toUpperCase()}
          </div>
          <div className="hp-user-info">
            <div className="hp-username">{user.username || user.email.split('@')[0]}</div>
            <div className="hp-email">{user.email}</div>
          </div>
        </div>

        <div className="hp-credits-card">
          <div className="hpc-label">Credits</div>
          <div className="hpc-value">{user.credits}</div>
          <div className="hpc-hint">Chat 1 cr · Photo 7 cr · NSFW 15 cr</div>
          <button className="btn-primary btn-sm" style={{ width: '100%', marginTop: '12px' }} onClick={() => setTab('credits')}>
            Buy credits
          </button>
        </div>

        <div className="hp-level-card" style={{ borderColor: level.color + '50' }}>
          <div className="hp-level-badge" style={{ color: level.color }}>
            Level {level.num} — {level.name}
          </div>
          <div className="hp-level-bar">
            <div className="hp-level-fill" style={{ width: `${progress}%`, background: level.color }} />
          </div>
          {nextLevel && (
            <div className="hp-level-next">
              {user.total_spent || 0} / {nextLevel.min} cr → <span style={{ color: nextLevel.color }}>{nextLevel.name}</span>
            </div>
          )}
          {!nextLevel && <div className="hp-level-next" style={{ color: level.color }}>Max level reached</div>}
        </div>

        <nav className="hp-nav">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`hp-nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <button className="hp-logout" onClick={onLogout}>Sign out</button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="hp-main">

        {/* ── COMPANIONS ── */}
        {tab === 'companions' && (
          <div className="hp-section">
            <div className="hp-section-header">
              <h2 className="hp-section-title">My Girls</h2>
              <button className="btn-primary btn-sm" onClick={onNewCharacter}>+ New</button>
            </div>

            {!charsLoaded && (
              <div className="hp-loading">
                <div className="loading-dots"><span /><span /><span /></div>
              </div>
            )}

            {charsLoaded && characters.length === 0 && (
              <div className="hp-empty">
                <div className="hp-empty-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <p>No companions yet</p>
                <button className="btn-primary" onClick={onNewCharacter}>Create your first perfect girl</button>
              </div>
            )}

            {characters.length > 0 && (
              <div className="hp-chars-grid">
                {characters.map(char => (
                  <div key={char.id} className="hp-char-card">
                    <div className="hp-char-avatar">
                      <AvatarHP url={char.avatar_url} name={char.name} />
                    </div>
                    <div className="hp-char-info">
                      <div className="hp-char-name">{char.name}</div>
                      <div className="hp-char-meta">{char.age} years old</div>
                      <div className="hp-char-meta">{char.total_images_generated} photos generated</div>
                    </div>
                    <div className="hp-char-actions">
                      <button className="btn-primary btn-sm" onClick={() => onStartChat(char)}>
                        Chat
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(char.id, char.name)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                <button className="hp-char-add" onClick={onNewCharacter}>
                  <span>+</span>
                  <span>New companion</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CREDITS ── */}
        {tab === 'credits' && (
          <div className="hp-section">
            <div className="hp-section-header">
              <h2 className="hp-section-title">Buy Credits</h2>
            </div>

            <div className="hp-credits-current">
              <div className="hp-credits-num">{user.credits}</div>
              <div className="hp-credits-sub">credits available</div>
            </div>

            <div className="hp-packages">
              {PACKAGES.map(pkg => (
                <div key={pkg.id} className={`hp-pkg ${pkg.badge ? 'featured' : ''}`}>
                  {pkg.badge && <div className="hp-pkg-badge">{pkg.badge}</div>}
                  <div className="hp-pkg-name">{pkg.name}</div>
                  <div className="hp-pkg-credits">{pkg.credits + pkg.bonus}</div>
                  <div className="hp-pkg-label">
                    credits
                    {pkg.bonus > 0 && <span className="hp-pkg-bonus">+{pkg.bonus} bonus</span>}
                  </div>
                  <div className="hp-pkg-price">{pkg.price}</div>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '16px', borderRadius: '10px' }}
                    onClick={() => handleBuy(pkg.id)}
                    disabled={loadingCheckout === pkg.id}
                  >
                    {loadingCheckout === pkg.id ? 'Redirecting...' : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACCOUNT ── */}
        {tab === 'account' && (
          <div className="hp-section">
            <div className="hp-section-header">
              <h2 className="hp-section-title">Account</h2>
            </div>

            <div className="hp-account-grid">
              <div className="hp-info-card">
                <div className="hp-info-label">Email</div>
                <div className="hp-info-value">{user.email}</div>
              </div>
              <div className="hp-info-card">
                <div className="hp-info-label">Username</div>
                <div className="hp-info-value">{user.username || '—'}</div>
              </div>
              <div className="hp-info-card">
                <div className="hp-info-label">Credits</div>
                <div className="hp-info-value" style={{ color: 'var(--primary)' }}>{user.credits}</div>
              </div>
              <div className="hp-info-card">
                <div className="hp-info-label">Credits spent</div>
                <div className="hp-info-value">{user.total_spent || 0}</div>
              </div>
              <div className="hp-info-card">
                <div className="hp-info-label">Level</div>
                <div className="hp-info-value" style={{ color: level.color }}>{level.name}</div>
              </div>
              <div className="hp-info-card">
                <div className="hp-info-label">Companions</div>
                <div className="hp-info-value">{characters.length}</div>
              </div>
            </div>

            {/* All levels display */}
            <div className="hp-all-levels">
              {LEVELS.map(l => (
                <div key={l.num} className={`hp-level-row ${level.num >= l.num ? 'reached' : ''}`}>
                  <div className="hp-level-dot" style={{ background: level.num >= l.num ? l.color : 'var(--border)' }} />
                  <div className="hp-level-row-info">
                    <span className="hp-level-row-name" style={{ color: level.num >= l.num ? l.color : 'var(--text-muted)' }}>
                      Level {l.num} — {l.name}
                    </span>
                    <span className="hp-level-row-range">
                      {l.max ? `${l.min}–${l.max} credits spent` : `${l.min}+ credits spent`}
                    </span>
                  </div>
                  {level.num === l.num && (
                    <span className="hp-level-current-badge">Current</span>
                  )}
                </div>
              ))}
            </div>

            <button className="btn-danger" style={{ marginTop: '24px' }} onClick={onLogout}>
              Sign out
            </button>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          <div className="hp-section">
            <div className="hp-section-header">
              <h2 className="hp-section-title">Transaction History</h2>
            </div>

            {transactions.length === 0 ? (
              <div className="hp-empty"><p>No transactions yet</p></div>
            ) : (
              <div className="hp-tx-list">
                {transactions.map(tx => (
                  <div key={tx.id} className="hp-tx-row">
                    <div className={`hp-tx-dot ${tx.amount > 0 ? 'pos' : 'neg'}`} />
                    <div className="hp-tx-info">
                      <div className="hp-tx-desc">{tx.description}</div>
                      <div className="hp-tx-date">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className={`hp-tx-amount ${tx.amount > 0 ? 'pos' : 'neg'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} cr
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}