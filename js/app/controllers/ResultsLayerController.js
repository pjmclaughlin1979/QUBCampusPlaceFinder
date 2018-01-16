/* global console */
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
    'dojo/query',
    'dojo/topic',
    'dojo/on',

    'dojo/dom-construct',
    'dojo/dom-class',

    'dijit/layout/ContentPane',
    'dijit/registry',

    'esri/graphic',
    'esri/layers/GraphicsLayer',
    'esri/dijit/Popup',
    'esri/dijit/PopupMobile',
    'esri/dijit/PopupTemplate',

    'config/layoutConfig',

    'app/util/symbolUtil',
    'dojo/text!app/views/templates/PopupView.html'],


function(declare, lang, dojoQuery, topic, dojoOn,
    domConstruct, domClass,
    ContentPane, registry,
    Graphic, GraphicsLayer, Popup, PopupMobile, PopupTemplate,
    layoutConfig,
    symbolUtil, thisPopupTemplate) {

    return declare([], {

        map: null,
        popupInfo: {}, // storage
        dataConfig: null,
        symbolConfig: null,
        mobileLayout: false, // start assuming desktop/panel layout
        popupTimer: setTimeout(function() {}, 100),

        constructor: function(options) {
            this.resources = options.resources;
            this.setClassProperties(options);
            this.addLayers();
            this.attachEventListeners();            
        },

        setClassProperties: function(options) {
            this.map = options.map;
            this.symbolConfig = options.symbolConfig;
            this.dataConfig = options.dataConfig;
            this.personQLyrInfo = options.dataConfig.personQueryLayerInfo;
            this.roomLyrInfo = options.dataConfig.roomLayerInfo;

            // set up some other things...
            this.createInfoTemplates();
            this.setUpInfoWindow(options.popupWrapper);
        },

        addLayers: function() {
            this.resultsLayer = this.map.addLayer(new GraphicsLayer({id: 'resultGraphicsLayer'}));
            this.resultsLayer.setInfoTemplate(this.popupInfo.popupTemplate);
        },

        attachEventListeners: function() {
            var self = this;
            topic.subscribe('feature-find', lang.hitch(this, this.featureFindHandler));

            topic.subscribe('map-center-complete', function(params) {
                console.debug('map-center-complete from resultsLayer', params);
                self.map.infoWindow.show(params.centerPoint);
            });
            topic.subscribe('dynamiclayer-defexpr-update', function(params) {
                if (!params.silent) {
                    self.hidePopupsAndClearResults();
                }
            });
            topic.subscribe('window-resize', lang.hitch(this, this.responsiveLayout));
        },

        /**
         * Create the infotemplate for the map service layer
         * @return { N/A }
         */
        createInfoTemplates: function() {
            // to not clutter up the config with "visible: true" for all the popup fields, add it here.
            this.popupInfo.allFields = _.map(this.roomLyrInfo.popupFields.concat(this.personQLyrInfo.popupFields), function(obj) {
                return _.extend(obj, {visible: true});
            });

            this.popupInfo.formatFields = _.filter(this.roomLyrInfo.popupFields.concat(this.personQLyrInfo.popupFields), function(obj) {
                return obj.formatter;
            });


            this.popupInfo.popupTemplate = new PopupTemplate({
                title: 'Placeholder title',
                fieldInfos: this.popupInfo.allFields.push({fieldName: 'ROOMNOTFOUND', label: 'Room', visible: true})
            });

            this.popupInfo.popupTitleArr = this.roomLyrInfo.popupTitlePriority ?
                    this.roomLyrInfo.popupTitleField.concat(this.personQLyrInfo.popupTitleField) :
                    this.personQLyrInfo.popupTitleField.concat(this.roomLyrInfo.popupTitleField);
        },

        /**
         * Change the attributes shown in the popup based on the available data
         * (Filter out blank data)
         * @param  {array} attrs feature attributes
         * @return { N/A }
         */
        modifyPopupTemplate: function(attrs) {
            var infoFields = _.filter(this.popupInfo.allFields, function(fieldInfo) {
                return attrs[fieldInfo.fieldName] !== null && attrs[fieldInfo.fieldName] !== undefined;
            });
            this.popupInfo.popupTemplate.info.fieldInfos = infoFields;

            _.each(this.popupInfo.formatFields, function(fieldInfo) {
                if (attrs[fieldInfo.fieldName]) {
                    attrs[fieldInfo.fieldName] = fieldInfo.formatter(attrs[fieldInfo.fieldName]);
                }
            });

            // title
            var self = this;
            _.some(this.popupInfo.popupTitleArr, function(field) {
                // yes, i mean this to be ==. (false + 0 == false) is true, while null + 0 and undef + 0 != their original
                /* jshint eqeqeq: false */
                if (attrs[field] || attrs[field] + 0 == attrs[field]) {
                    self.popupInfo.popupTemplate.info.title = attrs[field];
                    return true;
                }
                return false;
            });

            if (!this.popupInfo.popupTemplate.info.title) {
                this.popupInfo.popupTemplate.info.title = '(no title)';
            }
            domClass.toggle(this.popupInfo.mobileTitle, 'multi', this.popupInfo.popupTemplate.info.title.indexOf('<br>') >= 0);
        },

        featureFindHandler: function(featureInfo) {
            this.resultsLayer.clear();
            if (!featureInfo.roomAttr) {
                featureInfo.roomAttr = { ROOMNOTFOUND: 'Not Found'};
            }
            var consolidatedAttrs = _.extend(featureInfo.roomAttr, featureInfo.personAttr);
            // set infotemplate fields based on what isn't null on the feature
            this.modifyPopupTemplate(consolidatedAttrs);

            // set infowindow
            var roomGraphicsArr = [this.addRoomGraphic(consolidatedAttrs, featureInfo.roomGeom)];
            this.map.infoWindow.setFeatures(roomGraphicsArr);

            var popupAnchor = featureInfo.anchorGeom || (featureInfo.roomGeom ? featureInfo.roomGeom.getExtent().getCenter() : null);
            domClass.toggle(this.map.infoWindow.domNode, 'no-anchor', !popupAnchor);

            if (featureInfo.centerMap && popupAnchor) {
                topic.publish('map-center', popupAnchor);
            } else {
                this.map.infoWindow.show(popupAnchor);
            }

        },

        setUpInfoWindow: function(popupWrapper) {

            var updatedPopupTemplate = lang.replace(thisPopupTemplate, this.resources);
            domConstruct.place(updatedPopupTemplate, popupWrapper);
            dojoOn(dojoQuery('.close', popupWrapper)[0], 'click', lang.hitch(this, this.hidePopupsAndClearResults));

            // the popup NEEDS to be in a content pane.
            var popupPane = new ContentPane({id: 'resultsPopup'}, 'popup-pane');
            popupPane.startup();

            var mapPopup = this.map.infoWindow;
            var mobilePopup = new PopupMobile(null, domConstruct.create('div'));
            this.popupInfo.popups = {
                original: mapPopup,
                mobile: mobilePopup
            };
            this.popupInfo.mobileTitle = dojoQuery('.title', mobilePopup.domNode)[0];
            mapPopup.set('popupWindow', false);

            this.popupInfo.fillSymbol = symbolUtil.createSFSFromObject(this.symbolConfig);
            this.map.infoWindow.fillSymbol = this.popupInfo.fillSymbol;

            // listeners for popup events, which will take popup content and put it into the sidepane.
            mapPopup.on('set-features', lang.partial(this.genericPopupSelectFeatures, this, popupPane));
            mapPopup.on('clear-features', lang.partial(this.onPopupClearFeatures, this, popupWrapper));
            mobilePopup.on('set-features', lang.partial(this.genericPopupSelectFeatures, this));

        },

        genericPopupSelectFeatures: function(self, popupWrapper) {
            var popup = this;
            clearTimeout(self.popupTimer);
            if (popupWrapper && popupWrapper.id === 'resultsPopup') {
                popupWrapper = popupWrapper.domNode.parentElement;
            }
            self.popupTimer = setTimeout(function() {
                if (popupWrapper) {
                    self.onPopupSelectFeatures(popup.getSelectedFeature(), popupWrapper);
                }
            });
        },

        onPopupSelectFeatures: function(feat, popupWrapper) {
            registry.byId('resultsPopup').set('content', feat.getContent());
            this.reformatLinks();
            this.showPopupParent(feat, popupWrapper);
            if (this.map.graphics.graphics.length <= 0) {
                    return;
            }
            // TODO: what if popup pane blocks the selected room? we should
            // move the map a little so that it's visible.
            /*var grGeom = this.map.graphics.graphics[0].getNode().getBoundingClientRect();
            var popupGeom = popupParent.getBoundingClientRect();*/
        },

        onPopupClearFeatures: function(self, popupWrapper) {
            clearTimeout(self.popupTimer);
            self.popupTimer = setTimeout(function() {
                registry.byId('resultsPopup').set('content', null);

                if (!domClass.contains(popupWrapper, 'hide')) {
                    self.hidePopupParent(popupWrapper);
                }
            }, 400);
        },

        hidePopupParent: function(popupWrapper) {
            this.resultsLayer.clear();
            domClass.add(popupWrapper, 'hide');
        },

        showPopupParent: function(feat, popupWrapper) {
            domClass.remove(popupWrapper, 'hide');
        },

        addRoomGraphic: function(attr, geom) {
            var roomGraphic = new Graphic(geom, null, attr);
            this.resultsLayer.add(roomGraphic);
            return roomGraphic;
        },

        reformatLinks: function() {
            var popupLinks = dojoQuery('.esriViewPopup a');
            console.debug('finding links');
            _.each(popupLinks, function(lnk) {
                var thisHref = lnk.getAttribute('href');
                if (thisHref.substring(0, 7) === 'mailto:' || thisHref.substring(0, 4) === 'tel:') {
                    lnk.removeAttribute('target');
                }
            });
        },

        hidePopupsAndClearResults: function() {
            this.hideOriginalPopup();
            this.hideMobilePopup();
            this.resultsLayer.clear();
        },

        hideOriginalPopup: function() {
            this.popupInfo.popups.original.hide();
            this.popupInfo.popups.original.clearFeatures();
        },

        hideMobilePopup: function() {
            dojoQuery('.esriMobileNavigationBar').style('display', 'none');
            dojoQuery('.esriMobilePopupInfoView').style('display', 'none');
            this.popupInfo.popups.mobile.hide();
            this.popupInfo.popups.mobile.clearFeatures();
        },

        responsiveLayout: function(windowSize) {
            if (windowSize.h < layoutConfig.breakHeight2 || windowSize.w < layoutConfig.breakWidth1) {
                if (!this.mobileLayout) {
                    this.hidePopupsAndClearResults();
                    this.map.setInfoWindow(this.popupInfo.popups.mobile);
                    // yes, this has to happen every time we switch popups.
                    this.map.infoWindow.fillSymbol = this.popupInfo.fillSymbol;
                    this.mobileLayout = true;
                }
            } else {
                if (this.mobileLayout) {
                    this.hidePopupsAndClearResults();
                    this.map.setInfoWindow(this.popupInfo.popups.original);
                    // yes, this has to happen every time we switch popups.
                    this.map.infoWindow.fillSymbol = this.popupInfo.fillSymbol;
                    this.mobileLayout = false;
                }
            }
        }

    });
});
