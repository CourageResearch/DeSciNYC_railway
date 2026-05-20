"use client";

import React, { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setLoginError(data.error || "Invalid password");
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error("Admin login failed:", error);
      setLoginError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border px-2 py-1 text-black bg-white"
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        {loginError && <div className="text-red-600">{loginError}</div>}
      </form>
    </div>
  );
}
