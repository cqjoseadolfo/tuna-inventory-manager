import { NextResponse } from 'next/server';
import { getDbBinding } from '@/app/lib/db';

export const runtime = 'edge';

// We bind the D1 Database from Cloudflare context
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, picture } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = getDbBinding();

    console.log('Syncing user:', email);

    // 1. Check if user exists
    let user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    let isNewUser = false;

    // 2. If new user, insert them with null nickname
    if (!user) {
      const id = crypto.randomUUID();
      await db.prepare('INSERT INTO users (id, email, full_name, picture, nickname) VALUES (?, ?, ?, ?, ?)')
        .bind(id, email, name, picture, null)
        .run();
      
      user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
      isNewUser = true;
    } else {
      // Opt: update name/picture in case they changed on Google's end
      await db.prepare('UPDATE users SET full_name = ?, picture = ? WHERE email = ?')
        .bind(name, picture, email)
        .run();
      user.full_name = name;
      user.picture = picture;
    }

    // 3. Record the login in login_logs
    const logId = crypto.randomUUID();
    await db.prepare('INSERT INTO login_logs (id, user_id) VALUES (?, ?)')
      .bind(logId, user.id)
      .run();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        picture: user.picture,
        nickname: user.nickname
      },
      isNewUser,
      sessionId: logId
    });

  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
