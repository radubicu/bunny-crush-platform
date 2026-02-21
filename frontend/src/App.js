import React, { useState, useEffect } from 'react';
import './App.css';
import AuthModal from './AuthModal';
import Dashboard from './Dashboard';
import CharacterCreator from './CharacterCreator';
import ChatPage from './ChatPage';
import { getMe } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); // 'home' | 'chat' | 'dashboard' | 'creator'
  const [showAuth, setShowAuth] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setShowAuth(false);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('home');
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">bunny crush</div>
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Background mesh */}
      <div className="bg-mesh" />

      {/* Header */}
      <header className="header">
        <button className="logo" onClick={() => setView('home')}>
          bunny crush
        </button>

        <nav className="header-nav">
          {user ? (
            <>
              <div className="credits-badge">
                {user.credits} credits
              </div>
              <button
                className="btn-ghost"
                onClick={() => setView('dashboard')}
              >
                {user.username || user.email.split('@')[0]}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!user) { setShowAuth(true); return; }
                  setView('creator');
                }}
              >
                New Character
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setShowAuth(true)}>
                Sign in
              </button>
              <button className="btn-primary" onClick={() => setShowAuth(true)}>
                Get started
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Views */}
      {view === 'home' && (
        <HomePage
          user={user}
          onStartChat={handleStartChat}
          onShowAuth={() => setShowAuth(true)}
          onNewCharacter={() => {
            if (!user) { setShowAuth(true); return; }
            setView('creator');
          }}
          onOpenDashboard={() => setView('dashboard')}
          onSelectCharacter={handleStartChat}
        />
      )}

      {view === 'chat' && activeCharacter && (
        <ChatPage
          character={activeCharacter}
          user={user}
          onBack={() => setView('home')}
          onCreditsUpdate={(credits) => setUser(u => ({ ...u, credits }))}
          onShowAuth={() => setShowAuth(true)}
        />
      )}

      {view === 'dashboard' && (
        <Dashboard
          user={user}
          onClose={() => setView('home')}
          onStartChat={handleStartChat}
          onNewCharacter={() => setView('creator')}
          onCreditsUpdate={(credits) => setUser(u => ({ ...u, credits }))}
          onLogout={handleLogout}
        />
      )}

      {view === 'creator' && (
        <CharacterCreator
          onCreated={handleCharacterCreated}
          onClose={() => setView('home')}
        />
      )}

      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}

// ── HOME PAGE ──────────────────────────────────────────────────────────────
function HomePage({ user, onShowAuth, onNewCharacter, onSelectCharacter }) {
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    if (user) {
      import('./api').then(({ listCharacters }) => {
        listCharacters().then(r => setCharacters(r.data)).catch(() => {});
      });
    }
  }, [user]);

  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-tag">AI Companion Platform</div>
        <h1 className="hero-title">
          Your perfect<br />
          <em>companion</em> awaits
        </h1>
        <p className="hero-sub">
          Create your AI girlfriend, build a connection, request photos.
          Completely private, endlessly personal.
        </p>
        <div className="hero-actions">
          {user ? (
            <button className="btn-primary btn-lg" onClick={onNewCharacter}>
              Create your companion
            </button>
          ) : (
            <>
              <button className="btn-primary btn-lg" onClick={onShowAuth}>
                Start for free
              </button>
              <button className="btn-ghost btn-lg" onClick={onShowAuth}>
                Sign in
              </button>
            </>
          )}
        </div>
      </section>

      {/* Characters grid if logged in */}
      {user && characters.length > 0 && (
        <section className="chars-section">
          <div className="section-header">
            <h2 className="section-title">Your companions</h2>
            <button className="btn-ghost btn-sm" onClick={onNewCharacter}>
              Add new
            </button>
          </div>
          <div className="chars-grid">
            {characters.map(char => (
              <CharacterCard
                key={char.id}
                char={char}
                onClick={() => onSelectCharacter(char)}
              />
            ))}
            <button className="char-card char-add" onClick={onNewCharacter}>
              <span className="char-add-icon">+</span>
              <span>New companion</span>
            </button>
          </div>
        </section>
      )}

      {/* Empty state */}
      {user && characters.length === 0 && (
        <section className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h3>No companions yet</h3>
          <p>Create your first AI companion and start chatting</p>
          <button className="btn-primary" onClick={onNewCharacter}>
            Create companion
          </button>
        </section>
      )}

      {/* Features */}
      {!user && (
        <section className="features">
          {[
            { icon: '01', title: 'Design her look', desc: 'Choose hair, eyes, body type and personal style with our visual creator.' },
            { icon: '02', title: 'Shape her personality', desc: 'From shy to bold, from sweet to kinky. She is exactly who you want her to be.' },
            { icon: '03', title: 'Request photos', desc: 'Ask for photos anytime. SFW or explicit, delivered instantly.' },
          ].map(f => (
            <div key={f.icon} className="feature-card">
              <div className="feature-num">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function CharacterCard({ char, onClick }) {
  return (
    <button className="char-card" onClick={onClick}>
      <div className="char-avatar">
        {char.avatar_url ? (
          <img src={char.avatar_url} alt={char.name} />
        ) : (
          <div className="char-avatar-placeholder">
            {char.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="char-info">
        <div className="char-name">{char.name}</div>
        <div className="char-age">{char.age} years old</div>
      </div>
      <div className="char-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </button>
  );
}

export default App;