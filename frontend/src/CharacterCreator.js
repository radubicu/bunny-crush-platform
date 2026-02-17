import React, { useState } from 'react';
import axios from 'axios';
import './CharacterCreator.css';

const API_URL = "http://127.0.0.1:8000";

function CharacterCreator({ onCharacterCreated, onClose }) {
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState({
    name: '',
    age: 24,
    appearance: {
      hair: 'long blonde',
      eyes: 'blue',
      body: 'athletic',
      style: 'casual'
    },
    personality: {
      traits: ['flirty', 'playful'],
      boldness: 7,
      kinkiness: 5
    }
  });

  const hairOptions = ['long blonde', 'short brown', 'red curly', 'black straight', 'pink', 'blue'];
  const eyeOptions = ['blue', 'green', 'brown', 'hazel', 'gray'];
  const bodyOptions = ['petite', 'athletic', 'curvy', 'slim', 'muscular'];
  const styleOptions = ['casual', 'elegant', 'sporty', 'edgy', 'sexy'];

  const handleCreate = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.post(
      `${API_URL}/characters`,  // ✅ Correct endpoint
      {
        name: character.name,
        age: character.age,
        appearance: character.appearance,
        personality: character.personality
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (response.data.success) {
      alert(`${character.name} created! 🎉`);
      onCharacterCreated({
        ...character,
        id: response.data.character_id
      });
    }
  } catch (error) {
    alert('Error: ' + (error.response?.data?.detail || error.message));
  }
};

  return (
    <div className="creator-overlay">
      <div className="creator-modal">
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <h2>Create Your Girl</h2>
        
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {step === 1 && (
          <div className="step-content">
            <h3>Basic Info</h3>
            
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text"
                value={character.name}
                onChange={(e) => setCharacter({...character, name: e.target.value})}
                placeholder="Enter her name..."
              />
            </div>

            <div className="form-group">
              <label>Age: {character.age}</label>
              <input 
                type="range"
                min="18"
                max="35"
                value={character.age}
                onChange={(e) => setCharacter({...character, age: parseInt(e.target.value)})}
              />
            </div>

            <button 
              className="next-btn"
              onClick={() => setStep(2)}
              disabled={!character.name}
            >
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h3>Appearance</h3>

            <div className="form-group">
              <label>Hair</label>
              <div className="options-grid">
                {hairOptions.map(option => (
                  <button
                    key={option}
                    className={`option-btn ${character.appearance.hair === option ? 'selected' : ''}`}
                    onClick={() => setCharacter({
                      ...character,
                      appearance: {...character.appearance, hair: option}
                    })}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Eyes</label>
              <div className="options-grid">
                {eyeOptions.map(option => (
                  <button
                    key={option}
                    className={`option-btn ${character.appearance.eyes === option ? 'selected' : ''}`}
                    onClick={() => setCharacter({
                      ...character,
                      appearance: {...character.appearance, eyes: option}
                    })}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Body Type</label>
              <div className="options-grid">
                {bodyOptions.map(option => (
                  <button
                    key={option}
                    className={`option-btn ${character.appearance.body === option ? 'selected' : ''}`}
                    onClick={() => setCharacter({
                      ...character,
                      appearance: {...character.appearance, body: option}
                    })}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="button-group">
              <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="next-btn" onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h3>Personality</h3>

            <div className="form-group">
              <label>Boldness: {character.personality.boldness}/10</label>
              <div className="slider-labels">
                <span>Shy</span>
                <span>Bold</span>
              </div>
              <input 
                type="range"
                min="1"
                max="10"
                value={character.personality.boldness}
                onChange={(e) => setCharacter({
                  ...character,
                  personality: {...character.personality, boldness: parseInt(e.target.value)}
                })}
              />
            </div>

            <div className="form-group">
              <label>Kinkiness: {character.personality.kinkiness}/10</label>
              <div className="slider-labels">
                <span>Vanilla</span>
                <span>Kinky</span>
              </div>
              <input 
                type="range"
                min="1"
                max="10"
                value={character.personality.kinkiness}
                onChange={(e) => setCharacter({
                  ...character,
                  personality: {...character.personality, kinkiness: parseInt(e.target.value)}
                })}
              />
            </div>

            <div className="preview-box">
              <h4>Preview</h4>
              <p><strong>Name:</strong> {character.name}, {character.age}</p>
              <p><strong>Looks:</strong> {character.appearance.hair} hair, {character.appearance.eyes} eyes, {character.appearance.body} body</p>
              <p><strong>Personality:</strong> {character.personality.boldness > 7 ? 'Very bold' : character.personality.boldness > 4 ? 'Confident' : 'Shy'}, {character.personality.kinkiness > 7 ? 'very kinky' : character.personality.kinkiness > 4 ? 'adventurous' : 'vanilla'}</p>
            </div>

            <div className="button-group">
              <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
              <button className="create-btn" onClick={handleCreate}>Create Character ✨</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterCreator;