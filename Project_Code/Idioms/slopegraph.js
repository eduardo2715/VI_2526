window.slopeLines = [];

function createSlopegraph(data, selector) {
  d3.select(selector).selectAll("*").remove();
  window.slopeLines = [];

  const conditionOrder = ["mint","nearmint","excellent","good","lightplayed","played","poor"];
  const normalizeCondition = cond => {
    if (!cond) return null;
    const part = cond.split("-")[1]?.toLowerCase();
    return conditionOrder.includes(part) ? part : null;
  };

  const typeIndex = new Map(data.map(d => [`${d.name}|${d.serie_name}|${d.set_name}`, d.types]));

  const grouped = d3.rollup(
    data,
    v => d3.mean(v, d => +d.avg),
    d => d.name,
    d => d.serie_name,
    d => d.set_name,
    d => normalizeCondition(d.condition)
  );

  const aggregated = [];
  for (const [name, bySerie] of grouped) {
    for (const [serie, bySet] of bySerie) {
      for (const [set, condMap] of bySet) {
        const values = Array.from(condMap, ([c, avg]) => ({ condition:c, avg }))
          .filter(d => d.condition)
          .sort((a,b)=>conditionOrder.indexOf(a.condition)-conditionOrder.indexOf(b.condition));
        if (values.length) {
          aggregated.push({
            name, serie, set,
            type: typeIndex.get(`${name}|${serie}|${set}`),
            values
          });
        }
      }
    }
  }
  if (!aggregated.length) return;

  // --- Layout ---
  const container = document.querySelector(selector);
  const width = container.clientWidth, height = container.clientHeight;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

  const margin = {top: 2.5*rem, right: 1.25*rem, bottom: 3.75*rem, left: 5*rem};
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width","100%").attr("height","100%");

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  // --- CLIP PATH ---
  const clipId = "slope-clip";
  g.append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  // Container for lines and points with clipping
  const linesGroup = g.append("g").attr("clip-path", `url(#${clipId})`);

  const allConds = [...new Set(aggregated.flatMap(d => d.values.map(v => v.condition)))];
  const x = d3.scalePoint().domain(allConds).range([0, innerWidth]).padding(0.5);
  const maxY = d3.max(aggregated, d => d3.max(d.values, v => v.avg)) || 1;
  const y = d3.scaleLinear().domain([0, maxY]).nice().range([innerHeight,0]);

  // grid
  g.selectAll(".x-line")
    .data(allConds)
    .join("line")
    .attr("class","x-line")
    .attr("x1", d => x(d))
    .attr("x2", d => x(d))
    .attr("y1", 0)
    .attr("y2", innerHeight);

  const yAxis = g.append("g").attr("class","axis").call(d3.axisLeft(y));
  g.append("g").attr("class","axis x-axis")
    .attr("transform",`translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  // Axis titles
  g.append("text")
    .attr("x", innerWidth/2)
    .attr("y", innerHeight + 2.5*rem)
    .attr("text-anchor", "middle")
    .attr("class","axis-title")
    .text("Condition");

  g.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-innerHeight/2)
    .attr("y",-margin.left + rem)
    .attr("text-anchor","middle")
    .attr("class","axis-title")
    .text("Average Price");

  const lineGen = d3.line()
    .x(d => x(d.condition))
    .y(d => y(d.avg));

  // Groups: one per card
  const groups = linesGroup.append("g")
    .selectAll("g.slope")
    .data(aggregated)
    .join("g")
    .attr("class","slope");

  // Paths
  const paths = groups.append("path")
    .attr("fill","none")
    .attr("stroke",d=>TYPE_COLORS[d.type]||"#888")
    .attr("stroke-width", 0.125*rem)
    .attr("d",d=>lineGen(d.values))
    .attr("class","slope-line")
    .style("cursor","pointer")
    .on("click",(event,d)=>{
      selectedCard =
        selectedCard &&
        selectedCard.name===d.name &&
        selectedCard.serie===d.serie &&
        selectedCard.set===d.set
        ? null : {name:d.name, serie:d.serie, set:d.set};
      updateSelectionAcrossPlots();
      updateSlopeTooltips();
    });

  // Circles
  const circles = groups.selectAll("circle")
    .data(d=>d.values.map(v=>({...v, name:d.name, serie:d.serie, set:d.set, type:d.type})))
    .join("circle")
    .attr("class","slope-dot")
    .attr("cx",d=>x(d.condition))
    .attr("cy",d=>y(d.avg))
    .attr("r",0.21875*rem)
    .attr("fill",d=>TYPE_COLORS[d.type]||"#888");

  circles.append("title")
    .text(d=>`${d.name}\nSerie:${d.serie}\nSet:${d.set}\nType:${d.type}\nAvg:${d.avg.toFixed(2)}`);

  window.slopeLines = groups.nodes().map((node,i)=>({
    name: aggregated[i].name,
    serie: aggregated[i].serie,
    set: aggregated[i].set,
    group: d3.select(node),
    line: d3.select(node).select("path"),
    points: d3.select(node).selectAll("circle")
  }));

  function updateSlopeTooltips() {
    groups.selectAll("circle title").text(function(d){
      const keep = !selectedCard ||
        (d.name===selectedCard.name && d.serie===selectedCard.serie && d.set===selectedCard.set);
      return keep ? `${d.name}\nSerie:${d.serie}\nSet:${d.set}\nType:${d.type}\nAvg:${d.avg.toFixed(2)}` : "";
    });
  }
  updateSlopeTooltips();

  // Zoom + slider
  const zoomSlider = d3.select("#slopeZoom");
  const targetFraction = 0.1;
  let panValue = 0;

  function updateYAxis() {
    const logValue = +zoomSlider.property("value");
    const linearFactor = Math.pow(10, logValue);
    const adaptiveFactor = 1 + (linearFactor - 1) * (maxY / (maxY * targetFraction));
    const visibleMax = maxY / adaptiveFactor;

    const yMin = panValue * (maxY - visibleMax);
    const yMax = yMin + visibleMax;

    y.domain([yMin, yMax]).nice();
    yAxis.transition().duration(100).call(d3.axisLeft(y));

    paths.transition().duration(100).attr("d",d=>lineGen(d.values));
    circles.transition().duration(100).attr("cy",d=>y(d.avg));
  }

  zoomSlider.on("input", updateYAxis);

  d3.select(".slider-btn.plus").on("click", () => {
    let val = +zoomSlider.property("value");
    val = Math.min(+zoomSlider.attr("max"), val + +zoomSlider.attr("step"));
    zoomSlider.property("value", val);
    updateYAxis();
  });

  d3.select(".slider-btn.minus").on("click", () => {
    let val = +zoomSlider.property("value");
    val = Math.max(+zoomSlider.attr("min"), val - +zoomSlider.attr("step"));
    zoomSlider.property("value", val);
    updateYAxis();
  });

  svg.on("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY / 50000;
    panValue = Math.max(0, Math.min(1, panValue - delta));
    updateYAxis();
  });
}
