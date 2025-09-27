let scatterPoints = [];

function createScatterplot(data, selector) {
  d3.select(selector).selectAll("*").remove();
  scatterPoints = [];

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
          name, serie, set,
          count: values.count,
          revenue: values.revenue,
          type: values.type
        });
      });
    });
  });

  if (!aggregated.length) return;

  aggregated.sort((a,b) => d3.descending(a.count, b.count));
  aggregated.forEach((d,i) => d.rank = i+1);

  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const height = container.clientHeight;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

  const margin = { top: 2.5*rem, right: 1.25*rem, bottom: 3.75*rem, left: 5*rem };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
    .attr("width","100%").attr("height","100%")
    .attr("viewBox",`0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","xMidYMid meet");

  const g = svg.append("g")
    .attr("transform",`translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0,d3.max(aggregated,d=>d.count)||1])
    .nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0,d3.max(aggregated,d=>d.revenue)||1])
    .nice()
    .range([innerHeight,0]);

  const formatRevenue = d3.format("$.2s");

  g.append("g")
   .attr("transform", `translate(0,${innerHeight})`)
   .call(d3.axisBottom(x).ticks(Math.min(innerWidth/50,10)))
   .attr("class","axis");

  g.append("g")
   .call(d3.axisLeft(y).tickFormat(d=>formatRevenue(d)).ticks(Math.min(innerHeight/50,10)))
   .attr("class","axis");

  // X-axis title
  g.append("text")
   .attr("x",innerWidth/2)
   .attr("y",innerHeight + 2.5*rem)
   .attr("text-anchor","middle")
   .attr("class","axis-title")
   .text("Total Count (Sales Volume)");

  // Y-axis title
  g.append("text")
   .attr("transform","rotate(-90)")
   .attr("x",-innerHeight/2)
   .attr("y",-margin.left + 0.625*rem)
   .attr("text-anchor","middle")
   .attr("dominant-baseline","middle")
   .attr("class","axis-title")
   .text("Total Revenue ($)");

  const circleRadius = 0.375*rem;

  scatterPoints = g.selectAll("circle")
    .data(aggregated)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.count))
    .attr("cy", d => y(d.revenue))
    .attr("r", circleRadius)
    .attr("fill", d => TYPE_COLORS[d.type] || "#888")
    .style("cursor","pointer")
    .on("click", function(event,d){
      selectedCard =
        selectedCard &&
        selectedCard.name===d.name &&
        selectedCard.serie===d.serie &&
        selectedCard.set===d.set
          ? null
          : {name:d.name,serie:d.serie,set:d.set};
      updateSelectionAcrossPlots();
    })
    .append("title")
    .text(d =>
      `${d.name}\nSerie: ${d.serie}\nSet: ${d.set}\nType: ${d.type}\nCount: ${d.count}\nRevenue: ${formatRevenue(d.revenue)}\nPopularity Rank: ${d.rank}`
    );
}
