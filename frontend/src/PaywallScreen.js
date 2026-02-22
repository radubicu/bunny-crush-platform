import React, { useState } from 'react';
import './PaywallScreen.css';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$10',
    period: '/month',
    sub: 'Billed monthly',
    badge: null,
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '$6',
    period: '/month',
    sub: 'Billed $72/year · Save 40%',
    badge: 'BEST VALUE',
  },
];

export default function PaywallScreen({ characterName, onSubscribe, onBack }) {
  const [selected, setSelected] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await onSubscribe(selected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pw-wrap">
      <div className="pw-bg" />

      <div className="pw-card">
        {/* Top glow */}
        <div className="pw-glow" />

        {/* Header */}
        <div className="pw-header">
          <div className="pw-avatar-row">
            <div className="pw-avatar-ring">
              <div className="pw-avatar-inner">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            <div className="pw-avatar-text">
              <span className="pw-char-name">{characterName || 'Your girl'}</span>
              <span className="pw-char-status">
                <span className="pw-dot" /> Ready for you
              </span>
            </div>
          </div>

          <h1 className="pw-title">
            She's waiting.<br />
            <em>Unlock her now.</em>
          </h1>
          <p className="pw-sub">
            Full access to chat, photos & everything she wants to share with you.
          </p>
        </div>

        {/* Features */}
        <div className="pw-features">
          {[
            { icon: '💬', text: 'Unlimited flirty conversations' },
            { icon: '📸', text: 'Exclusive photos on demand' },
            { icon: '🔥', text: 'Intimate content, no limits' },
            { icon: '✨', text: 'She remembers everything about you' },
          ].map((f, i) => (
            <div key={i} className="pw-feature">
              <span className="pw-feature-icon">{f.icon}</span>
              <span className="pw-feature-text">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="pw-plans">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`pw-plan ${selected === plan.id ? 'selected' : ''}`}
              onClick={() => setSelected(plan.id)}
            >
              {plan.badge && <div className="pw-plan-badge">{plan.badge}</div>}
              <div className="pw-plan-left">
                <div className="pw-plan-radio">
                  {selected === plan.id && <div className="pw-plan-radio-dot" />}
                </div>
                <div>
                  <div className="pw-plan-label">{plan.label}</div>
                  <div className="pw-plan-sub">{plan.sub}</div>
                </div>
              </div>
              <div className="pw-plan-price">
                <span className="pw-plan-amount">{plan.price}</span>
                <span className="pw-plan-period">{plan.period}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className={`pw-cta ${loading ? 'loading' : ''}`}
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Start now — meet her tonight'}
        </button>

        <p className="pw-legal">
          Cancel anytime. Billed securely via Stripe.
        </p>

        {/* Back link */}
        <button className="pw-back" onClick={onBack}>
          No thanks, I'll pass
        </button>
      </div>
    </div>
  );
}