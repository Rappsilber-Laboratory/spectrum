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
//		SpectrumControlView.js

var xiSPEC = xiSPEC || {};
var CLMSUI = CLMSUI || {};

var SpectrumControlsView = Backbone.View.extend({

	events : {
		'click #xispec_reset' : 'resetZoom',
		'submit #xispec_setrange' : 'setrange',
		'click #xispec_lockZoom' : 'lockZoom',
		'click #xispec_clearHighlights' : 'clearHighlights',
		'click #xispec_measuringTool': 'toggleMeasuringMode',
		'click #xispec_moveLabels': 'toggleMoveLabels',
		'click #xispec_dl_spectrum_SVG': 'downloadSpectrumSVG',
		'click #xispec_toggleSettings' : 'toggleSettings',
		'click #xispec_revertAnnotation' : 'revertAnnotation',
		'click #xispec_toggleSpecList' : 'toggleSpecList',
	},

	initialize: function() {

		this.listenTo(this.model, "change:mzRange", this.updateRange);
		this.listenTo(this.model, 'change:changedAnnotation', this.changedAnnotation);

		this.wrapper = d3.select(this.el);

		var extra_controls_before = this.wrapper.append('span')
			.attr("id", "xispec_extra_spectrumControls_before")
		;

		var downloadSVG = this.wrapper.append('i')
			.attr('class', 'xispec_btn xispec_btn-1a xispec_btn-topNav fa fa-download')
			.attr('aria-hidden', 'true')
			.attr('id', 'xispec_dl_spectrum_SVG')
			.attr('title', 'download SVG')
			.attr('style', 'cursor: pointer;')
		;

		var moveLabelsLabel = this.wrapper.append('label')
			.attr('class', 'xispec_btn')
			.text("Move Labels")
		;

		var moveLabelCheckbox = moveLabelsLabel.append('input')
			.attr('id', 'xispec_moveLabels')
			.attr('type', 'checkbox')
		;

		var toggleMeasureLabel = this.wrapper.append('label')
			.attr('class', 'xispec_btn')
			.attr('title', 'measure mode on/off')
			.text("Measure")
		;

		var toggleMeasureCheckbox = toggleMeasureLabel.append('input')
			.attr('class', 'pointer')
			.attr('id', 'xispec_measuringTool')
			.attr('type', 'checkbox')
		;

		var setRangeForm = this.wrapper.append('form')
			.attr('id', 'xispec_setrange')
		;

		var mzRangeLabel = setRangeForm.append('label')
			.attr('class', 'xispec_btn')
			.attr('title', 'm/z range')
			.attr('style', 'cursor: default;')
			.text("m/z:")
		;

		var lockZoomLabel = setRangeForm.append('label')
			.attr('class', 'xispec_btn')
			.attr('id', 'xispec_lock')
			.attr('for', 'xispec_lockZoom')
			.attr('title', 'Lock current zoom level')
			.text("🔓")
		;

		var lockZoomCheckbox = setRangeForm.append('input')
			.attr('id', 'xispec_lockZoom')
			.attr('type', 'checkbox')
			.attr('style', 'display: none;')
		;

		var mzRangeFrom = setRangeForm.append('input')
			.attr('id', 'xispec_xleft')
			.attr('type', 'text')
			.attr('size', '5')
			.attr('title', 'm/z range from:')
		;

		setRangeForm.append('span').text('-');

		var mzRangeTo = setRangeForm.append('input')
			.attr('id', 'xispec_xright')
			.attr('type', 'text')
			.attr('size', '5')
			.attr('title', 'm/z range to:')
		;

		// var mzRangeSubmit = setRangeForm.append('input')
		// 	.attr('id', 'rangeSubmit')
		// 	.attr('type', 'submit')
		// ;

		var mzRangeError = setRangeForm.append('span').attr('id', 'xispec_range-error');

		var resetZoomButtom = setRangeForm.append('button')
			.attr('id', 'xispec_reset')
			.attr('class', 'xispec_btn xispec_btn-1 xispec_btn-1a')
			.text('Reset Zoom')
			.attr('title', 'Reset to initial zoom level')
		;

		var toggleSettingsButton = this.wrapper.append('i')
			.attr('class', 'xispec_btn xispec_btn-1a xispec_btn-topNav fa fa-cog')
			.attr('aria-hidden', 'true')
			.attr('id', 'xispec_toggleSettings')
			.attr('title', 'Show/Hide Settings')
			// .attr('style', 'cursor: pointer;')
		;

		var reverAnnotationButton = this.wrapper.append('i')
			.attr('class', 'xispec_btn xispec_btn-topNav fa fa-undo xispec_disabled')
			.attr('aria-hidden', 'true')
			.attr('id', 'xispec_revertAnnotation')
			.attr('title', 'revert to original annotation')
			// .attr('style', 'cursor: pointer;')
		;

		var extra_controls_after = this.wrapper.append('span')
			.attr("id", "xispec_extra_spectrumControls_after")
		;

		var helpLink = this.wrapper.append('a')
			.attr('href', 'http://spectrumviewer.org/help.php')
			.attr('target', '_blank')
		;
		var helpButton = this.wrapper.append('i')
			.attr('class', 'xispec_btn xispec_btn-1a xispec_btn-topNav fa fa-question')
			.attr('aria-hidden', 'true')
			.attr('title', 'Help')
			// .attr('style', 'cursor: pointer;')
		;
		// +'	<input type="submit" id="rangeSubmit" class="xispec_btn xispec_btn-1 xispec_btn-1a" style="display: none;">'

	},

	toggleSettings: function(event){
		event.stopPropagation();
		xiSPEC.vent.trigger('spectrumSettingsToggle', true);

	},

	updateRange: function(){
		var mzRange = this.model.get('mzRange');
		$("#xispec_xleft").val(mzRange[0]);
		$("#xispec_xright").val(mzRange[1]);
	},

	lockZoom: function(){
		if ($('#xispec_lockZoom').is(':checked')) {
			$('#xispec_lock')[0].innerHTML = "&#128274";
			// $('#rangeSubmit').prop('disabled', true);
			$('#xispec_xleft').prop('disabled', true);
			$('#xispec_xright').prop('disabled', true);
			this.model.set('lockZoom', true);
			// this.graph.disableZoom();
		} else {
			$('#xispec_lock')[0].innerHTML = "&#128275";
			// $('#rangeSubmit').prop('disabled', false);
			$('#xispec_xleft').prop('disabled', false);
			$('#xispec_xright').prop('disabled', false);
			this.model.set('lockZoom', false);
			// this.graph.enableZoom();
		}
	},

	toggleMeasuringMode: function(e){
		var $target = $(e.target);
		var selected = $target .is(':checked');
		this.model.set('measureMode', selected);
	},

	toggleMoveLabels: function(e){
		var $target = $(e.target);
		var selected = $target.is(':checked');
		this.model.set('moveLabels', selected);
	},

	setrange: function(e){
		e.preventDefault();
		var xl = xispec_xleft.value-0;
		var xr = xispec_xright.value-0;
		if (xl > xr){
			$("#xispec_range-error").show();
			$("#xispec_range-error").html("Error: "+xl+" is larger than "+xr);
		}
		else{
			$("#xispec_range-error").hide();
			this.model.set('mzRange', [xl, xr]);
			// this.graph.resize(xl, xr, this.model.ymin, this.model.ymax);
		}

	},


	resetZoom: function(){
		this.model.resetZoom();
	},

	downloadSpectrumSVG: function(){
		xiSPEC.vent.trigger('downloadSpectrumSVG');
	},

	toggleSpecList: function(){
		xiSPEC.vent.trigger('toggleTableView');
	},

	revertAnnotation: function(){
		if(this.model.get('changedAnnotation')){
			this.model.revertAnnotation();
		};
	},

	changedAnnotation: function(){
		if(this.model.get('changedAnnotation')){
			$('#xispec_revertAnnotation').addClass('xispec_btn-1a');
			$('#xispec_revertAnnotation').removeClass('xispec_disabled');
		}
		else{
			$('#xispec_revertAnnotation').removeClass('xispec_btn-1a');
			$('#xispec_revertAnnotation').addClass('xispec_disabled');
		}
	},

});
