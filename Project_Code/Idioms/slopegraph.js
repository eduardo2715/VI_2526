// write slopeLines to window so updateSelectionAcrossPlots can read it reliably
window.slopeLines = [];

function createSlopegraph(data, selector) {
  d3.select(selector).selectAll("*").remove();
  window.slopeLines = [];

  // --- Normalize conditions ---
  const conditionOrder = [
    "mint","nearmint","excellent","good","lightplayed","played","poor"
  ];

  function normalizeCondition(cond){
    // guard and extract second part robustly
    if (!cond || typeof cond !== "string") return null;
    const parts = cond.split("-");
    const part = parts.length > 1 ? parts[1].toLowerCase() : null;
    return conditionOrder.includes(part) ? part : null;
  }

  // --- Aggregate by Pokémon + condition ---
  const grouped = d3.rollup(
    data,
    v => d3.mean(v, d => +d.avg),
    d => d.name,
    d => d.serie_name,
    d => d.set_name,
    d => normalizeCondition(d.condition)
  );

  let aggregated = [];
  grouped.forEach((bySerie, name) => {
    bySerie.forEach((bySet, serie) => {
      bySet.forEach((condMap, set) => {
        const conds = Array.from(condMap, ([cond, avg]) => ({ condition: cond, avg }));
        const valid = conds.filter(c => c.condition);
        if (valid.length > 0){
          aggregated.push({
            name, serie, set,
            type: data.find(r => r.name===name && r.serie_name===serie && r.set_name===set)?.types,
            values: valid.sort((a,b) => conditionOrder.indexOf(a.condition) - conditionOrder.indexOf(b.condition))
          });
        }
      });
    });
  });

  if (aggregated.length === 0) {
    window.slopeLines = [];
    return;
  }

  const width = 600,
        height = 500,
        margin = {top:40, right:40, bottom:60, left:80},
        innerWidth = width - margin.left - margin.right,
        innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const allConds = Array.from(new Set(aggregated.flatMap(d => d.values.map(v => v.condition))));
  const x = d3.scalePoint()
    .domain(allConds)
    .range([0, innerWidth])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, d3.max(aggregated, d => d3.max(d.values, v => v.avg)) || 1])
    .nice()
    .range([innerHeight, 0]);

  // vertical grid lines
  g.selectAll(".x-line")
    .data(allConds)
    .enter().append("line")
    .attr("class","x-line")
    .attr("x1", d => x(d))
    .attr("x2", d => x(d))
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke","#ccc");

  // axes
  g.append("g")
    .attr("transform",`translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerWidth/2)
    .attr("y", innerHeight+40)
    .attr("text-anchor","middle")
    .text("Condition");
  g.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -innerHeight/2)
    .attr("y", -margin.left+15)
    .attr("text-anchor","middle")
    .text("Average Price");

  const lineGen = d3.line()
    .x(d => x(d.condition))
    .y(d => y(d.avg));

  // --- Draw lines and dots (click only on line) ---
  const localSlopeLines = []; // temp, will assign to window.slopeLines at end

  aggregated.forEach(d => {
    const color = TYPE_COLORS[d.type] || "#888";

    // main line - clickable only
    const line = g.append("path")
      .datum(d.values)
      .attr("fill","none")
      .attr("stroke", color)
      .attr("stroke-width",2)
      .attr("d", lineGen)
      .attr("class", "slope-line")
      .style("cursor","pointer")
      .style("opacity",1)
      .on("click", function(){
        selectedCard =
          selectedCard &&
          selectedCard.name===d.name &&
          selectedCard.serie===d.serie &&
          selectedCard.set===d.set
            ? null
            : { name:d.name, serie:d.serie, set:d.set };
        updateSelectionAcrossPlots();
      });

    // dots (no interactions)
    const pts = g.selectAll(null)
      .data(d.values.map(v => ({...v, name:d.name, serie:d.serie, set:d.set, type:d.type})))
      .enter().append("circle")
      .attr("class","slope-dot")
      .attr("cx", v => x(v.condition))
      .attr("cy", v => y(v.avg))
      .attr("r",4)
      .attr("fill", color)
      .style("opacity",1)
      .append("title")  // simple browser tooltip
      .text(v => 
            `${v.name}\nSerie: ${v.serie}\nSet: ${v.set}\nType: ${v.type}\nAvg: ${v.avg.toFixed(2)}`
        );
    localSlopeLines.push({ name:d.name, serie:d.serie, set:d.set, line, points:pts });
  });

  // expose globally so updateSelectionAcrossPlots can find them
  window.slopeLines = localSlopeLines;
}
