import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Resend } from "resend";
import { createHash } from "crypto";

const META_PIXEL_ID = "2559980727754440";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function sendMetaLeadEvent(email: string, phone: string) {
  if (!META_ACCESS_TOKEN) return;
  const eventTime = Math.floor(Date.now() / 1000);
  const userData: Record<string, string[]> = {
    em: [sha256(email)],
  };
  // Normalise phone: strip non-digits, prepend AU country code if needed
  const digits = phone.replace(/\D/g, "");
  const normPhone = digits.startsWith("61") ? digits : `61${digits.replace(/^0/, "")}`;
  if (normPhone.length >= 10) userData.ph = [sha256(normPhone)];

  await fetch(
    `https://graph.facebook.com/v20.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: "Lead",
          event_time: eventTime,
          action_source: "website",
          event_source_url: "https://pt.soullabgym.com",
          user_data: userData,
        }],
      }),
    }
  ).catch(console.error);
}

const SPREADSHEET_ID = process.env.LEADS_SHEET_ID || "1SqntbSf_QFuZ26D-QoMo-rPRztl_DTMD6QUdkSFAQ7w";
const BOOKING_URL = process.env.BOOKING_URL || "https://go.ziplinks.com.au/widget/booking/1qa6SnkbDyWZD8NwtVCB";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "joseph@soullabgym.com";
const NOTIFY_SMS = process.env.NOTIFY_SMS || null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, goal } = await req.json();

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sheets = await getSheets();
    const now = new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'PT Leads'!A:F",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[now, name, email, phone, goal || "", "PT Funnel"]],
      },
    });

    // Fire Meta Conversions API Lead event (server-side)
    sendMetaLeadEvent(email, phone).catch(console.error);

    // Send email notification
    if (resend) {
      const recipients = [NOTIFY_EMAIL, ...(NOTIFY_SMS ? [NOTIFY_SMS] : [])];
      await resend.emails.send({
        from: "Soul Lab Gym <onboarding@resend.dev>",
        to: recipients,
        subject: `New PT Lead: ${name} ${phone}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px;">
            <h2 style="color: #EC4899; margin-bottom: 4px;">New PT Enquiry</h2>
            <p style="color: #888; margin-top: 0;">Just submitted via slg-pt-funnel.vercel.app</p>
            <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
              <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold; width: 120px;">Name</td><td style="padding: 10px; background: #fafafa;">${name}</td></tr>
              <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Email</td><td style="padding: 10px; background: #fafafa;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Phone</td><td style="padding: 10px; background: #fafafa;"><a href="tel:${phone}">${phone}</a></td></tr>
              <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Goal</td><td style="padding: 10px; background: #fafafa;">${goal || "Not specified"}</td></tr>
              <tr><td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Time</td><td style="padding: 10px; background: #fafafa;">${now}</td></tr>
            </table>
            <p style="margin-top: 20px;">
              <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}" style="background: #EC4899; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin-right: 8px;">View in Sheet</a>
              <a href="tel:${phone}" style="background: #0E0E0E; color: white; padding: 10px 20px; text-decoration: none; display: inline-block;">Call Now</a>
            </p>
          </div>
        `,
      }).catch(console.error);
    }

    return NextResponse.json({ ok: true, bookingUrl: BOOKING_URL });
  } catch (err) {
    console.error("Lead API error:", err);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
