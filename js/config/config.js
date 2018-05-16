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
define(function() {

    return {
        /*----- Authentication SETTINGS-----*/
        // Authentication is optional. If authentication is needed then, uncomment the 
        // entire authentication object. You'll need to Registar your application with
        //your ArcGIS Organizational account or Portal for ArcGIS
        /*authentication: {
            // appId: '',
            // If appId is present and portalUrl is omitted, this authenticates against
            // *any* arcgisonline account, which is probably not what you want.
            portalUrl: '//yourportal.maps.arcgis.com',
        }, */


        /*----- TITLE BAR SETTINGS-----*/
        layout: {
            // large header needs to be < 70px high
            headerIconLarge: 'assets/images/logo65-whiteontrans.png',
            headerIconLargeWidth: 65,
            headerIconSmall: 'assets/images/logo30-whiteontrans.png',
            // small header needs to be < 30px high
            headerIconSmallWidth: 30,
            // Customize the name of your application
            headerTitle: 'Campus Place Locator'
        },
        // the starting building/floor when none is given in the parameters.
        defaultLocation: {
            building: 'MAP',
            floor: '1'
        },
        // Define the color of the for room selection on click or search.
        selectionSymbol: {
            fillColor: [0, 0, 0, 64], // rgb or rgba array
            lineColor: [255, 139, 0], // rgb or rgba array
            lineWidth: 2 // px
        },

        /*----- BASEMAP SETTINGS-----
         * the Basemap of this overviewMap must be specified as a URL of a tiled service.
         */
        overviewMap: {
            // 'true' - display the OverviewMap (either expanded or minimized as specified in openOnLoad)
            // 'false' - never displays the OverviewMap
            showOverviewMap: false,
                   
            // To see the overview map in an expanded view set the openOnLoad parameter to "true" or for minimized view set the parameter to "false"
            openOnLoad: false,
            basemapUrl: '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer'
        },
        /*
         * These are the names of the currently available ArcGIS Online basemaps. You can specify which
         * basemaps to include in the gallery. Please note, not all basemaps are available down to zoom level 19.
         * Comment out basemaps you don't want in the gallery, making sure there's no comma following the single quotes closing bracket.
         */

        basemapGallery: {
            portalUrl: 'http://www.arcgis.com',
            // 'true' - display the BaseMapGallery button (and therefore the basemaps)
            // 'false' - hide the BaseMapGallery button. The default/only basemap (from list below) is specified in mapSetup.basemap
            showBasemapGallery: true,
            basemapTitles: [
                'Imagery',
                //'Imagery with Labels',
                //'Streets',
                'Topographic',
                //'Dark Gray Canvas',
                //'Light Gray Canvas',
                //'National Geographic',
                //'Oceans',
                //'Terrain with Labels',
                'OpenStreetMap'
                //'USA Topo Maps',
                //'USGS National Map'
            ],
            customBasemaps: [ /* {
                // title of map in BasemapGallery
                'title': 'Grey Campus',
                // path to thumbnail. Starts in root directory of app (relative from index.html)
                'thumbnailUrl': 'assets/images/Campus_Basemap_Grey_Thumb.png',
                // Can include multiple layers here. In this one, the default topo map is combined
                // with a custom campus map so that there's a fallback basemap in areas that the campus map doesn't cover.
                'baseMapLayers': [{
                    url: '//services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer'
                }, {
                    url: 'http://yourserver/arcgis/rest/services/CampusGreyScale/MapServer'
                }]
            }, */
                   {
                'title': 'Campus',
                'thumbnailUrl': 'assets/images/Campus_Basemap_Color_Thumb.png',
                'baseMapLayers': [{
                    url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer'
                }, {
                    url: 'http://yourserver/rest/services/Campus/MapServer'
                }]
            }]
        },
        
        dataLayer: {

            /*----- WEBMAP SETTINGS-----*/            
            useWebmap: true,            
            webmapID: '341e48a843b44f4b90fe5f262b0fc2db',

            /* ----- LAYER SETTINGS----- */
            /*  The following layerInfo keys should not change:
             *  buildingLayerInfo, floorLayerInfo, roomLayerInfo, personQueryLayerInfo.
             *  The other layerInfo keys don't matter, and you can add more if you want.
             *
             * When using a FeatureService or Feature Layers , the 'url' and 'layerNum' properties
             * for all LayerInfo should be populated.
             */
            buildingLayerInfo: {
                url: 'https://services.arcgis.com/pMnvm7HXxTmNXxGi/arcgis/rest/services/QUBCampusFinder_WFL1/FeatureServer/3',
                layerNum: 3, // required, even if using individual url.
                buildingField: 'BUILDINGID',
                labelField: 'LONGNAME',
                addToMap: true, // to distinguish map layers from table layers (like the person layer)
                showInLegend: false,
                floorFilter: false // if false, all features of this layer will be shown, all the time.
            },
            floorLayerInfo: {
                url: 'https://services.arcgis.com/pMnvm7HXxTmNXxGi/arcgis/rest/services/QUBCampusFinder_WFL1/FeatureServer/2',
                layerNum: 2,
                buildingField: 'BUILDINGKEY',
                floorField: 'FLOOR',
                addToMap: true,
                showInLegend: true,
                titleForLegend: 'Floors',  
                floorFilter: true // if true, only a single building/floor of this layer will be shown at a time.
            },
            roomLayerInfo: {
                url: 'https://services.arcgis.com/pMnvm7HXxTmNXxGi/arcgis/rest/services/QUBCampusFinder_WFL1/FeatureServer/1',
                layerNum: 1,
                oidField: 'OBJECTID',
                relationshipId: 4, // this is a related table to the room layer
                buildingField: 'BUILDING',
                floorField: 'FLOOR',
                roomField: 'SPACEID', // this must be a UNIQUE KEY for the room layer.
                addToMap: true,
                showInLegend: true,
                titleForLegend: 'Rooms', 
                floorFilter: true,
                popupFields: [
                    {fieldName: 'SPACEID', label: 'Room Number'},
                    {fieldName: 'SHORTNAME', label: 'Room Name'},
                    {fieldName: 'DESCRIP', label: 'Description'},
                    {fieldName: 'CAPACITY', label: 'Capacity'}
                ],
                // the *first* one of these fields to be encountered will be used in the popup title
                popupTitleField: ['LONGNAME', 'SPACEID'],
                popupTitlePriority: false,
                queryFields: ['SHORTNAME', 'SPACEID'],
                queryLabelFields: ['SHORTNAME', 'SPACEID', 'BUILDING'],
                queryLabelFunction: function(attrs) {
                    // 'this' = roomLyrInfo
                    var roomNameStr = attrs.SHORTNAME ? attrs.SHORTNAME + ', ' : '';
                    return roomNameStr + attrs.SPACEID + ' (Building ' + attrs.BUILDING + ')';
                },
                queryIconClass: 'fa fa-map-marker'
            },
            lineLayerInfo: {
                url: 'https://services.arcgis.com/pMnvm7HXxTmNXxGi/arcgis/rest/services/QUBCampusFinder_WFL1/FeatureServer/0',
                layerNum: 0,
                buildingField: 'BUILDINGKEY',
                floorField: 'FLOOR',
                addToMap: true,
                showInLegend: false,
                floorFilter: true
            },
            personQueryLayerInfo: {
                url: 'https://services.arcgis.com/pMnvm7HXxTmNXxGi/arcgis/rest/services/QUBCampusFinder_WFL1/FeatureServer/4',
                layerNum: 4,
                addToMap: false,
                oidField: 'OBJECTID',
                relationshipId: 0, // this is a related table to the room layer
                relationshipField: 'LOCATION',  //queryRelated is not working - so specify the relationship Field
                // it's important the fieldnames here are different from the fieldnames in the roomlayer's popup
                popupFields: [
                    {fieldName: 'KNOWNAS', label: 'Employee Name'},
                    {fieldName: 'EMAIL', label: 'Email',
                        formatter: function(val) {
                            return '<a href="mailto:' + val + '">' + val + '</a>';
                        }
                    },
                    {fieldName: 'EXTENSION', label: 'Extension'},
                    {fieldName: 'COSTCTRN', label: 'Cost Center'},
                    {fieldName: 'LOCATION', label: 'Location'}
                ],
                // the *first* one of these fields to be encountered will be used in the popup title
                popupTitleField: ['KNOWNAS'],
                popupTitlePriority: true, // popup will look for any fields above before it will look at the room layer
                queryFields: ['KNOWNAS', 'LOCATION'],
                queryLabelFields: ['KNOWNAS', 'LOCATION'],
                queryLabelFunction: function(attrs) {
                    // 'this' = personQueryLayerInfo
                    return attrs.KNOWNAS + ' (' + attrs.LOCATION + ')';
                },
                queryIconClass: 'fa fa-user'
            }

        },
        
        // You can change the splash screen text in the resource string file here: \js\app\nls\resourcestrings.js
        splashscreen: {
            showSplashscreen: true
        },

        mapSetup: {
            
            center: [-88.151577, 41.770934], // longitude, latitude for initial extent (before zoom to building)
            zoom: 17, // zoom level for initial extent (before zoom to building)
            basemap: 'Campus',
            // You shouldn't change the lods, but could remove unneeded levels --
            // for instance, if the campus is a single site, there's no need for levels 0-13.
            // just be careful to end every object except the last with a comma.
            lods: [
                { 'level': 0,  'resolution': 156543.033928,    'scale': 591657527.591555 },
                { 'level': 1,  'resolution': 78271.5169639999, 'scale': 295828763.795777 },
                { 'level': 2,  'resolution': 39135.7584820001, 'scale': 147914381.897889 },
                { 'level': 3,  'resolution': 19567.8792409999, 'scale': 73957190.948944 },
                { 'level': 4,  'resolution': 9783.93962049996, 'scale': 36978595.474472 },
                { 'level': 5,  'resolution': 4891.96981024998, 'scale': 18489297.737236 },
                { 'level': 6,  'resolution': 2445.98490512499, 'scale': 9244648.868618 },
                { 'level': 7,  'resolution': 1222.99245256249, 'scale': 4622324.434309 },
                { 'level': 8,  'resolution': 611.49622628138,  'scale': 2311162.217155 },
                { 'level': 9,  'resolution': 305.748113140558, 'scale': 1155581.108577 },
                { 'level': 10, 'resolution': 152.874056570411, 'scale': 577790.554289 },
                { 'level': 11, 'resolution': 76.4370282850732, 'scale': 288895.277144 },
                { 'level': 12, 'resolution': 38.2185141425366, 'scale': 144447.638572 },
                { 'level': 13, 'resolution': 19.1092570712683, 'scale': 72223.819286 },
                { 'level': 14, 'resolution': 9.55462853563415, 'scale': 36111.909643 },
                { 'level': 15, 'resolution': 4.77731426794937, 'scale': 18055.954822 },
                { 'level': 16, 'resolution': 2.38865713397468, 'scale': 9027.977411 },
                { 'level': 17, 'resolution': 1.19432856685505, 'scale': 4513.988705 },
                { 'level': 18, 'resolution': 0.59716428355982, 'scale': 2256.994353 },
                { 'level': 19, 'resolution': 0.29858214164762, 'scale': 1128.497176 },
                // these last four levels are zoomed in beyond any publicly available basemaps.
                { 'level': 20, 'resolution': 0.14929144441622, 'scale': 564.25 },
                { 'level': 21, 'resolution': 0.07464439928880, 'scale': 282.12 },
                { 'level': 22, 'resolution': 0.0373, 'scale': 141.06 },
                { 'level': 23, 'resolution': 0.0187,  'scale': 70.53 }
            ]
        }
    };
});
