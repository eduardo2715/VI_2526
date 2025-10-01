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
          type: values.type
        });
      });
    });
  });

  let top10 = aggregated.sort((a,b) => d3.descending(a.count,b.count)).slice(0,10);
  if (top10.length === 0) return;

  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const height = container.clientHeight;

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const margin = { top: 4*rem, right: 1.25*rem, bottom: 3.75*rem, left: 8.75*rem }; // increased top margin
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(selector).append("svg")
                .attr("width","100%")
                .attr("height","100%")
                .attr("viewBox",`0 0 ${width} ${height}`)
                .attr("preserveAspectRatio","xMidYMid meet");

  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- Chart Title ---
  svg.append("text")
     .attr("x", width / 2)
     .attr("y", margin.top / 2)
     .attr("text-anchor", "middle")
     .attr("class", "chart-title")
     .text("Top 10 Sold Cards");

  const y = d3.scaleBand()
              .domain(top10.map(d => `${d.name}---${d.serie}---${d.set}`))
              .range([0, innerHeight])
              .padding(0.2);

  const x = d3.scaleLinear()
              .domain([0, d3.max(top10,d=>d.count)])
              .range([0, innerWidth]);

  // Axes
  const yAxis = g.append("g")
                 .attr("class","axis")
                 .call(d3.axisLeft(y).tickFormat(t=>t.split('---')[0]));

  const xAxis = g.append("g")
                 .attr("class","axis")
                 .attr("transform", `translate(0,${innerHeight})`)
                 .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("~s")));

  yAxis.selectAll("text").attr("class","axis-text");
  xAxis.selectAll("text").attr("class","axis-text");

  // --- Axis Titles ---
  g.append("text")
    .attr("class","axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 2.5*rem)
    .attr("text-anchor","middle")
    .text("Total Count (Sales Volume)");

  g.append("text")
    .attr("class","axis-title")
    .attr("x", -margin.left + rem)
    .attr("y", -0.5*rem)
    .attr("text-anchor","start")
    .text("Pokémons");

  // Tooltip
  const tooltip = d3.select("#tooltip");

  // Bars
  barRects = g.selectAll(".bar")
              .data(top10)
              .enter()
              .append("rect")
              .attr("class", "bar")
              .attr("y", d => y(`${d.name}---${d.serie}---${d.set}`))
              .attr("x", 0)
              .attr("height", y.bandwidth())
              .attr("width", d => x(d.count))
              .attr("fill", d => TYPE_COLORS[d.type] || "#888")
              .attr("data-name", d => d.name)
              .attr("data-serie", d => d.serie)
              .attr("data-set", d => d.set)
              .style("cursor", "pointer")
              .on("click", function(event,d){
                selectedCard =
                  selectedCard &&
                  selectedCard.name === d.name &&
                  selectedCard.serie === d.serie &&
                  selectedCard.set === d.set
                    ? null
                    : { name: d.name, serie: d.serie, set: d.set };
                updateSelectionAcrossPlots();
              });
}
