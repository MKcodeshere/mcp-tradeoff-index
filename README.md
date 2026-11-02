# MCP Tradeoff Index

The tradeoff every data team hits when it connects a coding agent to its platform: plain MCP access or a tool that runs a second LLM. A reference for data teams: which data platforms give a coding agent (Claude Code, Codex, OpenCode)
plain access over MCP, which run their own LLM behind an MCP tool, whose model that is and how it bills,
and how to add business context without paying for a second model.

82 products: the 65 in the [Semantic Context Index](https://mkcodeshere.github.io/semantic-layer-compare/)
plus 17 more. Checked against vendor documentation on 2 November 2026.

## Views

- **MCP matrix**: every product grouped by type, with MCP status, semantic object, second-LLM tools, the model behind them and the one-LLM route. Select a row for evidence and sources.
- **Second LLM**: which provider runs the smart tools, and how each is billed.
- **One question, three setups**: an animated demo of plain SQL MCP, semantic tools and a platform agent.
- **Compare**, **Data exposure**, **Add context** (Snowflake, Databricks, dbt and a ClickHouse context server), **Choose a setup**, **Method and sources**.

Each view has its own URL hash (`#matrix`, `#models`, `#demo`, `#compare`, `#exposure`, `#build`, `#choose`, `#sources`).

## Publish on GitHub Pages

The site is static and needs no build step.

1. Push this folder to a repository.
2. Settings, Pages, Source: deploy from a branch, `main`, folder `/ (root)`.

## Editing the data

All product data is in `assets/data.js` (`ATLAS.platforms`). Each entry has `plain`, `smartTools`, `model`, `bill`,
`setup`, `mcp` and `src`. `smart: true` means the vendor's model runs behind a tool on its MCP server;
`uiOnly: true` means the product has an AI feature that a coding agent cannot call over MCP.

The animated demo (`assets/explorer.*`) is a prebuilt bundle made with the Stageshow kit; see THIRD_PARTY_NOTICES.md.
