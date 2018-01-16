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
    'dojo/on',
    'dojo/topic',
    'dojo/_base/lang',

    'esri/dijit/_EventedWidget',
    'dijit/_TemplatedMixin',
    
    'dojo/text!./buildingButtonView.html'
    ],

function(declare, dojoOn, topic, lang,
    _EventedWidget, _TemplatedMixin,
    template) {

    return declare([_EventedWidget, _TemplatedMixin], {

        templateString: template,        
        id: 'buildingButton',

        constructor: function(options) {
            this.inherited(arguments);
            this.containerDiv = options.containerDiv;
            this.resources = options.resources;
        },

         postCreate: function() {
            this.inherited(arguments);
            this.attachEventListeners();           
        },

        startup: function() {
            this.inherited(arguments);
            this.placeAt(this.containerDiv);
        },

        attachEventListeners: function() {
            var self = this;
            dojoOn(this.domNode, 'click', function() {
                if (self.locModel.bldgExtent) {
                    topic.publish('map-changeExtent', self.locModel.bldgExtent.expand(1.2));
                }
            });
        }
    });
});
