import React, { useState, useEffect, useContext } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { api, AuthContext } from '../context/AuthContext';

export default function AuthTab() {
  const { login } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [messId, setMessId] = useState('');

  const [messes, setMesses] = useState([]);

  useEffect(() => {
    // Fetch messes for registration dropdown
    api.get('/public/messes').then(res => setMesses(res.data.messes)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        login(res.data.user, res.data.token);
      } else {
        const res = await api.post('/auth/register', {
          email,
          password,
          name,
          rollNumber,
          messId,
        });
        login(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center animate-fade-in" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-6">
          <div className="flex-center mb-4">
            <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '50%', color: '#8b5cf6' }}>
              {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
            </div>
          </div>
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Login to your MessChain account' : 'Register as a new student'}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Roll Number</label>
                <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Assigned Mess</label>
                <select value={messId} onChange={(e) => setMessId(e.target.value)} required>
                  <option value="" disabled>Select a mess...</option>
                  {messes.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ width: '100%', border: 'none', background: 'transparent' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
