import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, RefreshCw, Play, Eye, Wand2, Check, X } from 'lucide-react';

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function App() {
  const [words, setWords] = useState([]);
  const [view, setView] = useState('quiz'); // 'quiz' or 'manage'
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [newHindi, setNewHindi] = useState('');
  const [newEnglish, setNewEnglish] = useState('');

  // Quiz state
  const [queue, setQueue] = useState([]);
  const [wrongQueue, setWrongQueue] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const startQuiz = useCallback((wordList) => {
    setQueue(shuffleArray(wordList));
    setWrongQueue([]);
    setIsCompleted(false);
    setRevealed(false);
  }, []);

  // Load words from backend on mount
  useEffect(() => {
    fetch('/api/words')
      .then(res => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then(data => {
        setWords(data);
        if (data.length > 0) {
          startQuiz(data);
        }
      })
      .catch(err => {
        console.warn('Backend not available, falling back to local storage.');
        const saved = localStorage.getItem('hindiWordsData');
        if (saved) {
          const data = JSON.parse(saved);
          setWords(data);
          if (data.length > 0) {
            startQuiz(data);
          }
        }
      });
  }, [startQuiz]);

  // Save words to backend whenever they change
  const saveWords = async (newWords) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWords)
      });
      if (!res.ok) throw new Error("API not available");
    } catch (err) {
      localStorage.setItem('hindiWordsData', JSON.stringify(newWords));
    } finally {
      setWords(newWords);
      setIsSaving(false);
    }
  };

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const handleRight = useCallback(() => {
    setQueue(prevQueue => {
      const newQueue = prevQueue.slice(1);
      if (newQueue.length === 0) setIsCompleted(true);
      return newQueue;
    });
    setRevealed(false);
  }, []);

  const handleWrong = useCallback(() => {
    setQueue(prevQueue => {
      setWrongQueue(pw => [...pw, prevQueue[0]]);
      const newQueue = prevQueue.slice(1);
      if (newQueue.length === 0) setIsCompleted(true);
      return newQueue;
    });
    setRevealed(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (view !== 'quiz' || isCompleted || queue.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) {
          handleReveal();
        } else {
          handleRight();
        }
      } else if ((e.key === ' ' || e.key === 'Backspace') && revealed) {
        e.preventDefault();
        handleWrong();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isCompleted, queue, revealed, handleReveal, handleRight, handleWrong]);


  const handleAutoFill = async () => {
    if (!newHindi.trim()) return;
    setIsLoading(true);
    try {
      const hiWord = newHindi.trim();
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(hiWord)}&langpair=hi|en`);
      const data = await res.json();
      let english = data.responseData.translatedText || "";
      setNewEnglish(english);
    } catch (err) {
      console.error(err);
      alert("Failed to auto-fill meaning. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWord = (e) => {
    e.preventDefault();
    if (!newHindi.trim() || !newEnglish.trim()) return;

    const newWords = [...words, {
      id: Date.now().toString(),
      hindi: newHindi.trim(),
      english: newEnglish.trim()
    }];
    
    saveWords(newWords);
    startQuiz(newWords); // Restart quiz with new words
    
    // Clear form
    setNewHindi('');
    setNewEnglish('');
  };

  const removeWord = (id) => {
    const newWords = words.filter(w => w.id !== id);
    saveWords(newWords);
    startQuiz(newWords); // Restart quiz with remaining words
  };

  return (
    <div className="app-container glass">
      <header className="header">
        <h1>Hindi Vocab Learner</h1>
        <div className="nav-buttons">
          <button 
            className={`btn ${view === 'quiz' ? 'primary' : ''}`}
            onClick={() => {
              setView('quiz');
              if (queue.length === 0 && words.length > 0 && !isCompleted) {
                startQuiz(words);
              }
            }}
          >
            <Play size={18} /> Quiz
          </button>
          <button 
            className={`btn ${view === 'manage' ? 'primary' : ''}`}
            onClick={() => setView('manage')}
          >
            <BookOpen size={18} /> Manage Words
          </button>
        </div>
      </header>

      {view === 'manage' && (
        <div className="manage-view">
          <div className="form-group" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 500 }}>Add a New Word</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Hindi Word Row */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label>Hindi Word *</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={newHindi}
                    onChange={(e) => setNewHindi(e.target.value)}
                    placeholder="e.g., नमस्ते"
                  />
                </div>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={handleAutoFill}
                  disabled={isLoading || !newHindi.trim()}
                  title="Auto-fill English meaning using AI/Internet"
                  style={{ height: '54px' }}
                >
                  {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Wand2 size={18} />}
                  Auto-Fill
                </button>
              </div>

              {/* English Row */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label>English Meaning *</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={newEnglish}
                    onChange={(e) => setNewEnglish(e.target.value)}
                    placeholder="e.g., Hello"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn primary" 
                  onClick={handleAddWord}
                  disabled={isSaving || !newHindi.trim() || !newEnglish.trim()}
                >
                  {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                  Save Word
                </button>
              </div>
            </div>
          </div>

          <div className="word-list">
            {words.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={48} opacity={0.5} />
                <p>No words added yet. Add some words above to start learning!</p>
              </div>
            ) : (
              words.map((word) => (
                <div key={word.id} className="word-item">
                  <div className="word-info">
                    <strong>{word.hindi}</strong>
                    <span>{word.english}</span>
                  </div>
                  <button className="btn danger" onClick={() => removeWord(word.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {view === 'quiz' && (
        <div className="quiz-card">
          {words.length === 0 ? (
             <div className="empty-state">
               <BookOpen size={48} opacity={0.5} />
               <p>No words available. Go to Manage Words to add some!</p>
               <button className="btn primary" onClick={() => setView('manage')}>
                 Manage Words
               </button>
             </div>
          ) : isCompleted ? (
            <div className="completion-screen" style={{ textAlign: 'center', animation: 'scaleIn 0.5s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--success)' }}>🎉 All Done!</h2>
              {wrongQueue.length > 0 ? (
                <>
                  <p style={{ marginBottom: '2rem', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    You got <strong>{wrongQueue.length}</strong> word(s) wrong out of {words.length}.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
                    <button className="btn primary" onClick={() => startQuiz(wrongQueue)} style={{ justifyContent: 'center' }}>
                      Practice Wrong Words
                    </button>
                    <button className="btn" onClick={() => startQuiz(words)} style={{ justifyContent: 'center' }}>
                      Restart All Words
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '2rem', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    Perfect score! You got all words right.
                  </p>
                  <button className="btn primary" onClick={() => startQuiz(words)} style={{ width: '300px', justifyContent: 'center' }}>
                    Restart Quiz
                  </button>
                </>
              )}
            </div>
          ) : queue.length > 0 ? (
            <>
              <div className="word-display" key={queue[0].id}>
                {queue[0].hindi}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '300px', marginTop: '1.5rem' }}>
                {!revealed ? (
                  <button 
                    className="btn primary" 
                    onClick={handleReveal} 
                    style={{ fontSize: '1.2rem', padding: '1rem', borderRadius: '16px', justifyContent: 'center' }}
                  >
                    <Eye size={20} /> Reveal Answer <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: '0.5rem' }}>(Enter)</span>
                  </button>
                ) : (
                  <>
                    <div className="reveal-container" style={{ marginBottom: '1rem' }}>
                      <div className="revealed-meaning" style={{ fontSize: '2.5rem' }}>
                        {queue[0].english}
                      </div>
                    </div>
                    {/* The Right button perfectly replaces the Reveal Answer button */}
                    <button 
                      className="btn success" 
                      onClick={handleRight}
                      style={{ fontSize: '1.2rem', padding: '1rem', borderRadius: '16px', justifyContent: 'center' }}
                    >
                      <Check size={20} /> Right <span style={{ fontSize: '0.8rem', opacity: 0.8, marginLeft: '0.5rem' }}>(Enter)</span>
                    </button>
                    <button 
                      className="btn danger" 
                      onClick={handleWrong}
                      style={{ fontSize: '1.1rem', padding: '0.8rem', borderRadius: '16px', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <X size={18} /> Wrong <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: '0.5rem' }}>(Space)</span>
                    </button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
