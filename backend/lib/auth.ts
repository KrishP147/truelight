/**
 * Authentication Utilities
 * 
 * Handles password hashing, JWT token generation, and validation.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, UserRow } from './db';

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'delta-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): UserRow | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as UserRow | null;
}

/**
 * Get user by username
 */
export function getUserByUsername(username: string): UserRow | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as UserRow | null;
}

/**
 * Get user by ID
 */
export function getUserById(id: number): UserRow | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as UserRow | null;
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  username: string,
  password: string,
): Promise<UserRow> {
  const db = getDb();
  const passwordHash = await hashPassword(password);
  
  const stmt = db.prepare(`
    INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(email, username, passwordHash);
  
  const user = getUserById(result.lastInsertRowid as number);
  if (!user) {
    throw new Error('Failed to create user');
  }
  
  return user;
}

/**
 * Create a session (store token in database)
 */
export function createSession(userId: number, token: string): void {
  const db = getDb();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  const stmt = db.prepare(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(userId, token, expiresAt.toISOString());
}

/**
 * Verify session token exists and is valid
 */
export function verifySession(token: string): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `);
  
  const session = stmt.get(token);
  return !!session;
}

/**
 * Delete a session (logout)
 */
export function deleteSession(token: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  stmt.run(token);
}

/**
 * Clean up expired sessions (can be run periodically)
 */
export function cleanupExpiredSessions(): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
  stmt.run();
}

