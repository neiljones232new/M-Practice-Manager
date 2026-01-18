import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.XERO_REDIRECT_URI!,
      client_id: process.env.XERO_CLIENT_ID!,
      client_secret: process.env.XERO_CLIENT_SECRET!,
    });

    const resp = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await resp.json();

    // TODO: store these securely in your DB, linked to the logged-in M user
    // data.access_token
    // data.refresh_token
    // data.expires_in, etc.

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Xero OAuth error", err);
    return NextResponse.json(
      { error: "Xero OAuth failed" },
      { status: 500 }
    );
  }
}
