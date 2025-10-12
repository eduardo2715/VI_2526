// script.js

// Import D3.js
// Assuming D3.js is included in the HTML via a <script> tag

// Import other idioms
// Assuming these functions are defined in separate files and included in the HTML
// e.g., <script src="Idioms/scatterplot.js"></script>
// e.g., <script src="Idioms/barchart.js"></script>
// e.g., <script src="Idioms/linechart.js"></script>
// e.g., <script src="Idioms/violinplot.js"></script>

const rem = 16; // 1rem = 16px

// --- Global Variables ---

const YEARS = [1999,2000,2001,2002,2003,2004,2005,2006,2007,2020,2021,2022,2023]; 
const SERIES = ["Base","EX","Neo","Sword & Shield"];
const SETS = [
  "Base Set","Jungle","Fossil","Base Set 2","Team Rocket","Ruby & Sapphire",
  "Unseen Forces","Delta Species","Legend Maker","Holon Phantoms","Crystal Guardians",
  "Dragon Frontiers","Power Keepers","Sandstorm","Dragon","Team Magma vs Team Aqua",
  "Hidden Legends","FireRed & LeafGreen","Team Rocket Returns","Deoxys","Emerald",
  "Neo Genesis","Neo Discovery","Neo Revelation","Neo Destiny","Southern Islands",
  "Celebrations","Sword & Shield","Astral Radiance","Lost Origin","Silver Tempest",
  "Crown Zenith","Rebel Clash","Darkness Ablaze","Champion's Path","Vivid Voltage",
  "Shining Fates","Battle Styles","Chilling Reign","Evolving Skies","Fusion Strike",
  "Brilliant Stars"
];
const TYPES = [
  "Psychic","Water","Colorless","Fire","Fighting","Lightning","Grass","Metal","Darkness",
  "Grass,Metal","Lightning,Metal","Psychic,Metal","Fire,Metal","Fighting,Metal","Water,Metal",
  "Darkness,Metal","Grass,Darkness","Water,Darkness","Lightning,Darkness","Fighting,Darkness",
  "Psychic,Darkness","Fire,Darkness","Darkness,Darkness","Metal,Darkness","Dragon"
];

// Instead of single object → now supports multiple
let selectedCards = [];
let violinFocused = null;
window.filteredViolin = [];

// Pokémon type icons
const TYPE_ICONS = {
  "Fire": "./images/Fire.png",
  "Water": "./images/Water.png",
  "Grass": "./images/Grass.png",
  "Psychic": "./images/Psychic.png",
  "Colorless": "./images/Colorless.png",
  "Fighting": "./images/Fighting.png",
  "Lightning": "./images/Electric.png",
  "Metal": "./images/Metal.png",
  "Darkness": "./images/Dark.png",
  "Dragon": "./images/Dragon.png"
};


//Avoid Filter Spamming
function lockFilters(duration = 300) {
  d3.selectAll(".filters input[type=checkbox]").property("disabled", true);
  setTimeout(() => {
    d3.selectAll(".filters input[type=checkbox]").property("disabled", false);
  }, duration);
}

function updateFilterCounts() {
  const filters = [
    { id: "#year-filters" },
    { id: "#serie-filters" },
    { id: "#set-filters" },
    { id: "#type-filters" },
  ];

  filters.forEach(f => {
    const count = getCheckedValues(f.id).length;
    const header = d3.select(f.id).node()
      .closest(".filter-group")
      .querySelector("h4");

    d3.select(header).select(".filter-count").text(`(${count})`);
  });
}

function setupFilterSearch() {
  d3.selectAll(".filter-search").on("input", function() {
    const input = this.value.toLowerCase();
    const container = d3.select(this.nextElementSibling); 

    container.selectAll("label").style("display", function() {
      const text = d3.select(this).text().toLowerCase();
      return text.includes(input) ? "flex" : "none";
    });
  });
}


// --- Helpers ---
function createCheckboxes(containerId, items){
  const container = d3.select(containerId);
  container.selectAll("*").remove();

  items.forEach(i => {
    const label = container.append("label")
      .style("display","flex")
      .style("align-items","center")
      .style("gap","6px")
      .style("margin","3px 0")
      .style("font-size","0.9em")
      .style("cursor","pointer");

    label.append("input")
      .attr("type","checkbox")
      .attr("value",i)
      .property("checked",false);

    label.append("span").text(i);

    if(containerId === "#type-filters"){
      const types = i.split(",").map(t => t.trim());
      types.forEach(t => {
        const icon = TYPE_ICONS[t];
        if(icon){
          label.append("img")
            .attr("src", icon)
            .attr("alt", t)
            .style("width","18px")
            .style("height","18px");
        }
      });
    }
  });
}

function getCheckedValues(containerId){
  return Array.from(d3.select(containerId).selectAll("input").nodes())
    .filter(n=>n.checked).map(n=>n.value);
}

function setupSelectAllLogic(){
  d3.selectAll(".select-all").each(function(){
    const selectAllBox = d3.select(this);
    const targetId = selectAllBox.attr("data-target");

    selectAllBox.on("change",function(){
      const checked=this.checked;
      d3.select(`#${targetId}`).selectAll("input").property("checked",checked);
      updateCharts();
      lockFilters()
      updateFilterCounts();
    });

    d3.select(`#${targetId}`).selectAll("input").on("change",function(){
      const allChecked=d3.select(`#${targetId}`).selectAll("input").nodes().every(n=>n.checked);
      selectAllBox.property("checked",allChecked);
      updateCharts();
      lockFilters()
      updateFilterCounts();
    });
  });
}

// --- Selection Highlighting ---
function updateSelectionAcrossPlots() {
  // Scatter
  d3.selectAll(".ScatterPlot circle").each(function(c) {
    const key = `${c.name}|${c.serie}|${c.set}`;
    const highlight = selectedCards.length === 0 || selectedCards.includes(key);

    d3.select(this)
      .transition().duration(300)
      .style("opacity", highlight ? 1 : 0.1);

    if (highlight) d3.select(this).raise();
  });

  // Bar
  d3.selectAll(".BarChart .bar").transition().duration(300)
    .style("opacity", b => {
      const key = `${b.name}|${b.serie}|${b.set}`;
      return (selectedCards.length === 0 || selectedCards.includes(key)) ? 1 : 0.1;
    });

  // Line chart
  if (window.slopeLines && Array.isArray(window.slopeLines)) {
    window.slopeLines.forEach(d => {
      const key = `${d.name}|${d.serie}|${d.set}`;
      const isMatch = selectedCards.includes(key);

      if (selectedCards.length === 0) {
        d.line.transition().duration(500)
          .style("opacity", 1)
          .attr("stroke-width", 0.125*rem);

        d.points.transition().duration(500)
          .style("opacity", 1)
          .attr("r", 0.2*rem);
      } else {
        d.line.transition().duration(500)
          .style("opacity", isMatch ? 1 : 0.05)
          .attr("stroke-width", isMatch ? 0.25*rem : 0.125*rem);

        d.points.transition().duration(500)
          .style("opacity", isMatch ? 1 : 0.05)
          .attr("r", isMatch ? 0.35*rem : 0.2*rem);

        if (isMatch) d.group.raise();
      }
    });
  }
}

const infoMessages = [
  "You can select multiple filters from each filter group.",
  "Use the search boxes above each filter list to quickly find items.",
  "Click the 'Select All' checkbox to toggle all filters in a group.",
  "Click on a Pokémon to select it, or Ctrl/Cmd + Click to select multiple Pokémon.",
  "Selected Pokémon will be highlighted across all charts.",
  "Click on a rarity violin/rarity label to zoom on that violin",
  "Hover over bars, points, or lines to see detailed info."
];

// Tooltip div
const infoTooltip = d3.select("body").append("div")
  .attr("class", "info-tooltip");

// Pulsing glow animation
d3.select(".info-icon")
  .style("animation", "pulse 1.5s infinite")
  .on("mouseover", function(event) {
    infoTooltip.html(infoMessages.map(msg => `<div>• ${msg}</div>`).join(""))
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY + 10) + "px")
      .style("opacity", 1);
  })
  .on("mousemove", function(event) {
    infoTooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY + 10) + "px");
  })
  .on("mouseout", function() {
    infoTooltip.style("opacity", 0);
  });

// Pulsing keyframes (inject into DOM)
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes pulse {
  0% { transform: scale(1); color:#555; }
  50% { transform: scale(1.2); color:#1e90ff; }
  100% { transform: scale(1); color:#555; }
}`;
document.head.appendChild(styleSheet);

// --- Initialize ---
function init(){

  d3.select("#loading-overlay").style("display", "flex");

  createCheckboxes("#year-filters",YEARS);
  createCheckboxes("#serie-filters",SERIES);
  createCheckboxes("#set-filters",SETS);
  createCheckboxes("#type-filters",TYPES);

  setupFilterSearch();

  d3.csv("./data/dataset.csv").then(rawData=>{

    // --- SCATTERPLOT DATA ---
    const normalize = s => s ? s.trim().replace(/\s+/g, " ") : s;

    const scatterGrouped = d3.rollup(
      rawData,
      rows => {
        const totalCount = d3.sum(rows, r => isNaN(+r.count) ? 0 : +r.count);
        const totalRevenue = d3.sum(rows, r => isNaN(+r.avg) ? 0 : (+r.count) * (+r.avg));
        const type = d3.mode(rows.map(r => r.types).filter(Boolean));
        const releaseYear = d3.mode(rows.map(r => +r.release_year).filter(y => !isNaN(y)));
        return { count: totalCount, revenue: totalRevenue, type, releaseYear };
      },
      d => normalize(d.name),
      d => normalize(d.serie_name),
      d => normalize(d.set_name)
    );


    let scatterTable = [];
    scatterGrouped.forEach((bySerie, name) => {
      bySerie.forEach((bySet, serie) => {
        bySet.forEach((values, set) => {
          scatterTable.push({
            name, serie, set,
            count: values.count,
            revenue: values.revenue,
            type: values.type,
            releaseYear: values.releaseYear
          });
        });
      });
    });
    scatterTable.sort((a,b)=>d3.descending(a.count,b.count));
    scatterTable.forEach((d,i)=>d.rank=i+1);

    console.log([...new Set(rawData.map(d => d.name))].filter(n => n.includes("Houndoom") || n.includes("Magcargo")));


    // --- LINE CHART DATA ---
    const conditionOrder = ["mint","nearmint","excellent","good","lightplayed","played","poor"];
    const normalizeCondition = cond => {
      if (!cond) return null;
      const part = cond.split("-")[1]?.toLowerCase();
      return conditionOrder.includes(part) ? part : null;
    };

    const typeIndex = new Map(rawData.map(d => [`${d.name}|${d.serie_name}|${d.set_name}`, d.types]));
    const yearIndex = new Map(rawData.map(d => [`${d.name}|${d.serie_name}|${d.set_name}`, +d.release_year]));

    const lineGrouped = d3.rollup(
      rawData,
      v => d3.mean(v, d => +d.avg),
      d => d.name,
      d => d.serie_name,
      d => d.set_name,
      d => normalizeCondition(d.condition)
    );

    let lineTable = [];
    for (const [name, bySerie] of lineGrouped) {
      for (const [serie, bySet] of bySerie) {
        for (const [set, condMap] of bySet) {
          const values = Array.from(condMap, ([c, avg]) => ({ condition:c, avg }))
            .filter(d=>d.condition)
            .sort((a,b)=>conditionOrder.indexOf(a.condition)-conditionOrder.indexOf(b.condition));
          if(values.length){
            lineTable.push({
              name, serie, set,
              type: typeIndex.get(`${name}|${serie}|${set}`),
              releaseYear: yearIndex.get(`${name}|${serie}|${set}`),
              values
            });
          }
        }
      }
    }

    // --- VIOLIN PLOT DATA ---

    const rarityOrder = [
      "Common","Uncommon","Rare","Holo Rare","Holo Rare V","Holo Rare VMAX",
      "Holo Rare VSTAR","Radiant Rare","Amazing Rare","Ultra Rare","Secret Rare"
    ];

    // Pre-index to avoid O(n²) lookups
    const cardIndex = new Map(
      rawData.map(d => [
        `${d.name}|${d.serie_name}|${d.set_name}`,
        { type: d.types, releaseYear: +d.release_year, rarity: d.rarity }
      ])
    );

    // Compute mean avg per card
    const cardMeans = d3.rollup(
      rawData,
      rows => d3.mean(rows, r => +r.avg),
      d => d.name,
      d => d.serie_name,
      d => d.set_name
    );

    // Flatten to array
    let violinTable = [];
    cardMeans.forEach((bySerie, name) => {
      bySerie.forEach((bySet, serie) => {
        bySet.forEach((avgPrice, set) => {
          const key = `${name}|${serie}|${set}`;
          const meta = cardIndex.get(key);
          if (!meta || !rarityOrder.includes(meta.rarity)) return;

          violinTable.push({
            name,
            serie,
            set,
            rarity: meta.rarity,
            avgPrice,
            type: meta.type,
            releaseYear: meta.releaseYear
          });
        });
      });
    });


    window.violinTable = violinTable;
    window.scatterTable = scatterTable;
    window.lineTable = lineTable;

    // --- FILTERING + CHART UPDATES ---
    window.updateCharts = function(){
      const selectedYears = getCheckedValues("#year-filters").map(Number);
      const selectedSeries = getCheckedValues("#serie-filters");
      const selectedSets = getCheckedValues("#set-filters");
      const selectedTypes = getCheckedValues("#type-filters");

      const filteredScatter = scatterTable.filter(d =>
        (selectedYears.length===0 || selectedYears.includes(d.releaseYear)) &&
        (selectedSeries.length===0 || selectedSeries.includes(d.serie)) &&
        (selectedSets.length===0 || selectedSets.includes(d.set)) &&
        (selectedTypes.length===0 || selectedTypes.includes(d.type))
      );

      const filteredLine = lineTable.filter(d =>
        (selectedYears.length===0 || selectedYears.includes(d.releaseYear)) &&
        (selectedSeries.length===0 || selectedSeries.includes(d.serie)) &&
        (selectedSets.length===0 || selectedSets.includes(d.set)) &&
        (selectedTypes.length===0 || selectedTypes.includes(d.type))
      );

      const filteredViolin = violinTable.filter(d =>
        (selectedYears.length===0 || selectedYears.includes(d.releaseYear)) &&
        (selectedSeries.length===0 || selectedSeries.includes(d.serie)) &&
        (selectedSets.length===0 || selectedSets.includes(d.set)) &&
        (selectedTypes.length===0 || selectedTypes.includes(d.type))
      );
      
      window.filteredViolin = filteredViolin;
    
      d3.selectAll(".no-data-msg").transition().duration(300).style("opacity",0).remove();

      if(filteredScatter.length===0 && filteredLine.length===0 && filteredViolin.length===0){
        d3.selectAll(".slider-container").style("display","none");

        [".ScatterPlot",".BarChart",".LineChart",".ViolinPlot"].forEach(sel=>{
          const container = d3.select(sel);
          container.selectAll("circle, rect, line, .P_axis text, .violin, .bar").transition().duration(500).style("opacity",0).remove();
          container.append("div")
            .attr("class","no-data-msg")
            .style("display","flex")
            .style("align-items","center")
            .style("justify-content","center")
            .style("height","100%")
            .style("width","100%")
            .style("color","#666")
            .style("font-size","1em")
            .style("text-align","center")
            .style("opacity",0)
            .text("No data to display for the selected filters.")
            .transition().duration(500)
            .style("opacity",1);
        });
        return;
      }

      d3.selectAll(".slider-container").style("display","flex");

      // --- Update charts ---
      updateScatterplot(filteredScatter, ".ScatterPlot");
      updateLineChart(filteredLine, ".LineChart");
      updateViolinPlot(filteredViolin, ".ViolinPlot", violinFocused);
      updateBarchart(filteredScatter, ".BarChart");

    };

    setupSelectAllLogic();
    requestAnimationFrame(() => {
      initScatterplot(".ScatterPlot");
      initViolinPlot(".ViolinPlot");
      initBarchart(".BarChart");
      initLineChart(".LineChart");
      updateCharts();
    });

    d3.select("#loading-overlay")
      .transition()
      .duration(2000)
      .style("opacity", 0)
      .on("end", () => d3.select("#loading-overlay").style("display", "none"));
  });
}

// --- Deselect card if click outside ---
document.addEventListener("click", function(event){
  const isPokemonClick = event.target.closest("circle, .bar, .slope-line");
  const isSliderClick = event.target.closest("input[type=range], .slider, .slider-btn");
  const container = document.querySelector(".ViolinPlot");
  const clickedElement = event.target.closest(".violin, .box, .x-axis text, .violin-dot");

  if(!isPokemonClick && !isSliderClick && selectedCards.length > 0){
    selectedCards = [];
    updateSelectionAcrossPlots();
  }

  // Clicked a violin, box, label or dot → toggle focus + update selection
  if (clickedElement) {
    const rarity = clickedElement.getAttribute("data-rarity");
    if (!rarity) return;

    // Toggle focus
    if (violinFocused === rarity) {
      violinFocused = null;
      selectedCards = []; // clear selection
    } else {
      violinFocused = rarity;

      // Filter all cards belonging to this rarity
      const cardsInRarity = window.filteredViolin
        .filter(d => d.rarity === rarity)
        .map(d => `${d.name}|${d.serie}|${d.set}`);

      selectedCards = cardsInRarity;
    }

    // Update charts + violin focus
    updateViolinPlot(window.filteredViolin, ".ViolinPlot", violinFocused);
    updateSelectionAcrossPlots();
    return;
  }

  // Clicked anywhere else (outside) → reset focus
  if (violinFocused) {
    if ((container && container.contains(event.target) && !clickedElement) ||
        (container && !container.contains(event.target))) {
      violinFocused = null;
      updateViolinPlot(window.filteredViolin, ".ViolinPlot", violinFocused);
    }
  }

});

init();
