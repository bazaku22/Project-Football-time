
# Project Football Time
# Football Database Schema v1.1

## 1. Purpose

This document defines the data structure and identity rules
for the five supported European football leagues.

The database must preserve historical accuracy,
support future seasons, and prevent duplicate team records.

## 2. Supported Leagues

| League ID | League | Country |
|---|---|---|
| PL | Premier League | England |
| PD | La Liga | Spain |
| BL1 | Bundesliga | Germany |
| SA | Serie A | Italy |
| FL1 | Ligue 1 | France |

League IDs must remain stable.

## 3. Team Identity

Every team must have a permanent internal ID.

Format:

football-data:{providerTeamId}

Example:

football-data:57

Rules:

- Use the actual provider team ID.
- Never generate IDs from team names.
- Never reuse an ID for another club.
- A team keeps its ID when promoted or relegated.
- A team keeps its ID when its display name changes.
- Similar names do not prove that two records are the same team.

## 4. Team Season Membership

Team identity must be separated from league participation.

Each membership record contains:

- teamId
- leagueId
- season
- providerCompetitionId
- seasonStart
- seasonEnd

A team moving to another league must receive a new membership record.

Do not create a new team identity simply because its league changes.

## 5. Historical Match Records

Every match must preserve:

- providerMatchId
- leagueId
- season
- utcDate
- status
- homeTeamId
- awayTeamId
- homeTeamName
- awayTeamName
- homeScore
- awayScore

The homeTeamName and awayTeamName fields are historical name snapshots.

Do not automatically replace historical match names
when a team's current name changes.

## 6. Standings

Standings must be stored separately for each league and season.

Each row should include:

- leagueId
- season
- teamId
- position
- played
- won
- draw
- lost
- goalsFor
- goalsAgainst
- goalDifference
- points
- updatedAt

Standings must not overwrite historical match results.

## 7. Match Data Rules

- Store provider dates in ISO-8601 format.
- Store scores as numbers.
- Use null for unavailable scores.
- Never interpret a missing score as zero.
- Preserve the provider match status.
- Only completed matches with valid final scores
  can be used for historical result calculations.

## 8. Data Source and Freshness

Every dataset must identify:

- Provider
- API version
- Last successful synchronization
- Generated timestamp

Do not invent missing data.

The application should be able to show
when its football data was last updated.

## 9. API Security

- API keys must remain in GitHub Secrets.
- Never place API keys in index.html.
- Never expose API keys in JSON files.
- Use GitHub Actions for scheduled data retrieval.
- Respect provider API limits and subscription terms.

## 10. Existing Application Data Protection

The existing localStorage key is:

pft_matches_v1

Rules:

- Preserve all existing test records #001–#007.
- Do not clear localStorage.
- Do not overwrite existing user records.
- Do not perform an automatic migration.
- Test any future migration separately.
- Require explicit approval before changing main.

## 11. Implementation Sequence

1. Verify API access to teams endpoints.
2. Verify API access to fixtures and results.
3. Build stable team records.
4. Build team-season membership records.
5. Generate standings JSON.
6. Generate fixtures and results JSON.
7. Validate all five leagues.
8. Connect the database to the application.
9. Test on a feature branch.
10. Merge only after user approval.

## 12. Project Constraints

- Monthly operating cost target: 0 THB.
- No paid subscription or billing without approval.
- No API key in client-side code.
- No changes to main without approval.
- Project scope is football statistics and analysis,
  not gambling or real-money wagering.

---

Project Football Time
Football Statistics & News

Deep Data. Simple Football.

## 13. Pre-match Probability Snapshots (schema v1.1)

The optional `probabilitySnapshots` array stores immutable pre-match 1X2 estimates.

Each snapshot includes:

- matchId (provider match ID as a string)
- leagueId, season, utcDate
- homeTeamName, awayTeamName
- probabilities: home, draw, away (percentages totaling 100)
- expectedGoals: home, away
- probabilityLevel
- confidenceScore and confidence
- sample counts used by the model
- modelVersion and createdAt
- actualOutcome, actualScore, evaluatedAt after a valid finished result is available

Rules:

- Snapshots are created only while kickoff is still in the future.
- A snapshot for an existing match ID must never be overwritten by a later forecast.
- When a match finishes, its stored snapshot is annotated with the actual outcome; the original probabilities and creation timestamp remain unchanged.
- Historical snapshots are retained across daily database refreshes, including when older fixtures are no longer returned by the provider.
- The database updater validates that every probability vector totals 100% and that each snapshot was created before kickoff.
- The client may keep a local copy for offline continuity, but server-generated snapshots are the durable reference for calibration.
