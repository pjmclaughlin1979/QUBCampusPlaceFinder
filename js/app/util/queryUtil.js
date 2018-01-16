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
    'dojo/_base/lang',
    'dojo/topic',

    'config/serverConfig',

    'esri/layers/FeatureLayer',

    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/tasks/RelationshipQuery'],

function(lang, topic,
    config,
    FeatureLayer,
    EsriQuery, QueryTask, RelationshipQuery) {
    return {

        createQuery: function(argObj) {
            var q = new EsriQuery();
            lang.mixin(q, argObj);
            return q;
        },

        createRelQuery: function(argObj) {
            var rq = new RelationshipQuery();
            lang.mixin(rq, argObj);
            return rq;
        },

        createAndRun: function(argObj) {
            argObj.query = this.createQuery(argObj.query);
            this.runQT(argObj);
        },

        createAndRunRelated: function(argObj) {
            argObj.rq = this.createRelQuery(argObj.rq);
            this.runRelated(argObj);
        },

        runQT: function(argObj) {
            topic.publish('query-start');
            var qt = new QueryTask(argObj.url);
            if (argObj.callbackArgs) {
                qt.execute(argObj.query,
                    lang.hitch(argObj.self, argObj.callback, argObj.callbackArgs),
                    this.genericErrback);
            } else {
                qt.execute(argObj.query,
                    lang.hitch(argObj.self, argObj.callback),
                    this.genericErrback);
            }
        },

        runRelated: function(argObj) {
            topic.publish('query-start');
            if (argObj.callbackArgs) {
                argObj.layerToQuery.queryRelatedFeatures(argObj.rq)
                    .then(lang.hitch(argObj.self, argObj.callback, argObj.callbackArgs),
                        this.genericErrback);
            } else {
                argObj.layerToQuery.queryRelatedFeatures(argObj.rq)
                    .then(lang.hitch(argObj.self, argObj.callback),
                        this.genericErrback);
            }

        },

        constructWhere: function(fieldValArr, joinStr) {
            var whereArr = _.map(fieldValArr, function(obj) {
                if (obj.newValue + 0 === obj.newValue) {
                    return obj.fieldName + ' = ' + obj.newValue;
                }
                return obj.fieldName + ' = \'' + obj.newValue + '\'';
            });
            // hack to fix a bug in server 10.1...
            whereArr.push(this.getDirtyStr());

            return whereArr.join(joinStr);

        },

        // TODO: this 'dirty' trick addresses a server bug and isn't
        // necessary except for AGS 10.1.
        getDirtyStr: function() {
            // hack to fix a bug in server 10.1...
            if (config.serverBug) {
                var dirty = (new Date()).getTime();
                return dirty + ' = ' + dirty;
            }
            return '';
        },

        constructWhereOr: function(fieldValArr) {
            return this.constructWhere(fieldValArr, ' OR ');
        },

        constructWhereAnd: function(fieldValArr) {
            return this.constructWhere(fieldValArr, ' AND ');
        },

        genericErrback: function(error) {
            topic.publish('query-done');
            console.error('Generic errback', error);
        },

        checkResponseSuccess: function(response) {
            if (response.error) {
                this.genericErrback(response.error);
                return false;
            }
            return true;
        },

        checkFeatureExistence: function(response) {
            if (!response.features || response.features.length <= 0) {
                console.debug('no features found', response);
                return false;
            }
            return true;
        },

        checkSingleFeature: function(response) {
            if (response.features.length !== 1) {
                console.debug('not a single feature', response);
                return false;
            }
            return true;
        }
    };
});
