let barRects = [];

function createBarchart(data, selector) {
  d3.select(selector).selectAll("*").remove();

  const grouped = d3.rollup(
    data,
    rows => {
      const totalCount = d3.sum(rows, r => +r.count);
      const type = rows[0].types;
      return { count: totalCount, type: type };
    },
    d => d.name
  );

  let top10 = Array.from(grouped, ([name, values]) => ({
    name,
    count: values.count,
    type: values.type
  }));

  top10 = top10.sort((a, b) => d3.descending(a.count, b.count)).slice(0, 10);

  if (top10.length === 0) return;

  const width = 400,
        height = 500,
        margin = {top: 40, right: 20, bottom: 20, left: 140},
        innerWidth = width - margin.left - margin.right,
        innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector)
                .append("svg")
                .attr("width", width)
                .attr("height", height);

  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
              .domain(top10.map(d => d.name))
              .range([0, innerHeight])
              .padding(0.2);

  const x = d3.scaleLinear()
              .domain([0, d3.max(top10, d => d.count)])
              .range([0, innerWidth]);

  g.append("g")
   .call(d3.axisLeft(y));

  g.append("g")
   .attr("transform", `translate(0,${innerHeight})`)
   .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("~s")));

  const tooltip = d3.select("#tooltip");

  barRects = g.selectAll(".bar")
    .data(top10)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.name))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.count))
    .attr("fill", d => TYPE_COLORS[d.type] || "#888")
    .style("opacity", 1)
    .on("mouseover", function(event, d) {
      if (selectedName) return;
      barRects.transition().duration(200)
        .style("opacity", b => b.name === d.name ? 1 : 0.2);
      d3.selectAll("circle").transition().duration(200)
        .style("opacity", c => c.name === d.name ? 1 : 0.2);
      tooltip.style("opacity", 1)
        .html(`${d.name}<br>Type: ${d.type}<br>Count: ${d.count}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })
    .on("mousemove", function(event) {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", function() {
      if (selectedName) return;
      barRects.transition().duration(200).style("opacity", 1);
      d3.selectAll("circle").transition().duration(200).style("opacity", 1);
      tooltip.style("opacity", 0);
    })
    .on("click", function(event, d) {
      selectedName = selectedName === d.name ? null : d.name;
      barRects.transition().duration(300)
        .style("opacity", b => !selectedName || b.name === selectedName ? 1 : 0.2);
      d3.selectAll("circle").transition().duration(300)
        .style("opacity", c => !selectedName || c.name === selectedName ? 1 : 0.2);
      tooltip.style("opacity", 0);
    });
}
