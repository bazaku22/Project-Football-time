import unittest
from scripts.reep_snapshot_inspector import classify_table, inspect_connection, quote_identifier


class FakeResult:
    def __init__(self, rows):
        self.rows = rows
    def fetchall(self):
        return self.rows
    def fetchone(self):
        return self.rows[0]


class FakeConnection:
    def execute(self, sql):
        if sql == "SHOW TABLES":
            return FakeResult([("entities",), ("provider bridges",), ("team_edges",)])
        if sql.startswith("DESCRIBE SELECT * FROM"):
            if '"entities"' in sql:
                return FakeResult([("reep_id", "VARCHAR", "YES"), ("entity_type", "VARCHAR", "YES")])
            if '"provider bridges"' in sql:
                return FakeResult([("reep_id", "VARCHAR", "YES"), ("provider", "VARCHAR", "YES"), ("external_id", "VARCHAR", "YES")])
            return FakeResult([("source_id", "VARCHAR", "YES"), ("target_id", "VARCHAR", "YES"), ("relation", "VARCHAR", "YES")])
        if sql.startswith("SELECT COUNT(*) FROM"):
            return FakeResult([(7,)])
        raise AssertionError(sql)


class ReepSnapshotInspectorTests(unittest.TestCase):
    def test_identifier_escaping(self):
        self.assertEqual(quote_identifier('odd"name'), '"odd""name"')

    def test_role_hints_are_conservative(self):
        self.assertEqual(classify_table(["reep_id", "entity_type"]), ["possible_entity_catalogue"])
        self.assertEqual(classify_table(["provider", "external_id", "reep_id"]), ["possible_provider_bridge"])
        self.assertEqual(classify_table(["source_id", "target_id", "relation"]), ["possible_relationship_edges"])
        self.assertEqual(classify_table(["team_id", "season"]), [])

    def test_schema_inspection_reports_structure_and_counts_only(self):
        report = inspect_connection(FakeConnection())
        self.assertEqual(report["table_count"], 3)
        self.assertEqual([row["row_count"] for row in report["tables"]], [7, 7, 7])
        bridges = next(row for row in report["tables"] if row["table"] == "provider bridges")
        self.assertIn("possible_provider_bridge", bridges["candidate_roles"])
        self.assertNotIn("rows", report)
        self.assertNotIn("data", report)


if __name__ == "__main__":
    unittest.main()
