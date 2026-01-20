"use client";
import { useState } from "react";
import supabasePublic from "@/app/services/supabase-public";
import { withAuthHeaders } from "@/app/services/auth-fetch";

export default function SignupPage(){
    const [email,setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSignUp = async () => {
        setLoading(true);
        setMessage("");

        const { data, error } = await supabasePublic.auth.signUp({
            email, 
            password,
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
            return;
        }

        // Using helper to attach Authorization automatically
        const res = await fetch(
            "/api/users",
            await withAuthHeaders({
            method: "POST",
            body: JSON.stringify({
                name: email.split("@")[0],
                role: "club",
            }),
            })
        );

        if (!res.ok) {
            const err = await res.json();
            setMessage(err.error || "Failed to create profile");
        } else {
            setMessage("Account created successfully");
        }

        setLoading(false);
};

     return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-pink-500/30 bg-linear-to-b from-[#120009] to-[#050003] p-8 shadow-[0_0_40px_rgba(255,0,128,0.25)]">
        <h1 className="text-3xl font-bold text-center text-pink-500 mb-2">
          Join Bassh
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Create your club account
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-black/60 border border-pink-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-black/60 border border-pink-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full rounded-md bg-pink-600 hover:bg-pink-700 transition py-3 font-semibold text-white shadow-[0_0_20px_rgba(255,0,128,0.4)]"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          {message && (
            <p className="text-center text-sm text-pink-400 mt-2">
              {message}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-pink-500 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

