import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.XERO_CLIENT_ID!;
  const redirectUri = process.env.XERO_REDIRECT_URI!;
  const scope = process.env.XERO_SCOPES!;

  const authUrl =
    "https://login.xero.com/identity/connect/authorize?" +
    `response_type=code&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return NextResponse.redirect(authUrl);
}