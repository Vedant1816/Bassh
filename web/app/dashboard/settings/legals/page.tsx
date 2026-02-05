"use client";

import { useEffect, useState } from "react";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import SettingsTabs from "../components/SettingsTabs";

/* ================= TYPES ================= */

type LegalData = {
  terms_and_conditions: string | null;
  privacy_policy: string | null;
};

type MessageType = "success" | "error" | null;

export default function ClubLegalPoliciesPage() {
  const [data, setData] = useState<LegalData>({
    terms_and_conditions: "",
    privacy_policy: "",
  });

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch(
          "/api/club",
          await withAuthHeaders({ method: "GET" })
        );

        if (!res.ok) return;

        const club = await res.json();

        setData({
          terms_and_conditions: club.terms_and_conditions ?? "",
          privacy_policy: club.privacy_policy ?? "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    fetchPolicies();
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

  /* ================= SAVE ================= */

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch(
        "/api/club",
        await withAuthHeaders({
          method: "PATCH",
          body: JSON.stringify({
            terms_and_conditions: data.terms_and_conditions,
            privacy_policy: data.privacy_policy,
          }),
        })
      );

      if (!res.ok) {
        const err = await res.json();
        showMessage(err.error || "Failed to save policies", "error");
        return;
      }

      showMessage("Legal & policies updated successfully", "success");
    } catch (err) {
      console.error(err);
      showMessage("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <p className="text-sm text-gray-400 text-center">
        Loading policies…
      </p>
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
          <h1 className="text-2xl font-semibold">Club Settings</h1>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-pink-600 hover:bg-pink-700 px-6 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        <SettingsTabs />
        <div className="bg-[#0a0a0a] rounded-lg p-6 mb-6">
        {/* Legal & Policies Section */}
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="text-xl font-medium">Legal & Policies</h2>
          </div>

          {/* Terms and Conditions */}
          <div>
            <h3 className="text-base font-normal mb-4">Terms and Conditions</h3>

            <textarea
              value={data.terms_and_conditions ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  terms_and_conditions: e.target.value,
                })
              }
              rows={10}
              placeholder="The hottest nightclub in the city with amazing DJs and events every weekend."
              className="w-full bg-[#1a1a1a] border-0 rounded-md px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 resize-y"
            />
          </div>

          {/* Privacy Policy */}
          <div>
            <h3 className="text-base font-normal mb-4">Privacy Policy</h3>

            <textarea
              value={data.privacy_policy ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  privacy_policy: e.target.value,
                })
              }
              rows={10}
              placeholder="The hottest nightclub in the city with amazing DJs and events every weekend."
              className="w-full bg-[#1a1a1a] border-0 rounded-md px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 resize-y"
            />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}