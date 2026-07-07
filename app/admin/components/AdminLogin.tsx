"use client";

import React, { useRef, useState } from "react";
import { ClipboardPaste, Eye, EyeOff } from "lucide-react";

function cleanPasswordInput(value: string) {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n]/g, "")
    .trim();
}

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pasteError, setPasteError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const setPastedPassword = (value: string) => {
    const cleanPassword = cleanPasswordInput(value);
    setPassword(cleanPassword);
    setPasteError("");
    window.requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    });
  };

  const pastePassword = async () => {
    setPasteError("");

    if (!navigator.clipboard?.readText) {
      passwordInputRef.current?.focus();
      setPasteError("Click the password field and press Command-V.");
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        passwordInputRef.current?.focus();
        setPasteError("Clipboard is empty");
        return;
      }

      setPastedPassword(clipboardText);
    } catch {
      passwordInputRef.current?.focus();
      setPasteError("Clipboard access was blocked. Press Command-V in the password field.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    const cleanPassword = cleanPasswordInput(password);
    setPassword(cleanPassword);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: cleanPassword }),
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
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <input
            ref={passwordInputRef}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted) {
                e.preventDefault();
                setPastedPassword(pasted);
              }
            }}
            autoComplete="current-password"
            spellCheck={false}
            className="min-w-0 border px-2 py-1 text-black bg-white"
            required
          />
          <button
            type="button"
            onClick={() => {
              passwordInputRef.current?.focus();
              setShowPassword((current) => !current);
            }}
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="inline-flex h-8 w-10 items-center justify-center rounded bg-neutral-700 text-white hover:bg-neutral-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            onClick={pastePassword}
            title="Paste password"
            aria-label="Paste password"
            className="inline-flex h-8 w-10 items-center justify-center rounded bg-neutral-700 text-white hover:bg-neutral-600"
          >
            <ClipboardPaste size={16} />
          </button>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        {pasteError && <div className="text-red-600">{pasteError}</div>}
        {loginError && <div className="text-red-600">{loginError}</div>}
      </form>
    </div>
  );
}
