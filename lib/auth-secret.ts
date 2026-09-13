/** Edge-safe shared secret derivation for JWT (Web Crypto). */
export async function getAuthSecretKey(): Promise<Uint8Array> {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.DATABASE_URL ??
    "our-wedding-dev-secret-change-me";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return new Uint8Array(digest);
}
