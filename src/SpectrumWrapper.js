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


var SpectrumWrapper = function(model_options, options, targetDiv, id) {

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
  // options.targetDiv could be div itself or id of div - lets deal with that
	if (typeof targetDiv === "string"){
		if(targetDiv.charAt(0) == "#") targetDiv = targetDiv.substr(1);
		targetDiv = document.getElementById(targetDiv);
	} else {
		targetDiv = targetDiv;
	}
	// empty the targetDiv
	d3.select(targetDiv).selectAll("*").remove();

	d3.select(targetDiv)
		.append('div')
		.attr ('id', 'xispec_spectrumWrapper'+id)
    .attr('class', 'xispec_plotsDiv')
		.html (_html)
	;
	d3.select('#xispec_Svg'+id)
		.append('g')
		.attr('id', 'xispec_spectrumSvgGroup'+id)
	;
	d3.select('#xispec_Svg'+id)
		.append('g')
		.attr('id', 'xispec_measureTooltipSvgGroup'+id)
	;

	this.Spectrum = new SpectrumView({
		model: this.SpectrumModel,
		el: "#xispec_spectrumSvgGroup"+id,
		measureTooltipSvgG: '#xispec_measureTooltipSvgGroup',
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
		xiSPEC.vent.trigger('show:QC', true);

}
