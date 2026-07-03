export const CHATBOT_ADMIN_PASSWORD =
  process.env.CHATBOT_ADMIN_PASSWORD || "Levela2026";

export function isChatbotAdminAuthorized(request: Request) {
  return (
    request.headers.get("x-levela-admin-password") === CHATBOT_ADMIN_PASSWORD
  );
}
