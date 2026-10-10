import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware versions of Link, useRouter, usePathname, ...
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
