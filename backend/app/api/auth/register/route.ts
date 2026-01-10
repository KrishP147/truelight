/**
 * POST /api/auth/register
 * 
 * Register a new user account
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "username": "username",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "id": 1,
 *     "email": "user@example.com",
 *     "username": "username",
 *     "colorblind_type": "unknown"
 *   },
 *   "token": "jwt_token_here"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByUsername, generateToken, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = body;

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, username, password' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password length validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Username validation
    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (getUserByEmail(email)) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    if (getUserByUsername(username)) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser(email, username, password);

    // Generate token
    const token = generateToken(user.id, user.email);
    
    // Create session
    createSession(user.id, token);

    // Return user data (without password)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        colorblind_type: user.colorblind_type,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}

