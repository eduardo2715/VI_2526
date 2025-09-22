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

let selectedName = null; // currently clicked Pokémon

function createCheckboxes(containerId, items) {
  const container = d3.select(containerId);
  container.selectAll("*").remove();
  items.forEach(i => {
    const label = container.append("label").style("display", "block");
    label.append("input")
         .attr("type","checkbox")
         .attr("value", i)
         .property("checked", false);
    label.append("span").text(i);
  });
}

function getCheckedValues(containerId) {
  return Array.from(d3.select(containerId).selectAll("input").nodes())
              .filter(d => d.checked)
              .map(d => d.value);
}

function setupSelectAllLogic() {
  d3.selectAll(".select-all").each(function() {
    const selectAllBox = d3.select(this);
    const targetId = selectAllBox.attr("data-target");

    selectAllBox.on("change", function() {
      const checked = this.checked;
      d3.select(`#${targetId}`).selectAll("input").property("checked", checked);
      updateCharts();
    });

    d3.select(`#${targetId}`).selectAll("input").on("change", function() {
      const allChecked = d3.select(`#${targetId}`).selectAll("input").nodes()
                          .every(n => n.checked);
      selectAllBox.property("checked", allChecked);
      updateCharts();
    });
  });
}

function init() {
  createCheckboxes("#year-filters", YEARS);
  createCheckboxes("#serie-filters", SERIES);
  createCheckboxes("#set-filters", SETS);
  createCheckboxes("#type-filters", TYPES);

  setupSelectAllLogic();

  d3.csv("./data/dataset.csv").then(data => {

    window.updateCharts = function() {
      const selectedYears = getCheckedValues("#year-filters").map(Number);
      const selectedSeries = getCheckedValues("#serie-filters");
      const selectedSets = getCheckedValues("#set-filters");
      const selectedTypes = getCheckedValues("#type-filters");

      const filtered = data.filter(d =>
        (selectedYears.length === 0 || selectedYears.includes(+d.release_year)) &&
        (selectedSeries.length === 0 || selectedSeries.includes(d.serie_name)) &&
        (selectedSets.length === 0 || selectedSets.includes(d.set_name)) &&
        (selectedTypes.length === 0 || d.types.split(',').some(t => selectedTypes.includes(t)))
      );

      createScatterplot(filtered, ".ScatterPlot");
      createBarchart(filtered, ".BarChart");
    };

    updateCharts();
  });

  // Click outside to unstick Pokémon
  document.addEventListener("click", function(event) {
  const isPokemonClick = event.target.closest("circle, .bar");
  if (!isPokemonClick && selectedName) {
    selectedName = null;
    d3.selectAll("circle").transition().duration(300).style("opacity", 1);
    d3.selectAll(".bar").transition().duration(300).style("opacity", 1);
  }
});
}

init();
