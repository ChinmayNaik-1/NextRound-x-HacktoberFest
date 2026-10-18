"""
Runs untrusted code in a throw-away Docker container
(no network, capped memory/CPU/pids).

SANDBOX_MODE=local runs on the host with NO isolation -
development only.
"""

import os
import shutil
import subprocess
import tempfile
from typing import Any, Dict, List


MODE = os.environ.get("SANDBOX_MODE", "docker")

IMAGES = {
    "python": os.environ.get(
        "IMG_PY",
        "python:3.12-slim"
    ),
    "cpp": os.environ.get(
        "IMG_CPP",
        "gcc:13"
    ),
    "java": os.environ.get(
        "IMG_JAVA",
        "eclipse-temurin:21-jdk"
    ),
}

SOURCE_FILE = {
    "python": "sol.py",
    "cpp": "sol.cpp",
    "java": "Main.java",
}


RUN_SH = r'''#!/bin/sh

W="${WORK:-/work}"

cd "$W" || exit 1

mkdir -p out

case "$LANG_ID" in
  python)
    CMD="python3 sol.py"
    ;;

  cpp)
    g++ -O2 -std=c++17 -o sol sol.cpp 2> out/compile.err || {
      echo 1 > out/compile.rc
      exit 0
    }

    CMD="./sol"
    ;;

  java)
    javac -encoding UTF-8 Main.java 2> out/compile.err || {
      echo 1 > out/compile.rc
      exit 0
    }

    CMD="java -Xmx256m -Xss64m Main"
    ;;
esac

for f in tests/*.in; do
  n=$(basename "$f" .in)

  s=$(date +%s%N)

  timeout "$TL" $CMD \
    < "$f" \
    > "out/$n.out" \
    2> "out/$n.err"

  echo $? > "out/$n.rc"

  e=$(date +%s%N)

  echo $(( (e - s) / 1000000 )) > "out/$n.ms"
done
'''


def docker_available() -> bool:
    return MODE == "local" or shutil.which("docker") is not None


def _read(
    path: str,
    limit: int = 100_000
) -> str:

    try:
        with open(
            path,
            "r",
            encoding="utf-8",
            errors="replace"
        ) as fh:
            return fh.read(limit)

    except OSError:
        return ""


def run_batch(
    language: str,
    source: str,
    inputs: List[str],
    time_limit: int = 3
) -> Dict[str, Any]:
    """
    Compile once (if needed) and run every stdin in `inputs`.

    Returns:
    {
        "compile_error": str | None,
        "runs": [
            {
                "stdout": str,
                "stderr": str,
                "rc": int,
                "ms": int
            }
        ]
    }
    """

    if language not in SOURCE_FILE:
        return {
            "compile_error":
                f"Unsupported language: {language}",
            "runs": [],
        }

    if not docker_available():
        return {
            "compile_error":
                "Docker is not installed or not on PATH "
                "(needed to run code safely).",
            "runs": [],
        }

    work = tempfile.mkdtemp(
        prefix="nr_"
    )

    try:
        os.makedirs(
            os.path.join(work, "tests")
        )

        os.makedirs(
            os.path.join(work, "out")
        )

        with open(
            os.path.join(
                work,
                SOURCE_FILE[language]
            ),
            "w",
            encoding="utf-8"
        ) as fh:
            fh.write(source)

        with open(
            os.path.join(work, "run.sh"),
            "w",
            newline="\n"
        ) as fh:
            fh.write(RUN_SH)

        for i, stdin in enumerate(inputs):
            with open(
                os.path.join(
                    work,
                    "tests",
                    f"{i:03d}.in"
                ),
                "w",
                encoding="utf-8",
                newline="\n"
            ) as fh:

                fh.write(
                    stdin
                    if stdin.endswith("\n")
                    else stdin + "\n"
                )

        for p in (
            work,
            os.path.join(work, "out"),
            os.path.join(work, "tests"),
        ):
            try:
                os.chmod(p, 0o777)
            except OSError:
                pass

        tl = time_limit + (
            2 if language == "java" else 0
        )

        if MODE == "docker":

            cmd = [
                "docker",
                "run",
                "--rm",
                "--network",
                "none",
                "--memory",
                "512m",
                "--memory-swap",
                "512m",
                "--cpus",
                "1",
                "--pids-limit",
                "128",
                "--security-opt",
                "no-new-privileges",
                "--user",
                "65534:65534",
                "--tmpfs",
                "/tmp:exec,size=64m",
                "-v",
                f"{work}:/work",
                "-e",
                f"LANG_ID={language}",
                "-e",
                f"TL={tl}",
                IMAGES[language],
                "sh",
                "/work/run.sh",
            ]

            env = None

        else:

            cmd = [
                "sh",
                os.path.join(
                    work,
                    "run.sh"
                )
            ]

            env = {
                **os.environ,
                "WORK": work,
                "LANG_ID": language,
                "TL": str(tl),
            }

        total_timeout = (
            tl * max(1, len(inputs))
            + (
                90
                if language != "python"
                else 30
            )
        )

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                timeout=total_timeout,
                env=env,
            )

        except subprocess.TimeoutExpired:
            pass

        out_dir = os.path.join(
            work,
            "out"
        )

        if os.path.exists(
            os.path.join(
                out_dir,
                "compile.rc"
            )
        ):

            return {
                "compile_error": _read(
                    os.path.join(
                        out_dir,
                        "compile.err"
                    ),
                    3000
                ).replace(work, "."),
                "runs": [],
            }

        runs = []

        for i in range(len(inputs)):

            n = os.path.join(
                out_dir,
                f"{i:03d}"
            )

            rc_txt = _read(
                n + ".rc"
            ).strip()

            ms_txt = _read(
                n + ".ms"
            ).strip()

            runs.append(
                {
                    "stdout": _read(
                        n + ".out"
                    ),

                    "stderr": _read(
                        n + ".err",
                        2000
                    ).replace(work, "."),

                    "rc": (
                        int(rc_txt)
                        if rc_txt.lstrip("-").isdigit()
                        else -1
                    ),

                    "ms": (
                        int(ms_txt)
                        if ms_txt.isdigit()
                        else 0
                    ),
                }
            )

        return {
            "compile_error": None,
            "runs": runs,
        }

    finally:
        shutil.rmtree(
            work,
            ignore_errors=True
        )