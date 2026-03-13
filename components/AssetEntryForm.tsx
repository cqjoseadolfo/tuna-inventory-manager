"use client";

import { useMemo, useState } from "react";

type AssetType = "instrumento" | "reconocimiento" | "uniforme";

interface Props {
  createdByEmail: string;
}

interface FormState {
  assetType: AssetType;
  assetCode: string;
  photoUrl: string;
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
  assetCode: "",
  photoUrl: "",
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
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const normalizedTags = useMemo(() => {
    const baseTag =
      form.assetType === "instrumento"
        ? "#instrumentos"
        : form.assetType === "reconocimiento"
          ? "#reconocimientos"
          : "#uniformes";

    const extraTag =
      form.assetType === "instrumento" && form.instrumentType.trim()
        ? `#${form.instrumentType.trim().toLowerCase().replace(/\s+/g, "-")}`
        : null;

    return [baseTag, extraTag].filter(Boolean) as string[];
  }, [form.assetType, form.instrumentType]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }

    setError("");
    setPhotoName(file.name);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    update("photoUrl", "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.assetCode.trim()) return setError("Ingresa el código o número de rotulación.");
    if (!photoFile) return setError("Toma o selecciona una foto principal del activo.");

    if (form.assetType === "instrumento" && (!form.instrumentType.trim() || !form.brand.trim())) {
      return setError("Para instrumento se requiere tipo de instrumento y marca.");
    }
    if (form.assetType === "reconocimiento" && !form.issuer.trim()) {
      return setError("Para reconocimiento se requiere el emisor.");
    }

    try {
      setIsSubmitting(true);

      const photoData = new FormData();
      photoData.append("file", photoFile);
      photoData.append("assetType", form.assetType);
      photoData.append("assetCode", form.assetCode.trim());

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
          code: form.assetCode.trim(),
          name: form.assetCode.trim(),
          photoUrl: uploadResult.url,
          photoId: uploadResult.id,
          currentValue: 0,
          status: "disponible",
          notes: null,
          tags: normalizedTags,
          createdByEmail,
          instrument:
            form.assetType === "instrumento"
              ? {
                  instrumentType: form.instrumentType.trim(),
                  brand: form.brand.trim(),
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

      setMessage("Activo registrado correctamente.");
      setPhotoName("");
      setPhotoFile(null);
      setPreviewUrl("");
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
      <p className="placeholder-text">Formulario dinámico por tipo de activo.</p>

      <form className="asset-form" onSubmit={submit}>
        <div className="asset-form-grid">
          <div>
            <label className="input-label">Tipo de activo</label>
            <select className="input-text" value={form.assetType} onChange={(e) => update("assetType", e.target.value as AssetType)}>
              <option value="instrumento">Instrumento</option>
              <option value="reconocimiento">Reconocimiento</option>
              <option value="uniforme">Uniforme</option>
            </select>
          </div>

          <div>
            <label className="input-label">Código / N° de rotulación</label>
            <input className="input-text" value={form.assetCode} onChange={(e) => update("assetCode", e.target.value)} placeholder="Ej. TUNA-INS-001" />
          </div>

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

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <button className="btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar activo"}
        </button>
      </form>
    </section>
  );
}
