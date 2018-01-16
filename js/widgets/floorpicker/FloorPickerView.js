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
    'dojo/dom-class',
    'dojo/dom-attr',
    'dojo/query',
    'dojo/on',
    'dojo/NodeList-dom',

    'esri/dijit/_EventedWidget',
    'dijit/_TemplatedMixin',

    'dojo/text!./FloorPickerView.html'],

function(declare, lang, domConstruct, domStyle, domClass, domAttr, dojoQuery, dojoOn, nld,
    _EventedWidget, _TemplatedMixin,
    template) {

    return declare([_EventedWidget, _TemplatedMixin], {

        templateString: template,
        baseClass: 'vertical',
        locModel: null,
        id: 'floorPicker',

        constructor: function(options) {
            this.inherited(arguments);
            this.resources = options.resources;            
        },

        postCreate: function() {
            this.inherited(arguments);
        },

        startup: function() {
            this.inherited(arguments);
            this.placeAt(this.containerDiv);
            this.addEventListeners();
        },

        addEventListeners: function() {
            var fontSize = domStyle.get(this.scrollUp, 'font-size') || domStyle.get(this.scrollUp, 'fontSize');
            var buttonHeight = parseInt(fontSize, 10) * 2;
            dojoOn(this.scrollUp, 'click', lang.hitch(this, this.scrollAnimate, this.floorsDiv, buttonHeight, -1));
            dojoOn(this.scrollDown, 'click', lang.hitch(this, this.scrollAnimate, this.floorsDiv, buttonHeight, 1));
        },

        adjustScrollButtons: function() {
            /* no pretty things for you, ie8 */
            if (dojoQuery('.no-media-queries').length || this.locModel.availFloors.length <= 5) {
                return;
            }
            var topButton = dojoQuery('.btn', this.floorsDiv)[0];
            var bottomButton = dojoQuery('.btn:last-child', this.floorsDiv)[0];
            var floorsDivBB = this.floorsDiv.getBoundingClientRect();
            domClass.toggle(this.scrollUp, 'disabled', topButton && topButton.getBoundingClientRect().top >= floorsDivBB.top);
            domClass.toggle(this.scrollDown, 'disabled', bottomButton && bottomButton.getBoundingClientRect().bottom <= floorsDivBB.bottom);
        },

        scrollAnimate: function(targetDiv, scrollDiff, scrollInt) {
            // var scrollTopTarget = this.floorsDiv.scrollTop + scrollDiff * scrollInt;

            var intCount = 0;
            var self = this;
            var scrollFloorsPerClick = 1;

            // scroll by 2 floors if num of floors greater than 5 AND there are at least 2 more floors available to scroll into view          
            if (this.locModel.availFloors.length > 5){ 
                var floorsDivBB = this.floorsDiv.getBoundingClientRect();
                if (scrollInt < 0) {
                    var topButton = dojoQuery('.btn', this.floorsDiv)[0];
                    if (Math.abs(topButton.getBoundingClientRect().top - floorsDivBB.top) >= scrollDiff * 2){
                        scrollFloorsPerClick = 2;
                    }
                } else {
                    var bottomButton = dojoQuery('.btn:last-child', this.floorsDiv)[0];
                    if (Math.abs(bottomButton.getBoundingClientRect().bottom - floorsDivBB.bottom) >= scrollDiff * 2){
                         scrollFloorsPerClick = 2;
                    }
                }
            }
            
            var interval = setInterval(function() {
                intCount += scrollFloorsPerClick;
                targetDiv.scrollTop += scrollInt * scrollFloorsPerClick;
                if (intCount >= scrollDiff * scrollFloorsPerClick) {
                    clearInterval(interval);
                    self.adjustScrollButtons();
                }
            }, 5);
        },

        adjustVisibility: function(newZoomLevel) {
            if (newZoomLevel < 17) {
                domClass.add(this.domNode, 'hide');
            } else {
                domClass.remove(this.domNode, 'hide');
                this.scrollHighlightedIntoView();
            }

        },

        constructUI: function() {
            var self = this;

            // clear existing picker
            domConstruct.empty(this.floorsDiv);

            if (this.locModel.availFloors.length > 5) {
                domClass.remove(this.scrollUp, 'hide disabled');
                domClass.remove(this.scrollDown, 'hide disabled');
                domClass.add(this.domNode, 'set-height');
            } else {
                domClass.add(this.scrollUp, 'hide');
                domClass.add(this.scrollDown, 'hide');
                domClass.remove(this.domNode, 'set-height');
            }

            // sort the available floors. they're just in the query return order.
            this.locModel.availFloors.sort(function(a, b) {
                var intA = parseInt(a, 10);
                var intB = parseInt(b, 10);

                // regular string compare if they're both not numbers,
                // or if they're both the same number.
                if ((isNaN(intA) && isNaN(intB)) || (intA === intB)) {
                    return (a < b) ? -1 : (a > b) ? 1 : 0;
                }
                // if only one is not a number, put that sooner in the array.
                // if they're both numbers, subtract.
                return (isNaN(intA)) ? -1 : isNaN(intB) ? 1 : (intA - intB);
            });

            // construct button for each floor
            _.each(this.locModel.availFloors, function(floorNum) {
                domConstruct.create('div', {
                    'class': 'btn',
                    'innerHTML': floorNum,
                    'data-floornum': floorNum,
                    'click': lang.hitch(self, self.floorButtonClick, floorNum)
                }, self.floorsDiv, 'first');
            });

            // can't rely on updateHighlightedFloor to be called after constructUI --
            // it often happens before or simulataneously -- so just call it again ourselves.
            this.updateHighlightedFloor();
        },

        updateHighlightedFloor: function() {
            var self = this;
            var theseButtons = dojoQuery('.btn', this.floorsDiv);
            // i hate you, dojoQuery. theseButtons.toggleClass doesn't work with a function so it won't toggle
            // classes separately on each btn, and domClass.toggle doesn't work with the results of a dojoQuery.
            _.each(theseButtons, function(btn) {
                domClass.toggle(btn, 'highlight', domAttr.get(btn, 'data-floornum') === self.locModel.floor);
            });
            this.scrollHighlightedIntoView();

        },

        scrollHighlightedIntoView: function() {
            if (this.locModel.availFloors.length <= 5) {
                return;
            }
            var highlightedFloorBtn = dojoQuery('.highlight', this.domNode)[0];
            if (highlightedFloorBtn) {
                if (highlightedFloorBtn.scrollIntoViewIfNeeded) {
                    highlightedFloorBtn.scrollIntoViewIfNeeded();
                } else if (highlightedFloorBtn.scrollIntoView) {
                    highlightedFloorBtn.scrollIntoView();
                } else {
                    console.warn('new highlighted floor not visible, but scrollintoview not available. do something!');
                }
            }
            this.adjustScrollButtons();
        },

        floorButtonClick: function(floorNum, evt) {
            /* jshint unused: false */
            if (floorNum === this.locModel.floor) {
                return;
            }
            this.locModel.set('floor', floorNum);
        }
    });
});
