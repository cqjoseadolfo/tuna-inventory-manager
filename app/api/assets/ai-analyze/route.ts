import { NextResponse } from "next/server";

export const runtime = "edge";

type SuggestedAssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";

type AiSuggestion = {
  assetType?: SuggestedAssetType;
  notes?: string | null;
  instrumentType?: string | null;
  issueDate?: string | null;
  documentType?: string | null;
  tags?: string[];
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
};

const extractJsonObject = (text: string): AiSuggestion | null => {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const slice = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
};

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
};

const allowedRecognitionDocumentTypes = new Set([
  "trofeo",
  "certificado",
  "titulo",
  "estandarte",
  "placa",
  "medalla",
]);

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
    const getEnv = (key: string) => runtimeEnv[key] || (globalThis as any)[key] || processEnv[key] || undefined;

    const aiProvider = (getEnv("AI_PROVIDER") || "").toLowerCase();
    const geminiApiKey = getEnv("GEMINI_API_KEY");
    const geminiModel = getEnv("GEMINI_MODEL") || "gemini-3.1-flash-lite-preview";

    const openAiKey = getEnv("OPENAI_API_KEY");
    const openAiBaseUrl = getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1";
    const openAiModel = getEnv("OPENAI_MODEL") || "gpt-4.1-mini";

    if (!geminiApiKey && !openAiKey) {
      return NextResponse.json(
        {
          error: "Falta GEMINI_API_KEY u OPENAI_API_KEY en el runtime del Worker",
        },
        { status: 500 }
      );
    }

    const imageBytes = await file.arrayBuffer();
    const base64 = toBase64(new Uint8Array(imageBytes));
    const dataUrl = `data:${file.type};base64,${base64}`;

    const prompt = `Analiza la imagen de un activo de inventario musical y responde SOLO JSON valido con esta estructura:
{
  "assetType": "instrumento|reconocimiento|uniforme|otro",
  "notes": "descripcion corta del estado visual: limpio, golpes, rayones, faltantes, deterioro, etc",
  "instrumentType": "si es instrumento, nombre exacto del instrumento segun tu conocimiento (charango, bandurria, laud, guitarra, violin, pandereta, etc) o null",
  "issueDate": "si parece reconocimiento con fecha legible usar YYYY-MM-DD, si no null",
  "documentType": "si es reconocimiento usar una opcion exacta: trofeo|certificado|titulo|estandarte|placa|medalla; si no aplica null",
  "tags": ["#color_negro", "#madera", "#instrumento_cuerdas", "#percusion", ...]
}

Instrucciones:
- Identifica el instrumento usando tu propio conocimiento entrenado. No asumas nada por el contexto; si ves un charango, di charango; si ves una guitarra, di guitarra, etc.
- Solo si despues de analizar visualmente aun tienes duda genuina entre si el instrumento es una BANDURRIA o una BANDOLA (son visualmente similares), aplica este criterio de desempate: la bandurria tiene caja mas plana y mastil mas corto y ancho con 12 cuerdas y trastes muy juntos; la bandola tiende a tener caja mas profunda y mastil ligeramente mas largo. En ese caso especifico y solo ese, si aun hay duda, prefiere bandurria porque el contexto es una tuna universitaria espanola.
- Si no estas seguro del tipo de activo (instrumento/reconocimiento/uniforme/otro), usa "otro".
- Si es uniforme, deja instrumentType null e issueDate null.
- Si es reconocimiento, intenta proponer documentType usando exactamente una opcion del catalogo.
- Incluye tags de colores visibles, material y clasificacion musical cuando aplique.
- No agregues texto fuera del JSON.`;

    let rawText = "";


    const shouldUseGemini = aiProvider === "gemini" || (!!geminiApiKey && aiProvider !== "openai");

    if (shouldUseGemini && geminiApiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.2,
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      });

      const geminiData = await geminiResponse.json();
      if (!geminiResponse.ok) {
        const message = geminiData?.error?.message || "No se pudo analizar la imagen con Gemini";
        return NextResponse.json({ error: message }, { status: 500 });
      }

      rawText = geminiData?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("\n") || "";
    } else {
      const response = await fetch(`${openAiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message || "No se pudo analizar la imagen con IA";
        return NextResponse.json({ error: message }, { status: 500 });
      }

      rawText = data?.choices?.[0]?.message?.content || "";
    }

    const parsed = extractJsonObject(rawText);

    if (!parsed) {
      return NextResponse.json({ error: "La IA devolvió una respuesta inválida" }, { status: 500 });
    }

    const allowedTypes: SuggestedAssetType[] = ["instrumento", "reconocimiento", "uniforme", "otro"];
    const assetType = allowedTypes.includes(parsed.assetType as SuggestedAssetType)
      ? (parsed.assetType as SuggestedAssetType)
      : "otro";

    const payload: AiSuggestion = {
      assetType,
      notes: String(parsed.notes || "").trim() || null,
      instrumentType: String(parsed.instrumentType || "").trim() || null,
      issueDate: String(parsed.issueDate || "").trim() || null,
      documentType: (() => {
        const normalized = String(parsed.documentType || "").trim().toLowerCase();
        return allowedRecognitionDocumentTypes.has(normalized) ? normalized : null;
      })(),
      tags: normalizeTags(parsed.tags),
    };

    return NextResponse.json({ success: true, suggestion: payload });
  } catch (error: any) {
    console.error("Error analyzing asset image with AI:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
