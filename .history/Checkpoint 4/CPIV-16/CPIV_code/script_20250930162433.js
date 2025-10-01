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

    // Add icons if type filters
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
    });

    d3.select(`#${targetId}`).selectAll("input").on("change",function(){
      const allChecked=d3.select(`#${targetId}`).selectAll("input").nodes().every(n=>n.checked);
      selectAllBox.property("checked",allChecked);
      updateCharts();
    });
  });
}

function updateSelectionAcrossPlots() {
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
}

// --- Init ---
function init(){
  createCheckboxes("#year-filters",YEARS);
  createCheckboxes("#serie-filters",SERIES);
  createCheckboxes("#set-filters",SETS);
  createCheckboxes("#type-filters",TYPES);

  d3.csv("./data/dataset.csv").then(data=>{
    window.updateCharts = function() {
      const selectedYears = getCheckedValues("#year-filters").map(Number);
      const selectedSeries = getCheckedValues("#serie-filters");
      const selectedSets = getCheckedValues("#set-filters");
      const selectedTypes = getCheckedValues("#type-filters");

      const filtered = data.filter(d =>
        (selectedYears.length === 0 || selectedYears.includes(+d.release_year)) &&
        (selectedSeries.length === 0 || selectedSeries.includes(d.serie_name)) &&
        (selectedSets.length === 0 || selectedSets.includes(d.set_name)) &&
        (selectedTypes.length === 0 || selectedTypes.includes(d.types))
      );

      // Always clear other charts
      d3.select(".BarChart").selectAll("*").remove();
      d3.select(".LineChart").selectAll("*").remove();
      d3.select(".ViolinPlot").selectAll("*").remove();

      if (filtered.length === 0) {
        // Fade out scatterplot points only
        d3.select(".ScatterPlot").selectAll("circle")
          .transition().duration(500)
          .style("opacity", 0)
          .remove();

        // Remove old messages
        d3.selectAll(".no-data-msg").remove();

        // Add message overlay
        [".ScatterPlot", ".BarChart", ".LineChart", ".ViolinPlot"].forEach(sel => {
          d3.select(sel).append("div")
            .attr("class", "no-data-msg")
            .style("display", "flex")
            .style("align-items", "center")
            .style("justify-content", "center")
            .style("height", "100%")
            .style("width", "100%")
            .style("color", "#666")
            .style("font-size", "1em")
            .style("text-align", "center")
            .text("No data to display for the selected filters.");
        });

        return;
      }

      // ✅ Data exists
      d3.selectAll(".no-data-msg").remove();

      // Redraw plots
      updateScatterplot(filtered, ".ScatterPlot");
      createBarchart(filtered, ".BarChart");
      createLineChart(filtered, ".LineChart");
      createViolinPlot(filtered, ".ViolinPlot");
    };

    setupSelectAllLogic();
    initScatterplot(".ScatterPlot"); 
    updateCharts();
  });
}

// --- Deselect card if click outside ---
document.addEventListener("click", function(event){
  const isPokemonClick = event.target.closest("circle");
  const isSliderClick = event.target.closest("input[type=range]");
  
  if(!isPokemonClick && !isSliderClick && selectedCard){
    selectedCard = null;
    updateSelectionAcrossPlots();
  }
});

init();
