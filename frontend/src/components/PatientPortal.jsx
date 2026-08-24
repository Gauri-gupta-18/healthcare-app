import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PatientPortal({ auth, setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [specialisation, setSpecialisation] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Load some default doctors initially
    handleSearch('');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        const res = await axios.post(`${API_URL}/auth/register`, { name, email, password });
        setAuth(res.data);
      } else {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        setAuth(res.data);
      }
      setShowLogin(false);
    } catch (err) {
      alert(isRegistering ? 'Registration failed' : 'Login failed');
    }
  };

  const handleSearch = async (overrideSpec) => {
    const specToSearch = typeof overrideSpec === 'string' ? overrideSpec : specialisation;
    try {
      // Patient doesn't need token to search according to the requirements we built, 
      // but let's pass it if auth exists just in case.
      const headers = auth ? { Authorization: `Bearer ${auth.token}` } : {};
      const res = await axios.get(`${API_URL}/doctors?specialisation=${specToSearch}`, { headers });
      setDoctors(res.data);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const setSpecAndSearch = (spec) => {
    setSpecialisation(spec);
    handleSearch(spec);
  };

  // Extract initials for the avatar
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  };

  return (
    <>
      <div className="hero">
        <h2>Book Appointments with Top Doctors Instantly</h2>
        <p>Access verified physicians, specialist care, and effortless scheduling near you.</p>
      </div>

      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <input 
            type="text" 
            placeholder="Search by Speciality (e.g. Cardiologist)..." 
            value={specialisation} 
            onChange={e => setSpecialisation(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button onClick={handleSearch}>SEARCH</button>
      </div>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px' }}>{isRegistering ? 'Create Account' : 'Patient Login'}</h2>
            <form onSubmit={handleLogin}>
              {isRegistering && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" style={{ width: '100%', marginBottom: '10px' }}>
                {isRegistering ? 'Register & Login' : 'Login Securely'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => setIsRegistering(!isRegistering)}>
                  {isRegistering ? 'Already have an account? Login' : 'New patient? Create Account'}
                </span>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h3 className="section-title">Popular Specialities</h3>
        <div className="grid-4" style={{ marginBottom: '60px' }}>
          {['Cardiologist', 'Pediatrician', 'Dermatologist', 'Neurologist'].map(spec => (
            <div key={spec} className="speciality-card" onClick={() => setSpecAndSearch(spec)}>
              <div className="speciality-icon">🩺</div>
              <h3>{spec}</h3>
            </div>
          ))}
        </div>

        <h3 className="section-title">Top Rated Doctors</h3>
        {doctors.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No doctors found for this speciality.</p>
        ) : (
          <div className="grid-3">
            {doctors.map(doc => (
              <div key={doc.doctor_id} className="doctor-card">
                <div className="doctor-header">
                  <div className="doctor-avatar">{getInitials(doc.name)}</div>
                  <div className="doctor-info">
                    <h3>Dr. {doc.name}</h3>
                    <span className="tag">{doc.specialisation}</span>
                    <div className="doctor-stats">
                      <span>⏱ {doc.slot_duration_minutes} min slots</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  style={{ width: '100%', marginTop: 'auto' }} 
                  onClick={() => {
                    if (!auth) setShowLogin(true);
                    else alert('Booking flow goes here!');
                  }}
                >
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
