//		a spectrum viewer
//
//	  Copyright  2015 Rappsilber Laboratory, Edinburgh University
//
// 		Licensed under the Apache License, Version 2.0 (the "License");
// 		you may not use this file except in compliance with the License.
// 		You may obtain a copy of the License at
//
// 		http://www.apache.org/licenses/LICENSE-2.0
//
//   	Unless required by applicable law or agreed to in writing, software
//   	distributed under the License is distributed on an "AS IS" BASIS,
//   	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   	See the License for the specific language governing permissions and
//   	limitations under the License.
//
//		authors: Colin Combe, Lars Kolbowski
//
//		graph/Peak.js

function Peak (id, graph){
	let peak = graph.model.get("JSONdata").peaks[id];
	this.id = id;
	this.x = peak.mz;
	this.y = peak.intensity;
	this.IsotopeClusters = [];
	this.labels = [];
	for (let i=0; i<peak.clusterIds.length; i++){
		let cluster = graph.model.get("JSONdata").clusters[peak.clusterIds[i]]
		cluster.id = peak.clusterIds[i]
		this.IsotopeClusters.push(cluster);
	}
	this.clusterIds = peak.clusterIds
	this.graph = graph;

	//make fragments
	this.fragments = [];
	this.isotopes = [];
	this.isotopenumbers = [];
	//this.isMonoisotopic = false;	//monoisotopic peak for at least one fragment

	let fragments = graph.model.fragments;
	for (let f=0; f < fragments.length; f++) {
		if(_.intersection(fragments[f].clusterIds, this.clusterIds).length !== 0){
			// monoisotopic peak for this fragment
			let intersect = _.intersection(fragments[f].clusterIds, this.clusterIds)
				for (let i=0; i < intersect.length; i++) {
					fragments[f].isMonoisotopic = false;
					for (let j=0; j < this.IsotopeClusters.length; j++) {
						var isotope = id - this.IsotopeClusters[j].firstPeakId;
						if (this.IsotopeClusters[j].id == intersect[i] && this.IsotopeClusters[j].firstPeakId == id){
							fragments[f].isMonoisotopic = true;
							//this.isMonoisotopic = true
						}
					}

				}
			if(fragments[f].isMonoisotopic)
				this.fragments.push(fragments[f]);
			else{
				this.isotopes.push(fragments[f]);
				this.isotopenumbers.push(isotope);
			}
		}
	}
}

Peak.prototype.draw = function(){
	//svg elements
	this.lineLabelGroup = this.graph.peaksSVG.append('g');
	this.lineGroup = this.lineLabelGroup.append('g');

	if (this.fragments.length > 0) {
		this.highlightLine = this.lineGroup.append('line')
								.attr("stroke", this.graph.model.get('highlightColor'))
								.attr("stroke-width", this.graph.model.get('highlightWidth'))
								.attr("opacity","0")
								.attr("stroke-opacity", "0.7")
								.attr("x1", 0)
								.attr("x2", 0)
							;

		//set the dom events for it
		var self = this;

		this.lineGroup
			.on("mouseover", function() {
				let evt = d3.event;
				if (evt.ctrlKey){
					self.line.style("cursor", "copy");
					self.highlightLine.style("cursor", "copy");
				}
				else{
					self.line.style("cursor", "pointer");
					self.highlightLine.style("cursor", "pointer");
				}
				showTooltip(evt.pageX, evt.pageY);
				startHighlight();
			})
			.on("mouseout", function() {

				hideTooltip();
				endHighlight();
			})
			.on("touchstart", function() {
				let evt = d3.event;
				showTooltip(evt.layerX, evt.layerY);
				startHighlight();
			})
			.on("touchend", function() {
				hideTooltip();
				endHighlight();
			})
			.on("click", function() {
				let evt = d3.event;
				stickyHighlight(evt.ctrlKey);
			})
			;

		function showTooltip(x, y, fragId){
			let contents = [["m/z", self.x.toFixed(self.graph.model.get('showDecimals'))], ["Int", self.y.toFixed(self.graph.model.get('showDecimals'))]];
			let header = [];

			// filter fragments shown in tooltip (only fraglabel is hovered over)
			let fragments = (fragId) ? self.fragments.filter(function (d) {
				return d.id === parseInt(fragId);
			}) : self.fragments;

			for (let f=0; f < fragments.length; f++){
				// get the right clusterId for this peak
				let clusterId = _.intersection(self.clusterIds, fragments[f].clusterIds)[0];
				let clusterInfoIdx = fragments[f].clusterIds.indexOf(clusterId);
				let clusterInfo = fragments[f].clusterInfo[clusterInfoIdx]

				let matchedMissingMonoIsotopic = clusterInfo.matchedMissingMonoIsotopic;
				let charge = clusterInfo.matchedCharge;
				let chargeStr = (charge > 1) ? charge: '';
				let error = clusterInfo.error.toFixed(self.graph.model.get('showDecimals')) + " " + clusterInfo.errorUnit;
				header.push(fragments[f].name + '<span style="vertical-align:super;font-size: 0.8em;">'+ chargeStr + '+</span>');

				let fragName = fragments[f].name + " (" + fragments[f].sequence + ")";
				let fragInfo = "charge: " + charge + ", error: " + error;
				if (matchedMissingMonoIsotopic) fragInfo += ", missing monoisotopic peak";

				let fragmentBodyText = [fragName, fragInfo];
				contents.push(fragmentBodyText);
			}

			// Tooltip
			if (window.compositeModelInst !== undefined){
				self.graph.tooltip.set("contents", contents )
					.set("header", header.join(" "))
					.set("location", {pageX: x, pageY: y});
					//.set("location", {pageX: d3.event.pageX, pageY: d3.event.pageY})
			}
			else{
				let html = header.join("; ");
				for (let i = contents.length - 1; i >= 0; i--) {
					html += "</br>";
					html += contents[i].join(": ");
				}
				self.graph.tooltip.html(html);
				self.graph.tooltip.transition()
					.duration(200)
					.style("opacity", .9);

				//if cursor is too close to left window edge change tooltip to other side
				if (window.innerWidth - x < 250){
					x = x - 250;
					y = y + 20;
				}

				self.graph.tooltip.style("left", (x + 15) + "px")
					.style("top", y + "px");
			}
		}

		function hideTooltip(){
			if (window.compositeModelInst !== undefined)
				self.graph.tooltip.set("contents", null);
			else{
				self.graph.tooltip.style("opacity", 0);
				self.graph.tooltip.html("");
			}
		}

		function startHighlight(fragId){
			let fragments;
			if(fragId){
				fragId = parseInt(fragId);
				fragments = self.fragments.filter(function(d) { return d.id == fragId; });
			}
			else{
				fragments = self.fragments;
			}
			self.graph.model.addHighlight(fragments);
		}

		function endHighlight(){
			//hideTooltip();
			self.graph.model.clearHighlight(self.fragments);
		}

		function stickyHighlight(ctrl, fragId){
			var fragments = [];
			if(fragId){
				fragId = parseInt(fragId);
				fragments = self.fragments.filter(function(d) { return d.id == fragId; });
			}
			else
				fragments = self.fragments;
			self.graph.model.updateStickyHighlight(fragments, ctrl);
		}

		//create frag labels
		//labeldrag
		this.labelDrag = d3.behavior.drag();
		this.labelDrag
			.on("dragstart", function(){
				self.labelLines.attr("opacity", 1); // MJG
			})
			.on("drag", function(d) {
				var coords = d3.mouse(this);
				var fragId = d.id;
				var filteredLabels = self.labels.filter(function(d) { return d.id == fragId; });
				var filteredHighlights = self.labelHighlights.filter(function(d) { return d.id == fragId; });
				var filteredLabelLines = self.labelLines.filter(function(d) { return d.id == fragId; });

				filteredLabels.attr("x", coords[0]).attr("y", coords[1]);
				filteredHighlights.attr("x", coords[0]).attr("y", coords[1]);

				var y = d3.min([self.graph.yscale.domain()[1], self.y]);
				var startY = self.graph.yscale(y);
				var mouseX = coords[0];
				var mouseY = coords[1];
				var r = Math.sqrt((mouseX * mouseX) + ((mouseY-startY) * (mouseY-startY) ));
				if (r > 15){
					var deltaY = (mouseY - startY > 0 ? -8 : 2);
					var deltaX = 0;
					if(Math.abs(mouseX) > 20){
						deltaX = (mouseX > 0 ? -8 : 8)
					}
					filteredLabelLines
						.attr("opacity", 1)
						.attr("x1", 0)
						.attr("x2", mouseX + deltaX)
						.attr("y1", startY)
						.attr("y2", mouseY + deltaY)
					;
				}
				else
					filteredLabelLines.attr("opacity", 0);
			})
		;

		var lossy = [];
		var nonlossy = this.fragments.filter(function(frag) {
			var bool = frag.class != "lossy";
			if (!bool) { lossy.push (frag); }
			return bool;
		});

		var partitions = [
			{frags: nonlossy, group: this.graph.annotations, type: "nonlossy", colourClass: "color"},
			{frags: lossy, group: this.graph.lossyAnnotations, type: "lossy", colourClass: "color_loss"},
		];

		CLMSUI.idList = CLMSUI.idList || [];	//obsolete?

		var makeIdentityID = function (d) {
			return d.id;
		};

		partitions.forEach (function (partition) {
			var peakFrags = partition.frags;

			if (peakFrags.length > 0) {
				var group = partition.group;
				var labelgroup = self.lineLabelGroup.selectAll("g.xispec_label").data (peakFrags, makeIdentityID);
				var labelLines = self.lineLabelGroup.selectAll("line.xispec_labelLine").data (peakFrags, makeIdentityID);

				labelLines.enter()
					.append("line")
					// .attr("stroke-width", 1)
					.attr("stroke", "Black")
					.attr("class", "xispec_labelLine")
					.style("stroke-dasharray", ("3, 3"));

				var label = labelgroup.enter()
					.append("g")
						.attr("class", "xispec_label")
						.style("cursor", "pointer")
						.on("mouseover", function(d) {
							var evt = d3.event;
							if(!self.graph.model.moveLabels){
								if (evt.ctrlKey){
									self.line.style("cursor", "copy");
									self.highlightLine.style("cursor", "copy");
								}
								else{
									self.line.style("cursor", "pointer");
									self.highlightLine.style("cursor", "pointer");
								}
								showTooltip(evt.pageX, evt.pageY, d.id);
								startHighlight(d.id);
							}
						})
						.on("mouseout", function() {
							if(!self.graph.model.moveLabels){
								hideTooltip();
								endHighlight();
							}
						})
						.on("touchstart", function(d) {
							var evt = d3.event;
							if(!self.graph.model.moveLabels){
								if (evt.ctrlKey){
									self.line.style("cursor", "copy");
									self.highlightLine.style("cursor", "copy");
								}
								else{
									self.line.style("cursor", "pointer");
									self.highlightLine.style("cursor", "pointer");
								}
								showTooltip(evt.pageX, evt.pageY, d.id);
								startHighlight(d.id);
							}
						})
						.on("touchend", function() {
							if(!self.graph.model.moveLabels){
								hideTooltip();
								endHighlight();
							}
						})
						.on("click", function(d) {
							var evt = d3.event;
							stickyHighlight(evt.ctrlKey, d.id);
						})
					;

				label.append("text")
					.text(function(d) {
						return d.name;
					})
					.attr("x", 0)
					.attr("text-anchor", "middle")
					.style("stroke-width", "6px")
					.style("font-size", self.graph.model.get('labelFontSize'))
					.attr("class", "xispec_peakAnnotHighlight")
					.attr("stroke", this.graph.model.get('highlightColor'))
				;

				label.append("text")
					.text(function(d) {
						return d.name;
					})
					.attr("x", 0)
					.attr("text-anchor", "middle")
					.style("font-size", self.graph.model.get('labelFontSize'))
					.attr("font-weight", function(d){
						if (self.graph.options.accentuateCLcontainingFragments && d.crossLinkContaining)
							return '900';
						return 'normal';
					})
					.attr("class", function(d){
						var pepIndex = d.peptideId+1;
						return "xispec_peakAnnot pep" + pepIndex + " " + partition.colourClass;
					})
					.attr ("fill", function(d) {
						var pepIndex = d.peptideId+1;
						return self.graph.model["p" + pepIndex + partition.colourClass];
					})
				;
				if (self.graph.options.labelFragmentCharge){
					label.selectAll('text').append('tspan')
						.text(function(d) {
							return d.get_charge(self.id) + '+';
						})
						.style("font-size", "75%")
						.style("baseline-shift", "super")
					;
				}
			}

		}, this);

		var fset = d3.set(this.fragments.map(function(frag){ return frag.id; }));
		var labelgroups = this.lineLabelGroup
			.selectAll("g.xispec_label")
			.filter (function(d){ return fset.has(d.id); });

		this.labels = labelgroups.selectAll("text.xispec_peakAnnot");
		this.labelHighlights = labelgroups.selectAll("text.xispec_peakAnnotHighlight");

		this.labelLines = this.lineLabelGroup
			.selectAll("line.xispec_labelLine")
			.filter(function(d){ return fset.has(d.id); });

		this.highlight(false);

	}

	var peakStrokeWidth = 1;
	if (this.graph.options.accentuateCLcontainingFragments
		&& this.fragments.filter(function(f){return f.crossLinkContaining}).length > 0){
		peakStrokeWidth = 2;
	}

	this.line = this.lineGroup.append('line')
		.attr("stroke-width", peakStrokeWidth)
		.attr("x1", 0)
		.attr("x2", 0);

	// add max intensity breakSymbol
	this.lineBreakSymbol = this.lineGroup.append('polyline')
		.attr("points", "-8,6 -2,-2 4,6 7,2")
		.attr("stroke-width", peakStrokeWidth)
		.attr("stroke", "#333")
		.attr("fill", "none")
		.attr("opacity", 0);

	if(this.fragments.length > 0){
		this.line.style("cursor", "pointer");
		this.highlightLine.style("cursor", "pointer");
	}


	this.colour = this.graph.model.get('peakColor');
	this.setColor();
}

Peak.prototype.highlight = function(show, fragments){
	if (show === true) {
		this.highlightLine.attr("opacity","1");
		if (this.labels.length) {
			let fragMap = d3.set (fragments.map (function (frag) { return frag.id; }));
			let ffunc = function (d) { return fragMap.has (d.id); };
			this.labelHighlights.filter(ffunc)
				.attr("opacity", 1)
				.attr("display", "inline")
			;
			this.labels.filter(ffunc).attr("display", "inline");
		}
		// this.graph.peaksSVG.node().appendChild(this.lineLabelGroup.node());
		this.line.attr("stroke", this.colour);
	} else {
		this.highlightLine.attr("opacity",0);
		if (this.labels.length){
			this.labelHighlights.attr("opacity", 0);
		}
	}
}

Peak.prototype.update = function(){

	this.lineLabelGroup.attr("transform", "translate("+this.graph.xscale(this.x)+",0)");
	var xDomain = this.graph.xscale.domain();
	var yDomain = this.graph.yscale.domain();
	if (this.x > xDomain[0] && this.x < xDomain[1]){
		//reset label lines
		if (this.labels.length > 0){
				this.labelLines
					.attr("opacity", 0)
					.attr("x1", 0)
					.attr("x2", 0)
					.attr("y1", 0)
					.attr("y2", 0)
			}
		//update Peak position
		this.updateX(xDomain);
		this.updateY(yDomain);
		//show peaks
		this.lineLabelGroup.attr("display","inline");
	} else {
		this.lineLabelGroup.attr("display","none");
	}
}

Peak.prototype.updateX = function(xDomain){
	var labelCount = this.labels.length;
	var model = this.graph.model;
	function labelVisible (d, peakObj) {
		// in the currently visible x range
		var inXrange = peakObj.x > xDomain[0] && peakObj.x < xDomain[1];
		if (!inXrange) return false;

		// Y labelCutoff
		var peakYrel = (peakObj.y / model.ymaxPrimary * 100);
		if (peakYrel < model.get('labelCutoff')) return false;

		// is a sticky fragment
		var isSticky = _.intersection(model.sticky, peakObj.fragments).length !== 0;

		return (peakObj.graph.lossyShown === true || d.class === "non-lossy" || isSticky)	//lossy enabled OR not lossy OR isStickyFrag
			 && (isSticky || model.sticky.length === 0 || !model.get('hideNotSelectedFragments'))	//isStickyFrag OR no StickyFrags or showAll
	}
	var self = this;
	if (labelCount) {
		this.labels
			.attr("x", 0)
			.attr("display",function(d, i) {
				return labelVisible (d, self) ? "inline" : "none";
			})
		;
		this.labelHighlights
			.attr("x", 0)
			.attr("display",function(d) {
				return labelVisible (d, self) ? "inline" : "none";
			})
		;
	}
};

Peak.prototype.updateY = function(yDomain){
	var yScale = this.graph.yscale;
	var ymax = yDomain[1];
	var y = d3.min([ymax, this.y]);
	this.line
		.attr("y1", yScale(y))
		.attr("y2", yScale(0));

	var labelCount = this.labels.length;

	// show lineBreakSymbol if intensity is above max
	if (this.y > ymax){
		this.lineBreakSymbol.attr("opacity", 1);}
	else{
		this.lineBreakSymbol.attr("opacity", 0);}
	if (labelCount > 0) {
		this.highlightLine
			.attr("y1", yScale(y))
			.attr("y2", yScale(0));
		var yStep = 13;

		for (var i = 0; i < labelCount; i++) {
			var deltaY = 0;
			var gap = this.graph.options.invert ? -10 - (yStep * i) : 5 + (yStep * i);
			// move labels to right if peak intensity is at max
			if (this.y > ymax){
				this.labels[i][0].setAttribute("x",  16);
				this.labelHighlights[i][0].setAttribute("x", 16);
				deltaY = -2;
				gap = -gap;
			}
			var labelY = yScale(y) - gap + deltaY;
			this.labels[i][0].setAttribute("y",  labelY);
			this.labelHighlights[i][0].setAttribute("y",  labelY);
		}
	}
}

Peak.prototype.removeLabels = function(){
	var labelCount = this.labels.length;
	if(labelCount){
		this.labels.attr("display", "none");
		this.labelHighlights.attr("display", "none");
// 		this.labelLines.attr("opacity", 0);
	}
}

Peak.prototype.showLabels = function(lossyOverride){
	var xDomain = this.graph.xscale.domain();
	var labelCount = this.labels.length;
	var self = this;
	var model = this.graph.model;
	if (labelCount) {
		var isVisible = function(d) {
			// ToDo: code duplication with updateX isVisible function
			// in the currently visible x range
			let inXrange = self.x > xDomain[0] && self.x < xDomain[1];
			if (!inXrange) return false;
			// LabelCutoff
			let peakYrel = (self.y / model.ymaxPrimary * 100);
			if (peakYrel < model.get('labelCutoff')) return false;

			return (self.graph.lossyShown === true || d.class === "non-lossy" || lossyOverride === true);
		};
		this.labels.filter(isVisible).attr("display", "inline");
		this.labelHighlights.filter(isVisible).attr("display", "inline");
// 		this.labelLines.filter(isVisible).attr("opacity", 1);
	}
}

Peak.prototype.setColor = function(){
	let model = this.graph.model
	this.colour = model.get('peakColor');	// standard color
	// fragment peak
	// let fragments = _.intersection(this.fragments, model.visFragments)	// only use visible fragments
	if (this.fragments.length > 0){
		// prioritize non-lossy fragments for color
		let non_lossy = this.fragments.filter(function(f) { return !f.lossy; });
		if (non_lossy.length > 0){
			this.colour = (non_lossy[0].peptideId === 0) ? model.p1color : model.p2color;
		}
		else{
			this.colour = (this.fragments[0].peptideId === 0) ? model.p1color_loss : model.p2color_loss;
		}
	}
	else if(this.isotopes.length > 0) {
		if(this.isotopes[0].peptideId === 0)
			this.colour = model.p1color_cluster;
		if(this.isotopes[0].peptideId === 1)
			this.colour = model.p2color_cluster;
	}
	this.line.attr("stroke", this.colour);

	if(this.labels.length > 0){

		let filter_p1 = function(label){ return label.peptideId === 0};
		let filter_p2 = function(label){ return label.peptideId === 1};
		let filter_lossy = function(label){ return label.class === "lossy"};
		let filter_nonLossy = function(label){ return label.class === "non-lossy"};

		this.labels.filter(filter_p1).filter(filter_nonLossy).attr("fill", model.p1color);
		this.labels.filter(filter_p1).filter(filter_lossy).attr("fill", model.p1color_loss);
		this.labels.filter(filter_p2).filter(filter_nonLossy).attr("fill", model.p2color);
		this.labels.filter(filter_p2).filter(filter_lossy).attr("fill", model.p2color_loss);

	}

}
