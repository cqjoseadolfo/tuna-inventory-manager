import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen supera el límite de 8MB" }, { status: 400 });
    }

    const env = (globalThis as any).process?.env || {};
    const accountId = ((globalThis as any).CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID) as string | undefined;
    const apiToken = ((globalThis as any).CLOUDFLARE_IMAGES_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN || env.CLOUDFLARE_API_TOKEN) as
      | string
      | undefined;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        {
          error:
            "Falta configurar CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_IMAGES_API_TOKEN (o CLOUDFLARE_API_TOKEN) en el runtime del Worker",
        },
        { status: 500 }
      );
    }

    const uploadData = new FormData();
    uploadData.append("file", file, file.name || "asset-photo.jpg");
    uploadData.append("requireSignedURLs", "false");

    const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: uploadData,
    });

    const cfJson = (await cfResponse.json()) as any;

    if (!cfResponse.ok || !cfJson?.success || !cfJson?.result?.id) {
      return NextResponse.json(
        {
          error: cfJson?.errors?.[0]?.message || "No se pudo subir la imagen a Cloudflare Images",
        },
        { status: 500 }
      );
    }

    const imageId = cfJson.result.id as string;
    const imageUrl = Array.isArray(cfJson.result.variants) && cfJson.result.variants.length > 0 ? cfJson.result.variants[0] : null;

    if (!imageUrl) {
      return NextResponse.json({ error: "Cloudflare no devolvió URL de la imagen" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: imageId, url: imageUrl });
  } catch (error: any) {
    console.error("Error uploading asset photo:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
