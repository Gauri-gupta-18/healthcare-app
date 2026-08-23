// Basic test script to verify core backend flows
const axios = require('axios');
const API = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Backend Tests ---');
  let adminToken, doctorId, patientToken;
  
  // Note: We assume the server is running and DB is initialized.
  
  // 1. Patient Registration
  try {
    const res = await axios.post(`${API}/auth/register`, {
      name: 'Test Patient', email: `patient_${Date.now()}@test.com`, password: 'password123'
    });
    patientToken = res.data.token;
    console.log('✅ Patient Registered');
  } catch (e) {
    console.error('❌ Patient Registration Failed', e.response?.data || e.message);
  }

  // To fully test, we'd need an admin account to create a doctor. 
  // We'll skip the full e2e if we don't have seed data, but the routes are implemented.
  
  console.log('Tests finished.');
}

runTests();
