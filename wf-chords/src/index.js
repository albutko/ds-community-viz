const dscc = require('@google/dscc');
const local = require('./localMessage.js');
const d3 = require('d3');

// change this to 'true' for local development
// change this to 'false' before deploying
export const LOCAL = false;

// write viz code here
const drawViz = (inputData) => {

    let style = parseStyleValues(inputData.style);

    let rows = inputData.tables.DEFAULT;
    let data = computeChords(rows);

    const width = dscc.getWidth();
    const height = dscc.getHeight();

    const outerRadius = Math.min(width, height) * style.outerRadiusPerc/100;
    const innerRadius = outerRadius - style.radialDiff;

    const percFormat = d3.format(".0%");
    var elementClicked = false;

    const chord = d3.chord()
        .padAngle(style.arcPadding/100)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending)

    const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
        .radius(innerRadius);

    const color = d3.scaleOrdinal(d3.schemeCategory10);


    // Remove old visualization
    d3.select("body").select('svg').remove();

    const svg = d3.select("body").append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("font-size", style.fontSize)
      .attr("font-family", style.fontFamily)
      .style("width", "100%")
      .style("height", "auto");

    const chords = chord(data.matrix);
    const relationMap = createRelationMap(data.matrix);

  svg.append("g")
      .attr("fill-opacity", style.ribbonFocusedOpacity)
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

  const group = svg.append("g")
    .selectAll("g")
    .data(chords.groups)
    .join("g");

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

  group.append("path")
      .attr("fill", d => color(d.index))
      .attr("stroke", d => color(d.index))
      .attr("d", arc)
      .attr("cursor","pointer")
      .attr("fill-opacity", style.arcFocusedOpacity)
      .classed("arc", true)
      .on("mouseover", function(d){
        handleArcMouseOver(d);
      })
      .on("mouseout", function(d){handleArcRibbonMouseOut(d)})
      .on("click", handleArcClick);



  function handleArcMouseOver(arc){

    if(elementClicked && !arc.clicked){
        return;
    }

    svg.selectAll('.ribbon')
       .filter(d => d.source.index !== arc.index && d.source.subindex !== arc.index)
       .attr("fill-opacity", style.ribbonUnfocusedOpacity)
       .attr("stroke",null)

    let groupToUnfocus = group.filter(d => !relationMap.get(arc.index).has(d.index))
    let groupToFocus = group.filter(d => relationMap.get(arc.index).has(d.index))

    groupToUnfocus.selectAll('.arc').attr("fill-opacity", style.arcUnfocusedOpacity)
       .attr("stroke",null);

    groupToUnfocus.selectAll('text').attr("opacity",.1);

    const sourceOutTotal = data.matrix[arc.index].reduce((acc, val) => acc + val);
    const sourceInTotal = data.matrix.map(row => row[arc.index]).reduce((acc, val) => acc + val);

    const groupToFocusText = groupToFocus.selectAll("text")

    groupToFocusText.selectAll("tspan").remove();

    // Text for other arcs
    groupToFocusText.filter(d => d !== arc)
              .append("tspan")
              .attr("text-align", d => d.angle > Math.PI ? "right" : "left")
              .attr("x", d => d.angle > Math.PI ? 0 : 1)
              .attr("dy" , "1.25em")
              .text(d => `In: ${data.matrix[arc.index][d.index]} (${percFormat(data.matrix[arc.index][d.index]/sourceInTotal)})`)

    groupToFocusText
            .filter(d => d !== arc)
            .append("tspan")
            .attr("text-align", d => d.angle > Math.PI ? "right" : "left")
            .attr("x", d => d.angle > Math.PI ? 0 : 1)
            .attr("dy" , "1.1em")
            .text(d => `Out: ${data.matrix[d.index][arc.index]} (${percFormat(data.matrix[d.index][arc.index]/sourceOutTotal)})`)

    // Text for Selected Arc
    groupToFocusText.filter(d => d === arc)
              .append("tspan")
              .attr("text-align", d => d.angle > Math.PI ? "right" : "left")
              .attr("x", d => d.angle > Math.PI ? 0 : 1)
              .attr("dy" , "1.25em")
              .text(d => `Total In: ${sourceInTotal}`)

    groupToFocusText
            .filter(d => d === arc)
            .append("tspan")
            .attr("text-align", d => d.angle > Math.PI ? "right" : "left")
            .attr("x", d => d.angle > Math.PI ? 0 : 1)
            .attr("dy" , "1.1em")
            .text(d => `Total Out: ${sourceOutTotal}`)


    svg.selectAll(".arc").filter(d => d === arc)
        .attr("stroke-width", 5)
        .attr("stroke","black")
  }

  function handleArcRibbonMouseOut(){
    if (elementClicked) return;
    resetViz()
  }

  function resetViz(){
    svg.selectAll('.ribbon')
         .attr("fill-opacity", style.ribbonFocusedOpacity)
         .attr("stroke", d => d3.rgb(color(d.source.index)).darker());

    group.selectAll(".arc")
      .attr("fill-opacity", style.arcFocusedOpacity)
      .attr("stroke", d => color(d.index))
      .attr("stroke-width", 1);

   group.selectAll("text")
        .text(d => data.nameByIndex.get(d.index))
        .attr("opacity",1);
    d3.selectAll("text").selectAll("tspan").remove();
  }


  function handleRibbonMouseOver(ribbon){
    if(elementClicked) return;
    svg.selectAll('.ribbon')
       .filter(d => d !== ribbon)
       .attr("fill-opacity", style.ribbonUnfocusedOpacity)
       .attr("stroke",null);


    let groupToUnfocus = group.filter(d => d.index !== ribbon.source.index && d.index !== ribbon.target.index);
    let groupToFocus = group.filter(d => d.index === ribbon.source.index || d.index === ribbon.target.index )

    groupToUnfocus.selectAll(".arc")
      .attr("fill-opacity", style.arcUnfocusedOpacity)
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
    group.selectAll('.arc').filter(d => d !== arc).each(d => d.clicked = false);

    elementClicked = !arc.clicked;
    arc.clicked = arc.clicked ? false : true;

    if(elementClicked){
      resetViz();
      group.selectAll(".arc").filter(d => d === arc)
            .attr("stroke-width", 5)
            .attr("stroke","black")
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

const parseStyleValues = (style) => {
  var parsedStyle = {};
  for(var prop in style){
    if (Object.prototype.hasOwnProperty.call(style, prop)){
      parsedStyle[prop] = style[prop].value !== null ? style[prop].value : style[prop].defaultValue;
    }
  }
  return parsedStyle;
}


// renders locally
if (LOCAL) {
  drawViz(local.message);
} else {
  dscc.subscribeToData(drawViz, {transform: dscc.objectTransform});
}
