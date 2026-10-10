import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Redirects "/" to "/th" or "/en" and keeps the language in the URL.
// (Next.js 16 calls this file proxy.ts; it was middleware.ts before.)
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
