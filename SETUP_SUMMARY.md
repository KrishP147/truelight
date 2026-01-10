# Login Page & Database Setup - Quick Start Guide

## ✅ What Has Been Set Up

### Backend (SQLite Database)
- ✅ SQLite database with `better-sqlite3`
- ✅ User authentication system with JWT tokens
- ✅ Password hashing with bcryptjs
- ✅ Session management
- ✅ API endpoints:
  - `POST /api/auth/register` - Create new account
  - `POST /api/auth/login` - Login
  - `POST /api/auth/logout` - Logout
  - `GET /api/auth/me` - Get current user

### Mobile App
- ✅ Login/Register page (`/login`)
- ✅ Authentication context for app-wide auth state
- ✅ Protected routes (redirects to login if not authenticated)
- ✅ AsyncStorage for token persistence
- ✅ Logout functionality

## 🚀 How to Test

### 1. Start the Backend

```bash
cd backend
npm run dev
```

The database will be automatically created at `backend/data/delta.db` on first run.

**Important**: The backend should be running on `http://localhost:3000` (or your configured IP).

### 2. Start the Mobile App

```bash
cd mobile
npx expo start
```

### 3. Test Login/Register

1. Open the app - you'll be redirected to the login page
2. Switch to "REGISTER" tab
3. Create a new account:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123` (min 6 characters)
4. After registration, you'll be logged in automatically
5. You'll see the main screen with your username displayed
6. Try logging out and logging back in

### 4. Verify Database

The database is automatically created. To view it:

```bash
# Install sqlite3 CLI (if not installed)
brew install sqlite3  # macOS
# or download from https://www.sqlite.org/download.html

# Open the database
sqlite3 backend/data/delta.db

# View users table
SELECT * FROM users;

# View sessions table
SELECT * FROM sessions;

# Exit
.exit
```

## 📁 Database Files

- **Database**: `backend/data/delta.db`
- **WAL file**: `backend/data/delta.db-wal` (auto-created)
- **SHM file**: `backend/data/delta.db-shm` (auto-created)

These files are in `.gitignore` and won't be committed to version control.

## 🔧 Key Database Operations

### Using the Database in Code

See `DATABASE_SETUP.md` for detailed examples. Quick reference:

```typescript
// In backend/lib/auth.ts or API routes
import { getUserByEmail, createUser, verifyPassword } from '@/lib/auth';

// Create user
const user = await createUser('email@example.com', 'username', 'password');

// Get user
const user = getUserByEmail('email@example.com');

// Verify password
const isValid = await verifyPassword('password', user.password_hash);
```

### Raw SQL Queries

```typescript
import { getDb } from '@/lib/db';

const db = getDb();

// Query users
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get('email@example.com');

// Update user
const stmt = db.prepare('UPDATE users SET colorblind_type = ? WHERE id = ?');
stmt.run('protanopia', userId);

// Delete user
const stmt = db.prepare('DELETE FROM users WHERE id = ?');
stmt.run(userId);
```

## 🔐 Authentication Flow

1. **Registration/Login**: User credentials are sent to `/api/auth/register` or `/api/auth/login`
2. **Token Generation**: Backend generates a JWT token and stores it in the sessions table
3. **Token Storage**: Mobile app stores the token in AsyncStorage
4. **Protected Routes**: Token is sent in `Authorization: Bearer <token>` header
5. **Token Validation**: Backend validates token on each protected request
6. **Logout**: Token is removed from sessions table and AsyncStorage

## 📝 API Examples

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🐛 Troubleshooting

### Database Not Created

- Ensure `backend/data/` directory exists (created automatically)
- Check file permissions
- Verify `better-sqlite3` is installed: `npm list better-sqlite3`

### Login Not Working

- Check backend is running on correct URL (check `mobile/.env`)
- Verify API endpoint is accessible: `curl http://YOUR_IP:3000/api/health`
- Check backend logs for errors
- Verify database file exists: `ls -la backend/data/delta.db`

### Token Not Persisting

- Check AsyncStorage is installed: `npm list @react-native-async-storage/async-storage`
- Verify token is stored: Check AsyncStorage in React Native Debugger
- Clear AsyncStorage: `await AsyncStorage.clear()` in code

### "Database is locked" Error

- Only run one instance of the backend at a time
- Check for stale database connections
- Restart the backend server

## 📚 Additional Resources

- **Detailed Database Guide**: See `DATABASE_SETUP.md`
- **Database Schema**: Check `backend/lib/db.ts` for table definitions
- **Auth Functions**: See `backend/lib/auth.ts` for all authentication utilities
- **Mobile Auth Service**: See `mobile/services/auth.ts` for mobile auth functions

## 🎯 Next Steps

1. **Test the login flow** end-to-end
2. **Verify database** contains user records
3. **Test protected routes** (should redirect to login if not authenticated)
4. **Test logout** (should clear session and redirect to login)
5. **Customize** the login page styling or add more fields
6. **Add more database tables** as needed (see `DATABASE_SETUP.md`)

## 💡 Pro Tips

1. **Database GUI**: Use DB Browser for SQLite or TablePlus for easier database management
2. **Development**: Reset the database by deleting `backend/data/delta.db` and restarting the server
3. **Production**: Consider migrating to PostgreSQL or MySQL (see `DATABASE_SETUP.md`)
4. **Security**: The JWT secret is in `.env.local` - change it in production!

---

**Everything is ready! Start the backend and mobile app to begin testing.**

