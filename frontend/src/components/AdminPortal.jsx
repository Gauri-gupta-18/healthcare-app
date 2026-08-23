import React, { useState } from 'react';
import axios from 'axios';

export default function AdminPortal({ auth, setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      setAuth(res.data);
    } catch (err) {
      alert('Login failed');
    }
  };

  if (!auth || auth.user.role !== 'admin') {
    return (
      <div className="portal-card" style={{ maxWidth: '400px', marginTop: '60px' }}>
        <h2 style={{ textAlign: 'center', borderBottom: 'none' }}>System Admin Login</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px' }}>Access platform settings.</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Admin Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Admin Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" style={{ width: '100%' }}>Secure Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="portal-card" style={{ maxWidth: '1000px' }}>
      <h2 style={{ marginBottom: '30px' }}>Admin Dashboard</h2>
      <div className="grid-3">
        <div className="speciality-card" style={{ padding: '30px' }}>
          <div className="speciality-icon">👨‍⚕️</div>
          <h3 style={{ marginBottom: '10px' }}>Manage Doctors</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Onboard new providers and edit profiles.</p>
          <button className="outline small" style={{ width: '100%' }}>Manage</button>
        </div>
        
        <div className="speciality-card" style={{ padding: '30px' }}>
          <div className="speciality-icon">📅</div>
          <h3 style={{ marginBottom: '10px' }}>Leave Management</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Block calendar days and cancel slots.</p>
          <button className="outline small" style={{ width: '100%' }}>Manage</button>
        </div>

        <div className="speciality-card" style={{ padding: '30px' }}>
          <div className="speciality-icon">⚙️</div>
          <h3 style={{ marginBottom: '10px' }}>System Logs</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>View background jobs and LLM errors.</p>
          <button className="outline small" style={{ width: '100%' }}>View Logs</button>
        </div>
      </div>
    </div>
  );
}
