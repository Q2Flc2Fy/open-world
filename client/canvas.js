CanvasRenderingContext2D.prototype.dashedLineTo = function (fromX, fromY, toX, toY, pattern) {
  // Code Source: http://davidowens.wordpress.com/2010/09/07/html-5-canvas-and-dashed-lines/
  // Our growth rate for our line can be one of the following:
  //   (+,+), (+,-), (-,+), (-,-)
  // Because of this, our algorithm needs to understand if the x-coord and
  // y-coord should be getting smaller or larger and properly cap the values
  // based on (x,y).
  var lt = function (a, b) { return a <= b; };
  var gt = function (a, b) { return a >= b; };
  var capmin = function (a, b) { return Math.min(a, b); };
  var capmax = function (a, b) { return Math.max(a, b); };

  var checkX = { thereYet: gt, cap: capmin };
  var checkY = { thereYet: gt, cap: capmin };

  if (fromY - toY > 0) {
    checkY.thereYet = lt;
    checkY.cap = capmax;
  }
  if (fromX - toX > 0) {
    checkX.thereYet = lt;
    checkX.cap = capmax;
  }

  this.moveTo(fromX, fromY);
  var offsetX = fromX;
  var offsetY = fromY;
  var idx = 0, dash = true;
  while (!(checkX.thereYet(offsetX, toX) && checkY.thereYet(offsetY, toY))) {
    var ang = Math.atan2(toY - fromY, toX - fromX);
    var len = pattern[idx];

    offsetX = checkX.cap(toX, offsetX + (Math.cos(ang) * len));
    offsetY = checkY.cap(toY, offsetY + (Math.sin(ang) * len));

    if (dash) this.lineTo(offsetX, offsetY);
    else this.moveTo(offsetX, offsetY);

    idx = (idx + 1) % pattern.length;
    dash = !dash;
  }
};

var MapRenderer = function() {
    
    var mapBuffer = document.createElement("canvas");
            mapBuffer.setAttribute("id","mapBuffer");
    var backgroundLayer = document.createElement("canvas");
            backgroundLayer.setAttribute("id","backgroundLayer");
    var spritesLayer = document.createElement("canvas");
            spritesLayer.setAttribute("id","spritesLayer");
    var buf = mapBuffer.getContext("2d");
    var backgroundLayerContext = backgroundLayer.getContext("2d");
    var spritesLayerContext = spritesLayer.getContext("2d");
    
    var panLat = 44.6488720;
    var panLon = -63.5792540;
    var scaleXY = 100000;
    var minlat, minlon, maxlat, maxlon;
    
    var CANVAS_WIDTH = 1324;
    var CANVAS_HEIGHT = 768;
    var CANVAS_BUF_WIDTH = 9*CANVAS_WIDTH;
    var CANVAS_BUF_HEIGHT = 9*CANVAS_HEIGHT;
    var MAX_SCALE = 100000;
    var LON_WIDTH = CANVAS_BUF_WIDTH / MAX_SCALE;
    var LAT_HEIGHT = CANVAS_BUF_HEIGHT / MAX_SCALE;
    var PADDING_LON = (CANVAS_BUF_WIDTH - CANVAS_WIDTH)/2 / MAX_SCALE;
    var PADDING_LAT = (CANVAS_BUF_HEIGHT - CANVAS_HEIGHT)/2 / MAX_SCALE;
    
    // Map data
    var nodes = {};
    var highways = {};
    var buildings = {};
    var otherWays = {};
    
    var mapRenderer = function(container, callback) {
        this.container = container;
        this.setupCanvas(backgroundLayer);
        this.setupCanvas(spritesLayer);
        this.setupBuffer(mapBuffer);
        var self = this;
        console.log("Padding",PADDING_LON,PADDING_LAT);
        var lo = panLon - PADDING_LON;
        var la = panLat - PADDING_LAT;
        console.log(LON_WIDTH, LAT_HEIGHT);
        $.ajax({ url: "/proxy?bbox="+(lo)+","+(la)+","+(lo+LON_WIDTH)+","+(la+LAT_HEIGHT) , method: "GET" })
                .done(function(data) {
            self.loadBuffer(buf, data);
            //self.drawMap(spritesLayerContext, panLat, panLon, 5000);
            callback.call();
        });
        
    };
    
    (function() {
        this.setScreenSize = function(width, height) {
            
            $("#mapBuffer").attr("width",width);
            $("#mapBuffer").attr("height",height);
            
            backgroundLayer.width = width;
            backgroundLayer.height = height;
            
            spritesLayer.width = width;
            spritesLayer.height = height;
            /*
            CANVAS_WIDTH = width;
            CANVAS_HEIGHT = height;
            CANVAS_BUF_WIDTH = 3 * CANVAS_HEIGHT;
            CANVAS_BUF_HEIGHT = 3 * CANVAS_WIDTH;
            MAX_SCALE = 100000;
            LAT_WIDTH = CANVAS_BUF_WIDTH / MAX_SCALE;
            LON_HEIGHT = CANVAS_BUF_HEIGHT / MAX_SCALE;
            PADDING_LAT = (CANVAS_BUF_WIDTH - CANVAS_WIDTH) / 2 / MAX_SCALE;
            PADDING_LON = (CANVAS_BUF_HEIGHT - CANVAS_HEIGHT) / 2 / MAX_SCALE;
            */
        };
        
        this.panTo = function(la, lo) {
            this.panLat = la;
            this.panLon = lo;
        };
        
        this.zoomTo = function(z) {
            this.scaleXY = z;
        };
        
        this.testDraw = function() {
            backgroundLayerContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.drawMap(backgroundLayerContext, this.panLat, this.panLon, this.scaleXY);
        };
        
        this.setupCanvas = function(canvasEl) {
            canvasEl.width = CANVAS_WIDTH;
            canvasEl.height = CANVAS_HEIGHT;
            canvasEl.style.left = 0;
            canvasEl.style.top = 0;
            $(canvasEl).css( { position:"absolute" } );
            this.container.append(canvasEl);
        };

        this.setupBuffer = function(canvasEl){
            canvasEl.width = CANVAS_BUF_WIDTH * 2;
            canvasEl.height = CANVAS_BUF_HEIGHT * 2;
        };
        
        this.loadBuffer = function(g, xmlDoc) {
            
            //  <bounds minlat="44.6488720" minlon="-63.5792540" maxlat="44.6496050" maxlon="-63.5725590"/>
            var bounds = $(xmlDoc).find("bounds");
            minlat = parseFloat(bounds.attr('minlat'));
            minlon = parseFloat(bounds.attr('minlon'));
            maxlat = parseFloat(bounds.attr('maxlat'));
            maxlon = parseFloat(bounds.attr('maxlon'));
            //console.log("Bounds:",minlon,minlat,maxlon,maxlat);
            
            for (var c=0, length=xmlDoc.documentElement.childNodes.length; c<length; c++)
            {
                var child = xmlDoc.documentElement.childNodes[c];
                var tag = child.tagName;
                var func = this['handle' + tag];
                typeof func === 'function' && func(child);
            }
            //console.log("Bounds:",minlon,minlat,maxlon,maxlat);
            panLat = (maxlat-minlat)/2;
            panLon = (maxlon-minlon)/2;
            
            g.save();
            // Iterate throught the otherWays
            for (var key in otherWays) {
                if (otherWays.hasOwnProperty(key)) {
                    var way = otherWays[key];
                    g.beginPath();
                    //g.lineWidth = 10;
                    var startPoint = true;
                    $(way).each(function() {
                        var currNode = nodes[this];
                        var lat = currNode.lat;
                        var lon = currNode.lon;
                        // Scale lat and lon
                        if (lon < minlon)
                            console.log("Out of Bounds:", lon, minlon);
                        if (lat < minlat)
                            console.log("Out of Bounds:", lat, minlat);
                        lon = (lon - minlon) * MAX_SCALE;
                        lat = (lat - minlat) * MAX_SCALE;
                        //console.log(lat,lon);
                        //g.fillRect(lon, lat, 2, 2);
                        if (startPoint)
                        {
                            startPoint = false;
                            g.moveTo(lon, lat);
                        }
                        else
                        {
                            g.lineTo(lon, lat);
                        }
                    });
                    g.fillStyle = "rgba(0,0,255,0.5)";
                    g.strokeStyle = "#000";
                    g.closePath();
                    g.fill();
                    g.stroke();
                }
            }     
            
            // Iterate throught the highways
            for (var key in highways) {
                if (highways.hasOwnProperty(key)) {
                    var way = highways[key];
                    
                    // Draw highway blacktop
                    g.beginPath();
                    g.lineWidth = 10;
                    g.strokeStyle = "rgba(0,0,0,0.9)";
                    var startPoint = true;
                    $(way).each(function() {
                        var currNode = nodes[this];
                        var lat = currNode.lat;
                        var lon = currNode.lon;
                        // Scale lat and lon
                        if (lon < minlon)
                            console.log("Out of Bounds:", lon, minlon);
                        if (lat < minlat)
                            console.log("Out of Bounds:", lat, minlat);
                        lon = ( lon - minlon ) * MAX_SCALE; 
                        lat = (lat - minlat) * MAX_SCALE;
                        //console.log(lat,lon);
                        //g.fillRect(lon, lat, 2, 2);
                        if (startPoint)
                        {
                            startPoint = false;
                            g.moveTo(lon, lat);
                        }
                        else
                        {
                            g.lineTo(lon, lat);
                        }
                    });
                    g.stroke();
                    
                    // Draw highway dotted while line
                    g.beginPath();
                    g.lineWidth = 1;
                    g.strokeStyle = "rgba(255,255,255,0.9)";
                    var startPoint = true;
                    var prevLon = 0;
                    var prevLat = 0;
                    $(way).each(function() {
                        var currNode = nodes[this];
                        var lat = currNode.lat;
                        var lon = currNode.lon;
                        // Scale lat and lon
                        lon = ( lon - minlon ) * MAX_SCALE; 
                        lat = ( lat - minlat ) * MAX_SCALE;
                        
                        //console.log(lat,lon);
                        //g.fillRect(lon, lat, 2, 2);
                        if (startPoint)
                        {
                            startPoint = false;
                            g.moveTo(lon, lat);
                            prevLon = lon;
                            prevLat = lat;
                        }
                        else
                        {
                            //g.lineTo(lon, lat);
                            g.dashedLineTo(prevLon,prevLat,lon,lat,[3,3]);
                            prevLon = lon;
                            prevLat = lat;
                        }
                    });
                    g.stroke();
                    
                    
                }
            }     
            
            // Iterate throught the buildings
            for (var key in buildings) {
                if (buildings.hasOwnProperty(key)) {
                    var way = buildings[key];
                    
                    g.beginPath();
                    //g.lineWidth = 10;
                    g.fillStyle = "rgba(255,0,0,0.7)";
                    
                    var startPoint = true;
                    $(way).each(function() {
                        var currNode = nodes[this];
                        var lat = currNode.lat;
                        var lon = currNode.lon;
                        // Scale lat and lon
                        if (lon < minlon)
                            console.log("Out of Bounds:", lon, minlon);
                        if (lat < minlat)
                            console.log("Out of Bounds:", lat, minlat);
                        lon = ( lon - minlon ) * MAX_SCALE; 
                        lat = (lat - minlat) * MAX_SCALE;
                        //console.log(lat,lon);
                        //g.fillRect(lon, lat, 2, 2);
                        if (startPoint)
                        {
                            startPoint = false;
                            g.moveTo(lon, lat);
                        }
                        else
                        {
                            g.lineTo(lon, lat);
                        }
                    });
                    //g.closePath();
                    //g.stroke();
                    g.fill();
                }
            } 
                        
            g.restore();
            console.log("Done drawing.");

        };
        
        this.drawMap = function(g, lat, lon, scale)
        {
            var s = scale / MAX_SCALE;
            //console.log("DrawMap:","Scale="+scale,"S:"+s);
            var bufLat = (lat - minlat) * MAX_SCALE;
            var bufLon = (lon - minlon) * MAX_SCALE;
            
            var bufferImage = buf.getImageData(bufLon, bufLat, CANVAS_WIDTH / s, CANVAS_HEIGHT / s);
            // setup
            //var buffer = document.createElement('canvas');
            //buffer.width = buf.width;
            //buffer.height = buf.height;

            g.save();
            // save
            //buffer.getContext('2d').drawImage(bufferImage, 0, 0);
            
            // Zoom Problem Solution: http://stackoverflow.com/a/3449416 
            var newCanvas = $("<canvas>")
                    .attr("width", bufferImage.width)
                    .attr("height", bufferImage.height)[0];
            newCanvas.getContext("2d").putImageData(bufferImage, 0, 0);
            g.scale(s, s);
            g.drawImage(newCanvas,0,0);
            
            delete bufferImage;
            
            g.restore();
            // restore
            //g.drawImage(buffer, 0, 0);
            
        };
        
        this.handlenode = function (node) {
            var id = node.attributes['id'].nodeValue;
            var lon = parseFloat(node.attributes['lon'].nodeValue);
            var lat = parseFloat(node.attributes['lat'].nodeValue);
            
            //console.log("Bounds:",minlon,minlat,maxlon,maxlat);
            
            minlat = Math.min(lat,minlat);
            minlon = Math.min(lon,minlon);
            maxlat = Math.max(lat,maxlat);
            maxlon = Math.max(lon,maxlon);
            
           //console.log("node:",id,lon,lat);
            nodes[id] = {'lon':lon,'lat':lat};
        };
        
        this.handleway = function(way) {
            var id = way.attributes['id'].nodeValue;


            if ($(way).find("tag[k='highway']").length)
            {
                // console.log("Is Highway");
                highways[id] = $(way).find("nd").map( function () { return $(this).attr('ref'); } );
            }
            else if ($(way).find("tag[k='building']").length)
            {
                //console.log("Is Building");
                buildings[id] = $(way).find("nd").map( function () { return $(this).attr('ref'); } );
            }
            else
            {
                //console.log("Is Other");
                //$(way).find("tag").each( function () { console.log(this); } );
                otherWays[id] = $(way).find("nd").map( function () { return $(this).attr('ref'); } );
            }

        };

    }).call(mapRenderer.prototype);

    return mapRenderer;
}();