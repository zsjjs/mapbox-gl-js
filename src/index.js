'use strict';

const browser = require('./util/browser');

// jshint -W079
const mapboxgl = module.exports = {};

mapboxgl.version = require('../package.json').version;
mapboxgl.workerCount = Math.max(Math.floor(browser.hardwareConcurrency / 2), 1);

mapboxgl.Map = require('./ui/map');
mapboxgl.NavigationControl = require('./ui/control/navigation_control');
mapboxgl.GeolocateControl = require('./ui/control/geolocate_control');
mapboxgl.AttributionControl = require('./ui/control/attribution_control');
mapboxgl.ScaleControl = require('./ui/control/scale_control');
mapboxgl.FullscreenControl = require('./ui/control/fullscreen_control');
mapboxgl.Popup = require('./ui/popup');
mapboxgl.Marker = require('./ui/marker');

mapboxgl.Style = require('./style/style');

mapboxgl.LngLat = require('./geo/lng_lat');
mapboxgl.LngLatBounds = require('./geo/lng_lat_bounds');
mapboxgl.Point = require('point-geometry');

mapboxgl.Evented = require('./util/evented');
mapboxgl.supported = require('./util/browser').supported;

const config = require('./util/config');
mapboxgl.config = config;

const rtlTextPlugin = require('./source/rtl_text_plugin');

mapboxgl.setRTLTextPlugin = rtlTextPlugin.setRTLTextPlugin;

 /**
  * 设置地图的 [RTL text plugin](https://www.mapbox.com/mapbox-gl-js/plugins/#mapbox-gl-rtl-text)。
  * 对支持从右向左书写的语言（如阿拉伯语和希伯来语）来说是必要的。
  *
  * @function setRTLTextPlugin
  * @param {string} pluginURL URL 链接 Mapbox RTL 文本插件数据源的 URL。
  * @param {Function} callback 出现错误时使用错误参数（argument）调用。
  * @example
  * mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.1.0/mapbox-gl-rtl-text.js');
  * @see [添加从右向左书写支持](https://www.mapbox.com/mapbox-gl-js/example/mapbox-gl-rtl-text/)
  */

Object.defineProperty(mapboxgl, 'accessToken', {
    get: function() { return config.ACCESS_TOKEN; },
    set: function(token) { config.ACCESS_TOKEN = token; }
});

/**
 * 获得并设置地图的 [access token](https://www.mapbox.com/help/define-access-token/)。
 *
 * @var {string} accessToken
 * @example
 * mapboxgl.accessToken = myAccessToken;
 * @see [显示地图](https://www.mapbox.com/mapbox-gl-js/examples/)
 */

/**
 * 当前使用的 Mapbox GL JS 的版本在 `package.json`,
 * `CHANGELOG.md`, 以及 the GitHub release中有详细说明。
 *
 * @var {string} version
 */

/**
 * 返回一个布尔值，用以只是浏览器是否 [支持 Mapbox GL JS](https://www.mapbox.com/help/mapbox-browser-support/#mapbox-gl-js)。
 *
 * @function supported
 * @param {Object} options
 * @param {boolean} [options.failIfMajorPerformanceCaveat=false] 如果为 `true`,
 *   the function will return `false` if the performance of Mapbox GL JS would
 *   be dramatically worse than expected (i.e. a software renderer would be used).
 * @return {boolean}
 * @example
 * mapboxgl.supported() // = true
 * @see [点击查看支持的浏览器](https://www.mapbox.com/mapbox-gl-js/example/check-for-support/)
 */
