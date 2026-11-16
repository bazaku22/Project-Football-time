import ast
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "scripts" / "build_football_database.py"
tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
wanted = {"valid_score", "valid_finished_result", "parse_timestamp", "apply_result_revisions"}
nodes = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in wanted]
assert {node.name for node in nodes} == wanted
module = ast.Module(body=[ast.ImportFrom(module="datetime", names=[ast.alias(name="datetime"), ast.alias(name="timezone")], level=0), *nodes], type_ignores=[])
module = ast.fix_missing_locations(module)
namespace = {}
exec(compile(module, str(SOURCE), "exec"), namespace)
apply_result_revisions = namespace["apply_result_revisions"]

class LegacyResultRevisionTests(unittest.TestCase):
    def setUp(self):
        self.old = {
            "providerMatchId": 560643, "leagueId": "PL", "season": "2026-2027",
            "status": "FINISHED", "homeScore": 2, "awayScore": 1
        }
        self.previous = {
            "generatedAt": "2026-11-15T10:00:00+00:00",
            "source": {"provider": "football-data.org"},
            "matches": [dict(self.old)],
            "resultRevisionHistory": []
        }

    def test_unchanged_legacy_result_stays_without_revision_metadata(self):
        current = [dict(self.old)]
        history = apply_result_revisions(current, self.previous, "2026-11-16T10:00:00+00:00")
        self.assertEqual(history, [])
        self.assertNotIn("resultRevision", current[0])
        self.assertNotIn("resultSource", current[0])
        legacy = current[0]["legacyResultSnapshot"]
        self.assertEqual(legacy["classification"], "legacy_database_snapshot")
        self.assertEqual(legacy["verificationStatus"], "not_independently_verified")
        self.assertEqual(legacy["observedAt"], "2026-11-15T10:00:00+00:00")

    def test_changed_current_provider_score_starts_new_revision_and_preserves_legacy_snapshot(self):
        changed = dict(self.old, homeScore=3, awayScore=1)
        current = [changed]
        history = apply_result_revisions(current, self.previous, "2026-11-16T10:00:00+00:00")
        self.assertEqual(len(history), 1)
        self.assertEqual(current[0]["resultRevision"], 1)
        self.assertEqual(current[0]["legacyResultSnapshot"]["homeScore"], 2)
        self.assertEqual(history[0]["homeScore"], 3)

    def test_omitted_legacy_match_is_preserved_without_revision(self):
        current = []
        history = apply_result_revisions(current, self.previous, "2026-11-16T10:00:00+00:00")
        self.assertEqual(history, [])
        self.assertEqual(len(current), 1)
        self.assertEqual(current[0]["legacyResultSnapshot"]["awayScore"], 1)
        self.assertNotIn("resultRevision", current[0])

    def test_revision_number_without_history_fails_closed(self):
        broken = dict(self.old, resultRevision=1)
        previous = dict(self.previous, matches=[broken])
        with self.assertRaisesRegex(RuntimeError, "no revision history"):
            apply_result_revisions([dict(self.old)], previous, "2026-11-16T10:00:00+00:00")

if __name__ == "__main__":
    unittest.main()
