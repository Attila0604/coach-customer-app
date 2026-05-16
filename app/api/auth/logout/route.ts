import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "coach_customer_id";

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";

  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
