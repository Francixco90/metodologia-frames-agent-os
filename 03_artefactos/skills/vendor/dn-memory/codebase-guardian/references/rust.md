# Rust / Tauri

## Validate (run these — don't judge types by eye)

- **Check:** `cargo check` — fast compile check, the primary error catcher.
- **Lint:** `cargo clippy -- -D warnings` — clippy catches real bugs, not just style.
- **Format check:** `cargo fmt --check`.
- **Tests:** `cargo test`.
- **Tauri build sanity:** for the desktop shell, `cargo tauri build --debug` (or `cargo tauri dev` to smoke-test) — and the frontend has its own toolchain (see `typescript.md`), so validate both sides.

The compiler is strict and trustworthy here — if it compiles and clippy is clean, most error classes are gone. Believe it.

## Study before editing

Note error handling (`anyhow`/`thiserror`/custom `Result`), async runtime (tokio), module layout, and trait organization. Match the existing `Result`/error type rather than introducing a new one. For Tauri, note how commands are registered and how state is shared (`tauri::State`).

## Ripple traps

- **Changed a function signature / trait** → the compiler lists every broken impl and call site; fix them all (it won't let you forget — that's the point).
- **Changed an `enum`** → non-exhaustive `match` arms break; handle the new variant rather than adding a catch-all `_` that hides future additions.
- **Changed a `struct` used in serde (de)serialization** → both serialization sides and any persisted/wire format are affected; check `#[serde(...)]` attrs.
- **Tauri IPC command** → if you change a `#[tauri::command]` signature, update the frontend `invoke('cmd', {...})` call and its argument names/types (snake_case vs camelCase bridging matters).
- **Added a command** → register it in the `invoke_handler!`/`generate_handler!` macro, or it won't exist at runtime.
- **Shared state shape** → update every command that pulls `State<T>`.
- **Feature flags / `Cargo.toml`** → changing features can enable/disable code paths; `cargo check` with the project's flags.

## Don't

- Don't `.unwrap()`/`.clone()` your way past a borrow or error the existing code handles properly — match its error strategy.
- Don't `#[allow(...)]` away a clippy warning without noting why.

## Version note

These commands and traps reflect common, recent usage. Pin the exact version from the lockfile and, if it is recent or unfamiliar, check the current official docs for Rust/cargo/clippy and Tauri on the web before relying on a flag, command, or API here — they change between releases. Live docs win over this file.
