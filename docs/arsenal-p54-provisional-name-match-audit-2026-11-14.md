# Arsenal P54 provisional name-match audit — 2026-11-14

## Scope

Offline comparison of the supplied `query.json` Wikidata P54 export (1,236 statement rows; 1,112 unique player QIDs; team QID Q9617, Arsenal F.C.) against the 25 Arsenal player names in the official Premier League 2026/27 squad-number list.

Name matching uses exact full-name comparison after Unicode/diacritic, case, and punctuation normalization. No fuzzy, substring, or guessed-alias matching is used.

## Result

- 24 of 25 reference names matched exactly to one unique QID in the export.
- 0 ambiguous normalized-name matches in this reference set.
- Illan Meslier had no matching row in the supplied export.
- The 24 matches comprise 27 P54 statement rows because David Raya, Cristhian Mosquera, Piero Hincapié, Gabriel Magalhães, and Martin Ødegaard have multiple statements in the export.

| Reference name | Wikidata QID | P54 rows | Disposition |
|---|---|---:|---|
| David Raya | Q19665907 | 2 | provisional_name_match |
| William Saliba | Q56868118 | 1 | provisional_name_match |
| Cristhian Mosquera | Q110458872 | 2 | provisional_name_match |
| Ben White | Q27839155 | 1 | provisional_name_match |
| Piero Hincapié | Q101053044 | 2 | provisional_name_match |
| Gabriel Magalhães | Q25175970 | 2 | provisional_name_match |
| Bukayo Saka | Q59306386 | 1 | provisional_name_match |
| Martin Ødegaard | Q16902219 | 2 | provisional_name_match |
| Eberechi Eze | Q28445512 | 1 | provisional_name_match |
| Jurriën Timber | Q53952196 | 1 | provisional_name_match |
| Kepa Arrizabalaga | Q3195361 | 1 | provisional_name_match |
| Viktor Gyökeres | Q47075606 | 1 | provisional_name_match |
| Ezri Konsa | Q27063854 | 1 | provisional_name_match |
| Christos Tzolis | Q96182871 | 1 | provisional_name_match |
| Noni Madueke | Q66801705 | 1 | provisional_name_match |
| Ethan Nwaneri | Q114027518 | 1 | provisional_name_match |
| Mikel Merino | Q17612631 | 1 | provisional_name_match |
| Kai Havertz | Q27310755 | 1 | provisional_name_match |
| Riccardo Calafiori | Q97999586 | 1 | provisional_name_match |
| Martín Zubimendi | Q63384759 | 1 | provisional_name_match |
| Bruno Guimarães | Q58323172 | 1 | provisional_name_match |
| Declan Rice | Q30007142 | 1 | provisional_name_match |
| Myles Lewis-Skelly | Q118571844 | 1 | provisional_name_match |
| Max Dowman | Q130442747 | 1 | provisional_name_match |
| Illan Meslier | — | 0 | no_match_in_export |

## Interpretation and safeguards

The project owner approved name-based matching as a simple provisional intake method. Each successful match is therefore explicitly provisional and traceable to its source label, QID, team QID, statement GUID, rank, date qualifiers, and references in the underlying export.

**P54 means represented or previously represented a team. It is historical career evidence, not proof of current 2026/27 registration, first-team status, matchday eligibility, or roster completeness.** The official Premier League squad list is used as the reference-name list, not as proof that every P54 statement is current.

This audit does not assign canonical app IDs or provider IDs and does not attribute statistics. No provider API calls, Supabase reads/writes/migrations, Production roster imports, app changes, or deployment were performed.

## Sources

- Supplied offline WDQS export: `query.json` (user-provided).
- Official Premier League 2026/27 squad numbers: https://www.premierleague.com/en/news/4725682
- Official Premier League Arsenal squad: https://www.premierleague.com/en/clubs/3/arsenal/squad?se=418
- Official submitted 2026/27 squad lists: https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists
