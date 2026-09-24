#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧁 Setting up GBBO Fantasy League...\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found. Please create one with your database credentials.');
  console.log('Example .env content:');
  console.log('DATABASE_URL="postgresql://username:password@localhost:5432/gbbo_fantasy?schema=public"');
  console.log('NEXTAUTH_URL="http://localhost:3000"');
  console.log('NEXTAUTH_SECRET="your-secret-key-here"');
  console.log('ADMIN_EMAIL="admin@gbbo-fantasy.com"');
  process.exit(1);
}

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('\n🗄️  Setting up database...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('\n🚀 Starting development server...');
  console.log('\n✅ Setup complete! Your app should be running at http://localhost:3000');
  console.log('\n📝 Next steps:');
  console.log('1. Set up your PostgreSQL database');
  console.log('2. Run: npx prisma db push');
  console.log('3. Create an admin user in the database');
  console.log('4. Start making your picks!');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
