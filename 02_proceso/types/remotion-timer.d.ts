/**
 * Compatibility shim for Remotion 4.0.494.
 *
 * The published declarations in `remotion/dist/cjs/delay-render.d.ts` and
 * `remotion/dist/cjs/index.d.ts` reference a global `Timer` type without
 * declaring it. Keep this alias narrow so `skipLibCheck` can remain disabled.
 */
type Timer = ReturnType<typeof setTimeout>;
