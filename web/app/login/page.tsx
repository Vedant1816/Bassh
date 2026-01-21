"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabasePublic from "@/app/services/supabase-public";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabasePublic.auth.getSession();

      if (session) {
        router.replace("/");
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setMessage("");

      const { error } =
        await supabasePublic.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/");
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  //  AUTH CHECK LOADING SCREEN
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0b0b0b] p-8 text-center">
          <p className="text-sm text-gray-400">
            Checking authentication…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0b0b0b] p-8">

        <h1 className="text-xl font-semibold text-white mb-6">
          Log In
        </h1>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-black border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-black border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
          />
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          New to Bassh?{" "}
          <a
            href="/signUp"
            className="text-pink-500 hover:underline"
          >
            Create Account
          </a>
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-md bg-pink-600 hover:bg-pink-700 transition py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-red-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
