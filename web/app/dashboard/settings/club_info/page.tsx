"use client";

import { useEffect, useState } from "react";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import ClubLocationPicker from "@/app/components/ClubLocationPicker";
import SettingsTabs from "../components/SettingsTabs";

/* ================= TYPES ================= */

type ClubData = {
  club_name: string;
  club_desc: string;
  phone_number: string | null;
  insta_link: string | null;
  facebook_link: string | null;
  twitter_link: string | null;
  contact_email: string | null;
  address_text: string | null;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number | null;
  tier: 1 | 2 | 3 | null;
};

type LocationData = {
  address: string;
  latitude: number;
  longitude: number;
};

type MessageType = "success" | "error" | null;

export default function EditClubPage() {
  const [club, setClub] = useState<ClubData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [initialLocation, setInitialLocation] =
    useState<LocationData | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  /* ================= FETCH CLUB ================= */

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const res = await fetch(
          "/api/club",
          await withAuthHeaders({ method: "GET" })
        );

        if (!res.ok) return;

        const data = await res.json();
        setClub(data);

        if (data.latitude && data.longitude) {
          const loc = {
            address: data.address_text ?? "",
            latitude: data.latitude,
            longitude: data.longitude,
          };
          setInitialLocation(loc);
          setLocation(loc);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    fetchClub();
  }, []);

  /* ================= MESSAGE HELPER ================= */

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

  /* ================= SAVE PROFILE ================= */

  const handleSaveProfile = async () => {
    if (!club) return;

    setLoadingProfile(true);

    try {
      const res = await fetch(
        "/api/club",
        await withAuthHeaders({
          method: "PATCH",
          body: JSON.stringify({
            club_name: club.club_name,
            club_desc: club.club_desc,
            phone_number: club.phone_number,
            insta_link: club.insta_link,
            facebook_link: club.facebook_link,
            twitter_link: club.twitter_link,
            contact_email: club.contact_email,
            tier: club.tier,
            max_capacity: club.max_capacity,
          }),
        })
      );

      if (!res.ok) {
        const err = await res.json();
        showMessage(err.error || "Failed to save profile", "error");
        return;
      }

      showMessage("Club profile updated successfully", "success");
    } catch (err) {
      console.error(err);
      showMessage("Something went wrong", "error");
    } finally {
      setLoadingProfile(false);
    }
  };

  /* ================= SAVE LOCATION ================= */

  const handleSaveLocation = async () => {
    if (!location) {
      showMessage("Please select a location", "error");
      return;
    }

    setLoadingLocation(true);

    try {
      const res = await fetch(
        "/api/club/location",
        await withAuthHeaders({
          method: "PATCH",
          body: JSON.stringify({
            location: {
              address_text: location.address,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          }),
        })
      );

      if (!res.ok) {
        const err = await res.json();
        showMessage(err.error || "Failed to save address", "error");
        return;
      }

      showMessage("Address updated successfully", "success");
    } catch (err) {
      console.error(err);
      showMessage("Something went wrong", "error");
    } finally {
      setLoadingLocation(false);
    }
  };

  if (fetching || !club) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 animate-pulse">Loading club details...</p>
      </div>
    );
  }

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
          <h1 className="text-3xl font-semibold">Club Settings</h1>

          <button
            onClick={handleSaveProfile}
            disabled={loadingProfile}
            className="bg-pink-600 hover:bg-pink-700 px-6 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
        <SettingsTabs />
        {/* Club Information Section */}
        <div className="bg-[#0a0a0a] rounded-lg p-6 mb-6">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-medium">Club Information</h2>
          </div>

          <div className="space-y-6">
            {/* Club Name */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Club Name
              </label>
              <input
                value={club.club_name}
                onChange={(e) => setClub({ ...club, club_name: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>

            {/* Max Capacity */}
             <div>
  <label className="block text-sm text-gray-300 mb-2">
    Max Capacity
  </label>

  <input
    type="number"
    min="0"
    value={club.max_capacity ?? ""}
    onChange={(e) =>
      setClub({
        ...club,
        max_capacity: e.target.value === ""
          ? null
          : Number(e.target.value),
      })
    }
    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
  />
</div>


            {/* Club Description */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Club Description
              </label>
              <textarea
                value={club.club_desc ?? ""}
                onChange={(e) =>
                  setClub({ ...club, club_desc: e.target.value })
                }
                rows={4}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none"
              />
            </div>

            {/* Address Section */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Address</h3>
              
              <ClubLocationPicker
                initialLocation={initialLocation}
                onSelect={setLocation}
              />

              <button
                onClick={handleSaveLocation}
                disabled={loadingLocation}
                className="mt-4 w-full bg-pink-600 hover:bg-pink-700 px-6 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingLocation ? "Saving..." : "Save Address"}
              </button>
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    value={club.phone_number ?? ""}
                    onChange={(e) =>
                      setClub({ ...club, phone_number: e.target.value })
                    }
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    value={club.contact_email ?? ""}
                    onChange={(e) =>
                      setClub({ ...club, contact_email: e.target.value })
                    }
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links Section */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                Social Media Links
              </h3>

              <div className="space-y-4">
                {/* Instagram */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Instagram
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </div>
                    <input
                      value={club.insta_link ?? ""}
                      onChange={(e) =>
                        setClub({ ...club, insta_link: e.target.value })
                      }
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-11 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                    />
                  </div>
                </div>

                {/* Facebook */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Facebook
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <input
                      value={club.facebook_link ?? ""}
                      onChange={(e) =>
                        setClub({ ...club, facebook_link: e.target.value })
                      }
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-11 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                    />
                  </div>
                </div>

                {/* Twitter */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Twitter
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                    </div>
                    <input
                      value={club.twitter_link ?? ""}
                      onChange={(e) =>
                        setClub({ ...club, twitter_link: e.target.value })
                      }
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-11 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}