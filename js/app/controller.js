/*global app:true */
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
    'config/config', // if you change this, change the one in main.js too.

    'app/views/LayoutView',
    'app/models/LocationModel',
    'app/controllers/MapController',
    'app/controllers/QueryController',

    'widgets/buildingbutton/BuildingButton',
    'widgets/floorpicker/FloorPicker',
    'widgets/overviewmap/OverviewMap',
    'widgets/loader/LoadIndicator',
    'widgets/basemapgallery/BasemapGallery',
    'widgets/bookmarks/BookmarksController',
    'widgets/newlayersearch/NewLayerSearch',
    'widgets/legend/LegendController',

    'esri/dijit/HomeButton',

    'app/views/MapButtonPanelView',
    'app/views/MapCoverView',

    'esri/map',
    'esri/basemaps',
    'esri/geometry/Extent',
    'esri/arcgis/utils',

    'dijit/Dialog',
    'dijit/form/Button',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/i18n!./nls/resourcestrings'],

function(config,
    Layout, LocationModel, MapController, QueryController,
    BuildingButton, FloorPicker, OverviewMap, LoadIndicator, CustomBMG, Bookmarks, LayerSearch,
    CustomLegend, 
    HomeButton,
    MapButtonPanelView, MapCoverView,
    Map, esriBasemaps, Extent, arcgisUtils, Dialog, Button, dom, domConstruct, lang, query, resources) {

    return {

        /**
         * This is the entry point for the application, called from index.html
         * @return { N/A }
         */
        startup: function() {
            app = this;
            this.resources =  resources;
            this.initConfig();
            this.initQueryParams();
            this.initModels();
            this.initLayout();

            // only call this after DOM is setup in initLayout
            this.initSplashscreen();

            this.initMapSetup();      

        },

        /**
         * Initialize esri configuration settings
         * @return { N/A }
         */
        initConfig: function() {
             // if (config.dataLayer.useWebmap) && (config.dataLayer.webmapID != null){

             // }

        },

        initQueryParams: function() {
            var match,
            urlParams = {},
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); },
            query  = window.location.search.substring(1);

            while ((match = search.exec(query))) {
               urlParams[decode(match[1])] = decode(match[2]);
            }
            this.queryParams = urlParams;

        },

        initModels: function() {
            var startLoc = {
                building: null,
                floor: null
            };
            if (!this.queryParams.room) {
                if (this.queryParams.building) {
                    startLoc.building = this.queryParams.building;
                    startLoc.floor = this.queryParams.floor || null;
                } else {
                    startLoc = config.defaultLocation;
                }
            }

            this.locModel = new LocationModel(_.extend(startLoc, {id: 'locModel'}));

            this.locModel.startup();
        },

        /**
         * Initialize the application layout by inserting top level nodes into the DOM
         * @return { N/A }
         */
        initLayout: function() {
            this.layout = new Layout({
                config: config.layout,
            }, 'main-container');
            this.layout.startup();

            this.initMap();
        },

        /**
         * Initialize the map and place it in 'map-container'
         * @return { N/A }
         */
        initMap: function() {

            var mapConfig;
            // enable labels on feature layers (there doesn't seem to be a way to do this after map load)
            if (!config.dataLayer.mapServiceUrl) {
                    mapConfig = _.extend(config.mapSetup, {showLabels: true});
                } else {
                    mapConfig = config.mapSetup;
            }


            if (mapConfig.extent && _.isObject(mapConfig.extent)) {
                mapConfig.extent = new Extent(mapConfig.extent);
            }

            if (!esriBasemaps.hasOwnProperty(mapConfig.basemap)) {
                this.initBasemaps();
            }

            // if webmap , it will take longer to create - later use setInterval to check if map is valid
            if ((config.dataLayer.useWebmap) && (config.dataLayer.webmapID !== null)){
                var deferred = arcgisUtils.createMap(config.dataLayer.webmapID,'map-container', mapConfig);
                deferred.then(lang.hitch(this,function(response){
                    this.map = response.map; 
                    //this is needed when webmap is based on FeatureService
                    this.operationalLayers = response.itemInfo.itemData.operationalLayers;                   
                }));

            } else {
                this.map = new Map('map-container', mapConfig);                
            }            
           
        },


        initMapSetup: function() {

            // if webmap , it will take longer to create - use setInterval to check if map is valid
            var self = this;
            var verifyMap = setInterval(function(){
                if (self.map == undefined){
                    console.warn('map not created');
                } else {
                    clearInterval(verifyMap);

                    //if webmap , get ID of exisitng layer from webmap - else create a new ID for new dynamic maplayer
                    // what about feature service ?
                    if ((config.dataLayer.useWebmap) && (config.dataLayer.webmapID !== null) && (config.dataLayer.mapServiceUrl)){
                        _.find(self.map.layerIds, function(lyrId) {
                                var mapLyr = self.map.getLayer(lyrId);
                                if (mapLyr.url.slice(mapLyr.url.indexOf('//')).toLocaleLowerCase() == config.dataLayer.mapServiceUrl.slice(config.dataLayer.mapServiceUrl.indexOf('//')).toLocaleLowerCase()){
                                    self.dataLayerId = mapLyr.id;
                                }
                         });
                    } else {
                        self.dataLayerId = 'cpfDataLayer';
                    }

                    self.mapController = new MapController({
                                                map: self.map,
                                                locModel: self.locModel,
                                                config: config,
                                                resources: self.resources,
                                                dataLayerId: self.dataLayerId,
                                                operationalLayers: self.operationalLayers
                    });
                    
                    //web map will already be loaded
                    if ((config.dataLayer.useWebmap) && (config.dataLayer.webmapID !== null)){
                        app.initQueries();
                        app.initWidgets();
                        self.layout.publishWindowSize();
                        self.mapController.publishMapSize();
                        //only call this after mapcontoller and Querycontroller are available
                        self.initDefaultLocation();     
                    } else {
                        // map not yet loaded for regular maps
                        self.map.on('load', function() {
                            app.initQueries();
                            app.initWidgets();
                            self.layout.publishWindowSize();
                            self.mapController.publishMapSize();
                        });    
                    }
                    console.debug('map created');                    
            }
            },1);
            
            
        },

        // workaround to set default location for webmap with feature service
        initDefaultLocation: function() {
            var self = this;
            if ((config.defaultLocation.building) && (config.defaultLocation.floor) && !(config.dataLayer.mapServiceUrl)){
               //confirm map is completely updated before re-setting the default floor - otherwise gets overwritten and set to first available floor
                var isMapComplete = setInterval(function(){
                    if (self.map.loaded && !self.map.updating){
                        console.debug('map complete');
                        clearInterval(isMapComplete);
                        self.locModel.silentSet('floor', config.defaultLocation.floor);
                        self.locModel.emit('floor-update');
                    } else {                        
                        console.debug('map not complete');
                    }
                },1);
            }
        },


        initBasemaps: function() {
            _.each(config.basemapGallery.customBasemaps, function(bmInfo) {
                if (esriBasemaps.hasOwnProperty(bmInfo.title)) {
                    console.warn('duplicate basemap title');
                    return;
                }
                esriBasemaps[bmInfo.title] = bmInfo;
            });
        },

        initQueries: function() {
            var qc = new QueryController({
                locModel: this.locModel,
                dataConfig: config.dataLayer
            });
            if (this.queryParams.room) {
                qc.runRoomFromRoomIDQuery(this.queryParams.room);
            }
        },

        initUtils: function() {

        },

        initSplashscreen:function() {
            if (config.splashscreen.showSplashscreen){
                    
                // to resize actionbar together with contentpane, add the actionBarTemplateVal to the contentpane  
                var actionBarTemplateVal = '<div class="splashscreenOK">';
                actionBarTemplateVal += '<button class="btn" data-dojo-type="dijit/form/Button" type="button" id="splashscreenOK" data-dojo-props="onClick:function(){app.cpfSplashscreenDialog.hide();}">';
                actionBarTemplateVal += resources.okButton + '</button></div>';

                var cpfSplashscreenDialog = new Dialog({
                    id: 'splashscreenDialog',
                    class: 'cpfSplashscreen',
                    title: config.layout.headerTitle, 
                    closable: true,                     
                    content: '<div>' + resources.splashScreenMessage + '</div>' + actionBarTemplateVal
                    //actionBarTemplate: actionBarTemplateVal
                    }); 

                domConstruct.place(cpfSplashscreenDialog.domNode, 'splashscreen-dialog');

                app.cpfSplashscreenDialog = cpfSplashscreenDialog;
                app.cpfSplashscreenDialog.startup();
                app.cpfSplashscreenDialog.show();

            }

        },


        /**
         * Initialize components of the application, this is the last responsibility of the Controller
         * @return { N/A }
         */
        initWidgets: function() {

            this.initHomeButton();
            this.initBuildingButton();
            this.initFloorPicker();
            if (config.overviewMap.showOverviewMap){
                this.initOverviewMap();
            }
            this.initLoader();

            var mapCoverView = new MapCoverView({
                containerDiv: 'main-container',
                id: 'map-cover',
                config: config.layout,
                resources: this.resources
            });
            mapCoverView.startup();

            // has to be in same order that displays in MapButtonPanelView
            if (config.basemapGallery.showBasemapGallery){
                this.initBMG(mapCoverView);
            }
            this.initLegend(mapCoverView);
            this.initBookmarks(mapCoverView);
            this.initSearch(mapCoverView);
            // this.initInfo(mapCoverView);



        },

        initHomeButton: function() {
            var homeBtn = new HomeButton({
                map: this.map,
                id: 'homeButton',
                theme: 'cpfHomeButton',
                //containerDiv: 'map-buttons-vertical', 
                resources: this.resources
            });
            
            //domConstruct.place(homeBtn.domNode, 'map-buttons-vertical');
            domConstruct.place(homeBtn.domNode, query('.esriSimpleSliderIncrementButton')[0], 'after');
            homeBtn.startup();
            
        },

        initBuildingButton: function() {
            var btn = new BuildingButton({
                locModel: this.locModel,
                containerDiv: 'map-buttons-vertical',   //'map-container',
                resources: this.resources
            }, null);
            btn.startup();
        },

        initFloorPicker: function() {
            
            var floorPicker = new FloorPicker({
                locModel: this.locModel,
                containerDiv: 'map-container',                
                resources: this.resources
            });
            floorPicker.startup();
            app.fp = floorPicker;
        },

        initOverviewMap: function() {
            var overviewMap = new OverviewMap({
                map: this.map,
                config: config.overviewMap,
                mapServiceUrl: config.dataLayer.mapServiceUrl,
                resources: this.resources,
                dataLayerId: this.dataLayerId
            });
            overviewMap.startup();
        },

        initLoader: function() {
            var loading = new LoadIndicator({
                containerDiv: 'map-container'
            });
            loading.startup();
        },

        initBMG: function(mobileView) {
            var bmgView = new MapButtonPanelView({
                config: config.layout,
                buttonTitle: resources.basemapGalleryButtonTitle, 
                iconClass: 'fa-image',
                id: 'bmgView',
                toggleDiv: 'map-buttons-horizontal',
                panelDiv: 'map-panels-horizontal',
                mobileView: mobileView
            });
            bmgView.startup();

            var bmg = new CustomBMG({
                map: this.map,
                config: config.basemapGallery,
                id: 'bmg'
            }, bmgView.replaceDiv);
            bmg.startup();

        },

        initLegend: function(mobileView) {
            var legendView = new MapButtonPanelView({
                config: config.layout,
                buttonTitle: resources.showLegendButtonTitle,
                iconClass: 'fa-th-list',
                id: 'legendView',
                toggleDiv: 'map-buttons-horizontal',
                panelDiv: 'map-panels-horizontal',
                mobileView: mobileView
            });
            legendView.startup();

            // TODO: make legend work with feature layers
            var legend = new CustomLegend({
                map: this.map,
                dataConfig: config.dataLayer,
                locModel: this.locModel,
                id: 'legend',
                resources: this.resources,
                dataLayerId: this.dataLayerId
            }, legendView.replaceDiv);
            legend.startup();
        },

        initBookmarks: function(mobileView) {
            var bookmarksView = new MapButtonPanelView({
                config: config.layout,
                buttonTitle: resources.changeBuildingsButtonTitle,
                iconClass: 'fa-location-arrow',
                id: 'bookmarksView',
                toggleDiv: 'map-buttons-horizontal',
                panelDiv: 'map-panels-horizontal',
                mobileView: mobileView
            });
            bookmarksView.startup();


            var bookmarks = new Bookmarks({
                map: this.map,
                dataConfig: config.dataLayer,
                locModel: this.locModel,
                id: 'bookmarks',
                resources: this.resources
            }, bookmarksView.replaceDiv);
            bookmarks.startup();
            // if (!this.locModel.building) {
            //     bookmarksView.mapToggle.click();
            // }

        },

        initSearch: function(mobileView) {
            var searchView = new MapButtonPanelView({
                config: config.layout,
                buttonTitle: resources.layerSearchButtonTitle,
                iconClass: 'fa-search',
                id: 'searchView',
                toggleDiv: 'map-buttons-horizontal',
                panelDiv: 'map-panels-horizontal',
                mobileView: mobileView
            });
            searchView.startup();

            var search = new LayerSearch({
                dataConfig: config.dataLayer,
                id: 'layer-search',
                viewWidget: searchView,
                resources: this.resources
            }, searchView.replaceDiv);
            search.startup();
            app.globalSearch = search;
        },

        initInfo: function(mobileView) {
            var infoView = new MapButtonPanelView({
                config: config.layout,
                buttonTitle: resources.infoButtonTitle,
                iconClass: 'fa-info',
                id: 'infoView',
                toggleDiv: 'map-buttons-horizontal',
                panelDiv: 'map-panels-horizontal',
                mobileView: mobileView
            });
            infoView.startup();
        }
    };
});
