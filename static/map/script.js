var mapData, canvas, ctx;
var dragStart, dragged;
var lastX, lastY;
var mousePos = {
	x : 0,
	y : 0
};
var zoomLevel = 0.5;
var fontSize = 12;
var initialstarRadius = 2
	var starRadius = initialstarRadius / zoomLevel;
var selectedstar = {};
var offscreen_canvas, offscreen_context;
var scratch_canvas, scratch_context;
var scaleFactor = 1.1;
var img1 = new Image();
img1.src = './sourcemap/composite_Honorverse_v1.0.png';

$(document).ready(function () {

	canvas = document.getElementById('map');
	ctx = canvas.getContext('2d');
	$('#map').attr('width', $('#map').width()); //max width
	$('#map').attr('height', $('#map').height()); //max height
	offscreen_canvas = document.createElement('canvas');
	offscreen_canvas.width = canvas.width;
	offscreen_canvas.height = canvas.height;
	offscreen_context = offscreen_canvas.getContext('2d');

	//scratch
	scratch_canvas = document.createElement('canvas');
	scratch_canvas.width = canvas.width;
	scratch_canvas.height = canvas.height;
	scratch_context = scratch_canvas.getContext('2d');
	// !scratch

	$(window).resize(responsiveCanvas);
	//responsiveCanvas();

	trackTransforms(ctx);
	trackTransforms(offscreen_context);

	//scratch
	trackTransforms(scratch_context);
	// !scratch

	//getMapData('./Inner Sphere map_files/mapdata.json');
	getMapData();

	initCanvas();
	showDetails(mapData[114 - 1]);
	$('#infoBtn').button();
	$('#infoBtn').on('click', function (event) {
		showMoreInfo(selectedstar);
	});
})

function initCanvas() {

	//Initial viewport
	offscreen_context.translate(canvas.width / 2, canvas.height / 2);
	offscreen_context.scale(zoomLevel, zoomLevel);

	//scratch
	scratch_context.translate(canvas.width / 2, canvas.height / 2);
	scratch_context.scale(zoomLevel, zoomLevel);
	// !scratch

	lastX = canvas.width / 2,
	lastY = canvas.height / 2;

	canvas.addEventListener('mousedown', function (evt) {
		document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
		lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
		lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
		dragStart = offscreen_context.transformedPoint(lastX, lastY);
		dragged = false;
	}, false);

	canvas.addEventListener('mousemove', function (evt) {
		if (mapData) {
			if (getMousePos(canvas, evt)) {
				redraw(mapData); // Only redraw(mapData) if needed (User is mousing over a star)
			};
			lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);

			lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
			//console.log("l"+lastX,lastY);
			dragged = true;
			if (dragStart) {
				var pt = offscreen_context.transformedPoint(lastX, lastY);
				offscreen_context.translate(pt.x - dragStart.x, pt.y - dragStart.y);

				//scratch
				var pt2 = scratch_context.transformedPoint(lastX, lastY);
				scratch_context.translate(pt2.x - dragStart.x, pt2.y - dragStart.y);
				// !scratch


				redraw(mapData);

			}
		}
	}, false);

	canvas.addEventListener('mouseup', function (evt) {
		dragStart = null;
		if (!dragged)
			zoom(evt.shiftKey ? -1 : 1);
	}, false);

	canvas.addEventListener('DOMMouseScroll', handleScroll, false);
	canvas.addEventListener('mousewheel', handleScroll, false);
	//moveToStar(mapData[557]);
	redraw(mapData);
}

function zoom(clicks) {
	var pt = offscreen_context.transformedPoint(lastX, lastY);
	offscreen_context.translate(pt.x, pt.y);
	var factor = Math.pow(scaleFactor, clicks);
	offscreen_context.scale(factor, factor);
	offscreen_context.translate(-pt.x, -pt.y);

	//scratch
	var pt2 = scratch_context.transformedPoint(lastX, lastY);
	scratch_context.translate(pt2.x, pt2.y);
	var factor2 = Math.pow(scaleFactor, clicks);
	scratch_context.scale(factor2, factor2);
	scratch_context.translate(-pt2.x, -pt2.y);
	// !scratch
	zoomLevel = offscreen_context.getTransform().a;
	//console.log(zoomLevel);

	if (zoomLevel > 1) {
		starRadius = initialstarRadius;
	} else {
		starRadius = initialstarRadius / zoomLevel;
	}
	redraw(mapData);
}

var handleScroll = function (evt) {
	var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
	if (delta) {
		if (zoomLevel > 0.1 || delta > 0) {
			zoom(delta);
		}
	}
	return evt.preventDefault() && false;
};

function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	mousePos = offscreen_context.transformedPoint(evt.clientX - rect.left, evt.clientY - rect.top);
	//console.log('mousePos',mousePos, rect.left, rect.offsetTop);
	return trackHoverstar(mousePos);
}

function redraw() {
	// Clear the entire canvas
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.restore();
	offscreen_context.save();
	offscreen_context.setTransform(1, 0, 0, 1, 0, 0);
	offscreen_context.clearRect(0, 0, offscreen_canvas.width, offscreen_canvas.height);

	offscreen_context.restore();

	//scratch
	scratch_context.save();
	scratch_context.setTransform(1, 0, 0, 1, 0, 0);
	scratch_context.clearRect(0, 0, scratch_canvas.width, scratch_canvas.height);
	scratch_context.restore();
	// !scratch

	if (mapData) {
		drawMap(offscreen_context);

		ctx.drawImage(offscreen_canvas, 0, 0);
		//requestAnimationFrame(redraw(mapData)); // Hooo, this uses some cycles! Let's develop some more before we optimize any more.
	}
}

function trackTransforms(ctx) {
	var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
	var xform = svg.createSVGMatrix();
	ctx.getTransform = function () {
		return xform;
	};

	var savedTransforms = [];
	var save = ctx.save;
	ctx.save = function () {
		savedTransforms.push(xform.translate(0, 0));
		return save.call(ctx);
	};

	var restore = ctx.restore;
	ctx.restore = function () {
		xform = savedTransforms.pop();
		return restore.call(ctx);
	};

	var scale = ctx.scale;
	ctx.scale = function (sx, sy) {
		xform = xform.scaleNonUniform(sx, sy);
		return scale.call(ctx, sx, sy);
	};

	var rotate = ctx.rotate;
	ctx.rotate = function (radians) {
		xform = xform.rotate(radians * 180 / Math.PI);
		return rotate.call(ctx, radians);
	};

	var translate = ctx.translate;
	ctx.translate = function (dx, dy) {
		xform = xform.translate(dx, dy);
		return translate.call(ctx, dx, dy);
	};

	var transform = ctx.transform;
	ctx.transform = function (a, b, c, d, e, f) {
		var m2 = svg.createSVGMatrix();
		m2.a = a;
		m2.b = b;
		m2.c = c;
		m2.d = d;
		m2.e = e;
		m2.f = f;
		xform = xform.multiply(m2);
		return transform.call(ctx, a, b, c, d, e, f);
	};

	var setTransform = ctx.setTransform;
	ctx.setTransform = function (a, b, c, d, e, f) {
		xform.a = a;
		xform.b = b;
		xform.c = c;
		xform.d = d;
		xform.e = e;
		xform.f = f;
		return setTransform.call(ctx, a, b, c, d, e, f);
	};

	var pt = svg.createSVGPoint();
	ctx.transformedPoint = function (x, y) {
		pt.x = x;
		pt.y = y;
		return pt.matrixTransform(xform.inverse());
	}
}

/*var getMapData = function(url) {
$('.loading-animation').show();
$.get( url, function( data ) {
$('.loading-animation').hide();
mapData = data;
$('#date').text('Generated: ' + data.generated);
$('#date').data('date', data.generated);
redraw(mapData);
});
}*/

var getMapData = function () {
	data = mapData;
	$('#date').text('Карта на 1899 PD');
	$('#date').data('date', data.generated);
	redraw(mapData);
}

function moveToStar(star) {

	var pt1 = offscreen_context.transformedPoint(canvas.width / 2, canvas.height / 2);
	var starx = -star.position.x;
	var stary = star.position.y;
	offscreen_context.translate(pt1.x + starx, pt1.y + stary);

	scratch_context.translate(pt1.x + starx, pt1.y + stary);

	redraw();

}

function responsiveCanvas() {
	$('#map').attr('width', $('#map').width()); //max width
	$('#map').attr('height', $('#map').height()); //max height
	redraw(mapData);
}

function drawLines(context) {

	// Let's create a radial gradient for our lines and circles
	//context.moveTo(0,0);
	var gradient = context.createRadialGradient(0,
			0,
			1000,
			0,
			0,
			4200);
	//gradient.addColorStop(0, '#00204d');
	gradient.addColorStop(0, '#004CB3');

	gradient.addColorStop(1, '#000000');
	context.strokeStyle = gradient;
	context.lineWidth = 1 / zoomLevel;

	var sectors = 36; // How many segments in our starmap
	var r = 3500; // How far our should we draw the lines?

	context.beginPath();
	for (var i = 1; i <= sectors; i++) {
		// Draw some pretty lines. Doing it this way is more efficient than drawing all the lines from the edge of the circle, even though this method doubles the number of lines we draw.

		var x = r * Math.cos(2 * Math.PI * i / sectors);
		var y = r * Math.sin(2 * Math.PI * i / sectors);
		context.moveTo(0, 0);
		context.lineTo(x, y);
	}

	for (var r = 200; r <= 3000; r += 200) {
		// Draw some pretty circles

		context.arc(0, 0, r, 0, 2 * Math.PI, false);
		context.strokeStyle = gradient;

	}
	context.stroke();

}

function drawInfluenceZone(scratch_context, x, y, rad, factionID) {

	// var gradient = scratch_context.createRadialGradient(x,
	// y,
	// rad - rad / 8,
	// x,
	// y,
	// rad);
	// gradient.addColorStop(0.1, factionData[factionID].color);
	// gradient.addColorStop(1, '#000000');
	scratch_context.moveTo(0, 0);
	scratch_context.beginPath();
	scratch_context.arc(x, y, rad, 0, 2 * Math.PI);

	//scratch_context.strokeStyle= factionData[factionID].color,1;
	scratch_context.strokeStyle = ColorLuminance(factionData[factionID].color, 0.5);
	scratch_context.lineWidth = 4 / zoomLevel;
	//scratch_contex.fillStyle = gradient;//HWA IN FF KILLS THIS
	scratch_context.fillStyle = factionData[factionID].color;

	scratch_context.fill();

	scratch_context.stroke();

}

function ColorLuminance(hex, lum) {

	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	lum = lum || 0;

	// convert to decimal and change luminosity
	var rgb = "#",
	c,
	i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i * 2, 2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += ("00" + c).substr(c.length);
	}

	return rgb;
}

function drawHyperJunctions(context) {

	$.each(hyperJuntionData, function () {
		junction = this.junction;
		termini = this.termini;
		for (term of termini) {
			//console.log(junction+" --> "+term.dest);

			//draw hyperbridges

			context.beginPath();
			context.moveTo(mapData[junction - 1].position.x, -mapData[junction - 1].position.y);
			context.lineTo(mapData[term.dest - 1].position.x, -mapData[term.dest - 1].position.y);
			context.strokeStyle = 'white';

			context.lineWidth = 1 / zoomLevel;
			context.fillStyle = 'white';
			context.save();
			if (zoomLevel > 0.3) {
				context.font = (fontSize + 5).toFixed(0) + 'px sans-serif';

				if (term.ly) {
					//TODO ROTATE
					context.strokeText(term.ly + " LY", parseInt((mapData[junction - 1].position.x + mapData[term.dest - 1].position.x) / 2) + 5, parseInt((-mapData[junction - 1].position.y + -mapData[term.dest - 1].position.y) / 2) + 1);
					context.fillText(term.ly + " LY", parseInt((mapData[junction - 1].position.x + mapData[term.dest - 1].position.x) / 2) + 5, parseInt((-mapData[junction - 1].position.y + -mapData[term.dest - 1].position.y) / 2) + 1);
				}
			}
			context.restore();
			context.stroke();
			context.closePath();

		}
	});
}

function drawInfluenceZones(context, scratch_context) {
	context.save();

	//TODO get the zones in json and loop
	drawInfluenceZone(scratch_context, 0, 0, 1675, 2); //SL-The Verge
	drawInfluenceZone(scratch_context, 0, 0, 1075, 1); //SL-The Outer Protectorates
	drawInfluenceZone(scratch_context, 0, 0, 975, 1); //SL-The Inner Protectorates
	drawInfluenceZone(scratch_context, 0, 0, 675, 1); //SL-The Shell
	drawInfluenceZone(scratch_context, 0, 0, 220, 1); //SL-Old League


	drawInfluenceZone(scratch_context, 1076, -2559, 600, 9); //Haven
	drawInfluenceZone(scratch_context, -1600, -340, 500, 7); //Talbott
	drawInfluenceZone(scratch_context, -54, -2745, 200, 20); //Silesia
	drawInfluenceZone(scratch_context, -559, -2293, 400, 14); //Andermani
	drawInfluenceZone(scratch_context, -1254, -2594, 250, 0); //Midgard
	drawInfluenceZone(scratch_context, -1630, -1816, 100, 0); //Matapan
	drawInfluenceZone(scratch_context, -1547, -1304, 100, 0); //Asgerd
	drawInfluenceZone(scratch_context, 2481, -290, 175, 0); //Phoenix Cluster

	context.save();
	context.globalAlpha = 0.5;
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.drawImage(scratch_canvas, 0, 0);
	context.restore();
	context.restore();

}

function drawStars(context) {
	var rect = canvas.getBoundingClientRect();
	var topleft = offscreen_context.transformedPoint(0 - rect.left, 0 - rect.top);
	var bottomright = ctx.transformedPoint(canvas.width, canvas.height);
	/*console.log('topleft.y',topleft.y);
	console.log('bottomright.y',bottomright.y);*/

	$.each(mapData, function () {

		if (
			(typeof this.position !== 'undefined') &&
			(typeof this.position.x !== 'undefined') &&
			(typeof this.position.y !== 'undefined') &&
			this.position.x > topleft.x &&
			//this.position.x < bottomright.x &&
			-this.position.y > topleft.y //&&
			//-this.position.y < bottomright.y
		) {
			context.beginPath();
			context.arc(this.position.x, -this.position.y, starRadius, 0, 2 * Math.PI, false);

			context.fillStyle = "Pink";
			if (this.name == "") {
				context.fillStyle = "LightGray";
			} else {
				context.fillStyle = getFactionColor(this);
			}
			context.fill();
			context.closePath();

			if (this.selected) {
				context.beginPath();
				context.arc(this.position.x, -this.position.y, starRadius + 4, 0, 2 * Math.PI, false);
				context.strokeStyle = 'cyan';
				context.lineWidth = 4;
				context.stroke();
				context.closePath();
			} else if (this.owner.capital == true) {
				context.beginPath();
				context.arc(this.position.x, -this.position.y, starRadius + 4, 0, 2 * Math.PI, false);
				context.strokeStyle = getFactionColor(this);
				context.lineWidth = 4;
				context.stroke();
				context.closePath();
			}
		} else if (this.name === 'Terra') {
			//console.log('not rendering Terra', this);
		}
	});
}

function drawNames(context) {
	var rect = canvas.getBoundingClientRect();
	var topleft = offscreen_context.transformedPoint(0 - rect.left, 0 - rect.top);
	var bottomright = ctx.transformedPoint(canvas.width, canvas.height);
	context.font = (fontSize).toFixed(0) + 'px sans-serif';
	context.fillStyle = 'white';
	context.strokeStyle = 'black';
	context.lineWidth = 0.2;
	$.each(mapData, function () {
		context.fillStyle = 'white';
		//context.fillStyle = 'orange';

		if (zoomLevel > 0.45 &&
			(typeof this.position !== 'undefined') &&
			(typeof this.position.x !== 'undefined') &&
			(typeof this.position.y !== 'undefined') &&
			this.position.x > parseInt(topleft.x) - 15 &&
			//this.position.x < bottomright.x &&
			-this.position.y > topleft.y //&&
			//-this.position.y < bottomright.y
		) {
			context.font = (fontSize).toFixed(0) + 'px sans-serif';
			if (this.selected) {
				context.font = (fontSize * 2).toFixed(0) + 'px sans-serif';
			}
			var starText = this.name;
			if (starText === '') {
				//starText = this.id;
				context.font = (fontSize / 2).toFixed(0) + 'px sans-serif';
				context.font = (fontSize * 2).toFixed(0) + 'px sans-serif';
				context.fillStyle = 'grey';
			} else {
				//console.log(this.name+" sel:"+this.selected+"font:"+context.font);
			}

			//hack to make some star names readable
			var ox = 3;
			var oy = 0.5;
			if (this.id == 824) {
				ox = -10;
				oy = -4;
			} else if (this.id == 846) {
				ox = -10;
				oy = 14;
			} else if (this.id == 622) {
				ox = -10;
				oy = 14;
			}
			context.save();
			context.strokeText(starText, parseInt(this.position.x) + ox, parseInt(-this.position.y) + oy);
			context.fillText(starText, parseInt(this.position.x) + ox, parseInt(-this.position.y) + oy);
			context.restore();
			if (this.selected) {
				context.font = (fontSize).toFixed(0) + 'px sans-serif';

			}

		}

	});
}

function drawMap(context) {
	//offscreen_context.drawImage(img1, -2527-42, -3121-30);
	drawLines(context);
	drawInfluenceZones(context, scratch_context);
	drawHyperJunctions(context);
	drawStars(context);
	drawNames(context);

}

function getFactionColor(star) {
	var factionID = star.owner.id;
	if (typeof factionData[factionID] !== 'undefined') {
		return factionData[factionID].color;
	} else
		return factionData[0].color;
}

function getFactionLogo(star) {
	var factionID = star.owner.id;
	if (typeof factionData[factionID] !== 'undefined' &&
		factionData[factionID].logo !== '') {
		return factionData[factionID].logo;
	} else
		return factionData[0].logo;
}

function getFactionName(star) {
	var factionID = star.owner.id;
	if (typeof factionData[factionID] !== 'undefined') {
		return factionData[factionID].name;
	} else
		return "Unknown";
}

function trackHoverstar(mousePos) {
	var hoveringOverAstar = false;
	$.each(mapData, function () {
		if ((typeof this.position !== 'undefined') &&
			(typeof this.position.x !== 'undefined') &&
			(typeof this.position.y !== 'undefined')) {
			if (pointInCircle(mousePos, this)) {
				//TODO: Replace with get closest star that also is in circle so we avoid double hits.
				this.selected = true;
				//console.log(this.name + ' (' + this.position.x + ',' + this.position.y + ')');
				hoveringOverAstar = true;
				if (selectedstar.name) {
					if (selectedstar.name !== this.name) {
						selectedstar = this;
						showDetails(selectedstar);
					}
				} else {
					selectedstar = this;
					showDetails(selectedstar);
				}
				return;
			} else {
				this.selected = false;
			}
		}
	});
	return hoveringOverAstar;
}

function pointInCircle(point, shape) {
	//Is some point within some radius?
	var distX = Math.abs(point.x - shape.position.x),
	distY = Math.abs(point.y - -shape.position.y), // Coordinates are y-inverted on a canvas, so we multiply all values in the y-axis with -1
	dist = Math.sqrt(distX * distX + distY * distY);
	return dist < starRadius * 2;
}

function showDetails(star) {
	// TODO: Replace with Angular or something like it. This is really rudimentary stuff, just to get something on screen...
	var owner = getFactionName(star);
	var logo = getFactionLogo(star)
		$('#starname').text(star.name);
	if (star.name === '') {
		$('#starname').text(star.id);
	}
	$('#starowner').text(owner);
	$('#starid').text(star.id);
	// if(star.unit.name !== '') {
	// owner = 'Unit: ' + star.unit.name;
	// } else owner = '';
	// $('#starownerunit').text(owner);
	$('#starownerimage').attr('src', logo);
	// $('#starinvader').text(star.invading.name);
	// if(star.invading.icon) {
	// $('#starinvaderimage').attr('src',star.invading.icon);
	// $('#starinvaderimage').show();
	// } else {
	// $('#starinvaderimage').hide();
	// }
}

function showMoreInfo(star) {
	if (star.name != "") {
		var wurl= "http://honorverse.wikia.com/wiki/"+star.name+"_System"
		alert(wurl);
		

		$('#infoStar').text(star.name);
		$('#infoModal').modal('show');
	}

}

function listFactions() {
	console.log("Factions:");
	$.each(factionData, function () {
		console.log("ID:" + this.id + "	Name:" + this.name);
	});
}
