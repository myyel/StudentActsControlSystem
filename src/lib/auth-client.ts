import { createAuthClient } from "better-auth/react";

// Same-origin: sign-in goes through /api/auth so Better Auth's rate limiting applies.
export const authClient = createAuthClient();
