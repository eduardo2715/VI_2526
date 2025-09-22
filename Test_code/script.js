const YEARS = [1999,2000,2003,2005,2006,2007,2004,2001,2002,2021,2020,2022,2023];
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

// Create checkboxes for a filter
function createCheckboxes(containerId, items) {
  const container = d3.select(containerId);
  container.selectAll("*").remove();
  items.forEach(i => {
    const label = container.append("label").style("display", "block");
    label.append("input")
         .attr("type","checkbox")
         .attr("value", i)
         .property("checked", false); // initially unchecked
    label.append("span").text(i);
  });
}

// Get currently checked values of a filter
function getCheckedValues(containerId) {
  return Array.from(d3.select(containerId).selectAll("input").nodes())
              .filter(d => d.checked)
              .map(d => d.value);
}

// Setup Select All behavior for all filters
function setupSelectAllLogic() {
  d3.selectAll(".select-all").each(function() {
    const selectAllBox = d3.select(this);
    const targetId = selectAllBox.attr("data-target");

    // Clicking "Select All" toggles all individual checkboxes
    selectAllBox.on("change", function() {
      const checked = this.checked;
      d3.select(`#${targetId}`).selectAll("input").property("checked", checked);
      updateCharts();
    });

    // Sync "Select All" when individual checkboxes change
    d3.select(`#${targetId}`).selectAll("input").on("change", function() {
      const allChecked = d3.select(`#${targetId}`).selectAll("input").nodes()
                          .every(n => n.checked);
      selectAllBox.property("checked", allChecked);
      updateCharts();
    });
  });
}

function init() {
  // Create all filter checkboxes
  createCheckboxes("#year-filters", YEARS);
  createCheckboxes("#serie-filters", SERIES);
  createCheckboxes("#set-filters", SETS);
  createCheckboxes("#type-filters", TYPES);

  // Load data and set up chart updating
  d3.csv("./data/dataset.csv").then(data => {

    // Global function to update charts based on current filter selections
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

      createScatterplot(filtered, ".ScatterPlot");
      createBarchart(filtered, ".BarChart");
    };

    // Initialize Select All logic for filters
    setupSelectAllLogic();

    // Initial render
    updateCharts();
  });
}

init();
