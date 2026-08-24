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
  
  // Booking State
  const [showBooking, setShowBooking] = useState(null); // stores doctor object
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [symptoms, setSymptoms] = useState('');
  
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

  useEffect(() => {
    if (showBooking && bookingDate) {
      axios.get(`${API_URL}/appointments/doctors/${showBooking.doctor_id}/slots?date=${bookingDate}`)
        .then(res => setAvailableSlots(res.data.slots))
        .catch(console.error);
    }
  }, [bookingDate, showBooking]);

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return alert('Please select a time slot.');
    
    try {
      await axios.post(`${API_URL}/appointments`, {
        doctor_id: showBooking.doctor_id,
        appointment_date: bookingDate,
        start_time: selectedSlot,
        symptoms
      }, { headers: { Authorization: `Bearer ${auth.token}` } });
      
      alert('Appointment booked! The AI is generating your pre-visit summary for the doctor.');
      setShowBooking(null);
      setBookingDate('');
      setSymptoms('');
      setSelectedSlot('');
    } catch(err) {
      alert(err.response?.data?.error || 'Booking failed');
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
        {!auth && (
          <button 
            className="outline" 
            style={{ marginTop: '20px', background: 'white', color: 'var(--primary-color)' }}
            onClick={() => setShowLogin(true)}
          >
            Login or Register Account
          </button>
        )}
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

      {showBooking && (
        <div className="modal-overlay" onClick={() => setShowBooking(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px' }}>Book Appointment with Dr. {showBooking.name}</h2>
            <form onSubmit={submitBooking}>
              <div className="form-group">
                <label>Select Date</label>
                <input type="date" value={bookingDate} min={new Date().toISOString().split('T')[0]} onChange={e => setBookingDate(e.target.value)} required />
              </div>
              
              {bookingDate && (
                <div className="form-group">
                  <label>Available Slots</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {availableSlots.length === 0 ? (
                      <p style={{ color: 'red' }}>No slots available on this date.</p>
                    ) : (
                      availableSlots.map(slot => (
                        <div 
                          key={slot} 
                          onClick={() => setSelectedSlot(slot)}
                          style={{ 
                            padding: '8px 12px', 
                            border: selectedSlot === slot ? '2px solid var(--primary-color)' : '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: selectedSlot === slot ? 'var(--teal-light)' : 'white'
                          }}
                        >
                          {slot}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>What are your symptoms?</label>
                <textarea 
                  rows="4" 
                  placeholder="Please describe your symptoms so our AI can prepare a pre-visit summary for the doctor..."
                  value={symptoms} 
                  onChange={e => setSymptoms(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" style={{ width: '100%' }}>Confirm Booking</button>
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
                    else setShowBooking(doc);
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
