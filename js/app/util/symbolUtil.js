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
    'esri/renderers/SimpleRenderer',
    'esri/symbols/SimpleFillSymbol'
], function(SimpleRenderer, SFS) {

    return {

        createSFS: function(fillColor, lineColor, lineWidth) {
            return new SFS({
                type: 'esriSFS',
                style: 'esriSFSSolid',
                color: fillColor,
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: lineColor,
                    width: lineWidth
                }
            });
        },

        createSFSFromObject: function(obj) {
            return this.createSFS(obj.fillColor, obj.lineColor, obj.lineWidth);
        },

        createSimpleRenderer: function(fillColor, lineColor, lineWidth) {
            return new SimpleRenderer({
                type: 'simple',
                symbol: {
                    color: fillColor,
                    type: 'esriSFS',
                    style: 'esriSFSSolid',
                    outline: {
                        color: lineColor,
                        width: lineWidth,
                        type: 'esriSLS',
                        style: 'esriSLSSolid'
                    }
                }
            });
        }
    };
});