// ViolinPlot.js — simplified + fixed: expects pre-aggregated data

let violinSvg, violinG, violinX, violinY, violinInnerWidth, violinInnerHeight;
const violinMargin = { top: 20, right: 20, bottom: 50, left: 40 };

function initViolinPlot(selector) {
  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const height = container.clientHeight;

  violinInnerWidth = width - violinMargin.left - violinMargin.right;
  violinInnerHeight = height - violinMargin.top - violinMargin.bottom;

  violinSvg = d3.select(selector).append("svg")
    .attr("width", width)
    .attr("height", height);

  violinG = violinSvg.append("g")
    .attr("transform", `translate(${violinMargin.left},${violinMargin.top})`);

  violinX = d3.scaleBand().padding(0.4);
  violinY = d3.scaleLinear();

  violinG.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${violinInnerHeight})`);

  violinG.append("g")
    .attr("class", "y-axis");
}

/* function createViolinPlot(data, selector) {
  if (!data || data.length === 0) return;
  if (!violinSvg) initViolinPlot(selector);

  // --- Step 1: use pre-aggregated avgPrice values directly ---
  const cardAverages = data
    .map(d => ({ rarity: d.rarity, avg: +d.avgPrice }))
    .filter(d => !isNaN(d.avg));

  if (cardAverages.length === 0) return;

  // --- Step 2: group by rarity ---
  const grouped = d3.rollup(
    cardAverages,
    v => v.map(d => d.avg),
    d => d.rarity
  );

  const rarities = Array.from(grouped.keys());
  const allValues = Array.from(grouped.values()).flat();
  const maxY = d3.max(allValues) || 1;

  // --- Scales ---
  violinX.domain(rarities).range([0, violinInnerWidth]);
  violinY.domain([0, maxY]).range([violinInnerHeight, 0]).nice();

  // --- Axes ---
  violinG.select(".x-axis")
    .transition().duration(400)
    .call(d3.axisBottom(violinX))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  violinG.select(".y-axis")
    .transition().duration(400)
    .call(d3.axisLeft(violinY));

  // --- Remove old violins ---
  violinG.selectAll(".violin").remove();

  // --- KDE helpers ---
  function kernelEpanechnikov(k) {
    return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  }
  function kernelDensityEstimator(kernel, X) {
    return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
  }

  const kde = kernelDensityEstimator(kernelEpanechnikov(7), violinY.ticks(30));
  const maxWidth = violinX.bandwidth() / 2;

  // --- Draw violins ---
  grouped.forEach((values, rarity) => {
    const cleanValues = values.filter(v => !isNaN(v));
    if (cleanValues.length < 1) return;

    const density = kde(cleanValues);
    const center = violinX(rarity) + violinX.bandwidth() / 2;
    const scale = d3.scaleLinear()
      .domain([0, d3.max(density, d => d[1]) || 1])
      .range([0, maxWidth]);

    const pathData = [
      ...density.map(d => [center + scale(d[1]), violinY(d[0])]),
      ...density.slice().reverse().map(d => [center - scale(d[1]), violinY(d[0])])
    ];

    violinG.append("path")
      .attr("class", "violin")
      .attr("d", d3.line()(pathData))
      .attr("fill", "#69b3a2")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.6);
  });
} */

  function createViolinPlot(data, selector) {
  if (!data || data.length === 0) return;
  if (!violinSvg) initViolinPlot(selector);

  // --- Step 1: use pre-aggregated avgPrice values directly ---
  const cardAverages = data
    .map(d => ({ rarity: d.rarity, avg: +d.avgPrice }))
    .filter(d => !isNaN(d.avg));

  if (cardAverages.length === 0) return;

  // --- Step 2: group by rarity ---
  const grouped = d3.rollup(
    cardAverages,
    v => v.map(d => d.avg),
    d => d.rarity
  );

  const rarities = Array.from(grouped.keys());
  const allValues = Array.from(grouped.values()).flat();
  const maxY = d3.max(allValues) || 1;

  // --- Scales ---
  violinX.domain(rarities).range([0, violinInnerWidth]);
  violinY.domain([0, maxY]).range([violinInnerHeight, 0]).nice();

  // --- Axes ---
  violinG.select(".x-axis")
    .transition().duration(400)
    .call(d3.axisBottom(violinX))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  violinG.select(".y-axis")
    .transition().duration(400)
    .call(d3.axisLeft(violinY));

  // --- Remove old violins ---
  violinG.selectAll(".violin, .violin-dot").remove();

  // --- KDE helpers ---
  function kernelEpanechnikov(k) {
    return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  }
  function kernelDensityEstimator(kernel, X) {
    return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
  }

  const kde = kernelDensityEstimator(kernelEpanechnikov(7), violinY.ticks(30));
  const maxWidth = violinX.bandwidth() / 2;

  // --- Draw violins or dots ---
  grouped.forEach((values, rarity) => {
    const cleanValues = values.filter(v => !isNaN(v));
    if (cleanValues.length === 0) return;

    const center = violinX(rarity) + violinX.bandwidth() / 2;

    if (cleanValues.length === 1) {
      // 🎯 Only one card: draw a dot instead of a violin
      violinG.append("circle")
        .attr("class", "violin-dot")
        .attr("cx", center)
        .attr("cy", violinY(cleanValues[0]))
        .attr("r", Math.max(4, maxWidth * 0.1))
        .attr("fill", "#69b3a2")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.8);
      return;
    }

    // --- Regular violin for 2+ data points ---
    const density = kde(cleanValues);
    const scale = d3.scaleLinear()
      .domain([0, d3.max(density, d => d[1]) || 1])
      .range([0, maxWidth]);

    const pathData = [
      ...density.map(d => [center + scale(d[1]), violinY(d[0])]),
      ...density.slice().reverse().map(d => [center - scale(d[1]), violinY(d[0])])
    ];

    violinG.append("path")
      .attr("class", "violin")
      .attr("d", d3.line()(pathData))
      .attr("fill", "#69b3a2")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.6);
  });
}
