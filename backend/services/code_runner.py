import json
from typing import Any, Dict, List, Optional

from services.sandbox import run_batch
from services.signature import MARK, build_source


def parse_result(
    run: Dict[str, Any]
) -> Optional[Any]:
    """
    Extract the JSON after <<RESULT>>;
    user print() output before it is ignored.
    """

    if run.get("rc") != 0:
        return None

    out = run.get("stdout", "")

    i = out.rfind(MARK)

    if i < 0:
        return None

    lines = (
        out[i + len(MARK):]
        .strip()
        .splitlines()
    )

    if not lines:
        return None

    try:
        return json.loads(lines[0])
    except ValueError:
        return None


def _canon(
    v: Any,
    unordered: bool
) -> Any:

    if isinstance(v, list):

        items = [
            _canon(x, unordered)
            for x in v
        ]

        return (
            sorted(
                items,
                key=lambda x:
                    json.dumps(
                        x,
                        sort_keys=True
                    )
            )
            if unordered
            else items
        )

    return v


def _eq(a: Any, b: Any) -> bool:

    if isinstance(a, bool) or isinstance(b, bool):
        return (
            isinstance(a, bool)
            and isinstance(b, bool)
            and a == b
        )

    if (
        isinstance(a, (int, float))
        and isinstance(b, (int, float))
    ):
        return abs(a - b) <= (
            1e-5
            * max(
                1.0,
                abs(a),
                abs(b)
            )
        )

    if isinstance(a, list) and isinstance(b, list):
        return (
            len(a) == len(b)
            and all(
                _eq(x, y)
                for x, y in zip(a, b)
            )
        )

    return a == b


def values_equal(
    expected: Any,
    actual: Any,
    mode: str = "exact"
) -> bool:

    un = mode == "unordered"

    return _eq(
        _canon(expected, un),
        _canon(actual, un)
    )


def execute_code(
    language: str,
    code: str,
    question: Dict[str, Any],
    mode: str
) -> Dict[str, Any]:

    spec = question["spec"]
    tests = question["tests"]

    if mode != "submit":
        tests = [
            t
            for t in tests
            if not t["hidden"]
        ]

    base = {
        "language": language,
        "total_cases": len(tests),
    }

    try:
        source = build_source(
            language,
            code,
            spec
        )

    except ValueError as e:
        return {
            **base,
            "all_passed": False,
            "passed_cases": 0,
            "results": [],
            "compilation_error": str(e),
        }

    batch = run_batch(
        language,
        source,
        [
            t["input"]
            for t in tests
        ],
    )

    if batch["compile_error"]:
        return {
            **base,
            "all_passed": False,
            "passed_cases": 0,
            "results": [],
            "compilation_error":
                batch["compile_error"],
        }

    results: List[Dict[str, Any]] = []

    for i, (t, run) in enumerate(
        zip(tests, batch["runs"])
    ):

        hidden = t["hidden"]

        err = None
        actual = None

        if run["rc"] == 124:
            err = "Time Limit Exceeded"

        elif run["rc"] == 137:
            err = (
                "Memory Limit Exceeded "
                "(process killed)"
            )

        elif run["rc"] != 0:
            err = (
                run["stderr"].strip()[-600:]
                or f"Runtime error "
                   f"(exit code {run['rc']})"
            )

        else:
            actual = parse_result(run)

            if actual is None:
                err = (
                    "No result produced. "
                    "Make sure your function "
                    "returns a value."
                )

        passed = (
            err is None
            and values_equal(
                json.loads(t["expected"]),
                actual,
                spec.get(
                    "compare",
                    "exact"
                ),
            )
        )

        shown_actual = (
            json.dumps(actual)
            if actual is not None
            else None
        )

        results.append(
            {
                "test_index": i + 1,
                "hidden": hidden,
                "input":
                    "[Hidden]"
                    if hidden
                    else t["input"],
                "expected":
                    "[Hidden]"
                    if hidden
                    else t["expected"],
                "actual":
                    (
                        "[Passed]"
                        if passed
                        else "[Hidden Result]"
                    )
                    if hidden
                    else shown_actual,
                "passed": passed,
                "execution_time_ms":
                    max(1, run["ms"]),
                "error": err,
            }
        )

    n_pass = sum(
        1
        for r in results
        if r["passed"]
    )

    return {
        **base,
        "all_passed":
            n_pass == len(results)
            and len(results) > 0,
        "passed_cases": n_pass,
        "results": results,
    }