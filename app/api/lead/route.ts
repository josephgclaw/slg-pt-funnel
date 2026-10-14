import { NextRequest, NextResponse, after } from "next/server";
import { google } from "googleapis";
import { Resend } from "resend";
import { createHash } from "crypto";

// ─── Config ──────────────────────────────────────────────────────────────────

const META_PIXEL_ID = "2559980727754440";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";

// ZipLeads (GoHighLevel). The token is a Private Integration token with
// contacts.write + contacts.readonly scopes. Never exposed to the browser.
const ZIPLEADS_API_TOKEN = process.env.ZIPLEADS_API_TOKEN || "";
const ZIPLEADS_LOCATION_ID = process.env.ZIPLEADS_LOCATION_ID || "yapIdIqlS06HE0WBJttM";
const ZIPLEADS_API = "https://services.leadconnectorhq.com";
const ZIPLEADS_API_VERSION = "2021-07-28";

// Tags: "pt-lead" starts the PT follow-up workflow, so it is (re)applied on every submit.
const PT_LEAD_TAG = "pt-lead";
const PT_TAGS = [PT_LEAD_TAG, "source-pt-funnel"];

// Contact custom field IDs in the ZipLeads location (keys in comments).
const FIELD_IDS = {
  utm_source: "Ytniil6bYobxVtvyhysU", // contact.utm_source
  utm_medium: "KwHm8TiKGWi9cTUpejtS", // contact.utm_medium
  utm_campaign: "1orinqCUBU8jjJj0UjCV", // contact.utm_campaign
  utm_content: "FoWinCLLIYCojmKZiYUR", // contact.utm_content
  fbclid: "fTZI0bLRL7efVl6BPsxZ", // contact.fbclid
  pt_goal: "EPWhOaiRTvz8tMv76Brx", // contact.pt_goal (dropdown)
} as const;

const PT_GOALS = [
  "Learn the basics",
  "Improve my technique",
  "Prepare for competition",
  "Fitness & conditioning",
  "Other",
];

// New "PT 30 min" calendar. Deliberately not read from the old BOOKING_URL env var.
const PT_BOOKING_URL =
  process.env.PT_BOOKING_URL || "https://go.ziplinks.com.au/widget/booking/WaYjxqt9zkFdFSl8Kzgl";

const SPREADSHEET_ID = process.env.LEADS_SHEET_ID || "1SqntbSf_QFuZ26D-QoMo-rPRztl_DTMD6QUdkSFAQ7w";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "josephgabiola@gmail.com";
const NOTIFY_SMS = process.env.NOTIFY_SMS || null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Attribution = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "fbclid", string>>;

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Australian number → E.164 (+61…). Returns null if it doesn't look like a valid AU number. */
function toE164AU(raw: string): string | null {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0061")) digits = digits.slice(2);
  if (digits.startsWith("61")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  // 9 national digits: mobiles start with 4, landlines with 2/3/7/8
  if (!/^[23478]\d{8}$/.test(digits)) return null;
  return `+61${digits}`;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

function clean(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function zipleads(path: string, init: RequestInit) {
  const res = await fetch(`${ZIPLEADS_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ZIPLEADS_API_TOKEN}`,
      Version: ZIPLEADS_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ZipLeads ${init.method} ${path} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

type ZLContact = { id: string; firstName?: string; lastName?: string; email?: string; phone?: string; tags?: string[] };

async function findContact(by: "email" | "number", value: string): Promise<ZLContact | null> {
  const q = new URLSearchParams({ locationId: ZIPLEADS_LOCATION_ID, [by]: value });
  const res = await zipleads(`/contacts/search/duplicate?${q.toString()}`, { method: "GET" });
  return res?.contact?.id ? (res.contact as ZLContact) : null;
}

/**
 * Finds or creates the ZipLeads contact WITHOUT overwriting anyone's identity:
 *  - Email match  → that contact. Name/phone are only filled in if blank.
 *  - Phone match only (different or no email) → that contact, but name and email are left alone
 *    (a shared family/work number must not rename someone else's record). What they typed goes in a note.
 *  - No match → new contact.
 * Then: attribution fields, PT tags, a note, and an open opportunity in the PT pipeline.
 */
async function sendToZipLeads(lead: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  goal: string;
  attribution: Attribution;
}): Promise<string> {
  if (!ZIPLEADS_API_TOKEN) throw new Error("Missing ZIPLEADS_API_TOKEN");

  // Only send fields that have a value, so a repeat visit without UTMs keeps the original ones.
  const customFields: { id: string; field_value: string }[] = [];
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"] as const) {
    const v = lead.attribution[key];
    if (v) customFields.push({ id: FIELD_IDS[key], field_value: v });
  }
  if (lead.goal) customFields.push({ id: FIELD_IDS.pt_goal, field_value: lead.goal });

  const byEmail = await findContact("email", lead.email);
  const byPhone = byEmail ? null : await findContact("number", lead.phone);
  const existing = byEmail || byPhone;
  let contactId: string;
  let matchedBy: "email" | "phone" | "new";

  if (existing) {
    contactId = existing.id;
    matchedBy = byEmail ? "email" : "phone";
    const update: Record<string, unknown> = {};
    if (matchedBy === "email") {
      // Same person by email: only fill gaps, never replace what's there.
      if (!existing.firstName && lead.firstName) update.firstName = lead.firstName;
      if (!existing.lastName && lead.lastName) update.lastName = lead.lastName;
      if (!existing.phone && lead.phone) update.phone = lead.phone;
    }
    if (customFields.length) update.customFields = customFields;
    if (Object.keys(update).length) {
      await zipleads(`/contacts/${contactId}`, { method: "PUT", body: JSON.stringify(update) });
    }
  } else {
    matchedBy = "new";
    const created = await zipleads("/contacts/", {
      method: "POST",
      body: JSON.stringify({
        locationId: ZIPLEADS_LOCATION_ID,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        source: "PT Funnel (pt.soullabgym.com)",
        ...(customFields.length ? { customFields } : {}),
      }),
    });
    contactId = created?.contact?.id;
    if (!contactId) throw new Error(`ZipLeads create returned no contact id: ${JSON.stringify(created)}`);
  }

  // A tag that is already on the contact doesn't fire "Tag added" again, so a returning
  // lead would never re-enter the follow-up. Remove pt-lead first if it's there, then add.
  const existingTags = (existing?.tags || []).map((t) => t.toLowerCase());
  if (existingTags.includes(PT_LEAD_TAG)) {
    await zipleads(`/contacts/${contactId}/tags`, { method: "DELETE", body: JSON.stringify({ tags: [PT_LEAD_TAG] }) });
  }
  await zipleads(`/contacts/${contactId}/tags`, { method: "POST", body: JSON.stringify({ tags: PT_TAGS }) });

  // Keep exactly what was typed, so nothing is lost when an existing contact wasn't renamed.
  const when = new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" });
  const noteLines = [
    `PT form (pt.soullabgym.com) – ${when}`,
    `Name: ${lead.firstName} ${lead.lastName}`.trim(),
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    lead.goal ? `Goal: ${lead.goal}` : "",
    [lead.attribution.utm_source, lead.attribution.utm_campaign, lead.attribution.utm_content].filter(Boolean).length
      ? `Source: ${[lead.attribution.utm_source, lead.attribution.utm_campaign, lead.attribution.utm_content].filter(Boolean).join(" / ")}`
      : "",
    matchedBy === "phone"
      ? "Matched an existing contact by PHONE only, so their name and email were NOT changed. Check whether this is the same person."
      : "",
  ].filter(Boolean);
  await zipleads(`/contacts/${contactId}/notes`, { method: "POST", body: JSON.stringify({ body: noteLines.join("\n") }) }).catch(
    (e) => console.error("ZipLeads note error:", e)
  );

  await ensurePtOpportunity(contactId, `${lead.firstName} ${lead.lastName}`.trim()).catch((e) =>
    console.error("ZipLeads opportunity error:", e)
  );

  return contactId;
}

// PT pipeline "PT" → stage "New PT Lead". Only creates one if the contact has no open PT opportunity,
// so a returning lead or someone already booked isn't moved backwards.
const PT_PIPELINE_ID = "6YBqswejH2gOZpoFy0PL";
const PT_STAGE_NEW_LEAD = "3d29968f-1577-442d-9652-bf7a666b0b23";

async function ensurePtOpportunity(contactId: string, name: string) {
  const q = new URLSearchParams({
    location_id: ZIPLEADS_LOCATION_ID,
    contact_id: contactId,
    pipeline_id: PT_PIPELINE_ID,
    status: "open",
  });
  const found = await zipleads(`/opportunities/search?${q.toString()}`, { method: "GET" });
  if (Array.isArray(found?.opportunities) && found.opportunities.length) return;
  await zipleads("/opportunities/", {
    method: "POST",
    body: JSON.stringify({
      locationId: ZIPLEADS_LOCATION_ID,
      pipelineId: PT_PIPELINE_ID,
      pipelineStageId: PT_STAGE_NEW_LEAD,
      contactId,
      name: name ? `PT – ${name}` : "PT lead",
      status: "open",
      source: "PT Funnel (pt.soullabgym.com)",
    }),
  });
}

async function getSheets() {
  const key = process.env.GOOGLE_SERVICE_KEY;
  if (!key) throw new Error("Missing GOOGLE_SERVICE_KEY");
  const credentials = JSON.parse(Buffer.from(key, "base64").toString("utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function appendToSheet(row: string[]) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'PT Leads'!A:F",
    valueInputOption: "RAW", // RAW keeps the leading 0 / + on phone numbers
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

async function sendMetaLeadEvent(args: {
  eventId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  fbp: string;
  fbc: string;
  ip: string;
  userAgent: string;
  sourceUrl: string;
}) {
  if (!META_ACCESS_TOKEN) return;
  const userData: Record<string, unknown> = {
    em: [sha256(args.email)],
    ph: [sha256(args.phone.replace(/\D/g, ""))],
  };
  if (args.firstName) userData.fn = [sha256(args.firstName)];
  if (args.lastName) userData.ln = [sha256(args.lastName)];
  if (args.fbp) userData.fbp = args.fbp;
  if (args.fbc) userData.fbc = args.fbc;
  if (args.ip) userData.client_ip_address = args.ip;
  if (args.userAgent) userData.client_user_agent = args.userAgent;

  const res = await fetch(`https://graph.facebook.com/v20.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          event_name: "Lead",
          event_id: args.eventId, // same ID as the browser fbq Lead → Meta deduplicates
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: args.sourceUrl,
          user_data: userData,
        },
      ],
      ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
    }),
  });
  if (!res.ok) console.error("Meta CAPI error:", res.status, await res.text().catch(() => ""));
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = toE164AU(clean(body.phone, 40));
  const goalRaw = clean(body.goal, 60);
  const goal = PT_GOALS.includes(goalRaw) ? goalRaw : "";
  const eventId = clean(body.eventId, 80) || crypto.randomUUID();

  if (!name || !email || !clean(body.phone)) {
    return NextResponse.json({ error: "Please fill in your name, email and phone." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Please enter a valid Australian phone number (e.g. 0412 345 678)." }, { status: 400 });
  }

  const { firstName, lastName } = splitName(name);
  const attrIn = (body.attribution && typeof body.attribution === "object" ? body.attribution : {}) as Record<string, unknown>;
  const attribution: Attribution = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"] as const) {
    const v = clean(attrIn[key], 500);
    if (v) attribution[key] = v;
  }

  const now = new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" });

  // ZipLeads is the system of record; the Sheet is a backup. The lead only fails if both fail.
  const [zl, sheet] = await Promise.allSettled([
    sendToZipLeads({ firstName, lastName, email, phone, goal, attribution }),
    appendToSheet([now, name, email, phone, goal, attribution.utm_source ? `PT Funnel (${attribution.utm_source})` : "PT Funnel"]),
  ]);
  if (zl.status === "rejected") console.error("ZipLeads error:", zl.reason);
  if (sheet.status === "rejected") console.error("Sheet error:", sheet.reason);
  if (zl.status === "rejected" && sheet.status === "rejected") {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Booking widget with prefill (URLSearchParams encodes + as %2B).
  // The ZipLeads widget turns a "+" in the email into a space however it's encoded,
  // so an email containing "+" isn't prefilled (the visitor types it instead).
  const prefill: Record<string, string> = { first_name: firstName, last_name: lastName, phone };
  if (!email.includes("+")) prefill.email = email;
  const bookingUrl = `${PT_BOOKING_URL}?${new URLSearchParams(prefill).toString()}`;

  // Side effects that shouldn't delay the redirect. after() keeps them alive on Vercel.
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const userAgent = req.headers.get("user-agent") || "";
  after(async () => {
    await sendMetaLeadEvent({
      eventId,
      email,
      phone,
      firstName,
      lastName,
      fbp: clean(body.fbp, 200),
      fbc: clean(body.fbc, 500),
      ip,
      userAgent,
      sourceUrl: clean(body.pageUrl, 1000) || "https://pt.soullabgym.com",
    }).catch((e) => console.error("Meta CAPI error:", e));

    if (resend) {
      const recipients = [NOTIFY_EMAIL, ...(NOTIFY_SMS ? [NOTIFY_SMS] : [])];
      await resend.emails
        .send({
          from: "Soul Lab Gym <onboarding@resend.dev>",
          to: recipients,
          subject: `New PT Lead: ${name} ${phone}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px;">
              <h2 style="color: #EC4899; margin-bottom: 4px;">New PT Enquiry</h2>
              <p style="color: #888; margin-top: 0;">Just submitted via pt.soullabgym.com</p>
              <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
                <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold; width: 120px;">Name</td><td style="padding: 10px; background: #fafafa;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Email</td><td style="padding: 10px; background: #fafafa;">${escapeHtml(email)}</td></tr>
                <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Phone</td><td style="padding: 10px; background: #fafafa;">${escapeHtml(phone)}</td></tr>
                <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Goal</td><td style="padding: 10px; background: #fafafa;">${escapeHtml(goal || "Not specified")}</td></tr>
                <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Source</td><td style="padding: 10px; background: #fafafa;">${escapeHtml([attribution.utm_source, attribution.utm_campaign, attribution.utm_content].filter(Boolean).join(" / ") || "Direct")}</td></tr>
                <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Time</td><td style="padding: 10px; background: #fafafa;">${now}</td></tr>
              </table>
              <p style="margin-top: 20px;">
                <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}" style="background: #EC4899; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin-right: 8px;">View in Sheet</a>
                <a href="tel:${escapeHtml(phone)}" style="background: #0E0E0E; color: white; padding: 10px 20px; text-decoration: none; display: inline-block;">Call Now</a>
              </p>
            </div>
          `,
        })
        .then((r) => {
          if (r?.error) console.error("Resend error:", r.error);
        })
        .catch((e) => console.error("Resend error:", e));
    }
  });

  return NextResponse.json({ ok: true, bookingUrl });
}
