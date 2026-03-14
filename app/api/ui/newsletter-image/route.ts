import { NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";

export const runtime = "edge";

const NEWSLETTER_IMAGE_KEY = "ui/home/newsletter/plan-2026-kid-v1.png";

export async function GET() {
  try {
    const runtimeEnv = ((globalThis as any).__RUNTIME_ENV || {}) as Record<string, string | undefined>;
    const processEnv = ((globalThis as any).process?.env || {}) as Record<string, string | undefined>;

    const getEnv = (key: string) => runtimeEnv[key] || (globalThis as any)[key] || processEnv[key] || undefined;

    const accessKeyId = getEnv("AWS_ACCESS_KEY_ID");
    const secretAccessKey = getEnv("AWS_SECRET_ACCESS_KEY");
    const region = getEnv("AWS_REGION");
    const bucket = getEnv("AWS_S3_BUCKET");
    const endpointOverride = getEnv("AWS_S3_ENDPOINT");

    if (!accessKeyId || !secretAccessKey || !bucket || !region) {
      return NextResponse.json({ error: "Missing AWS credentials or AWS_REGION to read newsletter image" }, { status: 500 });
    }

    const objectUrl = endpointOverride
      ? `${endpointOverride.replace(/\/$/, "")}/${bucket}/${NEWSLETTER_IMAGE_KEY}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${NEWSLETTER_IMAGE_KEY}`;

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region,
      service: "s3",
    });

    const objectRes = await aws.fetch(objectUrl, { method: "GET" });

    if (!objectRes.ok) {
      const body = await objectRes.text();
      return NextResponse.json(
        { error: `Failed loading newsletter image (${objectRes.status}): ${body.slice(0, 180)}` },
        { status: 500 }
      );
    }

    const contentType = objectRes.headers.get("content-type") || "image/png";

    return new Response(objectRes.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
      status: 200,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}
