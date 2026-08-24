import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DoctorPortal({ auth, setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState([]);
  
  // Clinical Notes State
  const [showNotesModal, setShowNotesModal] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  
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

  const fetchAppointments = () => {
    if (auth && auth.user.role === 'doctor') {
      axios.get(`${API_URL}/doctor/appointments`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      }).then(res => setAppointments(res.data)).catch(console.error);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [auth]);

  const submitNotes = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/doctor/appointments/${showNotesModal}/notes`, {
        clinical_notes: clinicalNotes,
        prescription: prescription
      }, { headers: { Authorization: `Bearer ${auth.token}` } });
      
      alert('Notes submitted! AI is generating post-visit summary.');
      setShowNotesModal(null);
      setClinicalNotes('');
      setPrescription('');
      fetchAppointments();
    } catch(err) {
      alert('Failed to submit notes');
    }
  };

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
              <button className="outline" onClick={() => setShowNotesModal(appt.id)}>Enter Clinical Notes</button>
            )}

            {appt.status === 'completed' && appt.patient_summary && (
              <div style={{ background: 'var(--teal-light)', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>AI Post-Visit Summary</h4>
                <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>{appt.patient_summary}</p>
                
                {appt.medication_schedule && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Medications:</strong>
                    <ul style={{ margin: '5px 0 0 20px', fontSize: '0.9rem' }}>
                      {Object.entries(appt.medication_schedule).map(([med, sched]) => (
                        <li key={med}>{med}: {sched}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {appt.follow_up_steps && (
                  <div>
                    <strong>Follow-up Steps:</strong>
                    <ul style={{ margin: '5px 0 0 20px', fontSize: '0.9rem' }}>
                      {appt.follow_up_steps.map((step, idx) => <li key={idx}>{step}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {showNotesModal && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px' }}>Submit Clinical Notes</h2>
            <form onSubmit={submitNotes}>
              <div className="form-group">
                <label>Clinical Notes</label>
                <textarea 
                  rows="4" 
                  value={clinicalNotes} 
                  onChange={e => setClinicalNotes(e.target.value)} 
                  required 
                  placeholder="E.g., Patient presents with acute chest pain..."
                />
              </div>
              <div className="form-group">
                <label>Prescription</label>
                <textarea 
                  rows="3" 
                  value={prescription} 
                  onChange={e => setPrescription(e.target.value)} 
                  required 
                  placeholder="E.g., Aspirin 81mg daily..."
                />
              </div>
              <button type="submit" style={{ width: '100%' }}>Finalize Appointment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
