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
    'dojo/topic',
    'dojo/query',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/dom',
    'dojo/NodeList-traverse', // this is used to add more functionality to dojoQuery. DON'T GET RID OF IT.

    'config/layoutConfig',

    'esri/dijit/_EventedWidget',
    'dijit/_TemplatedMixin',

    'dojo/text!./templates/MapCoverView.html'],

function(declare, topic, dojoQuery, lang, dojoOn, domConstruct, domClass, dom, nlt,
    layoutConfig,
    _EventedWidget, _TemplatedMixin,
    template) {

    return declare([_EventedWidget, _TemplatedMixin], {

        iconClass: null,
        templateString: template,

        constructor: function(options) {
            /* jshint unused: false */
            this.inherited(arguments);
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
            dojoOn(this.domNode, 'click', function(evt) {
                if (evt.target === this) {
                    self.closeCover();
                }
            });

            topic.subscribe('maptoggle-click', function(targetToggle) {
                domClass.toggle(self.domNode, 'push-down', !domClass.contains(targetToggle, 'highlight'));
            });
            topic.subscribe('window-resize', lang.hitch(this, this.responsiveLayout));
            topic.subscribe('function-finished', lang.hitch(this, this.closeCover));

        },

        closeCover: function() {
            if (!domClass.contains(this.domNode, 'hide')) {
                domClass.add(this.domNode, 'push-down');
                topic.publish('mapcover-close');
            }
        },

        responsiveLayout: function(windowSize) {
            if (windowSize.h < layoutConfig.breakHeight2 || windowSize.w < layoutConfig.breakWidth1) {
                domClass.remove(this.domNode, 'hide');
            } else {
                domClass.add(this.domNode, 'hide');
            }
        }

    });
});
