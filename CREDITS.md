# Pixel Swarm — Asset Credits

| Asset | Source | License |
|---|---|---|
| Game sprites (`assets/sprites/*.png`) | Generated with ChatGPT from `prompts/chatgpt-asset-pack.md`, sliced with `tools/slice-sheet.ps1` (source: `downloads/sheet1.png`) | Owned by the project per OpenAI's terms; AI images may have limited copyright protection |
| Main menu / gameplay background (`assets/bg/menu.jpg`) | Generated with ChatGPT (source `downloads/background_v3.png`; earlier version kept as `downloads/background_v1_menu.jpg`) | Same as above |
| Logo (`assets/sprites/logo.png`) and butterfly (`assets/sprites/butterfly.png`) | Generated with ChatGPT (sources `downloads/screens/01_logo.png`, `downloads/butterfly_v2.png`) | Same as above |
| Pixel-art level pictures | Drawn in code from the grids in `js/data.js` | Project's own |
| Lilita One font | [Google Fonts](https://fonts.google.com/specimen/Lilita+One) by Juan Montoreano | SIL Open Font License 1.1 |
| Fredoka font | [Google Fonts](https://fonts.google.com/specimen/Fredoka) by Milena Brandão, Hafontia | SIL Open Font License 1.1 |
| Old style comparison images (`assets/img/*.png`, used only by `art-options.html`) | [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) by Microsoft | MIT |

To re-slice a new sheet: `tools/slice-sheet.ps1 -Sheet downloads\sheet2.png -OutDir assets\sprites`
