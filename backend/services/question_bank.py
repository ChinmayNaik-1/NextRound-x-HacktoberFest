import json
import logging
import random
import uuid
from typing import Any, Dict, List, Sequence

from services import db
from services import leetcode_source as lc
from services.ai_agent import AIAgent
from services.code_runner import values_equal
from services.signature import (
    Unsupported,
    parse_python_snippet,
    starter_code,
)

log = logging.getLogger("questions")

MAX_TRIES = 6


class Reject(Exception):
    pass


def _ok(v: Any, t: str) -> bool:
    """
    Validate a value against the parsed Python parameter type.

    Supported:
        int
        float
        str
        bool
        List[T]
    """

    if t == "int":
        return (
            isinstance(v, int)
            and not isinstance(v, bool)
        )

    if t == "float":
        return (
            isinstance(v, (int, float))
            and not isinstance(v, bool)
        )

    if t == "str":
        return isinstance(v, str)

    if t == "bool":
        return isinstance(v, bool)

    if t.startswith("List["):
        return (
            isinstance(v, list)
            and all(
                _ok(x, t[5:-1])
                for x in v
            )
        )

    return False


def _valid(
    args: Any,
    params: List[Dict[str, str]],
) -> bool:
    """
    Check whether an example contains the
    correct number and types of arguments.
    """

    return (
        isinstance(args, list)
        and len(args) == len(params)
        and all(
            _ok(a, p["type"])
            for a, p in zip(args, params)
        )
    )


def _stdin(args: List[Any]) -> str:
    """
    Convert function arguments into the stdin
    format expected by the sandbox runner.
    """

    return "\n".join(
        json.dumps(a)
        for a in args
    )


def _build(
    agent: AIAgent,
    detail: Dict[str, Any],
    company: str,
    matched: bool,
) -> Dict[str, Any]:
    """
    Build a question directly from the LeetCode
    source.

    IMPORTANT:
    This function intentionally does NOT ask the LLM
    to generate a reference solution or extra tests.

    The old implementation made question loading
    dependent on Gemini producing a correct solution.
    That caused failures such as:

        reference disagrees with LeetCode example
        parameter type 'list[int]'

    Loading a question should not require AI verification.
    """

    try:
        sig = parse_python_snippet(
            detail["python_snippet"]
        )
    except Exception as e:
        raise Reject(
            f"could not parse Python signature: {e}"
        )

    params = sig["params"]

    # ---------------------------------------------------------
    # Extract LeetCode's own examples.
    # ---------------------------------------------------------

    ex_args: List[List[Any]] = []

    try:
        chunks = lc.example_inputs(
            detail,
            len(params),
        )
    except Exception as e:
        raise Reject(
            f"could not parse examples: {e}"
        )

    for chunk in chunks:
        try:
            args = [
                json.loads(x)
                for x in chunk
            ]
        except (ValueError, TypeError):
            continue

        if _valid(args, params):
            ex_args.append(args)

    # A problem can still be useful even if the source
    # does not expose examples in a format we understand.
    #
    # We therefore don't reject the question merely because
    # examples could not be parsed.
    #
    # However, if there are no examples at all, we create
    # an empty test set rather than inventing expected outputs.
    if not ex_args:
        log.warning(
            "No parsable examples for %s",
            detail.get("slug"),
        )

    # ---------------------------------------------------------
    # Build test cases from LeetCode examples only.
    #
    # Expected outputs come directly from the source.
    # No LLM-generated reference solution is used.
    # ---------------------------------------------------------

    tests: List[Dict[str, Any]] = []

    outputs = detail.get(
        "example_outputs",
        [],
    )

    for i, args in enumerate(ex_args):

        if i >= len(outputs):
            break

        raw_output = outputs[i]

        try:
            expected = json.loads(raw_output)
        except (ValueError, TypeError):
            continue

        tests.append(
            {
                "input": _stdin(args),
                "expected": json.dumps(expected),
                "hidden": False,
            }
        )

    # ---------------------------------------------------------
    # Store the question.
    # ---------------------------------------------------------

    spec = {
        **sig,
        "compare": "exact",
        "slug": detail["slug"],
        "title": detail["title"],
        "difficulty": detail["difficulty"],
        "topic": detail["topic"],
        "description_md": detail["markdown"],
        "url": detail["url"],
        "companies": (
            [company]
            if matched
            else []
        ),
    }

    qid = uuid.uuid4().hex[:8]

    db.save_question(
        qid,
        detail["slug"],
        detail["title"],
        detail["difficulty"],
        spec,
        tests,
    )

    return (
        db.get_question_by_slug(
            detail["slug"]
        )
        or {
            "id": qid,
            "spec": spec,
            "tests": tests,
        }
    )


def public_view(
    rec: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Return the question format consumed by the frontend.
    """

    spec = rec["spec"]
    tests = rec["tests"]

    open_tests = [
        t
        for t in tests
        if not t["hidden"]
    ]

    return {
        "id": rec["id"],
        "title": spec["title"],
        "companies": spec.get(
            "companies",
            [],
        ),
        "difficulty": spec["difficulty"],
        "topic": spec["topic"],
        "description": spec[
            "description_md"
        ],
        "source_url": spec["url"],
        "starter_code": starter_code(spec),
        "test_cases": open_tests,
        "hidden_count": (
            len(tests)
            - len(open_tests)
        ),
    }


def get_question(
    agent: AIAgent,
    company: str,
    difficulty: str,
    exclude_ids: Sequence[str] = (),
) -> Dict[str, Any]:
    """
    Find and load a suitable question.

    Question loading is now independent of the LLM.
    """

    excluded = set()

    for qid in exclude_ids:

        rec = db.get_question(qid)

        if rec:
            excluded.add(
                rec["slug"]
            )

    pool, matched = lc.candidates(
        company,
        difficulty,
    )

    random.shuffle(pool)

    tried = 0
    last_reason = ""

    for c in pool:

        if c["slug"] in excluded:
            continue

        # -----------------------------------------------------
        # Use cached question if available.
        # -----------------------------------------------------

        cached = db.get_question_by_slug(
            c["slug"]
        )

        if cached:
            return public_view(cached)

        if tried >= MAX_TRIES:
            break

        tried += 1

        try:
            detail = lc.fetch_problem(
                c["slug"]
            )

            return public_view(
                _build(
                    agent,
                    detail,
                    company,
                    matched,
                )
            )

        except (
            Unsupported,
            Reject,
            lc.LeetCodeError,
        ) as e:

            last_reason = (
                f"{c['slug']}: {e}"
            )

            log.info(
                "skipped %s",
                last_reason,
            )

        except Exception as e:
            # Don't let one malformed/problematic
            # LeetCode entry kill the entire selection.
            last_reason = (
                f"{c['slug']}: {e}"
            )

            log.exception(
                "unexpected error while "
                "building question %s",
                c["slug"],
            )

    raise RuntimeError(
        f"Could not load a suitable question "
        f"after {tried} tries "
        f"({last_reason}). Try again."
    )