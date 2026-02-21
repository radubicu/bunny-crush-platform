import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, getChatHistory, generateImage } from './api';
import './ChatPage.css';

function ChatPage({ character, user, onBack, onCreditsUpdate, onShowAuth }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageNsfw, setImageNsfw] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, [character.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getChatHistory(character.id);
      const msgs = res.data.map(m => ({
        id: m.id,
        role: m.sender === 'user' ? 'user' : 'ai',
        content: m.content,
        image_url: m.image_url,
        is_image: m.is_image,
        timestamp: m.timestamp,
      }));
      setMessages(msgs);
    } catch {
      // empty conversation
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, id: Date.now() }]);
    setLoading(true);

    try {
      const res = await sendMessage(character.id, text);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: res.data.response,
        id: Date.now() + 1,
      }]);
      onCreditsUpdate(res.data.credits);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Something went wrong.';
      setMessages(prev => [...prev, { role: 'ai', content: detail, id: Date.now() + 1, isError: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || generatingImage) return;

    setGeneratingImage(true);
    const cost = imageNsfw ? 15 : 7;

    try {
      const res = await generateImage(character.id, imagePrompt.trim(), imageNsfw);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '',
        is_image: true,
        image_url: res.data.image_url,
        id: Date.now(),
      }]);
      onCreditsUpdate(res.data.credits);
      setShowImageModal(false);
      setImagePrompt('');
      setImageNsfw(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Image generation failed.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <button className="back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        <div className="char-profile">
          <div className="char-profile-avatar">
            {character.avatar_url ? (
              <img src={character.avatar_url} alt={character.name} />
            ) : (
              <div className="avatar-placeholder">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="online-dot" />
          </div>
          <h2 className="char-profile-name">{character.name}</h2>
          <p className="char-profile-age">{character.age} years old</p>
          {character.description && (
            <p className="char-profile-desc">{character.description.slice(0, 80)}{character.description.length > 80 ? '...' : ''}</p>
          )}
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-actions">
          <button
            className="sidebar-action-btn"
            onClick={() => setShowImageModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            Request photo
          </button>
        </div>

        <div className="sidebar-credits">
          <span className="credits-label">Your credits</span>
          <span className="credits-value">{user.credits}</span>
          <span className="credits-costs">
            Chat: 1 cr &nbsp;|&nbsp; Photo: 7 cr &nbsp;|&nbsp; NSFW: 15 cr
          </span>
        </div>
      </aside>

      {/* Main chat */}
      <div className="chat-main">
        {/* Chat header (mobile) */}
        <div className="chat-topbar">
          <button className="back-btn-mobile" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="topbar-char">
            <div className="topbar-avatar">
              {character.avatar_url
                ? <img src={character.avatar_url} alt={character.name} />
                : <div className="avatar-placeholder sm">{character.name.charAt(0)}</div>
              }
            </div>
            <div>
              <div className="topbar-name">{character.name}</div>
              <div className="topbar-status">online</div>
            </div>
          </div>
          <button className="topbar-photo-btn" onClick={() => setShowImageModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {loadingHistory ? (
            <div className="chat-loading">
              <div className="loading-dots"><span /><span /><span /></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-avatar">
                {character.avatar_url
                  ? <img src={character.avatar_url} alt={character.name} />
                  : <div className="avatar-placeholder lg">{character.name.charAt(0)}</div>
                }
              </div>
              <p className="chat-empty-name">Start a conversation with {character.name}</p>
              <p className="chat-empty-hint">Say hi, ask anything, or request a photo</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} charName={character.name} charAvatar={character.avatar_url} formatTime={formatTime} />
            ))
          )}

          {loading && (
            <div className="message-row ai">
              <div className="msg-avatar sm">
                {character.avatar_url
                  ? <img src={character.avatar_url} alt="" />
                  : <div className="avatar-placeholder sm">{character.name.charAt(0)}</div>
                }
              </div>
              <div className="bubble bubble-ai typing-bubble">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-wrap">
          <div className="chat-input-box">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Message ${character.name}...`}
              disabled={loading}
            />
            <button
              className="photo-quick-btn"
              onClick={() => setShowImageModal(true)}
              title="Request photo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </button>
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Image generation modal */}
      {showImageModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowImageModal(false)}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <button className="modal-close" onClick={() => setShowImageModal(false)}>&#x2715;</button>
            <h2 className="modal-title">Request a photo</h2>

            <div className="form-field">
              <label>What should she be doing?</label>
              <input
                type="text"
                placeholder="e.g. relaxing on the beach, in lingerie..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
                autoFocus
              />
            </div>

            <div className="nsfw-toggle">
              <div className="nsfw-info">
                <div className="nsfw-label">{imageNsfw ? 'Explicit (NSFW)' : 'Standard'}</div>
                <div className="nsfw-cost">
                  {imageNsfw ? '15 credits' : '7 credits'}
                </div>
              </div>
              <button
                className={`toggle-btn ${imageNsfw ? 'active' : ''}`}
                onClick={() => setImageNsfw(!imageNsfw)}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="img-cost-note">
              You have <strong style={{ color: 'var(--primary)' }}>{user.credits}</strong> credits.
              This will cost <strong style={{ color: imageNsfw ? 'var(--pink)' : 'var(--primary)' }}>{imageNsfw ? 15 : 7}</strong> credits.
            </div>

            <button
              className="btn-primary"
              onClick={handleGenerateImage}
              disabled={generatingImage || !imagePrompt.trim()}
              style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '12px', marginTop: '16px' }}
            >
              {generatingImage ? 'Generating...' : 'Generate photo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, charName, charAvatar, formatTime }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="msg-avatar">
          {charAvatar
            ? <img src={charAvatar} alt="" />
            : <div className="avatar-placeholder sm">{charName.charAt(0)}</div>
          }
        </div>
      )}

      <div className="bubble-wrap">
        {msg.is_image && msg.image_url ? (
          <div className={`bubble bubble-image ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
            <img
              src={msg.image_url}
              alt="Generated"
              className="chat-image"
              onClick={() => window.open(msg.image_url, '_blank')}
            />
          </div>
        ) : (
          <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-ai'} ${msg.isError ? 'bubble-error' : ''}`}>
            {msg.content}
          </div>
        )}
        {msg.timestamp && (
          <div className={`msg-time ${isUser ? 'right' : 'left'}`}>{formatTime(msg.timestamp)}</div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
