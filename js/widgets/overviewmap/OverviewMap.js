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

    'esri/dijit/OverviewMap',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/ArcGISDynamicMapServiceLayer'],

function(declare, lang, topic, dojoOn,
    OverviewMap, TileLayer, DynamicLayer) {

    return declare([], {

        constructor: function(options) {
            this.mapServiceUrl = options.mapServiceUrl;
            this.config = options.config;
            this.dataLayerId = options.dataLayerId;
            this.overviewMapDijit = new OverviewMap({
                id: 'ovm', // avoiding verbose default widget id
                map: options.map,
                attachTo: 'bottom-left',
                visible: options.config.openOnLoad,
                expandFactor: 3,
                baseLayer: new TileLayer(options.config.basemapUrl),
                opacity: 1 // this is for IE8, which seems to ignore !important on my hijacking of this css
            });

        },

        startup: function() {
            this.overviewMapDijit.startup();
            if (this.mapServiceUrl) {
                this.setupDataLayer();
                this.addDataLayer();
            }
            this.attachEventListeners();
        },

        attachEventListeners: function() {
            topic.subscribe('map-resize', lang.hitch(this, this.onMapResize));
        },

        setupDataLayer: function() {
            this.dataLayer = new DynamicLayer(this.mapServiceUrl);
            topic.subscribe('dynamiclayer-defexpr-update', lang.hitch(this, this.setDefExprs));
        },

        onMapResize: function(mapDimensions) {
            var self = this;
            if (!this.overviewMapDijit.visible) {
                dojoOn.once(this.overviewMapDijit.domNode, 'click', function() {
                    self.setResizeInterval(mapDimensions);
                });
                return;
            }
            if (this.overviewMapDijit.map && this.overviewMapDijit.overviewMap && this.overviewMapDijit.overviewMap.loaded) {
                this.resizeOverviewMap(mapDimensions);
            } else {
                this.setResizeInterval(mapDimensions);
            }
        },

        // adjust overviewMap size to 1/4 of the main map's dimensions (within a range of 100-250px)
        // there are checks before this function is called to ensure the overviewmapdijit has a hold of the main map,
        // and the overviewmap exists and is loaded.
        resizeOverviewMap: function(mapDimensions) {
                var mapHeight = mapDimensions && mapDimensions.h ? mapDimensions.h : this.overviewMapDijit.map.height;
                var mapWidth = mapDimensions && mapDimensions.w ? mapDimensions.w : this.overviewMapDijit.map.width;
                var ovHeight = Math.min(Math.max((mapHeight / 4), 100), 250);
                var ovWidth = Math.min(Math.max((mapWidth / 4), 100), 250);
                // resize overviewMap
                this.overviewMapDijit.resize({h: ovHeight, w: ovWidth});
        },

        setResizeInterval: function(mapDimensions) {
            var self = this;
            var count = 0;
            var resizeInterval = setInterval(function() {
                if (self.overviewMapDijit.overviewMap && self.overviewMapDijit.overviewMap.loaded) {
                    console.debug('resizing the overviewmap after ' + count + ' tries');
                    clearInterval(resizeInterval);
                    self.resizeOverviewMap(mapDimensions);
                } else if (count > 10) {
                    // give up after 10 seconds
                    console.warn('overview map data layer load fail');
                    clearInterval(resizeInterval);
                } else {
                    count++;
                }
            }, 1000);
        },

        addDataLayer: function() {
            this.dataLayer.setVisibleLayers(this.config.visibleLayers);
            var self = this;
            // in the future, if overviewMapDijit is closed on load...
            if (!this.overviewMapDijit.visible) {
                dojoOn.once(this.overviewMapDijit.domNode, 'click', function() {
                    self.setDefExprsAndAdd();
                });
            } else {
                // there seemed to be no events to hook into on this widget,
                // and overviewMapDijit.overviewMap isn't immediately available, and
                // if we're automatically opening the map we can't listen for 'click',
                // so the only other real option is trying on an interval. bleh.
                // btw, 'show' is not a real event on this widget. onshow is just a function, not an emitter.
                var count = 0;
                var overviewInterval = setInterval(function() {
                    if (self.overviewMapDijit.overviewMap && self.overviewMapDijit.overviewMap.loaded) {
                        console.debug('adding data layer to overview map after ' + count + ' tries');
                        clearInterval(overviewInterval);
                        self.setDefExprsAndAdd();
                    } else if (count > 30) {
                        // give up after 30 seconds
                        console.warn('overview map data layer load fail');
                        clearInterval(overviewInterval);
                    } else {
                        count++;
                    }
                }, 1000);
            }
        },

        setDefExprsAndAdd: function() {
            if (!this.dataLayer.layerDefinitions || !this.dataLayer.layerDefinitions.length) {
                var mapDataLayer = this.overviewMapDijit.map.getLayer(this.dataLayerId);
                if (mapDataLayer) {
                    this.setDefExprs({layerDefArr: mapDataLayer.layerDefinitions});
                }
            }
            this.overviewMapDijit.overviewMap.addLayer(this.dataLayer);
        },

        setDefExprs: function(pubArgs) {
            this.dataLayer.setLayerDefinitions(pubArgs.layerDefArr);
        }
    });
});
