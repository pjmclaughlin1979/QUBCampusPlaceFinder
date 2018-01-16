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
var pathRegex = new RegExp(/\/[^\/]+$/);
var locationPath = location.pathname.replace(pathRegex, '');
if (locationPath.slice(-1) !== '/') { locationPath += '/'; }

require({
    packages: [
        { name: 'app', location: locationPath + 'js/app'},
        { name: 'widgets',  location:  locationPath + 'js/widgets'},
        { name: 'config',  location:  locationPath + 'js/config'}
    ]
}, [
    'esri/arcgis/OAuthInfo',
    'esri/IdentityManager',
    'app/controller',
    'config/config', // if you change this, change the one in controller.js too
    'dojo/domReady!'], function(OAuthInfo, esriID, Controller, config) {

        if (config.authentication && config.authentication.appId) {
            var info = new OAuthInfo({
                appId: config.authentication.appId,
                authNamespace: 'portal_oauth_inline',
                popup: false
            });
            if (config.portalUrl) {
                info.portalUrl = config.portalUrl;
            }
            esriID.registerOAuthInfos([info]);

            esriID.getCredential(info.portalUrl);

            esriID.checkSignInStatus(info.portalUrl).then(function() {
                Controller.startup();
            }).otherwise(function() {
                console.debug('login failed. otherwise.', arguments);
            });
        } else {
            Controller.startup();
        }

  }
);

