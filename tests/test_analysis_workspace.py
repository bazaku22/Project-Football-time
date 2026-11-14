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
        self.assertIn("analysis-details", body)
        self.assertIn("detailNodes.forEach(node=>content.appendChild(node))", body)

    def test_analysis_insight_is_not_left_in_empty_or_stale_state(self):
        body = re.search(r"function renderProbabilityAnalysis\(\)\s*\{([\s\S]*?)\n\}", self.html).group(1)
        self.assertIn("insightTarget.replaceChildren()", body)

    def test_app_and_service_worker_versions_are_aligned(self):
        self.assertIn('application-version" content="6.26.5-beta.8"', self.html)
        self.assertIn('football-time-v99', self.service_worker)
        self.assertIn('application-version" content="6.26.5-beta.8"', self.workflow)
        self.assertIn('football-time-v99', self.workflow)

    def test_probability_model_uses_five_and_ten_match_form_and_opponent_strength(self):
        self.assertIn('const PROBABILITY_MODEL_VERSION="pft-poisson-2.0"', self.html)
        self.assertIn("form5PPG", self.html)
        self.assertIn("form10PPG", self.html)
        self.assertIn("opponentPPG", self.html)
        self.assertIn("home.opponentCount>=3", self.html)
        self.assertIn("h2h.length>=5", self.html)
        self.assertIn("minimumSample:5", self.html)
        self.assertIn("String(x.matchId)+\"|\"+String(x.modelVersion||\"legacy/unknown\")", self.html)
        self.assertIn("snapshotKey=id+\"|\"+PROBABILITY_MODEL_VERSION", self.html)

    def test_research_statistics_panel_is_loaded_without_changing_probability_model(self):
        self.assertIn('./js/research-insight.js', self.html)
        self.assertIn('./css/football-research.css?v=1', self.html)
        self.assertIn('football-research-stats-2026-27.json', (ROOT / "js/research-insight.js").read_text(encoding="utf-8"))
        self.assertIn('function computeMatchProbability(', self.html)

    def test_probability_model_and_handicap_panel_remain_present(self):
        self.assertIn("function computeMatchProbability(", self.html)
        self.assertIn('id="automaticHandicapOdds"', self.html)
        self.assertIn("Analysis Insight", self.html)


if __name__ == "__main__":
    unittest.main()
