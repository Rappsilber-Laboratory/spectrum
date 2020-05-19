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
//		SettingsView.js

var xiSPECUI = xiSPECUI || {};
var CLMSUI = CLMSUI || {};

let SettingsView = Backbone.View.extend({

    events: {
        'click .xispec_settingsTab': 'changeTab',
        'click .xispec_settingsCancel': 'cancel',
        'click': 'bringToFront',
    },


    initialize: function (options) {

        const defaultOptions = {
            tabs: [],
            title: 'Settings',
        };
        this.options = _.extend(defaultOptions, options);
        SettingsView.__super__.initialize.apply(this, arguments);

        // event listeners
        this.listenTo(this.model, 'change:JSONdata', this.render);
        this.listenTo(xiSPECUI.vent, 'activeSpecPanel:changed', this.modelChanged);

        this.isVisible = false;

        // HTML elements
        this.wrapper = d3.select(this.el);
        this.wrapper.classed('xispec_settingsWrapper', true);
        // title
        let titleElement = this.wrapper.append('div')
            .attr('class', 'xispec_dynDiv_moveParentDiv')
        ;
        titleElement.append('span')
            .attr('class', 'xispec_dynTitle')
            .html(this.options.title)
        ;
        titleElement.append('i').attr('class', 'fa fa-times-circle xispec_settingsCancel');
        // dynDiv resize corners
        this.wrapper.append('div').attr('class', 'xispec_dynDiv_resizeDiv_tl draggableCorner');
        this.wrapper.append('div').attr('class', 'xispec_dynDiv_resizeDiv_tr draggableCorner');
        this.wrapper.append('div').attr('class', 'xispec_dynDiv_resizeDiv_bl draggableCorner');
        this.wrapper.append('div').attr('class', 'xispec_dynDiv_resizeDiv_br draggableCorner');

        // menu
        let self = this;
        this.menu = this.wrapper.append("div").attr("class", "xispec_settings_menu");
        this.options.tabs.forEach(function (b, i) {
            let zIndex = 20 - i;
            let b_id = b.replace(" ", "_").toLowerCase();
            self.menu.append("button")
                .attr("class", "xispec_settingsTab xispec_btn xispec_btn-1a")
                .attr("data-tab", b_id)
                // .attr("id", "xispec_" + b_id)
                .attr("style", "z-index: " + zIndex)
                .text(b)
            ;
        });
        // add active class to first tab-button
        this.menu.select('button').classed('xispec_active', true);

        this.mainDiv = this.wrapper.append("div").attr("class", "xispec_settings_main");

        // let d3el = d3.select(this.el);
        // d3el.selectAll("label").classed("xispec_label", true);
        // d3el.selectAll("input[type=text]").classed("xispec_form-control", true);
        // d3el.selectAll("input[type=number]").classed("xispec_form-control", true);
        // d3el.selectAll("input[type=textarea]").classed("xispec_form-control", true);
        // d3el.selectAll('select').style("cursor", "pointer");

    },

    // render: function () {
    //     if (!this.isVisible) return;
    // },

    cancel: function () {
        this.isVisible = false;
        this.wrapper.style('display', 'none');
    },

    changeTab: function (e) {
        let $target =  $(e.target);
        let activeTab = $target.data('tab');
        this.wrapper.selectAll(".xispec_settings-tab").style('display', 'none');
        this.wrapper.select('#xispec_' + activeTab + '_tab').style('display', 'inherit');
        this.menu.selectAll('button').classed('xispec_active', false);
        $target.addClass('xispec_active');
    },

    toggleView: function () {
        this.bringToFront();
        this.isVisible = !this.isVisible;
        this.render();
        $(this.el).toggle();
    },

    modelChanged: function () {
        // update event listeners to changed model
        this.listenTo(this.model, 'change:JSONdata', this.render);

        // update the View
        this.render();
    },

    bringToFront: function () {
        $('.xispec_settingsWrapper').css('z-index', 3);
        $(this.el).css('z-index', 4);
    },
});
