import { NextResponse } from "next/server";
import { getDbBinding } from "@/app/lib/db";

export const runtime = "edge";

type UserRow = {
  id: string;
  email: string;
  nickname: string | null;
  full_name: string | null;
  picture: string | null;
  profile_picture_url: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  dni: string | null;
  baptism_date: string | null;
  bio: string | null;
  profession: string | null;
  user_rank: string | null;
};

const ALLOWED_RANKS = new Set(["aspirante", "pardillo", "tuno"]);

const normalizeString = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = String(value).trim();
  return parsed.length ? parsed : null;
};

const toResponseUser = (user: UserRow) => ({
  id: user.id,
  email: user.email,
  nickname: user.nickname,
  fullName: user.full_name,
  picture: user.profile_picture_url || user.picture || "",
  profilePictureUrl: user.profile_picture_url,
  firstName: user.first_name,
  lastName: user.last_name,
  birthDate: user.birth_date,
  dni: user.dni,
  baptismDate: user.baptism_date,
  bio: user.bio,
  profession: user.profession,
  userRank: user.user_rank,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = String(searchParams.get("email") || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "email es requerido" }, { status: 400 });
    }

    const db = getDbBinding();
    const user = await db
      .prepare(
        `SELECT
          id,
          email,
          nickname,
          full_name,
          picture,
          profile_picture_url,
          first_name,
          last_name,
          birth_date,
          dni,
          baptism_date,
          bio,
          profession,
          user_rank
        FROM users
        WHERE LOWER(email) = ?`
      )
      .bind(email)
      .first<UserRow>();

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: toResponseUser(user) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "email es requerido" }, { status: 400 });
    }

    const db = getDbBinding();
    const current = await db
      .prepare(
        `SELECT
          id,
          email,
          nickname,
          full_name,
          picture,
          profile_picture_url,
          first_name,
          last_name,
          birth_date,
          dni,
          baptism_date,
          bio,
          profession,
          user_rank
        FROM users
        WHERE LOWER(email) = ?`
      )
      .bind(email)
      .first<UserRow>();

    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const nextFirstName = has("firstName") ? normalizeString(body?.firstName) : current.first_name;
    const nextLastName = has("lastName") ? normalizeString(body?.lastName) : current.last_name;
    const nextBirthDate = has("birthDate") ? normalizeString(body?.birthDate) : current.birth_date;
    const nextDni = has("dni") ? normalizeString(body?.dni) : current.dni;
    const nextBaptismDate = has("baptismDate") ? normalizeString(body?.baptismDate) : current.baptism_date;
    const nextBio = has("bio") ? normalizeString(body?.bio) : current.bio;
    const nextProfession = has("profession") ? normalizeString(body?.profession) : current.profession;
    const nextUserRankRaw = has("userRank") ? normalizeString(body?.userRank)?.toLowerCase() || null : current.user_rank;
    if (has("userRank") && nextUserRankRaw && !ALLOWED_RANKS.has(nextUserRankRaw)) {
      return NextResponse.json({ error: "userRank inválido. Usa: aspirante, pardillo o tuno" }, { status: 400 });
    }
    const nextUserRank = nextUserRankRaw;
    const nextProfilePictureUrl = has("profilePictureUrl")
      ? normalizeString(body?.profilePictureUrl)
      : current.profile_picture_url;

    const shouldRebuildFullName = has("firstName") || has("lastName");
    const nextFullName = shouldRebuildFullName
      ? [nextFirstName, nextLastName].filter(Boolean).join(" ").trim() || null
      : current.full_name;

    await db
      .prepare(
        `UPDATE users
         SET first_name = ?,
             last_name = ?,
             birth_date = ?,
             dni = ?,
             baptism_date = ?,
             bio = ?,
             profession = ?,
             user_rank = ?,
             profile_picture_url = ?,
             full_name = ?
         WHERE id = ?`
      )
      .bind(
        nextFirstName,
        nextLastName,
        nextBirthDate,
        nextDni,
        nextBaptismDate,
        nextBio,
        nextProfession,
        nextUserRank,
        nextProfilePictureUrl,
        nextFullName,
        current.id
      )
      .run();

    const updated = await db
      .prepare(
        `SELECT
          id,
          email,
          nickname,
          full_name,
          picture,
          profile_picture_url,
          first_name,
          last_name,
          birth_date,
          dni,
          baptism_date,
          bio,
          profession,
          user_rank
        FROM users
        WHERE id = ?`
      )
      .bind(current.id)
      .first<UserRow>();

    if (!updated) {
      return NextResponse.json({ error: "No se pudo leer el usuario actualizado" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: toResponseUser(updated) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
