import React, { useState, useEffect } from 'react';
import './WelcomePopup.css';

export default function WelcomePopup({ onClose, onSignUp }) {
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minute
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

  const handleCTA = () => {
    setClosing(true);
    setTimeout(() => { onClose(); onSignUp(); }, 400);
  };

  return (
    <div className={`wp-overlay ${closing ? 'closing' : ''}`}>
      <div className={`wp-modal ${closing ? 'closing' : ''}`}>

        {/* Header image area */}
        <div className="wp-header">
          <div className="wp-header-bg" />
          <div className="wp-badge">Only for NEW users</div>
          <div className="wp-timer-bar">
            <span className="wp-timer-label">One-Time Offer</span>
            <span className="wp-hourglass">⏳</span>
            <span className="wp-countdown">{mins}:{secs}</span>
            <span className="wp-sec">Sec</span>
          </div>
        </div>

        {/* Content */}
        <div className="wp-body">
          <h2 className="wp-title">Are You Sure?</h2>
          <p className="wp-sub">
            By going away, you'll lose the opportunity to unlock <strong>all features</strong> for free!
          </p>

          <div className="wp-features">
            <div className="wp-feature-row">
              <span className="wp-feature-name">50 free credits to start</span>
              <div className="wp-feature-price">
                <span className="wp-old">$9.99</span>
                <span className="wp-new">$0.00</span>
              </div>
            </div>
            <div className="wp-feature-row">
              <span className="wp-feature-name">Create your AI companion</span>
              <div className="wp-feature-price">
                <span className="wp-old">$4.99</span>
                <span className="wp-new">$0.00</span>
              </div>
            </div>
            <div className="wp-feature-row">
              <span className="wp-feature-name">Unlimited chat</span>
              <div className="wp-feature-price">
                <span className="wp-old">$14.99</span>
                <span className="wp-new">$0.00</span>
              </div>
            </div>
            <div className="wp-feature-row">
              <span className="wp-feature-name">Generate photos (SFW & NSFW)</span>
              <div className="wp-feature-price">
                <span className="wp-old">$19.99</span>
                <span className="wp-new">$0.00</span>
              </div>
            </div>
          </div>

          <p className="wp-disclaimer">This offer is available only now, on this screen.</p>

          <div className="wp-actions">
            <button className="wp-skip" onClick={handleClose}>Lose my chance</button>
            <button className="wp-cta" onClick={handleCTA}>Get started free</button>
          </div>
        </div>
      </div>
    </div>
  );
}