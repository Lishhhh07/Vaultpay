const isProd = process.env.NODE_ENV === "production";

export const SESSION_COOKIE = `${isProd ? "__Secure-" : ""}merchant.session-token`;
export const CALLBACK_COOKIE = `${isProd ? "__Secure-" : ""}merchant.callback-url`;
export const CSRF_COOKIE = `${isProd ? "__Host-" : ""}merchant.csrf-token`;