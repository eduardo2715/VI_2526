# Information Visualization - Project
### <div align="center">Group 16</div>



## Project description
**Pokémon Price Evolution** is a comparative analysis of Pokémon card prices across sets, years, series, and types. The project helps collectors and researchers explore how market dynamics and card attributes (rarity, condition, type and set) influence card value and popularity, using interactive visualizations to reveal trends and support data-driven decisions.

## Tasks

**Task 1:** Are there any favourite or more popular cards per set and per type?

**Task 2:** Do rarities influence price the same way by type, by set and by year?

**Task 3:** How does condition affect price in relation to set, type and year?

**Task 4:** Does type influence the popularity and price of a card by set and by year?

**Task 5:** Pokémon Card Sales Volume vs. Revenue per Year, Type, Rarity and Name?

## Project Structure

### Project Code & Demo

- **Project Code:** [Project_Code](./Project_Code)  
- **Video Demo:** [Project_demo.mp4](./Project_demo.mp4)

<!-- Inline video (if the viewer supports HTML5 video) -->
<video controls width="640">
    <source src="./VI-16/Project_demo.mp4" type="video/mp4">
    Your browser does not support the video tag. Download the demo: [VI-16/Project_demo.mp4](./VI-16/Project_demo.mp4)
</video>

### Browser support
This project is compatible with all modern browsers. For best results use **Firefox** (recommended). It has also been tested on Chrome, Edge, and Safari.

### Project_Code contents

- `d3/`
- `data/`
    - `dataset.csv`
- `idioms/`
    - `BarChart.js`
    - `LineChart.js`
    - `ScatterPlot.js`
    - `ViolinPlot.js`
    - `type_colors.js`
- `images/`
- `index.html`
- `script.js`
- `style.css`

### Code Organization

- `data/` - Dataset files and data processing scripts (see `dataset.csv`)
- `idioms/` - Visualization components and color mappings
- `d3/` - D3 library and helpers
- `images/` - Images and static assets
- `index.html` - Main entry point for the application
- `script.js` - App initialization and wiring of visual components / interactions
- `style.css` - Styling for the visualizations and UI
