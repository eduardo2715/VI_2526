let barRects = [];

function createBarchart(data, selector) {
  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const height = container.clientHeight;

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const margin = { top: 4 * rem, right: 1.25 * rem, bottom: 3.75 * rem, left: 8.75 * rem };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Remove previous SVG
  const oldSvg = d3.select(selector).select("svg");
  if (!data || data.length === 0) {
    oldSvg.selectAll(".bar")
      .transition().duration(500).style("opacity", 0).remove();

    d3.select(selector).selectAll(".no-data-msg").remove();

    d3.select(selector).append("div")
      .attr("class", "no-data-msg")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("height", "100%")
      .style("width", "100%")
      .style("color", "#666")
      .style("font-size", "1em")
      .style("text-align", "center")
      .style("opacity", 0)
      .text("No data to display for the selected filters.")
      .transition().duration(500).style("opacity", 1);

    oldSvg.remove();
    return;
  }

  d3.select(selector).selectAll(".no-data-msg")
    .transition().duration(500).style("opacity", 0).remove();

  oldSvg.remove();

  // Aggregate top 10
  const grouped = d3.rollup(
    data,
    rows => d3.sum(rows, r => +r.count),
    d => `${d.name}---${d.serie}---${d.set}`
  );

  const aggregated = Array.from(grouped, ([key, count]) => {
    const [name, serie, set] = key.split("---");
    const type = data.find(d => d.name === name && d.serie === serie && d.set === set)?.type || "";
    return { name, serie, set, count, type };
  });

  const top10 = aggregated.sort((a, b) => d3.descending(a.count, b.count)).slice(0, 10);

  const svg = d3.select(selector).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Chart title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Top " + top10.length + " Sold Cards");

  const y = d3.scaleBand()
    .domain(top10.map(d => `${d.name}---${d.serie}---${d.set}`))
    .range([0, innerHeight])
    .padding(0.2);

  const x = d3.scaleLinear()
    .domain([0, d3.max(top10, d => d.count)])
    .range([0, innerWidth]);

  // Axes
  const yAxis = g.append("g")
    .attr("class", "P_axis")
    .call(d3.axisLeft(y).tickFormat(t => t.split('---')[0]));

  const xAxis = g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("~s")));

  yAxis.selectAll("text").attr("class", "axis-text");
  xAxis.selectAll("text").attr("class", "axis-text");

  // Axis titles
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 2.5 * rem)
    .attr("text-anchor", "middle")
    .text("Total Count (Sales Volume)");

  g.append("text")
    .attr("class", "axis-title")
    .attr("x", -margin.left + rem)
    .attr("y", -0.5 * rem)
    .attr("text-anchor", "start")
    .text("Pokémons");

  // Tooltip (global div)
  const tooltip = d3.select("#tooltip");

  // --- Bars ---
  barRects = g.selectAll(".bar")
    .data(top10)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", d => y(`${d.name}---${d.serie}---${d.set}`))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", 0) // start width 0
    .attr("fill", d => TYPE_COLORS[d.type] || "#888")
    .style("cursor", "pointer")
    .style("opacity", 0);

  // --- Attach click events before transition ---
  barRects.on("click", function(event, d) {
    const key = `${d.name}|${d.serie}|${d.set}`;
    if (event.ctrlKey || event.metaKey) {
      if (selectedCards.includes(key)) {
        selectedCards = selectedCards.filter(k => k !== key);
      } else {
        selectedCards.push(key);
      }
    } else {
      selectedCards = selectedCards.includes(key) && selectedCards.length === 1 ? [] : [key];
    }
    updateSelectionAcrossPlots();
  });

  // Animate bars
  barRects.transition()
    .duration(700)
    .style("opacity", 1)
    .attr("width", d => x(d.count));

  // --- Flicker-free tooltip ---
  g.on("mousemove", function(event) {
    const [mx, my] = d3.pointer(event);
    const hoveredBar = top10.find(d => {
      const y0 = y(`${d.name}---${d.serie}---${d.set}`);
      const y1 = y0 + y.bandwidth();
      const x1 = x(d.count);
      return mx >= 0 && mx <= x1 && my >= y0 && my <= y1;
    });

    if (hoveredBar) {
      const types = hoveredBar.type ? hoveredBar.type.split(",").map(t => t.trim()) : [];
      const iconsHTML = types.map(t =>
        TYPE_ICONS[t] ? `<img src="${TYPE_ICONS[t]}" alt="${t}" class="type-icon">` : ""
      ).join("");

      tooltip.style("opacity", 1)
        .style("border-color", TYPE_COLORS[types[0]] || "#3b4cca")
        .html(`
          <div class="tooltip-header" style="color:${TYPE_COLORS[types[0]] || "#2c3e50"}">
            ${hoveredBar.name} ${iconsHTML}
          </div>
          <em>Serie:</em> ${hoveredBar.serie}<br>
          <em>Set:</em> ${hoveredBar.set}<br>
          <em>Type:</em> ${hoveredBar.type}<br>
          <em>Total Sales:</em> ${hoveredBar.count}
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    } else {
      tooltip.transition().duration(200).style("opacity", 0);
    }
  });

  g.on("mouseleave", function() {
    tooltip.style("opacity", 0);
  });
}
