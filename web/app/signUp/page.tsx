"use client";

import { useState } from "react";
import supabasePublic from "@/app/services/supabase-public";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import ClubLocationPicker from "../components/ClubLocationPicker";

export default function SignupPage() {
  type LocationData = {
  address: string;
  latitude: number;
  longitude: number;
};
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [clubName, setClubName] = useState("");

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage("Email and password are required");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabasePublic.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // create user profile
    const res = await fetch(
      "/api/users",
      await withAuthHeaders({
        method: "POST",
        body: JSON.stringify({
          name: email.split("@")[0],
          email,
          role: "club",
          location,
          clubName
        }),
      })
    );

    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error || "Failed to create profile");
    } else {
      setMessage("Account created successfully.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0b0b0b] p-8">

        {/* Title */}
        <h1 className="text-xl font-semibold text-white mb-1">
          Sign Up
        </h1>
        {/* <p className="text-sm text-gray-400 mb-6">
          Sign up to create your club management dashboard
        </p> */}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">
            Email
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-black border border-white/15 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-black border border-white/15 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">
            Club Name
          </label>
          <input
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            className="w-full rounded-md bg-black border border-white/15 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <ClubLocationPicker
          onSelect={(data) => {
          setLocation(data);
          }}
        />


        {/* Button */}
        <button
          onClick={handleSignUp}
          disabled={loading}
          className="w-full rounded-md bg-pink-600 hover:bg-pink-700 transition py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing up..." : "Sign up"}
        </button>

        {/* Message */}
        {message && (
          <p className="mt-4 text-center text-sm text-gray-400">
            {message}
          </p>
        )}
      </div>

      {/* Footer */}
      {/* <p className="absolute bottom-6 text-xs text-gray-500">
        © 2025 Club Dashboard. All rights reserved.
      </p> */}
    </div>
  );
}
