// ViolinPlot.js — responsive violin plot with focus/zoom-on-click mode (violins + x-axis labels)

let violinSvg, violinG, violinX, violinY, violinInnerWidth, violinInnerHeight, violinTooltip;
let violinMargin, violinWidth, violinHeight;
let violinFocused = null; // currently focused rarity (null = show all)

const smartDollarFormat = d => {
  if (d < 1) return `$${d3.format(".2f")(d)}`;  // show exact cents
  if (d < 1000) return `$${d3.format(".2f")(d)}`; // e.g. $3.25
  if (d < 1_000_000) return `$${d3.format(".2s")(d).replace("k", "K")}`; // $1.2K
  return `$${d3.format(".2s")(d).replace("M", "M")}`; // $1.2M etc.
};


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

  // Title
  violinSvg.append("text")
    .attr("x", violinWidth / 2)
    .attr("y", violinMargin.top / 2)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Average Card Price by Rarity");

  // Axes groups
  violinG.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0,${violinInnerHeight})`);
  violinG.append("g").attr("class", "y-axis");

  // Axis titles
  violinG.append("text")
    .attr("x", violinInnerWidth / 2)
    .attr("y", violinInnerHeight + 4.05 * rem)
    .attr("text-anchor", "middle")
    .attr("class", "axis-title")
    .text("Rarity");

  violinG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -violinInnerHeight / 2)
    .attr("y", -violinMargin.left + 0.625 * rem)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("class", "axis-title")
    .text("Average Card Price ($)");

  // Tooltip (shared)
  violinTooltip = d3.select("body").select("#tooltip");
  if (violinTooltip.empty()) {
    violinTooltip = d3.select("body").append("div").attr("id", "tooltip");
  }
}

function createViolinPlot(data, selector) {
  if (!data || data.length === 0) return;
  if (!violinSvg) initViolinPlot(selector);

  const cardAverages = data
    .map(d => ({ rarity: d.rarity, avg: +d.avgPrice }))
    .filter(d => !isNaN(d.avg));

  if (cardAverages.length === 0) return;

  // Group by rarity
  const grouped = d3.rollup(
    cardAverages,
    v => v.map(d => d.avg),
    d => d.rarity
  );

  // Focus mode: if one rarity is selected
  let displayGrouped = grouped;
  if (violinFocused) {
    const values = grouped.get(violinFocused);
    if (!values) {
      violinFocused = null;
    } else {
      displayGrouped = new Map([[violinFocused, values]]);
    }
  }

  const rarities = Array.from(displayGrouped.keys());
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

  // --- X Axis (with clickable + hover highlight labels) ---
  const xAxis = d3.axisBottom(violinX);

  violinG.select(".x-axis")
    .transition().duration(400)
    .call(xAxis);

  violinG.select(".x-axis").selectAll("text")
    .style("cursor", "pointer")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end")
    .style("font-weight", d => (violinFocused === d ? "bold" : "normal"))
    .style("fill", d => (violinFocused === d ? "#008080" : "#000"))
    .on("mouseover", function () {
      d3.select(this).style("fill", "#008080").style("font-weight", "bold");
    })
    .on("mouseout", function (event, rarity) {
      if (violinFocused !== rarity) {
        d3.select(this).style("fill", "#000").style("font-weight", "normal");
      }
    })
    .on("click", function (event, rarity) {
      event.stopPropagation();
      violinFocused = (violinFocused === rarity) ? null : rarity;
      createViolinPlot(data, selector);
      violinTooltip.style("opacity", 0)
    });

  // --- Y Axis ---
  violinG.select(".y-axis")
    .transition().duration(400)
    .call(d3.axisLeft(violinY).tickFormat(smartDollarFormat));

  // Remove old shapes
  violinG.selectAll(".violin, .violin-dot, .box, .x-guide").remove();

  // Kernel helpers
  function kernelEpanechnikov(k) {
    return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  }
  function kernelDensityEstimator(kernel, X) {
    return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
  }

  const formatPrice = d3.format("$.2s");
  const maxWidth = violinX.bandwidth() / 2;

  displayGrouped.forEach((values, rarity) => {
    const cleanValues = values.filter(v => !isNaN(v));
    if (cleanValues.length === 0) return;

    cleanValues.sort(d3.ascending);
    const min = d3.min(cleanValues);
    const max = d3.max(cleanValues);

    if (min === max) {
      const center = violinX(rarity) + violinX.bandwidth() / 2;
      violinG.append("circle")
        .attr("class", "violin-dot")
        .attr("cx", center)
        .attr("cy", violinY(min))
        .attr("r", Math.max(4, maxWidth * 0.12))
        .attr("fill", "#69b3a2")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.9)
        .style("cursor", "pointer")
        .on("mouseover", () => {
          violinTooltip.style("opacity", 1).html(`
            <div class="tooltip-header">${rarity}</div>
            <em>Value:</em> ${formatPrice(min)}<br>
            <em>Cards:</em> ${cleanValues.length}
          `);
        })
        .on("mousemove", function (event) {
          positionTooltip(event, violinTooltip);
        })
        .on("mouseout", () => violinTooltip.style("opacity", 0))
        .on("click", function (event) {
          event.stopPropagation();
          violinFocused = violinFocused === rarity ? null : rarity;
          createViolinPlot(data, selector);
          violinTooltip.style("opacity", 0)
        });
      return;
    }

    // higher resolution when focused
    const nSamples = violinFocused ? 200 : 50;
    const step = (max - min) / nSamples;
    const xGrid = d3.range(min, max + step / 2, step);

    const range = max - min;
    const bandwidth = violinFocused
      ? Math.max(range / Math.max(20, Math.sqrt(cleanValues.length * 2)), range * 0.02)
      : Math.max(range / Math.max(8, Math.sqrt(cleanValues.length)), range * 0.04);

    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xGrid);
    let density = kde(cleanValues);

    if (density[0][0] > min) density.unshift([min, 0]);
    if (density[density.length - 1][0] < max) density.push([max, 0]);
    density[0][1] = 0;
    density[density.length - 1][1] = 0;

    const maxDensity = d3.max(density, d => d[1]) || 1;
    const scale = d3.scaleLinear()
      .domain([0, maxDensity])
      .range([0, maxWidth]);

    const center = violinX(rarity) + violinX.bandwidth() / 2;

    const rightSide = density.map(d => [center + scale(d[1]), violinY(d[0])]);
    const leftSide = density.slice().reverse().map(d => [center - scale(d[1]), violinY(d[0])]);
    const pathData = [...rightSide, ...leftSide];

    violinG.append("line")
      .attr("class", "x-guide")
      .attr("x1", center)
      .attr("x2", center)
      .attr("y1", 0)
      .attr("y2", violinInnerHeight)
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3");

    const q1 = d3.quantile(cleanValues, 0.25);
    const median = d3.quantile(cleanValues, 0.5);
    const q3 = d3.quantile(cleanValues, 0.75);

    const tooltipHTML = `
      <div class="tooltip-header">${rarity}</div>
      <em>Min:</em> ${formatPrice(min)}<br>
      <em>Q1:</em> ${formatPrice(q1)}<br>
      <em>Median:</em> ${formatPrice(median)}<br>
      <em>Q3:</em> ${formatPrice(q3)}<br>
      <em>Max:</em> ${formatPrice(max)}<br>
      <em>Cards:</em> ${cleanValues.length}
    `;

    violinG.append("path")
      .style("cursor", "pointer")
      .attr("class", "violin")
      .attr("d", d3.line()(pathData))
      .attr("fill", "#69b3a2")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.8)
      .attr("opacity", violinFocused ? 0.8 : 0.62)
      .on("mouseover", function () {
        violinTooltip.style("opacity", 1).html(tooltipHTML);
      })
      .on("mousemove", function (event) {
        positionTooltip(event, violinTooltip);
      })
      .on("mouseout", () => violinTooltip.style("opacity", 0))
      .on("click", function (event) {
        event.stopPropagation();
        violinFocused = violinFocused === rarity ? null : rarity;
        createViolinPlot(data, selector);
        violinTooltip.style("opacity", 0)
      });

    const boxWidth = maxWidth * 0.5;
    violinG.append("rect")
      .style("cursor", "pointer")
      .attr("class", "box")
      .attr("x", center - boxWidth / 2)
      .attr("y", violinY(q3))
      .attr("width", boxWidth)
      .attr("height", Math.max(1, violinY(q1) - violinY(q3)))
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .on("mouseover", function () {
        violinTooltip.style("opacity", 1).html(tooltipHTML);
      })
      .on("mousemove", function (event) {
        positionTooltip(event, violinTooltip);
      })
      .on("mouseout", () => violinTooltip.style("opacity", 0))
      .on("click", function (event) {
        event.stopPropagation();
        violinFocused = violinFocused === rarity ? null : rarity;
        createViolinPlot(data, selector);
        violinTooltip.style("opacity", 0)
      });

    violinG.append("line")
      .attr("class", "box")
      .attr("x1", center - boxWidth / 2)
      .attr("x2", center + boxWidth / 2)
      .attr("y1", violinY(median))
      .attr("y2", violinY(median))
      .attr("stroke", "#000")
      .attr("stroke-width", 2);
  });
}

// Shared tooltip positioning helper
function positionTooltip(event, tooltip) {
  const node = tooltip.node();
  if (!node) return;
  const tw = node.offsetWidth;
  const th = node.offsetHeight;
  const pw = window.innerWidth;
  const ph = window.innerHeight;

  let left = event.pageX + 15;
  let top = event.pageY - 28;

  if (left + tw > pw - 10) left = event.pageX - tw - 15;
  if (top + th > ph - 10) top = event.pageY - th - 15;

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

// Click outside to reset focus
document.addEventListener("click", function (event) {
  const clickedViolin = event.target.closest(".violin, .violin-dot, .box");
  const clickedLabel = event.target.closest(".x-axis text");
  if (!clickedViolin && !clickedLabel && violinFocused) {
    violinFocused = null;
    if (window.violinTable) createViolinPlot(window.violinTable, ".ViolinPlot");
  }
});
