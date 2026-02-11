"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactUsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="text-sm text-gray-400 hover:text-white mb-6 inline-block"
      >
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl font-semibold mb-2">Contact Us</h1>
      <p className="text-sm text-gray-400 mb-8">
        Have a question or need help? Raise a query below and our team will get
        back to you.
      </p>

      {submitted ? (
        <div className="rounded-lg bg-[#0f0f0f] border border-gray-800 p-8 text-center">
          <div className="text-pink-500 text-4xl mb-4">&#10003;</div>
          <h2 className="text-lg font-semibold mb-2">Query Submitted</h2>
          <p className="text-sm text-gray-400 mb-6">
            Thank you for reaching out. We&apos;ll get back to you soon.
          </p>
          <button
            onClick={() => {
              setName("");
              setEmail("");
              setSubject("");
              setMessage("");
              setSubmitted(false);
            }}
            className="px-5 py-2 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700"
          >
            Submit Another Query
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg bg-[#0f0f0f] border border-gray-800 p-6 space-y-5"
        >
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-md bg-black border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-md bg-black border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject of your query"
              required
              className="w-full rounded-md bg-black border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your query in detail..."
              required
              rows={5}
              className="w-full rounded-md bg-black border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors"
          >
            Submit Query
          </button>
        </form>
      )}

      {/* Contact Number */}
      <div className="mt-8 rounded-lg bg-[#0f0f0f] border border-gray-800 p-5">
        <p className="text-sm text-gray-400 mb-1">
          Prefer to talk? Reach us directly at
        </p>
        <p className="text-lg font-semibold text-white">
          +91 XXXXX XXXXX
        </p>
      </div>
    </div>
  );
}
