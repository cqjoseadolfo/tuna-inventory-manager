export type RecognitionDocumentTypeOption = {
  code: string;
  label: string;
  sort_order: number;
  is_active?: number;
};

const FALLBACK_RECOGNITION_DOCUMENT_TYPES: RecognitionDocumentTypeOption[] = [
  { code: "trofeo", label: "Trofeo", sort_order: 10 },
  { code: "certificado", label: "Certificado", sort_order: 20 },
  { code: "titulo", label: "Título", sort_order: 30 },
  { code: "estandarte", label: "Estandarte", sort_order: 40 },
  { code: "placa", label: "Placa", sort_order: 50 },
  { code: "medalla", label: "Medalla", sort_order: 60 },
];

const normalizeCode = (value: unknown) => String(value || "").trim().toLowerCase();

export const getFallbackRecognitionDocumentTypes = () => FALLBACK_RECOGNITION_DOCUMENT_TYPES;

export async function getRecognitionDocumentTypesFromDb(db: any): Promise<RecognitionDocumentTypeOption[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT code, label, sort_order, is_active
         FROM recognition_document_types
         WHERE is_active = 1
         ORDER BY sort_order ASC, label ASC`
      )
      .all();

    const items = (Array.isArray((rows as any)?.results) ? (rows as any).results : [])
      .map((row: any) => ({
        code: normalizeCode(row?.code),
        label: String(row?.label || "").trim(),
        sort_order: Number(row?.sort_order || 999),
        is_active: Number(row?.is_active || 0),
      }))
      .filter((row: RecognitionDocumentTypeOption) => row.code && row.label);

    return items.length > 0 ? items : FALLBACK_RECOGNITION_DOCUMENT_TYPES;
  } catch {
    return FALLBACK_RECOGNITION_DOCUMENT_TYPES;
  }
}
