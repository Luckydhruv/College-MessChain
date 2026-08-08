import React, { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { LogOut, LayoutDashboard, UtensilsCrossed } from 'lucide-react';
import AuthTab from './components/AuthTab';
import StudentTab from './components/StudentTab';
import AdminTab from './components/AdminTab';
import StaffTab from './components/StaffTab';

function Dashboard() {
  const { user, logout, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="flex-center" style={{ height: '100vh' }}>Loading...</div>;
  }

  if (!user) {
    return <AuthTab />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="glass-panel" style={{ 
        width: '260px', 
        borderRadius: '0',
        borderLeft: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div className="flex-center gap-2 mb-8 text-gradient">
          <UtensilsCrossed size={28} />
          <h2 style={{ margin: 0 }}>MessChain</h2>
        </div>

        <nav style={{ flex: 1 }}>
          <div className="btn" style={{ 
            width: '100%', 
            justifyContent: 'flex-start', 
            background: 'var(--glass-highlight)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)'
          }}>
            <LayoutDashboard size={20} /> Dashboard
          </div>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
          <div className="mb-4 text-center">
            <span className="badge badge-primary">{user.role}</span>
            <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>{user.email}</div>
          </div>
          <button className="btn btn-outline" style={{ width: '100%' }} onClick={logout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {user.role === 'STUDENT' && <StudentTab />}
        {user.role === 'ADMIN' && <AdminTab />}
        {user.role === 'STAFF' && <StaffTab />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

export default App;
