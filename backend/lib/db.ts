/**
 * SQLite Database Setup
 * 
 * This file handles database initialization, connection, and schema creation.
 * Uses better-sqlite3 for synchronous SQLite operations.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file path - stored in project root/data directory
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'delta.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create database connection
let db: Database.Database | null = null;

/**
 * Get database instance (singleton pattern)
 */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging for better performance
    initializeSchema(db);
  }
  return db;
}

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
function initializeSchema(database: Database.Database) {
  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      colorblind_type TEXT DEFAULT 'unknown',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sessions table for storing active tokens
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  console.log('✅ Database schema initialized');
}

/**
 * Close database connection (useful for cleanup)
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Type definitions for database rows
 */
export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  colorblind_type: string;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

