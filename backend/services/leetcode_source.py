"""
Fetches real problems from LeetCode
(public list + GraphQL)
and optional company tags.

Personal-practice use only:
LeetCode's terms restrict scraping and
redistribution of problem text.
"""

import csv
import html
import io
import re
import time

from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import requests
from markdownify import markdownify as md


LC = "https://leetcode.com"

HEAD = {
    "User-Agent": "Mozilla/5.0 (NextRound practice app)",
    "Referer": LC + "/",
    "Content-Type": "application/json",
}

GH_REPO = "liquidslr/leetcode-company-wise-problems"

GH_API = (
    f"https://api.github.com/repos/"
    f"{GH_REPO}/contents"
)

DIFF = {
    1: "Easy",
    2: "Medium",
    3: "Hard",
}


class LeetCodeError(Exception):
    pass


_cache: Dict[str, Tuple[float, Any]] = {}


def _cached(
    key: str,
    ttl: int,
    fn
):
    hit = _cache.get(key)

    if hit and time.time() - hit[0] < ttl:
        return hit[1]

    val = fn()

    _cache[key] = (
        time.time(),
        val
    )

    return val


def list_problems() -> List[Dict[str, Any]]:

    def load():

        r = requests.get(
            f"{LC}/api/problems/algorithms/",
            headers=HEAD,
            timeout=20,
        )

        if r.status_code != 200:
            raise LeetCodeError(
                "LeetCode problem list "
                f"returned HTTP {r.status_code}"
            )

        out = []

        for p in r.json().get(
            "stat_status_pairs",
            []
        ):

            if p.get("paid_only"):
                continue

            st = p["stat"]

            out.append(
                {
                    "slug":
                        st["question__title_slug"],
                    "title":
                        st["question__title"],
                    "difficulty":
                        DIFF.get(
                            p["difficulty"]["level"],
                            "Medium",
                        ),
                    "id":
                        st.get(
                            "frontend_question_id"
                        ),
                }
            )

        return out

    return _cached(
        "all",
        86400,
        load
    )


def _norm(s: str) -> str:
    return re.sub(
        r"[^a-z0-9]",
        "",
        s.lower()
    )


def company_slugs(
    company: str
) -> List[str]:
    """
    Slugs of problems asked by `company`,
    from a community dataset on GitHub.

    [] if unavailable.
    """

    key = _norm(company)

    if not key:
        return []

    def load():

        try:

            root = requests.get(
                GH_API,
                timeout=15
            ).json()

            dirs = {
                _norm(x["name"]): x["name"]
                for x in root
                if x.get("type") == "dir"
            }

            match = (
                dirs.get(key)
                or next(
                    (
                        v
                        for k, v in dirs.items()
                        if k.startswith(key)
                    ),
                    None,
                )
            )

            if not match:
                return []

            files = requests.get(
                f"{GH_API}/{quote(match)}",
                timeout=15,
            ).json()

            pick = next(
                (
                    f
                    for f in files
                    if "all" in f["name"].lower()
                ),
                files[-1],
            )

            text = requests.get(
                pick["download_url"],
                timeout=20,
            ).text

            slugs = []

            for row in csv.DictReader(
                io.StringIO(text)
            ):

                m = re.search(
                    r"/problems/([^/]+)",
                    row.get(
                        "URL",
                        ""
                    )
                    or row.get(
                        "Link",
                        ""
                    ),
                )

                if m:
                    slugs.append(
                        m.group(1)
                    )

            return slugs

        except Exception:
            return []

    return _cached(
        f"co:{key}",
        86400,
        load
    )


def candidates(
    company: str,
    difficulty: str
) -> Tuple[
    List[Dict[str, Any]],
    bool
]:
    """
    Returns:
        (problems, company_matched)
    """

    d = (
        difficulty or ""
    ).strip().lower()

    want = {
        "easy": "Easy",
        "medium": "Medium",
        "hard": "Hard",
        "brutal": "Hard",
    }.get(d)

    allp = list_problems()

    by_slug = {
        p["slug"]: p
        for p in allp
    }

    pool = [
        by_slug[s]
        for s in company_slugs(company)
        if s in by_slug
    ]

    if want:
        pool = [
            p
            for p in pool
            if p["difficulty"] == want
        ]

    matched = bool(pool)

    if not pool:
        pool = [
            p
            for p in allp
            if not want
            or p["difficulty"] == want
        ]

    return pool, matched


QUERY = """
query q($slug:String!){
    question(titleSlug:$slug){
        questionFrontendId
        title
        titleSlug
        content
        difficulty
        exampleTestcases
        isPaidOnly
        topicTags{name}
        codeSnippets{
            langSlug
            code
        }
    }
}
"""


def fetch_problem(
    slug: str
) -> Dict[str, Any]:

    r = requests.post(
        f"{LC}/graphql",
        json={
            "query": QUERY,
            "variables": {
                "slug": slug
            },
        },
        headers=HEAD,
        timeout=25,
    )

    if r.status_code != 200:
        raise LeetCodeError(
            "LeetCode GraphQL returned "
            f"HTTP {r.status_code}"
        )

    q = (
        r.json().get("data") or {}
    ).get("question")

    if (
        not q
        or q.get("isPaidOnly")
        or not q.get("content")
    ):
        raise LeetCodeError(
            f"Problem {slug} is unavailable"
        )

    snippet = next(
        (
            s["code"]
            for s in q["codeSnippets"] or []
            if s["langSlug"] == "python3"
        ),
        None,
    )

    if not snippet:
        raise LeetCodeError(
            "No Python snippet"
        )

    c = re.sub(
        r"<sup>(.*?)</sup>",
        r"^\1",
        q["content"],
        flags=re.S,
    )

    c = re.sub(
        r"<sub>(.*?)</sub>",
        r"_\1",
        c,
        flags=re.S,
    )

    markdown = re.sub(
        r"\n{3,}",
        "\n\n",
        md(
            c,
            heading_style="ATX",
            bullets="-"
        ),
    ).strip()

    text = html.unescape(
        re.sub(
            r"<[^>]+>",
            "",
            q["content"]
        )
    )

    return {
        "slug":
            q["titleSlug"],
        "title":
            q["title"],
        "difficulty":
            q["difficulty"],
        "topic":
            (
                q["topicTags"][0]["name"]
                if q["topicTags"]
                else "General"
            ),
        "markdown":
            markdown,
        "python_snippet":
            snippet,
        "example_lines":
            [
                l
                for l in (
                    q["exampleTestcases"] or ""
                ).split("\n")
                if l != ""
            ],
        "example_outputs":
            [
                o.strip()
                for o in re.findall(
                    r"Output:\s*([^\n]+)",
                    text
                )
            ],
        "url":
            f"{LC}/problems/"
            f"{q['titleSlug']}/",
    }


def example_inputs(
    detail: Dict[str, Any],
    n_params: int
) -> List[List[str]]:

    lines = detail["example_lines"]

    return [
        lines[i:i + n_params]
        for i in range(
            0,
            len(lines) - n_params + 1,
            n_params,
        )
    ]