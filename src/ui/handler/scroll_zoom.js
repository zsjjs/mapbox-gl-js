'use strict';

const DOM = require('../../util/dom');
const util = require('../../util/util');
const browser = require('../../util/browser');
const window = require('../../util/window');

const ua = window.navigator.userAgent.toLowerCase(),
    firefox = ua.indexOf('firefox') !== -1,
    safari = ua.indexOf('safari') !== -1 && ua.indexOf('chrom') === -1;

/**
 * `ScrollZoomHandler` 让用户能够通过滚轮来缩放地图。
 *
 * @param {Map} map 需要添加处理程序（handler）的 Mapbox GL JS 地图。
 */
class ScrollZoomHandler {
    constructor(map) {
        this._map = map;
        this._el = map.getCanvasContainer();

        util.bindAll([
            '_onWheel',
            '_onTimeout'
        ], this);
    }

    /**
     * 返回一个指示“滚动缩放”交互是否激活的布尔值。
     *
     * @returns {boolean} 如果“滚动缩放”交互已激活，为`true` 。
     */
    isEnabled() {
        return !!this._enabled;
    }

    /**
     * 激活“滚动缩放”交互功能。
     *
     * @param {Object} [options]
     * @param {string} [options.around] 如果传递了“center”，将在地图中心周围缩放。
     *
     * @example
     *   map.scrollZoom.enable();
     * @example
     *  map.scrollZoom.enable({ around: 'center' })
     */
    enable(options) {
        if (this.isEnabled()) return;
        this._el.addEventListener('wheel', this._onWheel, false);
        this._el.addEventListener('mousewheel', this._onWheel, false);
        this._enabled = true;
        this._aroundCenter = options && options.around === 'center';
    }

    /**
     * 禁用“滚动缩放”交互功能。
     *
     * @example
     *   map.scrollZoom.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._el.removeEventListener('wheel', this._onWheel);
        this._el.removeEventListener('mousewheel', this._onWheel);
        this._enabled = false;
    }

    _onWheel(e) {
        let value;

        if (e.type === 'wheel') {
            value = e.deltaY;
            // Firefox doubles the values on retina screens...
            if (firefox && e.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL) value /= browser.devicePixelRatio;
            if (e.deltaMode === window.WheelEvent.DOM_DELTA_LINE) value *= 40;

        } else if (e.type === 'mousewheel') {
            value = -e.wheelDeltaY;
            if (safari) value = value / 3;
        }

        const now = browser.now(),
            timeDelta = now - (this._time || 0);

        this._pos = DOM.mousePos(this._el, e);
        this._time = now;

        if (value !== 0 && (value % 4.000244140625) === 0) {
            // This one is definitely a mouse wheel event.
            this._type = 'wheel';

        } else if (value !== 0 && Math.abs(value) < 4) {
            // This one is definitely a trackpad event because it is so small.
            this._type = 'trackpad';

        } else if (timeDelta > 400) {
            // This is likely a new scroll action.
            this._type = null;
            this._lastValue = value;

            // Start a timeout in case this was a singular event, and dely it by up to 40ms.
            this._timeout = setTimeout(this._onTimeout, 40);

        } else if (!this._type) {
            // This is a repeating event, but we don't know the type of event just yet.
            // If the delta per time is small, we assume it's a fast trackpad; otherwise we switch into wheel mode.
            this._type = (Math.abs(timeDelta * value) < 200) ? 'trackpad' : 'wheel';

            // Make sure our delayed event isn't fired again, because we accumulate
            // the previous event (which was less than 40ms ago) into this event.
            if (this._timeout) {
                clearTimeout(this._timeout);
                this._timeout = null;
                value += this._lastValue;
            }
        }

        // Slow down zoom if shift key is held for more precise zooming
        if (e.shiftKey && value) value = value / 4;

        // Only fire the callback if we actually know what type of scrolling device the user uses.
        if (this._type) this._zoom(-value, e);

        e.preventDefault();
    }

    _onTimeout() {
        this._type = 'wheel';
        this._zoom(-this._lastValue);
    }

    _zoom(delta, e) {
        if (delta === 0) return;
        const map = this._map;

        // Scale by sigmoid of scroll wheel delta.
        let scale = 2 / (1 + Math.exp(-Math.abs(delta / 100)));
        if (delta < 0 && scale !== 0) scale = 1 / scale;

        const fromScale = map.ease ? map.ease.to : map.transform.scale,
            targetZoom = map.transform.scaleZoom(fromScale * scale);

        map.zoomTo(targetZoom, {
            duration: this._type === 'wheel' ? 200 : 0,
            around: this._aroundCenter ? map.getCenter() : map.unproject(this._pos),
            delayEndEvents: 200,
            smoothEasing: true
        }, { originalEvent: e });
    }
}

module.exports = ScrollZoomHandler;

/**
 * 在用户交互或 {@link Map#flyTo}
 * 等方法引发缩放级别动态转换时重复触发。
 *
 * @event zoomstart
 * @memberof Map
 * @instance
 * @property {MapMouseEvent | MapTouchEvent} data
 */

/**
 * 在用户交互或 {@link Map#flyTo}
 * 等方法引发缩放级别转换之前触发。
 *
 * @event zoom
 * @memberof Map
 * @instance
 * @property {MapMouseEvent | MapTouchEvent} data
 * @see [通过缩放级别更新等值线图层](https://www.mapbox.com/mapbox-gl-js/example/updating-choropleth/)
 */

/**
 * 在用户交互或 {@link Map#flyTo}
 * 等方法使地图完成缩放级别转换之后触发。
 *
 * @event zoomend
 * @memberof Map
 * @instance
 * @property {MapMouseEvent | MapTouchEvent} data
 */
