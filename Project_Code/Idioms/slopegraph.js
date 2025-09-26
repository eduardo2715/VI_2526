window.slopeLines = [];

function createSlopegraph(data, selector) {
  d3.select(selector).selectAll("*").remove();
  window.slopeLines = [];

  const conditionOrder = ["mint","nearmint","excellent","good","lightplayed","played","poor"];
  function normalizeCondition(cond){
    if (!cond || typeof cond !== "string") return null;
    const parts = cond.split("-");
    const part = parts.length > 1 ? parts[1].toLowerCase() : null;
    return conditionOrder.includes(part) ? part : null;
  }

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

  if (aggregated.length === 0) return;

  // --- Container size ---
  const container = document.querySelector(selector);
  const width = container.clientWidth; // leave space for slider
  const height = container.clientHeight;
  const margin = {top:40, right:20, bottom:60, left:80};
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("overflow","visible");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Clip path
  svg.append("defs").append("clipPath")
    .attr("id", "clip-slope")
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  const plotArea = g.append("g")
    .attr("class", "plot-area")
    .attr("clip-path", "url(#clip-slope)");

  const allConds = Array.from(new Set(aggregated.flatMap(d => d.values.map(v => v.condition))));
  const x = d3.scalePoint()
    .domain(allConds)
    .range([0, innerWidth])
    .padding(0.5);

  const maxY = d3.max(aggregated, d => d3.max(d.values, v => v.avg)) || 1;
  const y = d3.scaleLinear()
    .domain([0, maxY])
    .nice()
    .range([innerHeight, 0]);

  // Vertical grid
  plotArea.selectAll(".x-line")
    .data(allConds)
    .enter().append("line")
    .attr("class","x-line")
    .attr("x1", d => x(d))
    .attr("x2", d => x(d))
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke","#ccc");

  // Axes
  const yAxis = g.append("g").attr("class","y-axis").call(d3.axisLeft(y));
  g.append("g").attr("class","x-axis")
    .attr("transform",`translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

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

  const localSlopeLines = [];

  aggregated.forEach(d => {
    const color = TYPE_COLORS[d.type] || "#888";

    const line = plotArea.append("path")
      .datum(d.values)
      .attr("fill","none")
      .attr("stroke", color)
      .attr("stroke-width",2)
      .attr("d", lineGen)
      .attr("class", "slope-line")
      .style("cursor","pointer")
      .on("click", function(){
        selectedCard =
          selectedCard &&
          selectedCard.name===d.name &&
          selectedCard.serie===d.serie &&
          selectedCard.set===d.set
            ? null
            : { name:d.name, serie:d.serie, set:d.set };
        updateSelectionAcrossPlots();
        updateSlopeTooltips();
        raiseSelectedElements();
      });

    const points = plotArea.selectAll(null)
      .data(d.values.map(v => ({...v, name:d.name, serie:d.serie, set:d.set, type:d.type})))
      .enter().append("circle")
      .attr("class","slope-dot")
      .attr("cx", v => x(v.condition))
      .attr("cy", v => y(v.avg))
      .attr("r",4)
      .attr("fill", color)
      .each(function(v){
        this._tooltip = `${v.name}\nSerie: ${v.serie}\nSet: ${v.set}\nType: ${v.type}\nAvg: ${v.avg.toFixed(2)}`;
      });

    const circleSelection = plotArea.selectAll("circle.slope-dot")
      .filter((v,i,nodes) =>
        nodes[i].__data__.name===d.name &&
        nodes[i].__data__.serie===d.serie &&
        nodes[i].__data__.set===d.set);

    localSlopeLines.push({ name:d.name, serie:d.serie, set:d.set, line, points: circleSelection });
  });

  window.slopeLines = localSlopeLines;

  // Tooltips
  function updateSlopeTooltips() {
    d3.selectAll("circle.slope-dot").each(function(d){
      d3.select(this).select("title").remove();
      if (!selectedCard ||
          (d.name === selectedCard.name &&
           d.serie === selectedCard.serie &&
           d.set === selectedCard.set)) {
        d3.select(this).append("title").text(this._tooltip);
      }
    });
  }
  updateSlopeTooltips();

  function raiseSelectedElements() {
    if (!selectedCard) return;
    d3.selectAll(".slope-line")
      .filter(d =>
        d.name === selectedCard.name &&
        d.serie === selectedCard.serie &&
        d.set === selectedCard.set
      )
      .raise();
    d3.selectAll("circle.slope-dot")
      .filter(d =>
        d.name === selectedCard.name &&
        d.serie === selectedCard.serie &&
        d.set === selectedCard.set
      )
      .raise();
  }

  // --- Use existing slider from HTML ---
  const zoomSlider = d3.select("#slopeZoom");

  const targetFraction = 0.1;
  let panValue = 0;

  function updateYAxis(){
    // Invert slider: up = zoom in
    const logValue = 2 - (+zoomSlider.property("value"));
    const linearFactor = Math.pow(10, logValue);
    const adaptiveFactor = 1 + (linearFactor - 1) * (maxY / (maxY * targetFraction));
    const visibleMax = maxY / adaptiveFactor;

    const yMin = panValue * (maxY - visibleMax);
    const yMax = yMin + visibleMax;

    y.domain([yMin, yMax]).nice();
    yAxis.transition().duration(100).call(d3.axisLeft(y));

    window.slopeLines.forEach(s => {
      s.line.transition().duration(100).attr("d", lineGen);
      s.points.transition().duration(100)
        .attr("cy", d => y(d.avg));
    });
  }

  zoomSlider.on("input", updateYAxis);

  svg.on("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY / 50000;
    panValue = Math.max(0, Math.min(1, panValue - delta));
    updateYAxis();
  });
}
