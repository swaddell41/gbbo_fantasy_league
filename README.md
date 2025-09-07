# GBBO Fantasy League 🧁

A fantasy league app for The Great British Bake Off where friends can pick their favorite contestants and compete throughout the season!

## Features

- **User Authentication**: Secure login/registration system
- **Admin Dashboard**: Manage seasons, contestants, and episodes
- **Contestant Management**: Add and manage baker profiles with photos and bios
- **Season Management**: Create and organize different GBBO seasons
- **Responsive Design**: Beautiful UI that works on all devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd gbbo_app
   npm install
   ```

2. **Set up your database:**
   - Create a PostgreSQL database
   - Update the `DATABASE_URL` in `.env` with your database credentials
   - Generate a secure `NEXTAUTH_SECRET` for authentication

3. **Run database migrations:**
   ```bash
   npx prisma migrate dev --name init
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
   - Go to Admin Dashboard → Manage Contestants
   - Select your season
   - Add each contestant with their name, photo, and bio

3. **Set Up Episodes:**
   - Go to Admin Dashboard → Manage Episodes
   - Create weekly episodes for the season

### For Players

1. **Sign Up/Login:**
   - Create your account or sign in
   - You'll be redirected to your dashboard

2. **Make Picks:**
   - Once episodes are available, make your weekly predictions
   - Earn points for correct predictions

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

## Next Steps

This is the foundation of your GBBO Fantasy League! Future features to add:

- [ ] Episode management system
- [ ] Weekly pick submission
- [ ] Scoring system
- [ ] Leaderboard
- [ ] Email notifications
- [ ] Mobile app
- [ ] Social features

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS

## Contributing

This is a private project for you and your friends! Feel free to customize and extend it however you'd like.

## License

Private project - All rights reserved.