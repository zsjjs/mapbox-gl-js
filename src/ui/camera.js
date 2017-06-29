'use strict';

const util = require('../util/util');
const interpolate = require('../style-spec/util/interpolate');
const browser = require('../util/browser');
const LngLat = require('../geo/lng_lat');
const LngLatBounds = require('../geo/lng_lat_bounds');
const Point = require('point-geometry');
const Evented = require('../util/evented');

/**
 * {@link Map#jumpTo}, {@link Map#easeTo}，和 {@link Map#flyTo} 共有的选项，
 * 控制目的地的位置、缩放级别、方位角和倾斜度。
 * 所有属性均可选。
 * 未指定的选项将默认设为当前地图该属性的值。
 *
 * @typedef {Object} CameraOptions
 * @property {LngLatLike} center 目的地中心。
 * @property {number} zoom 目的地的缩放级别。
 * @property {number} bearing 目的地的方位角（bearing，rotation），按照逆时针偏离正北方的度数计算。
 * @property {number} pitch 目的地的倾斜度（pitch，tilt），单位为度。
 * @property {LngLatLike} around  `zoom` 指定之后， `around` 将决定缩放中心（默认为地图中心）。
 */

/**
 * 地图移动方法（包括动态转换，例如 {@link Map#panBy} 和
 * {@link Map#easeTo}）所共有的选项，能够控制动态转换的持续时间和缓动函数。
 * 所有属性均可选。
 *
 * @typedef {Object} AnimationOptions
 * @property {number} duration 动态转换的持续时间，按毫秒计算。
 * @property {Function} easing 该函数花费的时间在 0..1 之间，
 *   当初始状态为 0，最终状态为 1 时，返回一个数字。
 * @property {PointLike} offset 动态转换结束后，目标中心与实际地图容器中心间的偏差。
 * @property {boolean} animate 如果为 `false`，将不进行动态转换。
 */

/**
 * 调用 {@link Map#fitBounds}时设置内边距（padding）的选项。
 * 该对象的所有性能都必须是非负整数。
 *
 * @typedef {Object} PaddingOptions
 * @property {number} top 距地图画布上方的内边距，以像素为单位。
 * @property {number} bottom 距地图画布下方的内边距，以像素为单位。
 * @property {number} left 距地图画布左方的内边距，以像素为单位。
 * @property {number} right 距地图画布右方的内边距，以像素为单位。
 */

class Camera extends Evented {

    constructor(transform, options) {
        super();
        this.moving = false;
        this.transform = transform;
        this._bearingSnap = options.bearingSnap;
    }

    /**
     * 返回地图的地理中心点。
     *
     * @memberof Map#
     * @returns {LngLat} 地图的地理中心点。
     */
    getCenter() { return this.transform.center; }

    /**
     * 设置地图的地理中心点。同 `jumpTo({center: center})`。
     *
     * @memberof Map#
     * @param {LngLatLike} center 需要设置的中心点。
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     * @example
     * map.setCenter([-74, 38]);
     * @see [使用键盘移动符号](https://www.mapbox.com/mapbox-gl-js/example/rotating-controllable-marker/)
     */
    setCenter(center, eventData) {
        return this.jumpTo({center: center}, eventData);
    }

    /**
     * 按指定偏移值平移地图。
     *
     * @memberof Map#
     * @param {Array<number>} 平移地图的 `x` 和 `y` 坐标。
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     * @see [用类似游戏的控件控制地图](https://www.mapbox.com/mapbox-gl-js/example/game-controls/)
     */
    panBy(offset, options, eventData) {
        offset = Point.convert(offset).mult(-1);
        return this.panTo(this.transform.center, util.extend({offset}, options), eventData);
    }

    /**
     * 用类似游戏的控件控制地图
     *
     * @memberof Map#
     * @param {LngLatLike} 需要将地图移动到的位置。
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     */
    panTo(lnglat, options, eventData) {
        return this.easeTo(util.extend({
            center: lnglat
        }, options), eventData);
    }

    /**
     * 返回地图当前的缩放级别。
     *
     * @memberof Map#
     * @returns {number} 地图的当前缩放级别。
     */
    getZoom() { return this.transform.zoom; }

    /**
     * 设置地图的缩放级别。同 `jumpTo({zoom: zoom})`。
     *
     * @memberof Map#
     * @param {number} 要设置的缩放级别（0-20）。
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     * @example
     * // zoom the map to 5
     * map.setZoom(5);
     */
    setZoom(zoom, eventData) {
        this.jumpTo({zoom: zoom}, eventData);
        return this;
    }

    /**
     * 以动态转换的方式将地图缩放到指定级别。
     *
     * @memberof Map#
     * @param {number} zoom 需要转换到的目标缩放级别。
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     */
    zoomTo(zoom, options, eventData) {
        return this.easeTo(util.extend({
            zoom: zoom
        }, options), eventData);
    }

    /**
     * 将地图的缩放级别增加 1 级。
     *
     * @memberof Map#
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     */
    zoomIn(options, eventData) {
        this.zoomTo(this.getZoom() + 1, options, eventData);
        return this;
    }

    /**
     * 将地图的缩放级别降低 1 级。
     *
     * @memberof Map#
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     */
    zoomOut(options, eventData) {
        this.zoomTo(this.getZoom() - 1, options, eventData);
        return this;
    }

    /**
     * 返回地图当前的方位角（旋转度）。
     *
     * @memberof Map#
     * @returns {number} 地图当前的方位角（bearing），按照逆时针偏离正北方的度数计算。
     * @see [Navigate the map with game-like controls](https://www.mapbox.com/mapbox-gl-js/example/game-controls/)
     */
    getBearing() { return this.transform.bearing; }

    /**
     * 设置地图的方位角（旋转度）。同 `jumpTo({bearing: bearing})`。
     *
     * @memberof Map#
     * @param {number} 需要设置的方位角，按偏离正北方的照逆时针方向度数计算。
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     * @example
     * // rotate the map to 90 degrees
     * map.setBearing(90);
     */
    setBearing(bearing, eventData) {
        this.jumpTo({bearing: bearing}, eventData);
        return this;
    }

    /**
     * 以动态转换的方式将地图旋转到指定方位角。
     *
     * @memberof Map#
     * @param {number} bearing 需要将地图旋转到的方位角，按偏离正北方的逆时针方向度数计算。
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     */
    rotateTo(bearing, options, eventData) {
        return this.easeTo(util.extend({
            bearing: bearing
        }, options), eventData);
    }

    /**
     * 以动态转换的方式将地图旋转到 0 度方位角（正北方）。
     *
     * @memberof Map#
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     */
    resetNorth(options, eventData) {
        this.rotateTo(0, util.extend({duration: 1000}, options), eventData);
        return this;
    }

    /**
     * 当前方位角足够接近 0 度时（也就是说位于 `bearingSnap` 域内时），将其自动调整到 0 度（正北方）。 
     *
     * @memberof Map#
     * @param {AnimationOptions} [options]
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     */
    snapToNorth(options, eventData) {
        if (Math.abs(this.getBearing()) < this._bearingSnap) {
            return this.resetNorth(options, eventData);
        }
        return this;
    }

    /**
     * 返回地图当前的倾斜度pitch（tilt）。
     *
     * @memberof Map#
     * @returns {number} 地图当前的倾斜度，按照偏离屏幕水平面的度数计算。
     */
    getPitch() { return this.transform.pitch; }

    /**
     * 设置地图的倾斜度。同 `jumpTo({pitch: pitch})`。
     *
     * @memberof Map#
     * @param {number} pitch 需要设置的倾斜度，按照偏离屏幕水平面的度数计算（0-60）。
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires pitchstart
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     */
    setPitch(pitch, eventData) {
        this.jumpTo({pitch: pitch}, eventData);
        return this;
    }


    /**
     * 在指定的地理边界内平移和缩放地图，以包含其可见区域。
     * 当地图方位角不为 0 的时候，该函数会将方位角重置为 0。
     *
     * @memberof Map#
     * @param {LngLatBoundsLike} bounds 将这些边界设在视口中心，使用最大的缩放级别和
     *      `Map#getMaxZoom()` 使其适应该视口。
     * @param {AnimationOptions | CameraOptions } [options]
     * @param {number | PaddingOptions} [options.padding] 以给定边界添加的以像素为单位的填充量。
     * @param {boolean} [options.linear=false] 如果为 `true`，地图将使用
     *     {@link Map#easeTo}. 如果为 `false`，地图将使用 {@link Map#flyTo}进行转换。
     *     查看这些函数及 {@link AnimationOptions} ，了解可用的选项信息。
     * @param {Function} [options.easing] 动态转换的缓冲函数。点击查看  {@link AnimationOptions}。
     * @param {PointLike} [options.offset=[0, 0]] 给定边界中心到地图中心的偏移距离，以像素为单位。
     * @param {number} [options.maxZoom] 地图视图转换到指定边界时允许的最大缩放级别。
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
	 * @example
     * var bbox = [[-79, 43], [-73, 45]];
     * map.fitBounds(bbox, {
     *   padding: {top: 10, bottom:25, left: 15, right: 5}
     * });
     * @see [让地图适应限位框](https://www.mapbox.com/mapbox-gl-js/example/fitbounds/)
     */
    fitBounds(bounds, options, eventData) {

        options = util.extend({
            padding: {
                top: 0,
                bottom: 0,
                right: 0,
                left: 0
            },
            offset: [0, 0],
            maxZoom: this.transform.maxZoom
        }, options);

        if (typeof options.padding === 'number') {
            const p = options.padding;
            options.padding = {
                top: p,
                bottom: p,
                right: p,
                left: p
            };
        }
        if (!util.deepEqual(Object.keys(options.padding).sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }), ["bottom", "left", "right", "top"])) {
            util.warnOnce("options.padding must be a positive number, or an Object with keys 'bottom', 'left', 'right', 'top'");
            return;
        }

        bounds = LngLatBounds.convert(bounds);

        // we separate the passed padding option into two parts, the part that does not affect the map's center
        // (lateral and vertical padding), and the part that does (paddingOffset). We add the padding offset
        // to the options `offset` object where it can alter the map's center in the subsequent calls to
        // `easeTo` and `flyTo`.
        const paddingOffset = [options.padding.left - options.padding.right, options.padding.top - options.padding.bottom],
            lateralPadding = Math.min(options.padding.right, options.padding.left),
            verticalPadding = Math.min(options.padding.top, options.padding.bottom);
        options.offset = [options.offset[0] + paddingOffset[0], options.offset[1] + paddingOffset[1]];

        const offset = Point.convert(options.offset),
            tr = this.transform,
            nw = tr.project(bounds.getNorthWest()),
            se = tr.project(bounds.getSouthEast()),
            size = se.sub(nw),
            scaleX = (tr.width - lateralPadding * 2 - Math.abs(offset.x) * 2) / size.x,
            scaleY = (tr.height - verticalPadding * 2 - Math.abs(offset.y) * 2) / size.y;

        if (scaleY < 0 || scaleX < 0) {
            util.warnOnce('Map cannot fit within canvas with the given bounds, padding, and/or offset.');
            return;
        }

        options.center = tr.unproject(nw.add(se).div(2));
        options.zoom = Math.min(tr.scaleZoom(tr.scale * Math.min(scaleX, scaleY)), options.maxZoom);
        options.bearing = 0;

        return options.linear ?
            this.easeTo(options, eventData) :
            this.flyTo(options, eventData);
    }

    /**
     * 不用动态转换的情况下改变中心点、
     * 缩放级别、方位角和倾斜度的任意组合。
     * 地图将保留 `options` 中没有指定的当前值。
     *
     * @memberof Map#
     * @param {CameraOptions} options
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires zoomstart
     * @fires pitchstart
     * @fires rotate
     * @fires move
     * @fires zoom
     * @fires pitch
     * @fires moveend
     * @fires zoomend
     * @fires pitchend
     * @returns {Map} `this`
     */
    jumpTo(options, eventData) {
        this.stop();

        const tr = this.transform;
        let zoomChanged = false,
            bearingChanged = false,
            pitchChanged = false;

        if ('zoom' in options && tr.zoom !== +options.zoom) {
            zoomChanged = true;
            tr.zoom = +options.zoom;
        }

        if ('center' in options) {
            tr.center = LngLat.convert(options.center);
        }

        if ('bearing' in options && tr.bearing !== +options.bearing) {
            bearingChanged = true;
            tr.bearing = +options.bearing;
        }

        if ('pitch' in options && tr.pitch !== +options.pitch) {
            pitchChanged = true;
            tr.pitch = +options.pitch;
        }

        this.fire('movestart', eventData)
            .fire('move', eventData);

        if (zoomChanged) {
            this.fire('zoomstart', eventData)
                .fire('zoom', eventData)
                .fire('zoomend', eventData);
        }

        if (bearingChanged) {
            this.fire('rotate', eventData);
        }

        if (pitchChanged) {
            this.fire('pitchstart', eventData)
                .fire('pitch', eventData)
                .fire('pitchend', eventData);
        }

        return this.fire('moveend', eventData);
    }

    /**
     * 使用动态转换，将中心点、缩放级别、方位角和倾斜度组合的原有数值改为新数值。
     * 地图将保留 
     * `options`中没有指定的当前值。
     *
     * @memberof Map#
     * @param {Object} options 描述转换目标和动态效果的选项。接受
    *            {@link CameraOptions} 和 {@link AnimationOptions}.
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires zoomstart
     * @fires pitchstart
     * @fires rotate
     * @fires move
     * @fires zoom
     * @fires pitch
     * @fires moveend
     * @fires zoomend
     * @fires pitchend
     * @returns {Map} `this`
     * @see [用类似游戏的控件控制地图](https://www.mapbox.com/mapbox-gl-js/example/game-controls/)
     */
    easeTo(options, eventData) {
        this.stop();

        options = util.extend({
            offset: [0, 0],
            duration: 500,
            easing: util.ease
        }, options);

        if (options.animate === false) options.duration = 0;

        if (options.smoothEasing && options.duration !== 0) {
            options.easing = this._smoothOutEasing(options.duration);
        }

        const tr = this.transform,
            startZoom = this.getZoom(),
            startBearing = this.getBearing(),
            startPitch = this.getPitch(),

            zoom = 'zoom' in options ? +options.zoom : startZoom,
            bearing = 'bearing' in options ? this._normalizeBearing(options.bearing, startBearing) : startBearing,
            pitch = 'pitch' in options ? +options.pitch : startPitch;

        const pointAtOffset = tr.centerPoint.add(Point.convert(options.offset));
        const locationAtOffset = tr.pointLocation(pointAtOffset);
        const center = LngLat.convert(options.center || locationAtOffset);
        this._normalizeCenter(center);

        const from = tr.project(locationAtOffset);
        const delta = tr.project(center).sub(from);
        const finalScale = tr.zoomScale(zoom - startZoom);

        let around, aroundPoint;

        if (options.around) {
            around = LngLat.convert(options.around);
            aroundPoint = tr.locationPoint(around);
        }

        this.zooming = (zoom !== startZoom);
        this.rotating = (startBearing !== bearing);
        this.pitching = (pitch !== startPitch);

        this._prepareEase(eventData, options.noMoveStart);

        clearTimeout(this._onEaseEnd);

        this._ease(function (k) {
            if (this.zooming) {
                tr.zoom = interpolate(startZoom, zoom, k);
            }
            if (this.rotating) {
                tr.bearing = interpolate(startBearing, bearing, k);
            }
            if (this.pitching) {
                tr.pitch = interpolate(startPitch, pitch, k);
            }

            if (around) {
                tr.setLocationAtPoint(around, aroundPoint);
            } else {
                const scale = tr.zoomScale(tr.zoom - startZoom);
                const base = zoom > startZoom ?
                    Math.min(2, finalScale) :
                    Math.max(0.5, finalScale);
                const speedup = Math.pow(base, 1 - k);
                const newCenter = tr.unproject(from.add(delta.mult(k * speedup)).mult(scale));
                tr.setLocationAtPoint(tr.renderWorldCopies ? newCenter.wrap() : newCenter, pointAtOffset);
            }

            this._fireMoveEvents(eventData);

        }, () => {
            if (options.delayEndEvents) {
                this._onEaseEnd = setTimeout(() => this._easeToEnd(eventData), options.delayEndEvents);
            } else {
                this._easeToEnd(eventData);
            }
        }, options);

        return this;
    }

    _prepareEase(eventData, noMoveStart) {
        this.moving = true;

        if (!noMoveStart) {
            this.fire('movestart', eventData);
        }
        if (this.zooming) {
            this.fire('zoomstart', eventData);
        }
        if (this.pitching) {
            this.fire('pitchstart', eventData);
        }
    }

    _fireMoveEvents(eventData) {
        this.fire('move', eventData);
        if (this.zooming) {
            this.fire('zoom', eventData);
        }
        if (this.rotating) {
            this.fire('rotate', eventData);
        }
        if (this.pitching) {
            this.fire('pitch', eventData);
        }
    }

    _easeToEnd(eventData) {
        const wasZooming = this.zooming;
        const wasPitching = this.pitching;
        this.moving = false;
        this.zooming = false;
        this.rotating = false;
        this.pitching = false;

        if (wasZooming) {
            this.fire('zoomend', eventData);
        }
        if (wasPitching) {
            this.fire('pitchend', eventData);
        }
        this.fire('moveend', eventData);
    }

    /**
     * 对地图中心、缩放级别、方位角和倾斜度做任意组合改变，
     * 使其沿着一条曲线动态地变化并引发飞行效果。
     * 该动态转换能够无缝引入缩放和平移，使用户即使在穿越了很长的距离后也能保持方位角不变
     *
     * @memberof Map#
     * @param {Object} options 描述转换目标和动态效果的选项。接受
     *     {@link CameraOptions}和 {@link AnimationOptions}。
     *      , 以及以下选项。
     * @param {number} [options.curve=1.42] 随着飞行路径出现的缩放“曲线”。要获得类似 {@link Map#easeTo} 的效果，
     *     大幅度移动时会出现较高的缩放值，较小移动时有较低的缩放值。
     *     [van Wijk (2003)](https://www.win.tue.nl/~vanwijk/zoompan.pdf)
     *     进行的用户调查中
     *     显示用户选择的平均值为 1.42。
     *     `Math.pow(6, 0.25)` 的值与均方根平均速率相同。
     *     值为 1 时会出现圆周运动。
     * @param {number} [options.minZoom] 位于飞行路径顶点的以 0 为起点的缩放级别。如果指定了
     *     `options.curve`，可忽略这一选项。
     * @param {number} [options.speed=1.2] 与`options.curve`相关的动态转换的平均速率。
     *     速率为 1.2 指，地图每秒以 1.2 倍于
     *     `options.curve` 可见整屏（screenful）的速度随着飞行路径移动。
     *     screenful 指地图的可见屏幕跨度区域。它不对应固定的物理距离，而是随缩放级别变化。
     * @param {number} [options.screenSpeed] 线性时间曲线情况下，动态转换的平均速率，按照每秒的移动的 screenful 数量计算。
     *     如果指定了 `options.speed` ，则忽略该选项。
     * @param {Object} [eventData] 该方法触发的事件对象需要添加的其它属性。
     * @fires movestart
     * @fires zoomstart
     * @fires pitchstart
     * @fires move
     * @fires zoom
     * @fires rotate
     * @fires pitch
     * @fires moveend
     * @fires zoomend
     * @fires pitchend
     * @returns {Map} `this`
     * @example
     * // fly with default options to null island
     * map.flyTo({center: [0, 0], zoom: 9});
     * // using flyTo options
     * map.flyTo({
     *   center: [0, 0],
     *   zoom: 9,
     *   speed: 0.2,
     *   curve: 1,
     *   easing(t) {
     *     return t;
     *   }
     * });
     * @see [飞到某个位置](https://www.mapbox.com/mapbox-gl-js/example/flyto/)
     * @see [缓慢飞到某个位置](https://www.mapbox.com/mapbox-gl-js/example/flyto-options/)
     * @see [根据滚动位置飞行到某个位置](https://www.mapbox.com/mapbox-gl-js/example/scroll-fly-to/)
     */
    flyTo(options, eventData) {
        // This method implements an “optimal path” animation, as detailed in:
        //
        // Van Wijk, Jarke J.; Nuij, Wim A. A. “Smooth and efficient zooming and panning.” INFOVIS
        //   ’03. pp. 15–22. <https://www.win.tue.nl/~vanwijk/zoompan.pdf#page=5>.
        //
        // Where applicable, local variable documentation begins with the associated variable or
        // function in van Wijk (2003).

        this.stop();

        options = util.extend({
            offset: [0, 0],
            speed: 1.2,
            curve: 1.42,
            easing: util.ease
        }, options);

        const tr = this.transform,
            startZoom = this.getZoom(),
            startBearing = this.getBearing(),
            startPitch = this.getPitch();

        const zoom = 'zoom' in options ?  +options.zoom : startZoom;
        const bearing = 'bearing' in options ? this._normalizeBearing(options.bearing, startBearing) : startBearing;
        const pitch = 'pitch' in options ? +options.pitch : startPitch;

        const scale = tr.zoomScale(zoom - startZoom);
        const pointAtOffset = tr.centerPoint.add(Point.convert(options.offset));
        const locationAtOffset = tr.pointLocation(pointAtOffset);
        const center = LngLat.convert(options.center || locationAtOffset);
        this._normalizeCenter(center);

        const from = tr.project(locationAtOffset);
        const delta = tr.project(center).sub(from);

        let rho = options.curve;

            // w₀: Initial visible span, measured in pixels at the initial scale.
        const w0 = Math.max(tr.width, tr.height),
            // w₁: Final visible span, measured in pixels with respect to the initial scale.
            w1 = w0 / scale,
            // Length of the flight path as projected onto the ground plane, measured in pixels from
            // the world image origin at the initial scale.
            u1 = delta.mag();

        if ('minZoom' in options) {
            const minZoom = util.clamp(Math.min(options.minZoom, startZoom, zoom), tr.minZoom, tr.maxZoom);
            // w<sub>m</sub>: Maximum visible span, measured in pixels with respect to the initial
            // scale.
            const wMax = w0 / tr.zoomScale(minZoom - startZoom);
            rho = Math.sqrt(wMax / u1 * 2);
        }

        // ρ²
        const rho2 = rho * rho;

        /**
         * rᵢ: Returns the zoom-out factor at one end of the animation.
         *
         * @param i 0 for the ascent or 1 for the descent.
         * @private
         */
        function r(i) {
            const b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
            return Math.log(Math.sqrt(b * b + 1) - b);
        }

        function sinh(n) { return (Math.exp(n) - Math.exp(-n)) / 2; }
        function cosh(n) { return (Math.exp(n) + Math.exp(-n)) / 2; }
        function tanh(n) { return sinh(n) / cosh(n); }

        // r₀: Zoom-out factor during ascent.
        const r0 = r(0);
            /**
             * w(s): Returns the visible span on the ground, measured in pixels with respect to the
             * initial scale.
             *
             * Assumes an angular field of view of 2 arctan ½ ≈ 53°.
             * @private
             */
        let w = function (s) { return (cosh(r0) / cosh(r0 + rho * s)); },
            /**
             * u(s): Returns the distance along the flight path as projected onto the ground plane,
             * measured in pixels from the world image origin at the initial scale.
             * @private
             */
            u = function (s) { return w0 * ((cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2) / u1; },
            // S: Total length of the flight path, measured in ρ-screenfuls.
            S = (r(1) - r0) / rho;

        // When u₀ = u₁, the optimal path doesn’t require both ascent and descent.
        if (Math.abs(u1) < 0.000001) {
            // Perform a more or less instantaneous transition if the path is too short.
            if (Math.abs(w0 - w1) < 0.000001) return this.easeTo(options, eventData);

            const k = w1 < w0 ? -1 : 1;
            S = Math.abs(Math.log(w1 / w0)) / rho;

            u = function() { return 0; };
            w = function(s) { return Math.exp(k * rho * s); };
        }

        if ('duration' in options) {
            options.duration = +options.duration;
        } else {
            const V = 'screenSpeed' in options ? +options.screenSpeed / rho : +options.speed;
            options.duration = 1000 * S / V;
        }

        this.zooming = true;
        this.rotating = (startBearing !== bearing);
        this.pitching = (pitch !== startPitch);

        this._prepareEase(eventData, false);

        this._ease(function (k) {
            // s: The distance traveled along the flight path, measured in ρ-screenfuls.
            const s = k * S;
            const scale = 1 / w(s);
            tr.zoom = startZoom + tr.scaleZoom(scale);

            if (this.rotating) {
                tr.bearing = interpolate(startBearing, bearing, k);
            }
            if (this.pitching) {
                tr.pitch = interpolate(startPitch, pitch, k);
            }

            const newCenter = tr.unproject(from.add(delta.mult(u(s))).mult(scale));
            tr.setLocationAtPoint(tr.renderWorldCopies ? newCenter.wrap() : newCenter, pointAtOffset);

            this._fireMoveEvents(eventData);

        }, () => this._easeToEnd(eventData), options);

        return this;
    }

    isEasing() {
        return !!this._abortFn;
    }

    /**
     * 返回一个表示相机是否移动的布尔值。
     *
     * @memberof Map#
     * @returns {boolean} 表示相机是否移动的布尔值。
     */
    isMoving() {
        return this.moving;
    }

    /**
     * 停止所有进行中的动态转换。
     *
     * @memberof Map#
     * @returns {Map} `this`
     */
    stop() {
        if (this._abortFn) {
            this._abortFn();
            this._finishEase();
        }
        return this;
    }

    _ease(frame, finish, options) {
        this._finishFn = finish;
        this._abortFn = browser.timed(function (t) {
            frame.call(this, options.easing(t));
            if (t === 1) {
                this._finishEase();
            }
        }, options.animate === false ? 0 : options.duration, this);
    }

    _finishEase() {
        delete this._abortFn;
        // The finish function might emit events which trigger new eases, which
        // set a new _finishFn. Ensure we don't delete it unintentionally.
        const finish = this._finishFn;
        delete this._finishFn;
        finish.call(this);
    }

    // convert bearing so that it's numerically close to the current one so that it interpolates properly
    _normalizeBearing(bearing, currentBearing) {
        bearing = util.wrap(bearing, -180, 180);
        const diff = Math.abs(bearing - currentBearing);
        if (Math.abs(bearing - 360 - currentBearing) < diff) bearing -= 360;
        if (Math.abs(bearing + 360 - currentBearing) < diff) bearing += 360;
        return bearing;
    }

    // If a path crossing the antimeridian would be shorter, extend the final coordinate so that
    // interpolating between the two endpoints will cross it.
    _normalizeCenter(center) {
        const tr = this.transform;
        if (!tr.renderWorldCopies || tr.lngRange) return;

        const delta = center.lng - tr.center.lng;
        center.lng +=
            delta > 180 ? -360 :
            delta < -180 ? 360 : 0;
    }

    // only used on mouse-wheel zoom to smooth out animation
    _smoothOutEasing(duration) {
        let easing = util.ease;

        if (this._prevEase) {
            const ease = this._prevEase,
                t = (Date.now() - ease.start) / ease.duration,
                speed = ease.easing(t + 0.01) - ease.easing(t),

                // Quick hack to make new bezier that is continuous with last
                x = 0.27 / Math.sqrt(speed * speed + 0.0001) * 0.01,
                y = Math.sqrt(0.27 * 0.27 - x * x);

            easing = util.bezier(x, y, 0.25, 1);
        }

        this._prevEase = {
            start: (new Date()).getTime(),
            duration: duration,
            easing: easing
        };

        return easing;
    }
}

/**
 * 在用户交互或 {@link Map#flyTo} 
 * 等方法使地图倾斜角开始改变的时候触发。
 *
 * @event pitchstart
 * @memberof Map
 * @instance
 * @property {MapEventData} data
 */

/**
 * 在用户交互或{@link Map#flyTo}。
 * 等方法使地图倾斜角改变的时候触发。 
 *
 * @event pitch
 * @memberof Map
 * @instance
 * @property {MapEventData} data
 */

/**
 * 在用户交互或 {@link Map#flyTo}
 * 等方法使地图的倾斜角改变结束之后立即触发。
 *
 * @event pitchend
 * @memberof Map
 * @instance
 * @property {MapEventData} data
 */
module.exports = Camera;
