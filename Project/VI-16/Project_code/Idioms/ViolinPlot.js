let violinSvg, violinG, violinX, violinY, violinInnerWidth, violinInnerHeight, violinTooltip;
let violinMargin, violinWidth, violinHeight;

function initViolinPlot(selector) {
  const container = document.querySelector(selector);
  violinWidth = container.clientWidth;
  violinHeight = container.clientHeight;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

  violinMargin = { top: 4 * rem, right: 1.25 * rem, bottom: 4.2 * rem, left: 5 * rem };
  violinInnerWidth = violinWidth - violinMargin.left - violinMargin.right;
  violinInnerHeight = violinHeight - violinMargin.top - violinMargin.bottom;

  violinSvg = d3.select(selector).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${violinWidth} ${violinHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  violinG = violinSvg.append("g")
    .attr("transform", `translate(${violinMargin.left},${violinMargin.top})`);

  violinSvg.append("text")
    .attr("x", violinWidth / 2)
    .attr("y", violinMargin.top / 2)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Average Card Price by Rarity");

  violinG.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0,${violinInnerHeight})`);
  violinG.append("g").attr("class", "y-axis");

  violinG.append("text")
    .attr("x", violinInnerWidth / 2)
    .attr("y", violinInnerHeight + 4 * rem)
    .attr("text-anchor", "middle")
    .attr("class", "axis-title")
    .text("Rarity");

  violinG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -violinInnerHeight / 2)
    .attr("y", -violinMargin.left)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("class", "axis-title")
    .text("Average Card Price ($)");

  violinTooltip = d3.select("body").select("#tooltip");
  if (violinTooltip.empty()) {
    violinTooltip = d3.select("body").append("div").attr("id", "tooltip");
  }
}

function updateViolinPlot(data, selector, focusedRarity = null) {
  if (!data || data.length === 0) return;
  if (!violinSvg) initViolinPlot(selector);
  if (violinTooltip) violinTooltip.style("opacity", 0);

  const cardAverages = data
    .map(d => ({ rarity: d.rarity, avg: +d.avgPrice }))
    .filter(d => !isNaN(d.avg));

  if (cardAverages.length === 0) return;

  const grouped = d3.rollup(cardAverages, v => v.map(d => d.avg), d => d.rarity);

  let displayGrouped = grouped;
  if (focusedRarity && grouped.has(focusedRarity)) {
    displayGrouped = new Map([[focusedRarity, grouped.get(focusedRarity)]]);
  }

  const rarityOrder = [
    "Common", "Uncommon", "Rare", "Holo Rare", "Holo Rare V",
    "Holo Rare VMAX", "Holo Rare VSTAR", "Radiant Rare",
    "Amazing Rare", "Ultra Rare", "Secret Rare"
  ];

  // ✅ Keep only rarities present in the data, in the correct order
  const rarities = rarityOrder.filter(r => displayGrouped.has(r));

  const allValues = Array.from(displayGrouped.values()).flat();
  const globalMax = d3.max(allValues) || 1;

  violinX = d3.scaleBand()
    .domain(rarities)
    .range([0, violinInnerWidth])
    .padding(0.4);

  violinY = d3.scaleLinear()
    .domain([0, globalMax])
    .nice()
    .range([violinInnerHeight, 0]);

  const xAxis = d3.axisBottom(violinX);
  violinG.select(".x-axis").transition().duration(400).call(xAxis);

  violinG.select(".x-axis").selectAll("text")
    .attr("opacity", 1)
    .attr("data-rarity", d => d)
    .attr("transform", "rotate(-25)")
    .attr("text-anchor", "end")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .style("user-select", "none")
    .style("font-weight", d => (focusedRarity === d ? "bold" : "normal"))
    .style("fill", d => (focusedRarity === d ? "#008080" : "#000"))
    .on("mouseover", function(event, d) {
      d3.select(this)
        .style("font-weight", "bold")
        .style("fill", "#008080");
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .style("font-weight", focusedRarity === d ? "bold" : "normal")
        .style("fill", focusedRarity === d ? "#008080" : "#000")
        .attr("opacity", 1);
    });

  violinG.select(".y-axis")
    .transition().duration(400)
    .call(d3.axisLeft(violinY).tickFormat(smartDollarFormat));

  violinG.selectAll(".violin, .violin-dot, .box, .x-guide").remove();

  function kernelEpanechnikov(k) {
    return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  }
  function kernelDensityEstimator(kernel, X) {
    return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
  }

  const maxWidth = violinX.bandwidth() / 2;

  displayGrouped.forEach((values, rarity) => {
    const cleanValues = values.filter(v => !isNaN(v));
    if (cleanValues.length === 0) return;

    cleanValues.sort(d3.ascending);
    const min = d3.min(cleanValues);
    const max = d3.max(cleanValues);

    // === Handle single-point data ===
    if (min === max) {
      const center = violinX(rarity) + violinX.bandwidth() / 2;

      violinG.append("line")
        .attr("class", "x-guide")
        .attr("x1", center)
        .attr("x2", center)
        .attr("y1", 0)
        .attr("y2", violinInnerHeight)
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3");

      violinG.append("circle")
        .attr("class", "violin-dot")
        .attr("data-rarity", rarity)
        .attr("cx", center)
        .attr("cy", violinY(min))
        .attr("r", Math.max(4, maxWidth * 0.12))
        .attr("fill", "#69b3a2")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.9);

      violinG.append("circle")
        .attr("class", "violin-dot")
        .attr("data-rarity", rarity)
        .attr("cx", center)
        .attr("cy", violinY(min))
        .attr("r", Math.max(1, maxWidth * 0.02))
        .attr("fill", "#000")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.9);

      // Tooltip for dot
      bindTooltipEvents(rarity, cleanValues, null);
      return;
    }

    // === Density calculation ===
    const nSamples = focusedRarity ? 200 : 50;
    const step = (max - min) / nSamples;
    const xGrid = d3.range(min, max + step / 2, step);
    const range = max - min;
    const bandwidth = focusedRarity
      ? Math.max(range / Math.max(20, Math.sqrt(cleanValues.length * 2)), range * 0.02)
      : Math.max(range / Math.max(8, Math.sqrt(cleanValues.length)), range * 0.04);

    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xGrid);
    let density = kde(cleanValues);
    if (density[0][0] > min) density.unshift([min, 0]);
    if (density[density.length - 1][0] < max) density.push([max, 0]);
    density[0][1] = 0;
    density[density.length - 1][1] = 0;

    const maxDensity = d3.max(density, d => d[1]) || 1;
    const scale = d3.scaleLinear().domain([0, maxDensity]).range([0, maxWidth]);
    const center = violinX(rarity) + violinX.bandwidth() / 2;
    const rightSide = density.map(d => [center + scale(d[1]), violinY(d[0])]);
    const leftSide = density.slice().reverse().map(d => [center - scale(d[1]), violinY(d[0])]);
    const pathData = [...rightSide, ...leftSide];

    const q1 = d3.quantile(cleanValues, 0.25);
    const median = d3.quantile(cleanValues, 0.5);
    const q3 = d3.quantile(cleanValues, 0.75);


    violinG.append("line")
      .attr("class", "x-guide")
      .attr("x1", center)
      .attr("x2", center)
      .attr("y1", 0)
      .attr("y2", violinInnerHeight)
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3");

    // === Violin shape ===
    violinG.append("path")
      .attr("class", "violin")
      .attr("d", d3.line()(pathData))
      .attr("fill", "#69b3a2")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.8)
      .attr("opacity", focusedRarity ? 0.8 : 0.6)
      .attr("data-rarity", rarity)
      .style("cursor", "pointer");

    // === Box plot overlay ===
    const boxWidth = maxWidth * 0.5;
    violinG.append("rect")
      .attr("class", "box")
      .attr("x", center - boxWidth / 2)
      .attr("y", violinY(q3))
      .attr("width", boxWidth)
      .attr("height", Math.max(1, violinY(q1) - violinY(q3)))
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("data-rarity", rarity)
      .style("cursor", "pointer")
      .style("pointer-events", "all") // ensures hover works even on thin rect
      .attr("opacity", 0.6)
      .style("pointer-events", "bounding-box"); // ensures stroke counts


    violinG.append("line")
      .attr("class", "box")
      .attr("x1", center - boxWidth / 2)
      .attr("x2", center + boxWidth / 2)
      .attr("y1", violinY(median))
      .attr("y2", violinY(median))
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("data-rarity", rarity)
      .style("cursor", "pointer");

    // === Tooltip for all elements ===
    bindTooltipEvents(rarity, cleanValues, density);
  });

  // === Tooltip Binding Function ===
  function bindTooltipEvents(rarity, values, density) {
    const showTooltip = (event) => {
      const q1 = d3.quantile(values, 0.25);
      const median = d3.quantile(values, 0.5);
      const q3 = d3.quantile(values, 0.75);
      const avg = d3.mean(values);
      const min = d3.min(values);
      const max = d3.max(values);

      const tooltipHTML = `
        <div class="tooltip-header">${rarity}</div>
        <div><strong>Min:</strong> ${smartDollarFormat(min)}</div>
        <div><strong>Q1:</strong> ${smartDollarFormat(q1)}</div>
        <div><strong>Median:</strong> ${smartDollarFormat(median)}</div>
        <div><strong>Q3:</strong> ${smartDollarFormat(q3)}</div>
        <div><strong>Max:</strong> ${smartDollarFormat(max)}</div>
        <div><strong>Avg:</strong> ${smartDollarFormat(avg)}</div>
        <div><strong>Nº of Cards:</strong> ${values.length}</div>
      `;

      violinTooltip.html(tooltipHTML)
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .style("border-color", "#008080");

      d3.selectAll(`[data-rarity='${rarity}']`)
        .transition().duration(100)
        .attr("stroke-width", 2)
        .attr("opacity", 0.95);
    };

    const moveTooltip = (event) => {
      const tooltipNode = violinTooltip.node();
      const tw = tooltipNode.offsetWidth;
      const th = tooltipNode.offsetHeight;
      const pw = window.innerWidth;
      const ph = window.innerHeight;

      let left = event.pageX + 15;
      let top = event.pageY - 28;

      if (left + tw > pw - 30) left = event.pageX - tw - 15;
      if (top + th > ph - 30) top = event.pageY - th - 15;

      violinTooltip.style("left", `${left}px`).style("top", `${top}px`);

      violinTooltip.select("svg.tooltip-sparkline").remove();

      if (density){
        const sparkWidth = 120;
        const sparkHeight = 40;

        const xScale = d3.scaleLinear()
          .domain([d3.min(values), d3.max(values)])
          .range([0, sparkWidth]);

        const yScale = d3.scaleLinear()
          .domain([0, density ? d3.max(density, d => d[1]) : 1])
          .range([sparkHeight, 0]);

        const lineGenerator = d3.line()
          .x(d => xScale(d[0]))
          .y(d => yScale(d[1] || 0))
          .curve(d3.curveBasis);

        const sparkSvg = violinTooltip.append("svg")
          .attr("class", "tooltip-sparkline")
          .attr("width", sparkWidth)
          .attr("height", sparkHeight)
          .style("margin-top", "5px");

        sparkSvg.append("path")
          .datum(density)
          .attr("d", lineGenerator)
          .attr("fill", "#69b3a2")
          .attr("stroke", "#008080")
          .attr("stroke-width", 1)
          .attr("opacity", 0.6);
      }

    };

    const hideTooltip = () => {
      violinTooltip.style("opacity", 0);

      // Reset only violin shapes, boxes, and dots — not text labels
      violinG.selectAll(`.violin[data-rarity='${rarity}'],
                        .box[data-rarity='${rarity}'],
                        .violin-dot[data-rarity='${rarity}']`)
        .transition().duration(200)
        .attr("stroke-width", 0.8)
        .style("pointer-events", "bounding-box") // ensures stroke counts
        .attr("opacity", d => focusedRarity ? (focusedRarity === rarity ? 0.8 : 0.6) : 0.7)
        .attr("fill", function() {
          const el = d3.select(this);
          if (el.classed("violin")) return "#69b3a2";
          if (el.classed("box")) return "#fff";
          if (el.classed("violin-dot")) return "#69b3a2";
          return null;
        });
};


    violinG.selectAll(`[data-rarity='${rarity}']`)
      .on("mouseover.tooltip", showTooltip)
      .on("mousemove.tooltip", moveTooltip)
      .on("mouseout.tooltip", hideTooltip);
  }
}
