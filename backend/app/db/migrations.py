"""Small, idempotent SQLite migrations for the local MVP database."""
from sqlalchemy import Engine, inspect, text


def run_sqlite_migrations(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        if "jobs" in tables:
            job_columns = {column["name"] for column in inspect(connection).get_columns("jobs")}
            if "entity_id" not in job_columns:
                connection.execute(text("ALTER TABLE jobs ADD COLUMN entity_id VARCHAR"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_jobs_entity_id ON jobs (entity_id)"))

        if "cases" in tables:
            case_columns = {column["name"] for column in inspect(connection).get_columns("cases")}
            if "outcome_at" not in case_columns:
                connection.execute(text("ALTER TABLE cases ADD COLUMN outcome_at VARCHAR"))
            # Older installations had no outcome timestamp. The creation time is only a
            # one-time best-effort backfill; new outcomes always record their actual time.
            connection.execute(text(
                "UPDATE cases SET outcome_at = created_at "
                "WHERE outcome IS NOT NULL AND outcome_at IS NULL"
            ))

        if "assets" in tables:
            asset_columns = {column["name"] for column in inspect(connection).get_columns("assets")}
            if "retired_at" not in asset_columns:
                connection.execute(text("ALTER TABLE assets ADD COLUMN retired_at VARCHAR"))
