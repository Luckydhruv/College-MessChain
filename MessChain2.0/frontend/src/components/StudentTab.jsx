import React, { useState, useEffect, useContext } from 'react';
import { Wallet, Utensils, MessageSquare, Repeat, FileText, AlertCircle, CheckCircle2, ScanLine, Camera } from 'lucide-react';
import { api, AuthContext } from '../context/AuthContext';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function StudentTab() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form states
  const [complaintText, setComplaintText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [rebateFrom, setRebateFrom] = useState('');
  const [rebateTo, setRebateTo] = useState('');
  const [newMessId, setNewMessId] = useState('');
  const [messes, setMesses] = useState([]);
  
  const [showScanner, setShowScanner] = useState(false);
  const [manualOverrideId, setManualOverrideId] = useState('');

  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchData = async () => {
    setMessage({ type: '', text: '' });
    try {
      const [profileRes, balanceRes, messesRes] = await Promise.all([
        api.get('/student/profile'),
        api.get('/student/balance'),
        api.get('/public/messes')
      ]);
      setProfile(profileRes.data.user);
      setBalance(balanceRes.data.balance);
      setMesses(messesRes.data.messes);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (endpoint, data, successMsg) => {
    setMessage({ type: '', text: '' });
    try {
      await api.post(`/student/${endpoint}`, data);
      setMessage({ type: 'success', text: successMsg });
      // Clear forms
      setComplaintText('');
      setFeedbackText('');
      setRebateFrom('');
      setRebateTo('');
      setNewMessId('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Action failed' });
    }
  };

  if (loading) return <div className="text-center p-8">Loading profile...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-6">
        <div>
          <h2 className="text-gradient">Student Dashboard</h2>
          <p>Welcome back, {user?.name}</p>
        </div>
        <div className="glass-card flex-center gap-4" style={{ padding: '12px 24px' }}>
          <Wallet className="text-gradient" />
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Token Balance</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{balance}</div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid-2 mb-6">
        {/* Profile Info */}
        <div className="glass-panel">
          <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><FileText size={20} /> Profile Details</h3>
          <div className="mb-2"><strong>Roll Number:</strong> {profile?.rollNumber}</div>
          <div className="mb-2"><strong>Current Mess:</strong> <span className="badge badge-primary">{profile?.mess?.name || 'Not assigned'}</span></div>
          <div className="mb-2" style={{ wordBreak: 'break-all' }}><strong>Wallet:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>{profile?.walletAddress}</span></div>
        </div>

        {/* Daily QR Verification */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h3 className="mb-2">Scan Mess QR</h3>
          <p className="mb-6 text-muted">Verify your daily meal transaction by scanning the QR code at your mess.</p>
          
          {showScanner ? (
            <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
                <Scanner 
                  onScan={(detectedCodes) => {
                    if (detectedCodes && detectedCodes.length > 0) {
                      try {
                        const data = JSON.parse(detectedCodes[0].rawValue);
                        if (data.type === 'MESS_VERIFICATION' && data.messId) {
                          setShowScanner(false);
                          handleAction('verify-meal', { scannedMessId: data.messId }, 'Meal successfully verified for today!');
                        } else {
                          setMessage({ type: 'error', text: 'Invalid QR Format' });
                        }
                      } catch (e) {
                        setMessage({ type: 'error', text: 'Failed to read QR Code' });
                      }
                    }
                  }}
                  onError={(error) => {
                    console.log(error);
                  }}
                />
              </div>
              <button className="btn btn-outline" onClick={() => setShowScanner(false)} style={{ width: '100%' }}>
                Close Camera
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '16px', marginBottom: '16px' }}
                onClick={() => {
                  setMessage({ type: '', text: '' });
                  setShowScanner(true);
                }}
              >
                <Camera size={24} style={{ marginRight: '8px' }} /> Open Camera Scanner
              </button>
              
              {/* Dev Override */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Dev: Paste Mess ID..." 
                  value={manualOverrideId} 
                  onChange={e => setManualOverrideId(e.target.value)} 
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                />
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '8px 16px' }}
                  onClick={() => {
                    if(!manualOverrideId) return;
                    handleAction('verify-meal', { scannedMessId: manualOverrideId }, 'Meal successfully verified for today!');
                    setManualOverrideId('');
                  }}
                >
                  Simulate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">

        {/* Mess Change Request */}
        <div className="glass-panel">
          <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Repeat size={20} /> Request Mess Change</h3>
          <div className="input-group">
            <label>Select New Mess</label>
            <select value={newMessId} onChange={e => setNewMessId(e.target.value)}>
              <option value="" disabled>Choose a mess...</option>
              {messes.filter(m => m.id !== profile?.messId).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-outline" onClick={() => {
            if (!newMessId) return setMessage({ type: 'error', text: 'Select a mess' });
            handleAction('request-mess-change', { newMessId }, 'Mess change requested!');
          }}>
            Submit Request
          </button>
        </div>

        {/* Rebate Request */}
        <div className="glass-panel">
          <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Utensils size={20} /> Request Rebate</h3>
          <div className="grid-2">
            <div className="input-group">
              <label>From Date</label>
              <input type="date" value={rebateFrom} onChange={e => setRebateFrom(e.target.value)} />
            </div>
            <div className="input-group">
              <label>To Date</label>
              <input type="date" value={rebateTo} onChange={e => setRebateTo(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-outline" onClick={() => {
            if(!rebateFrom || !rebateTo) return setMessage({type:'error', text:'Select dates'});
            const fromSec = Math.floor(new Date(rebateFrom).getTime() / 1000);
            const toSec = Math.floor(new Date(rebateTo).getTime() / 1000);
            handleAction('request-rebate', { fromDate: fromSec, toDate: toSec }, 'Rebate requested successfully!');
          }}>
            Submit Rebate
          </button>
        </div>

        {/* Governance */}
        <div className="glass-panel">
          <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><MessageSquare size={20} /> Governance</h3>
          <div className="input-group">
            <label>File a Complaint or Feedback</label>
            <textarea rows="3" placeholder="Describe your issue or suggestion..." value={complaintText} onChange={e => setComplaintText(e.target.value)} />
          </div>
          <div className="flex-between gap-4">
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleAction('file-complaint', { messId: profile?.messId, text: complaintText }, 'Complaint filed to IPFS & Chain!')}>
              File Complaint
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleAction('file-feedback', { messId: profile?.messId, text: complaintText }, 'Feedback submitted to IPFS & Chain!')}>
              Submit Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
