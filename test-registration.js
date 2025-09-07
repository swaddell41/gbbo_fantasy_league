// Simple test script to test user registration
const fetch = require('node-fetch');

async function testRegistration() {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  try {
    console.log('🧪 Testing user registration...');
    
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Registration successful:', data);
    } else {
      const error = await response.json();
      console.log('❌ Registration failed:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testRegistration();
}

module.exports = { testRegistration };
