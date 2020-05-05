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
//		AppearanceSettingsView.js

var xiSPECUI = xiSPECUI || {};
var CLMSUI = CLMSUI || {};

let AppearanceSettingsView = SettingsView.extend({

    events: function() {
        return _.extend({}, SettingsView.prototype.events, {
            'click #xispec_lossyChkBx': 'showLossy',
            'click #xispec_absErrChkBx': 'absErrToggle',
            'click #xispec_accentuateCLcontainingChkBx': 'accentuateCLcontainingToggle',
            'click #xispec_labelFragmentCharge': 'chargeLabelToggle',
            'change #xispec_settingsLabelingCutoff': 'setLabelCutoff',
            'change #xispec_settingsLabelFontSize': 'setLabelFontSize',
            'change #xispec_colorSelector': 'changeColorScheme',
            'change #xispec_settingsDecimals': 'changeDecimals',
            'change #highlightColor': 'updateJsColor',
            'change #xispec_peakHighlightMode': 'changePeakHighlightMode',
        });
    },

    identifier: "Appearance Settings",

    initialize: function (options) {
        // load default options and super initialize the parent view
        const defaultOptions = {
            tabs: ["general", "labels"]
        };
        this.options = _.extend(defaultOptions, options);
        arguments[0] = this.options;
        AppearanceSettingsView.__super__.initialize.apply(this, arguments);

        this.displayModel = this.options.displayModel;
        // event listeners
        this.listenTo(xiSPECUI.vent, 'appearanceSettingsToggle', this.toggleView);

        // general
        let generalTab = this.mainDiv.append("div")
            .attr("class", "xispec_settings-tab xispec_flex-column")
            .attr("id", "xispec_general_tab")
        ;
        let colorSchemeSelector = generalTab.append("label").text("Color scheme: ")
            .append("select").attr("id", 'xispec_colorSelector').attr("class", 'xispec_form-control pointer')
        ;
        let colOptions = [
            {value: "RdBu", text: "Red (& Blue)"},
            {value: "BrBG", text: "Brown (& Teal)"},
            {value: "PiYG", text: "Pink (& Green)"},
            {value: "PRGn", text: "Purple (& Green)"},
            {value: "PuOr", text: "Orange (& Purple)"},
        ];
        d3.select("#xispec_colorSelector").selectAll("option").data(colOptions)
            .enter()
            .append("option")
            .attr("value", function (d) {
                return d.value;
            })
            .text(function (d) {
                return d.text;
            })
        ;
        this.highlightColorSelector = generalTab.append("label").text("Highlight Color: ")
            .append("input")
            .attr("class", "jscolor pointer")
            .attr("id", "xispec_highlightColor")
            .attr("value", this.model.get('highlightColor'))
            .attr("type", "text")
            .attr("style", "width: 103px;")
        ;
        jscolor.installByClassName("jscolor");

        let highlightingModeChkBx = generalTab.append("label").text("Hide not selected fragments: ")
            .append("input").attr("type", "checkbox").attr("id", "xispec_peakHighlightMode")
        ;
        this.decimals = generalTab.append("label").text("Number of decimals to display: ")
            .append("input").attr("type", "number").attr("id", "xispec_settingsDecimals")
            .attr("min", "1").attr("max", "10").attr("autocomplete", "off")
        ;
        this.absoluteError = generalTab.append("label").text("Absolute error values (QC): ")
            .append("input").attr("type", "checkbox").attr("id", "xispec_absErrChkBx")
        ;
        this.accentuateCrossLinkContaining = generalTab.append("label").text("accentuate crosslink containing fragments: ")
            .append("input").attr("type", "checkbox").attr("id", "xispec_accentuateCLcontainingChkBx")
        ;
        // label tab
        let labelsTab = this.mainDiv.append("div")
            .attr("class", "xispec_settings-tab xispec_flex-column")
            .attr("id", "xispec_labels_tab")
            .style('display', 'none')
        ;
        let lossyChkBx = labelsTab.append("label").text("Show neutral loss labels: ")
            .append("input").attr("type", "checkbox").attr("id", "xispec_lossyChkBx")
        ;
        this.labelFragmentCharge = labelsTab.append("label").text("label fragment charge: ")
            .append("input").attr("type", "checkbox").attr("id", "xispec_labelFragmentCharge")
        ;

        this.labelFilter = labelsTab.append("label").text("labeling cutoff (% base peak): ")
            .append("input").attr("type", "number").attr("id", "xispec_settingsLabelingCutoff")
            .attr("min", "0").attr("max", "100").attr("autocomplete", "off")
            .attr("value", 0)
        ;

        this.labelFontSize = labelsTab.append("label").text("label font size (px): ")
            .append("input").attr("type", "number").attr("id", "xispec_settingsLabelFontSize")
            .attr("min", "1").attr("max", "50").attr("autocomplete", "off")
            .attr("value", this.model.labelFontSize)
        ;
        // end Tabs

        let d3el = d3.select(this.el);
        d3el.selectAll("label").classed("xispec_label", true);
        d3el.selectAll("input[type=text]").classed("xispec_form-control", true);
        d3el.selectAll("input[type=number]").classed("xispec_form-control", true);
        d3el.selectAll("input[type=textarea]").classed("xispec_form-control", true);
        d3el.selectAll('select').style("cursor", "pointer");

    },

    changeDecimals: function () {
        let showDecimals = parseInt(this.decimals[0][0].value);
        this.model.showDecimals = showDecimals;
        this.displayModel.showDecimals = showDecimals; //apply changes directly for now
        this.displayModel.trigger('change'); //necessary for PrecursorInfoView update
    },

    render: function () {
        if (!this.isVisible) return;
        this.decimals[0][0].value = this.model.showDecimals;
    },

    cancel: function (){
        document.getElementById('xispec_highlightColor').jscolor.hide();
        AppearanceSettingsView.__super__.cancel.apply(this);
    },

    updateJsColor: function (e) {
        let color = '#' + e.originalEvent.srcElement.value;
        //for now change color of model directly
        //ToDo: Maybe change this also to apply/cancel and/or put in reset to default values
        this.displayModel.set('highlightColor', color);
    },

    changePeakHighlightMode: function (e) {
        let selected = $(e.target).is(':checked');
        this.displayModel.showAllFragmentsHighlight = !selected;
        this.displayModel.trigger("changed:fragHighlighting");
    },

    showLossy: function (e) {
        let model = this.displayModel; //apply changes directly for now
        model.lossyShown = $(e.target).is(':checked');
        model.trigger("changed:lossyShown");
    },

    absErrToggle: function (e) {
        let selected = $(e.target).is(':checked');
        xiSPECUI.vent.trigger('QCabsErr', selected);
    },

    accentuateCLcontainingToggle: function (e) {
        let selected = $(e.target).is(':checked');
        xiSPECUI.vent.trigger('AccentuateCrossLinkContainingFragments', selected);
    },

    chargeLabelToggle: function (e) {
        let selected = $(e.target).is(':checked');
        xiSPECUI.vent.trigger('labelFragmentCharge', selected);
    },

    changeColorScheme: function (e) {
        let model = this.displayModel; //apply changes directly for now
        model.changeColorScheme(e.target.value);
    },

    setLabelCutoff: function (e) {
        let model = this.displayModel;
        model.labelCutoff = parseInt(e.target.value);
        model.trigger("changed:labelCutoff");
    },

    setLabelFontSize: function (e) {
        let model = this.displayModel;
        model.labelFontSize = parseInt(e.target.value);
        model.trigger("changed:labelFontSize");
    },
});
