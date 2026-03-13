import { NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";

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
    const accessKeyId = ((globalThis as any).AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID) as string | undefined;
    const secretAccessKey = ((globalThis as any).AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY) as string | undefined;
    const region = (((globalThis as any).AWS_REGION || env.AWS_REGION) as string | undefined) || "us-east-1";
    const bucket = ((globalThis as any).AWS_S3_BUCKET || env.AWS_S3_BUCKET) as string | undefined;
    const endpointOverride = ((globalThis as any).AWS_S3_ENDPOINT || env.AWS_S3_ENDPOINT) as string | undefined;
    const publicBaseUrl = ((globalThis as any).AWS_S3_PUBLIC_BASE_URL || env.AWS_S3_PUBLIC_BASE_URL) as string | undefined;

    if (!accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json(
        {
          error: "Falta configurar AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_S3_BUCKET en el runtime del Worker",
        },
        { status: 500 }
      );
    }

    const assetType = String(formData.get("assetType") || "asset").trim().toLowerCase() || "asset";
    const assetCode = String(formData.get("assetCode") || crypto.randomUUID()).trim();

    const ext = (() => {
      if (file.type === "image/jpeg") return "jpg";
      if (file.type === "image/png") return "png";
      if (file.type === "image/webp") return "webp";
      const fromName = file.name?.split(".").pop();
      return fromName ? fromName.toLowerCase() : "jpg";
    })();

    const safeCode = assetCode.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60);
    const key = `assets/${assetType}/${Date.now()}-${safeCode}.${ext}`;

    const objectUrl = endpointOverride
      ? `${endpointOverride.replace(/\/$/, "")}/${bucket}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region,
      service: "s3",
    });

    const putRes = await aws.fetch(objectUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-amz-acl": "public-read",
      },
      body: file.stream(),
    });

    if (!putRes.ok) {
      const body = await putRes.text();
      return NextResponse.json(
        {
          error: `No se pudo subir la imagen a S3 (${putRes.status}): ${body.slice(0, 180)}`,
        },
        { status: 500 }
      );
    }

    const imageId = key;
    const imageUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({ success: true, id: imageId, url: imageUrl });
  } catch (error: any) {
    console.error("Error uploading asset photo:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
