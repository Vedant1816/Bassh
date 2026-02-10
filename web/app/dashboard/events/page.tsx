"use client";

import { useEffect, useState } from "react";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import Link from "next/link";
import {
  Pencil,
  Share2,
  Trash2,
  ChevronDown,
} from "lucide-react";


/* ---------------- TYPES ---------------- */

type PricingTier = {
  label: string;
  stag_price: string;
  couple_price: string;
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

  const res = await fetch("/api/events/upload-image", await withAuthHeaders({
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
  
   const DEFAULT_BANNER_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30";

const DEFAULT_DJ_IMAGE =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");


  const [form, setForm] = useState<EventForm>({
    name: "",
    event_date: "",
    start_time: "",
    dj_name: "",
    dj_instagram: "",
    max_attendees: "",
  });

  const [pricing, setPricing] = useState<PricingTier[]>([
  { label: "", stag_price: "", couple_price: "" },
]);


  const [djImage, setDjImage] = useState<File | null>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);

  /* ---------------- PRICING ---------------- */

  const addPricingTier = () => {
   setPricing((p) => [
  ...p,
  { label: "", stag_price: "", couple_price: "" },
]);

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

  /* Get current Events*/
   const [postedEvents, setPostedEvents] = useState<any[]>([]);

   const [eventLoading, setEventLoading] = useState(false);
   const fetchEvents = async (searchText = "") => {
  setEventLoading(true);

  const params = new URLSearchParams();
  params.append("limit", "3");

  if (searchText.trim() !== "") {
    params.append("search", searchText.trim());
  }

  const res = await fetch(
    `/api/events/club?${params.toString()}`,
    await withAuthHeaders({ method: "GET" })
  );

  const data = await res.json();
  setPostedEvents(data);
  setEventLoading(false);
};

   useEffect(()=> {
    fetchEvents();
   }, []);
   
   useEffect(() => {
  const timer = setTimeout(() => {
    fetchEvents(search);
  }, 400); // debounce

  return () => clearTimeout(timer);
}, [search]);


  /* ---------------- SUBMIT ---------------- */

  const handleSaveEvent = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!form.name || !form.event_date || !form.start_time) {
        setMessage("Missing required fields");
        return;
      }

      const cleanedPricing = pricing
  .filter(
    (p) =>
      p.label &&
      (p.stag_price || p.couple_price)
  )
  .map((p) => ({
    label: p.label,
    stag_price: p.stag_price
      ? Number(p.stag_price)
      : null,
    couple_price: p.couple_price
      ? Number(p.couple_price)
      : null,
  }));


      const res = await fetch("/api/events", await withAuthHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
         ...form,
        max_attendees: Number(form.max_attendees),
        pricing: cleanedPricing,
      }),
     }));
     const data = await res.json();
     if (!res.ok) {
        setMessage(data.error || "Failed to create event");
        return;
      }
      const eventId = data.event.id;

      let bannerUrl = DEFAULT_BANNER_IMAGE;
      let djImageUrl = DEFAULT_DJ_IMAGE;

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

      const res1 = await fetch(
           `/api/events/patch?eventId=${eventId}`,
               await withAuthHeaders({
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  banner_image_url: bannerUrl,
                  dj_image_url: djImageUrl,
                }),
          })
        );
      const data1 = await res1.json();
      if(!res1.ok){
        setMessage(data1.error || "Failed to upload images");
      }

      if(res.ok){
        setForm({name: "",
              event_date: "",
              start_time: "",
              dj_name: "",
              dj_instagram: "",
              max_attendees: "",});
        setPricing([{ label: "", stag_price: "", couple_price: ""}]);
        setDjImage(null);
        setBannerImage(null);
      }
      setMessage("Event created successfully ");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
      await fetchEvents();
    }

  };
    const [deleteState, setDeleteState] = useState<{
    open: boolean;
    loading: boolean;
    success: boolean;
    error: string | null;
  }>({
    open: false,
    loading: false, 
    success: false,
    error: null,
  });
  const [eventIdToDelete, setEventIdToDelete] = useState<string | null>(null);


 const confirmDeleteEvent = async () => {
  if (!eventIdToDelete) return;

  setDeleteState({
    open: true,
    loading: true,
    success: false,
    error: null,
  });

  try {
    // delete banner
    let res = await fetch(
      `/api/events/delete-image?eventId=${eventIdToDelete}&type=banner`,
      await withAuthHeaders({ method: "POST" })
    );
    if (!res.ok) throw new Error("Failed to delete banner image");

    // delete DJ
    res = await fetch(
      `/api/events/delete-image?eventId=${eventIdToDelete}&type=dj`,
      await withAuthHeaders({ method: "POST" })
    );
    if (!res.ok) throw new Error("Failed to delete DJ image");

    // delete event
    res = await fetch(
      `/api/events/delete?eventId=${eventIdToDelete}`,
      await withAuthHeaders({ method: "DELETE" })
    );
    if (!res.ok) throw new Error("Failed to delete event");

    setDeleteState({
      open: true,
      loading: false,
      success: true,
      error: null,
    });

    await fetchEvents();
  } catch (err: any) {
    setDeleteState({
      open: true,
      loading: false,
      success: false,
      error: err.message || "Could not delete event",
    });
  }
};
const openDeleteConfirmation = (eventId: string) => {
  setEventIdToDelete(eventId);
  setDeleteState({
    open: true,
    loading: false,
    success: false,
    error: null,
  });
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
    label="Stag Price"
    placeholder="₹ 0.00"
    value={tier.stag_price}
    onChange={(v) =>
      updatePricing(index, "stag_price", v)
    }
  />

  <Input
    label="Couple Price"
    placeholder="₹ 0.00"
    value={tier.couple_price}
    onChange={(v) =>
      updatePricing(index, "couple_price", v)
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
      {/* ---------------- YOUR EVENTS ---------------- */}
      <div className="mt-12 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Your Events</h2>
            <p className="text-sm text-gray-400">
              Manage your upcoming and past events
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <Link
              href="/dashboard/events/viewAll"
              className="px-4 py-2 rounded-full bg-pink-600 text-sm font-medium hover:bg-pink-700"
              >
              View All Events
            </Link>
            <div className="relative">
              <input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-4 pr-10 py-2 rounded-full bg-[#1a1a1a] border border-white/10 text-sm text-white"
              />
              <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
        </div>

        {eventLoading && (
          <p className="text-sm text-gray-400">Loading events…</p>
        )}

        {!eventLoading && postedEvents.length === 0 && (
          <p className="text-sm text-gray-400">No events yet</p>
        )}

        <div className="space-y-4">
          {postedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              openDeleteConfirmation={openDeleteConfirmation}
            />
          ))}

        </div>
        {deleteState.open && (
          <DeleteEventModal
  loading={deleteState.loading}
  success={deleteState.success}
  error={deleteState.error}
  onClose={() => {
    setDeleteState({
      open: false,
      loading: false,
      success: false,
      error: null,
    });
    setEventIdToDelete(null);
  }}
  onConfirm={confirmDeleteEvent}
/>

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
function EventCard({ event, openDeleteConfirmation }: { event: any, openDeleteConfirmation: (eventId : string) => void; }) {
  const [open, setOpen] = useState(false);

const [attendees, setAttendees] = useState<any[]>([]);
const [attendeeCount, setAttendeeCount] = useState(0);
const [loadingAttendees, setLoadingAttendees] = useState(false);

const toggleDropdown = async () => {
  setOpen((prev) => !prev);

  if (!open && attendees.length === 0) {
    setLoadingAttendees(true);

    const res = await fetch(
      `/api/events/attendees?eventId=${event.id}`,
      await withAuthHeaders({ method: "GET" })
    );

    const data = await res.json();

    setAttendees(data.attendees || []);
    setAttendeeCount(data.count || 0);
    setLoadingAttendees(false);
  }
};


  const banner = event.banner_image_url
  ? `${event.banner_image_url}?v=${event.updated_at}`
  : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30";

  const eventDateTime = new Date(
  `${event.event_date}T${event.start_time}`
);

const isUpcoming = eventDateTime >= new Date();

  return (
    <div className="rounded-xl bg-[#0b0b0b] border border-white/10 overflow-hidden">
      <div className="flex gap-4 p-4">
        <img
          src={banner}
          alt="event banner"
          className="w-16 h-16 rounded-lg object-cover"
        />

        <div className="flex-1">
          <h3 className="font-semibold">{event.name}</h3>

          <p className="text-sm text-gray-400">
            {new Date(event.event_date).toDateString()} at {event.start_time}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            DJ {event.dj_name || "—"} • {event.max_attendees || 0} attendees
          </p>

          {/* PRICING */}
          {Array.isArray(event.event_ticket_pricing) &&
  event.event_ticket_pricing.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-2">
      {event.event_ticket_pricing.map((tier: any) => (
        <span
          key={tier.id}
          className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-white/10 text-xs text-gray-300"
        >
          {tier.label}
          {tier.stag_price != null && (
            <> • Stag ₹{tier.stag_price}</>
          )}
          {tier.couple_price != null && (
            <> • Couple ₹{tier.couple_price}</>
          )}
        </span>
      ))}
    </div>
  )}

        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs ${
              isUpcoming
                ? "bg-pink-600 text-white"
                : "bg-gray-600 text-white"
            }`}
          >
            {isUpcoming ? "Upcoming" : "Past"}
          </span>

          <div className="flex items-center gap-3">
           <Link
          href={`/dashboard/events/update/${event.id}`}
          className="text-gray-400 hover:text-white transition"
         >
          <Pencil size={16} />
         </Link>

          <button className="text-gray-400 hover:text-white transition">
            <Share2 size={16} />
          </button>

          <button className="text-gray-400 hover:text-red-400 transition" onClick={() => openDeleteConfirmation(event.id)}
          >
            <Trash2 size={16} />
          </button>

          <button
  onClick={toggleDropdown}
  className={`text-gray-400 hover:text-white transition ${
    open ? "rotate-180" : ""
  }`}
>
  <ChevronDown size={18} />
</button>

        </div>
        </div>
      </div>

      {/* DROPDOWN */}
 {open && (
  <div className="border-t border-white/10 px-6 py-5 space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-white">Attendees List</p>
      <span className="px-3 py-1 text-xs bg-white/10 rounded-full text-gray-300">
        Total {attendeeCount}
      </span>
    </div>

    <div
      className="
        max-h-64
        overflow-y-auto
        space-y-3
        pr-2
        scrollbar-thin
        scrollbar-thumb-white/10
        scrollbar-track-transparent
      "
    >
      {loadingAttendees && (
        <p className="text-sm text-gray-400 text-center py-6">
          Loading attendees…
        </p>
      )}

      {!loadingAttendees && attendees.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">
          No confirmed attendees yet
        </p>
      )}

      {!loadingAttendees &&
        attendees.map((user) => (
          <div
            key={user.id}
            className="
              flex items-center gap-3
              px-5 py-3
              rounded-lg
              bg-[#4a2849]
              border border-purple-500/20
              hover:border-purple-500/40
              transition-colors
            "
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-white font-medium text-sm">
                {user.name?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{user.name}</p>
            </div>
          </div>
        ))}
    </div>
  </div>
)}

    </div>
  );
}

function DeleteEventModal({
  loading,
  success,
  error,
  onClose,
  onConfirm,
}: {
  loading: boolean;
  success: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl bg-[#0b0b0b] border border-white/10 p-6 text-center">

        {/* CONFIRM STATE */}
        {!loading && !success && !error && (
          <>
            <p className="text-lg font-semibold text-white">
              Are you sure?
            </p>
            <p className="text-sm text-gray-400 mt-2">
              This will permanently delete the event and its images.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md border border-white/10 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm font-medium"
              >
                Yes, delete
              </button>
            </div>
          </>
        )}

        {/* LOADING STATE */}
        {loading && (
          <>
            <p className="text-lg font-semibold text-white">
              Deleting event…
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Please wait
            </p>
          </>
        )}

        {/* SUCCESS STATE */}
        {!loading && success && (
          <>
            <p className="text-lg font-semibold text-green-400">
              Event deleted successfully
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 rounded-md bg-pink-600 hover:bg-pink-700 text-sm"
            >
              Close
            </button>
          </>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <>
            <p className="text-lg font-semibold text-red-400">
              Something went wrong
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {error}
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 rounded-md border border-white/10 text-sm"
            >
              Close
            </button>
          </>
        )}

      </div>
    </div>
  );
}

