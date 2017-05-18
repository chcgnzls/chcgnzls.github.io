var nm = numeric;

var plotMargin = {top: 20, right: 20, bottom: 30, left: 80};
var mapMargin = {top: 5, right: 10, bottom: 5, left: 10};

var mapThis = []; 
var thisVal, xMap, yMap;
var projScale = 1.05;
var width = 960 * projScale, 
		height = 520 * projScale,
		centered;
var colorRange = ["#222130","#add8e6"];
var path = d3.geoPath().projection(scale(projScale));

var svg = d3.select("#mapContainer").append("svg").attr("width", width)
	.attr("height", height); 

svg.append("rect").attr("class", "background").attr("width", width)
	.attr("height", height).on("click", clicked);

var g = svg.append("g");

var tooltip = d3.select("body").append("div").attr("class", "tooltip")
	.style("opacity", 0);

var selectors = document.getElementsByTagName("select");

var keys;
var mobKeys;
var yourData;
var mobData = [];
var rhsVars = [];
var results;

//  Number format functions
var fd = d3.format(".2f");
var fc = d3.format(",");
var fdp = d3.format(".3p");

function showHide(id, hide) {
	var x = document.getElementById(id);
	if(hide === "hide"){
		x.className = "closed";
	} else if(hide === "show"){
		x.className = "";
	} else {
		if (x.className === "") {
			x.className = "closed";
		} else {
			x.className = "";
		}
	};
};

//  Function to scale map on click
function scale (k) {
	return d3.geoTransform({
		point: function(x,y){
			this.stream.point(x*k, y*k);
		}
	});
};

//  Mouse event functions for map
	function mouseover() {
		tooltip.transition().duration(250).style("opacity", 1);
		d3.select(this).style("opacity", .6).style("stroke-opacity", 1);
	};
	
	function mousemove(d) {	
		if (d.properties.outcomes[thisVal] !== "NA" && !isNaN(d.properties.outcomes[thisVal])) {
			var outcome = fd(+d.properties.outcomes[thisVal]);
		} else {
			var outcome = "No data";
		}
		var el = document.getElementsByClassName("ttOpt");
		el = Array.prototype.filter.call(el, function(d){return d.checked;});
		var summVar = el.map(function(d){return [d.name, d.value];});
		var table = summVar.map(function(e){
			var r = +d.properties.outcomes[e[1]];
			if(!isNaN(r)){
				if(r > 1){
					r = fc(r);
				} else {
					r = fdp(r);
				}
			} else {
				r = "No data";
			}
			return '<tr><td>' + e[0] + ': </td><td class="data">' + r + '</td></tr>';}).join("");
		tooltip.html("<h1>" + d.properties.outcomes.county_name + ", "
			+ d.properties.outcomes.stateabbrv + "</h1><table><tr><td>" 
			+ thisVal + ": </td>" + '<td class="data">' 
			+ outcome + "</td></tr>" 
			+ table + "</table>")
		.style("left", (d3.event.pageX + 20) + "px")
		.style("top", (d3.event.pageY + 5) + "px");
	};
	
	function mouseout() {
		tooltip.transition().duration(400).style("opacity", 0);
		d3.select(this).transition().duration(100).style("opacity", 1).style("stroke-opacity", 0);
	}

function clicked(d) {
	var x, y, k;
	var dmain = [26.6551287850771, 23.1854857038872, 21.5521369057763, 21.3090409386006, 21.1096755218102, 20.8929580815745, 20.6098067440972, 15.4539201100024]
	var s = d3.scaleQuantile().domain(dmain).range([5, 4.5, 4, 3.5, 3, 2.5, 2]);
	if (d && centered !== d) {
		var centroid = path.centroid(d);
		x = centroid[0];
		y = centroid[1];
		k = s(Math.log(d.properties.area));
		centered = d;
	} else {
		x = width / 2;
		y = height / 2;		
		k = 1;
		centered = null;
	};

	g.selectAll("path").classed("active", centered && function(d) {
		return d === centered; });
	g.transition().duration(750).attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y +")");
}

//  Functions and listeners to load display data and previews
function loadElements(yourData) {
	var keys = d3.keys(yourData[0]);
	var _yourData = yourData.slice(0,8);
	document.getElementById("previewShadow").style.opacity = 1;	
	document.getElementsByClassName("mergeShadow")[0].style.opacity = 1;
	document.getElementsByClassName("mergeShadow")[1].style.opacity = 1;

	d3.select("#uploadPreview").html("").append("table").attr("id", "previewTable").style("table-layout","fixed").append("tr").attr("class", "fixed")
		.selectAll("th").data(keys).enter().append("th").text(function(d) {
			return d; });
d3.select("#previewTable").selectAll("tr")
			.data(_yourData).enter().append("tr")
		.selectAll("td")
			.data(function(d) { return keys.map(function(key) { return d[key] }); })
			.enter().append("td").style("text-align", "right")
			.text(function(d) { return d; });

	d3.selectAll("#load").text("");

	document.getElementById("idSelect").style.cursor = "pointer";
	document.getElementById("idSelect").disabled = false;
	d3.select("#idSelect").selectAll("option.var").remove();
	d3.select("#idSelect").selectAll("option.var")
		.data(keys).enter().append("option").attr("class","var").text(function(key) { return key; });

	document.getElementById("idSelect").addEventListener("change", merge, false);

	function merge() {
		var geoId = this.options[this.selectedIndex].text;
		if(geoId !== ""){
			var matches = mobData.map(function(d){return d.GEOID;}).map(function(e){
				return yourData.map(function(h){return h[geoId];}).indexOf(e);});
			var unmatched = Array(yourData.length).fill(0)
				.map(function(d, i){return i;}).filter(function(d){
					return matches.filter(function(e){return e !== -1;}).indexOf(d) < 0;});
			var unmatchedCli = yourData.map(function(d){return d[geoId];})
				.map(function(d){
					return mobData.map(function(e){return e[geoId];}).indexOf(d);})
				.map(function(d, i){if(d === -1){return i;}})
				.filter(function(d){return d !== undefined;});
			var unmatchedServ = unmatched.filter(function(d){
				return unmatchedCli.indexOf(d) < 0;});

			if(unmatchedCli.length > 0 || unmatchedServ.length > 0){
				document.getElementById("missing").addEventListener("click", getMissing, false);
				function getMissing(){
						var missingCli = unmatchedCli.map(function(d){return yourData[d];});
						var missingServ = unmatchedServ.map(function(d){
							return {GEOID: mobData[d].GEOID, ST: mobData[d].stateabbrv, COUNTY: mobData[d].county_name};});
						var missing = {unmatched_cli: missingCli, unmatched_serv: missingServ}
						var link = document.createElement("a");
						link.setAttribute("href", "data:text/plain;charset=utf-8," 
							+ encodeURIComponent(JSON.stringify(missing)));
						link.setAttribute("download", "missing_obs.json");
						link.style.display = "none";
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
				};
			}
			
			matches.map(function(i, j){
				if(yourData[i] !== undefined){
					keys.map(function(k){
						mobData[j][k] = yourData[i][k];});
				} else {
					keys.map(function(k){
						mobData[j][k] = NaN;});
				};});
			var matched = matches.filter(function(d){return d !== -1;}).length;
			var matchedPop = matches.filter(function(d){return d !== -1;}).map(
						function(d){return mobData[d].cty_pop2000;})
					.reduce(function(acc, val){return Number(acc) + Number(val);}, 0);
			var totalPop = mobData.map(function(d){return d.cty_pop2000;})
					.reduce(function(acc, val){return Number(acc) + Number(val);}, 0);
			document.getElementById("merged").addEventListener("click", getMergedCSV, false);
			function getMergedCSV (){
				var mKeys = Object.keys(mobData[0]);
				var lines = mobData.map(function(d){return mKeys.map(function(k){return '"' + d[k] + '"';}).join();}).join("\n");
				var csv = [mKeys.join()].concat(lines).join("\r\n");
				csv = new Blob([csv], {type: "text/csv"});
				var csvUrl = URL.createObjectURL(csv);

				var link = document.createElement("a");
				link.href = csvUrl;
				link.target = "_blank";
				link.download = "merged.csv";
				link.style.display = "none";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link); 
			}
	
			d3.select("#information").style("padding", "5px")
				.html("-- " + matched + " of " + yourData.length + " (" 
					+ fdp(matched / yourData.length) + ") were matched to " 
					+ mobData.length + " (" + fdp(matched / mobData.length) 
					+ ") geographies. <br/> -- " + fdp(matchedPop / totalPop) 
					+ " of the total US population in 2000.");
			document.getElementById("mergeResults").style.opacity = 1;
			document.getElementById("missing").style.cursor = "pointer";
			document.getElementById("merged").style.opacity = 1;
			document.getElementById("merged").style.cursor = "pointer";

			selectors[2].addEventListener("change", genMap, false);

			d3.select("#outcomeSelector").selectAll("option.var")
				.data(keys).enter().insert("option", ":first-child")
				.attr("class", "var").text(function(k){return k;});

			d3.select("#lhsSelect").selectAll("option.var")
				.data(keys).enter().insert("option", ":first-child")
				.attr("class", "var").text(function(k){return k;});
			d3.select("#rhsSelect").selectAll("div.rhsn").data(keys).enter()
				.insert("div", ":first-child").attr("class", "rhsn")
				.html(function(k){
					return '<input type="checkbox" class="rhsVar" value="' + k + '" />' 
						+ '<span class="mono">' + k + '</span>';});
			d3.select("#indVarSelect").selectAll("option.var")
				.data(keys).enter().insert("option", ":first-child")
				.attr("class", "var").text(function(k){return k;});
			d3.select("#depVarSelect").selectAll("option.var")
				.data(keys).enter().insert("option", ":first-child")
				.attr("class", "var").text(function(k){return k;});

		}	
	};
};

function uploadData(element, callback) {
	var uploader = document.getElementById(element); var reader = new FileReader(); 
	reader.onload = function(d) {
		var contents = d.target.result;
		callback(contents);
	};
	
	uploader.addEventListener("change", loadingPreview, false);

	function loadingPreview() {
		var file = this.files[0];
		if(typeof file !== "undefined") {
			d3.select("#uploadPreview").html("");
			d3.select("#information").html("");
			reader.readAsText(file);
		} else {
			d3.select("#uploadPreview").html("");
			d3.select("#information").html("");
		};
	};
};

function loadCSV(csv) {
	yourData = d3.csvParse(csv);
	loadElements(yourData);
};

//  Fucntion to draw map
function genMap() {
	thisVal = document.getElementById("outcomeSelector").value;	
	var trans = document.getElementById("outMonTrans").value;
	var mapThis = cty.map(function(d){return +d.properties.outcomes[thisVal];});	
	var mapThisCC = mapThis.filter(function(d){return !isNaN(d);});
	if(trans === "logx"){
		mapThis = logx(mapThis);
		mapThisCC = logx(mapThisCC);
	} else if(trans === "expx"){
		mapThis = expx(mapThis);
		mapThisCC = expx(mapThisCC);
	} else if(trans === "sqrtx"){
		mapThis = sqrtx(mapThis);
		mapThisCC = sqrtx(mapThisCC);
	}	

	d3.selectAll("g.land").remove();

	var maxVal = Math.max.apply(null, mapThisCC); 
	var minVal = Math.min.apply(null, mapThisCC); 
	var color = d3.scaleLinear().domain([minVal,maxVal]).range(colorRange);

	g.append("g").attr("class", "land").selectAll("path")
		.data(cty).enter().append("path")
		 .filter(function(d, i){return !isNaN(mapThis[i]);})
			.attr("fill", function(d, i){return color(mapThisCC[i]);})
		.attr("d", path)
			.on("mouseover", mouseover)
			.on("mousemove", mousemove)
			.on("mouseout", mouseout)
			.on("click", clicked);
	
	g.append("g").attr("class","land").selectAll("path")
		.data(cty).enter().append("path")
		.filter(function(d, i){return isNaN(mapThis[i]);})
		.attr("d", path)
			.on("mouseover", mouseover)
			.on("mousemove", mousemove)
			.on("mouseout", mouseout)
			.on("click", clicked);
};

function drawMap(error, usa) {
	if (error) throw console.log(error);
	d3.select("#mapLoader0").remove();
	//document.getElementById("dropdown").click()				
	cty = topojson.feature(usa, usa.objects.cty).features;
	for(var i = 0; i < cty.length; i++){
		mobData.push(cty[i].properties.outcomes);
	};

	genMap();
	makePlot(document.getElementById("indVarSelect").value,document.getElementById("depVarSelect").value);

	d3.selectAll(".mainContent").transition().duration(3000).style("opacity", 1);

	mobKeys = d3.keys(cty[0].properties.outcomes);
	NaNvars = mobKeys.slice(0, 15).filter(function(k){return ["cty_pop2000", "cz_pop2000", "intersects_msa"].indexOf(k) < 0;});
	var covKeys = mobKeys.filter(function(k){return k.match("causal") === null;})
		.filter(function(k){return k.match("perm") === null;})
		.filter(function(k){return NaNvars.indexOf(k) < 0;}); 
	var outcomeKeys = mobKeys.filter(function(k){return covKeys.indexOf(k) < 0;})
		.filter(function(k){return NaNvars.indexOf(k) < 0;});
	var outCov = outcomeKeys.concat(covKeys);
	var covOut = covKeys.concat(outcomeKeys);

	d3.select("#outcomeSelector").selectAll("option.outcomeVar").data(outCov)
		.enter().append("option").attr("class", "outcomeVar")
		.property("value", function(k){return k;})
		.text(function(k){return k;});
	d3.select("#indVarSelect").selectAll("option.indVar").data(outCov)
		.enter().append("option").attr("class", "indVar")
		.property("value", function(k){return k;})
		.text(function(k){return k;});
	d3.select("#depVarSelect").selectAll("option.depVar").data(covOut)
		.enter().append("option").attr("class", "depVar")
		.property("value", function(k){return k;})
		.text(function(k){return k;});

	document.getElementById("outcomeSelector").addEventListener("change", genMap, false);
	d3.select("#lhsSelect").selectAll("option").data(outcomeKeys).enter()
		.append("option").property("value", function(k){return k;}).text(function(k){return k;});
	d3.select("#rhsSelect").selectAll("div.rhs").data(covKeys).enter()
		.append("div").attr("class", "rhs").html(function(k){
			return '<input type="checkbox" class="rhsVar" value="' + k + '"/>' + '<span class="mono">' + k + '</span>';});
	Array.prototype.filter.call(document.getElementsByClassName("rhsVar"), function(e){return e.value === "cs_fam_wkidsinglemom";})[0].checked = true;
	rhsVars = ["cs_fam_wkidsinglemom"];
	OLSmodel();
};

function OLSmodel() {
	d3.select("table.reg").remove();
	var lhsVar = document.getElementById("lhsSelect").value;
	var coeffNames = ["Intercept"].concat(rhsVars);

	var ym = mobData.map(function(d){return +d[lhsVar];});
	var Xm = mobData.map(function(d){return rhsVars.map(function(e){
		return +d[e];});});
	var X = Xm.filter(function(d, i){
		var k = [ym[i]];
		k = k.concat(d);
		return !numeric.any(numeric.isNaN(k));
	});
	var depMean = nm.transpose(X).map(function(d){return nm.sum(d);})
		.map(function(d){return d / X.length});
	depMean = depMean.reduce(function(acc, cur, i){
		acc[rhsVars[i]] = cur;
		return acc;}, {});
	X = X.map(function(d){return [1].concat(d);});
	var y = ym.filter(function(d, i){
		var k = [d];
		k = k.concat(Xm[i]);
		return !numeric.any(numeric.isNaN(k));
	});

	var yMean = y.reduce(function(acc, val){return acc + val;}, 0) / y.length
	var XtXinv = nm.inv(nm.dot(nm.transpose(X), X));
	var betas = nm.dot(XtXinv, nm.dot(nm.transpose(X), y));
	
	var yHat = nm.dot(X, betas);
	var e = nm.sub(y, yHat);
	var M = nm.sub(nm.identity(y.length), nm.dot(X, nm.dot(XtXinv, nm.transpose(X))));
	var TrM = nm.getDiag(M).reduce(function(acc, val){return acc + val;}, 0);
	var ssq = nm.dot(e, e) / TrM; 
	var se = nm.getDiag(XtXinv).map(function(d){return Math.sqrt(d * ssq);});
	var tStat = betas.map(function(b, i){return b / se[i];});	
	var MSR = y.map(function(d, i){return Math.pow((d - yHat[i]), 2);}).reduce(function(acc, val){return acc + val;}, 0) / y.length;
	var MSE = y.map(function(d){return Math.pow((d - yMean), 2);}).reduce(function(acc, val){return acc + val;}, 0) / y.length;
	var Rsqr = (1 - MSR/MSE);
	var Fstat = Rsqr * (y.length - rhsVars.length - 1) / (1 - Rsqr) * rhsVars.length;

	betas = betas.reduce(function(acc, cur, i){
			acc[coeffNames[i]] = cur; 
			return acc;}, {});
	se = se.reduce(function(acc, cur, i){
		acc[coeffNames[i]] = cur;
		return acc;}, {});
	tStat = tStat.reduce(function(acc, cur, i){
		acc[coeffNames[i]] = cur;
		return acc;}, {});
	results = {coeffs: betas, stdErr: se, tStat: tStat, SER: ssq, yMean: yMean, depMean: depMean, N: y.length, Rsqr: Rsqr, Fstat: Fstat};

	table = ['<tr><td class="botBrD" colspan="3">' + lhsVar + ':</td></tr><tr><td class="var botBr">Variable</td><td class="coef botBr">Coef.</td><td class="coef botBr">t-statistic</td></tr>'];
	tableBody = Object.keys(results.coeffs).map(function(k){
		return '<tr class="reg"><td class="var">' + k 
		+ '</td><td class="coef">' 
		+ d3.format(".3f")(Number(results.coeffs[k])) + '<br>(' 
		+ d3.format(".3f")(Number(results.stdErr[k])) + ')</td><td class="coef">'
		+ d3.format(".3f")(Number(results.tStat[k])) + '</td></tr>';}).join("");
	table.push(tableBody);
	table.push('<tr class="reg"><td class="var topBr">N</td><td colspan="2" class="coef topBr">' + d3.format(",")(results.N) + '</td></tr><tr class="reg"><td class="var">R&sup2;</td><td colspan="2" class="coef">' + d3.format(".3f")(results.Rsqr) + '</td></tr><tr class="reg"><td class="var botBr">F-test</td><td colspan="2" class="coef botBr">' + d3.format(".3f")(results.Fstat) + '</td></tr><tr style="height:15px"><td colspan="3"></td></tr>');
	table = table.join("");
	d3.select("#regTable").append("table").attr("class", "reg").html(table);
};

function makePlot(indVar, depVar){
	var mData = mobData.filter(function(d){return !isNaN(+d[indVar]) && !isNaN(+d[depVar]);});
	var mData = mData.map(function(d){return{indVar: +d[indVar], depVar: +d[depVar]};});
	var radSize = d3.scaleLinear().range([2,40]);
	var maxDep = d3.max(mData, function(d){return d.depVar;});
	var minDep = d3.min(mData, function(d){return d.depVar;});
	var nBins = +document.getElementById("binNumber").value;
	if(nBins > 1 && nBins < mData.length){
		var binWidth = (maxDep - minDep) / nBins;
		var binsE = Array(nBins + 1).fill(0).map(function(d,i){return i * binWidth + minDep;});
		var bins = binsE.slice(0, binsE.length - 1);
		var binData = bins.map(function(n, i){return mData.filter(function(d){return binsE[i] <= d.depVar && d.depVar < binsE[i+1];});});
	
		binData = binData.map(function(d){
			var depVars = d.map(function(e){return e.depVar;});
			depVars = trans(depVars, "depMonTrans");
			var meanDep = depVars.reduce(function(acc, val){return acc + val;}, 0) / depVars.length;
			var indVars = d.map(function(e){return e.indVar;});
			indVars = trans(indVars, "indMonTrans");
			var meanInd = indVars.reduce(function(acc, val){return acc + val;}, 0) / indVars.length;
			return {indVar: meanInd, depVar: meanDep, depSize: radSize(depVars.length / mData.length)};}).filter(function(d){return !isNaN(d.indVar) && !isNaN(d.depVar);});
	} else {
		var depVars = mData.map(function(d){return d.depVar;});
		depVars = trans(depVars, "depMonTrans");
		var indVars = mData.map(function(d){return d.indVar;});
		indVars = trans(indVars, "indMonTrans");
		var binData = mData.map(function(d,i){return {indVar: indVars[i], depVar: depVars[i], depSize: 2};});
	} 
	
	var width = document.getElementById("plot").offsetWidth - plotMargin.left - plotMargin.right,
			height = document.getElementById("plot").offsetHeight - plotMargin.top - plotMargin.bottom;

	xMap = d3.scaleLinear().range([0, width]);
	yMap = d3.scaleLinear().range([height, 0]);
	
	var xAxis = d3.axisBottom(xMap);
	var yAxis = d3.axisLeft(yMap);

	var plot = d3.select("#plot").append("svg")
		.attr("width", width + plotMargin.left + plotMargin.right)
		.attr("height", height + plotMargin.top + plotMargin.bottom)
		.append("g").attr("transform", "translate(" + plotMargin.left + "," + plotMargin.top + ")").attr("id", "scatterPlot");

	xMap.domain(d3.extent(binData, function(d){return d.depVar;})).nice();	
	yMap.domain(d3.extent(binData, function(d){return d.indVar;})).nice();	
	
	plot.append("g").attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")").call(xAxis)
		.append("text").attr("class", "label").attr("x", width).attr("y", -6)
		.style("text-anchor", "end").text(depVar);

	plot.append("g").attr("class", "y axis").call(yAxis).append("text")
		.attr("class","label").attr("transform", "rotate(-90)").attr("y", 6)
		.attr("dy", ".71em").style("text-anchor", "end").text(indVar);

	plot.selectAll(".point").data(binData).enter().append("circle")
		.attr("class", "point").attr("r", function(d){return d.depSize;})
		.attr("cx", function(d){return xMap(d.depVar);})
		.attr("cy", function(d){return yMap(d.indVar);});

	var depVars = binData.map(function(d){return [1, d.depVar]});
	var minDep = d3.min(binData, function(d){return d.depVar;});
	var maxDep = d3.max(binData, function(d){return d.depVar;});
	var indVars = binData.map(function(d){return d.indVar});
	
	if(document.getElementById("trendSelect").value === "line"){
		var XtXinv = nm.inv(nm.dot(nm.transpose(depVars), depVars));
		var b = nm.dot(XtXinv, nm.dot(nm.transpose(depVars), indVars));	
		var line = [xMap(minDep), yMap(minDep * b[1] + b[0]), xMap(maxDep), yMap(maxDep * b[1] + b[0])];
		plot.append("line").attr("class", "trendLine").attr("x1", line[0]).attr("y1", line[1]).attr("x2", line[2]).attr("y2", line[3]);
	}

}
function trans(arr, id){
	var func = document.getElementById(id).value;
	if(func === "logx"){
		return logx(arr);
	} else if(func === "sqrtx"){
		return sqrtx(arr);
	} else if(func === "expx"){
		return expx(arr);
	} else {
		return arr;
	}
}
function logx(arr){
	var minArr = d3.min(arr);
	if(minArr <= 0){
		return arr.map(function(d){return Math.log(d - minArr + 1);});
	} else {
		return arr.map(function(d){return Math.log(d);});
	}
}
function sqrtx(arr){
	var minArr = d3.min(arr);
	if(minArr < 0){
		return arr.map(function(d){return Math.sqrt(d - minArr);});
	} else {
		return arr.map(function(d){return Math.sqrt(d);});
	}
}
function expx(arr){
	return arr.map(function(d){return Math.exp(d);});
}

function fitTrend(data) {
	if(this.value === "line"){
		var yname = document.getElementById("indVarSelect").value;
		var xname = document.getElementById("depVarSelect").value;
		var xy = mobData.map(function(d){return [1, +d[xname], +d[yname]];});
		xy = xy.filter(function(d){return !isNaN(d[1]) && !isNaN(d[2]);});
		x = xy.map(function(d){return d.slice(0,2);});
		y = xy.map(function(d){return d.slice(2);});
		y = [].concat.apply([], y);
		var XtXinv = nm.inv(nm.dot(nm.transpose(x), x));
		var b = nm.dot(XtXinv, nm.dot(nm.transpose(x), y));	
		var line = [xMap(data[0]), yMap(data[0] * b[1] + b[0]), xMap(data[1]), yMap(data[1] * b[1] + b[0])];
		d3.select("#scatterPlot").append("line")
			.attr("x1", line[0]).attr("y1", line[1]) 
			.attr("x2", line[2]).attr("y2", line[3]);
	}	
}

//  Run
document.body.addEventListener("mouseover", function(){
	var el = document.getElementsByClassName("rhsVar");
	el = Array.prototype.filter.call(el, function(e){return e.checked;});
	rhsVars = el.map(function(e){return e.value;});

	var predbttn = document.getElementById("predict");
	if(rhsVars.length > 0){
		predbttn.style.cursor = "pointer";
		predbttn.style.opacity = "1";
		predbttn.addEventListener("click", OLSmodel, false);
	} else {
		predbttn.style.cursor = "default";
		predbttn.style.opacity = ".5";
		predbttn.removeEventListener("click", OLSmodel, false);
	}
}, false);	
document.getElementById("indVarSelect").addEventListener("change", function(){
	var depVarValue = document.getElementById("depVarSelect").value;
	d3.select("#plot").select("svg").remove();
	makePlot(this.value, depVarValue);	
	document.getElementById("resultsOpts").className = "closed";
}, false);
document.getElementById("depVarSelect").addEventListener("change", function(){
	var indVarValue = document.getElementById("indVarSelect").value;
	d3.select("#plot").select("svg").remove();
	makePlot(indVarValue, this.value);	
	document.getElementById("resultsOpts").className = "closed";
}, false);
document.getElementById("indMonTrans").addEventListener("change", function(){
	var indVarValue = document.getElementById("indVarSelect").value;
	var depVarValue = document.getElementById("depVarSelect").value;
	d3.select("#plot").select("svg").remove();
	makePlot(indVarValue, depVarValue);
	document.getElementById("resultsOpts").className = "closed";
}, false);
document.getElementById("depMonTrans").addEventListener("change", function(){
	var indVarValue = document.getElementById("indVarSelect").value;
	var depVarValue = document.getElementById("depVarSelect").value;
	d3.select("#plot").select("svg").remove();
	makePlot(indVarValue, depVarValue);
	document.getElementById("resultsOpts").className = "closed";
}, false);
document.getElementById("binNumber").addEventListener("change", function(){
	var indVarValue = document.getElementById("indVarSelect").value;
	var depVarValue = document.getElementById("depVarSelect").value;
	d3.select("#plot").select("svg").remove();
	makePlot(indVarValue, depVarValue);
	document.getElementById("resultsOpts").className = "closed";
}, false);
document.getElementById("trendSelect").addEventListener("change", function(){
	var indVarValue = document.getElementById("indVarSelect").value;
	var depVarValue = document.getElementById("depVarSelect").value;
	d3.select("#plot").select("svg").remove();
	makePlot(indVarValue, depVarValue);
	document.getElementById("resultsOpts").className = "closed";
}, false);

document.getElementById("outMonTrans").addEventListener("change", genMap, false);
document.getElementById("colorInput").addEventListener("change", function(){
	colorRange = JSON.parse(this.value);
	genMap();
	}, false);

uploadData("input", loadCSV);
d3.json("/usa-sm-q.json", drawMap);
