/**
 * Toolbar buttons in the app's main colour (ink, as "Puanla" and the header): a soft ink outline
 * on white, filled ink when switched on. Used with shadcn <Button>; pass `toggleOn` with cn().
 */
export const softOutlineButton =
  "h-12 gap-2 rounded-xl border-2 border-primary/25 bg-card px-5 text-base font-extrabold text-primary shadow-[0_3px_0_var(--kid-shadow)] hover:border-primary/40 hover:bg-accent";

/** Compact variant for a secondary toolbar (the Ölçek); still 44px tall on touch screens. */
export const softOutlineButtonSm =
  "h-10 gap-1.5 rounded-xl border-2 border-primary/25 bg-card px-3.5 text-sm font-extrabold text-primary shadow-[0_2px_0_var(--kid-shadow)] hover:border-primary/40 hover:bg-accent pointer-coarse:h-11";

export const toggleOn =
  "border-primary bg-primary text-primary-foreground shadow-none hover:border-primary hover:bg-primary/90";

/** A white bar holding tabs; the current tab is the ink pill inside it (class menu, subjects). */
export const tabBar = "rounded-full border bg-card p-1.5 shadow-[0_4px_0_var(--kid-shadow)]";
export const tabItem = "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors";
/** Compact bar and tabs (subjects on the Ölçek); tabs grow back to 44px on touch screens. */
export const tabBarSm = "rounded-full border bg-card p-1 shadow-[0_3px_0_var(--kid-shadow)]";
export const tabItemSm =
  "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-colors pointer-coarse:min-h-11";
export const tabItemCurrent = "bg-primary text-primary-foreground shadow-sm";
export const tabItemIdle = "text-foreground hover:bg-accent";
