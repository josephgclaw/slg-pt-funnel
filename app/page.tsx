"use client";

import { useState } from "react";
import { CheckCircle, Clock, Star, ChevronDown } from "lucide-react";

export default function PTFunnel() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", goal: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Submission failed");

      const { bookingUrl } = await res.json();
      setStatus("success");

      // Redirect to booking after short delay
      setTimeout(() => {
        window.location.href = bookingUrl;
      }, 1500);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <main style={{ background: "#0E0E0E", minHeight: "100vh" }}>

      {/* HERO — full bleed photo */}
      <section style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}>
        {/* Background photo */}
        <img
          src="/hero-belt.jpg"
          alt="Joseph Gabiola WMO State Champion"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />
        {/* Dark gradient overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.3) 100%)",
        }} />
        {/* Content */}
        <div style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 700,
          margin: "0 auto",
          padding: "100px 24px 80px",
          textAlign: "center",
        }}>
          <div style={{
            display: "inline-block",
            background: "#EC4899",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "6px 16px",
            borderRadius: 999,
            marginBottom: 24,
          }}>
            Private Training · Townsville
          </div>

          <h1 style={{
            fontFamily: "var(--font-bebas)",
            fontSize: "clamp(52px, 12vw, 96px)",
            lineHeight: 0.95,
            color: "#fff",
            textTransform: "uppercase",
            marginBottom: 20,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}>
            Train 1-on-1<br />
            <span style={{ color: "#EC4899" }}>With a Champion</span>
          </h1>

          <p style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.65,
            maxWidth: 480,
            margin: "0 auto 32px",
            textShadow: "0 1px 8px rgba(0,0,0,0.6)",
          }}>
            Private Muay Thai sessions with WMO State Champion Joseph Gabiola.
            Technique, strategy, and conditioning — built around you.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 36 }}>
            {[
              { icon: "🥊", text: "30-min focused sessions" },
              { icon: "🏆", text: "WMO State Champion coach" },
              { icon: "📍", text: "Soul Lab Gym, Townsville" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <a href="#book" style={{
            display: "inline-block",
            background: "#EC4899",
            color: "#fff",
            fontWeight: 700,
            fontSize: 17,
            padding: "18px 40px",
            textDecoration: "none",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            boxShadow: "0 4px 24px rgba(236,72,153,0.4)",
          }}>
            Book Your Session →
          </a>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.4)",
        }}>
          <ChevronDown size={28} />
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={{ background: "#F8F5F0", padding: "60px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
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
            alt="Joseph Gabiola, head coach Soul Lab Gym"
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
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <CheckCircle size={48} color="#EC4899" style={{ margin: "0 auto 16px" }} />
              <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>You're in!</h3>
              <p style={{ color: "#888" }}>Taking you to the booking calendar now...</p>
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

    </main>
  );
}
