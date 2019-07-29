const dscc = require('@google/dscc');
const d3 = require('d3');
const viz = require('@google/dscc-scripts/viz/initialViz.js');
const local = require('./localMessage.js');

// change this to 'true' for local development
// change this to 'false' before deploying
export const LOCAL = false;

// write viz code here
const drawViz = (data) => {

  const height = (dscc.getHeight()-4);
  const width = (dscc.getWidth()- 4);

  d3.select("body").selectAll('svg').remove();

  const svg = d3.select('body').append("svg")
       .attr("viewBox", [-width / 2 , -height / 2, width, height]);

   let val = +data.tables.DEFAULT[0].metric;
   const min = +data.style.arcMin.value ? +data.style.arcMin.value : +data.style.arcMin.defaultValue
   const max = +data.style.arcMax.value ? +data.style.arcMax.value : +data.style.arcMax.defaultValue;
   const secondLevel = +data.style.secondLevelThresh.value ? +data.style.secondLevelThresh.value : +data.style.secondLevelThresh.defaultValue;
   const thirdLevel = +data.style.thirdLevelThresh.value ? +data.style.thirdLevelThresh.value : +data.style.thirdLevelThresh.defaultValue;
   const fullArcDegrees = +data.style.arcLength.value ? +data.style.arcLength.value : +data.style.arcLength.defaultValue;
   const firstLevelFill = data.style.firstLevelFill.value.color ? data.style.firstLevelFill.value.color : data.style.firstLevelFill.defaultValue;
   const secondLevelFill = data.style.secondLevelFill.value.color ? data.style.secondLevelFill.value.color : data.style.secondLevelFill.defaultValue;
   const thirdLevelFill = data.style.thirdLevelFill.value.color ? data.style.thirdLevelFill.value.color : data.style.thirdLevelFill.defaultValue;
   const needleFill = data.style.needleFill.value.color ? data.style.needleFill.value.color : data.style.needleFill.defaultValue;

   var outerRad = (Math.min(width, height) - 20)/2
   var innerRad = outerRad*3/4;
   const smallCircleRad = innerRad*1/10;
   const rectWidthRatio = 1


   var arcRands = fullArcDegrees*Math.PI/(2*180)
   let arcScale = d3.scaleLinear().domain([min, max]).range([-arcRands, arcRands]);

   let arcData = [
     {"class": "lower", "startAngle": min, "endAngle": secondLevel, "color": firstLevelFill},
     {"class": "middle", "startAngle": secondLevel, "endAngle": thirdLevel, "color": secondLevelFill},
     {"class": "upper", "startAngle": thirdLevel, "endAngle": max, "color": thirdLevelFill}
   ]

   var arc = d3.arc()
       .innerRadius(innerRad)
       .outerRadius(outerRad)
       .startAngle(function(d){return arcScale(d.startAngle);})
       .endAngle(function(d){return arcScale(d.endAngle);})
       .cornerRadius(2);

   // var valRads = arcScale(Math.max(Math.min(val,max),min));
   var valRads = arcScale(val);
   svg.append("g").selectAll("path")
     .data(arcData)
     .enter()
     .append("path")
     .attr("d", arc).attr("fill", function(d){return d.color;}).attr("stroke", "white");


   svg.append("circle")
   .attr("r", smallCircleRad).attr("fill", needleFill).attr("cx", 0).attr("cy", 0);


   svg
     .append("rect")
     .attr("width", smallCircleRad*rectWidthRatio)
     .attr("height", (innerRad - 10))
     .attr("fill",needleFill)
     .attr("transform", "translate(" + -(smallCircleRad*rectWidthRatio)/2 + " 0)" +
           "rotate(" + (180 +  180*valRads/Math.PI) + " " +  (smallCircleRad*rectWidthRatio)/2 + " 0)" );
}


// renders locally
if (LOCAL) {
  drawViz(local.message);
} else {
  dscc.subscribeToData(drawViz, {transform: dscc.objectTransform});
}
