"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { withAuthHeaders } from "@/app/services/auth-fetch";

/* ---------------- TYPES ---------------- */

type PricingTier = {
  label: string;
  price: number;
};

type EventForm = {
  name: string;
  event_date: string;
  start_time: string;
  dj_name: string;
  dj_instagram: string;
  max_attendees: number;
};

/* ---------------- PAGE ---------------- */

export default function UpdateEventPage() {
  const DEFAULT_BANNER_IMAGE =
   "https://images.unsplash.com/photo-1492684223066-81342ee5ff30";

   const DEFAULT_DJ_IMAGE =
   "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4";
  const { eventId } = useParams<{ eventId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [djImage, setDjImage] = useState<File | null>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);

  const [useDefaultDJ, setUseDefaultDJ] = useState(false);
  const [useDefaultBanner, setUseDefaultBanner] = useState(false);

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    const res = await fetch(
      "/api/events/upload-image",
      await withAuthHeaders({
        method: "POST",
        body: formData,
      })
    );
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Image upload failed");
    }

    return data.url;
  };
   const deleteImage = async (type: "banner" | "dj"): Promise<void> => {
    const res = await fetch(
    `/api/events/delete-image?eventId=${eventId}&type=${type}`,
    await withAuthHeaders({
      method: "POST",
    })
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to delete image");
  }
};

  const [form, setForm] = useState<EventForm>({
    name: "",
    event_date: "",
    start_time: "",
    dj_name: "",
    dj_instagram: "",
    max_attendees: 0,
  });

  const [pricing, setPricing] = useState<PricingTier[]>([
    { label: "", price: 0 },
  ]);

  /* ---------------- FETCH EVENT ---------------- */

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/events/patch?eventId=${eventId}`,
          await withAuthHeaders({ method: "GET" })
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch event");
        }

        setForm({
          name: data.name ?? "",
          event_date: data.event_date ?? "",
          start_time: data.start_time ?? "",
          dj_name: data.dj_name ?? "",
          dj_instagram: data.dj_instagram ?? "",
          max_attendees: Number(data.max_attendees ?? 0),
        });

        if (Array.isArray(data.event_ticket_pricing)) {
          setPricing(
            data.event_ticket_pricing.map((p: any) => ({
              label: p.label,
              price: Number(p.price),
            }))
          );
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  /* ---------------- SAVE (PATCH) ---------------- */
  const addPricingTier = () => {
  setPricing((p) => [...p, { label: "", price: 0 }]);
};

const updatePricing = (
  index: number,
  key: keyof PricingTier,
  value: string
) => {
  setPricing((p) =>
    p.map((tier, i) =>
      i === index
        ? { ...tier, [key]: key === "price" ? Number(value) : value }
        : tier
    )
  );
};

const removePricing = (index: number) => {
  setPricing((p) => p.filter((_, i) => i !== index));
};


  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const body: any = {
        ...form,
        pricing: pricing.filter((p) => p.label && p.price > 0),
      };

      if (!useDefaultBanner && bannerImage) {
        body.banner_image_url = await uploadImage(
          bannerImage,
          `events/${eventId}/banner.jpg`
        );
      }

      if (!useDefaultDJ && djImage) {
        body.dj_image_url = await uploadImage(
          djImage,
          `djs/${eventId}/dj.jpg`
        );
      }

      // checkbox logic
      if (useDefaultBanner) {
        await deleteImage("banner");
        body.banner_image_url = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30";
      }

      if (useDefaultDJ){ 
        await deleteImage("dj");
        body.dj_image_url = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4";
      }

      const res = await fetch(
        `/api/events/patch?eventId=${eventId}`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      );

      let data: any = null;

     if (res.headers.get("content-type")?.includes("application/json")) {
        data = await res.json();
      }

     if (!res.ok) {
        throw new Error(data?.error || "Failed to update event");
      }


      setMessage("Event updated successfully");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI STATES ---------------- */

  if (loading) return <div className="p-8 text-gray-400">Loading event…</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  /* ---------------- UI ---------------- */

  return (
    <div className="p-8 text-white max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/events/" className="text-gray-400 hover:text-white">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Update Event</h1>
          <p className="text-sm text-gray-400">Edit your event details</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#0b0b0b] border border-white/10 p-8 space-y-10">

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Event Name" value={form.name} onChange={(v:string) => setForm(f => ({ ...f, name: v }))} />

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Event Date and Time
            </label>
            <div className="flex gap-3">
              <Input type="date" value={form.event_date} onChange={(v:string) => setForm(f => ({ ...f, event_date: v }))} />
              <Input type="time" value={form.start_time} onChange={(v:string) => setForm(f => ({ ...f, start_time: v }))} />
            </div>
          </div>

          <Input label="DJ Name" value={form.dj_name} onChange={(v:string) => setForm(f => ({ ...f, dj_name: v }))} />

          {/* DJ IMAGE */}
          <div>
            <UploadBox label="Upload DJ's Image" file={djImage} onFile={setDjImage} />
            <label className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <input type="checkbox" checked={useDefaultDJ} onChange={(e) => setUseDefaultDJ(e.target.checked)} />
              Use default DJ image
            </label>
          </div>

          <Input label="DJ Instagram" value={form.dj_instagram} onChange={(v:string) => setForm(f => ({ ...f, dj_instagram: v }))} />

          <Input
            label="Maximum Attendees"
            type="number"
            value={String(form.max_attendees)}
            onChange={(v:string) => setForm(f => ({ ...f, max_attendees: Number(v) }))}
          />
        </div>
        {/* PRICING */}
<div className="space-y-4">
  <div className="flex justify-between items-center">
    <h3 className="font-medium">Ticket Pricing</h3>
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
        onChange={(v: string) =>
          updatePricing(index, "label", v)
        }
      />

      <div className="flex gap-3">
        <Input
          label="Price"
          placeholder="₹ 0.00"
          value={String(tier.price)}
          onChange={(v: string) =>
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
          <BannerUpload file={bannerImage} onFile={setBannerImage} />
          <label className="flex items-center gap-2 text-xs text-gray-400 mt-2">
            <input type="checkbox" checked={useDefaultBanner} onChange={(e) => setUseDefaultBanner(e.target.checked)} />
            Use default banner image
          </label>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-5 py-2 rounded-md bg-pink-600 hover:bg-pink-700 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {message && (
          <p className="text-sm text-center text-gray-400">{message}</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Input({ label, type = "text", value, onChange }: any) {
  return (
    <div>
      {label && <label className="text-sm text-gray-400 mb-1 block">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white"
      />
    </div>
  );
}

function UploadBox({ label, file, onFile }: any) {
  return (
    <div>
      <label className="text-sm text-gray-400 mb-1 block">{label}</label>
      <label className="h-10.5 flex items-center justify-center rounded-md bg-[#1a1a1a] border border-dashed border-white/20 cursor-pointer hover:border-pink-500 text-sm text-gray-400">
        {file ? file.name : "click to upload"}
        <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
      </label>
    </div>
  );
}

function BannerUpload({ file, onFile }: any) {
  return (
    <label className="h-40 flex flex-col items-center justify-center rounded-lg bg-[#1a1a1a] border border-dashed border-pink-500/30 cursor-pointer text-gray-400">
      <span className="mt-3 px-4 py-1.5 rounded-full border border-pink-500 text-pink-500 text-sm">
        Select Image
      </span>
      {file && <p className="mt-2 text-xs text-gray-300">{file.name}</p>}
      <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </label>
  );
}
