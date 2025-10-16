function createViolinPlot(data, selector) {
  d3.select(selector).selectAll("*").remove(); // clear old content

  d3.select(selector)
    .append("img")
    .attr("src", "./images/ViolinPlot.jpg")
    .attr("alt", "Violin Plot placeholder")
    .style("width", "100%")
    .style("height", "100%")
    .style("object-fit", "contain");
}