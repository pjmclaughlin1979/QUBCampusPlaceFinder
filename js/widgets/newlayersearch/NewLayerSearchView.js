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
    'dojo/_base/event',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-attr',
    'dojo/topic',
    'dojo/query',
    'dojo/keys',
    'dojo/has',
    'dojo/on',
    'dojo/NodeList-dom',
    'dojo/NodeList-traverse',

    'esri/dijit/_EventedWidget',
    'dijit/_TemplatedMixin',
    'dijit/focus',

    'dojo/text!./NewLayerSearchView.html'],

function(declare, dojoEvent, lang, domConstruct, domStyle, domClass, domAttr, topic, dojoQuery, dojoKeys, dojoHas, dojoOn, nld, nlm,
    _EventedWidget, _TemplatedMixin, focusUtil,
    template) {

    return declare([_EventedWidget, _TemplatedMixin], {

        templateString: template,
        locModel: null,
        id: 'layerSearch',
        inputTimeout: setTimeout(function() {}, 100),
        inputValue: '',
        minChars: 3,

        constructor: function(options) {
            this.inherited(arguments);
            this.resources = options.resources;
        },

        postCreate: function() {
            this.inherited(arguments);
        },

        startup: function() {
            this.inherited(arguments);
            this.addEventListeners();
        },

        addEventListeners: function() {
            // dojoOn(document, 'click', lang.hitch(this, this.clearResults));

            topic.subscribe('map-resize', lang.hitch(this, this.onMapResize));
            dojoOn(this.viewWidget, 'mappanel-show', lang.hitch(this, this.focus));

            dojoOn(this.inputNode, 'keyup', lang.hitch(this, this.onInputKeyUp));
            dojoOn(this.inputNode, 'keydown', lang.hitch(this, this.onInputKeyDown));

            dojoOn(this.submitNode, 'click', lang.hitch(this, this.onInputKeyUp));
            dojoOn(this.clearNode, 'click', lang.hitch(this, this.clear));

            dojoOn(this.resultsNode, 'click', lang.hitch(this, this.resultClickHandler));
            dojoOn(this.resultsNode, 'keydown', lang.hitch(this, this.resultKeydownHandler));

        },

        // public methods
        focus: function() {
            focusUtil.focus(this.inputNode);
            // this added delay allows for the map cover to slide up, possibly pushing the
            // input node out of view on iOS. we need to scroll back to it. the .focus event
            // WILL NOT BE TRIGGERED IN iOS FROM A SETTIMEOUT! (which is why it's not in the setTimeout)
            var self = this;
            setTimeout(function() {
                if (self.inputNode.scrollIntoViewIfNeeded) {
                    self.inputNode.scrollIntoViewIfNeeded();
                } else if (self.inputNode.scrollIntoView) {
                    self.inputNode.scrollIntoView();
                } else {
                    console.warn('input node not visible, but scrollintoview not available. do something!');
                }
            }, 500);
        },

        blur: function() {
            console.debug('blur');
            this.inputNode.blur();
            this.clearResults();
        },

        clear: function() {
            console.debug('clear');
            domAttr.set(this.inputNode, 'value', '');
            this.inputValue = '';
            domClass.remove(this.containerNode, 'has-input');
            domClass.remove(this.domNode, 'search-error');
            this.clearResults();
            if (!dojoHas('ie')) {
                this.focus();
            }
            this.emit('clear');
        },

        clearResults: function() {
            domConstruct.empty(this.resultsNode);
            if (dojoHas('ie')) {
                this.hideResultsNode();
            }
            this.clearSearchError();
        },

        hideResultsNode: function() {
            domClass.add(this.resultsNode, 'hide');
        },

        showResultsNode: function() {
            domClass.remove(this.resultsNode, 'hide');
        },

        onInputKeyUp: function(evt) {
            if (!evt || evt.ctrlKey || evt.metaKey || evt.altKey || evt.keyCode === dojoKeys.copyKey || evt.keyCode === dojoKeys.ALT || evt.keyCode === dojoKeys.CTRL || evt.keyCode === dojoKeys.META || evt.keyCode === dojoKeys.SHIFT || evt.keyCode === dojoKeys.UP_ARROW || evt.keyCode === dojoKeys.DOWN_ARROW || evt.keyCode === dojoKeys.LEFT_ARROW || evt.keyCode === dojoKeys.RIGHT_ARROW) {
                return;
            }

            this.clearInputTimeout();

            this.inputValue = this.inputNode.value || '';

            // TODO: handle enter and escape on inputNode
            if (this.inputValue === '') {
                console.debug('no string here');
                domClass.remove(this.containerNode, 'has-input');
                this.clearResults();
                return;
            // } else if (evt.keyCode === dojoKeys.ENTER) {
            //     this.clearResults();
            //     this.emit('search-immediate', this.inputValue);
            } else if (evt.keyCode === dojoKeys.ESCAPE || evt.keyCode === dojoKeys.TAB) {
                this.clearResults();
                this.emit('search-cancel');
            } else if (this.inputValue.length < this.minChars && evt.keyCode && evt.keyCode !== dojoKeys.ENTER) {
                this.clearResults();
                domClass.add(this.containerNode, 'has-input');
                console.debug('input too short', this.inputValue);
                return;
            } else {
                this.inputTimeout = setTimeout(lang.hitch(this, this.handleInput), this.searchDelay);
            }
        },

        handleInput: function() {
            domClass.add(this.containerNode, 'loading has-input');
            this.emit('input-change', this.inputValue);
        },

        // capture keydown for tab and arrow navigation.
        // for all other key events, wait 'til key up.
        onInputKeyDown: function(evt) {
            if (!evt) {
                return;
            }

            var resultList = dojoQuery('.LSResult', this.resultsNode);
            if (!resultList.length) {
                return;
            }

            switch (evt.keyCode) {
                case dojoKeys.TAB:
                    // TODO
                    console.debug('tab pressed. cancelled deferreds, hide menus.');
                    break;

                case (dojoKeys.UP_ARROW):
                    dojoEvent.stop(evt);
                    resultList[resultList.length - 1].focus();
                    break;

                case (dojoKeys.DOWN_ARROW):
                    dojoEvent.stop(evt);
                    resultList[0].focus();
                    break;
            }
        },

        resultClickHandler: function(evt) {
            this.selectFeatureFromResult(evt.target);
        },

        resultKeydownHandler: function(evt) {
            if (evt.keyCode === dojoKeys.ENTER) {
                this.selectFeatureFromResult(evt.target);
                return;
            }
            if (evt.keyCode === dojoKeys.DOWN_ARROW || evt.keyCode === dojoKeys.UP_ARROW) {
                dojoEvent.stop(evt);
                this.adjustResultFocus(evt.keyCode, evt.target);
            }

        },

        adjustResultFocus: function(keyCode, resultEl) {
            var resultList = dojoQuery('.LSResult');
            var currentIndex = parseInt(domAttr.get(resultEl, 'data-idx'), 10);

            if ((keyCode === dojoKeys.DOWN_ARROW && currentIndex + 1 === resultList.length) || (keyCode === dojoKeys.UP_ARROW && currentIndex === 0)) {
                this.inputNode.focus();
            } else {
                var newIndex = keyCode === dojoKeys.DOWN_ARROW ? currentIndex + 1 : currentIndex - 1;
                resultList[newIndex].focus();
            }

        },

        selectFeatureFromResult: function(target) {
            var li = dojoQuery(target).closest('li')[0];
            console.debug('li: ', domAttr.get(li, 'data-oid'), domAttr.get(li, 'data-lyr'));
            var labelText = li.innerText || li.textContent;
            if (!labelText) {
                console.warn('aw crap, need to find li text some other way');
                labelText = 'Browser error!';
            }
            labelText = labelText.trim ? labelText.trim() : labelText.replace(/^\s+|\s+$/g, '');

            domAttr.set(this.inputNode, 'value', labelText);
            this.clearResults();

            this.emit('select-oid', {
                oid: domAttr.get(li, 'data-oid'),
                lyr: domAttr.get(li, 'data-lyr')
            });
        },


        clearInputTimeout: function() {
            clearTimeout(this.inputTimeout);
        },

        handleFormattedResults: function(results) {
            domClass.remove(this.containerNode, 'loading');
            domClass.add(this.containerNode, 'has-input');
            if (!results.length) {
                this.handleNoResults();
                return;
            }

            if (dojoHas('ie')) {
                this.showResultsNode();
            }

            this.clearSearchError();

            var regex = new RegExp('(' + this.inputValue + ')', 'gi');

            var resultsUL = domConstruct.create('ul', {
                'class': 'resultsList'
            });

            _.each(results, function(resultObj, idx) {
                var formattedLabel = resultObj.label.replace(regex, '<strong>$1</strong>');

                domConstruct.create('li', {
                    'class': 'LSResult',
                    'data-oid': resultObj.oid,
                    'data-lyr': resultObj.layer,
                    'data-idx': idx,
                    'tabindex': '0',
                    innerHTML:  '<span class="search-results-icon ' + resultObj.iconClass + '"></span> ' + formattedLabel + '</li>'

                }, resultsUL);
            });

            // TODO: figure out why the phantom resultsNode is being left behind
            // domStyle.set(this.resultsNode, 'maxHeight', 'none');
            domConstruct.empty(this.resultsNode);
            domConstruct.place(resultsUL, this.resultsNode);
            // domStyle.set(this.resultsNode, 'maxHeight', this.searchResultsHeight + 'px');
        },

        clearSearchError: function() {
            domClass.remove(this.domNode, 'search-error');
        },

        handleNoResults: function() {
            domConstruct.empty(this.resultsNode);
            if (dojoHas('ie')) {
                this.hideResultsNode();
            }
            domClass.add(this.domNode, 'search-error');
        },

        onMapResize: function(newMapDimensions) {
            this.searchResultsHeight = _.min([newMapDimensions.h * 0.8 - 50, 450]);
            domStyle.set(this.resultsNode, 'maxHeight', this.searchResultsHeight + 'px');
        }

    });
});
