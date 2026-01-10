# Database Setup and Usage Guide

This guide explains how to use the SQLite database in the Delta project for authentication and user management.

## Overview

The backend uses **SQLite** with `better-sqlite3` for storing user data and authentication sessions. The database is automatically initialized when the backend starts.

## Database Location

- **Database File**: `backend/data/delta.db`
- **Directory**: `backend/data/` (created automatically)

## Database Schema

### Users Table

Stores user account information:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  colorblind_type TEXT DEFAULT 'unknown',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Columns:**
- `id`: Unique user identifier (auto-increment)
- `email`: User's email address (unique, required)
- `username`: User's username (unique, required)
- `password_hash`: Bcrypt hashed password (required)
- `colorblind_type`: User's colorblindness type (default: 'unknown')
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### Sessions Table

Stores active authentication sessions:

```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

**Columns:**
- `id`: Unique session identifier
- `user_id`: Foreign key to users table
- `token`: JWT token string (unique)
- `expires_at`: Token expiration timestamp
- `created_at`: Session creation timestamp

## How to Use the Database

### 1. Database Connection

The database connection is managed through `backend/lib/db.ts`:

```typescript
import { getDb } from '@/lib/db';

const db = getDb(); // Gets database instance (singleton pattern)
```

### 2. Basic Database Operations

#### Creating a User

```typescript
import { createUser } from '@/lib/auth';

const user = await createUser('user@example.com', 'username', 'password123');
// Returns: UserRow with id, email, username, password_hash, etc.
```

#### Querying Users

```typescript
import { getUserByEmail, getUserByUsername, getUserById } from '@/lib/auth';

// Get user by email
const user = getUserByEmail('user@example.com');

// Get user by username
const user = getUserByUsername('username');

// Get user by ID
const user = getUserById(1);
```

#### Raw SQL Queries

For custom queries, use the database instance directly:

```typescript
import { getDb } from '@/lib/db';

const db = getDb();

// Prepared statement (recommended for performance and security)
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get('user@example.com');

// Multiple rows
const stmt = db.prepare('SELECT * FROM users WHERE colorblind_type = ?');
const users = stmt.all('protanopia');

// Transactions
const transaction = db.transaction((users) => {
  const stmt = db.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)');
  for (const user of users) {
    stmt.run(user.email, user.username, user.passwordHash);
  }
});

transaction([
  { email: 'user1@example.com', username: 'user1', passwordHash: '...' },
  { email: 'user2@example.com', username: 'user2', passwordHash: '...' },
]);
```

### 3. Authentication Operations

#### Register a New User

```typescript
import { createUser, hashPassword } from '@/lib/auth';

const passwordHash = await hashPassword('password123');
const user = await createUser('user@example.com', 'username', passwordHash);
```

#### Verify Password

```typescript
import { verifyPassword } from '@/lib/auth';

const isValid = await verifyPassword('password123', storedHash);
// Returns: true or false
```

#### Generate JWT Token

```typescript
import { generateToken } from '@/lib/auth';

const token = generateToken(userId, email);
// Returns: JWT token string
```

#### Verify JWT Token

```typescript
import { verifyToken } from '@/lib/auth';

const decoded = verifyToken(token);
// Returns: { userId: number, email: string } or null
```

#### Session Management

```typescript
import { createSession, verifySession, deleteSession, cleanupExpiredSessions } from '@/lib/auth';

// Create a session
createSession(userId, token);

// Verify session exists and is valid
const isValid = verifySession(token);

// Delete a session (logout)
deleteSession(token);

// Clean up expired sessions (run periodically)
cleanupExpiredSessions();
```

## API Endpoints

### Authentication Endpoints

1. **POST `/api/auth/register`** - Register a new user
   ```json
   {
     "email": "user@example.com",
     "username": "username",
     "password": "password123"
   }
   ```

2. **POST `/api/auth/login`** - Login with email/username and password
   ```json
   {
     "email": "user@example.com",  // OR "username": "username"
     "password": "password123"
   }
   ```

3. **POST `/api/auth/logout`** - Logout (requires Authorization header)
   ```
   Authorization: Bearer <token>
   ```

4. **GET `/api/auth/me`** - Get current user info (requires Authorization header)
   ```
   Authorization: Bearer <token>
   ```

## Database Maintenance

### Viewing the Database

You can use SQLite command-line tools or a GUI tool:

```bash
# Using sqlite3 CLI
sqlite3 backend/data/delta.db

# In SQLite shell:
.tables              # List all tables
.schema users        # View table schema
SELECT * FROM users; # Query data
.exit                # Exit
```

### GUI Tools

- **DB Browser for SQLite**: https://sqlitebrowser.org/
- **TablePlus**: https://tableplus.com/
- **VS Code Extension**: "SQLite Viewer" or "SQLite"

### Backup Database

```bash
# Copy the database file
cp backend/data/delta.db backend/data/delta.db.backup

# Or use SQLite backup command
sqlite3 backend/data/delta.db ".backup 'backend/data/delta.db.backup'"
```

### Reset Database

```bash
# Delete the database file (will be recreated on next server start)
rm backend/data/delta.db
rm backend/data/delta.db-wal  # WAL file (if exists)
rm backend/data/delta.db-shm  # Shared memory file (if exists)
```

## Common Tasks

### 1. Check All Users

```typescript
const db = getDb();
const stmt = db.prepare('SELECT id, email, username, colorblind_type, created_at FROM users');
const users = stmt.all();
console.log(users);
```

### 2. Update User's Colorblind Type

```typescript
const db = getDb();
const stmt = db.prepare('UPDATE users SET colorblind_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
stmt.run('protanopia', userId);
```

### 3. Count Active Sessions

```typescript
const db = getDb();
const stmt = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime('now')");
const result = stmt.get();
console.log(`Active sessions: ${result.count}`);
```

### 4. Delete Expired Sessions

```typescript
import { cleanupExpiredSessions } from '@/lib/auth';
cleanupExpiredSessions();
```

### 5. Find Users Created in Last 7 Days

```typescript
const db = getDb();
const stmt = db.prepare("SELECT * FROM users WHERE created_at > datetime('now', '-7 days')");
const recentUsers = stmt.all();
```

## Security Best Practices

1. **Password Hashing**: Always use `hashPassword()` before storing passwords
2. **Prepared Statements**: Use prepared statements to prevent SQL injection
3. **Input Validation**: Validate all user inputs before database operations
4. **Token Expiration**: Sessions expire after 7 days (configurable)
5. **Database Location**: The `data/` directory is in `.gitignore` to prevent committing the database

## Migration to Production Database

For production, you may want to migrate to PostgreSQL or MySQL:

1. **PostgreSQL**: Use `pg` library
2. **MySQL**: Use `mysql2` library
3. **Connection Pooling**: Use connection pooling for better performance
4. **Environment Variables**: Store database credentials in environment variables

Example migration pattern:

```typescript
// backend/lib/db.ts
const dbType = process.env.DATABASE_TYPE || 'sqlite';

if (dbType === 'postgresql') {
  // PostgreSQL connection
} else {
  // SQLite connection (current)
}
```

## Troubleshooting

### Database Locked Error

If you see "database is locked" errors:
1. Make sure only one instance of the server is running
2. Check for stale database connections
3. Restart the server

### Database File Not Found

The database file is created automatically on first use. If it's missing:
1. Ensure the `data/` directory exists (created automatically)
2. Check file permissions
3. Verify the database path in `backend/lib/db.ts`

### Performance Issues

1. **Use Indexes**: Indexes are automatically created on email, username, and token fields
2. **Transactions**: Use transactions for multiple related operations
3. **Prepared Statements**: Always use prepared statements for repeated queries
4. **Connection Pooling**: For production, consider connection pooling

## Testing the Database

You can test database operations directly:

```typescript
// backend/test-db.ts (temporary test file)
import { createUser, getUserByEmail, verifyPassword } from './lib/auth';
import { cleanupExpiredSessions } from './lib/auth';

async function test() {
  // Create a test user
  const user = await createUser('test@example.com', 'testuser', 'password123');
  console.log('Created user:', user);

  // Retrieve the user
  const retrieved = getUserByEmail('test@example.com');
  console.log('Retrieved user:', retrieved);

  // Verify password
  const isValid = await verifyPassword('password123', user.password_hash);
  console.log('Password valid:', isValid);

  // Cleanup expired sessions
  cleanupExpiredSessions();
  console.log('Cleaned up expired sessions');
}

test();
```

Run with: `npx tsx backend/test-db.ts` (requires `tsx` package)

## Next Steps

- Add more tables as needed (e.g., user preferences, detection history)
- Implement database migrations for schema changes
- Add database seed scripts for development
- Set up database backups for production

