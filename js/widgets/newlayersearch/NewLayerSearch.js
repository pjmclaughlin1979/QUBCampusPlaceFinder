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
    'dojo/promise/all',
    'dojo/topic',

    'esri/tasks/QueryTask',
    'app/util/queryUtil',

    './NewLayerSearchView'],

function(declare, lang, dojoAll, topic,
    QT, queryUtil,
    LSView) {

    return declare([], {

        locModel: null,
        viewElement: null, // can be id string or actual node

        constructor: function(options, viewElement) {
            this.inherited(arguments);
            this.resources = options.resources;
            this.postCreate(options, viewElement);
        },

        // this does not happen automatically.
        postCreate: function(options, viewElement) {
            this.inherited(arguments);
            this.lsView = new LSView({
                id: options.id,
                viewWidget: options.viewWidget,
                searchDelay: 400,
                resources : this.resources
            }, viewElement);
            this.setUpClassProperties(options);
            this.lsView.startup();
        },

        startup: function() {
            this.inherited(arguments);
            this.attachEventListeners();
        },

        setUpClassProperties: function(options) {
            this.mapServiceUrl = options.dataConfig.mapServiceUrl;
            this.roomLyrInfo = options.dataConfig.roomLayerInfo;
            this.personLyrInfo = options.dataConfig.personQueryLayerInfo;
            this.roomQ = queryUtil.createQuery({
                outFields: _.union(this.roomLyrInfo.queryFields, this.roomLyrInfo.queryLabelFields, [this.roomLyrInfo.oidField]),
                returnGeometry: false
            });
            this.personQ = queryUtil.createQuery({
                outFields: _.union(this.personLyrInfo.queryFields, this.personLyrInfo.queryLabelFields, [this.personLyrInfo.oidField]),
                returnGeometry: false
            });
        },

        attachEventListeners: function() {
            this.lsView.on('input-change', lang.hitch(this, this.handleSearchStr));
            this.lsView.on('select-oid', lang.hitch(this, this.handleResultSelection));
        },

        handleSearchStr: function(str) {
            console.debug('handleSearchStr', str);
            if (!this.lsView.inputValue || this.lsView.inputValue !== str) {
                console.debug('why bother querying?', this.lsView.inputValue, str);
                return;
            }
            this.roomQ.where = this.constructWhere(this.roomLyrInfo.queryFields, str);
            this.personQ.where = this.constructWhere(this.personLyrInfo.queryFields, str);

            var roomQT = new QT(this.roomLyrInfo.url || this.mapServiceUrl + '/' + this.roomLyrInfo.layerNum);
            var personQT = new QT(this.personLyrInfo.url || this.mapServiceUrl + '/' + this.personLyrInfo.layerNum);

            dojoAll({room: roomQT.execute(this.roomQ), person: personQT.execute(this.personQ)})
                .then(lang.hitch(this, this.handleQueryResults), queryUtil.genericErrback);

        },

        constructWhere: function(fieldArr, valueStr) {
            var upperStr = valueStr.toUpperCase().replace(/'/g, '\'\'');
            var whereArr = _.map(fieldArr, function(field) {
                return 'UPPER(' + field + ') LIKE \'%' + upperStr + '%\'';
            });
            var whereStr = whereArr.join(' OR ');

            // server bug 10.1
            var dirtyStr = queryUtil.getDirtyStr();
            if (dirtyStr) {
                whereStr = '(' + whereStr +  ') AND ' + dirtyStr;
            }

            return whereStr;
        },

        handleQueryResults: function(responsesObj) {
            console.debug('handleQueryResults', responsesObj);

            var self = this;
            var unifiedResults = [];
            _.each(responsesObj, function(response, lyrKey) {
                if (!queryUtil.checkResponseSuccess(response) || !queryUtil.checkFeatureExistence(response)) {
                    return;
                }
                var formattedResults = _.map(response.features, function(feat) {
                    var lyrInfoStr = lyrKey + 'LyrInfo';
                    return {
                        oid: feat.attributes[self[lyrInfoStr].oidField],
                        label: self[lyrInfoStr].queryLabelFunction(feat.attributes),
                        layer: lyrKey,
                        iconClass: self[lyrInfoStr].queryIconClass
                    };
                });

                unifiedResults = unifiedResults.concat(formattedResults);

            });

            this.lsView.handleFormattedResults(unifiedResults);
        },

        handleResultSelection: function(resultObj) {
            console.debug('handleResultSelection', resultObj);
            topic.publish('search-select-oid', _.omit(resultObj, 'target'));
            topic.publish('function-finished');
        }


    });
});
