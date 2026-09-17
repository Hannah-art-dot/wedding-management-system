/** Edge-safe shared secret derivation for JWT (Web Crypto). */
export async function getAuthSecretKey(): Promise<Uint8Array> {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: AUTH_SECRET is required in production environments.");
    }
    console.warn("WARNING: Using insecure fallback auth secret for development.");
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret || "our-wedding-dev-secret-change-me"),
  );
  return new Uint8Array(digest);
}
