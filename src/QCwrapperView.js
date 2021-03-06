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
//		authors: Lars Kolbowski
//
//
//		QCwrapperView.js

// ToDo: move Splitting to parent view?

let QCwrapperView = Backbone.View.extend({

	events : {
		'click .xispec_toggleQCWrapper' : 'toggleWrapper',
		'click .xispec_dockRight' : 'dockRight',
		'click .xispec_dockBottom' : 'dockBottom',
		'change .xispec_plotSelectChkbox': 'updatePlots',
		'click #xispec_dl_QC_SVG': 'downloadQCSVG',
	},

	initialize: function(viewOptions) {

		const defaultOptions = {
			showQualityControl: "bottom",
		};
		this.options = _.extend(defaultOptions, viewOptions);

		this.plotSplit = Split(this.options.splitIds, {
			sizes: [75, 25],
			minSize: [250, 150],
			gutterSize: 5,
			direction: 'vertical',
			onDragEnd: function(){ xiSPECUI.vent.trigger('resize:spectrum'); }
		});

		this.dock = this.options.showQualityControl;
		this.isVisible = (this.dock !== 'min');

		this.headerDiv = d3.select(this.el.getElementsByClassName("xispec_subViewHeader")[0]);
		this.headerDiv = d3.select(this.el.getElementsByClassName("xispec_subViewHeader")[0]);
		this.contentDiv = d3.select(this.el.getElementsByClassName("xispec_subViewContent")[0]);

		this.title = this.headerDiv.append("span")
			.text('Quality control plots')
		;

		this.controlsDiv = this.headerDiv.append("span");

		let plotSelector = this.controlsDiv.append("div").attr("class", "xispec_multiSelect_dropdown")
		;
		plotSelector.append("span")
			.attr("type", "text")
			.attr("class", "xispec_btn xispec_btn-1a")
			.html('<i class="fa fa-chevron-down" aria-hidden="true"></i>')
		;
		let plotSelectorDropdown = plotSelector.append("div").attr("class", "xispec_multiSelect_dropdown-content");
		let plotSelectorList = plotSelectorDropdown.append("ul");
		const plotOptions = [
			{value: "int", text: "Intensity"},
			{value: "mz", text: "m/z"},
		];
		plotSelectorList.selectAll("li").data(plotOptions)
			.enter()
			.append("li").append("label")
			.append("input")
				.attr("class", "xispec_plotSelectChkbox")
				.attr("type", "checkbox")
				.attr("checked", "checked")
				.attr("id", function(d) { return d.text; })
				.attr("value", function(d) { return d.value; })
		;
		plotSelectorList.selectAll("label").data(plotOptions)
			.append('span')
			.text(function(d) { return d.text; })
		;

		let downloadButton = this.controlsDiv.append('i')
		 	.attr("class", "xispec_btn xispec_btn-1a xispec_btn-topNav fa fa-download pointer")
			.attr("aria-hidden", "true")
			.attr("id", "xispec_dl_QC_SVG")
			.attr("title", "download SVG(s)")
		;

		let rightControls = this.controlsDiv.append('div')
			.attr('class', 'xispec_rightControls')
		;

		this.dockBottomxispec_btn = rightControls.append('i')
			.attr('class', 'fa fa-window-maximize pointer xispec_dockBottom')
			.attr('aria-hidden', 'true')
			.attr('style', 'display:none;')
			.attr('title', 'dock to bottom')
		;
		this.dockRightxispec_btn = rightControls.append('i')
			.attr('class', 'fa fa-window-maximize pointer xispec_dockRight')
			.attr('aria-hidden', 'true')
			.attr('title', 'dock to right')
		;

		this.dockQCxispec_btn = this.headerDiv.append('i')
			.attr('class', 'fa fa-angle-double-up pointer xispec_toggleQCWrapper')
			.attr('id', 'xispec_dockQC')
			.attr('aria-hidden', 'true')
			.attr('title', 'show QC plots')
			.attr('style', 'display: none;')
		;
		this.minQCxispec_btn = this.headerDiv.append('i')
			.attr('class', 'fa fa-angle-double-down pointer xispec_toggleQCWrapper')
			.attr('id', 'xispec_minQC')
			.attr('aria-hidden', 'true')
			.attr('title', 'hide QC plots')
		;

		if(this.options.showQualityControl === 'bottom'){
			this.dockBottom();
		}
		else if (this.options.showQualityControl === 'side') {
			this.dockRight();
		}
		else if (this.options.showQualityControl === 'min') {
			this.toggleQCView();
		}
	},

	downloadQCSVG: function(){
		xiSPECUI.vent.trigger('downloadQCSVG');
	},

	splitHorizontal: function(){
		try{
			this.plotSplit.destroy();
		}
		catch(err){}
		this.plotSplit = Split(this.options.splitIds, {
			sizes: [75, 25],
			minSize: [500, 220],
			gutterSize: 4,
			direction: 'horizontal',
			onDragEnd: function(){ xiSPECUI.vent.trigger('resize:spectrum'); }
		});
	},

	splitVertical: function(){
		try{
			this.plotSplit.destroy();
		}
		catch(err){}
		this.plotSplit = Split(this.options.splitIds, {
			sizes: [75, 25],
			minSize: [250, 200],
			gutterSize: 4,
			direction: 'vertical',
			onDragEnd: function(){ xiSPECUI.vent.trigger('resize:spectrum'); }
		});
	},

	toggleWrapper: function(){
		this.isVisible = !this.isVisible;
		xiSPECUI.vent.trigger('QCWrapperShow', this.options.specPanelId);
		if (this.isVisible){
			$(this.controlsDiv[0]).show();
			$(this.dockQCxispec_btn[0]).hide();
			$(this.minQCxispec_btn[0]).show();
			$(this.contentDiv[0]).show();
			if (this.dock === 'side'){
				this.splitHorizontal();
				this.dockRight();
			}
			else{
				this.splitVertical();
			}
		}
		else{
			if(this.dock === 'side'){
				$(this.el).parent().css('flex-direction', 'column');
				$(this.el).removeClass('xispec_QCdiv-right');
				$(this.contentDiv[0]).css('flex-direction', 'row');
			}
			$(this.controlsDiv[0]).hide();
			$(this.dockQCxispec_btn[0]).show();
			$(this.minQCxispec_btn[0]).hide();
			$(this.contentDiv[0]).hide();
			if(this.plotSplit)
				this.plotSplit.destroy();
		}
		xiSPECUI.vent.trigger('resize:spectrum');
	},

	dockSide: function(){
		this.title.text("QC");
		$(this.el).parent().css('flex-direction', 'row');
		$(this.contentDiv[0]).css('flex-direction', 'column');
		this.splitHorizontal();
		xiSPECUI.vent.trigger('resize:spectrum');
	},

	dockRight: function(){
		this.dock = 'side';
		$(this.dockBottomxispec_btn[0]).show();
		$(this.dockRightxispec_btn[0]).hide();
		this.dockSide();
		$(this.el).addClass('xispec_QCdiv-right');
// 		$('.gutter-horizontal').css('order', 0);
	},

	dockBottom: function(){
		$(this.dockBottomxispec_btn[0]).hide();
		$(this.dockRightxispec_btn[0]).show();
		this.title.text("Quality control plots");
		this.dock = 'bottom';
		$(this.el).parent().css('flex-direction', 'column');
		$(this.el).removeClass('xispec_QCdiv-right');
		$(this.contentDiv[0]).css('flex-direction', 'row');
		this.splitVertical();
		xiSPECUI.vent.trigger('resize:spectrum');
	},

	updatePlots: function(e){
		let plotId = $(e.target).attr('id');
		xiSPECUI.vent.trigger('QCPlotToggle', this.options.specPanelId, plotId);
		xiSPECUI.vent.trigger('resize:spectrum');
	}

});
