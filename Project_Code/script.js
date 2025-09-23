const YEARS=[1999,2000,2001,2002,2003,2004,2005,2006,2007,2020,2021,2022,2023];
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

function createCheckboxes(containerId, items){
  const container = d3.select(containerId);
  container.selectAll("*").remove();
  items.forEach(i=>{
    const label = container.append("label").style("display","block");
    label.append("input").attr("type","checkbox").attr("value",i).property("checked",false);
    label.append("span").text(i);
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
  // Scatterplot circles (use data bound to circles)
  d3.selectAll(".ScatterPlot circle").transition().duration(300)
    .style("opacity", c =>
      !selectedCard ||
      (c.name === selectedCard.name &&
       c.serie === selectedCard.serie &&
       c.set === selectedCard.set) ? 1 : 0.2
    );

  // Barchart rects (data bound to bars)
  d3.selectAll(".BarChart .bar").transition().duration(300)
    .style("opacity", b =>
      !selectedCard ||
      (b.name === selectedCard.name &&
       b.serie === selectedCard.serie &&
       b.set === selectedCard.set) ? 1 : 0.2
    );

  // Slopegraph (use the global window.slopeLines array)
  if (window.slopeLines && Array.isArray(window.slopeLines)) {
    window.slopeLines.forEach(d => {
      const highlight =
        !selectedCard ||
        (d.name === selectedCard.name &&
         d.serie === selectedCard.serie &&
         d.set === selectedCard.set);

      // line & points toggled together
      d.line.transition().duration(300)
        .style("opacity", highlight ? 1 : 0.2)
        .attr("stroke-width", highlight ? 3 : 2);

      d.points.transition().duration(300)
        .style("opacity", highlight ? 1 : 0.2);
    });
  }
}

function init(){
  createCheckboxes("#year-filters",YEARS);
  createCheckboxes("#serie-filters",SERIES);
  createCheckboxes("#set-filters",SETS);
  createCheckboxes("#type-filters",TYPES);

  d3.csv("./data/dataset.csv").then(data=>{
    window.updateCharts=function(){
      const selectedYears=getCheckedValues("#year-filters").map(Number);
      const selectedSeries=getCheckedValues("#serie-filters");
      const selectedSets=getCheckedValues("#set-filters");
      const selectedTypes=getCheckedValues("#type-filters");

      const filtered=data.filter(d=>
        (selectedYears.length===0 || selectedYears.includes(+d.release_year)) &&
        (selectedSeries.length===0 || selectedSeries.includes(d.serie_name)) &&
        (selectedSets.length===0 || selectedSets.includes(d.set_name)) &&
        (selectedTypes.length===0 || selectedTypes.includes(d.types))
      );

      d3.select(".ScatterPlot").selectAll("*").remove();
      d3.select(".BarChart").selectAll("*").remove();
      d3.select(".SlopeGraph").selectAll("*").remove();
      d3.select(".BoxPlot").selectAll("*").remove();

      if(filtered.length===0){
        const noDataMsg="No data to display for the selected filters.";
        [".ScatterPlot",".BarChart",".SlopeGraph",".BoxPlot"].forEach(sel=>{
          d3.select(sel).append("div").style("color","#666").style("font-size","1em")
            .style("padding","20px").style("text-align","center").text(noDataMsg);
        });
        // ensure slopeLines cleared
        window.slopeLines = [];
        return;
      }

      createScatterplot(filtered,".ScatterPlot");
      createBarchart(filtered,".BarChart");
      createSlopegraph(filtered,".SlopeGraph");
      createBoxplot(filtered,".BoxPlot");
    };

    setupSelectAllLogic();
    updateCharts();
  });
}

document.addEventListener("click", function(event){
  const isPokemonClick = event.target.closest("circle, .bar, .slope-line");
  if(!isPokemonClick && selectedCard){
    selectedCard=null;
    updateSelectionAcrossPlots();
  }
});

init();
