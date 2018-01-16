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
    'dojo/on',

    'esri/layers/FeatureLayer',

    'app/util/queryUtil'],

function(declare, lang, topic, dojoOn,
    FeatureLayer,
    queryUtil) {

    return declare([], {

        locModel: null,
        dataConfig: null,
        currentQueryResults: {},

        constructor: function(options) {
            this.setClassProperties(options);
            this.attachEventListeners();
            if (this.locModel.building) {
                this.runBuildingQuery({building: this.locModel.building, floor: this.locModel.floor});
            }

        },

        setClassProperties: function(options) {
            this.locModel = options.locModel;
            // more used objects in config
            this.buildingLyrInfo = options.dataConfig.buildingLayerInfo;
            this.floorLyrInfo = options.dataConfig.floorLayerInfo;
            this.roomLyrInfo = options.dataConfig.roomLayerInfo;
            this.personQLyrInfo = options.dataConfig.personQueryLayerInfo;
            this.mapServiceUrl = options.dataConfig.mapServiceUrl;

            // save outfields for room and person query layers
            this.roomOutfields = this.computeLayerOutfields(this.roomLyrInfo);
            this.personOutfields = this.computeLayerOutfields(this.personQLyrInfo);

            // construct room and person query layers
            this.roomQLayer = new FeatureLayer(this.roomLyrInfo.url || this.mapServiceUrl + '/' + this.roomLyrInfo.layerNum, {
                outFields: this.roomOutfields
            });
            this.personQLayer = new FeatureLayer(this.personQLyrInfo.url || this.mapServiceUrl + '/' + this.personQLyrInfo.layerNum, {
                outFields: this.personOutfields
            });

        },

        attachEventListeners: function() {
            topic.subscribe('map-click', lang.hitch(this, this.runMapClickQuery));
            topic.subscribe('search-select-oid', lang.hitch(this, this.runOIDQuery));
            this.locModel.on('locModel-findBldgExtent', lang.hitch(this, this.runBuildingQuery));
        },

        computeLayerOutfields: function(lyrInfo) {
            return _.chain(lyrInfo.popupFields)
                    .map(function(obj) {return obj.fieldName;})
                    .union([lyrInfo.oidField])
                    .union(lyrInfo.popupTitleField)
                    .value();
        },

        // find building geometry given building name
        runBuildingQuery: function(argObj) {
            console.debug('runBuildingQuery');
            this.clearCurrentQueryResults();

            this.currentQueryResults.building = argObj.building;
            this.currentQueryResults.floor = argObj.floor || null;
            this.currentQueryResults.silentFlag = argObj.silentFlag || false;

            queryUtil.createAndRun({
                query: {
                    outFields: [this.buildingLyrInfo.buildingField],
                    returnGeometry: true,
                    where: queryUtil.constructWhereAnd([{
                        fieldName: this.buildingLyrInfo.buildingField,
                        newValue: this.currentQueryResults.building
                    }])
                },
                url: this.buildingLyrInfo.url || this.mapServiceUrl + '/' + this.buildingLyrInfo.layerNum,
                self: this,
                callback: this.buildingQueryResponseHandler
            });
        },

        buildingQueryResponseHandler: function(response) {
            console.debug('buildingQueryResponseHandler');
            if (!queryUtil.checkResponseSuccess(response) || !queryUtil.checkFeatureExistence(response)) {
                this.clearCurrentQueryResults();
                topic.publish('query-done');
                return;
            }

            if (!queryUtil.checkSingleFeature(response)) {
                console.warn('more than one building found. using the first one');
            }

            this.currentQueryResults.bldgExtent = response.features[0].geometry.getExtent();
            this.runFloorQuery();
        },

        runMapClickQuery: function(mapEvt) {
            console.debug('runMapClickQuery');
            this.clearCurrentQueryResults();

            queryUtil.createAndRun({
                query: {
                    outFields: [this.buildingLyrInfo.buildingField],
                    geometry: mapEvt.mapPoint,
                    returnGeometry: true
                },
                url: this.buildingLyrInfo.url || this.mapServiceUrl + '/' + this.buildingLyrInfo.layerNum,
                self: this,
                callback: this.mapClickResponseHandler,
                callbackArgs: mapEvt.mapPoint
            });

        },

        mapClickResponseHandler: function(mapClickPoint, response) {
            console.debug('mapClickResponseHandler');
            if (!queryUtil.checkResponseSuccess(response) || !queryUtil.checkFeatureExistence(response) || !queryUtil.checkSingleFeature(response)) {
                this.clearCurrentQueryResults();
                topic.publish('query-done');
                return;
            }

            var feat = response.features[0];
            this.currentQueryResults.building = feat.attributes[this.buildingLyrInfo.buildingField];
            this.currentQueryResults.bldgExtent = feat.geometry.getExtent();

            // did we click within the same building that's already selected?
            if (this.currentQueryResults.building === this.locModel.building) {
                this.runRoomQuery(mapClickPoint);
            } else {
                this.runFloorQuery();
            }
        },

        runFloorQuery: function() {
            console.debug('runFloorQuery');

            queryUtil.createAndRun({
                query: {
                    outFields: [this.floorLyrInfo.buildingField, this.floorLyrInfo.floorField],
                    where: queryUtil.constructWhereAnd([{
                        fieldName: this.floorLyrInfo.buildingField,
                        newValue: this.currentQueryResults.building
                    }]),
                    returnGeometry: false
                },
                url: this.floorLyrInfo.url || this.mapServiceUrl + '/' + this.floorLyrInfo.layerNum,
                self: this,
                callback: this.floorQueryResponseHandler
            });
        },

        floorQueryResponseHandler: function(response) {
            console.debug('floorQueryResponseHandler');
            topic.publish('query-done'); // end of the line for queries, even if things go wrong.
            if (!queryUtil.checkResponseSuccess(response) || !queryUtil.checkFeatureExistence(response)) {
                this.clearCurrentQueryResults();
                return;
            }

            var floorField = this.floorLyrInfo.floorField;
            this.currentQueryResults.availFloors = _.map(response.features, function(feat) {
                return feat.attributes[floorField];
            });

            if (!this.currentQueryResults.floor) {
                var newFloor = _.min(this.currentQueryResults.availFloors);
                newFloor = (newFloor === Infinity) ? this.currentQueryResults.availFloors[0] : newFloor;
                this.currentQueryResults.floor = newFloor;
            }

            if (this.currentQueryResults.building === this.locModel.building) {
                this.currentQueryResults = _.omit(this.currentQueryResults, 'building');
                if (this.currentQueryResults.floor === this.locModel.floor) {
                    this.currentQueryResults = _.omit(this.currentQueryResults, 'floor');
                }
            }

            if (this.currentQueryResults.silentFlag) {
                this.locModel.silentSet(_.omit(this.currentQueryResults, 'silentFlag'));
            } else {
                this.locModel.set(_.omit(this.currentQueryResults, 'silentFlag'));
            }
        },

        runRoomQuery: function(mapClickPoint) {
            console.debug('runRoomQuery');
            queryUtil.createAndRun({
                query: {
                    outFields: this.roomOutfields,
                    geometry: mapClickPoint,
                    returnGeometry: true,
                    where: queryUtil.constructWhereAnd([{
                        fieldName: this.roomLyrInfo.buildingField,
                        newValue: this.locModel.building
                    }, {
                        fieldName: this.roomLyrInfo.floorField,
                        newValue: this.locModel.floor
                    }])
                },
                url: this.roomLyrInfo.url || this.mapServiceUrl + '/' + this.roomLyrInfo.layerNum,
                self: this,
                callback: this.roomQueryResponseHandler,
                callbackArgs: {centerMap: false}
            });
        },

        runRoomFromRoomIDQuery: function(roomId) {
            console.debug('runRoomFromRoomIDQuery', roomId);
            queryUtil.createAndRun({
                query: {
                    outFields: _.union(this.roomOutfields, [this.roomLyrInfo.buildingField, this.roomLyrInfo.floorField]),
                    returnGeometry: true,
                    where: queryUtil.constructWhereAnd([{
                        fieldName: 'UPPER(' + this.roomLyrInfo.roomField + ')',
                        newValue: roomId.toUpperCase()
                    }])
                },
                url: this.roomLyrInfo.url || this.mapServiceUrl + '/' + this.roomLyrInfo.layerNum,
                self: this,
                callback: this.roomQueryResponseHandler,
                callbackArgs: {centerMap: true, setCurrentQueryResults: true}
            });
        },


        roomQueryResponseHandler: function(params, response) {
            console.debug('roomQueryResponseHandler');
            if (!queryUtil.checkResponseSuccess(response) || !queryUtil.checkFeatureExistence(response)) {

                this.clearCurrentQueryResults();
                topic.publish('query-done'); // end of the line. no more queries from here.
                return;
            }
            if (!queryUtil.checkSingleFeature(response)) {
                console.warn('more than one room found, so choosing the first one...');
            }

            var roomFeature = response.features[0];

            if (params.setCurrentQueryResults) {
                this.currentQueryResults = {
                    building: roomFeature.attributes[this.roomLyrInfo.buildingField],
                    floor: roomFeature.attributes[this.roomLyrInfo.floorField],
                    silentFlag: true
                };
                this.runBuildingQuery(this.currentQueryResults);
            }

            roomFeature.centerMap = params.centerMap; // eh, this is a little hacky...

            this.runRoomRelatedQuery(roomFeature);
        },

        runRoomRelatedQuery: function(roomFeature) {
            queryUtil.createAndRunRelated({
                rq: {
                    outFields: this.personOutfields,
                    returnGeometry: false,
                    relationshipId: this.personQLyrInfo.relationshipId,
                    objectIds: [roomFeature.attributes[this.roomLyrInfo.oidField]],
                },
                self: this,
                layerToQuery: this.roomQLayer,
                callback: this.roomRelatedQueryResponseHandler,
                callbackArgs: roomFeature
            });
        },

        roomRelatedQueryResponseHandler: function(roomFeature, peopleResponse) {
            topic.publish('query-done'); // end of the line. no more queries from here.
            var roomFeatureOID = roomFeature.attributes[this.roomLyrInfo.oidField];
            console.debug('roomRelatedQueryResponseHandler.');

            var relatedPeople, personAttrs;
            // walker to find actual related people
            if ((relatedPeople = peopleResponse[roomFeatureOID]) && (relatedPeople = relatedPeople.features)) {
                if (relatedPeople.length > 1) {
                    personAttrs = this.consolidateAttributes(relatedPeople);
                } else {
                    personAttrs = relatedPeople[0].attributes;
                }
            }

            topic.publish('feature-find', {
                roomAttr: roomFeature.attributes,
                roomGeom: roomFeature.geometry,
                centerMap: roomFeature.centerMap,
                personAttr: personAttrs
            });

        },

        runPersonRelatedQuery: function(personFeature) {
            queryUtil.createAndRunRelated({
                rq: {
                    outFields: _.union(this.roomOutfields, [this.roomLyrInfo.buildingField, this.roomLyrInfo.floorField]),
                    returnGeometry: true,
                    relationshipId: this.personQLyrInfo.relationshipId,
                    objectIds: [personFeature.attributes[this.personQLyrInfo.oidField]],
                },
                self: this,
                layerToQuery: this.personQLayer,
                callback: this.personRelatedQueryResponseHandler,
                callbackArgs: personFeature
            });
        },

        personRelatedQueryResponseHandler: function(personFeature, roomResponse) {
            topic.publish('query-done'); // end of the line. no more queries from here.
            var personFeatureOID = personFeature.attributes[this.personQLyrInfo.oidField];

            var relatedRooms;
            // walker to find actual related people
            if (!(relatedRooms = roomResponse[personFeatureOID]) || !(relatedRooms = relatedRooms.features)) {
                console.warn('no related room');
                topic.publish('feature-find', {
                    personAttr: personFeature.attributes
                });
                this.locModel.silentSet({
                    building: null,
                    floor: null,
                    availFloors: [],
                    bldgExtent: null
                });
                return;
            }
            if (relatedRooms.length > 1) {
                console.warn('more than one related room.');
            }

            var roomFeature = relatedRooms[0];
            roomFeature.centerMap = true;

            this.currentQueryResults = {
                building: roomFeature.attributes[this.roomLyrInfo.buildingField],
                floor: roomFeature.attributes[this.roomLyrInfo.floorField],
                silentFlag: true
            };

            this.locModel.silentSet(this.currentQueryResults);

            this.runBuildingQuery(this.currentQueryResults);

            topic.publish('feature-find', {
                roomAttr: roomFeature.attributes,
                roomGeom: roomFeature.geometry,
                centerMap: true,
                personAttr: personFeature.attributes
            });

        },

        runOIDQuery: function(oidArgs) {
            switch (oidArgs.lyr) {
                case 'room':
                    this.runRoomOIDQuery(oidArgs.oid);
                    break;
                case 'person':
                    this.runPersonOIDQuery(oidArgs.oid);
                    break;
                default:
                    console.warn('runOIDQuery type fell through', arguments);
            }
        },

        runRoomOIDQuery: function(oid) {

            queryUtil.createAndRun({
                query: {
                    outFields: _.union(this.roomOutfields, [this.roomLyrInfo.buildingField, this.roomLyrInfo.floorField]),
                    returnGeometry: true,
                    objectIds: [oid]
                },
                url: this.roomLyrInfo.url || this.mapServiceUrl + '/' + this.roomLyrInfo.layerNum,
                self: this,
                callback: this.roomOIDQueryResponseHandler,
                callbackArgs: {centerMap: true}
            });

        },

        roomOIDQueryResponseHandler: function(params, response) {
            console.debug('roomOIDQueryResponseHandler');
            if (!queryUtil.checkResponseSuccess(response) || !queryUtil.checkFeatureExistence(response) || !queryUtil.checkSingleFeature(response)) {
                this.clearCurrentQueryResults();
                topic.publish('query-done'); // end of the line. no more queries from here.
                return;
            }

            var roomFeature = response.features[0];

            this.currentQueryResults = {
                building: roomFeature.attributes[this.roomLyrInfo.buildingField],
                floor: roomFeature.attributes[this.roomLyrInfo.floorField],
                silentFlag: true
            };

            if (this.currentQueryResults.building !== this.locModel.building) {
                this.runBuildingQuery(this.currentQueryResults);
            } else {
                this.locModel.silentSet(this.currentQueryResults);
            }

            roomFeature.centerMap = params.centerMap; // eh, this is a little hacky...

            this.runRoomRelatedQuery(roomFeature);

        },

        runPersonOIDQuery: function(oid) {

            queryUtil.createAndRun({
                query: {
                    outFields: this.personOutfields,
                    objectIds: [oid]
                },
                url: this.personQLayer.url || this.mapServiceUrl + '/' + this.personQLayer.layerNum,
                self: this,
                callback: this.personOIDQueryResponseHandler
            });

        },

        personOIDQueryResponseHandler: function(response) {
            console.debug('personOIDQueryResponseHandler', response);
            if (!queryUtil.checkResponseSuccess(response) || !queryUtil.checkFeatureExistence(response) || !queryUtil.checkSingleFeature(response)) {
                this.clearCurrentQueryResults();
                topic.publish('query-done'); // end of the line. no more queries from here.
                return;
            }
            var personFeature = response.features[0];

            //to handle feature service/layer
            if (this.mapServiceUrl){
                this.runPersonRelatedQuery(personFeature);
            } else {
                this.runRetrieveRoomGeometryQuery(personFeature);
            }
        },

        runRetrieveRoomGeometryQuery: function(personFeature){
            console.debug('runRetrieveRoomGeometryQuery');
            queryUtil.createAndRun({
                query: {                    
                    outFields: _.union(this.roomOutfields, [this.roomLyrInfo.buildingField, this.roomLyrInfo.floorField]),              
                    returnGeometry: true,   
                    where: this.roomLyrInfo.roomField + " = '" + personFeature.attributes[this.personQLyrInfo.relationshipField] + "'"
                    // where: queryUtil.constructWhere(
                    //     [{
                    //     fieldName: this.roomLyrInfo.roomField,
                    //     newValue:personFeature.attributes[this.personQLyrInfo.relationshipField]
                    //     }])
                },
                url: this.roomLyrInfo.url || this.mapServiceUrl + '/' + this.roomLyrInfo.layerNum,
                self: this,
                callback: this.retrieveRoomGeometryQueryResponseHandler,
                callbackArgs: personFeature
            });

        },

        retrieveRoomGeometryQueryResponseHandler: function(personFeature, roomResponse){
            topic.publish('query-done'); // end of the line. no more queries from here.
            
            var roomFeature = roomResponse.features[0];
            roomFeature.centerMap = true;

            this.currentQueryResults = {
                building: roomFeature.attributes[this.roomLyrInfo.buildingField],
                floor: roomFeature.attributes[this.roomLyrInfo.floorField],
                silentFlag: true
            };

            this.locModel.silentSet(this.currentQueryResults);

            this.runBuildingQuery(this.currentQueryResults);

            topic.publish('feature-find', {
                roomAttr: roomFeature.attributes,
                roomGeom: roomFeature.geometry,
                centerMap: true,
                personAttr: personFeature.attributes
            });
        },
        
        consolidateAttributes: function(featureArr) {
            var returnAttrs = {};
            _.each(featureArr, function(feat) {
                _.each(feat.attributes, function(attrValue, attrKey) {
                    returnAttrs[attrKey] = returnAttrs[attrKey] || [];
                    returnAttrs[attrKey].push(attrValue);
                });
            });
            _.each(returnAttrs, function(attrArr, key, obj) {
                obj[key] = attrArr.join(',<br>');
            });
            return returnAttrs;
        },


        clearCurrentQueryResults: function() {
            this.currentQueryResults = {};
        }

    });
});
