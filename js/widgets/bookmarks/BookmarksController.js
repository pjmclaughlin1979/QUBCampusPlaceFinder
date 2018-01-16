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

    'app/util/queryUtil',

    './BookmarksView'],

function(declare, lang, topic,
    queryUtil,
    BookmarksView) {

    return declare([], {

        locModel: null,
        bldgStorage: {},

        constructor: function(options, viewElement) {
            this.dataConfig = options.dataConfig;
            this.locModel = options.locModel;
            this.resources = options.resources;
            this.buildingLyrInfo = options.dataConfig.buildingLayerInfo;
            this.postCreate(options, viewElement);
        },

        // this does not happen automatically.
        postCreate: function(options, viewElement) {
            this.navView = new BookmarksView({
                            id: options.id,
                            resources : this.resources
                            }, viewElement);
            this.navView.startup();
        },

        startup: function() {
            this.getAllBuildingNames();
        },

        attachEventListeners: function() {
            var self = this;
            this.locModel.on('building-update', function(dijitEvt) {
                console.debug('navController heard locModel buildingUpdate');
                self.navView.updateSelectedBuilding(dijitEvt.target.building);
            });
            this.navView.on('bldg-change', function(newBuilding) {
                topic.publish('function-finished');
                console.debug('navController setting building', newBuilding);
                if (self.locModel.building === newBuilding) {
                    return;
                }
                self.locModel.set({
                    building: newBuilding,
                    floor: null,
                    bldgExtent: null
                });
            });
        },

        getAllBuildingNames: function() {
            queryUtil.createAndRun({
                query: {
                    outFields: [this.buildingLyrInfo.buildingField, this.buildingLyrInfo.labelField],
                    returnGeometry: false,
                    // seems like we should just be able to do 1=1 here, but the server bug requires that we run it through queryUtil's construct instead.
                    where: queryUtil.constructWhereAnd([{
                        fieldName: 1,
                        newValue: 1
                    }])
                },
                url: this.dataConfig.buildingLayerInfo.url || this.dataConfig.mapServiceUrl + '/' + this.dataConfig.buildingLayerInfo.layerNum,
                self: this,
                callback: this.allBuildingsResponseHandler
            });
        },

        allBuildingsResponseHandler: function(response) {
            this.getAllFloors(response.features);
        },

        // can't just take all the buildings, since some don't have floors,
        // and we don't want to show blank buildings in the bookmarks.
        getAllFloors: function(buildingFeatures) {
            queryUtil.createAndRun({
                query: {
                    outFields: [this.dataConfig.floorLayerInfo.buildingField],
                    returnGeometry: false,
                    where: queryUtil.constructWhereAnd([{
                        fieldName: 1,
                        newValue: 1
                    }])
                },
                url: this.dataConfig.floorLayerInfo.url || this.dataConfig.mapServiceUrl + '/' + this.dataConfig.floorLayerInfo.layerNum,
                self: this,
                callback: this.allFloorsResponseHandler,
                callbackArgs: buildingFeatures
            });
        },

        allFloorsResponseHandler: function(buildingFeatures, response) {
            var self = this;
            // list the buildings that actually have floors.
            var buildingsWithFloors = _.chain(response.features)
                .map(function(floorFeat) {
                    return floorFeat.attributes[self.dataConfig.floorLayerInfo.buildingField];
                })
                .uniq()
                .value();
            // store the buildings and their labels that have floors.
            var buildingArr = _.chain(buildingFeatures)
                .filter(function(feat) {
                    return _.contains(buildingsWithFloors, feat.attributes[self.buildingLyrInfo.buildingField]);
                })
                .map(function(feat) {
                    return {
                        value: feat.attributes[self.buildingLyrInfo.buildingField],
                        label: feat.attributes[self.buildingLyrInfo.labelField]
                    };
                })
                .sortBy(function(obj) {
                    return obj.label.replace(/\d+\s+/g, '');
                })
                .value();

            this.attachEventListeners();
            this.navView.constructBuildingDropdown(buildingArr);
            this.navView.updateSelectedBuilding(this.locModel.building);
        }

    });
});