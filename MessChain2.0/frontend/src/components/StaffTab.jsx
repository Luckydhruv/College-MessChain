import React, { useState, useEffect } from 'react';
import { ScanLine } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../context/AuthContext';

export default function StaffTab() {
  const [profile, setProfile] = useState(null);
  
  useEffect(() => {
    api.get('/staff/profile').then(res => setProfile(res.data.user)).catch(console.error);
  }, []);

  return (
    <div className="flex-center animate-fade-in" style={{ minHeight: '60vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="text-center mb-6">
          <div className="flex-center mb-4">
            <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '50%', color: '#3b82f6' }}>
              <ScanLine size={40} />
            </div>
          </div>
          <h2 className="text-gradient">Mess QR Code</h2>
          <p>Print or display this QR code for students to scan.</p>
        </div>

        {profile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ padding: '16px', background: 'white', borderRadius: '8px', marginBottom: '16px' }}>
              <QRCodeSVG 
                value={JSON.stringify({ type: 'MESS_VERIFICATION', messId: profile.messId })} 
                size={250}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-muted" style={{ fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center' }}>Mess ID: {profile.messId}</p>
          </div>
        ) : (
          <p>Loading your mess profile...</p>
        )}
      </div>
    </div>
  );
}
