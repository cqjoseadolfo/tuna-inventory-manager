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

    const runtimeEnv = ((globalThis as any).__RUNTIME_ENV || {}) as Record<string, string | undefined>;
    const processEnv = ((globalThis as any).process?.env || {}) as Record<string, string | undefined>;

    const getEnv = (key: string) =>
      runtimeEnv[key] || (globalThis as any)[key] || processEnv[key] || undefined;

    const accessKeyId = getEnv("AWS_ACCESS_KEY_ID");
    const secretAccessKey = getEnv("AWS_SECRET_ACCESS_KEY");
    const region = getEnv("AWS_REGION") || "us-east-1";
    const bucket = getEnv("AWS_S3_BUCKET");
    const endpointOverride = getEnv("AWS_S3_ENDPOINT");
    const publicBaseUrl = getEnv("AWS_S3_PUBLIC_BASE_URL");

    if (!accessKeyId || !secretAccessKey || !bucket) {
      const present = {
        AWS_ACCESS_KEY_ID: Boolean(accessKeyId),
        AWS_SECRET_ACCESS_KEY: Boolean(secretAccessKey),
        AWS_S3_BUCKET: Boolean(bucket),
        AWS_REGION: Boolean(region),
        AWS_S3_PUBLIC_BASE_URL: Boolean(publicBaseUrl),
        AWS_S3_ENDPOINT: Boolean(endpointOverride),
      };
      return NextResponse.json(
        {
          error: "Falta configurar AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_S3_BUCKET en el runtime del Worker",
          present,
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
