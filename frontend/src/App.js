import React, { useState, useEffect } from 'react';
import './App.css';
import AuthModal from './AuthModal';
import CharacterCreator from './CharacterCreator';
import ChatPage from './ChatPage';
import HomePage from './HomePage';
import { getMe, createCharacter } from './api';
import PaywallScreen from './PaywallScreen';
import CreatingLoader from './CreatingLoader';
const BUNNY_LOGO = '/bunny-ears.png';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing'); // 'landing' | 'home' | 'chat' | 'creator'
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCreatingLoader, setShowCreatingLoader] = useState(false);
  const [pendingCharData, setPendingCharData] = useState(null);     // form data (guest flow)
  const [subscribeError, setSubscribeError] = useState('');
  const [paywallCharName, setPaywallCharName] = useState('');

  // Helper: is the user a paying subscriber?
  const isPremium = user?.is_premium === true;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const joinFlow = params.get('join') === '1';

    // Clean URL immediately
    if (sessionId || joinFlow) {
      window.history.replaceState({}, '', '/');
    }

    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then(async (r) => {
          let userData = r.data;

          // Returning from Stripe payment - create pending character if any
          if (sessionId) {
            const stored = sessionStorage.getItem('pendingCharData');
            if (stored) {
              try {
                const charData = JSON.parse(stored);
                sessionStorage.removeItem('pendingCharData');
                setPendingCharData(null);
                await createCharacter(charData);
              } catch (e) {
                console.error('Failed to create character after payment:', e);
              }
            }
            // Refresh user data to get updated is_premium
            try {
              const fresh = await getMe();
              userData = fresh.data;
            } catch (_) {}
          }

          setUser(userData);
          setView('home');

          // If user is NOT premium, block with paywall immediately
          if (!userData.is_premium) {
            setShowPaywall(true);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
          setView('landing');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      if (joinFlow) {
        setView('creator');
      }
    }
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setShowAuth(false);
    setView('home');

    // Non-premium: show creating loader first to build tension, then paywall
    if (!userData.is_premium) {
      setPaywallCharName(pendingCharData?.name || '');
      setShowCreatingLoader(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('pendingCharData');
    setUser(null);
    setPendingCharData(null);
    setShowPaywall(false);
    setView('landing');
    setActiveCharacter(null);
  };

  // ── Character flow (logged-in user) ────────────────────────────────
  const handleStartChat = (char) => {
    setActiveCharacter(char);
    setView('chat');
  };

  const handleCharacterCreated = (char) => {
    // Character created — if not premium, show paywall
    if (!isPremium) {
      setPaywallCharName(char?.name || '');
      setShowPaywall(true);
      setView('home');
    } else {
      // Premium user — go straight to chat with new character
      setActiveCharacter(char);
      setView('chat');
    }
  };

  // ── Guest character flow ────────────────────────────────────────────
  const handleGuestCharCreated = (charData) => {
    setPendingCharData(charData);
    sessionStorage.setItem('pendingCharData', JSON.stringify(charData));
    setView('landing'); // close creator
    setAuthMode('register');
    setShowAuth(true);
  };

  // ── Credits ─────────────────────────────────────────────────────────
  const handleCreditsUpdate = (credits) => {
    setUser(u => ({ ...u, credits }));
  };

  // ── Stripe ──────────────────────────────────────────────────────────
  const handleSubscribe = async (plan) => {
    setSubscribeError('');
    try {
      const successUrl = window.location.origin;   // backend appends ?session_id=...
      const cancelUrl = window.location.origin;
      const packageId = plan === 'annual' ? 'sub_annual' : 'sub_monthly';
      const { createCheckout } = await import('./api');
      const res = await createCheckout(packageId, successUrl, cancelUrl);
      if (res.data?.checkout_url) window.location.href = res.data.checkout_url;
    } catch (e) {
      console.error('Checkout error:', e);
      const msg = e.response?.data?.detail || 'Payment error. Please try again.';
      setSubscribeError(msg);
    }
  };

  const handlePaywallBack = () => {
    // User declined to pay — log them out completely, back to landing
    setShowPaywall(false);
    setSubscribeError('');
    setPaywallCharName('');
    if (pendingCharData) {
      setPendingCharData(null);
      sessionStorage.removeItem('pendingCharData');
    }
    // Non-premium users CANNOT access the platform — force logout
    localStorage.removeItem('token');
    setUser(null);
    setView('landing');
    setActiveCharacter(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src={BUNNY_LOGO} alt="" style={{ width: '60px', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
          Bunny Crush
        </div>
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="bg-mesh" />

      {/* ── LANDING ── */}
      {view === 'landing' && (
        <>
          <header className="header">
            <button className="logo" onClick={() => setView('landing')}>
              <img src={BUNNY_LOGO} alt="" className="logo-ears" />
              Bunny Crush
            </button>
            <nav className="header-nav">
              <button className="btn-ghost" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>Sign in</button>
              <button className="btn-primary" onClick={() => setView('creator')}>Get started</button>
            </nav>
          </header>
          <LandingPage onGetStarted={() => setView('creator')} onSignIn={() => { setAuthMode('login'); setShowAuth(true); }} />
        </>
      )}

      {/* ── HOME ── */}
      {view === 'home' && user && (
        <>
          <header className="header">
            <button className="logo" onClick={() => setView('home')}>
              <img src={BUNNY_LOGO} alt="" className="logo-ears" />
              Bunny Crush
            </button>
            <nav className="header-nav">
              <div className="credits-badge">{user.credits} credits</div>
              <span className="header-username">{user.username || user.email.split('@')[0]}</span>
              <button className="btn-primary" onClick={() => setView('creator')}>New Girl</button>
            </nav>
          </header>
          <HomePage
            user={user}
            onStartChat={handleStartChat}
            onNewCharacter={() => setView('creator')}
            onLogout={handleLogout}
            onCreditsUpdate={handleCreditsUpdate}
          />
        </>
      )}

      {/* ── CHAT ── */}
      {view === 'chat' && activeCharacter && (
        <>
          <header className="header">
            <button className="logo" onClick={() => setView('home')}>
              <img src={BUNNY_LOGO} alt="" className="logo-ears" />
              Bunny Crush
            </button>
            <nav className="header-nav">
              <div className="credits-badge">{user.credits} credits</div>
              <span className="header-username">{user.username || user.email.split('@')[0]}</span>
              <button className="btn-ghost" onClick={() => setView('home')}>My</button>
            </nav>
          </header>
          <ChatPage
            character={activeCharacter}
            user={user}
            onBack={() => setView('home')}
            onCreditsUpdate={handleCreditsUpdate}
            onShowAuth={() => setShowAuth(true)}
          />
        </>
      )}

      {/* ── CREATOR ── */}
      {view === 'creator' && (
        <>
          <header className="header">
            <button className="logo" onClick={() => {
              if (!user) { setView('landing'); }
              else if (isPremium) { setView('home'); }
              else { setShowPaywall(true); setView('home'); }
            }}>
              <img src={BUNNY_LOGO} alt="" className="logo-ears" />
              Bunny Crush
            </button>
            <nav className="header-nav">
              {user && <div className="credits-badge">{user.credits} credits</div>}
              <button className="btn-ghost" onClick={() => {
                if (!user) { setView('landing'); }
                else if (isPremium) { setView('home'); }
                else { setShowPaywall(true); setView('home'); }
              }}>Back</button>
            </nav>
          </header>
          <CharacterCreator
            guestMode={!user}
            onCreated={user ? handleCharacterCreated : handleGuestCharCreated}
            onClose={() => {
              if (!user) { setView('landing'); }
              else if (isPremium) { setView('home'); }
              else { setShowPaywall(true); setView('home'); }
            }}
          />
        </>
      )}

      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
          defaultMode={authMode}
        />
      )}

      {showCreatingLoader && (
        <CreatingLoader onDone={() => {
          setShowCreatingLoader(false);
          setShowPaywall(true);
        }} />
      )}

      {showPaywall && (
        <PaywallScreen
          characterName={paywallCharName || pendingCharData?.name}
          onSubscribe={handleSubscribe}
          onBack={handlePaywallBack}
          error={subscribeError}
        />
      )}
    </div>
  );
}

function LandingPage({ onGetStarted, onSignIn }) {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-tag">A private companion experience</div>
        <h1 className="hero-title">
          She's been<br />
          <em>waiting</em> for you
        </h1>
        <p className="hero-sub">
          Create your perfect girlfriend. Talk, connect, get closer.
          Completely private, endlessly personal.
        </p>
        <div className="hero-actions">
          <button className="btn-primary btn-lg" onClick={onGetStarted}>Start for free</button>
          <button className="btn-ghost btn-lg" onClick={onSignIn}>Sign in</button>
        </div>
      </section>

      <section className="features">
        {[
          { icon: '01', title: 'Design her look', desc: 'Choose hair, eyes, body type and personal style with our visual creator.' },
          { icon: '02', title: 'Shape her personality', desc: 'From shy to bold, from sweet to kinky. She is exactly who you want her to be.' },
          { icon: '03', title: 'Request photos', desc: 'Ask for photos anytime. From casual to intimate, delivered instantly.' },
        ].map(f => (
          <div key={f.icon} className="feature-card">
            <div className="feature-num">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

export default App;
