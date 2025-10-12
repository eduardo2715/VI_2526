// barchart.js

let barSvg, barG, barX, barY, barTooltip;
let barInnerWidth, barInnerHeight;
let barRects;
const barMargin = { top: 64, right: 20, bottom: 60, left: 140 }; // using rem-based logic in pixels for simplicity

// --- Initialize once ---
function initBarchart(selector) {
  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const height = container.clientHeight;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

  barInnerWidth = width - barMargin.left - barMargin.right;
  barInnerHeight = height - barMargin.top - barMargin.bottom;

  barSvg = d3.select(selector).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  barSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", "50%") // ✅ Percent — scales with SVG
    .attr("y", "5%")  // ✅ Relative to container height
    .text("Top 10 Sold Cards");

  barG = barSvg.append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  barG.append("g").attr("class", "y-axis P_axis");
  barG.append("g").attr("class", "x-axis").attr("transform", `translate(0,${barInnerHeight})`);

  barG.append("text")
    .attr("class", "axis-title x-axis-title")
    .attr("x", barInnerWidth / 2)
    .attr("y", barInnerHeight + 2.5 * rem)
    .attr("text-anchor", "middle")
    .text("Sales Volume");

  barG.append("text")
    .attr("class", "axis-title y-axis-title")
    .attr("x", -barMargin.left + 3 * rem)
    .attr("y", -0.5 * rem)
    .attr("text-anchor", "start")
    .text("Pokémons");

  barTooltip = d3.select("body").select("#tooltip");
  if (barTooltip.empty()) {
    barTooltip = d3.select("body").append("div").attr("id", "tooltip");
  }
}

// --- Update dynamically ---
function updateBarchart(data, selector) {
  if (!barSvg) initBarchart(selector);

  // --- Aggregate top 10 ---
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

  // --- Scales ---
  barY = d3.scaleBand()
    .domain(top10.map(d => `${d.name}---${d.serie}---${d.set}`))
    .range([0, barInnerHeight])
    .padding(0.2);

  barX = d3.scaleLinear()
    .domain([0, d3.max(top10, d => d.count)])
    .nice()
    .range([0, barInnerWidth]);

  // --- Axes ---
  const yAxis = d3.axisLeft(barY).tickFormat(t => t.split('---')[0]);
  const xAxis = d3.axisBottom(barX).ticks(5).tickFormat(d3.format("~s"));

  barG.select(".y-axis").transition().duration(500).call(yAxis);
  barG.select(".x-axis").transition().duration(500).call(xAxis);

  // --- Bars ---
  barRects = barG.selectAll(".bar")
    .data(top10, d => `${d.name}---${d.serie}---${d.set}`);

  barRects.exit()
    .transition().duration(400)
    .attr("width", 0)
    .style("opacity", 0)
    .remove();

  barRects.transition().duration(700)
    .attr("y", d => barY(`${d.name}---${d.serie}---${d.set}`))
    .attr("height", barY.bandwidth())
    .attr("width", d => barX(d.count))
    .attr("fill", d => TYPE_COLORS[d.type] || "#888")
    .style("opacity", 1);

  barRects.enter().append("rect")
    .attr("class", "bar")
    .attr("y", d => barY(`${d.name}---${d.serie}---${d.set}`))
    .attr("x", 0)
    .attr("height", barY.bandwidth())
    .attr("width", 0)
    .attr("rx", 5)
    .attr("fill", d => TYPE_COLORS[d.type] || "#888")
    .style("cursor", "pointer")
    .style("opacity", 0)
    .on("mouseover", function(event, d) {
      const types = d.type ? d.type.split(",").map(t => t.trim()) : [];
      const iconsHTML = types.map(t =>
        TYPE_ICONS[t] ? `<img src="${TYPE_ICONS[t]}" alt="${t}" class="type-icon">` : ""
      ).join("");
      barTooltip.style("opacity", 1)
        .style("border-color", TYPE_COLORS[types[0]] || "#3b4cca")
        .html(`
          <div class="tooltip-header" style="color:${TYPE_COLORS[types[0]] || "#2c3e50"}">
            ${d.name} ${iconsHTML}
          </div>
          <em>Serie:</em> ${d.serie}<br>
          <em>Set:</em> ${d.set}<br>
          <em>Type:</em> ${d.type}<br>
          <em>Total Sales:</em> ${d.count}
        `);
    })
    .on("mousemove", function(event) {
      // --- Smart tooltip positioning ---
      const node = barTooltip.node();
      const tw = node.offsetWidth;
      const th = node.offsetHeight;
      const pw = window.innerWidth;
      const ph = window.innerHeight;

      let left = event.pageX + 15;
      let top = event.pageY - 28;

      // Flip horizontally if tooltip would overflow right edge
      if (left + tw > pw - 10) {
        left = event.pageX - tw - 15;
      }

      // Flip vertically if tooltip would overflow bottom edge
      if (top + th > ph - 10) {
        top = event.pageY - th - 15;
      }

      barTooltip
        .style("left", `${left}px`)
        .style("top", `${top}px`);
    })
    .on("mouseout", () => barTooltip.style("opacity", 0))
    .on("click", function(event, d) {
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
    })
    .transition().duration(700)
    .attr("width", d => barX(d.count))
    .style("opacity", 1);
}
