let boxGroups = [];

function createBoxplot(data, selector) {
  d3.select(selector).selectAll("*").remove();
  boxGroups = [];

  const rarityOrder = [
    "Common","Uncommon","Rare","Holo Rare","Holo Rare V","Holo Rare VMAX",
    "Holo Rare VSTAR","Radiant Rare","Amazing Rare","Ultra Rare","Secret Rare"
  ];

  // --- Aggregate data by Pokémon (name + serie + set) AND rarity ---
  const grouped = d3.rollup(
    data,
    rows => d3.mean(rows, r => +r.avg), // Pokémon average price in this rarity
    d => d.rarity,
    d => `${d.name}|${d.serie_name}|${d.set_name}`
  );

  // Transform grouped data into stats per rarity
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

  const width = 500,
        height = 350,
        margin = {top:40, right:40, bottom:80, left:80},
        innerWidth = width - margin.left - margin.right,
        innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(rarityOrder.filter(r => stats.find(s => s.rarity === r)))
    .range([0, innerWidth])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stats, d => d.upper)])
    .nice()
    .range([innerHeight, 0]);

  // axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");

  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerWidth/2)
    .attr("y", innerHeight+60)
    .attr("text-anchor","middle")
    .text("Rarity");

  g.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -innerHeight/2)
    .attr("y", -margin.left+20)
    .attr("text-anchor","middle")
    .text("Average Pokémon Price");

  // draw boxplots
  stats.forEach(d => {
    const cx = x(d.rarity);

    // whiskers
    g.append("line")
      .attr("x1", cx + x.bandwidth()/2)
      .attr("x2", cx + x.bandwidth()/2)
      .attr("y1", y(d.lower))
      .attr("y2", y(d.upper))
      .attr("stroke", "black");

    // min & max caps
    g.append("line")
      .attr("x1", cx + x.bandwidth()/4)
      .attr("x2", cx + 3*x.bandwidth()/4)
      .attr("y1", y(d.lower))
      .attr("y2", y(d.lower))
      .attr("stroke", "black");

    g.append("line")
      .attr("x1", cx + x.bandwidth()/4)
      .attr("x2", cx + 3*x.bandwidth()/4)
      .attr("y1", y(d.upper))
      .attr("y2", y(d.upper))
      .attr("stroke", "black");

    // box
    g.append("rect")
      .attr("x", cx)
      .attr("y", y(d.q3))
      .attr("width", x.bandwidth())
      .attr("height", y(d.q1) - y(d.q3))
      .attr("fill", "#69b3a2")
      .attr("stroke", "black");

    // median
    g.append("line")
      .attr("x1", cx)
      .attr("x2", cx + x.bandwidth())
      .attr("y1", y(d.median))
      .attr("y2", y(d.median))
      .attr("stroke", "black")
      .attr("stroke-width", 2);
  });
}
