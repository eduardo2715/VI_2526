window.slopeLines = [];

function createLineChart(data, selector) {
  if (!data.length) return;

  const container = document.querySelector(selector);
  const width = container.clientWidth, height = container.clientHeight;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

  const margin = { top: 4*rem, right: 1.25*rem, bottom: 3.75*rem, left: 5*rem };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const circleRadius = 0.2*rem;

  // Clear old chart
  d3.select(selector).selectAll("*").remove();

  // --- SVG ---
  const svg = d3.select(selector).append("svg")
    .attr("width","100%")
    .attr("height","100%")
    .attr("viewBox", `0 0 ${width} ${height}`);

  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor","middle")
    .attr("class","chart-title")
    .text("Average Card Price per Condition");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Clip path
  const clipId = "slope-clip";
  g.append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  const linesGroup = g.append("g").attr("clip-path", `url(#${clipId})`);

  // --- Scales ---
  const allConds = [...new Set(data.flatMap(d => d.values.map(v => v.condition)))];
  const x = d3.scalePoint().domain(allConds).range([0, innerWidth]).padding(0.5);
  const maxY = d3.max(data, d => d3.max(d.values, v => v.avg)) || 1;
  const y = d3.scaleLinear().domain([0,maxY]).nice().range([innerHeight,0]);

  // Grid + axes
  g.selectAll(".x-line")
    .data(allConds)
    .join("line")
    .attr("class","x-line")
    .attr("x1", d => x(d))
    .attr("x2", d => x(d))
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke-dasharray", "2,2")
    .attr("stroke", "#ccc");

  g.append("g").attr("class","axis x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  const yAxis = g.append("g").attr("class","axis y-axis")
    .call(d3.axisLeft(y).tickFormat(d => `$${d}`));

  g.append("text")
    .attr("x", innerWidth/2)
    .attr("y", innerHeight+2.5*rem)
    .attr("text-anchor","middle")
    .attr("class","axis-title")
    .text("Condition");

  g.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-innerHeight/2)
    .attr("y",-margin.left+rem)
    .attr("text-anchor","middle")
    .attr("class","axis-title")
    .text("Average Price ($)");

  const lineGen = d3.line().x(d => x(d.condition)).y(d => y(d.avg));

  // --- JOIN ---
  const groups = linesGroup.selectAll("g.slope")
    .data(data, d => `${d.name}|${d.serie}|${d.set}`);

  // EXIT
  groups.exit().remove();

  // ENTER
  const groupsEnter = groups.enter()
    .append("g")
    .attr("class","slope");

  groupsEnter.append("path")
    .attr("fill","none")
    .attr("stroke", d => TYPE_COLORS[d.type] || "#888")
    .attr("stroke-width", 0.125*rem)
    .attr("d", d => lineGen(d.values))
    .attr("class","slope-line")
    .style("cursor","pointer")
    .style("opacity",1)
    .on("click", (event,d) => {
      const key = `${d.name}|${d.serie}|${d.set}`;
      if (event.ctrlKey || event.metaKey) {
        // Multi-select toggle
        if (selectedCards.includes(key)) {
          selectedCards = selectedCards.filter(k => k !== key);
        } else {
          selectedCards.push(key);
        }
      } else {
        // Single select
        selectedCards = selectedCards.includes(key) && selectedCards.length === 1 ? [] : [key];
      }
      updateSelectionAcrossPlots();
      updateSlopeTooltips();
    });

  groupsEnter.selectAll("circle")
    .data(d => d.values.map(v => ({...v, name:d.name, serie:d.serie, set:d.set, type:d.type})))
    .enter()
    .append("circle")
    .attr("class","slope-dot")
    .attr("cx", d => x(d.condition))
    .attr("cy", d => y(d.avg))
    .attr("r", 0)
    .style("opacity", 0)
    .attr("fill", d => TYPE_COLORS[d.type] || "#888");

  // MERGE + animate circles like scatterplot
  const groupsMerge = groupsEnter.merge(groups);

  groupsMerge.selectAll("circle")
    .data(d => d.values.map(v => ({...v, name:d.name, serie:d.serie, set:d.set, type:d.type})))
    .join("circle")
    .attr("cx", d => x(d.condition))
    .attr("cy", d => y(d.avg))
    .transition().duration(500)
    .attr("r", circleRadius)
    .style("opacity", 1)
    .attr("fill", d => TYPE_COLORS[d.type] || "#888");

  // --- Tooltips ---
  function updateSlopeTooltips() {
    groupsMerge.selectAll("circle title").text(d => {
      const keep = !selectedCard ||
        (d.name===selectedCard.name && d.serie===selectedCard.serie && d.set===selectedCard.set);
      return keep ? `${d.name}\nSerie:${d.serie}\nSet:${d.set}\nType:${d.type}\nAvg:${d.avg.toFixed(2)}` : "";
    });
  }
  updateSlopeTooltips();

  // Keep handles
  window.slopeLines = groupsMerge.nodes().map((node,i) => ({
    name: data[i].name,
    serie: data[i].serie,
    set: data[i].set,
    group: d3.select(node),
    line: d3.select(node).select("path"),
    points: d3.select(node).selectAll("circle")
  }));

  // --- Zoom + Slider ---
  const zoomSlider = d3.select("#slopeZoom");
  const targetFraction = 0.1;
  let panValue = 0;

  zoomSlider.attr("min", 0)
    .attr("max", 3)
    .attr("step", 0.1)
    .property("value", 0);

  function updateYAxis() {
    const logValue = +zoomSlider.property("value");
    const linearFactor = Math.pow(10, logValue);
    const adaptiveFactor = 1 + (linearFactor - 1) * (maxY / (maxY * targetFraction));
    const visibleMax = maxY / adaptiveFactor;

    const yMin = panValue * (maxY - visibleMax);
    const yMax = yMin + visibleMax;

    y.domain([yMin, yMax]).nice();
    yAxis.transition().duration(100)
      .call(d3.axisLeft(y).tickFormat(d => `$${d}`));

    groupsMerge.select("path.slope-line").attr("d", d => lineGen(d.values));
    groupsMerge.selectAll("circle").attr("cy", d => y(d.avg));
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

  d3.select(selector).select("svg").on("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY / 200000;
    panValue = Math.max(0, Math.min(1, panValue - delta));
    updateYAxis();
  });

  updateYAxis();
}
