//		a spectrum viewer
//
//      Copyright  2015 Rappsilber Laboratory, Edinburgh University
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
//		author: Colin Combe, Lars Kolbowski
//
//		graph/Fragment.js

function Fragment (fragment, all_clusters){
	this.class = fragment.class;
	this.clusterIds = fragment.clusterIds;
	this.clusterInfo = fragment.clusterInfo;
	this.clusters = [];
	for (var i = 0; i < this.clusterIds.length; i++) {
		this.clusters.push(all_clusters[this.clusterIds[i]]);
	}
	this.id = fragment.id;
	this.isMonoisotopic = fragment.isMonoisotopic;
	this.mass = fragment.mass;
	this.name = fragment.name.trim();
	this.peptideId = fragment.peptideId;
	this.range = fragment.range;
	this.sequence = fragment.sequence;
	this.type = fragment.type;

	var ion = this.name.split('')[0];
	if (ion == 'a' || ion == 'b' || ion == 'c') {
		this.byType = 'bLike';
	} else if (ion == 'x' || ion == 'y' || ion == 'z'){
		this.byType = 'yLike';
	}
	else {
		this.byType = null;
	}

	var fragRegex = /[abcxyz]([0-9]+)(?:_.*)?/g;
	var regexMatch = fragRegex.exec(this.name);
	if(regexMatch)
		this.ionNumber = regexMatch[1] - 0;
	else
		this.ionNumber = null;

    this.lossy = false;
    if (this.class == "lossy"){
		this.lossy = true;
	}

	var crossLinkContainingRegex = /CrossLink\(.*n\|PeptideIon\)/g;

	this.crossLinkContaining = false;
	if(crossLinkContainingRegex.test(this.type))
		this.crossLinkContaining = true;

}

Fragment.prototype.get_charge = function(peak_id){
	// returns the charge state of this fragment for a given peak_id
	var cluster = this.clusters.filter(
		function(c){ if (c.firstPeakId == peak_id) return true;});

	return cluster[0].charge;
}
