import React, { useState } from 'react';
import { createCharacter } from './api';
import CreatingLoader from './CreatingLoader';
import './CharacterCreator.css';

const HAIR_OPTIONS = ['long blonde', 'short brunette', 'red curly', 'black straight', 'platinum', 'auburn waves'];
const EYE_OPTIONS = ['blue', 'green', 'brown', 'hazel', 'gray', 'dark'];
const BODY_OPTIONS = ['petite', 'athletic', 'curvy', 'slim', 'tall & lean'];
const STYLE_OPTIONS = ['casual', 'elegant', 'sporty', 'edgy', 'glamorous'];

const OPTION_IMAGES = {
  'black straight': '/IMG_8090.jpeg',
  'auburn waves': '/IMG_8092.jpeg',
  'long blonde': '/IMG_8094.jpeg',
  'petite': '/IMG_8108.jpeg',
  'curvy': '/IMG_8103.jpeg',
  'slim': '/IMG_8106.jpeg',
  'athletic': '/IMG_8107.jpeg',
};

function CharacterCreator({ onCreated, onClose, guestMode = false }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [createdChar, setCreatedChar] = useState(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [age, setAge] = useState(24);
  const [hair, setHair] = useState('long blonde');
  const [eyes, setEyes] = useState('blue');
  const [body, setBody] = useState('athletic');
  const [style, setStyle] = useState('casual');
  const [boldness, setBoldness] = useState(7);
  const [kinkiness, setKinkiness] = useState(6);

  const buildVisualPrompt = () =>
    `${hair} hair, ${eyes} eyes, ${body} body type, ${style} style`;

  const buildDescription = () => {
    const boldDesc = boldness >= 8 ? 'very bold and assertive' : boldness >= 5 ? 'confident' : 'shy and sweet';
    const kinkyDesc = kinkiness >= 8 ? 'very kinky and explicit' : kinkiness >= 5 ? 'adventurous and playful' : 'romantic and sensual';
    return `${boldDesc}, ${kinkyDesc}, flirty from the start, direct and authentic in conversation`;
  };

  const handleCreate = async () => {
    setError('');

    // Guest mode: just pass form data up without calling the API
    if (guestMode) {
      onCreated({
        name,
        age,
        description: buildDescription(),
        visual_prompt: buildVisualPrompt(),
      });
      return;
    }

    setLoading(true);
    try {
      const res = await createCharacter({
        name,
        age,
        description: buildDescription(),
        visual_prompt: buildVisualPrompt(),
      });
      setCreatedChar(res.data);
      setShowLoader(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create character.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Looks' },
    { num: 3, label: 'Personality' },
  ];

  if (showLoader && createdChar) {
    return (
      <CreatingLoader onDone={() => {
        setShowLoader(false);
        onCreated(createdChar);
      }} />
    );
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '580px' }}>
        <button className="modal-close" onClick={onClose}>&#x2715;</button>
        <h2 className="modal-title">Create your perfect girlfriend</h2>

        {/* Progress */}
        <div className="creator-steps">
          {steps.map((s) => (
            <div key={s.num} className={`creator-step ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}>
              <div className="step-circle">
                {step > s.num ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : s.num}
              </div>
              <span>{s.label}</span>
            </div>
          ))}
          <div className="steps-line">
            <div className="steps-line-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
          </div>
        </div>

        {/* Step 1 - Identity */}
        {step === 1 && (
          <div className="step-body">
            <div className="form-field">
              <label>Her name</label>
              <input
                type="text"
                placeholder="e.g. Sofia, Luna, Mia..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label>Age: <span className="range-val">{age}</span></label>
              <input
                type="range"
                min="18"
                max="35"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value))}
              />
              <div className="range-labels"><span>18</span><span>35</span></div>
            </div>

            <div className="step-nav">
              <button className="btn-primary" onClick={() => setStep(2)} disabled={!name.trim()}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Appearance */}
        {step === 2 && (
          <div className="step-body">
            <div className="form-field">
              <label>Hair</label>
              <div className="options-grid">
                {HAIR_OPTIONS.map(o => (
                  <button key={o} className={`opt-btn ${OPTION_IMAGES[o] ? 'has-img' : ''} ${hair === o ? 'selected' : ''}`} onClick={() => setHair(o)}>
                    {OPTION_IMAGES[o] && <img src={OPTION_IMAGES[o]} alt={o} className="opt-img" />}
                    <span className="opt-label">{o}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label>Eyes</label>
              <div className="options-grid cols-6">
                {EYE_OPTIONS.map(o => (
                  <button key={o} className={`opt-btn ${eyes === o ? 'selected' : ''}`} onClick={() => setEyes(o)}>{o}</button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label>Body type</label>
              <div className="options-grid cols-5">
                {BODY_OPTIONS.map(o => (
                  <button key={o} className={`opt-btn ${OPTION_IMAGES[o] ? 'has-img' : ''} ${body === o ? 'selected' : ''}`} onClick={() => setBody(o)}>
                    {OPTION_IMAGES[o] && <img src={OPTION_IMAGES[o]} alt={o} className="opt-img" />}
                    <span className="opt-label">{o}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label>Style</label>
              <div className="options-grid cols-5">
                {STYLE_OPTIONS.map(o => (
                  <button key={o} className={`opt-btn ${style === o ? 'selected' : ''}`} onClick={() => setStyle(o)}>{o}</button>
                ))}
              </div>
            </div>

            <div className="step-nav">
              <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 3 - Personality */}
        {step === 3 && (
          <div className="step-body">
            <div className="form-field">
              <label>
                Boldness: <span className="range-val">{boldness}/10</span>
              </label>
              <div className="range-labels"><span>Shy</span><span>Bold</span></div>
              <input
                type="range"
                min="1"
                max="10"
                value={boldness}
                onChange={(e) => setBoldness(parseInt(e.target.value))}
              />
            </div>

            <div className="form-field">
              <label>
                Kinkiness: <span className="range-val">{kinkiness}/10</span>
              </label>
              <div className="range-labels"><span>Vanilla</span><span>Kinky</span></div>
              <input
                type="range"
                min="1"
                max="10"
                value={kinkiness}
                onChange={(e) => setKinkiness(parseInt(e.target.value))}
              />
            </div>

            {/* Preview */}
            <div className="creator-preview">
              <div className="preview-avatar">
                {name.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="preview-info">
                <div className="preview-name">{name || 'Your perfect lady'}, {age}</div>
                <div className="preview-looks">{hair} hair, {eyes} eyes, {body}</div>
                <div className="preview-vibe">
                  {boldness >= 8 ? 'Very bold' : boldness >= 5 ? 'Confident' : 'Sweet'},
                  {' '}{kinkiness >= 8 ? 'very kinky' : kinkiness >= 5 ? 'adventurous' : 'romantic'}
                </div>
              </div>
            </div>

            {error && (
              <div style={{ color: '#ff6b6b', fontSize: '13px', padding: '10px', background: 'rgba(255,80,80,0.08)', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.2)', marginBottom: '10px' }}>
                {error}
              </div>
            )}

            <div className="step-nav">
              <button className="btn-ghost" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create your girl'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterCreator;