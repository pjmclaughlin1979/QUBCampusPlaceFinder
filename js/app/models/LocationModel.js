/* jshint unused: false */
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
    'app/util/queryUtil',
    'esri/dijit/_EventedWidget'
], function(declare, lang, queryUtil, _EventedWidget) {
    return declare(_EventedWidget, {

        floor: null,
        building: null,
        bldgExtent: null,
        site: null,
        siteExtent: null,
        availFloors: [],

        constructor: function(options) {
        },

        postCreate: function() {
        },

        startup: function() {
        },

        set: function(varToSet, newVal, silentSet) {
            console.debug('locationModel set', arguments);
            this.inherited(arguments);
            // make locModel responsible for finding its own bldgExtent if passed in as null.
            if (_.isObject(varToSet) && varToSet.building && !varToSet.bldgExtent) {
                console.debug('emitting locModel-findBldgExtent');
                this.emit('locModel-findBldgExtent', {building: varToSet.building, floor: varToSet.floor});
            } else {
                this.emit(varToSet + '-update', {silent: silentSet || false});
            }
        },

        silentSet: function(arg1, arg2) {
            var self = this;
            if (_.isObject(arg1)) {
                _.each(arg1, function(val, key) {
                    self.set(key, val, true);
                });
            } else {
                this.set(arg1, arg2, true);
            }
        },

    });
});
