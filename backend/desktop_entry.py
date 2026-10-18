import runpy
import os
import sys


if len(sys.argv) == 3 and sys.argv[1] == "--run-python":
    script_path = sys.argv[2]
    sys.argv = [script_path]
    runpy.run_path(script_path, run_name="__main__")
else:
    import uvicorn
    from main import app

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=int(os.environ.get("NEXTROUND_PORT", "8000")),
        log_level="info",
    )
