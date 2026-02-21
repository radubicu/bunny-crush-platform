import React, { useState, useEffect } from 'react';
import './App.css';
import AuthModal from './AuthModal';
import CharacterCreator from './CharacterCreator';
import ChatPage from './ChatPage';
import HomePage from './HomePage';
import { getMe } from './api';
import WelcomePopup from './WelcomePopup';
const BUNNY_LOGO = '/bunny-ears.png';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing'); // 'landing' | 'home' | 'chat' | 'creator'
  const [showAuth, setShowAuth] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then(r => {
          setUser(r.data);
          setView('home');
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
          setView('landing');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      // Show welcome popup only once
      const seen = localStorage.getItem('welcomeSeen');
      if (!seen) {
        setTimeout(() => setShowWelcome(true), 1200);
      }
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setShowAuth(false);
    setView('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('landing');
    setActiveCharacter(null);
  };

  const handleStartChat = (char) => {
    setActiveCharacter(char);
    setView('chat');
  };

  const handleCharacterCreated = (char) => {
    setActiveCharacter(char);
    setView('chat');
  };

  const handleCreditsUpdate = (credits) => {
    setUser(u => ({ ...u, credits }));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo"><img src={BUNNY_LOGO} alt="" style={{width:'60px', marginBottom:'12px', display:'block', margin:'0 auto 12px'}} />Bunny Crush</div>
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="bg-mesh" />

      {/* ── LANDING (nelogat) ── */}
      {view === 'landing' && (
        <>
          <header className="header">
            <button className="logo" onClick={() => setView('landing')}>
            <img src={BUNNY_LOGO} alt="" className="logo-ears" />
            Bunny Crush
          </button>
            <nav className="header-nav">
              <button className="btn-ghost" onClick={() => setShowAuth(true)}>Sign in</button>
              <button className="btn-primary" onClick={() => setShowAuth(true)}>Get started</button>
            </nav>
          </header>
          <LandingPage onShowAuth={() => setShowAuth(true)} />
        </>
      )}

      {/* ── HOME (logat) ── */}
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
            <button className="logo" onClick={() => setView('home')}>
            <img src={BUNNY_LOGO} alt="" className="logo-ears" />
            Bunny Crush
          </button>
            <nav className="header-nav">
              <div className="credits-badge">{user.credits} credits</div>
              <button className="btn-ghost" onClick={() => setView('home')}>Back</button>
            </nav>
          </header>
          <CharacterCreator
            onCreated={handleCharacterCreated}
            onClose={() => setView('home')}
          />
        </>
      )}

      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}

      {showWelcome && !user && (
        <WelcomePopup
          onClose={() => {
            localStorage.setItem('welcomeSeen', '1');
            setShowWelcome(false);
          }}
          onSignUp={() => {
            localStorage.setItem('welcomeSeen', '1');
            setShowWelcome(false);
            setShowAuth(true);
          }}
        />
      )}
    </div>
  );
}

function LandingPage({ onShowAuth }) {
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
          <button className="btn-primary btn-lg" onClick={onShowAuth}>Start for free</button>
          <button className="btn-ghost btn-lg" onClick={onShowAuth}>Sign in</button>
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