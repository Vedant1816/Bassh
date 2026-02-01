"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { withAuthHeaders } from "@/app/services/auth-fetch";

/* TYPES  */

type MenuImage = {
  id: string;
  previewUrl: string; // always used for rendering
  imageUrl?: string;  // present if image already exists in backend
  file?: File;        // present if image is newly added
};

export default function MenuManagement() {
  const [images, setImages] = useState<MenuImage[]>([]);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);

  /*  FETCH EXISTING IMAGES  */

  useEffect(() => {
    const fetchImages = async () => {
      const res = await fetch(
        "/api/menu",
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) return;

      const data = await res.json();

      setImages(
        data.images.map((url: string) => ({
          id: crypto.randomUUID(),
          previewUrl: url,
          imageUrl: url, 
        }))
      );
    };

    fetchImages();
  }, []);

  /*  ADD IMAGE  */

  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      },
    ]);

    e.target.value = "";
  };

  /* REMOVE IMAGE  */

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  /*  SAVE CHANGES  */

  const saveChanges = async () => {
    try {
      setSaveStatus("saving");

      const formData = new FormData();

      images.forEach((img) => {
        if (img.file) {
          // new image
          formData.append("newImages", img.file);
        } else if (img.imageUrl) {
          // existing image
          formData.append("existingImages", img.imageUrl);
        }
      });

      const res = await fetch(
        "/api/menu",
        await withAuthHeaders({
          method: "PUT",
          body: formData,
        })
      );

      if (!res.ok) throw new Error("Save failed");

      setSaveStatus("saved");

      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err) {
      console.error("SAVE ERROR:", err);
      setSaveStatus("idle");
    }
  };

  const renderSaveLabel = () => {
    if (saveStatus === "saving") return "Saving...";
    if (saveStatus === "saved") return "Saved ✓";
    return "Save Changes";
  };

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold">Menu Management</h1>

        <button
          onClick={saveChanges}
          disabled={saveStatus === "saving"}
          className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors
            ${
              saveStatus === "saved"
                ? "bg-green-600"
                : "bg-pink-600 hover:bg-pink-700"
            }
            ${saveStatus === "saving" && "opacity-70 cursor-not-allowed"}
          `}
        >
          {renderSaveLabel()}
        </button>
      </div>

      {/* Menu Section */}
      <div className="bg-[#0a0a0a] rounded-lg p-6">
        <h2 className="text-base font-medium mb-6">Menu</h2>

        <div className="flex gap-4 flex-wrap">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <div className="w-45 h-60 rounded-md overflow-hidden bg-[#1a1a1a] border border-gray-800">
                <Image
                  src={img.previewUrl}
                  alt="Menu"
                  fill
                  className="object-cover"
                />
              </div>

              <button
                onClick={() => removeImage(img.id)}
                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <button
            onClick={handleAddImageClick}
            className="w-45 h-60 rounded-md bg-[#0f0f0f] border-2 border-dashed border-gray-700 hover:border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:text-gray-400 transition-colors"
          >
            <Plus size={32} strokeWidth={1.5} />
            <span className="text-sm mt-3 font-medium">Add Image</span>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
    </div>
  );
}
