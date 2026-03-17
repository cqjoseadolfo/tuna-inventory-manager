import { NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";

export const runtime = "edge";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const getEnv = (key: string) => {
  const runtimeEnv = ((globalThis as any).__RUNTIME_ENV || {}) as Record<string, string | undefined>;
  const processEnv = ((globalThis as any).process?.env || {}) as Record<string, string | undefined>;
  return runtimeEnv[key] || (globalThis as any)[key] || processEnv[key] || undefined;
};

const extractKeyFromUrl = (url: URL, bucket: string) => {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/^\/+/, "");
  const bucketLower = bucket.toLowerCase();

  // virtual-hosted-style: <bucket>.s3.<region>.amazonaws.com/<key>
  if (host.startsWith(`${bucketLower}.`)) {
    return path;
  }

  // path-style: s3.<region>.amazonaws.com/<bucket>/<key>
  if (path.toLowerCase().startsWith(`${bucketLower}/`)) {
    return path.slice(bucket.length + 1);
  }

  // endpoint override style: <endpoint>/<bucket>/<key>
  return path.toLowerCase().startsWith(`${bucketLower}/`) ? path.slice(bucket.length + 1) : "";
};

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

    // Fallback for private S3 objects: signed GET using runtime AWS credentials.
    let finalResponse = upstream;
    if (!upstream.ok) {
      const accessKeyId = getEnv("AWS_ACCESS_KEY_ID");
      const secretAccessKey = getEnv("AWS_SECRET_ACCESS_KEY");
      const region = getEnv("AWS_REGION");
      const bucket = getEnv("AWS_S3_BUCKET");
      const endpointOverride = getEnv("AWS_S3_ENDPOINT");

      if (accessKeyId && secretAccessKey && region && bucket) {
        const key = extractKeyFromUrl(parsed, bucket);
        if (key) {
          const signedUrl = endpointOverride
            ? `${endpointOverride.replace(/\/$/, "")}/${bucket}/${key}`
            : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

          const aws = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            service: "s3",
          });

          finalResponse = await aws.fetch(signedUrl, {
            method: "GET",
            headers: {
              Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
          });
        }
      }
    }

    if (!finalResponse.ok) {
      return NextResponse.json({ error: "No se pudo cargar la imagen remota" }, { status: finalResponse.status });
    }

    const contentType = finalResponse.headers.get("content-type") || "application/octet-stream";
    const bytes = await finalResponse.arrayBuffer();

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
