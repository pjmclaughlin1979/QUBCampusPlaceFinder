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
    'dojo/topic',
    './FloorPickerView'],

function(declare, lang, topic, PickerView) {

    return declare([], {

        locModel: null,
        // DEBUG
        testArr: ['B', '5', '1B', '1', '12', '3', '8', '15', '2', '88', '77', '66', 'aa', 'bb', 'cc'],

        constructor: function(options) {
            this.containerDiv = options.containerDiv;
            this.locModel = options.locModel;
            this.resources = options.resources;
            this.inherited(arguments);
            this.postCreate();
        },

        // this does not happen automatically.
        postCreate: function() {
            this.inherited(arguments);
            this.pickerView = new PickerView({
                locModel: this.locModel,
                containerDiv: this.containerDiv,
                resources : this.resources
            }, null);
            this.pickerView.startup();
        },

        startup: function() {
            this.inherited(arguments);
            this.attachEventListeners();
        },

        attachEventListeners: function() {
            var self = this;
            // if too far out, hide floor picker
            topic.subscribe('map-zoom-end', function(zoomResult) {
                self.pickerView.adjustVisibility(zoomResult.level);
            });
            this.locModel.on('availFloors-update', lang.hitch(this, this.onAvailFloorsUpdate));
            this.locModel.on('floor-update', lang.hitch(this, this.onFloorUpdate));
        },

        onAvailFloorsUpdate: function() {
            // DEBUG: silently set availFloors arr
            //this.locModel.availFloors = this.testArr;
            this.pickerView.constructUI();
        },

        onFloorUpdate: function() {
            this.pickerView.updateHighlightedFloor();
        },

        // DEBUG: GET RID OF THIS!
        testFloorPicker: function() {
            // this.locModel.set('availFloors', ['5M', '03', 'B', '8', '12', '1', '3']);
            this.locModel.set('availFloors', this.testArr);
        }

    });
});
