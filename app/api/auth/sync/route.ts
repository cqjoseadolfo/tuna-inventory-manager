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
    let user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>();
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
      // Keep Google image fresh, but do not overwrite profile fields maintained by user.
      await db.prepare('UPDATE users SET picture = ? WHERE email = ?')
        .bind(picture, email)
        .run();

      // If full_name is still empty, seed it with Google name.
      if (!user.full_name && name) {
        await db.prepare('UPDATE users SET full_name = ? WHERE email = ?')
          .bind(name, email)
          .run();
        user.full_name = name;
      }

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
        picture: user.profile_picture_url || user.picture,
        nickname: user.nickname,
        firstName: user.first_name || null,
        lastName: user.last_name || null,
        birthDate: user.birth_date || null,
        dni: user.dni || null,
        baptismDate: user.baptism_date || null,
        bio: user.bio || null,
        profession: user.profession || null,
        userRank: user.user_rank || null
      },
      isNewUser,
      sessionId: logId
    });

  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
