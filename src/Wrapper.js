// xiSPEC Spectrum Viewer
// Copyright 2016 Rappsilber Laboratory, University of Edinburgh
//
// This product includes software developed at
// the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
// author: Lars Kolbowski
//
// Wrapper.js

'use strict'

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

	this.options = _.extend(defaultOptions, options);
	this.xiAnnotatorBaseURL = this.options.xiAnnotatorBaseURL;

	// remove non-model options
	this.model_options = jQuery.extend({}, this.options)
	delete this.model_options.targetDiv;
	delete this.model_options.showCustomConfig;
	delete this.model_options.showQualityControl;
	delete this.model_options.xiAnnotatorBaseURL;

	// options.targetDiv could be div itself or id of div - lets deal with that
	if (typeof this.options.targetDiv === "string"){
		if(this.options.targetDiv.charAt(0) == "#") this.options.targetDiv = this.options.targetDiv.substr(1);
		this.options.targetDiv = document.getElementById(this.options.targetDiv);
	} else {
		this.options.targetDiv = this.options.targetDiv;
	}
	// empty the targetDiv
	d3.select(this.options.targetDiv).selectAll("*").remove();


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
	;
	d3.select(this.options.targetDiv)
		.append("div")
		.attr ("id", 'xispec_spectrumPanel')
		.html (_html)
	;

	this.spectraWrapperDiv = d3.select('#xispec_spectrumPanel')
		.append('div')
		.attr ('class', 'xispec_spectrawrapper')
		.attr ('id', 'xispec_spectrawrapper')

	//init SpectrumWrapper
	this.spectra = [];
	this.activeSpectrum = this.addSpectrum();

	this.SpectrumControls = new SpectrumControlsView({
		model: this.activeSpectrum.SpectrumModel,
		el: "#xispec_spectrumControls",
	});
	this.SettingsView = new SpectrumSettingsView({
		model: this.activeSpectrum.SettingsSpectrumModel,
		displayModel: this.activeSpectrum.SpectrumModel,
		el:"#xispec_settingsWrapper",
		showCustomCfg: this.options.showCustomConfig,
	});

	//ToDo: make extra spectrum controls model with mzRange, moveLabels, measureMode?
	this.lockZoom = false;

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

	// this.activeSpectrum.SpectrumModel.customConfig = data.customConfig;
	this.originalMatchRequest = $.extend(true, {}, json_request);
	this.activeSpectrum.SpectrumModel.set('changedAnnotation', false);
	this.activeSpectrum.SpectrumModel.reset_all_modifications();
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

	this.activeSpectrum.SpectrumModel.trigger('request_annotation:pending');
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
					self.activeSpectrum.originalSpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
					self.activeSpectrum.originalMatchRequest = $.extend(true, {}, json_request);
				}

				self.activeSpectrum.SpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
				self.activeSpectrum.SettingsSpectrumModel.set({"JSONdata": data, "JSONrequest": json_request});
				self.activeSpectrum.SettingsSpectrumModel.trigger("change:JSONdata");
				self.activeSpectrum.SpectrumModel.trigger('request_annotation:done');
			}

		}
	});
},

xiSPEC.revertAnnotation = function(){
	if(!this.activeSpectrum.SpectrumModel.get('changedAnnotation'))
		return;
	else {
		this.activeSpectrum.SpectrumModel.reset_all_modifications();
		this.activeSpectrum.SettingsSpectrumModel.reset_all_modifications();
		this.request_annotation(this.originalMatchRequest);
		this.activeSpectrum.SpectrumModel.set('changedAnnotation', false);
	}
},

xiSPEC.reloadAnnotation = function(){
	this.activeSpectrum.SpectrumModel.reset_all_modifications();
	this.activeSpectrum.SettingsSpectrumModel.reset_all_modifications();
	this.request_annotation(this.originalMatchRequest);
	this.activeSpectrum.SpectrumModel.set('changedAnnotation', false);
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
	this.activeSpectrum.SpectrumModel.clear();
	this.activeSpectrum.SettingsSpectrumModel.clear();
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

xiSPEC.addSpectrum = function(){
	var num_spec = this.spectra.length;
	this.spectraWrapperDiv.append('div')
		.attr('class', 'xispec_plotsDiv')
		.attr('id', 'xispec_spec'+num_spec)
	;
	var new_spec = new SpectrumWrapper(this.model_options, this.options, 'xispec_spec'+num_spec, num_spec);
	this.spectra.push(new_spec);
	return new_spec;
}
