export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code === "UNAUTHENTICATED" ? "Oturum açmanız gerekiyor." : "Bu işlem için yetkiniz yok.");
    this.name = "AuthError";
  }
}

export const unauthenticated = () => new AuthError("UNAUTHENTICATED");
// Same error whether the resource is missing or not owned, so existence never leaks.
export const forbidden = () => new AuthError("FORBIDDEN");
