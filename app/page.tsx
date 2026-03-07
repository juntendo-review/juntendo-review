"use client";

import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const ALLOWED_DOMAIN = "@stud.juntendo.ac.jp";

export default function Home() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const okDomain = useMemo(
    () => email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN),
    [email]
  );

  const sendLink = async () => {
    setMsg(null);
    const e = email.trim().toLowerCase();

    if (!e.endsWith(ALLOWED_DOMAIN)) {
      setMsg(`このサイトは ${ALLOWED_DOMAIN} のみ利用できます。`);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? window.location.origin + "/app"
            : undefined,
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("ログインリンクをメールに送信しました。");
    }
  };

  return (
    <main style={{ maxWidth: 500, margin: "40px auto", padding: 20 }}>
      <h1>順天堂大学口コミサイト</h1>

      <p>順天堂のメールでログインしてください</p>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="xxxx@stud.juntendo.ac.jp"
        style={{
          width: "100%",
          padding: 10,
          marginTop: 10,
          border: "1px solid #ccc",
        }}
      />

      <button
        onClick={sendLink}
        disabled={!okDomain || loading}
        style={{
          marginTop: 10,
          padding: 10,
          width: "100%",
        }}
      >
        {loading ? "送信中..." : "ログイン"}
      </button>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </main>
  );
}