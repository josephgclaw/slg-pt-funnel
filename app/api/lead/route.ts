import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.LEADS_SHEET_ID || "1SqntbSf_QFuZ26D-QoMo-rPRztl_DTMD6QUdkSFAQ7w";
const BOOKING_URL = process.env.BOOKING_URL || "https://go.ziplinks.com.au/widget/booking/1qa6SnkbDyWZD8NwtVCB";

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

    return NextResponse.json({ ok: true, bookingUrl: BOOKING_URL });
  } catch (err) {
    console.error("Lead API error:", err);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
