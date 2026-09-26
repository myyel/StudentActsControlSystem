import type { ActionResult } from "@/server/action-result";

/** Success or error line under a form, announced to screen readers. */
export function FormMessage({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (state.ok) {
    return state.message ? (
      <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
        {state.message}
      </p>
    ) : null;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  );
}

export const selectClassName =
  "h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";
