import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, Coins, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../context/AuthContext';

export default function AdminTab() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Data states
  const [messChanges, setMessChanges] = useState([]);
  const [rebates, setRebates] = useState([]);
  const [students, setStudents] = useState([]);
  const [messes, setMesses] = useState([]);

  // Form states
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffMessId, setStaffMessId] = useState('');
  
  const [mintRollNumber, setMintRollNumber] = useState('');
  const [mintAmount, setMintAmount] = useState('');

  const fetchQueues = async () => {
    setMessage({ type: '', text: '' });
    try {
      const [mcRes, rebRes, stdRes, messesRes] = await Promise.all([
        api.get('/admin/mess-changes'),
        api.get('/admin/rebates'),
        api.get('/admin/students'),
        api.get('/public/messes')
      ]);
      setMessChanges(mcRes.data.messChanges.filter(r => r.status === 0)); // 0 = Pending
      setRebates(rebRes.data.rebates.filter(r => r.status === 0));
      setStudents(stdRes.data.students);
      setMesses(messesRes.data.messes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  const handleAction = async (endpoint, data, successMsg) => {
    setMessage({ type: '', text: '' });
    try {
      await api.post(`/admin/${endpoint}`, data);
      setMessage({ type: 'success', text: successMsg });
      fetchQueues();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Action failed' });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-6">
        <div>
          <h2 className="text-gradient flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
            <ShieldCheck /> Admin Console
          </h2>
          <p>System Management & Approvals</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => handleAction('trigger-cron', {}, 'Midnight cron job executed successfully!')}>
            Trigger Midnight Cron
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid-2 mb-6">
        {/* Create Staff */}
        <div className="glass-panel">
          <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><UserPlus size={20} /> Create Staff Account</h3>
          <div className="grid-2">
            <div className="input-group">
              <label>Name</label>
              <input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Password</label>
              <input type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Assign Mess</label>
              <select value={staffMessId} onChange={e => setStaffMessId(e.target.value)}>
                <option value="" disabled>Select a mess...</option>
                {messes.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => handleAction('create-staff', { email: staffEmail, password: staffPassword, name: staffName, messId: staffMessId }, 'Staff created successfully!')}>
            Create Staff
          </button>
        </div>

        {/* Mint Tokens */}
        <div className="glass-panel">
          <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Coins size={20} /> Mint Tokens</h3>
          <div className="input-group">
            <label>Student Roll Number</label>
            <input type="text" value={mintRollNumber} onChange={e => setMintRollNumber(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Amount</label>
            <input type="number" value={mintAmount} onChange={e => setMintAmount(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={() => handleAction('mint-tokens', { rollNumber: mintRollNumber, amount: Number(mintAmount) }, `Minted ${mintAmount} tokens!`)}>
            Mint to Wallet
          </button>
        </div>
      </div>

      {/* Approval Queues */}
      <div className="grid-2">
        <div className="glass-panel">
          <h3 className="mb-4">Mess Change Requests ({messChanges.length})</h3>
          {messChanges.length === 0 ? <p className="text-muted">No pending requests.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messChanges.map(req => (
                <div key={req.id} className="glass-card flex-between">
                  <div style={{ fontSize: '0.9rem' }}>
                    <strong>Student:</strong> {req.student.substring(0, 10)}...<br/>
                    <strong>To Mess:</strong> {req.toMess.substring(0, 10)}...
                  </div>
                  <div className="flex-center gap-2">
                    <button className="btn btn-success" style={{ padding: '8px' }} onClick={() => handleAction(`mess-changes/${req.id}/approve`, {}, 'Mess change approved!')}><Check size={16} /></button>
                    <button className="btn btn-danger" style={{ padding: '8px' }} onClick={() => handleAction(`mess-changes/${req.id}/reject`, {}, 'Mess change rejected.')}><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h3 className="mb-4">Rebate Requests ({rebates.length})</h3>
          {rebates.length === 0 ? <p className="text-muted">No pending requests.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rebates.map(req => (
                <div key={req.id} className="glass-card flex-between">
                  <div style={{ fontSize: '0.9rem' }}>
                    <strong>Student:</strong> {req.student.substring(0, 10)}...<br/>
                    <strong>From:</strong> {new Date(req.fromDate * 1000).toLocaleDateString()}<br/>
                    <strong>To:</strong> {new Date(req.toDate * 1000).toLocaleDateString()}
                  </div>
                  <div className="flex-center gap-2">
                    <button className="btn btn-success" style={{ padding: '8px' }} onClick={() => handleAction(`rebates/${req.id}/approve`, {}, 'Rebate approved!')}><Check size={16} /></button>
                    <button className="btn btn-danger" style={{ padding: '8px' }} onClick={() => handleAction(`rebates/${req.id}/reject`, {}, 'Rebate rejected.')}><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
