// Convex Auth provider config.
// SITE_URL is the canonical env var for the auth redirect domain.
// CONVEX_SITE_URL is Convex's auto-injected deployment URL (read-only, built-in).
// We fall back to localhost for local dev if neither is set.
const siteUrl =
  process.env.SITE_URL ??
  process.env.CONVEX_SITE_URL ??
  "http://localhost:5173";

export default {
  providers: [
    {
      domain: siteUrl,
      applicationID: "convex",
    },
  ],
};
