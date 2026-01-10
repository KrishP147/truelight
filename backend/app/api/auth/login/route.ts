/**
 * POST /api/auth/login
 * 
 * Login with email/username and password
 * 
 * Request body:
 * {
 *   "email": "user@example.com" OR "username": "username",
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
import { 
  getUserByEmail, 
  getUserByUsername, 
  verifyPassword, 
  generateToken, 
  createSession 
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = body;

    // Validation
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!email && !username) {
      return NextResponse.json(
        { error: 'Email or username is required' },
        { status: 400 }
      );
    }

    // Find user by email or username
    let user = null;
    if (email) {
      user = getUserByEmail(email);
    } else if (username) {
      user = getUserByUsername(username);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}

