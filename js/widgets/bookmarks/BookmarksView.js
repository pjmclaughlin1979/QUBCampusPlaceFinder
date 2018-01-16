/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
| Copyright 2014 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
| http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/dom-attr',

    'esri/dijit/_EventedWidget',
    'dijit/_TemplatedMixin',

    'dojo/text!./BookmarksView.html'],

function(declare, lang, dojoOn, domConstruct, domAttr,
    _EventedWidget, _TemplatedMixin,
    template) {
    /* jshint unused: false */
    return declare([_EventedWidget, _TemplatedMixin], {

        templateString: template,

        constructor: function(options) {
            this.inherited(arguments);
            this.resources = options.resources;
        },

        postCreate: function() {
            this.inherited(arguments);
        },

        startup: function() {
            this.inherited(arguments);
            this.attachListeners();
        },

        attachListeners: function() {
            // when the building dropdown changes
            dojoOn(this.buildingDropdown, 'change', lang.partial(this.onSelectionChange, this));
        },

        onSelectionChange: function(self, evt) {
            console.debug('bookmarks onSelectionChange');
            // 'this' = dropdown of event.
            var selectedOption = this.options[this.selectedIndex];
            if (!selectedOption) {
                return;
            }
            self.emit('bldg-change', selectedOption.value);
        },

        createOption: function(targetDropdown, optionObj) {
            return domConstruct.create('option', {
                'value': optionObj.value,
                'label': optionObj.label || optionObj.value,
                'innerHTML': optionObj.label || optionObj.value
            }, targetDropdown);
        },

        constructBuildingDropdown: function(bldgArr) {
            _.each(bldgArr, lang.partial(this.createOption, this.buildingDropdown));
        },

        updateSelectedBuilding: function(building) {
            console.debug('updateSelectedBuilding');
            if (!building) {
                building = '';
            }
            var hasBuilding = _.some(this.buildingDropdown.options, function(opt) {
                return opt.value === building;
            });
            if (!hasBuilding) {
                return;
            }
            this.buildingDropdown.value = building;
        }

    });
});