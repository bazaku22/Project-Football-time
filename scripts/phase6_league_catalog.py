"""Canonical Phase 6 league catalogue.

Only competitions included in the configured football-data.org free tier are
enabled for scheduled ingestion. Other requested leagues remain visible as
planned entries but must not trigger API requests or receive fabricated data.
"""

PROVIDER_LEAGUES = [
    {"id": "PL", "name": "Premier League", "country": "England",
     "providerCompetitionCode": "PL", "dataStatus": "available",
     "seasonFormat": "cross_year"},
    {"id": "PD", "name": "La Liga", "country": "Spain",
     "providerCompetitionCode": "PD", "dataStatus": "available",
     "seasonFormat": "cross_year"},
    {"id": "BL1", "name": "Bundesliga", "country": "Germany",
     "providerCompetitionCode": "BL1", "dataStatus": "available",
     "seasonFormat": "cross_year"},
    {"id": "SA", "name": "Serie A", "country": "Italy",
     "providerCompetitionCode": "SA", "dataStatus": "available",
     "seasonFormat": "cross_year"},
    {"id": "FL1", "name": "Ligue 1", "country": "France",
     "providerCompetitionCode": "FL1", "dataStatus": "available",
     "seasonFormat": "cross_year"},
    {"id": "ELC", "name": "EFL Championship", "country": "England",
     "providerCompetitionCode": "ELC", "dataStatus": "available",
     "seasonFormat": "cross_year"},
]

PLANNED_LEAGUES = [
    {"id": "J1", "name": "J1 League", "country": "Japan",
     "providerCompetitionCode": None,
     "dataStatus": "not_available_on_current_free_tier",
     "seasonFormat": "calendar_year"},
    {"id": "J2", "name": "J2 League", "country": "Japan",
     "providerCompetitionCode": None,
     "dataStatus": "not_available_on_current_free_tier",
     "seasonFormat": "calendar_year"},
]

LEAGUE_CATALOG = PROVIDER_LEAGUES + PLANNED_LEAGUES
