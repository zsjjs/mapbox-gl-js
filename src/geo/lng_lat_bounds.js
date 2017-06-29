'use strict';

const LngLat = require('./lng_lat');

/**
 * `LngLatBounds` 对象，代表一个地理限位框，
 * 由其西南和东北的点以经度和纬度定义。
 *
 * 如果没有给构造函数提供参数，将创建一个 `null` 限位框。
 *
 * 注意，任何接受 `LngLatBounds` 对象作为参数或选项的 Mapbox GL 方法，
 * 同样也可以接受由两个 {@link LngLatLike} 组成的 `Array` ，并会执行隐式转换。
 * 可变类型记录为 {@link LngLatBoundsLike}。
 *
 * @param {LngLatLike} [sw] 限位框的西南角。
 * @param {LngLatLike} [ne] 限位框的东北角。
 * @example
 * var sw = new mapboxgl.LngLat(-73.9876, 40.7661);
 * var ne = new mapboxgl.LngLat(-73.9397, 40.8002);
 * var llb = new mapboxgl.LngLatBounds(sw, ne);
 */
class LngLatBounds {
    constructor(sw, ne) {
        if (!sw) {
            return;
        } else if (ne) {
            this.setSouthWest(sw).setNorthEast(ne);
        } else if (sw.length === 4) {
            this.setSouthWest([sw[0], sw[1]]).setNorthEast([sw[2], sw[3]]);
        } else {
            this.setSouthWest(sw[0]).setNorthEast(sw[1]);
        }
    }

    /**
     * 设置限位框的东北角。
     *
     * @param {LngLatLike} ne
     * @returns {LngLatBounds} `this`
     */
    setNorthEast(ne) {
        this._ne = LngLat.convert(ne);
        return this;
    }

    /**
     * 设置限位框的西南角。
     *
     * @param {LngLatLike} sw
     * @returns {LngLatBounds} `this`
     */
    setSouthWest(sw) {
        this._sw = LngLat.convert(sw);
        return this;
    }

    /**
     * 扩展边界以包括指定的 LngLat 或 LngLatBounds。
     *
     * @param {LngLat|LngLatBounds} obj 要扩展并包含的对象
     * @returns {LngLatBounds} `this`
     */
    extend(obj) {
        const sw = this._sw,
            ne = this._ne;
        let sw2, ne2;

        if (obj instanceof LngLat) {
            sw2 = obj;
            ne2 = obj;

        } else if (obj instanceof LngLatBounds) {
            sw2 = obj._sw;
            ne2 = obj._ne;

            if (!sw2 || !ne2) return this;

        } else {
            if (Array.isArray(obj)) {
                if (obj.every(Array.isArray)) {
                    return this.extend(LngLatBounds.convert(obj));
                } else {
                    return this.extend(LngLat.convert(obj));
                }
            }
            return this;
        }

        if (!sw && !ne) {
            this._sw = new LngLat(sw2.lng, sw2.lat);
            this._ne = new LngLat(ne2.lng, ne2.lat);

        } else {
            sw.lng = Math.min(sw2.lng, sw.lng);
            sw.lat = Math.min(sw2.lat, sw.lat);
            ne.lng = Math.max(ne2.lng, ne.lng);
            ne.lat = Math.max(ne2.lat, ne.lat);
        }

        return this;
    }

    /**
     * 返回一个到限位框四角距离相等的地理坐标。
     *
     * @returns {LngLat} 限位框中心。
     * @example
     * var llb = new mapboxgl.LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
     * llb.getCenter(); // = LngLat {lng: -73.96365, lat: 40.78315}
     */
    getCenter() {
        return new LngLat((this._sw.lng + this._ne.lng) / 2, (this._sw.lat + this._ne.lat) / 2);
    }

    /**
     * 返回限位框的西南角。
     *
     * @returns {LngLat} 限位框的西南角。
     */
    getSouthWest() { return this._sw; }

    /**
    * 返回限位框的东北角。
    *
    * @returns {LngLat} 限位框的东北角。
     */
    getNorthEast() { return this._ne; }

    /**
    * 返回限位框的西北角。
    *
    * @returns {LngLat} 限位框的西北角。
     */
    getNorthWest() { return new LngLat(this.getWest(), this.getNorth()); }

    /**
    * 返回限位框的东南角。
    *
    * @returns {LngLat} 限位框的东南角。
     */
    getSouthEast() { return new LngLat(this.getEast(), this.getSouth()); }

    /**
    * 返回限位框的西部边界。
    *
    * @returns {number} 限位框的西部边界。
     */
    getWest() { return this._sw.lng; }

    /**
    * 返回限位框的南部边界。
    *
    * @returns {number} 限位框的南部边界。
     */
    getSouth() { return this._sw.lat; }

    /**
    * 返回限位框的东部边界。
    *
    * @returns {number} 限位框的东部边界。
     */
    getEast() { return this._ne.lng; }

    /**
    * 返回限位框的北部边界。
    *
    * @returns {number} 限位框的北部边界。
     */
    getNorth() { return this._ne.lat; }

    /**
     * 返回以数组形式表示的限位框。
     *
     * @returns {Array<Array<number>>} 以数组形式表示的限位框，
     *   包括以数组形式显示的限位框西南角和东北角的坐标。
     * @example
     * var llb = new mapboxgl.LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
     * llb.toArray(); // = [[-73.9876, 40.7661], [-73.9397, 40.8002]]
     */
    toArray () {
        return [this._sw.toArray(), this._ne.toArray()];
    }

    /**
     * 返回以字符串形式表示的限位框。
     *
     * @returns {string} 以
     *   `'LngLatBounds(LngLat(lng, lat), LngLat(lng, lat))'` 格式的字符串表示的限位框。
     * @example
     * var llb = new mapboxgl.LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
     * llb.toString(); // = "LngLatBounds(LngLat(-73.9876, 40.7661), LngLat(-73.9397, 40.8002))"
     */
    toString () {
        return `LngLatBounds(${this._sw.toString()}, ${this._ne.toString()})`;
    }
}

/**
 * 将数组转化为 `LngLatBounds` 对象
 *
 * 如果传递的是一个 `LngLatBounds` 对象，该函数将原样将其返回。
 *
 * 该函数会在内部调用 `LngLat#convert` 将数组转化为 `LngLat` 值。
 *
 * @param {LngLatBoundsLike} input 待转化的包含两个坐标的数组，或者是待返回的 `LngLatBounds`对象。
 * @returns {LngLatBounds} 转化之后得到新的 `LngLatBounds`对象，或是原来的  `LngLatBounds` 对象。
 * @example
 * var arr = [[-73.9876, 40.7661], [-73.9397, 40.8002]];
 * var llb = mapboxgl.LngLatBounds.convert(arr);
 * llb;   // = LngLatBounds {_sw: LngLat {lng: -73.9876, lat: 40.7661}, _ne: LngLat {lng: -73.9397, lat: 40.8002}}
 */
LngLatBounds.convert = function (input) {
    if (!input || input instanceof LngLatBounds) return input;
    return new LngLatBounds(input);
};

module.exports = LngLatBounds;
