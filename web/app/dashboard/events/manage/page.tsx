"use client";

import { useState } from "react";
import { withAuthHeaders } from "@/app/services/auth-fetch";

/* ---------------- TYPES ---------------- */

type PricingTier = {
  label: string;
  price: string;
};

type EventForm = {
  name: string;
  event_date: string;
  start_time: string;
  dj_name: string;
  dj_instagram: string;
  max_attendees: string;
};

/* ---------------- IMAGE UPLOAD (SERVER) ---------------- */

const uploadImage = async (file: File, path: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);

  const res = await fetch("/api/upload-image", await withAuthHeaders({
    method: "POST",
    body: formData,
  }));

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Image upload failed");
  }

  return data.url;
};

/* ---------------- PAGE ---------------- */

export default function ManageEventPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState<EventForm>({
    name: "",
    event_date: "",
    start_time: "",
    dj_name: "",
    dj_instagram: "",
    max_attendees: "",
  });

  const [pricing, setPricing] = useState<PricingTier[]>([
    { label: "", price: "" },
  ]);

  const [djImage, setDjImage] = useState<File | null>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);

  /* ---------------- PRICING ---------------- */

  const addPricingTier = () => {
    setPricing((p) => [...p, { label: "", price: "" }]);
  };

  const updatePricing = (
    index: number,
    key: keyof PricingTier,
    value: string
  ) => {
    setPricing((p) =>
      p.map((tier, i) =>
        i === index ? { ...tier, [key]: value } : tier
      )
    );
  };

  const removePricing = (index: number) => {
    setPricing((p) => p.filter((_, i) => i !== index));
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSaveEvent = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!form.name || !form.event_date || !form.start_time) {
        setMessage("Missing required fields");
        return;
      }

      const eventId = crypto.randomUUID();

      let bannerUrl: string | null = null;
      let djImageUrl: string | null = null;

      if (bannerImage) {
        bannerUrl = await uploadImage(
          bannerImage,
          `events/${eventId}/banner.jpg`
        );
      }

      if (djImage) {
        djImageUrl = await uploadImage(
          djImage,
          `djs/${eventId}/dj.jpg`
        );
      }

      const cleanedPricing = pricing
        .filter((p) => p.label && p.price)
        .map((p) => ({
          label: p.label,
          price: Number(p.price),
        }));

      const res = await fetch("/api/events", await withAuthHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          max_attendees: Number(form.max_attendees),
          banner_image_url: bannerUrl,
          dj_image_url: djImageUrl,
          pricing: cleanedPricing,
        }),
      }));

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to create event");
        return;
      }
      if(res.ok){
        setForm({name: "",
              event_date: "",
              start_time: "",
              dj_name: "",
              dj_instagram: "",
              max_attendees: "",});
        setPricing([{ label: "", price: "" }]);
        setDjImage(null);
        setBannerImage(null);
      }
      setMessage("Event created successfully ");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="p-8 text-white max-w-6xl">
      <h1 className="text-2xl font-semibold mb-6">
        Event Management
      </h1>

      <div className="rounded-xl bg-[#0b0b0b] border border-white/10 p-8 space-y-10">

        <div>
          <h2 className="text-lg font-semibold">
            Create a New Event
          </h2>
          <p className="text-sm text-gray-400">
            Fill in the details to create a new event for your club
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Input
            label="Event Name"
            placeholder="Enter event name"
            value={form.name}
            onChange={(v) => setForm(f => ({ ...f, name: v }))}
          />

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Event Date and Time
            </label>
            <div className="flex gap-3">
              <Input
                type="date"
                value={form.event_date}
                onChange={(v) => setForm(f => ({ ...f, event_date: v }))}
              />
              <Input
                type="time"
                value={form.start_time}
                onChange={(v) => setForm(f => ({ ...f, start_time: v }))}
              />
            </div>
          </div>

          <Input
            label="DJ Name"
            placeholder="Enter DJ name"
            value={form.dj_name}
            onChange={(v) => setForm(f => ({ ...f, dj_name: v }))}
          />

          <UploadBox
            label="Upload DJ's Image"
            file={djImage}
            onFile={setDjImage}
          />

          <Input
            label="DJ Instagram Link"
            placeholder="@dj_username"
            value={form.dj_instagram}
            onChange={(v) => setForm(f => ({ ...f, dj_instagram: v }))}
          />

          <Input
            label="Maximum Attendees"
            type="number"
            placeholder="Enter maximum capacity"
            value={form.max_attendees}
            onChange={(v) => setForm(f => ({ ...f, max_attendees: v }))}
          />
        </div>

        {/* PRICING */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">
              Ticket Pricing
            </h3>
            <button
              onClick={addPricingTier}
              className="px-4 py-1.5 rounded-full border border-pink-500 text-pink-500 text-sm hover:bg-pink-500/10"
            >
              Add Pricing Tier
            </button>
          </div>

          {pricing.map((tier, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end"
            >
              <Input
                label="Time"
                placeholder="e.g. Before 11 PM"
                value={tier.label}
                onChange={(v) =>
                  updatePricing(index, "label", v)
                }
              />

              <div className="flex gap-3">
                <Input
                  label="Price"
                  placeholder="$ 0.00"
                  value={tier.price}
                  onChange={(v) =>
                    updatePricing(index, "price", v)
                  }
                />
                {pricing.length > 1 && (
                  <button
                    onClick={() => removePricing(index)}
                    className="text-sm text-red-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* BANNER */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            Upload Event Banner
          </label>
          <BannerUpload
            file={bannerImage}
            onFile={setBannerImage}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4">
          <button className="px-4 py-2 rounded-md border border-white/10 text-sm text-gray-300">
            Cancel
          </button>
          <button
            onClick={handleSaveEvent}
            disabled={loading}
            className="px-5 py-2 rounded-md bg-pink-600 hover:bg-pink-700 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Event"}
          </button>
        </div>

        {message && (
          <p className="text-sm text-center text-gray-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      {label && (
        <label className="text-sm text-gray-400 mb-1 block">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-md bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500"
      />
    </div>
  );
}

function UploadBox({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  return (
    <div>
      <label className="text-sm text-gray-400 mb-1 block">
        {label}
      </label>
      <label className="h-10.5 flex items-center justify-center rounded-md bg-[#1a1a1a] border border-dashed border-white/20 cursor-pointer hover:border-pink-500 text-sm text-gray-400">
        {file ? file.name : "click to upload"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) =>
            onFile(e.target.files?.[0] || null)
          }
        />
      </label>
    </div>
  );
}

function BannerUpload({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  return (
    <label className="h-40 flex flex-col items-center justify-center rounded-lg bg-[#1a1a1a] border border-dashed border-pink-500/30 cursor-pointer text-gray-400">
      <p className="text-sm">
        Drag and drop or click to upload
      </p>
      <p className="text-xs mt-1">
        Recommended size: 1200 × 630 pixels
      </p>
      <span className="mt-3 px-4 py-1.5 rounded-full border border-pink-500 text-pink-500 text-sm">
        Select Image
      </span>

      {file && (
        <p className="mt-2 text-xs text-gray-300">
          {file.name}
        </p>
      )}

      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) =>
          onFile(e.target.files?.[0] || null)
        }
      />
    </label>
  );
}
