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
    return isMissing ? "input-text input-missing" : "input-text";
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
    <section className="asset-panel glass">
      <h3>Registrar activo</h3>
      <p className="placeholder-text">Primero registra la foto principal y deja que la IA proponga el resultado editable del activo.</p>

      <form className="asset-form" onSubmit={submit}>
        <div className="asset-block">
          <div className="asset-block-header">
            <h4>Foto principal</h4>
            <p className="placeholder-text">Puedes tomar la foto desde la cámara o seleccionar una imagen de tu dispositivo.</p>
          </div>

          <div className="asset-form-grid">
            <div className="field-full">
              <label className="input-label">Foto principal</label>
              <label className="photo-picker">
                <input
                  className="photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                />
                {previewUrl ? (
                  <div className="photo-preview-wrap">
                    <img src={previewUrl} alt="Vista previa del activo" className="photo-preview" />
                    <span className="helper-text">{photoName || "Foto cargada"}</span>
                  </div>
                ) : (
                  <div className="photo-placeholder">
                    <span className="photo-placeholder-icon">📷</span>
                    <strong>Tomar o seleccionar foto</strong>
                    <span className="helper-text">Desde la cámara o galería del dispositivo</span>
                  </div>
                )}
              </label>
            </div>
            <div className="field-full">
              <button
                type="button"
                className="btn-secondary"
                onClick={autofillWithAi}
                disabled={isAiLoading || !photoFile}
              >
                {isAiLoading ? "Analizando foto..." : "Completar datos con IA"}
              </button>
              <p className="helper-text">La IA detecta tipo de activo, notas de estado, datos secundarios y tags visibles.</p>
              {aiMessage && <p className="success-text">{aiMessage}</p>}
            </div>
          </div>
        </div>

        {hasAiResult && (
          <>
            <div className="asset-block">
              <div className="asset-block-header">
                <h4>Resultado detectado</h4>
                <p className="placeholder-text">Revisa y corrige los campos si la IA se equivoca. Los faltantes están resaltados para completarlos manualmente.</p>
              </div>

              <div className="asset-form-grid">
                <div>
                  <label className="input-label">Código del activo</label>
                  <input className="input-text input-readonly" value="Se generará automáticamente" readOnly />
                </div>

                <div>
                  <label className="input-label">Estado</label>
                  <input className="input-text input-readonly" value="Bajo responsabilidad" readOnly />
                </div>

                <div>
                  <label className="input-label">Responsable actual</label>
                  <input className="input-text input-readonly" value={createdByLabel} readOnly />
                </div>

                <div>
                  <label className="input-label">Tipo de activo</label>
                  <select className="input-text" value={form.assetType} onChange={(e) => update("assetType", e.target.value as AssetType)}>
                    <option value="instrumento">Instrumento</option>
                    <option value="reconocimiento">Reconocimiento</option>
                    <option value="uniforme">Uniforme</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Año de fabricación</label>
                  <input
                    className={fieldClass(form.fabricationYear)}
                    type="number"
                    min="1800"
                    max="2100"
                    value={form.fabricationYear}
                    onChange={(e) => update("fabricationYear", e.target.value)}
                    placeholder="Ej: 2018"
                  />
                  {!form.fabricationYear.trim() && <p className="missing-hint">Completa el año de fabricación (o estimado).</p>}
                </div>

                <div className="field-full">
                  <label className="input-label">Notas del activo</label>
                  <textarea
                    className={fieldClass(form.notes)}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="La IA puede completar este campo según el estado visual del activo"
                  />
                  {!form.notes.trim() && <p className="missing-hint">Completa manualmente la descripción visual del activo.</p>}
                </div>

                <div className="field-full">
                  <label className="input-label">Tags detectados</label>
                  <textarea
                    className={fieldClass(tagsInput)}
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="#madera, #color_negro, #percusion"
                  />
                  {!tagsInput.trim() && <p className="missing-hint">Agrega los tags visibles o descriptivos del activo.</p>}
                </div>
              </div>
            </div>

            <div className="asset-block additional-block">
              <div className="asset-block-header">
                <h4>Información adicional importante</h4>
                <p className="placeholder-text">Campos descriptivos editables del activo según el tipo detectado.</p>
              </div>

              {form.assetType === "instrumento" && (
                <div className="subtype-box">
                  <h4>Datos de instrumento</h4>
                  <div className="asset-form-grid">
                    <div>
                      <label className="input-label">Instrumento</label>
                      <input className={fieldClass(form.instrumentType)} value={form.instrumentType} onChange={(e) => update("instrumentType", e.target.value)} placeholder="Guitarra" />
                      {!form.instrumentType.trim() && <p className="missing-hint">Indica el tipo de instrumento.</p>}
                    </div>
                    <div>
                      <label className="input-label">Marca</label>
                      <input className={fieldClass(form.brand)} value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Alhambra" />
                      {!form.brand.trim() && <p className="missing-hint">Completa la marca si la conoces.</p>}
                    </div>
                  </div>
                </div>
              )}

              {form.assetType === "reconocimiento" && (
                <div className="subtype-box">
                  <h4>Datos de reconocimiento</h4>
                  <div className="asset-form-grid">
                    <div>
                      <label className="input-label">Emisor</label>
                      <input className={fieldClass(form.issuer)} value={form.issuer} onChange={(e) => update("issuer", e.target.value)} placeholder="Municipalidad de..." />
                      {!form.issuer.trim() && <p className="missing-hint">Completa la entidad emisora.</p>}
                    </div>
                    <div>
                      <label className="input-label">Fecha de emisión</label>
                      <input className={fieldClass(form.issueDate)} type="date" value={form.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label">Tipo de documento</label>
                      <input className={fieldClass(form.documentType)} value={form.documentType} onChange={(e) => update("documentType", e.target.value)} placeholder="Diploma" />
                    </div>
                    <div>
                      <label className="input-label">Código de referencia</label>
                      <input className={fieldClass(form.referenceCode)} value={form.referenceCode} onChange={(e) => update("referenceCode", e.target.value)} placeholder="REC-2026-001" />
                    </div>
                  </div>
                </div>
              )}

              {form.assetType === "uniforme" && (
                <div className="subtype-box">
                  <h4>Datos de uniforme</h4>
                  <div className="asset-form-grid">
                    <div>
                      <label className="input-label">Talla</label>
                      <input className={fieldClass(form.size)} value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="M" />
                    </div>
                    <div className="checkbox-group field-full">
                      <label><input type="checkbox" checked={form.hasCinta} onChange={(e) => update("hasCinta", e.target.checked)} /> Cinta</label>
                      <label><input type="checkbox" checked={form.hasJubon} onChange={(e) => update("hasJubon", e.target.checked)} /> Jubón</label>
                      <label><input type="checkbox" checked={form.hasGreguesco} onChange={(e) => update("hasGreguesco", e.target.checked)} /> Gregüesco</label>
                    </div>
                  </div>
                </div>
              )}

              {form.assetType === "otro" && (
                <div className="subtype-box">
                  <h4>Tipo no identificado</h4>
                  <p className="placeholder-text">La IA no pudo clasificar claramente el activo. Ajusta tipo, notas y tags antes de guardar.</p>
                </div>
              )}
            </div>

            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar activo"}
            </button>
          </>
        )}

        {!hasAiResult && <p className="placeholder-text">Cuando la IA termine, aquí verás el resultado editable con los campos faltantes resaltados.</p>}

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}
      </form>
    </section>
  );
}
