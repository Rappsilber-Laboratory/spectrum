//		a spectrum viewer
//
//      Copyright 2020 Rappsilber Laboratory, Edinburgh University
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
//		SpectrumWrapper.js

var SpectrumWrapper = Backbone.View.extend({
	events: {
			'click .xispec_toggleActiveSpecPanel' : 'toggleActive',
  		'click .xispec_closeSpecPanel' : 'close',
	},

	initialize: function(options) {

    // remove non-model options
		model_options = jQuery.extend({}, options.opt)
		delete model_options.targetDiv;
		delete model_options.showCustomConfig;
		delete model_options.showQualityControl;
		delete model_options.xiAnnotatorBaseURL;

  	this.xiAnnotatorBaseURL = options.opt.xiAnnotatorBaseURL;
    var id = options.id;

    // init models
    this.SpectrumModel = new AnnotatedSpectrumModel(model_options);
    this.SettingsSpectrumModel = new AnnotatedSpectrumModel(model_options);
    this.originalSpectrumModel = new AnnotatedSpectrumModel(model_options);

    // model event listeners
    this.originalSpectrumModel.listenTo(
  		this.SpectrumModel,
  		'change:moveLabels',
  		 function(spectrumModel){
  			this.set('moveLabels', spectrumModel.get('moveLabels'));
  		}
  	);
  	//sync moveLabels and measureMode
  	this.originalSpectrumModel.listenTo(
  		this.SpectrumModel,
  		'change:measureMode',
  		 function(spectrumModel){
  			this.set('measureMode', spectrumModel.get('measureMode'));
  		}
  	);
  	//sync mzRange
  	this.originalSpectrumModel.listenTo(
  		this.SpectrumModel,
  		'change:mzRange',
  		 function(spectrumModel){
  			this.setZoom(spectrumModel.get('mzRange'));
  		}
  	);
  	this.SpectrumModel.listenTo(
  		this.originalSpectrumModel,
  		'change:mzRange',
  		 function(spectrumModel){
  			this.setZoom(spectrumModel.get('mzRange'));
  		}
  	);

    var _html = ""
  		+"<div class='xispec_spectrumMainPlotDiv' id='xispec_spectrumMainPlotDiv"+id+"'>"
  		+"	<svg class='xispec_Svg' id='xispec_Svg"+id+"'></svg>"
  		+"</div>"
  		+"<div class='xispec_QCdiv' id='xispec_QCdiv"+id+"'>"
  		+"  <div class='xispec_subViewHeader'></div>"
  		+"	<div class='xispec_subViewContent'>"
  		+"	  <div class='xispec_subViewContent-plot' id='xispec_subViewContent-left"+id+"'>"
      +"      <svg id='xispec_errIntSVG"+id+"' class='xispec_errSVG'></svg>"
      +"    </div>"
  		+"	  <div class='xispec_subViewContent-plot' id='xispec_subViewContent-right"+id+"'>"
      +"      <svg id='xispec_errMzSVG"+id+"' class='xispec_errSVG'></svg>"
      +"    </div>"
  		+"	</div>"
  		+"</div>"
  	;

  	// empty the el
  	d3.select(this.el).selectAll("*").remove();

    // create the HTML element
  	var plotDiv = d3.select(this.el)
  		.append('div')
  		.attr ('id', 'xispec_spectrumWrapper'+id)
      .attr('class', 'xispec_plotsDiv')
  		.html (_html)
  	;

    // spectrum panel controls
    var specPanelControls = plotDiv.append('div')
      .attr('class', 'xispec_specPanelControls')
    ;
    var thumbTackIcon = specPanelControls.append('i')
      .attr('class', 'fa fa-thumb-tack xispec_toggleActiveSpecPanel')
      .attr ('id', 'xispec_toggleActiveSpecPanel'+id)
      .attr('aria-hidden', 'true')
      .attr('title', 'Activate this spectrum panel.')
    ;
    var closeIcon = specPanelControls.append('i')
      .attr('class', 'fa fa-times-circle xispec_closeSpecPanel')
      .attr ('id', 'xispec_closeSpecPanel'+id)
      .attr('aria-hidden', 'true')
      .attr('title', 'Close this spectrum panel.')
    ;

  	d3.select('#xispec_Svg'+id)
  		.append('g')
  		.attr('id', 'xispec_spectrumSvgGroup'+id)
  	;
  	d3.select('#xispec_Svg'+id)
  		.append('g')
  		.attr('id', 'xispec_measureTooltipSvgGroup'+id)
  	;

    // create Views
  	this.Spectrum = new SpectrumView({
  		model: this.SpectrumModel,
  		el: "#xispec_spectrumSvgGroup"+id,
  		measureTooltipSvgG: '#xispec_measureTooltipSvgGroup'+id,
  		identifier: "curSpectrum",
  	});
  	this.originalSpectrum = new SpectrumView({
  		model: this.originalSpectrumModel,
  		el: "#xispec_spectrumSvgGroup"+id,
  		measureTooltipSvgG: '#xispec_measureTooltipSvgGroup'+id,
  		invert: true,
  		hidden: true,
  		identifier: "originalSpectrum",
  	});
  	this.FragmentationKey = new FragmentationKeyView({
  		model: this.SpectrumModel,
  		el: "#xispec_Svg"+id,
  		identifier: "curFragmentationKey",
  	});
  	this.originalFragmentationKey = new FragmentationKeyView({
  		model: this.originalSpectrumModel,
  		el: "#xispec_Svg"+id,
  		invert: true,
  		hidden: true,
  		disabled: true,
  		identifier: "originalFragmentationKey",
  	});
  	this.InfoView = new PrecursorInfoView ({
  		model: this.SpectrumModel,
  		el: "#xispec_Svg"+id,
  		identifier: "curPrecursorInfo",
  	});
  	this.originalInfoView = new PrecursorInfoView ({
  		model: this.originalSpectrumModel,
  		el: "#xispec_Svg"+id,
  		invert: true,
  		hidden: true,
  		identifier: "originalPrecursorInfo",
  	});
  	this.QCwrapper = new QCwrapperView({
  		el: '#xispec_QCdiv'+id,
  		splitIds: ['#xispec_spectrumMainPlotDiv'+id, '#xispec_QCdiv'+id],
  		showQualityControl: options.showQualityControl,
  	});
  	this.ErrorIntensityPlot = new ErrorPlotView({
  		model: this.SpectrumModel,
  		el:"#xispec_subViewContent-left"+id,
  		xData: 'Intensity',
  		margin: {top: 10, right: 30, bottom: 20, left: 65},
  		svg: "#xispec_errIntSVG"+id,
  	});
  	this.ErrorMzPlot = new ErrorPlotView({
  		model: this.SpectrumModel,
  		el:"#xispec_subViewContent-right"+id,
  		xData: 'm/z',
  		margin: {top: 10, right: 30, bottom: 20, left: 65},
  		svg: "#xispec_errMzSVG"+id,
  	});
  	if(options.showQualityControl !== 'min')
  		xiSPECUI.vent.trigger('show:QC', true);
  },

  requestAnnotation: function(json_request, isOriginalMatchRequest, annotator){
  	if (json_request.annotation.requestID)
  		xiSPECUI.lastRequestedID = json_request.annotation.requestID;

  	var annotatorURL = "annotate/FULL";
  	if(annotator){
  		annotatorURL = annotator;
  	}

  	this.SpectrumModel.trigger('requestAnnotation:pending');
  	console.log("annotation request:", json_request);
  	var self = this;
  	var response = $.ajax({
  		type: "POST",
  		headers: {
  			'Accept': 'application/json',
  			'Content-Type': 'application/json'
  		},
  		data: JSON.stringify(json_request),
  		url: this.xiAnnotatorBaseURL + annotatorURL,
  		success: function(data) {
  			if (data && data.annotation && data.annotation.requestID && data.annotation.requestID === xiSPECUI.lastRequestedID) {
  				//ToDo: Error handling -> https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues/330
  				console.log("annotation response:", data);

  				if(isOriginalMatchRequest){
  					self.originalSpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
  					self.originalMatchRequest = $.extend(true, {}, json_request);
  				}

  				self.SpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
  				self.SettingsSpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
  				self.SettingsSpectrumModel.trigger("change:JSONdata");
  				self.SpectrumModel.trigger('requestAnnotation:done');
  			}

  		}
  	});
  },

  revertAnnotation: function(){
  	if(!this.SpectrumModel.get('changedAnnotation'))
  		return;
  	else {
  		this.SpectrumModel.reset_all_modifications();
  		this.SettingsSpectrumModel.reset_all_modifications();
  		this.requestAnnotation(this.originalMatchRequest);
  		this.SpectrumModel.set('changedAnnotation', false);
  	}
  },

  reloadAnnotation: function(){
  	this.SpectrumModel.reset_all_modifications();
  	this.SettingsSpectrumModel.reset_all_modifications();
  	this.requestAnnotation(this.originalMatchRequest);
  	this.SpectrumModel.set('changedAnnotation', false);
  },

	toggleActive: function(d){
    console.log('toggle');
		console.log(d);
	},

  close: function(){
    console.log('close');
	},

  clear: function(){
  	this.SpectrumModel.clear();
  	this.SettingsSpectrumModel.clear();
  },
});
