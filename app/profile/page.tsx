"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/app/context/AuthContext";

type ProfileResponse = {
  id: string;
  email: string;
  nickname: string | null;
  fullName: string | null;
  picture: string;
  profilePictureUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  dni: string | null;
  baptismDate: string | null;
  bio: string | null;
  profession: string | null;
  userRank: string | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  birthDate: string;
  dni: string;
  baptismDate: string;
  bio: string;
  profession: string;
  userRank: string;
  profilePictureUrl: string;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  birthDate: "",
  dni: "",
  baptismDate: "",
  bio: "",
  profession: "",
  userRank: "",
  profilePictureUrl: "",
};

const isDirectRenderableUrl = (url: string) =>
  url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:");

const resolveImageUrl = (url?: string | null) => {
  const source = String(url || "").trim();
  if (!source) return "";
  if (isDirectRenderableUrl(source)) return source;
  return `/api/ui/asset-image?url=${encodeURIComponent(source)}`;
};

export default function ProfilePage() {
  const { user, isLoading, updateUserProfile } = useAuth();
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.email) return;
      setIsFetching(true);
      setError("");
      setSuccess("");
      try {
        const response = await fetch(`/api/profile?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        if (!response.ok || data?.error) {
          throw new Error(data?.error || "No se pudo cargar el perfil.");
        }
        const profileData = data.user as ProfileResponse;
        setProfile(profileData);
        setForm({
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          birthDate: profileData.birthDate || "",
          dni: profileData.dni || "",
          baptismDate: profileData.baptismDate || "",
          bio: profileData.bio || "",
          profession: profileData.profession || "",
          userRank: profileData.userRank || "",
          profilePictureUrl: profileData.profilePictureUrl || "",
        });
      } catch (loadError: any) {
        setError(loadError?.message || "No se pudo cargar el perfil.");
      } finally {
        setIsFetching(false);
      }
    };

    loadProfile();
  }, [user?.email]);

  const previewPicture = useMemo(
    () => resolveImageUrl(form.profilePictureUrl || profile?.picture || user?.picture || ""),
    [form.profilePictureUrl, profile?.picture, user?.picture]
  );

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
  };

  const handleUploadPicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }

    setError("");
    setSuccess("");
    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", "user");
      formData.append("assetCode", user?.email || "profile-user");

      const uploadResponse = await fetch("/api/assets/upload-photo", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData?.url) {
        throw new Error(uploadData?.error || "No se pudo subir la foto de perfil.");
      }

      setForm((prev) => ({ ...prev, profilePictureUrl: String(uploadData.url) }));
      setSuccess("Foto subida. Guarda cambios para aplicarla al perfil.");
    } catch (uploadError: any) {
      setError(uploadError?.message || "No se pudo subir la foto.");
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!user?.email) return;
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          firstName: form.firstName,
          lastName: form.lastName,
          birthDate: form.birthDate,
          dni: form.dni,
          baptismDate: form.baptismDate,
          bio: form.bio,
          profession: form.profession,
          userRank: form.userRank,
          profilePictureUrl: form.profilePictureUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "No se pudo guardar el perfil.");
      }

      const updated = data.user as ProfileResponse;
      setProfile(updated);
      updateUserProfile({
        name: updated.fullName || user.name,
        picture: updated.picture || user.picture,
        firstName: updated.firstName,
        lastName: updated.lastName,
        birthDate: updated.birthDate,
        dni: updated.dni,
        baptismDate: updated.baptismDate,
        bio: updated.bio,
        profession: updated.profession,
        userRank: updated.userRank,
      });
      setSuccess("Perfil actualizado correctamente.");
    } catch (saveError: any) {
      setError(saveError?.message || "No se pudo guardar el perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isFetching) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-lime-500" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-slate-500">Inicia sesión para ver tu perfil.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6 md:px-8">
      <section className="w-full max-w-5xl space-y-4">
        <PageHeader title="Perfil" backHref="/" backLabel="Volver al panel" />

        {error ? (
          <div className="rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-[2rem] bg-lime-50 p-4 text-sm font-medium text-lime-700 ring-1 ring-lime-200">{success}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Foto de perfil</h2>
            <div className="mt-4 flex justify-center">
              <div className="grid h-56 w-56 place-items-center rounded-full bg-gradient-to-br from-[#FFBF00] via-[#007EFF] to-[#2400FF] p-[4px] shadow-[0_16px_34px_rgba(36,0,255,0.25)]">
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-slate-50 ring-1 ring-white/80">
                  {previewPicture ? (
                    <img src={previewPicture} alt="Foto de perfil" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-5xl font-black text-slate-400">
                      {String((profile?.nickname || user.nickname || user.name || "U").charAt(0)).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <label className="mt-4 inline-flex cursor-pointer items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">
              {isUploadingPhoto ? "Subiendo..." : "Cambiar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadPicture}
                disabled={isUploadingPhoto}
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">La foto se puede actualizar cuando quieras.</p>
          </article>

          <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Datos personales</h2>
            <p className="mt-1 text-sm text-slate-500">Puedes dejar campos vacíos y completarlos después.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Nombres
                <input
                  value={form.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Ej. Juan"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Apellidos
                <input
                  value={form.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Ej. Pérez Salas"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Fecha de nacimiento
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => updateField("birthDate", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                DNI
                <input
                  value={form.dni}
                  onChange={(event) => updateField("dni", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Ej. 12345678"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Fecha de bautismo
                <input
                  type="date"
                  value={form.baptismDate}
                  onChange={(event) => updateField("baptismDate", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Profesión
                <input
                  value={form.profession}
                  onChange={(event) => updateField("profession", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Ej. Músico, docente..."
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Rango
                <select
                  value={form.userRank}
                  onChange={(event) => updateField("userRank", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="">Sin definir</option>
                  <option value="aspirante">Aspirante</option>
                  <option value="pardillo">Pardillo</option>
                  <option value="tuno">Tuno</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                Biografía / descripción
                <textarea
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  className="min-h-[120px] rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Cuéntanos un poco sobre ti..."
                />
              </label>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isUploadingPhoto}
                className="rounded-2xl bg-lime-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-lime-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "Guardando..." : "Guardar perfil"}
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
