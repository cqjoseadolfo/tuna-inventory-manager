"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

type AssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";
interface Props {
  createdByEmail: string;
  createdByLabel: string;
}

interface FormState {
  assetType: AssetType;
  notes: string;
  instrumentType: string;
  brand: string;
  fabricationYear: string;
  issuer: string;
  issueDate: string;
  documentType: string;
  referenceCode: string;
  size: string;
  hasCinta: boolean;
  hasJubon: boolean;
  hasGreguesco: boolean;
}

const initialState: FormState = {
  assetType: "instrumento",
  notes: "",
  instrumentType: "",
  brand: "",
  fabricationYear: "",
  issuer: "",
  issueDate: "",
  documentType: "",
  referenceCode: "",
  size: "",
  hasCinta: false,
  hasJubon: false,
  hasGreguesco: false,
};

export default function AssetEntryForm({ createdByEmail, createdByLabel }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hasAiResult, setHasAiResult] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

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

    return Array.from(new Set([baseTag, extraTag, ...parseEditableTags(tagsInput), ...aiTags].filter(Boolean) as string[]));
  }, [form.assetType, form.instrumentType, aiTags, tagsInput]);

  const fieldClass = (value?: string | number | null) => {
    const isMissing = hasAiResult && (!value || String(value).trim() === "");
    return isMissing
      ? "w-full rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-slate-900 outline-none transition focus:border-lime-400 focus:bg-white focus:ring-2 focus:ring-lime-200"
      : "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-lime-400 focus:bg-white focus:ring-2 focus:ring-lime-200";
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev: FormState) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }

    setError("");
    setMessage("");
    setAiMessage("");
    setHasAiResult(false);
    setAiTags([]);
    setTagsInput("");
    setForm(initialState);
    setPhotoName(file.name);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const autofillWithAi = async () => {
    setError("");
    setAiMessage("");

    if (!photoFile) {
      setError("Primero toma o selecciona una foto.");
      return;
    }

    try {
      setIsAiLoading(true);

      const formData = new FormData();
      formData.append("file", photoFile);

      const response = await fetch("/api/assets/ai-analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo analizar la foto con IA.");
      }

      const suggestion = data?.suggestion || {};
      const suggestedType = suggestion.assetType as AssetType | undefined;

      setForm((prev: FormState) => ({
        ...prev,
        assetType: suggestedType && ["instrumento", "reconocimiento", "uniforme", "otro"].includes(suggestedType)
          ? suggestedType
          : prev.assetType,
        notes: suggestion.notes || prev.notes,
        instrumentType:
          (suggestedType || prev.assetType) === "instrumento"
            ? suggestion.instrumentType || prev.instrumentType
            : prev.instrumentType,
        issueDate:
          (suggestedType || prev.assetType) === "reconocimiento"
            ? suggestion.issueDate || prev.issueDate
            : prev.issueDate,
      }));

      const incomingTags = Array.isArray(suggestion.tags)
        ? suggestion.tags.map((t: string) => String(t || "").trim().toLowerCase()).filter(Boolean)
        : [];
      const normalizedIncomingTags = Array.from(new Set(incomingTags.map((t: string) => (t.startsWith("#") ? t : `#${t}`))));
      setAiTags(normalizedIncomingTags);
      setTagsInput(normalizedIncomingTags.join(", "));
      setHasAiResult(true);
      setAiMessage("IA completó los campos detectados en la foto.");
    } catch (err: any) {
      setError(err.message || "Error inesperado al usar IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!photoFile) {
      setError("Toma o selecciona una foto principal del activo.");
      return;
    }

    try {
      setIsSubmitting(true);

      const photoData = new FormData();
      photoData.append("file", photoFile);
      photoData.append("assetType", form.assetType);

      const uploadResponse = await fetch("/api/assets/upload-photo", {
        method: "POST",
        body: photoData,
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadResult?.url) {
        throw new Error(uploadResult?.error || "No se pudo subir la foto.");
      }

      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: form.assetType,
          photoUrl: uploadResult.url,
          photoId: uploadResult.id,
          fabricationYear: form.fabricationYear ? Number(form.fabricationYear) : null,
          currentValue: 0,
          status: "bajo_responsabilidad",
          notes: form.notes.trim() || null,
          tags: normalizedTags,
          createdByEmail,
          instrument:
            form.assetType === "instrumento"
              ? {
                  instrumentType: form.instrumentType.trim() || null,
                  brand: form.brand.trim() || null,
                }
              : null,
          recognition:
            form.assetType === "reconocimiento"
              ? {
                  issuer: form.issuer.trim(),
                  issueDate: form.issueDate || null,
                  documentType: form.documentType.trim() || null,
                  referenceCode: form.referenceCode.trim() || null,
                }
              : null,
          uniform:
            form.assetType === "uniforme"
              ? {
                  size: form.size.trim() || null,
                  hasCinta: form.hasCinta,
                  hasJubon: form.hasJubon,
                  hasGreguesco: form.hasGreguesco,
                }
              : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar el activo.");

      setMessage(`Activo registrado correctamente. Código generado: ${data.assetCode || "N/D"}`);
      setPhotoName("");
      setPhotoFile(null);
      setPreviewUrl("");
      setHasAiResult(false);
      setAiMessage("");
      setAiTags([]);
      setTagsInput("");
      setForm((prev: FormState) => ({ ...initialState, assetType: prev.assetType }));
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-lime-100 text-3xl">🎻</div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Registrar activo</h3>
            <p className="text-sm text-slate-500">Sube la foto y completa la ficha del activo con una interfaz más clara y editable.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white">General</div>
          <div className="px-4 py-3 text-center text-sm font-semibold text-slate-500">Detalles</div>
        </div>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4">
            <h4 className="text-xl font-bold text-slate-900">Foto principal</h4>
            <p className="text-sm text-slate-500">Puedes tomar la foto desde la cámara o seleccionar una imagen desde tu dispositivo.</p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Foto principal</label>
              <label className="block cursor-pointer">
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                />
                {previewUrl ? (
                  <div className="overflow-hidden rounded-[1.75rem] bg-slate-50 ring-1 ring-slate-200">
                    <img src={previewUrl} alt="Vista previa del activo" className="h-64 w-full object-cover" />
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={autofillWithAi}
                disabled={isAiLoading || !photoFile}
              >
                {isAiLoading ? "Analizando foto..." : "Completar datos con IA"}
              </button>
              <p className="text-sm text-slate-500">La IA detecta tipo de activo, notas visibles y etiquetas sugeridas.</p>
            </div>
            {aiMessage && <p className="text-sm font-medium text-lime-600">{aiMessage}</p>}
          </div>
        </div>

        {hasAiResult && (
          <>
            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-slate-900">Resultado detectado</h4>
                <p className="text-sm text-slate-500">Revisa los datos detectados y completa los campos faltantes antes de guardar.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Código del activo</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none" value="Se generará automáticamente" readOnly />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none" value="Bajo responsabilidad" readOnly />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Responsable actual</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none" value={createdByLabel} readOnly />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de activo</label>
                  <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-lime-400 focus:bg-white focus:ring-2 focus:ring-lime-200" value={form.assetType} onChange={(e) => update("assetType", e.target.value as AssetType)}>
                    <option value="instrumento">Instrumento</option>
                    <option value="reconocimiento">Reconocimiento</option>
                    <option value="uniforme">Uniforme</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Año de fabricación</label>
                  <input
                    className={fieldClass(form.fabricationYear)}
                    type="number"
                    min="1800"
                    max="2100"
                    value={form.fabricationYear}
                    onChange={(e) => update("fabricationYear", e.target.value)}
                    placeholder="Ej: 2018"
                  />
                  {!form.fabricationYear.trim() && <p className="mt-1 text-xs text-amber-600">Completa el año de fabricación o un estimado.</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas del activo</label>
                  <textarea
                    className={`${fieldClass(form.notes)} min-h-28 resize-y`}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Describe el estado visual o detalles importantes del activo"
                  />
                  {!form.notes.trim() && <p className="mt-1 text-xs text-amber-600">Completa manualmente la descripción visual del activo.</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tags detectados</label>
                  <textarea
                    className={`${fieldClass(tagsInput)} min-h-24 resize-y`}
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="#madera, #color_negro, #percusion"
                  />
                  {!tagsInput.trim() && <p className="mt-1 text-xs text-amber-600">Agrega las etiquetas visibles o descriptivas del activo.</p>}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-slate-900">Información adicional</h4>
                <p className="text-sm text-slate-500">Completa los datos complementarios según el tipo de activo detectado.</p>
              </div>

              {form.assetType === "instrumento" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Instrumento</label>
                    <input className={fieldClass(form.instrumentType)} value={form.instrumentType} onChange={(e) => update("instrumentType", e.target.value)} placeholder="Guitarra" />
                    {!form.instrumentType.trim() && <p className="mt-1 text-xs text-amber-600">Indica el tipo de instrumento.</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Marca</label>
                    <input className={fieldClass(form.brand)} value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Alhambra" />
                    {!form.brand.trim() && <p className="mt-1 text-xs text-amber-600">Completa la marca si la conoces.</p>}
                  </div>
                </div>
              )}

              {form.assetType === "reconocimiento" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Emisor</label>
                    <input className={fieldClass(form.issuer)} value={form.issuer} onChange={(e) => update("issuer", e.target.value)} placeholder="Municipalidad de..." />
                    {!form.issuer.trim() && <p className="mt-1 text-xs text-amber-600">Completa la entidad emisora.</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha de emisión</label>
                    <input className={fieldClass(form.issueDate)} type="date" value={form.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de documento</label>
                    <input className={fieldClass(form.documentType)} value={form.documentType} onChange={(e) => update("documentType", e.target.value)} placeholder="Diploma" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Código de referencia</label>
                    <input className={fieldClass(form.referenceCode)} value={form.referenceCode} onChange={(e) => update("referenceCode", e.target.value)} placeholder="REC-2026-001" />
                  </div>
                </div>
              )}

              {form.assetType === "uniforme" && (
                <div className="grid gap-4">
                  <div className="max-w-xs">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Talla</label>
                    <input className={fieldClass(form.size)} value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="M" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasCinta} onChange={(e) => update("hasCinta", e.target.checked)} /> Cinta</label>
                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasJubon} onChange={(e) => update("hasJubon", e.target.checked)} /> Jubón</label>
                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={form.hasGreguesco} onChange={(e) => update("hasGreguesco", e.target.checked)} /> Gregüesco</label>
                  </div>
                </div>
              )}

              {form.assetType === "otro" && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                  La IA no pudo clasificar claramente el activo. Ajusta el tipo, las notas y los tags antes de guardar.
                </div>
              )}
            </div>

            <button className="inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-5 py-4 text-base font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar activo"}
            </button>
          </>
        )}

        {!hasAiResult && <p className="text-center text-sm text-slate-500">Cuando la IA termine, aquí verás el resultado editable con los campos faltantes resaltados.</p>}

        {error && <p className="text-sm text-rose-500">{error}</p>}
        {message && <p className="text-sm font-medium text-lime-600">{message}</p>}
      </form>
    </section>
  );
}
