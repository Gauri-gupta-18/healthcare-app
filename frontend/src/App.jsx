import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import PatientPortal from './components/PatientPortal';
import DoctorPortal from './components/DoctorPortal';
import AdminPortal from './components/AdminPortal';

function App() {
  const [auth, setAuth] = useState(null); // { user, token }

  const handleLogout = () => {
    setAuth(null);
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="app-container">
        <header>
          <Link to="/" className="logo-container">
            <div className="logo-icon">+</div>
            <h1>CareLine</h1>
          </Link>
          <nav>
            {!auth ? (
              <>
                <Link to="/patient">Find Doctors</Link>
                <Link to="/doctor">Provider Login</Link>
                <Link to="/admin">Admin Access</Link>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>
                  Hi, {auth.user.name} 
                  <span className="tag" style={{ marginLeft: '8px' }}>{auth.user.role}</span>
                </span>
                <button className="outline small" onClick={handleLogout}>Log Out</button>
              </>
            )}
          </nav>
        </header>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/patient" replace />} />
            <Route path="/patient" element={<PatientPortal auth={auth} setAuth={setAuth} />} />
            <Route path="/doctor" element={<DoctorPortal auth={auth} setAuth={setAuth} />} />
            <Route path="/admin" element={<AdminPortal auth={auth} setAuth={setAuth} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
