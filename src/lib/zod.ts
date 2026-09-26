import { z } from "zod";

// Fallback messages in Turkish for any rule without a custom message.
// Import z from here, not from "zod", so the locale is always configured.
z.config(z.locales.tr());

export { z };
