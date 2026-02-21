import React, { useState, useEffect } from 'react';
import './CreatingLoader.css';

const STEPS = [
  { label: 'Processing your request', duration: 1200 },
  { label: 'Designing her appearance', duration: 2000 },
  { label: 'Shaping her personality', duration: 1800 },
  { label: 'Generating her first photo', duration: 3000 },
];

export default function CreatingLoader({ onDone }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progresses, setProgresses] = useState(STEPS.map(() => 0));
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    let stepIndex = 0;
    let startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const step = STEPS[stepIndex];
      const progress = Math.min(100, (elapsed / step.duration) * 100);

      setProgresses(prev => {
        const next = [...prev];
        next[stepIndex] = progress;
        return next;
      });

      if (progress >= 100) {
        stepIndex++;
        if (stepIndex >= STEPS.length) {
          setAllDone(true);
          setCurrentStep(STEPS.length);
          setTimeout(() => onDone(), 800);
          return;
        }
        setCurrentStep(stepIndex);
        startTime = Date.now();
      }

      requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="cl-overlay">
      <div className="cl-card">
        <div className="cl-glow" />

        <div className="cl-top">
          <div className="cl-avatar-ring">
            <div className="cl-avatar-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <svg className="cl-ring-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(183,87,255,0.15)" strokeWidth="3"/>
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="289"
                strokeDashoffset={289 - (289 * (progresses[currentStep < STEPS.length ? currentStep : STEPS.length - 1] / 100))}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b757ff"/>
                  <stop offset="100%" stopColor="#ff6bbd"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h2 className="cl-title">We're creating your amazing girl... Just how you like her...</h2>
          <p className="cl-sub">This may take a few moments</p>
        </div>

        <div className="cl-steps">
          {STEPS.map((step, i) => (
            <div key={i} className={`cl-step ${i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'}`}>
              <div className="cl-step-header">
                <span className="cl-step-label">{step.label}</span>
                <span className="cl-step-pct">
                  {i < currentStep ? '100%' : i === currentStep ? `${Math.round(progresses[i])}%` : '0%'}
                  {i === currentStep && <span className="cl-spinner" />}
                </span>
              </div>
              <div className="cl-bar">
                <div
                  className="cl-bar-fill"
                  style={{
                    width: i < currentStep ? '100%' : i === currentStep ? `${progresses[i]}%` : '0%'
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {allDone && (
          <div className="cl-done">
            <span className="cl-done-icon">✓</span>
            <span>She's ready for you</span>
          </div>
        )}
      </div>
    </div>
  );
}