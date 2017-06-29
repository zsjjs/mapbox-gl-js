'use strict';

const DOM = require('../../util/dom');
const util = require('../../util/util');
const window = require('../../util/window');

const inertiaLinearity = 0.25,
    inertiaEasing = util.bezier(0, 0, inertiaLinearity, 1),
    inertiaMaxSpeed = 180, // deg/s
    inertiaDeceleration = 720; // deg/s^2

/**
 * `DragRotateHandler` 允许用户在按住拖动光标的同时长按鼠标右键
 * 或 `ctrl` 键的情况下旋转地图。
 *
 * @param {Map} map 需要添加处理程序（handler）的 Mapbox GL JS 地图。
 * @param {Object} [options]
 * @param {number} [options.bearingSnap] 该阙值决定地图方向角（bearing）
 *   何时对齐正北方，以度计量。
 * @param {bool} [options.pitchWithRotate=true] 控制地图的倾斜度及方位角。
 */
class DragRotateHandler {
    constructor(map, options) {
        this._map = map;
        this._el = map.getCanvasContainer();
        this._bearingSnap = options.bearingSnap;
        this._pitchWithRotate = options.pitchWithRotate !== false;

        util.bindAll([
            '_onDown',
            '_onMove',
            '_onUp'
        ], this);

    }

    /**
     * 返回一个指示“拖动旋转”交互是否激活的布尔值。
     *
     * @returns {boolean} 如果“拖动旋转”交互已激活，为`true` 。
     */
    isEnabled() {
        return !!this._enabled;
    }

    /**
     * 返回一个指示“拖动旋转”功能是否正在运行（也就是说用户是否正在使用）的布尔值。
     *
     * @returns {boolean} 如果“拖动旋转”交互正在运行，为`true` 。
     */
    isActive() {
        return !!this._active;
    }

    /**
     * 激活“拖动旋转”交互功能。
     *
     * @example
     * map.dragRotate.enable();
     */
    enable() {
        if (this.isEnabled()) return;
        this._el.addEventListener('mousedown', this._onDown);
        this._enabled = true;
    }

    /**
     * 禁用“拖动旋转”交互功能。
     *
     * @example
     * map.dragRotate.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._el.removeEventListener('mousedown', this._onDown);
        this._enabled = false;
    }

    _onDown(e) {
        if (this._ignoreEvent(e)) return;
        if (this.isActive()) return;

        window.document.addEventListener('mousemove', this._onMove);
        window.document.addEventListener('mouseup', this._onUp);
        /* Deactivate DragRotate when the window looses focus. Otherwise if a mouseup occurs when the window isn't in focus, DragRotate will still be active even though the mouse is no longer pressed. */
        window.addEventListener('blur', this._onUp);

        this._active = false;
        this._inertia = [[Date.now(), this._map.getBearing()]];
        this._startPos = this._pos = DOM.mousePos(this._el, e);
        this._center = this._map.transform.centerPoint;  // Center of rotation

        e.preventDefault();
    }

    _onMove(e) {
        if (this._ignoreEvent(e)) return;

        if (!this.isActive()) {
            this._active = true;
            this._map.moving = true;
            this._fireEvent('rotatestart', e);
            this._fireEvent('movestart', e);
            if (this._pitchWithRotate) {
                this._fireEvent('pitchstart', e);
            }
        }

        const map = this._map;
        map.stop();

        const p1 = this._pos,
            p2 = DOM.mousePos(this._el, e),
            bearingDiff = (p1.x - p2.x) * 0.8,
            pitchDiff = (p1.y - p2.y) * -0.5,
            bearing = map.getBearing() - bearingDiff,
            pitch = map.getPitch() - pitchDiff,
            inertia = this._inertia,
            last = inertia[inertia.length - 1];

        this._drainInertiaBuffer();
        inertia.push([Date.now(), map._normalizeBearing(bearing, last[1])]);

        map.transform.bearing = bearing;
        if (this._pitchWithRotate) {
            this._fireEvent('pitch', e);
            map.transform.pitch = pitch;
        }

        this._fireEvent('rotate', e);
        this._fireEvent('move', e);

        this._pos = p2;
    }

    _onUp(e) {
        if (this._ignoreEvent(e)) return;
        window.document.removeEventListener('mousemove', this._onMove);
        window.document.removeEventListener('mouseup', this._onUp);
        window.removeEventListener('blur', this._onUp);

        if (!this.isActive()) return;

        this._active = false;
        this._fireEvent('rotateend', e);
        this._drainInertiaBuffer();

        const map = this._map,
            mapBearing = map.getBearing(),
            inertia = this._inertia;

        const finish = () => {
            if (Math.abs(mapBearing) < this._bearingSnap) {
                map.resetNorth({noMoveStart: true}, { originalEvent: e });
            } else {
                this._map.moving = false;
                this._fireEvent('moveend', e);
            }
            if (this._pitchWithRotate) this._fireEvent('pitchend', e);
        };

        if (inertia.length < 2) {
            finish();
            return;
        }

        const first = inertia[0],
            last = inertia[inertia.length - 1],
            previous = inertia[inertia.length - 2];
        let bearing = map._normalizeBearing(mapBearing, previous[1]);
        const flingDiff = last[1] - first[1],
            sign = flingDiff < 0 ? -1 : 1,
            flingDuration = (last[0] - first[0]) / 1000;

        if (flingDiff === 0 || flingDuration === 0) {
            finish();
            return;
        }

        let speed = Math.abs(flingDiff * (inertiaLinearity / flingDuration));  // deg/s
        if (speed > inertiaMaxSpeed) {
            speed = inertiaMaxSpeed;
        }

        const duration = speed / (inertiaDeceleration * inertiaLinearity),
            offset = sign * speed * (duration / 2);

        bearing += offset;

        if (Math.abs(map._normalizeBearing(bearing, 0)) < this._bearingSnap) {
            bearing = map._normalizeBearing(0, bearing);
        }

        map.rotateTo(bearing, {
            duration: duration * 1000,
            easing: inertiaEasing,
            noMoveStart: true
        }, { originalEvent: e });
    }

    _fireEvent(type, e) {
        return this._map.fire(type, { originalEvent: e });
    }

    _ignoreEvent(e) {
        const map = this._map;

        if (map.boxZoom && map.boxZoom.isActive()) return true;
        if (map.dragPan && map.dragPan.isActive()) return true;
        if (e.touches) {
            return (e.touches.length > 1);
        } else {
            const buttons = (e.ctrlKey ? 1 : 2),  // ? ctrl+left button : right button
                button = (e.ctrlKey ? 0 : 2);   // ? ctrl+left button : right button
            let eventButton = e.button;
            if (typeof InstallTrigger !== 'undefined' && e.button === 2 && e.ctrlKey &&
                window.navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
                // Fix for https://github.com/mapbox/mapbox-gl-js/issues/3131:
                // Firefox (detected by InstallTrigger) on Mac determines e.button = 2 when
                // using Control + left click
                eventButton = 0;
            }
            return (e.type === 'mousemove' ? e.buttons & buttons === 0 : !this.isActive() && eventButton !== button);
        }
    }

    _drainInertiaBuffer() {
        const inertia = this._inertia,
            now = Date.now(),
            cutoff = 160;   //msec

        while (inertia.length > 0 && now - inertia[0][0] > cutoff)
            inertia.shift();
    }
}

module.exports = DragRotateHandler;

/**
 * “拖动旋转”开始时触发。请查看 {@link DragRotateHandler}。
 *
 * @event rotatestart
 * @memberof Map
 * @instance
 * @property {MapMouseEvent | MapTouchEvent} data
 */

/**
 * “拖动旋转”期间重复触发。请查看 {@link DragRotateHandler}。
 *
 * @event rotate
 * @memberof Map
 * @instance
 * @property {MapMouseEvent | MapTouchEvent} data
 */

/**
 * “拖动旋转”结束时触发。请查看 {@link DragRotateHandler}。
 *
 * @event rotateend
 * @memberof Map
 * @instance
 * @property {MapMouseEvent | MapTouchEvent} data
 */
