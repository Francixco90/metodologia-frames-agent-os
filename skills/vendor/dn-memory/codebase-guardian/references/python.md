# Python / Django

## Validate (run these — don't judge types by eye)

- **Type-check:** `mypy .` or `pyright` — whichever the project configures (check `pyproject.toml`, `mypy.ini`, `pyrightconfig.json`). If neither is set up, lean harder on tests.
- **Lint + format:** `ruff check .` and `ruff format --check .` (or `flake8`/`black` if that's what's configured).
- **Tests:** `pytest` or `python manage.py test`. Use the project's convention.
- **Django checks:** `python manage.py check` and `python manage.py makemigrations --check --dry-run` to confirm no model changes are missing migrations.

Use the project's environment (`poetry run`, `uv run`, `.venv`, or activated venv). Running the wrong interpreter gives false errors.

## Study before editing

Note the project layout (apps, services, where business logic lives vs views), how settings/env are loaded, the ORM patterns (managers, querysets), and serializer/DRF conventions. Match import ordering and typing style (are functions annotated? Pydantic? dataclasses?).

## Ripple traps

- **Changed a model field** → you almost always need a migration. Run `makemigrations`, review the generated file, and check no data migration is needed. Forgetting this is the #1 Django footgun.
- **Renamed/changed a model** → update serializers, forms, admin, querysets, and any `select_related`/`prefetch_related` that named fields.
- **Changed a DRF serializer** → update the API consumers and any frontend/client expecting that shape.
- **Changed a view/URL** → update `urls.py`, reverse() calls, and templates/clients referencing the route name.
- **Changed a function signature** → grep callers; Python won't catch arity mismatches until runtime unless you type-check.
- **Settings/env var rename** → grep `os.environ`, `settings.`, and `.env.example`; update all.
- **Async/sync boundaries** → don't call sync ORM in async context without the right wrapper.

## Don't

- Don't add `# type: ignore` to silence mypy without a reason noted.
- Don't edit a migration that's already applied in shared environments — add a new one.
- Don't skip `makemigrations` because the change "looks small."

## Version note

These commands and traps reflect common, recent usage. Pin the exact version from the lockfile and, if it is recent or unfamiliar, check the current official docs for Django/DRF/mypy/ruff on the web before relying on a flag, command, or API here — they change between releases. Live docs win over this file.
