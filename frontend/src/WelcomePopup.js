import React, { useState, useEffect } from 'react';
import './WelcomePopup.css';

export default function WelcomePopup({ onClose, onSubscribe, characterName }) {
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 400);
  };

  const handleSubscribe = () => {
    setClosing(true);
    setTimeout(onSubscribe, 400);
  };

  return (
    <div className={`wp-overlay ${closing ? 'closing' : ''}`}>
      <div className={`wp-modal ${closing ? 'closing' : ''}`}>

        <div className="wp-header">
          <div className="wp-header-bg" />
          <div className="wp-neon-left" />
          <div className="wp-neon-right" />
          <div className="wp-badge-new">Only for NEW members</div>
          <div className="wp-girl">
            <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="wp-girl-svg">
              <ellipse cx="100" cy="60" rx="32" ry="36" fill="rgba(255,180,160,0.9)"/>
              <path d="M68 60 Q60 40 80 20 Q100 5 120 20 Q140 40 132 60" fill="rgba(40,10,60,0.95)"/>
              <path d="M50 170 Q60 110 100 105 Q140 110 150 170 L160 240 H40 Z" fill="rgba(183,87,255,0.85)"/>
              <ellipse cx="80" cy="145" rx="14" ry="18" fill="rgba(255,180,160,0.9)"/>
              <ellipse cx="120" cy="145" rx="14" ry="18" fill="rgba(255,180,160,0.9)"/>
              <path d="M68 90 Q80 115 100 118 Q120 115 132 90" fill="rgba(255,180,160,0.9)"/>
            </svg>
          </div>
          <div className="wp-timer-bar">
            <span className="wp-timer-label">One-Time Offer</span>
            <span className="wp-hourglass">⏳</span>
            <div className="wp-countdown-box">
              <span className="wp-countdown">{mins}:{secs}</span>
            </div>
            <span className="wp-sec">Sec</span>
          </div>
        </div>

        <div className="wp-body">
          <h2 className="wp-title">Wait — Are You Sure?</h2>
          <p className="wp-sub">
            {characterName ? `${characterName} is ready` : "She's ready"} and waiting. Leave now and lose this deal forever.
          </p>

          <div className="wp-features">
            <div className="wp-feature-row">
              <span className="wp-feature-name">Unlimited flirty conversations</span>
              <div className="wp-feature-price">
                <span className="wp-old">$29.99</span>
                <span className="wp-new">$10</span>
              </div>
            </div>
            <div className="wp-feature-row">
              <span className="wp-feature-name">Exclusive intimate photos</span>
              <div className="wp-feature-price">
                <span className="wp-old">$19.99</span>
                <span className="wp-new">included</span>
              </div>
            </div>
            <div className="wp-feature-row">
              <span className="wp-feature-name">She remembers everything</span>
              <div className="wp-feature-price">
                <span className="wp-old">$9.99</span>
                <span className="wp-new">included</span>
              </div>
            </div>
            <div className="wp-feature-row">
              <span className="wp-feature-name">No limits, no censorship</span>
              <div className="wp-feature-price">
                <span className="wp-old">$14.99</span>
                <span className="wp-new">included</span>
              </div>
            </div>
          </div>

          <p className="wp-disclaimer">This offer disappears when the timer hits zero.</p>

          <div className="wp-actions">
            <button className="wp-skip" onClick={handleClose}>I'll pass</button>
            <button className="wp-cta" onClick={handleSubscribe}>Claim $10/mo deal</button>
          </div>
        </div>
      </div>
    </div>
  );
}