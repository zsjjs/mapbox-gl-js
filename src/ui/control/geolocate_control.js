'use strict';

const Evented = require('../../util/evented');
const DOM = require('../../util/dom');
const window = require('../../util/window');
const util = require('../../util/util');

const defaultGeoPositionOptions = { enableHighAccuracy: false, timeout: 6000 /* 6sec */ };
const className = 'mapboxgl-ctrl';

let supportsGeolocation;

function checkGeolocationSupport(callback) {
    if (supportsGeolocation !== undefined) {
        callback(supportsGeolocation);

    } else if (window.navigator.permissions !== undefined) {
        // navigator.permissions has incomplete browser support
        // http://caniuse.com/#feat=permissions-api
        // Test for the case where a browser disables Geolocation because of an
        // insecure origin
        window.navigator.permissions.query({ name: 'geolocation' }).then((p) => {
            supportsGeolocation = p.state !== 'denied';
            callback(supportsGeolocation);
        });

    } else {
        supportsGeolocation = !!window.navigator.geolocation;
        callback(supportsGeolocation);
    }
}

/**
 * `GeolocateControl` 控件提供一个按钮，该按钮使用浏览器的地理定位（geolocation） 
 * API 可在地图上定位用户当前位置。
 *
 * 但不是所有的浏览器都支持地理定位，
 * 并且有的用户会选择禁用该功能。
 * 现代浏览器（包括 Chrome）的地理定位功能需要网站使用 HTTPS。
 * 如果地理定位功能不可用，
 * GeolocateControl 将隐藏。
 *
 * @implements {IControl}
 * @param {Object} [options]
 * @param {Object} [options.positionOptions={enableHighAccuracy: false, timeout: 6000}] 一个 [PositionOptions](https://developer.mozilla.org/en-US/docs/Web/API/PositionOptions) 对象。
 * @param {Object} [options.watchPosition=false] 如果为 `true` ，每次设备位置变动地图都会重新定位，控件变为了开关控件（toggle）。
 * @example
 * map.addControl(new mapboxgl.GeolocateControl({
 *     positionOptions: {
 *         enableHighAccuracy: true
 *     }
 * }));
 */
class GeolocateControl extends Evented {

    constructor(options) {
        super();
        this.options = options || {};
        util.bindAll([
            '_onSuccess',
            '_onError',
            '_finish',
            '_setupUI'
        ], this);
    }

    onAdd(map) {
        this._map = map;
        this._container = DOM.create('div', `${className} ${className}-group`);
        checkGeolocationSupport(this._setupUI);
        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    _onSuccess(position) {
        this._map.jumpTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 17,
            bearing: 0,
            pitch: 0
        });

        this.fire('geolocate', position);
        this._finish();
    }

    _onError(error) {
        this.fire('error', error);
        this._finish();
    }

    _finish() {
        if (this._timeoutId) { clearTimeout(this._timeoutId); }
        this._timeoutId = undefined;
    }

    _setupUI(supported) {
        if (supported === false) return;
        this._container.addEventListener('contextmenu',
            e => e.preventDefault());
        this._geolocateButton = DOM.create('button',
            `${className}-icon ${className}-geolocate`,
            this._container);
        this._geolocateButton.type = 'button';
        this._geolocateButton.setAttribute('aria-label', 'Geolocate');
        if (this.options.watchPosition) this._geolocateButton.setAttribute('aria-pressed', false);
        this._geolocateButton.addEventListener('click',
            this._onClickGeolocate.bind(this));
    }

    _onClickGeolocate() {
        const positionOptions = util.extend(defaultGeoPositionOptions, this.options && this.options.positionOptions || {});

        // toggle watching the device location
        if (this.options.watchPosition) {
            if (this._geolocationWatchID !== undefined) {
                // clear watchPosition
                this._geolocateButton.classList.remove('mapboxgl-watching');
                this._geolocateButton.setAttribute('aria-pressed', false);
                window.navigator.geolocation.clearWatch(this._geolocationWatchID);
                this._geolocationWatchID = undefined;
            } else {
                // enable watchPosition
                this._geolocateButton.classList.add('mapboxgl-watching');
                this._geolocateButton.setAttribute('aria-pressed', true);
                this._geolocationWatchID = window.navigator.geolocation.watchPosition(
                    this._onSuccess, this._onError, positionOptions);
            }
        } else {
            window.navigator.geolocation.getCurrentPosition(
                this._onSuccess, this._onError, positionOptions);

            // This timeout ensures that we still call finish() even if
            // the user declines to share their location in Firefox
            this._timeoutId = setTimeout(this._finish, 10000 /* 10sec */);
        }
    }
}

module.exports = GeolocateControl;

/**
 * geolocate 事件。
 *
 * @event geolocate
 * @memberof GeolocateControl
 * @instance
 * @property {Position} data [Geolocation.getCurrentPosition()](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) 中回调函数（callback）返回的[Position](https://developer.mozilla.org/en-US/docs/Web/API/Position) 对象。
 *
 */

/**
 * error 事件。
 *
 * @event error
 * @memberof GeolocateControl
 * @instance
 * @property {PositionError} data [Geolocation.getCurrentPosition()](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) 中回调函数返回的[PositionError](https://developer.mozilla.org/en-US/docs/Web/API/PositionError) 对象。
 *
 */
