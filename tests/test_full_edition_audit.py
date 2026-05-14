import ast
from pathlib import Path
import tomllib


ROOT = Path(__file__).resolve().parent.parent


def test_brain_llm_router_parses_as_python():
    source = (ROOT / "services" / "brain-service" / "llm_router.py").read_text(
        encoding="utf-8"
    )
    ast.parse(source)


def test_pyproject_points_to_existing_packages():
    pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    scripts = pyproject["project"]["scripts"]
    packages = pyproject["tool"]["setuptools"]["packages"]
    pytest_config = pyproject["tool"]["pytest"]["ini_options"]

    assert scripts["biodockify"] == "app.launcher:main"
    assert "app" in packages
    assert "backend" in packages
    assert pytest_config["testpaths"] == ["tests"]


def test_api_backend_sanitizes_upload_and_download_paths():
    source = (ROOT / "services" / "api-backend" / "main.py").read_text(
        encoding="utf-8"
    )

    assert 'safe_name = Path(filename or "").name' in source
    assert 'raise HTTPException(status_code=400, detail="Invalid filename")' in source


def test_docker_compose_uses_env_postgres_password_and_local_bindings():
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")

    assert "${POSTGRES_PASSWORD:-dockpass}" in compose
    assert '"127.0.0.1:6379:6379"' in compose
    assert '"127.0.0.1:5432:5432"' in compose