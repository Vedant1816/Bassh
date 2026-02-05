"use client";

import { useEffect, useState } from "react";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import SettingsTabs from "../components/SettingsTabs";

/* ================= TYPES ================= */

type GalleryFile = {
  id: string;
  file: File;
};

type MessageType = "success" | "error" | null;

/* ================= PAGE ================= */

export default function VisualCustomizationPage() {
  /* ===== EXISTING (FROM DB) ===== */
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  /* ===== STAGED (LOCAL) ===== */
  const [clubLogoFile, setClubLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<GalleryFile[]>([]);

  /* ===== DELETE QUEUE ===== */
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  /* ================= FETCH ================= */

  const fetchMedia = async () => {
    const res = await fetch(
      "/api/club/visuals",
      await withAuthHeaders({ method: "GET" })
    );
    if (!res.ok) return;

    const data = await res.json();
    setClubLogoUrl(data.club_logo);
    setCoverUrl(data.cover_photo);
    setGalleryUrls(data.gallery || []);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  /* ===== MESSAGE HELPER ===== */

  const showMessage = (msg: string, type: MessageType) => {
    setMessage(msg);
    setMessageType(type);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setTimeout(() => {
      setMessage("");
      setMessageType(null);
    }, 300);
  };

  /* ================= REMOVE ================= */

  const removeLogo = () => {
    if (clubLogoUrl) setPendingDeletes(p => [...p, clubLogoUrl]);
    setClubLogoUrl(null);
    setClubLogoFile(null);
  };

  const removeCover = () => {
    if (coverUrl) setPendingDeletes(p => [...p, coverUrl]);
    setCoverUrl(null);
    setCoverFile(null);
  };

  const removeGalleryUrl = (url: string) => {
    setGalleryUrls(prev => prev.filter(u => u !== url));
    setPendingDeletes(prev => [...prev, url]);
  };

  const removeGalleryFile = (id: string) => {
    setGalleryFiles(prev => prev.filter(f => f.id !== id));
  };

  /* ================= UPLOAD ================= */

  const uploadMedia = async (
    type: "logo" | "cover" | "gallery",
    file: File
  ) => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);

    await fetch(
      "/api/club/visuals",
      await withAuthHeaders({
        method: "POST",
        body: formData
      })
    );
  };

  /* ================= SAVE ================= */

  const saveChanges = async () => {
    setLoading(true);
    try {
      // DELETE FIRST
      for (const url of pendingDeletes) {
        await fetch(
          "/api/club/visuals",
          await withAuthHeaders({
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
          })
        );
      }

      // THEN UPLOAD
      if (clubLogoFile) await uploadMedia("logo", clubLogoFile);
      if (coverFile) await uploadMedia("cover", coverFile);

      for (const g of galleryFiles) {
        await uploadMedia("gallery", g.file);
      }

      setGalleryFiles([]);
      setPendingDeletes([]);
      setClubLogoFile(null);
      setCoverFile(null);

      await fetchMedia();
      showMessage("Changes saved ✅", "success");
    } catch (err) {
      console.error(err);
      showMessage("Save failed", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <>
      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  messageType === "success"
                    ? "bg-green-500/10"
                    : "bg-red-500/10"
                }`}
              >
                {messageType === "success" ? (
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                {messageType === "success" ? "Success" : "Error"}
              </h3>
              <p className="text-gray-400 text-sm mb-6">{message}</p>

              <button
                onClick={closeMessageModal}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-black text-white p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">Club Settings</h1>

          <button
            onClick={saveChanges}
            disabled={loading}
            className="bg-pink-600 hover:bg-pink-700 px-6 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
        <SettingsTabs />
        <div className="bg-[#0a0a0a] rounded-lg p-6 mb-6">
        {/* Visual Customization Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 mb-6">
            <svg
              className="w-5 h-5 text-pink-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h2 className="text-xl font-medium">Visual Customization</h2>
          </div>

          {/* LOGO */}
          <section>
            <h3 className="text-base font-normal mb-4">Club Logo</h3>

            {(clubLogoUrl || clubLogoFile) && (
              <div className="mb-4">
                <img
                  src={
                    clubLogoUrl ??
                    (clubLogoFile
                      ? URL.createObjectURL(clubLogoFile)
                      : undefined)
                  }
                  alt="Club Logo"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}

            <p className="text-sm text-gray-400 mb-3">
              Upload your club logo. Recommended size: 200×200 pixels.
            </p>

            <div className="flex gap-3">
              <label
                className={`px-6 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  clubLogoUrl || clubLogoFile
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-pink-600 hover:bg-pink-700 text-white"
                }`}
              >
                Upload Logo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  disabled={!!clubLogoUrl || !!clubLogoFile}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setClubLogoFile(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {(clubLogoUrl || clubLogoFile) && (
                <button
                  onClick={removeLogo}
                  className="px-6 py-2 rounded-lg text-sm font-medium border border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </section>

          {/* COVER */}
          <section>
            <h3 className="text-base font-normal mb-4">Cover Photo</h3>

            {(coverUrl || coverFile) && (
              <div className="mb-4">
                <img
                 src={
                    coverUrl ??
                    (coverFile
                      ? URL.createObjectURL(coverFile)
                      : undefined)
                  }
                  alt="Cover Photo"
                  className="w-full max-h-60 object-cover rounded-lg"
                />
              </div>
            )}

            <p className="text-sm text-gray-400 mb-3">
              Upload your cover photo. Recommended size: 1200×400 pixels.
            </p>

            <div className="flex gap-3">
              <label
                className={`px-6 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  coverUrl || coverFile
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-pink-600 hover:bg-pink-700 text-white"
                }`}
              >
                Upload cover
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  disabled={!!coverUrl || !!coverFile}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCoverFile(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {(coverUrl || coverFile) && (
                <button
                  onClick={removeCover}
                  className="px-6 py-2 rounded-lg text-sm font-medium border-0 text-red-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </section>

          {/* GALLERY */}
          <section>
            <h3 className="text-base font-normal mb-4">Gallery</h3>

            <div className="grid grid-cols-3 gap-4 mb-3">
              {galleryUrls.map(url => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt="Gallery"
                    className="h-48 w-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeGalleryUrl(url)}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black rounded-full w-8 h-8 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {galleryFiles.map(g => (
                <div key={g.id} className="relative group">
                  <img
                    src={URL.createObjectURL(g.file)}
                    alt="Gallery"
                    className="h-48 w-full object-cover rounded-lg opacity-70"
                  />
                  <button
                    onClick={() => removeGalleryFile(g.id)}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black rounded-full w-8 h-8 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              <label className="border-2 border-dashed border-gray-700 rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer hover:border-gray-600 transition-colors">
                <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm text-gray-400">Add Image</span>
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setGalleryFiles(prev => [
                      ...prev,
                      { id: crypto.randomUUID(), file }
                    ]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <p className="text-sm text-gray-400">
              Upload images for your club gallery. Recommended size: 800×600 pixels.
            </p>
          </section>
        </div>
        </div>
      </div>
    </>
  );
}