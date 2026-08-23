import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DoctorPortal({ auth, setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState([]);
  
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

  useEffect(() => {
    if (auth && auth.user.role === 'doctor') {
      axios.get(`${API_URL}/doctor/appointments`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      }).then(res => setAppointments(res.data)).catch(console.error);
    }
  }, [auth]);

  if (!auth || auth.user.role !== 'doctor') {
    return (
      <div className="portal-card" style={{ maxWidth: '400px', marginTop: '60px' }}>
        <h2 style={{ textAlign: 'center', borderBottom: 'none' }}>Provider Login</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px' }}>Access your clinical dashboard.</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Provider Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Secure Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="portal-card" style={{ maxWidth: '1000px' }}>
      <h2 style={{ marginBottom: '30px' }}>Clinical Dashboard</h2>
      
      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        appointments.map(appt => (
          <div key={appt.id} className="appointment-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{appt.patient_name}</h3>
              <span className="tag" style={{ background: appt.status === 'scheduled' ? 'var(--teal-light)' : '#f0f0f0' }}>
                {appt.status.toUpperCase()}
              </span>
            </div>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
              <strong>Date:</strong> {new Date(appt.appointment_date).toDateString()} | <strong>Time:</strong> {appt.start_time}
            </p>
            
            <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>AI Pre-visit Summary</h4>
              <p style={{ margin: '0 0 5px 0' }}><strong>Urgency:</strong> {appt.urgency || 'N/A'}</p>
              <p style={{ margin: 0 }}><strong>Complaint:</strong> {appt.chief_complaint || 'N/A'}</p>
            </div>

            {appt.status === 'scheduled' && (
              <button className="outline">Enter Clinical Notes</button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
