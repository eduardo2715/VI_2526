let boxGroups = [];

function createViolinPlot(data, selector) {
  d3.select(selector).selectAll("*").remove();
  boxGroups = [];

  const rarityOrder = [
    "Common","Uncommon","Rare","Holo Rare","Holo Rare V","Holo Rare VMAX",
    "Holo Rare VSTAR","Radiant Rare","Amazing Rare","Ultra Rare","Secret Rare"
  ];

  const grouped = d3.rollup(
    data,
    rows => d3.mean(rows, r => +r.avg),
    d => d.rarity,
    d => `${d.name}|${d.serie_name}|${d.set_name}`
  );

  let stats = [];
  grouped.forEach((byPokemon, rarity) => {
    if (!rarityOrder.includes(rarity)) return;
    const values = Array.from(byPokemon.values());
    if (values.length === 0) return;

    values.sort(d3.ascending);
    const q1 = d3.quantile(values, 0.25);
    const median = d3.quantile(values, 0.5);
    const q3 = d3.quantile(values, 0.75);
    const iqr = q3 - q1;
    const lower = Math.max(d3.min(values), q1 - 1.5 * iqr);
    const upper = Math.min(d3.max(values), q3 + 1.5 * iqr);

    stats.push({ rarity, q1, median, q3, lower, upper });
  });

  if (stats.length === 0) return;

  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const height = container.clientHeight;

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const margin = { top: 4*rem, right: 2.5*rem, bottom: 5*rem, left: 5*rem }; // increased top margin
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- Chart Title ---
  svg.append("text")
     .attr("x", width / 2)
     .attr("y", margin.top / 2)
     .attr("text-anchor", "middle")
     .attr("class", "chart-title")
     .text("Average Price per Rarity");

  const x = d3.scaleBand()
              .domain(rarityOrder.filter(r => stats.find(s => s.rarity === r)))
              .range([0, innerWidth])
              .padding(0.3);

  const y = d3.scaleLinear()
              .domain([0, d3.max(stats, d => d.upper)])
              .nice()
              .range([innerHeight, 0]);

  // Axes
  const xAxis = g.append("g")
                 .attr("class","axis")
                 .attr("transform", `translate(0,${innerHeight})`)
                 .call(d3.axisBottom(x));

  xAxis.selectAll("text")
       .attr("transform","rotate(-30)")
       .style("text-anchor","end")
       .style("font-size", "0.7rem");

  const yAxis = g.append("g")
                 .attr("class","axis")
                 .call(d3.axisLeft(y).tickFormat(d => `$${d}`));

  // Axis Titles
  g.append("text")
   .attr("class","axis-title")
   .attr("x", innerWidth / 2)
   .attr("y", innerHeight + 4.8*rem)
   .attr("text-anchor", "middle")
   .text("Rarity");

  g.append("text")
   .attr("class","axis-title")
   .attr("transform","rotate(-90)")
   .attr("x", -innerHeight / 2)
   .attr("y", -margin.left + 1.25*rem)
   .attr("text-anchor","middle")
   .text("Average Pokémon Price ($)");

  // Draw ViolinPlots
  stats.forEach(d => {
    const cx = x(d.rarity);

    // whiskers
    g.append("line")
     .attr("x1", cx + x.bandwidth()/2)
     .attr("x2", cx + x.bandwidth()/2)
     .attr("y1", y(d.lower))
     .attr("y2", y(d.upper))
     .attr("stroke","black");

    // min & max caps
    g.append("line")
     .attr("x1", cx + x.bandwidth()/4)
     .attr("x2", cx + 3*x.bandwidth()/4)
     .attr("y1", y(d.lower))
     .attr("y2", y(d.lower))
     .attr("stroke","black");

    g.append("line")
     .attr("x1", cx + x.bandwidth()/4)
     .attr("x2", cx + 3*x.bandwidth()/4)
     .attr("y1", y(d.upper))
     .attr("y2", y(d.upper))
     .attr("stroke","black");

    // box
    g.append("rect")
     .attr("x", cx)
     .attr("y", y(d.q3))
     .attr("width", x.bandwidth())
     .attr("height", y(d.q1)-y(d.q3))
     .attr("fill", "#69b3a2")
     .attr("stroke", "black");

    // median
    g.append("line")
     .attr("x1", cx)
     .attr("x2", cx + x.bandwidth())
     .attr("y1", y(d.median))
     .attr("y2", y(d.median))
     .attr("stroke","black")
     .attr("stroke-width", 2);
  });
}
