import { NextResponse } from "next/server";

export const runtime = "edge";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = String(searchParams.get("url") || "").trim();

    if (!rawUrl) {
      return NextResponse.json({ error: "Falta el parámetro url" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return NextResponse.json({ error: "Protocolo no permitido" }, { status: 400 });
    }

    const upstream = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "No se pudo cargar la imagen remota" }, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const bytes = await upstream.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
