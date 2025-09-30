function createBarchart(data, selector) {
  d3.select(selector).selectAll("*").remove(); // clear old content

  d3.select(selector)
    .append("img")
    .attr("src", "./images/LineChart.jpg")
    .attr("alt", "Barchart placeholder")
    .style("width", "100%")
    .style("height", "100%")
    .style("object-fit", "contain");
}