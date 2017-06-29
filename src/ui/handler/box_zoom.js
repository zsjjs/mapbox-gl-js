'use strict';

const DOM = require('../../util/dom');
const LngLatBounds = require('../../geo/lng_lat_bounds');
const util = require('../../util/util');
const window = require('../../util/window');

/**
 * `BoxZoomHandler` 让用户能够将地图缩放到适合限位框的大小。
 * 拖动光标时点击并按 `shift` 即可定义限位框。
 *
 * @param {Map} map 需要添加处理程序（handler）的 Mapbox GL JS 地图。
 */
class BoxZoomHandler {

    constructor(map) {
        this._map = map;
        this._el = map.getCanvasContainer();
        this._container = map.getContainer();

        util.bindAll([
            '_onMouseDown',
            '_onMouseMove',
            '_onMouseUp',
            '_onKeyDown'
        ], this);
    }

    /**
     * 返回一个指示“缩放框”交互是否激活的布尔值。
     *
     * @returns {boolean} 如果“缩放框”已启用，显示为`true`。
     */
    isEnabled() {
        return !!this._enabled;
    }

    /**
     * 返回一个显示“缩放框”交互是否正在运行（也就是说用户是否正在使用）的布尔值。
     *
     * @returns {boolean} 如果“缩放框”正在使用，为`true`。
     */
    isActive() {
        return !!this._active;
    }

    /**
     * 激活“缩放框”交互功能。
     *
     * @example
     *   map.boxZoom.enable();
     */
    enable() {
        if (this.isEnabled()) return;

        // the event listeners for the DragPanHandler have to fire _after_ the event listener for BoxZoomHandler in order,
        // for the DragPanHandler's check on map.boxZoom.isActive() to tell whether or not to ignore a keydown event
        // so this makes sure the firing order is preserved if the BoxZoomHandler is enabled after the DragPanHandler.
        if (this._map.dragPan) this._map.dragPan.disable();
        this._el.addEventListener('mousedown', this._onMouseDown, false);
        if (this._map.dragPan) this._map.dragPan.enable();

        this._enabled = true;
    }

    /**
     * 禁用“缩放框”交互功能。
     *
     * @example
     *   map.boxZoom.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._el.removeEventListener('mousedown', this._onMouseDown);
        this._enabled = false;
    }

    _onMouseDown(e) {
        if (!(e.shiftKey && e.button === 0)) return;

        window.document.addEventListener('mousemove', this._onMouseMove, false);
        window.document.addEventListener('keydown', this._onKeyDown, false);
        window.document.addEventListener('mouseup', this._onMouseUp, false);

        DOM.disableDrag();
        this._startPos = DOM.mousePos(this._el, e);
        this._active = true;
    }

    _onMouseMove(e) {
        const p0 = this._startPos,
            p1 = DOM.mousePos(this._el, e);

        if (!this._box) {
            this._box = DOM.create('div', 'mapboxgl-boxzoom', this._container);
            this._container.classList.add('mapboxgl-crosshair');
            this._fireEvent('boxzoomstart', e);
        }

        const minX = Math.min(p0.x, p1.x),
            maxX = Math.max(p0.x, p1.x),
            minY = Math.min(p0.y, p1.y),
            maxY = Math.max(p0.y, p1.y);

        DOM.setTransform(this._box, `translate(${minX}px,${minY}px)`);

        this._box.style.width = `${maxX - minX}px`;
        this._box.style.height = `${maxY - minY}px`;
    }

    _onMouseUp(e) {
        if (e.button !== 0) return;

        const p0 = this._startPos,
            p1 = DOM.mousePos(this._el, e),
            bounds = new LngLatBounds()
                .extend(this._map.unproject(p0))
                .extend(this._map.unproject(p1));

        this._finish();

        if (p0.x === p1.x && p0.y === p1.y) {
            this._fireEvent('boxzoomcancel', e);
        } else {
            this._map
                .fitBounds(bounds, {linear: true})
                .fire('boxzoomend', { originalEvent: e, boxZoomBounds: bounds });
        }
    }

    _onKeyDown(e) {
        if (e.keyCode === 27) {
            this._finish();
            this._fireEvent('boxzoomcancel', e);
        }
    }

    _finish() {
        this._active = false;

        window.document.removeEventListener('mousemove', this._onMouseMove, false);
        window.document.removeEventListener('keydown', this._onKeyDown, false);
        window.document.removeEventListener('mouseup', this._onMouseUp, false);

        this._container.classList.remove('mapboxgl-crosshair');

        if (this._box) {
            this._box.parentNode.removeChild(this._box);
            this._box = null;
        }

        DOM.enableDrag();
    }

    _fireEvent(type, e) {
        return this._map.fire(type, { originalEvent: e });
    }
}

module.exports = BoxZoomHandler;

/**
 * @typedef {Object} MapBoxZoomEvent
 * @property {MouseEvent} originalEvent
 * @property {LngLatBounds} boxZoomBounds “缩放框”交互的限位框。
 *   该属性仅为  `boxzoomend` 事件提供。
 */

/**
 * “缩放框”交互发生时触发。请查看 {@link BoxZoomHandler}。
 *
 * @event boxzoomstart
 * @memberof Map
 * @instance
 * @property {MapBoxZoomEvent} data
 */

/**
 * “缩放框”交互结束时触发。请查看 {@link BoxZoomHandler}。
 *
 * @event boxzoomend
 * @memberof Map
 * @instance
 * @type {Object}
 * @property {MapBoxZoomEvent} data
 */

/**
 * 用户取消“缩放框”操作或限位框未达到最小缩放阈值时触发。
 * 请查看 {@link BoxZoomHandler}。
 *
 * @event boxzoomcancel
 * @memberof Map
 * @instance
 * @property {MapBoxZoomEvent} data
 */
