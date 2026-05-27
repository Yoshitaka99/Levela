export function requireTriggerSecret() {
  const secret = process.env.AUTOMATION_TRIGGER_SECRET;
  if (!secret) {
    throw new Error("AUTOMATION_TRIGGER_SECRET is not set.");
  }
  return secret;
}

export function publicBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    "http://localhost:3000"
  );
}

export function isAuthorized(authHeader: string | null) {
  const secret = requireTriggerSecret();
  return authHeader === `Bearer ${secret}`;
}
