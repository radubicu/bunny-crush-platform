import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "http://127.0.0.1:8000";

function Dashboard({ onClose, userLevel, totalSpent }) {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const getLevelInfo = () => {
    const levels = [
      { 
        name: "Free User", 
        color: "#999", 
        icon: "🆓",
        next: "$10",
        maxNSFW: 0,
        description: "SFW content only"
      },
      { 
        name: "Starter", 
        color: "#4CAF50", 
        icon: "⭐",
        next: "$25",
        maxNSFW: 1,
        description: "Flirty content unlocked"
      },
      { 
        name: "Regular", 
        color: "#2196F3", 
        icon: "💎",
        next: "$50",
        maxNSFW: 2,
        description: "Lingerie content unlocked"
      },
      { 
        name: "Premium", 
        color: "#9C27B0", 
        icon: "👑",
        next: "$100",
        maxNSFW: 3,
        description: "Nude content unlocked"
      },
      { 
        name: "VIP", 
        color: "#FF6BC9", 
        icon: "🔥",
        next: "MAX",
        maxNSFW: 4,
        description: "Full explicit access"
      }
    ];
    
    return levels[userLevel];
  };

  const getProgressToNextLevel = () => {
    const thresholds = [0, 10, 25, 50, 100];
    if (userLevel >= 4) return 100;
    
    const current = totalSpent;
    const nextThreshold = thresholds[userLevel + 1];
    const prevThreshold = thresholds[userLevel];
    
    const progress = ((current - prevThreshold) / (nextThreshold - prevThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const handleBuyCredits = async (packageId) => {
    alert(`Stripe payment for ${packageId} - Coming soon!`);
  };

  const levelInfo = getLevelInfo();
  const progress = getProgressToNextLevel();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,     
      bottom: 0,
      background: 'rgba(10,10,15,0.95)',
      backdropFilter: 'blur(15px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'rgba(20,20,28,0.95)',
        borderRadius: '28px',
        padding: '45px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute',
          top: '25px',
          right: '25px',
          background: 'rgba(196,95,255,0.2)',
          border: 'none',
          color: 'white',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '20px'
        }}>✕</button>

        <h2 style={{
          background: 'linear-gradient(135deg, #c45fff 0%, #ff6bc9 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '30px',
          fontSize: '32px'
        }}>Dashboard</h2>

        {user && (
          <div>
            {/* User Level Card */}
            <div style={{
              background: `linear-gradient(135deg, ${levelInfo.color}20, ${levelInfo.color}10)`,
              border: `2px solid ${levelInfo.color}`,
              padding: '30px',
              borderRadius: '20px',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <span style={{fontSize: '48px'}}>{levelInfo.icon}</span>
                    <div>
                      <h3 style={{
                        color: levelInfo.color,
                        fontSize: '28px',
                        margin: 0
                      }}>{levelInfo.name}</h3>
                      <p style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '14px',
                        margin: '4px 0 0 0'
                      }}>
                        {levelInfo.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    margin: '0 0 4px 0'
                  }}>Total Spent</p>
                  <p style={{
                    color: levelInfo.color,
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: 0
                  }}>${totalSpent.toFixed(2)}</p>
                </div>
              </div>

              {userLevel < 4 && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{color: 'rgba(255,255,255,0.6)', fontSize: '14px'}}>
                      Progress to next level
                    </span>
                    <span style={{color: levelInfo.color, fontSize: '14px', fontWeight: 'bold'}}>
                      {levelInfo.next} needed
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}dd)`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}

              {userLevel === 4 && (
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'rgba(255,107,201,0.2)',
                  borderRadius: '12px',
                  marginTop: '16px'
                }}>
                  <p style={{
                    color: '#FF6BC9',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    margin: 0
                  }}>
                    🎉 You've reached MAX level! Full access unlocked!
                  </p>
                </div>
              )}
            </div>

            {/* Account Info */}
            <div style={{
              background: 'rgba(30,30,40,0.6)',
              padding: '24px',
              borderRadius: '16px',
              marginBottom: '24px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <h3 style={{color: '#c45fff', marginBottom: '16px', fontSize: '20px'}}>Account Info</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}>
                <div>
                  <p style={{color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px'}}>Email</p>
                  <p style={{color: 'white', fontSize: '16px', margin: 0}}>{user.email}</p>
                </div>
                <div>
                  <p style={{color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px'}}>Credits</p>
                  <p style={{color: '#c45fff', fontSize: '20px', fontWeight: 'bold', margin: 0}}>
                    💎 {user.credits}
                  </p>
                </div>
                <div>
                  <p style={{color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px'}}>Max NSFW Level</p>
                  <p style={{color: levelInfo.color, fontSize: '16px', fontWeight: 'bold', margin: 0}}>
                    Level {levelInfo.maxNSFW}
                  </p>
                </div>
                <div>
                  <p style={{color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px'}}>Member Since</p>
                  <p style={{color: 'white', fontSize: '16px', margin: 0}}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Buy Credits */}
            <div style={{
              background: 'rgba(30,30,40,0.6)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <h3 style={{color: '#c45fff', marginBottom: '16px', fontSize: '20px'}}>Buy Credits</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
                {[
                  {id: 'starter', credits: 50, price: 4.99, bonus: 0},
                  {id: 'popular', credits: 150, price: 9.99, bonus: 25},
                  {id: 'best', credits: 500, price: 24.99, bonus: 150},
                  {id: 'premium', credits: 1000, price: 39.99, bonus: 400}
                ].map(pkg => (
                  <div key={pkg.id} style={{
                    background: 'rgba(196,95,255,0.1)',
                    border: '1px solid rgba(196,95,255,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = '#c45fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(196,95,255,0.3)';
                  }}>
                    <h4 style={{color: '#c45fff', marginBottom: '8px', fontSize: '18px'}}>
                      {pkg.credits + pkg.bonus} Credits
                    </h4>
                    {pkg.bonus > 0 && (
                      <span style={{
                        background: '#c45fff',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: '8px',
                        display: 'inline-block',
                        fontWeight: 'bold'
                      }}>
                        +{pkg.bonus} BONUS!
                      </span>
                    )}
                    <p style={{fontSize: '28px', fontWeight: 'bold', margin: '12px 0', color: 'white'}}>
                      ${pkg.price}
                    </p>
                    <button onClick={() => handleBuyCredits(pkg.id)} style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #c45fff 0%, #ff6bc9 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '15px',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      Buy Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;