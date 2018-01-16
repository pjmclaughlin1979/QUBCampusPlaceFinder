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
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/topic',
    'dojo/on',

    'esri/dijit/Legend'],

function(declare, lang, domConstruct, domStyle, topic, dojoOn,
    EsriLegend) {

    return declare([], {

        constructor: function(options, viewElement) {
            this.postCreate(options, viewElement);
        },

        postCreate: function(options, viewElement) {
            var layerInfos = this.createLayerInfos(options.dataConfig, options.map, options.dataLayerId);
            var legend = new EsriLegend({
                map: options.map,
                layerInfos: layerInfos,
                baseClass: !options.dataConfig.mapServiceUrl || options.dataConfig.hideLegendSubtitles ? 'hide-subtitles' : 'show-subtitles',
                id: options.id
            }, viewElement);
            this.attachEventListeners(legend, options);
            legend.startup();
        },

        startup: function() {
        },

        attachEventListeners: function(legend, options) {
            if (!options.locModel.floor) {
                dojoOn.once(options.locModel, 'floor-update', function() {
                    legend.refresh();
                });
            }
            dojoOn(legend.domNode, 'click', lang.partial(topic.publish, 'function-finished'));
            topic.subscribe('map-resize', lang.hitch(this, this.onMapResize, legend));
        },

        broadcastFunctionFinished: function() {
            topic.publish('function-finished');
        },

        createLayerInfos: function(dataConfig, map, dataLayerId) {

            // dynamic map service
            if (dataConfig.mapServiceUrl) {
                var hideLayers = [];
                _.each(dataConfig, function(lyrInfo) {
                    if (lyrInfo && (lyrInfo.layerNum + 0 === lyrInfo.layerNum) && lyrInfo.addToMap && !lyrInfo.showInLegend) {
                        hideLayers.push(lyrInfo.layerNum);
                    }
                });
                return [{
                    title: dataConfig.legendTitle,
                    layer: map.getLayer(dataLayerId),
                    hideLayers: hideLayers
                }];
            }

            // feature service
            var layerInfos = [];
            if ((dataConfig.useWebmap) && (dataConfig.webmapID !== null)){  //webmap
                var mapLayersInfo = [];
                _.each(map.graphicsLayerIds, function(mapLyrId) {
                    var mapLyr = map.getLayer(mapLyrId); 
                    if (mapLyr.url){
                        mapLayersInfo.push(mapLyr) ;
                    }
                });

                _.each(dataConfig, function(lyrInfo) {
                    if (lyrInfo.showInLegend){
                        var legendLyrInfo = _.find(mapLayersInfo, function(mapLyrInfo) {
                            return (mapLyrInfo.url.slice(mapLyrInfo.url.indexOf('//')).toLocaleLowerCase() == lyrInfo.url.slice(lyrInfo.url.indexOf('//')).toLocaleLowerCase());
                        });
                        layerInfos.push({
                                title: lyrInfo.titleForLegend,
                                layer: legendLyrInfo
                            });                          
                    }
                });

            } else { // no webmap - just feat lyrs
                 _.each(dataConfig, function(lyrInfo, key) {
                    if (lyrInfo && (lyrInfo.layerNum + 0 === lyrInfo.layerNum) && lyrInfo.addToMap && lyrInfo.showInLegend) {
                        layerInfos.push({
                            title: lyrInfo.titleForLegend,
                            layer: map.getLayer(key.replace('Info', ''))
                        });
                    }
                });

            }
            return layerInfos;
        },

        onMapResize: function(legend, newMapDimensions) {
            this.domNodeHeight = _.min([newMapDimensions.h * 0.9 - 50, 550]);
            domStyle.set(legend.domNode.parentElement, 'maxHeight', this.domNodeHeight + 'px');
        }
    });
});
