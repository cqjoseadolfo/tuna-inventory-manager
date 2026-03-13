import { NextResponse } from 'next/server';
import { getDbBinding } from '@/app/lib/db';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, nickname } = body;

    if (!email || !nickname) {
      return NextResponse.json({ error: 'Email and nickname are required' }, { status: 400 });
    }

    const db = getDbBinding();

    // Update the user's nickname (Chapa)
    const result = await db.prepare('UPDATE users SET nickname = ? WHERE email = ?')
      .bind(nickname, email)
      .run();

    if (!result.success) {
        throw new Error("Failed to update user record");
    }

    return NextResponse.json({ success: true, nickname });

  } catch (error: any) {
    console.error('Error in onboarding:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
