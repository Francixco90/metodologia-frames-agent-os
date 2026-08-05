# Dart / Flutter — dart language-server

**Server command:** `dart language-server --protocol=lsp` (auto-detected from `pubspec.yaml`)

**Install:** ships with the Dart SDK (https://dart.dev/get-dart). Flutter installs bundle it — `dart` on PATH from a Flutter install works.

**Startup:** moderate; first run on a big Flutter app can take 5–15 s while the analyzer warms up. Use `--retry 15` if early queries come back empty.

## Quirks

- **Run `dart pub get` first** (or `flutter pub get`): the analyzer needs resolved packages; unresolved deps produce import errors and empty navigation results.
- **Generated code** (`*.g.dart`, `*.freezed.dart`): references into generated files are real results — but never hand-edit those files; regenerate with `dart run build_runner build` after a rename touches their sources.
- **Rename in widgets:** renaming a class also updates constructor invocations across the widget tree — expect (correctly) large dry-run lists.

## Smoke test

```bash
cd <a-flutter-project>
dart pub get
python <skill-dir>/scripts/lsp.py --root . --retry 15 symbols lib/main.dart
```

Expect a class/method outline of the file.
