export type AssetStatusOption = {
  code: string;
  label: string;
  is_default: number;
  sort_order: number;
};

const FALLBACK_ASSET_STATUSES: AssetStatusOption[] = [
  { code: "en_uso", label: "En uso", is_default: 1, sort_order: 10 },
  { code: "disponible", label: "Disponible", is_default: 0, sort_order: 20 },
  { code: "solicitado", label: "Solicitado", is_default: 0, sort_order: 30 },
  { code: "pendiente_recepcion", label: "Pendiente de aceptar recepcion", is_default: 0, sort_order: 40 },
  { code: "mantenimiento", label: "Mantenimiento", is_default: 0, sort_order: 50 },
  { code: "baja", label: "Baja", is_default: 0, sort_order: 60 },
];

const LEGACY_STATUS_MAP: Record<string, string> = {
  bajo_responsabilidad: "en_uso",
  en_reparacion: "mantenimiento",
};

export const normalizeStatusCode = (value: string) => {
  const normalized = String(value || "").trim().toLowerCase();
  return LEGACY_STATUS_MAP[normalized] || normalized;
};

export const getFallbackAssetStatuses = () => FALLBACK_ASSET_STATUSES;

export const getDefaultAssetStatusCode = (statuses: AssetStatusOption[]) => {
  const byDefault = statuses.find((item) => Number(item.is_default) === 1);
  if (byDefault?.code) return byDefault.code;
  if (statuses.length > 0) return statuses[0].code;
  return "en_uso";
};

export async function getAssetStatusesFromDb(db: any): Promise<AssetStatusOption[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT code, label, is_default, sort_order
         FROM asset_status_catalog
         WHERE is_active = 1
         ORDER BY sort_order ASC, label ASC`
      )
      .all();

    const items = (Array.isArray((rows as any)?.results) ? (rows as any).results : [])
      .map((row: any) => ({
        code: normalizeStatusCode(String(row?.code || "")),
        label: String(row?.label || "").trim(),
        is_default: Number(row?.is_default || 0),
        sort_order: Number(row?.sort_order || 999),
      }))
      .filter((row: AssetStatusOption) => row.code && row.label);

    return items.length > 0 ? items : FALLBACK_ASSET_STATUSES;
  } catch {
    return FALLBACK_ASSET_STATUSES;
  }
}