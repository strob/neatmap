var jsonPathGreen = "green.topo.json";
var jsonPathBuildings = "buildings.topo.json";
//var jsonPath = "leisure-park.topo.json";

// Settings
var transitionDuration = 1000; // ms
var gridGapX = 4;
var gridGapY = 4;
var startY = 50;

var m_width = $("#map").width(),
    width = 938,
    height = 500,
    country,
    state;

var projection = d3.geo
    .mercator()
    .scale(550000)
    .center([8.404393,49.013669])
    .translate([width/2, height/2.5]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#map").append("svg")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("width", m_width)
    .attr("height", m_width * height / width);

var g = svg.append("g");

function parse_path(pathstr) {
  //eg. pathstr is: d="M446.0252875413753,312.49818797687476L445.8401871266942,312.63011114730034L444.8529849150691,313.2017767016805L445.038085329752,313.5095955941215L444.4210839474854,313.94933562872757Z"
  //returns Array with objects [{CMD, X, Y}]
  var cmdregex = /([MLZ])([\d.]+),([\d.]+)/g; ///[MLZ]/g;
  var vals = pathstr.split(cmdregex);
  var val;
  var pathArray = [];
  for (var i=0; i<vals.length; i++) {
    val = vals[i];
    if (val === "M" || val === "L") {
      pathArray.push({
        CMD: val,
        X: parseFloat(vals[i+1]),
        Y: parseFloat(vals[i+2])
      });
    }
    else if (val === "Z") {
      pathArray.push({
        CMD: "Z"
      });
    }
  }
  return pathArray;
}

function find_topleft(path) {
  // takes results of parse_path, and returns topleft coordinates
  // of the path's bounding rectangle as a list, [X, Y]
  var minX = path[0].X;
  var minY = path[0].Y;
  for (var i=1; i < path.length; i++) {
    if (path[i].X != null) {
        minX = Math.min(path[i].X, minX);
        minY = Math.min(path[i].Y, minY);
    }
  }
  return [minX, minY];
}

function find_bottomright(path) {
  // takes results of parse_path, and returns bottomright coordinates
  // of the path's bounding rectangle as a list, [X, Y]
  var maxX = path[0].X;
  var maxY = path[0].Y;
  for (var i=1; i < path.length; i++) {
    if (path[i].X != null) {
        maxX = Math.max(path[i].X, maxX);
        maxY = Math.max(path[i].Y, maxY);
    }
  }
  return [maxX, maxY];
}

function generate_translatecode(topleft, newPos){
  // return the SVG string to specify a translation to topleft coords
  var vector = [newPos[0] - topleft[0], newPos[1] - topleft[1]];
  return "translate("+vector[0]+","+vector[1]+")";  
}

var MIN_AREA = 8;

function getArea(feature) {
    var parsed_path = parse_path(path(feature));
    var topleft = find_topleft(parsed_path);
    var bottomright = find_bottomright(parsed_path);
    var area = (bottomright[0]-topleft[0]) * (bottomright[1]-topleft[1]);
    return area;
}

function sortByArea(x,y) {
    // Large-to-small
    return getArea(x) > getArea(y) ? -1 : 1;
}

function drawOneKindOfElement(jsonPath, className) {
  d3.json(jsonPath, function(error, us) {
      var geometries = topojson.feature(us, us.objects.geojson);

      // Prune tiny buildings
      var features = geometries.features.filter(function(X) { return getArea(X) > MIN_AREA; });

      // Sort by area
      features.sort(sortByArea);

      g.selectAll("path")
        .data(features)
      .enter()
      .append("path")
      .attr("id", function(d) { return d.id; })
      .attr("class", className)
      .attr("d", path)
  });
}

/* Order items in grid */
arrangeItems = function(event) {
  var pathStr, pathArray, topLeft, translateCode, newX=0, newY=startY, maxYInThisLine=gridGapY;
  var items = g.selectAll('path');
  items.each(function(item,index) {
    path = d3.select(this);
    if ((newX + this.getBBox().width) >= width) {
      newY += maxYInThisLine + gridGapY;
      newX = 0;
      maxYInThisLine=0
    }
    pathStr = path.attr('d');
    pathArray = parse_path(pathStr);
    topLeft = find_topleft(pathArray);
    translateCode = generate_translatecode(topLeft, [newX,newY]);
    path
      .transition()
      .duration(transitionDuration)
      .attr('transform', translateCode);
    newX += this.getBBox().width + gridGapX;
    maxYInThisLine = Math.max(this.getBBox().height, maxYInThisLine);
  });
};

/* Move items back to their original position */
itemsBackToOrigin = function(event) {
  var items = g.selectAll('path');
  items.each(function(item,index) {
    path = d3.select(this);
    path
      .transition()
      .duration(transitionDuration)
      .attr('transform', 'translate(0,0)');
  });
};

/* Draw the map */
drawOneKindOfElement(jsonPathBuildings, "buildings");

/* Bind user events */
$('a#order').on('click', arrangeItems);
$('a#disorder').on('click', itemsBackToOrigin);