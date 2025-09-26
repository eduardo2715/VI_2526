let scatterPoints = [];

function createScatterplot(data, selector) {
  d3.select(selector).selectAll("*").remove();
  scatterPoints = [];

  // Aggregate data by Pokémon name + serie + set
  const grouped = d3.rollup(
    data,
    rows => {
      const totalCount = d3.sum(rows, r => +r.count);
      const totalRevenue = d3.sum(rows, r => (+r.count) * (+r.avg));
      const type = rows[0].types;
      return { count: totalCount, revenue: totalRevenue, type: type };
    },
    d => d.name,
    d => d.serie_name,
    d => d.set_name
  );

  let aggregated = [];
  grouped.forEach((bySerie, name) => {
    bySerie.forEach((bySet, serie) => {
      bySet.forEach((values, set) => {
        aggregated.push({
          name,
          serie,
          set,
          count: values.count,
          revenue: values.revenue,
          type: values.type
        });
      });
    });
  });

  if (aggregated.length === 0) return;

  aggregated.sort((a, b) => d3.descending(a.count, b.count));
  aggregated.forEach((d, i) => { d.rank = i + 1; });

  const width = 500,
        height = 350,
        margin = {top: 40, right: 20, bottom: 60, left: 80},
        innerWidth = width - margin.left - margin.right,
        innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
                .attr("width", width)
                .attr("height", height);

  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
              .domain([0, d3.max(aggregated, d => d.count) || 1])
              .nice()
              .range([0, innerWidth]);

  const y = d3.scaleLinear()
              .domain([0, d3.max(aggregated, d => d.revenue) || 1])
              .nice()
              .range([innerHeight, 0]);

  g.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  g.append("text")
   .attr("x", innerWidth / 2)
   .attr("y", innerHeight + 40)
   .attr("text-anchor", "middle")
   .style("font-size", "12px")
   .text("Total Count (Sales Volume)");

  g.append("text")
   .attr("transform", "rotate(-90)")
   .attr("x", -innerHeight / 2)
   .attr("y", -margin.left + 10)
   .attr("text-anchor", "middle")
   .attr("dominant-baseline", "middle")
   .style("font-size", "15px")
   .text("Total Revenue");

  scatterPoints = g.selectAll("circle")
                  .data(aggregated)
                  .enter()
                  .append("circle")
                  .attr("cx", d => x(d.count))
                  .attr("cy", d => y(d.revenue))
                  .attr("r", 6)
                  .attr("fill", d => TYPE_COLORS[d.type] || "#888")
                  .style("cursor", "pointer")
                  .on("click", function(event, d) {
                    selectedCard =
                      selectedCard &&
                      selectedCard.name === d.name &&
                      selectedCard.serie === d.serie &&
                      selectedCard.set === d.set
                        ? null
                        : { name: d.name, serie: d.serie, set: d.set };
                    updateSelectionAcrossPlots();
                  })
                  .append("title")
                  .text(d => 
                    `${d.name}\nSerie: ${d.serie}\nSet: ${d.set}\nType: ${d.type}\nCount: ${d.count}\nRevenue: ${d.revenue.toFixed(2)}\nPopularity Rank: ${d.rank}`
                  );

}
