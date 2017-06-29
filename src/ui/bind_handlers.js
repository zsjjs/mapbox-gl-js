'use strict';

const DOM = require('../util/dom');
const Point = require('point-geometry');

const handlers = {
    scrollZoom: require('./handler/scroll_zoom'),
    boxZoom: require('./handler/box_zoom'),
    dragRotate: require('./handler/drag_rotate'),
    dragPan: require('./handler/drag_pan'),
    keyboard: require('./handler/keyboard'),
    doubleClickZoom: require('./handler/dblclick_zoom'),
    touchZoomRotate: require('./handler/touch_zoom_rotate')
};

module.exports = function bindHandlers(map, options) {
    const el = map.getCanvasContainer();
    let contextMenuEvent = null;
    let mouseDown = false;
    let startPos = null;
    let tapped = null;

    for (const name in handlers) {
        map[name] = new handlers[name](map, options);
        if (options.interactive && options[name]) {
            map[name].enable(options[name]);
        }
    }

    el.addEventListener('mouseout', onMouseOut, false);
    el.addEventListener('mousedown', onMouseDown, false);
    el.addEventListener('mouseup', onMouseUp, false);
    el.addEventListener('mousemove', onMouseMove, false);
    el.addEventListener('touchstart', onTouchStart, false);
    el.addEventListener('touchend', onTouchEnd, false);
    el.addEventListener('touchmove', onTouchMove, false);
    el.addEventListener('touchcancel', onTouchCancel, false);
    el.addEventListener('click', onClick, false);
    el.addEventListener('dblclick', onDblClick, false);
    el.addEventListener('contextmenu', onContextMenu, false);

    function onMouseOut(e) {
        fireMouseEvent('mouseout', e);
    }

    function onMouseDown(e) {
        map.stop();
        startPos = DOM.mousePos(el, e);
        fireMouseEvent('mousedown', e);

        mouseDown = true;
    }

    function onMouseUp(e) {
        const rotating = map.dragRotate && map.dragRotate.isActive();

        if (contextMenuEvent && !rotating) {
            // This will be the case for Mac
            fireMouseEvent('contextmenu', contextMenuEvent);
        }

        contextMenuEvent = null;
        mouseDown = false;
        fireMouseEvent('mouseup', e);
    }

    function onMouseMove(e) {
        if (map.dragPan && map.dragPan.isActive()) return;
        if (map.dragRotate && map.dragRotate.isActive()) return;

        let target = e.toElement || e.target;
        while (target && target !== el) target = target.parentNode;
        if (target !== el) return;

        fireMouseEvent('mousemove', e);
    }

    function onTouchStart(e) {
        map.stop();
        fireTouchEvent('touchstart', e);

        if (!e.touches || e.touches.length > 1) return;

        if (!tapped) {
            tapped = setTimeout(onTouchTimeout, 300);

        } else {
            clearTimeout(tapped);
            tapped = null;
            fireMouseEvent('dblclick', e);
        }
    }

    function onTouchMove(e) {
        fireTouchEvent('touchmove', e);
    }

    function onTouchEnd(e) {
        fireTouchEvent('touchend', e);
    }

    function onTouchCancel(e) {
        fireTouchEvent('touchcancel', e);
    }

    function onTouchTimeout() {
        tapped = null;
    }

    function onClick(e) {
        const pos = DOM.mousePos(el, e);

        if (pos.equals(startPos)) {
            fireMouseEvent('click', e);
        }
    }

    function onDblClick(e) {
        fireMouseEvent('dblclick', e);
        e.preventDefault();
    }

    function onContextMenu(e) {
        const rotating = map.dragRotate && map.dragRotate.isActive();
        if (!mouseDown && !rotating) {
            // Windows: contextmenu fired on mouseup, so fire event now
            fireMouseEvent('contextmenu', e);
        } else if (mouseDown) {
            // Mac: contextmenu fired on mousedown; we save it until mouseup for consistency's sake
            contextMenuEvent = e;
        }

        e.preventDefault();
    }

    function fireMouseEvent(type, e) {
        const pos = DOM.mousePos(el, e);

        return map.fire(type, {
            lngLat: map.unproject(pos),
            point: pos,
            originalEvent: e
        });
    }

    function fireTouchEvent(type, e) {
        const touches = DOM.touchPos(el, e);
        const singular = touches.reduce((prev, curr, i, arr) => {
            return prev.add(curr.div(arr.length));
        }, new Point(0, 0));

        return map.fire(type, {
            lngLat: map.unproject(singular),
            point: singular,
            lngLats: touches.map((t) => { return map.unproject(t); }, this),
            points: touches,
            originalEvent: e
        });
    }
};

/**
 * @typedef {Object} MapMouseEvent
 * @property {string} type 事件类型。
 * @property {Map} target 触发事件的 `Map` 对象。
 * @property {MouseEvent} originalEvent
 * @property {Point} point 鼠标事件的目标像素坐标，
 *   对地图而言，从左上角开始测量。
 * @property {LngLat} lngLat 地图上鼠标事件的目标地理位置。
 */

/**
 * @typedef {Object} MapTouchEvent
 * @property {string} type 事件类型。
 * @property {Map} target 触发事件的 `Map` 对象。
 * @property {TouchEvent} originalEvent
 * @property {Point} point 触摸事件（touch event）点中心的像素坐标，
 *   对地图而言，从左上角开始测量。
 * @property {LngLat} lngLat 地图上触摸事件点中心的地理位置。
 * @property {Array<Point>} points 对应
 *   [touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches)
 *   属性的像素坐标数组。
 * @property {Array<LngLat>} lngLats 地图上对应
 *   [touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches)
 *   属性的地理位置。
 */
