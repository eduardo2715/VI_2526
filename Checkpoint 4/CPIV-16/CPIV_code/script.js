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

let selectedCard = null;

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
  // Disable all filter checkboxes
  d3.selectAll(".filters input[type=checkbox]").property("disabled", true);
  
  // Re-enable after `duration` ms
  setTimeout(() => {
    d3.selectAll(".filters input[type=checkbox]").property("disabled", false);
  }, duration);
}

function updateFilterCounts() {
  const filters = [
    { id: "#year-filters", label: "Year" },
    { id: "#serie-filters", label: "Serie" },
    { id: "#set-filters", label: "Set" },
    { id: "#type-filters", label: "Type" },
  ];

  filters.forEach(f => {
    const count = getCheckedValues(f.id).length;
    const header = d3.select(`${f.id}`).node().previousElementSibling; // the <h4> element
    d3.select(header).select(".filter-count").text(`(${count})`);
  });
}

function setupFilterSearch() {
  d3.selectAll(".filter-search").on("input", function() {
    const input = this.value.toLowerCase();
    const container = d3.select(this.nextElementSibling); // the checkbox container

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
    const highlight =
      !selectedCard ||
      (c.name === selectedCard.name &&
       c.serie === selectedCard.serie &&
       c.set === selectedCard.set);

    d3.select(this)
      .transition().duration(300)
      .style("opacity", highlight ? 1 : 0.1);

    if (highlight) d3.select(this).raise();
  });

  // Bar
  d3.selectAll(".BarChart .bar").transition().duration(300)
    .style("opacity", b =>
      !selectedCard ||
      (b.name === selectedCard.name &&
       b.serie === selectedCard.serie &&
       b.set === selectedCard.set) ? 1 : 0.1
    );

  // Line chart
  if (window.slopeLines && Array.isArray(window.slopeLines)) {
    window.slopeLines.forEach(d => {
      const isMatch =
        selectedCard &&
        d.name === selectedCard.name &&
        d.serie === selectedCard.serie &&
        d.set === selectedCard.set;

      if (!selectedCard) {
        // No selection → reset everything
        d.line.transition().duration(500)
          .style("opacity", 1)
          .attr("stroke-width", 0.125*16);

        d.points.transition().duration(500)
          .style("opacity", 1)
          .attr("r", 0.2*16);
      } else {
        // Selection active → highlight vs dim
        d.line.transition().duration(500)
          .style("opacity", isMatch ? 1 : 0.05)
          .attr("stroke-width", isMatch ? 0.25*16 : 0.125*16);

        d.points.transition().duration(500)
          .style("opacity", isMatch ? 1 : 0.05)
          .attr("r", isMatch ? 0.35*16 : 0.2*16);

        if (isMatch) d.group.raise();
      }
    });
  }

}



// --- Initialize ---
function init(){

  d3.select("#loading-overlay").style("display", "flex");

  createCheckboxes("#year-filters",YEARS);
  createCheckboxes("#serie-filters",SERIES);
  createCheckboxes("#set-filters",SETS);
  createCheckboxes("#type-filters",TYPES);

  setupFilterSearch();

  d3.csv("./data/dataset.csv").then(rawData=>{
    // Precompute tables
    const scatterGrouped = d3.rollup(
      rawData,
      rows => {
        const totalCount = d3.sum(rows, r => +r.count);
        const totalRevenue = d3.sum(rows, r => (+r.count) * (+r.avg));
        const type = rows[0].types;
        const releaseYear = +rows[0].release_year;
        return { count: totalCount, revenue: totalRevenue, type, releaseYear };
      },
      d => d.name,
      d => d.serie_name,
      d => d.set_name
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

    // Line chart
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

    window.scatterTable = scatterTable;
    window.lineTable = lineTable;

    // Filtering + charts
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

      const sliderWrapper = document.querySelector(".slider-wrapper");

      if(filteredScatter.length===0 && filteredLine.length===0){
        d3.selectAll(".slider-container").style("display","none");

        // Fade out all existing elements
        [".ScatterPlot",".BarChart",".LineChart",".ViolinPlot"].forEach(sel=>{
          const container = d3.select(sel);
          container.selectAll("circle, rect, line, .P_axis text").transition().duration(500).style("opacity",0).remove();
          
          // Append no-data-msg and fade in
          container.selectAll(".no-data-msg").remove();
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

      // Remove any existing no-data messages with fade out
      d3.selectAll(".no-data-msg")
        .transition().duration(300)
        .style("opacity",0)
        .remove();

      // Draw/update charts
      updateScatterplot(filteredScatter, ".ScatterPlot");
      createLineChart(filteredLine, ".LineChart");
      createBarchart(filteredScatter, ".BarChart");
      createViolinPlot(filteredScatter, ".ViolinPlot");
    };


    setupSelectAllLogic();
    initScatterplot(".ScatterPlot");
    updateCharts();

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

  if(!isPokemonClick && !isSliderClick && selectedCard){
    selectedCard = null;
    updateSelectionAcrossPlots();
  }
});

init();
