# GBBO Fantasy League 🧁

A fantasy league app for The Great British Bake Off where friends can pick their favorite contestants and compete throughout the season!

## Features

- **User Authentication**: Secure login/registration system with password reset functionality
- **Admin Dashboard**: Complete management system for seasons, contestants, episodes, and users
- **Fantasy League Gameplay**: 
  - Pick 3 finalists at the start of the season
  - Weekly picks for Star Baker and Elimination
  - Comprehensive scoring system with bonus points
- **Contestant Management**: Add and manage baker profiles with photos and bios
- **Episode Management**: Create and manage episodes with results tracking
- **User Management**: Admin can reset passwords and manage user accounts
- **Responsive Design**: Beautiful UI that works on all devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- SQLite database (or PostgreSQL for production)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/swaddell41/gbbo_fantasy_league.git
   cd gbbo_fantasy_league
   npm install
   ```

2. **Set up your environment:**
   - Copy `.env.example` to `.env`
   - Update the `DATABASE_URL` in `.env` with your database credentials
   - Generate a secure `NEXTAUTH_SECRET` for authentication

3. **Run database migrations:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Create your admin user:**
   ```bash
   npx prisma studio
   ```
   - Open Prisma Studio and manually create a user with `isAdmin: true`
   - Or use the registration endpoint and update the user in the database

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   - Visit `http://localhost:3000`
   - Sign up for a new account
   - If you're the admin, you'll be redirected to the admin dashboard

## Usage

### For Admins

1. **Create a Season:**
   - Go to Admin Dashboard → Manage Seasons
   - Add a new season (e.g., "Season 14", 2024)

2. **Add Contestants:**
   - Go to Admin Dashboard → Contestant Management
   - Select your season
   - Add each contestant with their name, photo, and bio

3. **Set Up Episodes:**
   - Go to Admin Dashboard → Episode Management
   - Create weekly episodes for the season
   - Mark episodes as completed and set results

4. **Manage Users:**
   - Go to Admin Dashboard → User Management
   - Reset passwords for users
   - Delete user accounts if needed

### For Players

1. **Sign Up/Login:**
   - Create your account or sign in
   - You'll be redirected to your dashboard

2. **Make Picks:**
   - Pick your 3 finalists at the start of the season
   - Make weekly picks for Star Baker and Elimination
   - View your current standings on the leaderboard

## Scoring System

### Weekly Picks
- **Star Baker correct**: +3 points
- **Elimination correct**: +2 points
- **Star Baker wrong (eliminated)**: -3 points
- **Elimination wrong (Star Baker)**: -3 points

### Bonus Points (for picked Star Baker)
- **Technical Challenge win**: +1 point
- **Paul Hollywood handshake**: +1 point
- **Soggy bottom comment**: -1 point

### Finalist Picks
- **Correct finalist**: +3 points

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin pages
│   ├── auth/              # Authentication pages
│   ├── api/               # API routes
│   └── dashboard/         # User dashboard
├── components/            # Reusable components
├── lib/                   # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   └── prisma.ts         # Database client
└── prisma/               # Database schema and migrations
```

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS

## Deployment

This app is ready for deployment on Vercel:

1. **Connect to GitHub**: Push your code to GitHub
2. **Deploy on Vercel**: Connect your GitHub repository to Vercel
3. **Set Environment Variables**: Add your production database URL and NextAuth secret
4. **Run Migrations**: Deploy and run `npx prisma migrate deploy`

## Contributing

This is a private project for you and your friends! Feel free to customize and extend it however you'd like.

## License

Private project - All rights reserved.
