import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can open without being logged in.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/accept-invitation",
  "/reset-password",
  "/auth",
  "/book",
  "/p",
];

// Pages that only make sense when logged OUT.
const AUTH_PAGES = ["/login", "/signup"];

function matches(pathname: string, paths: string[]) {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;

  // Two-factor: signed in with password but code not entered yet.
  let needsMfa = false;

  if (isLoggedIn) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa = aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2";
  }

  if (needsMfa && !pathname.startsWith("/api")) {
    if (pathname === "/login") return response;

    const mfaUrl = request.nextUrl.clone();
    mfaUrl.pathname = "/login";
    mfaUrl.search = "?mfa=1";
    return redirectWithCookies(mfaUrl, response);
  }

  // API routes answer 401 on their own; never redirect them.
  if (pathname.startsWith("/api")) {
    return response;
  }

  // Logged out and trying to open a private page -> go to login,
  // remembering where they wanted to go.
  if (!isLoggedIn && !matches(pathname, PUBLIC_PATHS)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    if (pathname !== "/" && pathname !== "/today") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }

    return redirectWithCookies(loginUrl, response);
  }

  // Logged in and opening login/signup -> go to the app.
  if (isLoggedIn && matches(pathname, AUTH_PAGES)) {
    const params = request.nextUrl.searchParams;

    // Keep invitation links working for logged-in users.
    const invite = params.get("invite");
    const target = request.nextUrl.clone();
    target.search = "";

    if (invite) {
      target.pathname = "/accept-invitation";
      target.searchParams.set("token", invite);
    } else {
      target.pathname = safeNext(params.get("next")) ?? "/today";
    }

    return redirectWithCookies(target, response);
  }

  return response;
}

// Only allow internal paths (prevents redirecting to other sites).
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value.split("?")[0];
}

// Keep any refreshed auth cookies when redirecting.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);

  from.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });

  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
