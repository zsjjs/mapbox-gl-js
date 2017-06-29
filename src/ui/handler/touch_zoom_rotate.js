'use strict';

const DOM = require('../../util/dom');
const util = require('../../util/util');
const window = require('../../util/window');

const inertiaLinearity = 0.15,
    inertiaEasing = util.bezier(0, 0, inertiaLinearity, 1),
    inertiaDeceleration = 12, // scale / s^2
    inertiaMaxSpeed = 2.5, // scale / s
    significantScaleThreshold = 0.15,
    significantRotateThreshold = 4;

/**
 * `TouchZoomRotateHandler` 使用户可以通过捏合触屏
 * 缩放和旋转地图。
 *
 * @param {Map} map 需要添加处理程序（handler）的 Mapbox GL JS 地图。
 */
class TouchZoomRotateHandler {
    constructor(map) {
        this._map = map;
        this._el = map.getCanvasContainer();

        util.bindAll([
            '_onStart',
            '_onMove',
            '_onEnd'
        ], this);
    }

    /**
     * 返回一个指示“捏合（pintch）旋转和缩放”交互功能是否激活的布尔值。
     *
     * @returns {boolean} 如果“捏合旋转和缩放”交互功能已激活，为`true` 。
     */
    isEnabled() {
        return !!this._enabled;
    }

    /**
     * 激活“捏合旋转和缩放”交互功能。
     *
     * @param {Object} [options]
     * @param {string} [options.around] 如果传递了“center”，将围绕地图中心缩放。
     *
     * @example
     *   map.touchZoomRotate.enable();
     * @example
     *   map.touchZoomRotate.enable({ around: 'center' });
     */
    enable(options) {
        if (this.isEnabled()) return;
        this._el.classList.add('mapboxgl-touch-zoom-rotate');
        this._el.addEventListener('touchstart', this._onStart, false);
        this._enabled = true;
        this._aroundCenter = options && options.around === 'center';
    }

    /**
     * 禁用“捏合旋转和缩放”交互功能。
     *
     * @example
     *   map.touchZoomRotate.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._el.classList.remove('mapboxgl-touch-zoom-rotate');
        this._el.removeEventListener('touchstart', this._onStart);
        this._enabled = false;
    }

    /**
     * 禁用“捏合旋转”交互，启用“捏合缩放”交互。
     * interaction enabled.
     *
     * @example
     *   map.touchZoomRotate.disableRotation();
     */
    disableRotation() {
        this._rotationDisabled = true;
    }

    /**
     * 启用“捏合旋转”交互。
     *
     * @example
     *   map.touchZoomRotate.enable();
     *   map.touchZoomRotate.enableRotation();
     */
    enableRotation() {
        this._rotationDisabled = false;
    }

    _onStart(e) {
        if (e.touches.length !== 2) return;

        const p0 = DOM.mousePos(this._el, e.touches[0]),
            p1 = DOM.mousePos(this._el, e.touches[1]);

        this._startVec = p0.sub(p1);
        this._startScale = this._map.transform.scale;
        this._startBearing = this._map.transform.bearing;
        this._gestureIntent = undefined;
        this._inertia = [];

        window.document.addEventListener('touchmove', this._onMove, false);
        window.document.addEventListener('touchend', this._onEnd, false);
    }

    _onMove(e) {
        if (e.touches.length !== 2) return;

        const p0 = DOM.mousePos(this._el, e.touches[0]),
            p1 = DOM.mousePos(this._el, e.touches[1]),
            p = p0.add(p1).div(2),
            vec = p0.sub(p1),
            scale = vec.mag() / this._startVec.mag(),
            bearing = this._rotationDisabled ? 0 : vec.angleWith(this._startVec) * 180 / Math.PI,
            map = this._map;

        // Determine 'intent' by whichever threshold is surpassed first,
        // then keep that state for the duration of this gesture.
        if (!this._gestureIntent) {
            const scalingSignificantly = (Math.abs(1 - scale) > significantScaleThreshold),
                rotatingSignificantly = (Math.abs(bearing) > significantRotateThreshold);

            if (rotatingSignificantly) {
                this._gestureIntent = 'rotate';
            } else if (scalingSignificantly) {
                this._gestureIntent = 'zoom';
            }

            if (this._gestureIntent) {
                this._startVec = vec;
                this._startScale = map.transform.scale;
                this._startBearing = map.transform.bearing;
            }

        } else {
            const param = { duration: 0, around: map.unproject(p) };

            if (this._gestureIntent === 'rotate') {
                param.bearing = this._startBearing + bearing;
            }
            if (this._gestureIntent === 'zoom' || this._gestureIntent === 'rotate') {
                param.zoom = map.transform.scaleZoom(this._startScale * scale);
            }

            map.stop();
            this._drainInertiaBuffer();
            this._inertia.push([Date.now(), scale, p]);

            map.easeTo(param, { originalEvent: e });
        }

        e.preventDefault();
    }

    _onEnd(e) {
        window.document.removeEventListener('touchmove', this._onMove);
        window.document.removeEventListener('touchend', this._onEnd);
        this._drainInertiaBuffer();

        const inertia = this._inertia,
            map = this._map;

        if (inertia.length < 2) {
            map.snapToNorth({}, { originalEvent: e });
            return;
        }

        const last = inertia[inertia.length - 1],
            first = inertia[0],
            lastScale = map.transform.scaleZoom(this._startScale * last[1]),
            firstScale = map.transform.scaleZoom(this._startScale * first[1]),
            scaleOffset = lastScale - firstScale,
            scaleDuration = (last[0] - first[0]) / 1000,
            p = last[2];

        if (scaleDuration === 0 || lastScale === firstScale) {
            map.snapToNorth({}, { originalEvent: e });
            return;
        }

        // calculate scale/s speed and adjust for increased initial animation speed when easing
        let speed = scaleOffset * inertiaLinearity / scaleDuration; // scale/s

        if (Math.abs(speed) > inertiaMaxSpeed) {
            if (speed > 0) {
                speed = inertiaMaxSpeed;
            } else {
                speed = -inertiaMaxSpeed;
            }
        }

        const duration = Math.abs(speed / (inertiaDeceleration * inertiaLinearity)) * 1000;
        let targetScale = lastScale + speed * duration / 2000;

        if (targetScale < 0) {
            targetScale = 0;
        }

        map.easeTo({
            zoom: targetScale,
            duration: duration,
            easing: inertiaEasing,
            around: this._aroundCenter ? map.getCenter() : map.unproject(p)
        }, { originalEvent: e });
    }

    _drainInertiaBuffer() {
        const inertia = this._inertia,
            now = Date.now(),
            cutoff = 160; // msec

        while (inertia.length > 2 && now - inertia[0][0] > cutoff) inertia.shift();
    }
}

module.exports = TouchZoomRotateHandler;
