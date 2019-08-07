//	xiSPEC Spectrum Viewer
//	Copyright 2016 Rappsilber Laboratory, University of Edinburgh
//
//	This product includes software developed at
//	the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//	author: Lars Kolbowski
//
//	Wrapper.js

"use strict";

var xiSPEC = {};
var xiSPEC = xiSPEC || {};
var CLMSUI = CLMSUI || {};
// http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views
xiSPEC.vent = {};
_.extend (xiSPEC.vent, Backbone.Events);

_.extend(window, Backbone.Events);
window.onresize = function() { window.trigger('resize') };

xiSPEC.init = function(options) {

	var defaultOptions = {
		targetDiv: 'xispec_wrapper',
		showCustomConfig: false,
		showQualityControl: 'bottom',
		baseDir:  './',
		xiAnnotatorBaseURL: 'https://spectrumviewer.org/xiAnnotator/',
		knownModifications: [],
		knownModificationsURL: false,
	};

	options = _.extend(defaultOptions, options);

	// remove non-model options
	var model_options = jQuery.extend({}, options)
	delete model_options.targetDiv;
	delete model_options.showCustomConfig;
	delete model_options.showQualityControl;
	delete model_options.xiAnnotatorBaseURL;

	// options.targetDiv could be div itself or id of div - lets deal with that
	if (typeof options.targetDiv === "string"){
		if(options.targetDiv.charAt(0) == "#") options.targetDiv = options.targetDiv.substr(1);
		options.targetDiv = document.getElementById(options.targetDiv);
	} else {
		options.targetDiv = options.targetDiv;
	}

	d3.select(options.targetDiv).selectAll("*").remove();

	this.xiAnnotatorBaseURL = options.xiAnnotatorBaseURL;

	//init models
	this.SpectrumModel = new AnnotatedSpectrumModel(model_options);
	this.SettingsSpectrumModel = new AnnotatedSpectrumModel(model_options);
	this.originalSpectrumModel = new AnnotatedSpectrumModel(model_options);

	//ToDo: make extra spectrum controls model with mzRange, moveLabels, measureMode?
	this.lockZoom = false;
	//sync moveLabels and measureMode
	this.originalSpectrumModel.listenTo(
		this.SpectrumModel,
		'change:moveLabels',
		 function(spectrumModel){
			this.set('moveLabels', spectrumModel.get('moveLabels'));
		}
	);
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
		+"<div class='xispec_dynDiv' id='xispec_settingsWrapper'>"
		+"	<div class='xispec_dynDiv_moveParentDiv'>"
		+"		<span class='xispec_dynTitle'>Spectrum settings</span>"
		+"		<i class='fa fa-times-circle xispec_settingsCancel' id='closeSettings'></i>"
		+"	</div>"
		+"	<div class='xispec_dynDiv_resizeDiv_tl draggableCorner'></div>"
		+"	<div class='xispec_dynDiv_resizeDiv_tr draggableCorner'></div>"
		+"	<div class='xispec_dynDiv_resizeDiv_bl draggableCorner'></div>"
		+"	<div class='xispec_dynDiv_resizeDiv_br draggableCorner'></div>"
		+"</div>"
		+"<div id='xispec_spectrumControls'></div>"
		+"<div class='xispec_plotsDiv'>"
		+"  <div id='xispec_spectrumMainPlotDiv'>"
		+"	  <svg id='xispec_Svg'></svg>"
		+"  </div>"
		+"  <div id='xispec_QCdiv'>"
		+"	  <div class='xispec_subViewHeader'></div>"
		+"	  <div class='xispec_subViewContent'>"
		+"		  <div class='xispec_subViewContent-plot' id='xispec_subViewContent-left'><svg id='xispec_errIntSVG' class='xispec_errSVG'></svg></div>"
		+"		  <div class='xispec_subViewContent-plot' id='xispec_subViewContent-right'><svg id='xispec_errMzSVG' class='xispec_errSVG'></svg></div>"
		+"	  </div>"
		+"  </div>"
		+"</div>"
		+"</div>"
	;

	d3.select(options.targetDiv)
		.append("div")
		.attr ("id", 'xispec_spectrumPanel')
		.html (_html)
	;
	d3.select('#xispec_Svg')
		.append('g')
		.attr('id', 'xispec_spectrumSvgGroup')
	;
	d3.select('#xispec_Svg')
		.append('g')
		.attr('id', 'xispec_measureTooltipSvgGroup')
	;
	this.SpectrumControls = new SpectrumControlsView({
		model: this.SpectrumModel,
		el: "#xispec_spectrumControls",
	});
	this.Spectrum = new SpectrumView({
		model: this.SpectrumModel,
		el: "#xispec_spectrumSvgGroup",
		measureTooltipSvgG: '#xispec_measureTooltipSvgGroup',
		identifier: "curSpectrum",
	});
	this.originalSpectrum = new SpectrumView({
		model: this.originalSpectrumModel,
		el: "#xispec_spectrumSvgGroup",
		measureTooltipSvgG: '#xispec_measureTooltipSvgGroup',
		invert: true,
		hidden: true,
		identifier: "originalSpectrum",
	});
	this.FragmentationKey = new FragmentationKeyView({
		model: this.SpectrumModel,
		el: "#xispec_Svg",
		identifier: "curFragmentationKey",
	});
	this.originalFragmentationKey = new FragmentationKeyView({
		model: this.originalSpectrumModel,
		el: "#xispec_Svg",
		invert: true,
		hidden: true,
		disabled: true,
		identifier: "originalFragmentationKey",
	});
	this.InfoView = new PrecursorInfoView ({
		model: this.SpectrumModel,
		el: "#xispec_Svg",
		identifier: "curPrecursorInfo",
	});
	this.originalInfoView = new PrecursorInfoView ({
		model: this.originalSpectrumModel,
		el: "#xispec_Svg",
		invert: true,
		hidden: true,
		identifier: "originalPrecursorInfo",
	});
	this.QCwrapper = new QCwrapperView({
		el: '#xispec_QCdiv',
		showQualityControl: options.showQualityControl,
	});
	this.ErrorIntensityPlot = new ErrorPlotView({
		model: this.SpectrumModel,
		el:"#xispec_subViewContent-left",
		xData: 'Intensity',
		margin: {top: 10, right: 30, bottom: 20, left: 65},
		svg: "#xispec_errIntSVG",
	});
	this.ErrorMzPlot = new ErrorPlotView({
		model: this.SpectrumModel,
		el:"#xispec_subViewContent-right",
		xData: 'm/z',
		margin: {top: 10, right: 30, bottom: 20, left: 65},
		svg: "#xispec_errMzSVG",
	});
	if(options.showQualityControl !== 'min')
		xiSPEC.vent.trigger('show:QC', true);

	this.SettingsView = new SpectrumSettingsView({
		model: this.SettingsSpectrumModel,
		displayModel: this.SpectrumModel,
		el:"#xispec_settingsWrapper",
		showCustomCfg: options.showCustomConfig,
	});


};

xiSPEC.setData = function(data){
	// EXAMPLE:
	// xiSPEC.setData({
	// sequence1: "KQTALVELVK",
	// sequence2: "QNCcarbamidomethylELFEQLGEYKFQNALLVR",
	// linkPos1: 1,
	// linkPos2: 13,
	// crossLinkerModMass: 0,
	// modifications: [{id: 'carbamidomethyl', mass: 57.021464, aminoAcids: ['C']}],
	// losses: [{ id: 'H2O', specificity: ['D', 'S', 'T', 'E', 'CTerm'], mass: 18.01056027}],
	// precursorCharge: 3,
	// fragmentTolerance: {"tolerance": '20.0', 'unit': 'ppm'},
	// ionTypes: "peptide;b;y",
	// precursorMz: 1012.1,
	// peakList: [[mz, int], [mz, int], ...],
	// requestId: 1,
	// }

	this.vent.trigger('butterflyToggle', false);
	$('#xispec_butterflyChkbx').prop('checked', false);	//ToDo: move to SpectrumControlsView

	var json_request = this.convert_to_json_request(data);

	if (this.customConfigOverwrite)
		json_request.annotation.custom = this.customConfigOverwrite;

	// this.SpectrumModel.customConfig = data.customConfig;
	this.originalMatchRequest = $.extend(true, {}, json_request);
	this.SpectrumModel.set('changedAnnotation', false);
	this.SpectrumModel.reset_all_modifications();
	this.request_annotation(json_request, true);

};

xiSPEC.request_annotation = function(json_request, isOriginalMatchRequest, annotator){

	// if (this.keepCustomConfig) {
	// 	json_request['annotation']['custom'] = this.customConfig;
	// }

	if (json_request.annotation.requestID)
		this.lastRequestedID = json_request.annotation.requestID;

	var annotatorURL = "annotate/FULL";
	if(annotator){
		annotatorURL = annotator;
	}

	this.SpectrumModel.trigger('request_annotation:pending');
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
			if (data && data.annotation && data.annotation.requestID && data.annotation.requestID === self.lastRequestedID) {
				//ToDo: Error handling -> https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues/330
				console.log("annotation response:", data);

				if(isOriginalMatchRequest){
					self.originalSpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
					self.originalMatchRequest = $.extend(true, {}, json_request);
				}

				self.SpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
				self.SettingsSpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
				self.SettingsSpectrumModel.trigger("change:JSONdata");
				self.SpectrumModel.trigger('request_annotation:done');
			}

		}
	});
},

xiSPEC.revertAnnotation = function(){
	if(!this.SpectrumModel.get('changedAnnotation'))
		return;
	else {
		this.SpectrumModel.reset_all_modifications();
		this.SettingsSpectrumModel.reset_all_modifications();
		this.request_annotation(this.originalMatchRequest);
		this.SpectrumModel.set('changedAnnotation', false);
	}
},

xiSPEC.sanityChecks = function(data){

	// ToDo: create sanityChecks
	// if(data.sequence2 !== undefined){
	// 	if(data.linkPos1 === undefined || data.linkPos2 === undefined){
	// 		alert('sequence')
	// 		return false;
	// 	}
	// }

	return true;
};

xiSPEC.clear = function(){
	this.SpectrumModel.clear();
	this.SettingsSpectrumModel.clear();
};

xiSPEC.convert_to_json_request = function (data) {

	if (!this.sanityChecks(data)) return false;


	// defaults
	if(data.ionTypes === undefined){
		data.ionTypes = "peptide;b;y";
	}
	if(data.crossLinkerModMass === undefined){
		data.crossLinkerModMass = 0;
	}
	if(data.modifications === undefined){
		data.modifications = [];
	}
	if(data.losses === undefined){
		data.losses === [];
	}
	if(data.fragmentTolerance === undefined){
		data.fragmentTolerance = {"tolerance": '10.0', 'unit': 'ppm'};
	}
	if(data.requestID === undefined){
		data.requestID = -1;
	}


	var annotationRequest = {};
	var peptides = [];
	var linkSites = [];
	peptides[0] = xiSPEC.arrayifyPeptide(data.sequence1);

	if(data.linkPos1 !== undefined){
		linkSites[0] = {"id":0, "peptideId":0, "linkSite": data.linkPos1};
	}
	if (data.sequence2 !== undefined) {
		peptides[1] = xiSPEC.arrayifyPeptide(data.sequence2);
		linkSites[1] = {"id":0, "peptideId":1, "linkSite": data.linkPos2}
	}

	var peaks = [];
	for (var i = 0; i < data.peakList.length; i++) {
		peaks.push(
			{"intensity": data.peakList[i][1], "mz": data.peakList[i][0]}
		);
	}

	annotationRequest.Peptides = peptides;
	annotationRequest.LinkSite = linkSites;
	annotationRequest.peaks = peaks;
	annotationRequest.annotation = {};

	var ionTypes = data.ionTypes.split(";");
	//remove empty strings from list
	ionTypes = ionTypes.filter(Boolean);
	var ions = [];
	for (var it = 0; it < ionTypes.length; it++) {
		var ionType = ionTypes[it];
		ions.push({"type": (ionType.charAt(0).toUpperCase() + ionType.slice(1) + "Ion")});
	}
	annotationRequest.annotation.fragmentTolerance = data.fragmentTolerance;
	annotationRequest.annotation.modifications = data.modifications;
	annotationRequest.annotation.ions = ions;
	annotationRequest.annotation.crosslinker = {'modMass': data.crossLinkerModMass};
	annotationRequest.annotation.precursorMZ = +data.precursorMZ;
	annotationRequest.annotation.precursorCharge = +data.precursorCharge;
	annotationRequest.annotation.losses = data.losses;
	annotationRequest.annotation.requestID = data.requestID.toString();
	annotationRequest.annotation.custom = data.customConfig;

	console.log("request", annotationRequest);
	return annotationRequest;

};


xiSPEC.setCustomConfigOverwrite = function(customConfig){
	// this.SettingsSpectrumModel.customConfigOverwrite = customConfig;
	// this.SpectrumModel.customConfigOverwrite = customConfig;
	this.customConfigOverwrite = customConfig;
};

xiSPEC.arrayifyPeptide = function (seq_mods) {
	var peptide = {};
	peptide.sequence = [];

	var seq_AAonly = seq_mods.replace(/[^A-Z]/g, '')
	var seq_length = seq_AAonly.length;

	for (var i = 0; i < seq_length; i++) {
		peptide.sequence[i] = {"aminoAcid":seq_AAonly[i], "Modification": ""}
	}

	var re = /[^A-Z]+/g;
	var offset = 1;
	var result;
	while (result = re.exec(seq_mods)) {
		peptide.sequence[result.index - offset]["Modification"] = result[0];
		offset += result[0].length;
	}
	return peptide;
};

xiSPEC.matchMassToAA = function(mass, tolerance) {

	if (tolerance === undefined) tolerance = 0.01;

	var aminoAcids = [
		{"aminoAcid": "A", "monoisotopicMass": 71.03711},
		{"aminoAcid": "R", "monoisotopicMass": 156.10111},
		{"aminoAcid": "N", "monoisotopicMass": 114.04293},
		{"aminoAcid": "D", "monoisotopicMass": 115.02694},
		{"aminoAcid": "C", "monoisotopicMass": 103.00919},
		{"aminoAcid": "E", "monoisotopicMass": 129.04259},
		{"aminoAcid": "Q", "monoisotopicMass": 128.05858},
		{"aminoAcid": "G", "monoisotopicMass": 57.02146},
		{"aminoAcid": "H", "monoisotopicMass": 137.05891},
		{"aminoAcid": "I", "monoisotopicMass": 113.08406},
		{"aminoAcid": "L", "monoisotopicMass": 113.08406},
		{"aminoAcid": "K", "monoisotopicMass": 128.09496},
		{"aminoAcid": "M", "monoisotopicMass": 131.04049},
		{"aminoAcid": "F", "monoisotopicMass": 147.06841},
		{"aminoAcid": "P", "monoisotopicMass": 97.05276},
		{"aminoAcid": "S", "monoisotopicMass": 87.03203},
		{"aminoAcid": "T", "monoisotopicMass": 101.04768},
		{"aminoAcid": "W", "monoisotopicMass": 186.07931},
		{"aminoAcid": "Y", "monoisotopicMass": 163.06333},
		{"aminoAcid": "V", "monoisotopicMass": 99.06841}
	]

	var aaArray = aminoAcids.filter(function(d){
		if (Math.abs(mass - d.monoisotopicMass) < tolerance)
			return true;
	}).map(function(d){return d.aminoAcid});

	return aaArray.join();
};
