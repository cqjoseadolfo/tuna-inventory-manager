"use client";

import { useMemo, useState } from "react";

type AssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";
interface Props {
  createdByEmail: string;
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

export default function AssetEntryForm({ createdByEmail }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

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

    return Array.from(new Set([baseTag, extraTag, ...aiTags].filter(Boolean) as string[]));
  }, [form.assetType, form.instrumentType, aiTags]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }

    setError("");
    setAiMessage("");
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

      setForm((prev) => ({
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
      setAiTags(Array.from(new Set(incomingTags.map((t) => (t.startsWith("#") ? t : `#${t}`)))));
      setAiMessage("IA completó los campos detectados en la foto.");
    } catch (err: any) {
      setError(err.message || "Error inesperado al usar IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
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
                  fabricationYear: form.fabricationYear ? Number(form.fabricationYear) : null,
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
      setAiMessage("");
      setAiTags([]);
      setForm((prev) => ({ ...initialState, assetType: prev.assetType }));
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="asset-panel glass">
      <h3>Registrar activo</h3>
      <p className="placeholder-text">Primero registra la foto principal y luego completa los datos base del activo.</p>

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

        <div className="asset-block">
          <div className="asset-block-header">
            <h4>Datos base</h4>
            <p className="placeholder-text">Información mínima necesaria para identificar el activo en el inventario.</p>
          </div>

          <div className="asset-form-grid">
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
              <label className="input-label">Estado</label>
              <input className="input-text" value="Bajo responsabilidad" readOnly />
            </div>

            <div className="field-full">
              <label className="input-label">Responsable actual</label>
              <input className="input-text" value={createdByEmail} readOnly />
            </div>

            <div className="field-full">
              <label className="input-label">Notas del activo</label>
              <textarea
                className="input-text"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="La IA puede completar este campo según el estado visual del activo"
              />
            </div>
          </div>
        </div>

        <div className="asset-block additional-block">
          <div className="asset-block-header">
            <h4>Información adicional importante</h4>
            <p className="placeholder-text">Campos específicos del tipo de activo seleccionado.</p>
          </div>

          {form.assetType === "instrumento" && (
            <div className="subtype-box">
              <h4>Datos de instrumento</h4>
              <div className="asset-form-grid">
                <div>
                  <label className="input-label">Instrumento</label>
                  <input className="input-text" value={form.instrumentType} onChange={(e) => update("instrumentType", e.target.value)} placeholder="Guitarra" />
                </div>
                <div>
                  <label className="input-label">Marca</label>
                  <input className="input-text" value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Alhambra" />
                </div>
                <div>
                  <label className="input-label">Año de fabricación</label>
                  <input className="input-text" type="number" min="1800" max="2100" value={form.fabricationYear} onChange={(e) => update("fabricationYear", e.target.value)} />
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
                  <input className="input-text" value={form.issuer} onChange={(e) => update("issuer", e.target.value)} placeholder="Municipalidad de..." />
                </div>
                <div>
                  <label className="input-label">Fecha de emisión</label>
                  <input className="input-text" type="date" value={form.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Tipo de documento</label>
                  <input className="input-text" value={form.documentType} onChange={(e) => update("documentType", e.target.value)} placeholder="Diploma" />
                </div>
                <div>
                  <label className="input-label">Código de referencia</label>
                  <input className="input-text" value={form.referenceCode} onChange={(e) => update("referenceCode", e.target.value)} placeholder="REC-2026-001" />
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
                  <input className="input-text" value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="M" />
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
              <p className="placeholder-text">La IA no pudo clasificar claramente el activo. Puedes guardarlo como "otro" y completar notas/tags.</p>
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <button className="btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar activo"}
        </button>
      </form>
    </section>
  );
}
