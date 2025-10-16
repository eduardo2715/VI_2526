// Scatterplot of Sales Volume vs Revenue
// Each point is a card, colored by type
// Hover to see details, click to select/deselect
// Shared selection with other plots

let scatterX, scatterY, scatterSvg, scatterG, scatterTooltip;
let scatterInnerWidth, scatterInnerHeight, circleRadius;

// Init once
function initScatterplot(selector) {
  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const height = container.clientHeight;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

  const margin = { top: 4*rem, right: 1.25*rem, bottom: 3.75*rem, left: 5*rem };
  scatterInnerWidth = width - margin.left - margin.right;
  scatterInnerHeight = height - margin.top - margin.bottom;
  circleRadius = 0.25*rem;

  scatterSvg = d3.select(selector).append("svg")
    .attr("width","100%").attr("height","100%")
    .attr("viewBox",`0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","xMidYMid meet");

  scatterG = scatterSvg.append("g")
    .attr("transform",`translate(${margin.left},${margin.top})`);

  scatterSvg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor","middle")
    .attr("class","chart-title")
    .text("Sales Volume vs Revenue");

  scatterG.append("g").attr("class","x-axis")
    .attr("transform",`translate(0,${scatterInnerHeight})`);
  scatterG.append("g").attr("class","y-axis");

  scatterG.append("text")
    .attr("x",scatterInnerWidth/2)
    .attr("y",scatterInnerHeight+2.5*rem)
    .attr("text-anchor","middle")
    .attr("class","axis-title")
    .text("Total Count (Sales Volume)");

  scatterG.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-scatterInnerHeight/2)
    .attr("y",-margin.left+0.625*rem)
    .attr("text-anchor","middle")
    .attr("dominant-baseline","middle")
    .attr("class","axis-title")
    .text("Total Revenue ($)");

  scatterTooltip = d3.select("body").select("#tooltip");
  if(scatterTooltip.empty()){
    scatterTooltip = d3.select("body").append("div").attr("id","tooltip");
  }
}

function updateScatterplot(aggregated, selector){
  scatterX = d3.scaleLinear()
    .domain([0,d3.max(aggregated,d=>d.count)||1])
    .nice()
    .range([0,scatterInnerWidth]);

  scatterY = d3.scaleLinear()
    .domain([0,d3.max(aggregated,d=>d.revenue)||1])
    .nice()
    .range([scatterInnerHeight,0]);

  const formatRevenue = d3.format("$.2s");

  scatterG.select(".x-axis")
    .transition().duration(500)
    .call(d3.axisBottom(scatterX).ticks(Math.min(scatterInnerWidth/50,10)));

  scatterG.select(".y-axis")
    .transition().duration(500)
    .call(d3.axisLeft(scatterY).tickFormat(d=>formatRevenue(d)).ticks(Math.min(scatterInnerHeight/50,10)));

  const circles = scatterG.selectAll("circle")
    .data(aggregated, d=>d.name+d.serie+d.set);

  circles.exit().transition().duration(500).attr("r",0).style("opacity",0).remove();

  circles.transition().duration(500)
    .attr("cx",d=>scatterX(d.count))
    .attr("cy",d=>scatterY(d.revenue))
    .attr("fill",d=>TYPE_COLORS[d.type]||"#888");

  circles.enter().append("circle")
    .attr("cx",d=>scatterX(d.count))
    .attr("cy",d=>scatterY(d.revenue))
    .attr("r",0)
    .style("opacity",0)
    .attr("fill",d=>TYPE_COLORS[d.type]||"#888")
    .style("cursor","pointer")
    .on("mouseover", function(event,d){
      const types = d.type ? d.type.split(",").map(t=>t.trim()):[];
      const iconsHTML = types.map(t=>TYPE_ICONS[t]?`<img src="${TYPE_ICONS[t]}" alt="${t}" class="type-icon">`:"").join("");
      scatterTooltip.style("opacity",1)
        .style("border-color", TYPE_COLORS[types[0]]||"#3b4cca")
        .html(`
          <div class="tooltip-header" style="color:${TYPE_COLORS[types[0]]||"#2c3e50"}">
            ${d.name} ${iconsHTML}
          </div>
          <em>Year:</em> ${d.releaseYear}<br>
          <em>Serie:</em> ${d.serie}<br>
          <em>Set:</em> ${d.set}<br>
          <em>Type:</em> ${d.type}<br>
          <em>Count:</em> ${d.count}<br>
          <em>Revenue:</em> ${formatRevenue(d.revenue)}<br>
          <em>Popularity Rank:</em> ${d.rank}
        `);
    })
    .on("mousemove",function(event){
      scatterTooltip.style("left",(event.pageX+15)+"px").style("top",(event.pageY-28)+"px");
    })
    .on("mouseout",function(){
      scatterTooltip.style("opacity",0);
    })
    .on("click", function(event, d) {
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
    })
    .transition().duration(500)
    .attr("r",circleRadius)
    .style("opacity",1);
}
