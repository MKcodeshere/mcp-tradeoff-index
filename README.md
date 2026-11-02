# MCP Tradeoff Index

The tradeoff every data team hits when it connects a coding agent to its platform: Plain MCP, where your agent's model does the reasoning, or Smart MCP, where a tool runs the platform's own LLM. A reference for data teams: which data platforms give a coding agent (Claude Code, Codex, OpenCode)
plain access over MCP, which offer Smart MCP tools that run their own LLM, whose model that is and how it bills,
and how to add business context without paying for a second model.

82 products: the 65 in the [Semantic Context Index](https://mkcodeshere.github.io/semantic-layer-compare/)
plus 17 more. Checked against vendor documentation on 2 November 2026.

## Views

- **Plain vs Smart MCP**: two animated data-flow charts. Plain MCP: your client's model writes every query. Smart MCP: the platform's own model plans and writes the SQL inside the tool.
- **MCP matrix**: every product grouped by type, with MCP status, semantic object, Smart MCP tools, the model behind them and the one-LLM route. Select a row for evidence and sources.
- **Smart MCP models**: which provider runs the Smart MCP tools, and how each is billed.
- **One question, three setups**: an animated demo of plain SQL MCP, semantic tools and a platform agent.
- **Compare**, **Data exposure**, **Add context** (Snowflake, Databricks, dbt and a ClickHouse context server), **Choose a setup**, **Method and sources**.

Each view has its own URL hash (`#flow`, `#matrix`, `#models`, `#demo`, `#compare`, `#exposure`, `#build`, `#choose`, `#sources`).

## Publish on GitHub Pages

The site is static and needs no build step.

1. Push this folder to a repository.
2. Settings, Pages, Source: deploy from a branch, `main`, folder `/ (root)`.

## Editing the data

All product data is in `assets/data.js` (`ATLAS.platforms`). Each entry has `plain`, `smartTools`, `model`, `bill`,
`setup`, `mcp` and `src`. `smart: true` means the product offers a Smart MCP tool: the vendor's model runs behind a tool on its MCP server;
`uiOnly: true` means the product has an AI feature that a coding agent cannot call over MCP.

The animated demo (`assets/explorer.*`) is a prebuilt bundle made with the Stageshow kit; see THIRD_PARTY_NOTICES.md.
