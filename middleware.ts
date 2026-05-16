import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "coach_customer_id";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/me")) {
    return NextResponse.next();
  }

  const customerId = request.cookies.get(SESSION_COOKIE)?.value;

  if (!customerId) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/me/:path*"],
};
