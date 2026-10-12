"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Star } from "lucide-react";

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"] as const;
const ATTRIBUTION_STORAGE_KEY = "slg_pt_attribution";

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getAttribution(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function PTFunnel() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", goal: "" });

  // Pre-fill from localStorage on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem("slg_pt_lead");
      if (saved) setForm(f => ({ ...f, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  // Capture UTMs + fbclid from the landing URL and keep them for this browser session
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const found: Record<string, string> = {};
      for (const key of ATTRIBUTION_KEYS) {
        const v = params.get(key);
        if (v) found[key] = v;
      }
      if (Object.keys(found).length) {
        // A new ad click replaces the previous attribution as a whole
        sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ ...found, captured_at: String(Date.now()) }));
      }
    } catch {}
  }, []);

  // Sticky "Book" bar on phones: shows once the hero is scrolled past, hides again at the form
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".pt-hero");
    const book = document.getElementById("book");
    if (!hero || !book || !("IntersectionObserver" in window)) return;
    let heroVisible = true;
    let bookVisible = false;
    const update = () => setShowSticky(!heroVisible && !bookVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === book) bookVisible = e.isIntersecting;
      }
      update();
    }, { threshold: 0 });
    io.observe(hero);
    io.observe(book);
    return () => io.disconnect();
  }, []);

  // Hero video: React doesn't write `muted` into the server HTML and iOS only autoplays muted
  // video, so set it and start playback here. Reduced-motion users keep the still frame.
  useEffect(() => {
    const v = document.querySelector<HTMLVideoElement>(".pt-hero__video");
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
    if (reduce) {
      v.removeAttribute("autoplay");
      v.pause();
      return;
    }
    v.play().catch(() => {});
  }, []);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "success") return;
    setStatus("loading");
    setError("");

    // One ID shared by the browser Lead and the server (Conversions API) Lead so Meta counts it once
    const eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const attribution = getAttribution();
    let fbc = readCookie("_fbc");
    if (!fbc && attribution.fbclid) {
      fbc = `fb.1.${attribution.captured_at || Date.now()}.${attribution.fbclid}`;
    }

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          attribution,
          eventId,
          fbp: readCookie("_fbp"),
          fbc,
          pageUrl: window.location.href,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.bookingUrl) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Save details for future visits
      try { localStorage.setItem("slg_pt_lead", JSON.stringify(form)); } catch {}
      setBookingUrl(data.bookingUrl);
      setStatus("success");

      // Fire Meta Pixel Lead event (once, deduplicated with the server event)
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Lead", {}, { eventID: eventId });
      }

      // Short pause so the pixel request goes out, then on to the booking calendar
      setTimeout(() => {
        window.location.href = data.bookingUrl;
      }, 400);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <>
    <main style={{ background: "#0E0E0E", minHeight: "100vh" }}>

      {/* HERO — live pad-work loop. Phones: video on top, offer below. Desktop: offer left, video right. */}
      <section className="pt-hero">
        <div className="pt-hero__media">
          <video
            className="pt-hero__video"
            src="/hero-pads.mp4"
            poster="/hero-pads-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="Joseph Gabiola holding pads for a student at Soul Lab Gym"
          />
        </div>

        <div className="pt-hero__copy">
          <p className="pt-hero__kicker">Private Muay Thai in Townsville</p>
          <h1 className="pt-hero__title">Train <span style={{ whiteSpace: "nowrap" }}>1‑on‑1</span><br /> with a champion</h1>
          <p className="pt-hero__lede">
            30 minutes on the pads with Joseph Gabiola, WMO Queensland State Champion.
            Technique, timing and conditioning, built around you.
          </p>

          <a href="#book" className="pt-hero__cta">Book your first session</a>

          <div className="pt-hero__facts">
            <span><strong>$50</strong> per session</span>
            <span><strong>30</strong> minutes</span>
            <span className="pt-hero__stars" aria-label="5.0 out of 5 from 55+ Google reviews">
              <span aria-hidden="true">★★★★★</span> 55+ Google reviews
            </span>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={{ background: "#F8F5F0", padding: "0 0 60px" }}>
        <img
          src="/coach-1on1-belly-pad.jpg"
          alt="Joseph holding a belly pad and Thai pads for a client during a private session"
          loading="lazy"
          decoding="async"
          width={1376}
          height={768}
          style={{ display: "block", width: "100%", maxHeight: 520, objectFit: "cover", objectPosition: "50% 30%" }}
        />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 20px 0" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{
              background: "#0E0E0E",
              color: "#EC4899",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "5px 14px",
              borderRadius: 999,
              marginBottom: 12,
              display: "inline-block",
            }}>
              What You Get
            </span>
            <h2 style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(32px, 6vw, 54px)",
              color: "#0E0E0E",
              textTransform: "uppercase",
              lineHeight: 1.05,
            }}>
              Every Session Is Built Around You
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              { title: "Technique Breakdown", desc: "Fix the fundamentals that hold you back. Every pad, punch, and kick drilled with purpose." },
              { title: "Ring IQ & Strategy", desc: "Learn how to think in a fight. Distance, timing, counters — the stuff you can't learn in a group class." },
              { title: "Conditioning That Counts", desc: "30 minutes of high-output, targeted training. No filler. No wasted time." },
              { title: "Personalised Plan", desc: "Whether you're a beginner or preparing to fight — every session is mapped to your goals." },
            ].map((item, i) => (
              <div key={i} style={{
                background: "#fff",
                padding: "24px",
                borderLeft: "3px solid #EC4899",
              }}>
                <h3 style={{ fontWeight: 700, color: "#0E0E0E", marginBottom: 8, fontSize: 16 }}>{item.title}</h3>
                <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF - FEATURED QUOTES */}
      <section style={{ background: "#0E0E0E", padding: "60px 20px 40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{
              color: "#EC4899",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 12,
              display: "inline-block",
            }}>
              Google Reviews
            </span>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, margin: "8px 0" }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill="#EC4899" color="#EC4899" />
              ))}
            </div>
            <p style={{ color: "#888", fontSize: 14, margin: "4px 0 0" }}>5.0 rating · 55+ reviews · Soul Lab Gym Townsville</p>
          </div>

          {/* Featured pull quotes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[
              {
                name: "Mark Lawler",
                quote: "Started here in February 2025 with no experience in any combat sports. Couldn't throw a punch or even stand correctly. The coaches at this gym — especially Joey — gave me the confidence and ability to complete my first 3 week Muay Thai camp.",
              },
              {
                name: "Stephanie Pen",
                quote: "Started at Soul Lab Gym as a complete beginner, knew absolutely nothing about the sport. Any worries or doubts I had about Muay Thai disappeared instantly. The gym classes provide a more personal feel — I never felt lost.",
              },
              {
                name: "Sam Blanch",
                quote: "Hands down the best experience for legitimate, authentic, intense Muay Thai training that you will struggle to find anywhere else in Townsville. Joe is a trainer that will push you to become the best version of yourself.",
              },
              {
                name: "Noah Richardson",
                quote: "Love training at Soul Lab! Awesome coach, great vibes and a real family feel. Everyone's super welcoming, pushes each other and makes training Muay Thai fun but challenging. Best gym I've been to!",
              },
              {
                name: "Taryn Durocher",
                quote: "I'm really happy with the structure of the classes. They really match the structure of a Muay Thai gym in Thailand. The classes are super fun and challenging. The coaches are very friendly and supportive.",
              },
              {
                name: "Emily Maxwell",
                quote: "Tried out Soul Lab for a free trial day — absolutely fell in love with the workout, the teaching, the service, everything. I couldn't be happier to go back each week and learn new skills with such great teachers.",
              },
            ].map((t, i) => (
              <div key={i} style={{
                background: "#141414",
                padding: "28px 24px",
                borderTop: "3px solid #EC4899",
              }}>
                <p style={{ color: "#EC4899", fontSize: 40, lineHeight: 1, margin: "0 0 10px", fontFamily: "Georgia, serif" }}>&ldquo;</p>
                <p style={{ color: "#ddd", fontSize: 15, lineHeight: 1.75, fontStyle: "italic", margin: "0 0 16px" }}>{t.quote}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#EC4899" color="#EC4899" />)}
                  </div>
                  <p style={{ color: "#666", fontSize: 13, fontWeight: 700, margin: 0 }}>— {t.name}</p>
                </div>
              </div>
            ))}
          </div>

          {/* All screenshot reviews */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <p style={{ color: "#555", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>More from our community</p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}>
            {Array.from({ length: 20 }, (_, i) => (
              <img
                key={i}
                src={`/review-${i + 1}.jpg`}
                alt={`Soul Lab Gym Google review ${i + 1}`}
                loading="lazy"
                decoding="async"
                style={{
                  width: "100%",
                  borderRadius: 8,
                  display: "block",
                  border: "1px solid #1f1f1f",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ background: "#F8F5F0", padding: "60px 20px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <span style={{
            background: "#0E0E0E",
            color: "#EC4899",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "5px 14px",
            borderRadius: 999,
            marginBottom: 12,
            display: "inline-block",
          }}>
            Pricing
          </span>
          <h2 style={{
            fontFamily: "var(--font-bebas)",
            fontSize: "clamp(32px, 6vw, 54px)",
            color: "#0E0E0E",
            textTransform: "uppercase",
            marginBottom: 32,
          }}>
            Simple & Straightforward
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#fff", padding: "28px 20px", border: "2px solid #e0ddd8" }}>
              <p style={{ color: "#888", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Single Session</p>
              <p style={{ fontFamily: "var(--font-bebas)", fontSize: 52, color: "#0E0E0E", margin: 0, lineHeight: 1 }}>$50</p>
              <p style={{ color: "#888", fontSize: 13, margin: "8px 0 0" }}>30 minutes</p>
            </div>
            <div style={{ background: "#0E0E0E", padding: "28px 20px", border: "2px solid #EC4899", position: "relative" }}>
              <div style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#EC4899",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "3px 10px",
              }}>
                Best Value
              </div>
              <p style={{ color: "#EC4899", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>5-Pack</p>
              <p style={{ fontFamily: "var(--font-bebas)", fontSize: 52, color: "#fff", margin: 0, lineHeight: 1 }}>$40</p>
              <p style={{ color: "#888", fontSize: 13, margin: "8px 0 0" }}>per session · save $50</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28, textAlign: "left" }}>
            {[
              "No lock-in contracts",
              "All fitness levels welcome",
              "Equipment provided",
              "Flexible scheduling",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={16} color="#EC4899" />
                <span style={{ color: "#333", fontSize: 14 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COACH SECTION */}
      <section style={{ background: "#0E0E0E", padding: "60px 20px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, alignItems: "center" }}>
          <img
            src="/hero-portrait.jpg"
            alt="Joseph Gabiola WMO Champion with belt"
            style={{ width: "100%", maxWidth: 340, borderTop: "4px solid #EC4899", display: "block" }}
          />
          <div>
            <span style={{ color: "#EC4899", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, display: "block" }}>Your Coach</span>
            <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(36px, 6vw, 56px)", color: "#fff", textTransform: "uppercase", lineHeight: 1.05, marginBottom: 16 }}>
              Joseph Gabiola
            </h2>
            <p style={{ color: "#aaa", fontSize: 15, lineHeight: 1.75, marginBottom: 20 }}>
              WMO Queensland State Champion and head coach at Soul Lab Gym. Joseph has trained in Thailand and competed at the highest levels of Australian Muay Thai.
            </p>
            <p style={{ color: "#aaa", fontSize: 15, lineHeight: 1.75, marginBottom: 0 }}>
              Whether you&apos;re a complete beginner or an experienced fighter, every session is built around your goals — not a generic program.
            </p>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section id="book" style={{ background: "#0E0E0E", padding: "60px 20px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{
              color: "#EC4899",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 12,
              display: "inline-block",
            }}>
              Claim Your Spot
            </span>
            <h2 style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(32px, 6vw, 54px)",
              color: "#fff",
              textTransform: "uppercase",
              lineHeight: 1.05,
              marginBottom: 12,
            }}>
              Book Your First Session
            </h2>
            <p style={{ color: "#888", fontSize: 15 }}>
              Fill in your details and we'll take you straight to the booking calendar.
            </p>
          </div>

          {status === "success" ? (
            <div id="booking-calendar" style={{ textAlign: "center", padding: "24px 0 0" }}>
              <CheckCircle size={32} color="#EC4899" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 4 }}>Details saved — now pick your time 👇</h3>
              <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
                Taking you to the booking calendar…{" "}
                <a href={bookingUrl} style={{ color: "#EC4899" }}>Tap here if it doesn&apos;t open</a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "Your name", required: true },
                { label: "Email Address", key: "email", type: "email", placeholder: "your@email.com", required: true },
                { label: "Phone Number", key: "phone", type: "tel", placeholder: "04xx xxx xxx", required: true },
              ].map((field) => (
                <div key={field.key}>
                  <label style={{ display: "block", color: "#ccc", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      background: "#1a1a1a",
                      border: "1px solid #333",
                      color: "#fff",
                      fontSize: 15,
                      outline: "none",
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: "block", color: "#ccc", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  What's your main goal? (optional)
                </label>
                <select
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    color: form.goal ? "#fff" : "#666",
                    fontSize: 15,
                    outline: "none",
                  }}
                >
                  <option value="">Select a goal...</option>
                  <option value="Learn the basics">Learn the basics</option>
                  <option value="Improve my technique">Improve my technique</option>
                  <option value="Prepare for competition">Prepare for competition</option>
                  <option value="Fitness & conditioning">Fitness & conditioning</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {error && (
                <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  background: status === "loading" ? "#555" : "#EC4899",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "16px",
                  border: "none",
                  cursor: status === "loading" ? "not-allowed" : "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: 8,
                }}
              >
                {status === "loading" ? "Submitting..." : "Confirm & Book My Session →"}
              </button>

              <p style={{ color: "#555", fontSize: 12, textAlign: "center", margin: 0 }}>
                No spam. No lock-ins. Just one step closer to your first session.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0a0a0a", padding: "24px 20px", textAlign: "center", borderTop: "1px solid #1a1a1a" }}>
        <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
          © 2026 Soul Lab Gym · Townsville, QLD ·{" "}
          <a href="https://soullabgym.com" style={{ color: "#EC4899", textDecoration: "none" }}>soullabgym.com</a>
        </p>
      </footer>

      <div className="pt-sticky" data-show={showSticky ? "true" : "false"} aria-hidden={!showSticky}>
        <p className="pt-sticky__text"><strong>1-on-1 with Joe</strong>$50 · 30 minutes</p>
        <a href="#book" className="pt-sticky__cta" tabIndex={showSticky ? 0 : -1}>Book now</a>
      </div>
    </main>
    </>
  );
}
