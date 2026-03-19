"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";

type AssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";
type EntryMode = "ia" | "manual";

type RecognitionDocumentTypeOption = {
  code: string;
  label: string;
};

interface Props {
  createdByEmail: string;
  createdByLabel: string;
}

interface FormState {
  assetType: AssetType;
  name: string;
  notes: string;
  fabricationYear: string;
  instrumentType: string;
  brand: string;
  issuer: string;
  issueDate: string;
  documentType: string;
  referenceCode: string;
  size: string;
  hasCinta: boolean;
  hasJubon: boolean;
  hasGreguesco: boolean;
}

interface SavedAsset {
  assetId: string;
  assetCode: string;
  assetType: AssetType;
  photoUrl: string;
  notes: string;
  holderName: string;
  tags: string[];
  fabricationYear?: string;
  // instrumento
  instrumentType?: string;
  brand?: string;
  // reconocimiento
  issuer?: string;
  issueDate?: string;
  documentType?: string;
  referenceCode?: string;
  // uniforme
  size?: string;
  hasCinta?: boolean;
  hasJubon?: boolean;
  hasGreguesco?: boolean;
}

const initialState: FormState = {
  assetType: "instrumento",
  name: "",
  notes: "",
  fabricationYear: "",
  instrumentType: "",
  brand: "",
  issuer: "",
  issueDate: "",
  documentType: "",
  referenceCode: "",
  size: "",
  hasCinta: false,
  hasJubon: false,
  hasGreguesco: false,
};

const fc =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-lime-400 focus:bg-white focus:ring-2 focus:ring-lime-200";
const fcWarn =
  "w-full rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-slate-900 outline-none transition focus:border-lime-400 focus:bg-white focus:ring-2 focus:ring-lime-200";

const assetTypeLabel: Record<AssetType, string> = {
  instrumento: "Instrumento",
  reconocimiento: "Reconocimiento",
  uniforme: "Uniforme",
  otro: "Otro",
};

const fallbackRecognitionDocumentTypes: RecognitionDocumentTypeOption[] = [
  { code: "trofeo", label: "Trofeo" },
  { code: "certificado", label: "Certificado" },
  { code: "titulo", label: "Título" },
  { code: "estandarte", label: "Estandarte" },
  { code: "placa", label: "Placa" },
  { code: "medalla", label: "Medalla" },
];

export default function AssetEntryForm({ createdByEmail, createdByLabel }: Props) {
  const [mode, setMode] = useState<EntryMode>("ia");
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hasAiResult, setHasAiResult] = useState(false);
  const [savedAsset, setSavedAsset] = useState<SavedAsset | null>(null);
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [recognitionDocumentTypes, setRecognitionDocumentTypes] = useState<RecognitionDocumentTypeOption[]>(
    fallbackRecognitionDocumentTypes
  );

  useEffect(() => {
    let isMounted = true;

    const loadRecognitionDocumentTypes = async () => {
      try {
        const response = await fetch("/api/recognition-document-types", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) return;

        const items = Array.isArray(data?.items)
          ? data.items
              .map((item: any) => ({
                code: String(item?.code || "").trim().toLowerCase(),
                label: String(item?.label || "").trim(),
              }))
              .filter((item: RecognitionDocumentTypeOption) => item.code && item.label)
          : [];

        if (isMounted && items.length > 0) {
          setRecognitionDocumentTypes(items);
        }
      } catch {
        // Keep fallback catalog when the API is not available.
      }
    };

    loadRecognitionDocumentTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const parseEditableTags = (value: string) =>
    value
      .split(/[,\n]/)
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

  const normalizedTags = useMemo(() => {
    const baseTag =
      form.assetType === "instrumento"
        ? "#instrumentos"
        : form.assetType === "reconocimiento"
          ? "#reconocimientos"
          : form.assetType === "uniforme"
            ? "#uniformes"
            : "#otros";
    const extraTag =
      form.assetType === "instrumento" && form.instrumentType.trim()
        ? `#${form.instrumentType.trim().toLowerCase().replace(/\s+/g, "-")}`
        : null;
    return Array.from(
      new Set([baseTag, extraTag, ...parseEditableTags(tagsInput), ...aiTags].filter(Boolean) as string[])
    );
  }, [form.assetType, form.instrumentType, aiTags, tagsInput]);

  const getFieldClass = (value?: string | number | null) => {
    if (mode !== "ia" || !hasAiResult) return fc;
    return !value || String(value).trim() === "" ? fcWarn : fc;
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev: FormState) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Selecciona una imagen válida."); return; }
    setError(""); setAiMessage(""); setHasAiResult(false); setAiTags([]); setTagsInput("");
    setForm(initialState); setPhotoName(file.name); setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleModeSwitch = (newMode: EntryMode) => {
    setMode(newMode); setError(""); setAiMessage(""); setHasAiResult(false);
    setAiTags([]); setTagsInput(""); setForm(initialState);
    setPhotoName(""); setPhotoFile(null); setPreviewUrl(""); setSavedAsset(null);
  };

  const autofillWithAi = async () => {
    setError(""); setAiMessage("");
    if (!photoFile) { setError("Primero toma o selecciona una foto."); return; }
    try {
      setIsAiLoading(true);
      const formData = new FormData();
      formData.append("file", photoFile);
      const response = await fetch("/api/assets/ai-analyze", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo analizar la foto con IA.");
      const suggestion = data?.suggestion || {};
      const suggestedType = suggestion.assetType as AssetType | undefined;
      setForm((prev: FormState) => ({
        ...prev,
        assetType:
          suggestedType && ["instrumento", "reconocimiento", "uniforme", "otro"].includes(suggestedType)
            ? suggestedType : prev.assetType,
        notes: suggestion.notes || prev.notes,
        instrumentType:
          (suggestedType || prev.assetType) === "instrumento"
            ? suggestion.instrumentType || prev.instrumentType : prev.instrumentType,
        issueDate:
          (suggestedType || prev.assetType) === "reconocimiento"
            ? suggestion.issueDate || prev.issueDate : prev.issueDate,
        documentType:
          (suggestedType || prev.assetType) === "reconocimiento"
            ? (suggestion.documentType || prev.documentType) : prev.documentType,
      }));
      const incomingTags = Array.isArray(suggestion.tags)
        ? suggestion.tags.map((t: string) => String(t || "").trim().toLowerCase()).filter(Boolean) : [];
      const normalizedIncoming = Array.from(
        new Set(incomingTags.map((t: string) => (t.startsWith("#") ? t : `#${t}`)))
      );
      setAiTags(normalizedIncoming); setTagsInput(normalizedIncoming.join(", "));
      setHasAiResult(true); setAiMessage("IA completó los campos detectados en la foto.");
    } catch (err: any) {
      setError(err.message || "Error inesperado al usar IA.");
    } finally { setIsAiLoading(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (!photoFile) { setError("Toma o selecciona una foto principal del activo."); return; }
    try {
      setIsSubmitting(true);
      const photoData = new FormData();
      photoData.append("file", photoFile); photoData.append("assetType", form.assetType);
      const uploadResponse = await fetch("/api/assets/upload-photo", { method: "POST", body: photoData });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadResult?.url) throw new Error(uploadResult?.error || "No se pudo subir la foto.");

      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: form.assetType,
          name: form.name.trim() || undefined,
          photoUrl: uploadResult.url,
          photoId: uploadResult.id,
          fabricationYear: form.fabricationYear ? Number(form.fabricationYear) : null,
          currentValue: 0,
          status: "en_uso",
          notes: form.notes.trim() || null,
          tags: normalizedTags,
          createdByEmail,
          instrument:
            form.assetType === "instrumento"
              ? { instrumentType: form.instrumentType.trim() || null, brand: form.brand.trim() || null } : null,
          recognition:
            form.assetType === "reconocimiento"
              ? { issuer: form.issuer.trim(), issueDate: form.issueDate || null, documentType: form.documentType.trim() || null, referenceCode: form.referenceCode.trim() || null } : null,
          uniform:
            form.assetType === "uniforme"
              ? { size: form.size.trim() || null, hasCinta: form.hasCinta, hasJubon: form.hasJubon, hasGreguesco: form.hasGreguesco } : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar el activo.");

      // Show post-save report
      setSavedAsset({
        assetId: data.assetId,
        assetCode: data.assetCode || "N/D",
        assetType: form.assetType,
        photoUrl: previewUrl,
        notes: form.notes.trim(),
        holderName: data.holderName || createdByLabel,
        tags: normalizedTags,
        fabricationYear: form.fabricationYear || undefined,
        instrumentType: form.instrumentType || undefined,
        brand: form.brand || undefined,
        issuer: form.issuer || undefined,
        issueDate: form.issueDate || undefined,
        documentType: form.documentType || undefined,
        referenceCode: data.referenceCode || form.referenceCode || undefined,
        size: form.size || undefined,
        hasCinta: form.hasCinta || undefined,
        hasJubon: form.hasJubon || undefined,
        hasGreguesco: form.hasGreguesco || undefined,
      });

      // Reset form
      setPhotoName(""); setPhotoFile(null); setPreviewUrl("");
      setHasAiResult(false); setAiMessage(""); setAiTags([]); setTagsInput("");
      setForm((prev: FormState) => ({ ...initialState, assetType: prev.assetType }));
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally { setIsSubmitting(false); }
  };

  // ── POST-SAVE REPORT CARD ──────────────────────────────────────────────────
  if (savedAsset) {
    return (
      <section className="grid gap-4">
        {/* Success banner */}
        <div className="flex items-center gap-3 rounded-2xl bg-lime-50 px-5 py-4 ring-1 ring-lime-200">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-lime-700">Activo registrado correctamente</p>
            <p className="text-sm text-lime-600">Código: <strong>{savedAsset.assetCode}</strong></p>
          </div>
        </div>

        {/* Report card */}
        <div className="rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
          {/* Photo */}
          {savedAsset.photoUrl && (
            <div className="overflow-hidden rounded-t-[2rem]">
              <img src={savedAsset.photoUrl} alt="Foto del activo" className="h-56 w-full object-cover" />
            </div>
          )}

          <div className="p-5">
            {/* Header row: code + edit button */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{assetTypeLabel[savedAsset.assetType]}</p>
                <h2 className="mt-0.5 text-2xl font-black text-slate-900">{savedAsset.assetCode}</h2>
              </div>
              <Link
                href={`/assets/${savedAsset.assetId}`}
                className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                title="Editar activo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </Link>
            </div>

            {/* Details grid */}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {savedAsset.fabricationYear && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Año</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.fabricationYear}</dd>
                </div>
              )}

              {/* Instrumento */}
              {savedAsset.instrumentType && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Instrumento</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.instrumentType}</dd>
                </div>
              )}
              {savedAsset.brand && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Marca</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.brand}</dd>
                </div>
              )}

              {/* Reconocimiento */}
              {savedAsset.issuer && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Emisor</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.issuer}</dd>
                </div>
              )}
              {savedAsset.issueDate && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha de emisión</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.issueDate}</dd>
                </div>
              )}
              {savedAsset.documentType && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo de documento</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.documentType}</dd>
                </div>
              )}
              {savedAsset.referenceCode && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Código de referencia</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.referenceCode}</dd>
                </div>
              )}

              {/* Uniforme */}
              {savedAsset.size && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Talla</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{savedAsset.size}</dd>
                </div>
              )}
              {(savedAsset.hasCinta || savedAsset.hasJubon || savedAsset.hasGreguesco) && (
                <div className="col-span-2 flex flex-wrap gap-2">
                  {savedAsset.hasCinta && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Cinta</span>}
                  {savedAsset.hasJubon && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Jubón</span>}
                  {savedAsset.hasGreguesco && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Gregüesco</span>}
                </div>
              )}

              {/* Notas */}
              {savedAsset.notes && (
                <div className="col-span-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notas</dt>
                  <dd className="mt-0.5 text-slate-700">{savedAsset.notes}</dd>
                </div>
              )}

              {/* Tags */}
              {savedAsset.tags.length > 0 && (
                <div className="col-span-2 flex flex-wrap gap-2">
                  {savedAsset.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Register another */}
        <button
          type="button"
          onClick={() => { setSavedAsset(null); handleModeSwitch("ia"); }}
          className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          + Registrar otro activo
        </button>
      </section>
    );
  }

  // ── PHOTO PICKER (shared) ──────────────────────────────────────────────────
  const PhotoPicker = (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">Foto principal</label>
      <label className="block cursor-pointer">
        <input className="hidden" type="file" accept="image/*" onChange={handlePhotoChange} />
        {previewUrl ? (
          <div className="overflow-hidden rounded-[1.75rem] bg-slate-50 ring-1 ring-slate-200">
            <img src={previewUrl} alt="Vista previa" className="h-64 w-full object-cover" />
            <div className="px-4 py-3 text-sm text-slate-500">{photoName || "Foto cargada"}</div>
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <span className="text-4xl">📷</span>
            <strong className="mt-3 text-lg text-slate-900">Tomar o seleccionar foto</strong>
            <span className="mt-1 text-sm text-slate-500">Desde la cámara o galería del dispositivo</span>
          </div>
        )}
      </label>
    </div>
  );

  return (
    <section className="grid gap-4">
      {/* Header + Mode Toggle */}
      <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-lime-100 text-3xl">🎻</div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Registrar activo</h3>
            <p className="text-sm text-slate-500">
              {mode === "ia" ? "Sube la foto y la IA completa los datos." : "Completa manualmente todos los datos."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => handleModeSwitch("ia")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "ia" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            ✨ Con IA
          </button>
          <button type="button" onClick={() => handleModeSwitch("manual")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "manual" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            ✏️ Manual
          </button>
        </div>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        {/* ── CON IA ── */}
        {mode === "ia" && (
          <>
            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-slate-900">Foto del activo</h4>
                <p className="text-sm text-slate-500">Sube la foto y la IA detectará tipo, notas y etiquetas.</p>
              </div>
              <div className="grid gap-4">
                {PhotoPicker}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={autofillWithAi} disabled={isAiLoading || !photoFile}>
                    {isAiLoading ? "Analizando foto..." : "✨ Generar datos con IA"}
                  </button>
                  <p className="text-sm text-slate-500">La IA detecta tipo, notas y etiquetas sugeridas.</p>
                </div>
                {aiMessage && <p className="text-sm font-medium text-lime-600">{aiMessage}</p>}
              </div>
            </div>

            {hasAiResult && (
              <>
                <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <div className="mb-4">
                    <h4 className="text-xl font-bold text-slate-900">Resultado detectado</h4>
                    <p className="text-sm text-slate-500">Revisa y completa los campos resaltados antes de guardar.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de activo</label>
                      <select className={fc} value={form.assetType} onChange={(e) => update("assetType", e.target.value as AssetType)}>
                        <option value="instrumento">Instrumento</option>
                        <option value="reconocimiento">Reconocimiento</option>
                        <option value="uniforme">Uniforme</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Año de fabricación</label>
                      <input className={getFieldClass(form.fabricationYear)} type="number" min="1800" max="2100" value={form.fabricationYear} onChange={(e) => update("fabricationYear", e.target.value)} placeholder="Ej: 2018" />
                      {!form.fabricationYear.trim() && <p className="mt-1 text-xs text-amber-600">Completa el año o un estimado.</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas del activo</label>
                      <textarea className={`${getFieldClass(form.notes)} min-h-28 resize-y`} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Describe el estado visual o detalles importantes" />
                      {!form.notes.trim() && <p className="mt-1 text-xs text-amber-600">Completa la descripción del activo.</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Tags detectados</label>
                      <textarea className={`${getFieldClass(tagsInput)} min-h-20 resize-y`} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="#madera, #color_negro" />
                      {!tagsInput.trim() && <p className="mt-1 text-xs text-amber-600">Agrega etiquetas del activo.</p>}
                    </div>
                  </div>
                </div>

                {/* Type-specific for IA mode */}
                {(form.assetType === "instrumento" || form.assetType === "reconocimiento" || form.assetType === "uniforme") && (
                  <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <h4 className="mb-4 text-xl font-bold text-slate-900">Información adicional</h4>
                    {form.assetType === "instrumento" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Instrumento</label><input className={getFieldClass(form.instrumentType)} value={form.instrumentType} onChange={(e) => update("instrumentType", e.target.value)} placeholder="Guitarra" />{!form.instrumentType.trim() && <p className="mt-1 text-xs text-amber-600">Indica el tipo de instrumento.</p>}</div>
                        <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Marca</label><input className={getFieldClass(form.brand)} value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Alhambra" />{!form.brand.trim() && <p className="mt-1 text-xs text-amber-600">Completa la marca si la conoces.</p>}</div>
                      </div>
                    )}
                    {form.assetType === "reconocimiento" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Emisor</label><input className={getFieldClass(form.issuer)} value={form.issuer} onChange={(e) => update("issuer", e.target.value)} placeholder="Municipalidad de..." /></div>
                        <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha de emisión</label><input className={getFieldClass(form.issueDate)} type="date" value={form.issueDate} onChange={(e) => update("issueDate", e.target.value)} /></div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de documento</label>
                          <select className={getFieldClass(form.documentType)} value={form.documentType} onChange={(e) => update("documentType", e.target.value)}>
                            <option value="">Selecciona tipo</option>
                            {recognitionDocumentTypes.map((item) => (
                              <option key={item.code} value={item.code}>{item.label}</option>
                            ))}
                          </select>
                        </div>
                        <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Código de referencia</label><input className={getFieldClass(form.referenceCode)} value={form.referenceCode} onChange={(e) => update("referenceCode", e.target.value)} placeholder="REC-2601" /></div>
                      </div>
                    )}
                    {form.assetType === "uniforme" && (
                      <div className="grid gap-4">
                        <div className="max-w-xs"><label className="mb-1.5 block text-sm font-medium text-slate-700">Talla</label><input className={getFieldClass(form.size)} value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="M" /></div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasCinta} onChange={(e) => update("hasCinta", e.target.checked)} /> Cinta</label>
                          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasJubon} onChange={(e) => update("hasJubon", e.target.checked)} /> Jubón</label>
                          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasGreguesco} onChange={(e) => update("hasGreguesco", e.target.checked)} /> Gregüesco</label>
                        </div>
                      </div>
                    )}
                    {form.assetType === "otro" && (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                        Ajusta el tipo, las notas y los tags antes de guardar.
                      </div>
                    )}
                  </div>
                )}

                <button className="inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-5 py-4 text-base font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar activo"}
                </button>
              </>
            )}

            {!hasAiResult && (
              <p className="text-center text-sm text-slate-500">Cuando la IA termine, aquí verás los campos detectados y editables.</p>
            )}
          </>
        )}

        {/* ── MANUAL ── */}
        {mode === "manual" && (
          <>
            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-slate-900">Datos del activo</h4>
                <p className="text-sm text-slate-500">Completa manualmente los datos del activo.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de activo</label>
                  <select className={fc} value={form.assetType} onChange={(e) => update("assetType", e.target.value as AssetType)}>
                    <option value="instrumento">Instrumento</option>
                    <option value="reconocimiento">Reconocimiento</option>
                    <option value="uniforme">Uniforme</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre / Identificador</label>
                  <input className={fc} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Guitarra española TUNA-2018" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Año de fabricación</label>
                  <input className={fc} type="number" min="1800" max="2100" value={form.fabricationYear} onChange={(e) => update("fabricationYear", e.target.value)} placeholder="Ej: 2018" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas del activo</label>
                  <textarea className={`${fc} min-h-28 resize-y`} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Describe el estado visual o detalles importantes" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Etiquetas</label>
                  <textarea className={`${fc} min-h-20 resize-y`} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="#madera, #color_negro, #percusion" />
                  <p className="mt-1 text-xs text-slate-400">Separa con comas o saltos de línea.</p>
                </div>
              </div>
            </div>

            {form.assetType === "instrumento" && (
              <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h4 className="mb-4 text-xl font-bold text-slate-900">Datos del instrumento</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de instrumento</label><input className={fc} value={form.instrumentType} onChange={(e) => update("instrumentType", e.target.value)} placeholder="Guitarra" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Marca</label><input className={fc} value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Alhambra" /></div>
                </div>
              </div>
            )}
            {form.assetType === "reconocimiento" && (
              <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h4 className="mb-4 text-xl font-bold text-slate-900">Datos del reconocimiento</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Emisor</label><input className={fc} value={form.issuer} onChange={(e) => update("issuer", e.target.value)} placeholder="Municipalidad de..." /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha de emisión</label><input className={fc} type="date" value={form.issueDate} onChange={(e) => update("issueDate", e.target.value)} /></div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de documento</label>
                    <select className={fc} value={form.documentType} onChange={(e) => update("documentType", e.target.value)}>
                      <option value="">Selecciona tipo</option>
                      {recognitionDocumentTypes.map((item) => (
                        <option key={item.code} value={item.code}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Código de referencia</label><input className={fc} value={form.referenceCode} onChange={(e) => update("referenceCode", e.target.value)} placeholder="REC-2601" /></div>
                </div>
              </div>
            )}
            {form.assetType === "uniforme" && (
              <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h4 className="mb-4 text-xl font-bold text-slate-900">Datos del uniforme</h4>
                <div className="grid gap-4">
                  <div className="max-w-xs"><label className="mb-1.5 block text-sm font-medium text-slate-700">Talla</label><input className={fc} value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="M" /></div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasCinta} onChange={(e) => update("hasCinta", e.target.checked)} /> Cinta</label>
                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasJubon} onChange={(e) => update("hasJubon", e.target.checked)} /> Jubón</label>
                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasGreguesco} onChange={(e) => update("hasGreguesco", e.target.checked)} /> Gregüesco</label>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-slate-900">Foto del activo</h4>
                <p className="text-sm text-slate-500">Agrega la foto para completar el registro.</p>
              </div>
              {PhotoPicker}
            </div>

            <button className="inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-5 py-4 text-base font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar activo"}
            </button>
          </>
        )}

        {error && <p className="text-sm text-rose-500">{error}</p>}
      </form>
    </section>
  );
}
