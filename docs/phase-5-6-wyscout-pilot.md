# Phase 5.6 — Wyscout Open Dataset pilot

## Purpose

Evaluate whether an openly licensed historical source can supplement the player database. This is a research-only source pilot; it does not import records into the live app.

## Source and rights

- Dataset: Pappalardo, L. et al. (2019), *A public data set of spatio-temporal match events in soccer competitions*.
- Original article: https://doi.org/10.1038/s41597-019-0247-7
- Figshare collection: https://doi.org/10.6084/m9.figshare.c.4415000.v5
- License stated by the article: Creative Commons Attribution 4.0 International (CC BY 4.0).
- Attribution is required. Any future publication or redistribution must include appropriate credit, a link to the license, and an indication of changes. Review third-party material and dataset terms again before production use.

## Coverage

The published dataset describes 2017/18 event data for all five major European domestic leagues: Premier League, La Liga, Bundesliga, Serie A and Ligue 1. The paper reports 380, 380, 306, 380 and 380 matches respectively, with 3,251,294 events and 4,299 players across those leagues plus the 2018 World Cup and Euro 2016.

The automated pilot samples three matches per league (15 total), spaced across each league's indexed match list. It measures:
- teams and unique players represented in the sample;
- event counts by event category;
- players with at least one recorded event.

It does not claim full-season player statistics, appearances, minutes, goals, assists, xG, or current squad membership. Event counts from a 3-match sample must not be displayed as season totals.

## Data handling

- Reads the match index and selected event JSON files directly from the public processed dataset repository.
- Processes event records in memory only.
- Prints aggregate coverage counts only.
- Does not save raw player/event records, update `data/player-database.json`, alter local-storage keys, or change app UI/service-worker files.
- No API key, paid plan, or secret is required.

## Decision gate

Use this pilot to assess event/player coverage and technical reliability only. Before any production import, define a normalized player identity strategy, verify team/season mapping, test duplicate handling, and add visible provenance and sample-size labels. Keep historical Wyscout data separate from current-season player profiles.
