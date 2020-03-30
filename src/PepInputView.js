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
//		authors: Lars Kolbowski
//
//
//		PepInputView.js

var PepInputView = Backbone.View.extend({

  events: {
    "input":  "contentChanged",
    //"keyup": "contentChanged",
  },

  initialize: function() {
    this.listenTo(this.model, 'changed:data', this.render);
  },

  contentChanged: function(e) {
    var pepStrs = this.el.value.split(";");

    var peptides = [];
    var linkSites = [];

    for (var i = 0; i < pepStrs.length; i++) {

      if(pepStrs[i] != ''){
        var firstChar = pepStrs[i][0];
        if (firstChar == firstChar.toLowerCase()){
          alert('peptide sequence must start with an amino acid.');
          return;
        }
      }

      var pep_noMods = pepStrs[i].replace(/([^#0-9])([^A-Z#]+)/g, '$1');

      //linkSite
      var cl_re = /#([0-9]+)?/g;
      while ((match = cl_re.exec(pep_noMods)) != null) {
        var clIndex = match[1] === undefined ? 0 : match[1];
        var linkSite = {'id': clIndex, 'peptideId': i, 'linkSite': match.index-1};
        linkSites.push(linkSite);
      }

      //peptide sequence
      var pepAAseq = pepStrs[i].replace(/[^A-Z]/g, "");
      var peptide = {'sequence': []};
      for (var j = 0; j < pepAAseq.length; j++) {
        peptide['sequence'].push({'aminoAcid': pepAAseq[j], 'Modification': ''});
      }

      //add in mods
      var pep_noCL = pepStrs[i].replace(cl_re, "");
      var modifications = [];
      var mod_re = /([^A-Z#]+)/g;
      var offset = 1;
      while ((match = mod_re.exec(pep_noCL)) != null) {
        peptide['sequence'][match.index-offset].Modification = match[1];
        offset += match[1].length;
      }

      peptides.push(peptide);
    }

    //update model with input data
    if (this.model.get("JSONdata") !== undefined && this.model.get("JSONdata") !== null){
      this.model.get("JSONdata").Peptides = peptides;
      this.model.get("JSONdata").LinkSite = linkSites;
      this.model.trigger("change:JSONdata");
    }
    else
      this.model.set({JSONdata: {'Peptides': peptides, 'LinkSite': linkSites} });
  },

  clear: function() {
    this.el.value = '';
  },

  render: function() {
    if(this.model.peptides === undefined || this.model.get("JSONdata") === null)
      return;

    var pepStrsArr = [];
    for(i=0; i < this.model.peptides.length; i++){
      pepStrsArr[i] = "";
      for(j = 0; j < this.model.peptides[i].sequence.length; j++){
        pepStrsArr[i] += this.model.peptides[i].sequence[j].aminoAcid+this.model.peptides[i].sequence[j].Modification;
        //insert the # for the crosslink
        if (this.model.get("JSONdata").LinkSite.length > 0){
          for (var k = 0; k < this.model.get("JSONdata").LinkSite.length; k++) {
            if (this.model.get("JSONdata").LinkSite[k].peptideId == i && this.model.get("JSONdata").LinkSite[k].linkSite == j)
              pepStrsArr[i] += "#";
          }
        }
      }
    }
    var pepsStr = pepStrsArr.join(";");

    // only update the input field if the string differs
    if (this.el.value != pepsStr){
      this.clear();
      this.el.value = pepsStr;
    }

  },




});
