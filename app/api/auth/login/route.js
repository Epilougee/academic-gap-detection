import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import {
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

// Authenticate user with email and password, then set a signed HTTP-only session cookie
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabase();

    // Special handling for admin account
    if (cleanEmail === 'admin@demo.com') {
      const { data: dbAdmin } = await supabase
        .from('users')
        .select('id, name, email, password_hash, role')
        .eq('email', cleanEmail)
        .single();

      let isAdminValid = false;
      let adminObj = dbAdmin;

      if (dbAdmin) {
        isAdminValid = await verifyPassword(password, dbAdmin.password_hash);
      }
      
      // Default admin fallback credential (demo123)
      if (!isAdminValid && password === 'demo123') {
        isAdminValid = true;
        adminObj = {
          id: dbAdmin?.id || 9999,
          name: dbAdmin?.name || 'System Administrator',
          email: 'admin@demo.com',
          role: 'admin',
        };
      }

      if (isAdminValid && adminObj) {
        const userPayload = {
          id: adminObj.id,
          name: adminObj.name,
          email: adminObj.email,
          role: 'admin',
        };

        const token = await createSessionToken(userPayload);
        const response = NextResponse.json({ user: userPayload });

        response.cookies.set(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
      }
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password_hash, role')
      .eq('email', cleanEmail)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Unable to sign in right now.' },
      { status: 500 }
    );
  }
}

