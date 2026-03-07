"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type EntityType = "class" | "lab";
type Entity = { id: string; type: EntityType; name: string };

type ReviewRow = {
  id: string;
  title: string;
  body: string;
  rating: number;
  is_anonymous: boolean;
  created_at: string;
  entities: Entity;
  reviews_meta?: { meta: any; entity_type: EntityType } | null;
};

export default function AppPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<EntityType>("class");
  const [q, setQ] = useState("");

  const [entities, setEntities] = useState<Entity[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // 投稿フォーム
  const [entityId, setEntityId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [anon, setAnon] = useState(true);

  // meta（授業/研究室で項目を変える）
  const [meta, setMeta] = useState<any>({});

  const filteredEntities = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return entities
      .filter((e) => e.type === tab)
      .filter((e) => (kw ? e.name.toLowerCase().includes(kw) : true));
  }, [entities, tab, q]);

  const filteredReviews = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return reviews
      .filter((r) => r.entities.type === tab)
      .filter((r) => {
        if (!kw) return true;
        return (
          r.entities.name.toLowerCase().includes(kw) ||
          r.title.toLowerCase().includes(kw) ||
          r.body.toLowerCase().includes(kw)
        );
      });
  }, [reviews, tab, q]);

  const load = async () => {
    setMsg(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      window.location.href = "/";
      return;
    }
    setEmail(u.user.email ?? null);

    const ent = await supabase
      .from("entities")
      .select("id,type,name")
      .order("created_at", { ascending: false });

    if (ent.error) return setMsg(ent.error.message);
    setEntities((ent.data ?? []) as any);

    const rev = await supabase
      .from("reviews")
      .select(
        `
        id,title,body,rating,is_anonymous,created_at,
        entities:entity_id(id,type,name),
        reviews_meta:reviews_meta(meta,entity_type)
      `
      )
      .order("created_at", { ascending: false });

    if (rev.error) return setMsg(rev.error.message);
    setReviews((rev.data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const addEntity = async () => {
    const name = prompt(tab === "class" ? "授業名を入力" : "研究室名を入力");
    if (!name) return;

    const { error } = await supabase.from("entities").insert({
      type: tab,
      name: name.trim(),
    });

    if (error) return setMsg(error.message);
    await load();
  };

  const resetMetaForTab = (t: EntityType) => {
    if (t === "class") {
      setMeta({
        attendance: "",
        assignments: "",
        exam: "",
        difficulty: "",
        tips: "",
      });
    } else {
      setMeta({
        core_time: "",
        meeting_freq: "",
        guidance: "",
        atmosphere: "",
        devices: "",
      });
    }
  };

  useEffect(() => {
    // タブ切り替え時にmetaテンプレ初期化
    resetMetaForTab(tab);
    setEntityId("");
  }, [tab]);

  const post = async () => {
    setMsg(null);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return setMsg("ログインが必要です");

    if (!entityId) return setMsg("対象（授業/研究室）を選んでください");
    if (!title.trim() || !body.trim()) return setMsg("タイトルと本文を入力してください");

    // reviews insert
    const ins = await supabase
      .from("reviews")
      .insert({
        entity_id: entityId,
        user_id: uid,
        title: title.trim(),
        body: body.trim(),
        rating,
        is_anonymous: anon,
      })
      .select("id")
      .single();

    if (ins.error) return setMsg(ins.error.message);

    // meta insert
    const metaIns = await supabase.from("reviews_meta").insert({
      review_id: ins.data.id,
      entity_type: tab,
      meta,
    });

    if (metaIns.error) return setMsg(metaIns.error.message);

    // reset
    setTitle("");
    setBody("");
    setRating(5);
    setAnon(true);
    resetMetaForTab(tab);

    await load();
  };

  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>順天堂 口コミ（授業 / 研究室）</h1>
          <div style={{ opacity: 0.75, marginTop: 4 }}>{email}</div>
        </div>
        <button onClick={signOut} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}>
          ログアウト
        </button>
      </header>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      {/* タブ + 検索 */}
      <section style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setTab("class")}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #333",
              background: tab === "class" ? "#eee" : "transparent",
            }}
          >
            授業
          </button>
          <button
            onClick={() => setTab("lab")}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #333",
              background: tab === "lab" ? "#eee" : "transparent",
            }}
          >
            研究室
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索（授業名/研究室名/本文）"
          style={{ flex: 1, minWidth: 260, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
        />
      </section>

      {/* 投稿 */}
      <section style={{ marginTop: 14, padding: 14, border: "1px solid #ddd", borderRadius: 14 }}>
        <h2 style={{ fontWeight: 800 }}>投稿（{tab === "class" ? "授業" : "研究室"}）</h2>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            style={{ padding: 10, borderRadius: 10 }}
          >
            <option value="">対象を選択</option>
            {filteredEntities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <button onClick={addEntity} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}>
            対象を追加
          </button>
        </div>

        {/* metaテンプレ */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {tab === "class" ? (
            <>
              <Field label="出席" value={meta.attendance ?? ""} onChange={(v) => setMeta({ ...meta, attendance: v })} placeholder="必須 / ゆるい / なし" />
              <Field label="課題量" value={meta.assignments ?? ""} onChange={(v) => setMeta({ ...meta, assignments: v })} placeholder="多い / 普通 / 少ない" />
              <Field label="試験" value={meta.exam ?? ""} onChange={(v) => setMeta({ ...meta, exam: v })} placeholder="あり / なし / レポート" />
              <Field label="難易度" value={meta.difficulty ?? ""} onChange={(v) => setMeta({ ...meta, difficulty: v })} placeholder="高 / 中 / 低" />
              <Field label="コツ" value={meta.tips ?? ""} onChange={(v) => setMeta({ ...meta, tips: v })} placeholder="取り方のコツなど" />
            </>
          ) : (
            <>
              <Field label="コアタイム" value={meta.core_time ?? ""} onChange={(v) => setMeta({ ...meta, core_time: v })} placeholder="例: 10-17" />
              <Field label="ミーティング頻度" value={meta.meeting_freq ?? ""} onChange={(v) => setMeta({ ...meta, meeting_freq: v })} placeholder="週1 / 隔週 / 不定" />
              <Field label="指導" value={meta.guidance ?? ""} onChange={(v) => setMeta({ ...meta, guidance: v })} placeholder="手厚い / 普通 / 放任" />
              <Field label="雰囲気" value={meta.atmosphere ?? ""} onChange={(v) => setMeta({ ...meta, atmosphere: v })} placeholder="穏やか / 体育会 / ガチ研究" />
              <Field label="設備" value={meta.devices ?? ""} onChange={(v) => setMeta({ ...meta, devices: v })} placeholder="設備の印象" />
            </>
          )}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="本文（個人特定・誹謗中傷NG）"
          rows={5}
          style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <label>
            評価：
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ marginLeft: 6, padding: 8 }}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            匿名表示
          </label>

          <button onClick={post} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}>
            投稿
          </button>
        </div>
      </section>

      {/* 一覧 */}
      <section style={{ marginTop: 14 }}>
        {filteredReviews.map((r) => (
          <article key={r.id} style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ opacity: 0.8 }}>
                  {r.entities.type === "class" ? "授業" : "研究室"}：{r.entities.name} / ★{r.rating}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{r.title}</h3>
              </div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(r.created_at).toLocaleString("ja-JP")}</div>
            </div>

            {/* meta表示 */}
            {r.reviews_meta?.meta && (
              <div style={{ marginTop: 10, opacity: 0.9, fontSize: 13 }}>
                <MetaLine meta={r.reviews_meta.meta} />
              </div>
            )}

            <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{r.body}</p>
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>投稿者：{r.is_anonymous ? "匿名" : "（表示設定）"}</div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
      />
    </label>
  );
}

function MetaLine({ meta }: { meta: any }) {
  const entries = Object.entries(meta).filter(([, v]) => String(v ?? "").trim() !== "");
  if (entries.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 999 }}>
          {k}: {String(v)}
        </span>
      ))}
    </div>
  );
}