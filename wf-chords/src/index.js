const dscc = require('@google/dscc');
const local = require('./localMessage.js');
const d3 = require('d3');

// change this to 'true' for local development
// change this to 'false' before deploying
export const LOCAL = false;

// write viz code here
const drawViz = (inputData) => {
    let rows = inputData.tables.DEFAULT;
    let data = computeChords(rows);

    const width = dscc.getWidth();
    const height = dscc.getHeight();

    const outerRadius = Math.min(width, height) * 0.40;
    const innerRadius = outerRadius - 124;

    const percFormat = d3.format(".0%");
    var elementClicked = false;

    const chord = d3.chord()
        .padAngle(.04)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending)

    const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(innerRadius + 20);

    const ribbon = d3.ribbon()
        .radius(innerRadius);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select("body").append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .style("width", "100%")
      .style("height", "auto");

    const chords = chord(data.matrix);
    const relationMap = createRelationMap(data.matrix);

  const group = svg.append("g")
    .selectAll("g")
    .data(chords.groups)
    .join("g");

  group.append("path")
      .attr("fill", d => color(d.index))
      .attr("stroke", d => color(d.index))
      .attr("d", arc)
      .attr("cursor","pointer")
      .classed("arc", true)
      .on("mouseover", function(d){
        handleArcMouseOver(d);
      })
      .on("mouseout", function(d){handleArcRibbonMouseOut(d)})
      .on("click", handleArcClick);

  group.append("text")
      .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", d => `
        rotate(${(d.angle * 180 / Math.PI - 90)})
        translate(${innerRadius + 26})
        ${d.angle > Math.PI ? "rotate(180)" : ""}
      `)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
      .text(d => data.nameByIndex.get(d.index));

  svg.append("g")
      .attr("fill-opacity", 0.67)
    .selectAll("path")
    .data(chords)
    .join("path")
    .classed("ribbon", true)
      .attr("stroke", d => d3.rgb(color(d.source.index)).darker())
      .attr("fill", d => color(d.source.index))
      .attr("d", ribbon)
      .on("mouseover", function(d){
        handleRibbonMouseOver(d);
      })
      .on("mouseout", function(d){handleArcRibbonMouseOut(d);})




  function handleArcMouseOver(arc){

    if(elementClicked && !arc.clicked){
        return;
    }


    svg.selectAll('.ribbon')
       .filter(d => d.source.index !== arc.index && d.source.subindex !== arc.index)
       .attr("fill-opacity", .1)
       .attr("stroke",null)

    let groupToUnfocus = group.filter(d => !relationMap.get(arc.index).has(d.index))
    let groupToFocus = group.filter(d => relationMap.get(arc.index).has(d.index))

    groupToUnfocus.selectAll('.arc').attr("fill-opacity", .1)
       .attr("stroke",null);

    groupToUnfocus.selectAll('text').attr("opacity",.1);

    const total = data.matrix[arc.index].reduce((acc, val) => acc + val);

    groupToFocus.selectAll("text").text(d => d.angle > Math.PI ?
      `(${percFormat(data.matrix[arc.index][d.index]/total)}) ${data.nameByIndex.get(d.index)}` :
    `${data.nameByIndex.get(d.index)} (${percFormat(data.matrix[arc.index][d.index]/total)})` )

  }

  function handleArcRibbonMouseOut(){
    if (elementClicked) return;
    resetViz()
  }

  function resetViz(){
    svg.selectAll('.ribbon')
         .attr("fill-opacity", 0.67)
         .attr("stroke", d => d3.rgb(color(d.source.index)).darker());

    group.selectAll(".arc")
      .attr("fill-opacity", 1)
      .attr("stroke", d => color(d.index));

     group.selectAll("text")
          .text(d => data.nameByIndex.get(d.index))
          .attr("opacity",1);

  }


  function handleRibbonMouseOver(ribbon){
    if(elementClicked) return;
    svg.selectAll('.ribbon')
       .filter(d => d !== ribbon)
       .attr("fill-opacity", .1)
       .attr("stroke",null);


    let groupToUnfocus = group.filter(d => d.index !== ribbon.source.index && d.index !== ribbon.target.index);
    let groupToFocus = group.filter(d => d.index === ribbon.source.index || d.index === ribbon.target.index )

    groupToUnfocus.selectAll(".arc")
      .attr("fill-opacity", .1)
      .attr("stroke", null);

    groupToUnfocus.selectAll("text").attr("opacity",.1);

    const sourceOutTotal = data.matrix[ribbon.source.index].reduce((acc, val) => acc + val);
    const sourceInTotal = data.matrix.map(row => row[ribbon.source.index]).reduce((acc, val) => acc + val);
    const targetInTotal = data.matrix.map(row => row[ribbon.target.index]).reduce((acc, val) => acc + val);
    const targetOutTotal = data.matrix[ribbon.target.index].reduce((acc, val) => acc + val);

    const source2target = data.matrix[ribbon.source.index][ribbon.target.index];
    const target2source = data.matrix[ribbon.target.index][ribbon.source.index];

    const arcA = groupToFocus.filter(d => d.index == ribbon.source.index);
    const arcB = groupToFocus.filter(d => d.index == ribbon.target.index);

    const arcAText = arcA.select('text');
    const arcBText = arcB.select('text');

    arcAText.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.1em")
            .text(`In: ${target2source} (${percFormat(target2source/sourceInTotal)})`);

    arcAText.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.1em")
            .text(`Out: ${source2target} (${percFormat(source2target/sourceOutTotal)})`);

    arcBText.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.1em")
            .text(`In: ${source2target} (${percFormat(source2target/targetInTotal)})`);

    arcBText.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.1em")
            .text(`Out: ${target2source} (${percFormat(target2source/targetOutTotal)})`);
  }

  function handleArcClick(arc){
    console.log("click");
    group.selectAll('.arc').filter(d => d !== arc).each(d => d.clicked = false);

    elementClicked = !arc.clicked;
    arc.clicked = arc.clicked ? false : true;

    if(elementClicked){
      resetViz();
      handleArcMouseOver(arc);
    }else
    handleArcRibbonMouseOut();
  }

}

const createRelationMap = (edgeMatrix) => {
  var relationMap = new Map();
  edgeMatrix.forEach((row, i) => {
    let relatedIndices = new Set();
    relatedIndices.add(i);
    row.forEach((col, j) =>{
      if(edgeMatrix[i][j] !== 0 || edgeMatrix[j][i]!==0) relatedIndices.add(j);
    });

    relationMap.set(i, relatedIndices);
  });

  return relationMap
}



const computeChords = (data) => {

  const indexByName = new Map;
  const nameByIndex = new Map;
  var matrix = [];

  let n = 0;

  data.forEach(d => {
    if(!indexByName.has(d.outVert[0])){
      indexByName.set(d.outVert[0], n);
      nameByIndex.set(n++, d.outVert[0]);
    }
    if(!indexByName.has(d.inVert[0])){
      indexByName.set(d.inVert[0], n);
      nameByIndex.set(n++, d.inVert[0]);
    }
  });


  indexByName.forEach((name, index)  => {
    matrix[name] = Array.from({length: n}).fill(0);});

  data.forEach(d => {
    const source = indexByName.get(d.outVert[0]);
    let row = matrix[source];
    row[indexByName.get(d.inVert[0])] += +d.edgeSize[0];
  });

  return {
    matrix,
    indexByName,
    nameByIndex
  }

}
// renders locally
if (LOCAL) {
  drawViz(local.message);
} else {
  dscc.subscribeToData(drawViz, {transform: dscc.objectTransform});
}
