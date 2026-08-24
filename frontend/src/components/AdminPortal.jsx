import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPortal({ auth, setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState('manage');
  const [doctors, setDoctors] = useState([]);
  
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPass, setDocPass] = useState('');
  const [docSpec, setDocSpec] = useState('');
  
  const [leaveDoctorId, setLeaveDoctorId] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  
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

  const fetchDoctors = () => {
    axios.get(`${API_URL}/doctors`).then(res => setDoctors(res.data)).catch(console.error);
  };

  useEffect(() => {
    if (auth && auth.user.role === 'admin') fetchDoctors();
  }, [auth]);

  const createDoctor = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/admin/doctors`, {
        name: docName, email: docEmail, password: docPass, specialisation: docSpec
      }, { headers: { Authorization: `Bearer ${auth.token}` } });
      alert('Doctor created successfully');
      setDocName(''); setDocEmail(''); setDocPass(''); setDocSpec('');
      fetchDoctors();
    } catch(err) {
      alert(err.response?.data?.error || 'Failed to create doctor');
    }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    if (!leaveDoctorId) return alert('Select a doctor');
    try {
      const res = await axios.post(`${API_URL}/admin/doctors/${leaveDoctorId}/leave-days`, {
        leave_date: leaveDate
      }, { headers: { Authorization: `Bearer ${auth.token}` } });
      
      alert(`Leave added! ${res.data.cancelled_appointments.length} overlapping appointments were cancelled and patients notified.`);
      setLeaveDate('');
    } catch(err) {
      alert(err.response?.data?.error || 'Failed to add leave');
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
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button className={activeTab === 'manage' ? '' : 'outline'} onClick={() => setActiveTab('manage')}>Manage Doctors</button>
        <button className={activeTab === 'leave' ? '' : 'outline'} onClick={() => setActiveTab('leave')}>Leave Management</button>
      </div>

      {activeTab === 'manage' && (
        <div style={{ display: 'flex', gap: '40px' }}>
          <div style={{ flex: 1 }}>
            <h3>Onboard New Provider</h3>
            <form onSubmit={createDoctor} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={docName} onChange={e => setDocName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={docEmail} onChange={e => setDocEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={docPass} onChange={e => setDocPass(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Specialisation</label>
                <input type="text" value={docSpec} onChange={e => setDocSpec(e.target.value)} placeholder="e.g. Neurologist" required />
              </div>
              <button type="submit" style={{ width: '100%' }}>Create Doctor Profile</button>
            </form>
          </div>
          
          <div style={{ flex: 1 }}>
            <h3>Current Providers</h3>
            <div style={{ marginTop: '20px' }}>
              {doctors.map(doc => (
                <div key={doc.doctor_id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px' }}>
                  <strong>Dr. {doc.name}</strong> <span className="tag">{doc.specialisation}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leave' && (
        <div style={{ maxWidth: '400px' }}>
          <h3>Add Leave Day</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Adding a leave day will automatically cancel all overlapping scheduled appointments and send email notifications to the affected patients.
          </p>
          <form onSubmit={submitLeave}>
            <div className="form-group">
              <label>Select Provider</label>
              <select value={leaveDoctorId} onChange={e => setLeaveDoctorId(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px' }}>
                <option value="">-- Select Doctor --</option>
                {doctors.map(doc => (
                  <option key={doc.doctor_id} value={doc.doctor_id}>Dr. {doc.name} ({doc.specialisation})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Leave Date</label>
              <input type="date" value={leaveDate} min={new Date().toISOString().split('T')[0]} onChange={e => setLeaveDate(e.target.value)} required />
            </div>
            <button type="submit" style={{ width: '100%', background: '#d9534f', borderColor: '#d9534f' }}>Confirm Leave & Cancel Appointments</button>
          </form>
        </div>
      )}
    </div>
  );
}
