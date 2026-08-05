# Flutter / Dart

## Validate (run these — don't judge types by eye)

- **Analyze:** `flutter analyze` (or `dart analyze`) — the primary error + lint catcher. Respect `analysis_options.yaml`.
- **Format check:** `dart format --output=none --set-exit-if-changed .`
- **Codegen (if used):** `dart run build_runner build --delete-conflicting-outputs` — required after touching anything that generates code (freezed, json_serializable, injectable, retrofit, drift, go_router_builder).
- **Tests:** `flutter test`.
- **Build sanity:** `flutter build apk --debug` (or the target platform) for changes that might break compilation only at build time.

## Study before editing

Note state management (BLoC/Cubit, Riverpod, Provider), routing (go_router config style), DI (get_it/injectable), and folder structure (feature-first vs layer-first). Match it — mixing two state patterns in one feature is a smell. Check `pubspec.yaml` for which codegen packages are in play.

## Ripple traps

- **Edited a `freezed`/`json_serializable` model** → rerun `build_runner`; the `.g.dart`/`.freezed.dart` files are stale until you do, and analyze will lie if they're out of date.
- **Added/renamed a route** → update the `go_router` config, route name constants, and every `context.go`/`push` call site.
- **Changed a BLoC event/state** → update the bloc handler, every `BlocBuilder`/`BlocListener` reading that state, and the events dispatched from the UI.
- **Changed a repository/service interface** → update implementations, the DI registration, and mocks in tests.
- **Changed an API model** → update the mapping from DTO to domain entity and back.
- **`pubspec.yaml` dependency change** → run `flutter pub get`; check for breaking-change migration notes.
- **Const/immutability** → adding a field to an `@immutable`/freezed class ripples to every constructor call.

## Don't

- Don't hand-edit generated (`*.g.dart`, `*.freezed.dart`) files — regenerate.
- Don't ignore analyzer warnings to ship; they're often real null-safety bugs.

## Version note

These commands and traps reflect common, recent usage. Pin the exact version from the lockfile and, if it is recent or unfamiliar, check the current official docs for Flutter/Dart and codegen packages (freezed, go_router, etc.) on the web before relying on a flag, command, or API here — they change between releases. Live docs win over this file.
