import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AnalysisWorkspaceContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.workflow = (ROOT / ".github/workflows/ui-handicap-validation.yml").read_text(encoding="utf-8")
        cls.service_worker = (ROOT / "sw.js").read_text(encoding="utf-8")

    def test_analysis_insight_is_after_both_probability_panels(self):
        handicap = self.html.index('id="automaticHandicapOdds"')
        insight = self.html.index('id="analysisInsightOutput"')
        self.assertLess(handicap, insight)

    def test_runtime_moves_match_specific_insight_into_following_panel(self):
        match = re.search(r"function renderProbabilityAnalysis\(\)\s*\{([\s\S]*?)\n\}", self.html)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('getElementById("analysisInsightOutput")', body)
        self.assertIn('output.querySelector(".analysis-insight")', body)
        self.assertIn("insightTarget.appendChild(insight)", body)

    def test_analysis_insight_is_not_left_in_empty_or_stale_state(self):
        body = re.search(r"function renderProbabilityAnalysis\(\)\s*\{([\s\S]*?)\n\}", self.html).group(1)
        self.assertIn("insightTarget.replaceChildren()", body)

    def test_app_and_service_worker_versions_are_aligned(self):
        self.assertIn('application-version" content="6.7.0-beta.1"', self.html)
        self.assertIn('football-time-v54', self.service_worker)
        self.assertIn('application-version" content="6.7.0-beta.1"', self.workflow)
        self.assertIn('football-time-v54', self.workflow)

    def test_probability_model_and_handicap_panel_remain_present(self):
        self.assertIn("function computeMatchProbability(", self.html)
        self.assertIn('id="automaticHandicapOdds"', self.html)
        self.assertIn("Analysis Insight", self.html)


if __name__ == "__main__":
    unittest.main()
