"""Drop [dev-dependencies] (and [[bench]]/[[test]]/[[example]]) tables from a Cargo.toml in place.
Used when the AI Slide app gets its own copy of the engine crates (engine-src/)."""
import re
import sys

path = sys.argv[1]
out, skip = [], False
for line in open(path, encoding="utf-8").read().split("\n"):
    m = re.match(r"^\[\[?(.*?)\]\]?\s*$", line)
    if m:
        skip = "dev-dependencies" in m.group(1) or m.group(1) in ("bench", "test", "example")
    if not skip:
        out.append(line)
open(path, "w", encoding="utf-8").write("\n".join(out))
