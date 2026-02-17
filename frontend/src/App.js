import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import CharacterCreator from './CharacterCreator';
import Dashboard from './Dashboard';

const API_URL = "https://api.bunny-crush.com";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState(null);
  
  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [userCredits, setUserCredits] = useState(10);
  const [userLevel, setUserLevel] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  
  // Confirmation popup
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserInfo();
    }
  }, [isLoggedIn]);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setUserCredits(response.data.credits);
      setTotalSpent(response.data.total_spent || 0);
      
      // Calculate level
      const spent = response.data.total_spent || 0;
      let level = 0;
      if (spent >= 100) level = 4;
      else if (spent >= 50) level = 3;
      else if (spent >= 25) level = 2;
      else if (spent >= 10) level = 1;
      setUserLevel(level);
      
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: authEmail,
        password: authPassword
      });
      
      localStorage.setItem('token', response.data.token);
      setUserCredits(response.data.credits || 10);
      setIsLoggedIn(true);
      setShowAuth(false);
      alert(`Registered successfully! You have ${response.data.credits} free credits!`);
      setAuthEmail('');
      setAuthPassword('');
      fetchUserInfo();
    } catch (error) {
      alert('Registration error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: authEmail,
        password: authPassword
      });
      
      localStorage.setItem('token', response.data.token);
      setUserCredits(response.data.credits || 10);
      setIsLoggedIn(true);
      setShowAuth(false);
      alert(`Logged in! You have ${response.data.credits} credits!`);
      setAuthEmail('');
      setAuthPassword('');
      fetchUserInfo();
    } catch (error) {
      alert('Login error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    if (!isLoggedIn) {
      alert('Please login first!');
      setShowAuth(true);
      return;
    }
    
    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/chat`, {
        message: input,
        character_id: currentCharacter?.id || null,
        conversation_history: messages
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const aiMessage = { 
        role: "assistant", 
        content: response.data.response
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setUserCredits(response.data.credits_remaining);
      
      // Check if confirmation needed
      if (response.data.requires_confirmation) {
        setPendingImage({
          ai_message: response.data.response,
          confirmation_data: response.data.confirmation_data
        });
        setShowConfirmation(true);
      }
      
      // Check if blocked
      if (response.data.blocked) {
        alert(response.data.blocked_message);
      }
      
    } catch (error) {
      console.error("Error:", error);
      
      if (error.response?.status === 401) {
        alert("Session expired. Please login again!");
        localStorage.removeItem('token');
        setIsLoggedIn(false);
      } else {
        alert("Error: " + (error.response?.data?.detail || error.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImage = async () => {
    if (!pendingImage) return;
    
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post(`${API_URL}/chat/generate-image`, {
        character_id: currentCharacter?.id,
        ai_message: pendingImage.ai_message
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Add image as separate message
        const imageMessage = {
          role: "assistant",
          content: "",
          image_url: response.data.image_url
        };
        
        setMessages(prev => [...prev, imageMessage]);
        setUserCredits(response.data.credits_remaining);
        setTotalSpent(prev => prev + (response.data.credits_used * 0.1));
        
        // Recalculate level
        const newSpent = totalSpent + (response.data.credits_used * 0.1);
        let newLevel = 0;
        if (newSpent >= 100) newLevel = 4;
        else if (newSpent >= 50) newLevel = 3;
        else if (newSpent >= 25) newLevel = 2;
        else if (newSpent >= 10) newLevel = 1;
        setUserLevel(newLevel);
      }
      
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setShowConfirmation(false);
      setPendingImage(null);
    }
  };

  const handleCancelImage = () => {
    setShowConfirmation(false);
    setPendingImage(null);
  };

  const handleCharacterCreated = (characterData) => {
    setCurrentCharacter(characterData);
    setShowCreator(false);
    
    // Start new chat
    setMessages([]);
    
    alert(`Now chatting with ${characterData.name}!`);
  };

  const getLevelBadge = () => {
    const levels = [
      { name: "Free", color: "#999", icon: "🆓" },
      { name: "Starter", color: "#4CAF50", icon: "⭐" },
      { name: "Regular", color: "#2196F3", icon: "💎" },
      { name: "Premium", color: "#9C27B0", icon: "👑" },
      { name: "VIP", color: "#FF6BC9", icon: "🔥" }
    ];
    
    return levels[userLevel];
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bunny Crush</h1>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
          {isLoggedIn && (
            <>
              <span style={{
                fontSize: '14px',
                padding: '8px 16px',
                background: `linear-gradient(135deg, ${getLevelBadge().color}30, ${getLevelBadge().color}20)`,
                border: `1px solid ${getLevelBadge().color}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {getLevelBadge().icon} {getLevelBadge().name}
              </span>
              <span style={{
                fontSize: '14px',
                padding: '8px 16px',
                background: 'rgba(196, 95, 255, 0.2)',
                borderRadius: '8px'
              }}>
                💎 {userCredits} credits
              </span>
              <button className="create-char-btn" onClick={() => setShowDashboard(true)}>
                📊 Dashboard
              </button>
            </>
          )}
          {isLoggedIn ? (
            <button className="create-char-btn" onClick={() => setShowCreator(true)}>
              + Create Character
            </button>
          ) : (
            <button className="create-char-btn" onClick={() => setShowAuth(!showAuth)}>
              🔐 Login / Register
            </button>
          )}
        </div>
      </header>

      {showAuth && !isLoggedIn && (
        <div style={{padding: '30px', maxWidth: '400px', margin: '0 auto', background: 'rgba(20,20,28,0.8)', borderRadius: '16px', marginTop: '20px'}}>
          <h3 style={{textAlign: 'center', marginBottom: '20px', color: '#c45fff'}}>Welcome!</h3>
          <input 
            type="email" 
            placeholder="Email" 
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            style={{width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', background: 'rgba(30,30,40,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '15px'}}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(30,30,40,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '15px'}}
          />
          <div style={{display: 'flex', gap: '12px'}}>
            <button onClick={handleRegister} style={{flex: 1, padding: '12px', background: 'linear-gradient(135deg, #c45fff 0%, #ff6bc9 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px'}}>
              Register (10 free credits!)
            </button>
            <button onClick={handleLogin} style={{flex: 1, padding: '12px', background: 'rgba(196, 95, 255, 0.3)', color: 'white', border: '1px solid #c45fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px'}}>
              Login
            </button>
          </div>
        </div>
      )}

      {showCreator && (
        <CharacterCreator 
          onCharacterCreated={handleCharacterCreated}
          onClose={() => setShowCreator(false)}
        />
      )}

      {showDashboard && (
        <Dashboard 
          onClose={() => setShowDashboard(false)}
          userLevel={userLevel}
          totalSpent={totalSpent}
        />
      )}

      {showConfirmation && pendingImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(15px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(20,20,28,0.95)',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '500px',
            textAlign: 'center',
            border: '1px solid rgba(196,95,255,0.3)'
          }}>
            <h3 style={{
              color: '#c45fff',
              marginBottom: '20px',
              fontSize: '24px'
            }}>
              Generate Image?
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '10px',
              fontSize: '16px'
            }}>
              {pendingImage.confirmation_data.message}
            </p>
            <p style={{
              color: '#c45fff',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: '20px 0'
            }}>
              💎 {pendingImage.confirmation_data.credits_cost} credits
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              marginBottom: '30px'
            }}>
              Level {pendingImage.confirmation_data.nsfw_level} content
            </p>
            <div style={{display: 'flex', gap: '16px'}}>
              <button onClick={handleCancelImage} style={{
                flex: 1,
                padding: '16px',
                background: 'rgba(40,40,50,0.8)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Cancel
              </button>
              <button onClick={handleConfirmImage} style={{
                flex: 1,
                padding: '16px',
                background: 'linear-gradient(135deg, #c45fff 0%, #ff6bc9 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Generate ✨
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.content && (
                <div className={`message ${msg.role}`}>
                  {msg.content}
                </div>
              )}
              {msg.image_url && (
                <div style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '20px'
                }}>
                  <img 
                    src={msg.image_url} 
                    alt="Generated" 
                    style={{
                      maxWidth: '400px',
                      width: '100%',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(196,95,255,0.3)'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant typing">
              {currentCharacter?.name || "Emma"} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isLoggedIn ? "Type a message..." : "Login to start chatting..."}
            disabled={isLoading || !isLoggedIn}
          />
          <button onClick={sendMessage} disabled={isLoading || !isLoggedIn}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;