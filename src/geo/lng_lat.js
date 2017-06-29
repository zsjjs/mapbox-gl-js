'use strict';
// @flow

const wrap = require('../util/util').wrap;

/**
 * `LngLat` 对象代表指定的经纬度坐标，单位为度。
 *
 * 为了和 GeoJSON 匹配，Mapbox GL 使用经度、纬度的坐标顺序。
 *
 * 注意，任何接受 `LngLat` 对象作为参数或选项的 Mapbox GL 方法，
 * 同样也可接受两个数字的 `Array` ，并且会进行隐式转换（implicit conversion）。
 * 这个灵活的类型被记录为 {@link LngLatLike}。
 *
 * @param {number} lng 经度，单位为度。
 * @param {number} lat 纬度，单位为度。
 * @example
 * var ll = new mapboxgl.LngLat(-73.9749, 40.7736);
 * @see [获取鼠标指针的坐标](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
 * @see [显示弹窗](https://www.mapbox.com/mapbox-gl-js/example/popup/)
 * @see [在限位框中突出显示要素](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
 * @see [创建时间轴动画（timeline animation）](https://www.mapbox.com/mapbox-gl-js/example/timeline-animation/)
 */
class LngLat {
    lng: number;
    lat: number;
    constructor(lng: number, lat: number) {
        if (isNaN(lng) || isNaN(lat)) {
            throw new Error(`Invalid LngLat object: (${lng}, ${lat})`);
        }
        this.lng = +lng;
        this.lat = +lat;
        if (this.lat > 90 || this.lat < -90) {
            throw new Error('Invalid LngLat latitude value: must be between -90 and 90');
        }
    }

    /**
     * 返回一个经度位于（-180, 180）范围内的新 `LngLat` 对象。
     *
     * @returns {LngLat} 范围内的 `LngLat` 对象。
     * @example
     * var ll = new mapboxgl.LngLat(286.0251, 40.7736);
     * var wrapped = ll.wrap();
     * wrapped.lng; // = -73.9749
     */
    wrap() {
        return new LngLat(wrap(this.lng, -180, 180), this.lat);
    }

    /**
     * 返回以两个数字的数组代表的坐标。
     *
     * @returns {Array<number>} 以经纬度数组代表的坐标。
     * @example
     * var ll = new mapboxgl.LngLat(-73.9749, 40.7736);
     * ll.toArray(); // = [-73.9749, 40.7736]
     */
    toArray() {
        return [this.lng, this.lat];
    }

    /**
     * 返回以字符串代表的坐标。
     *
     * @returns {string} 以 `'LngLat(lng, lat)'`格式的字符串代表的坐标。

     * @example
     * var ll = new mapboxgl.LngLat(-73.9749, 40.7736);
     * ll.toString(); // = "LngLat(-73.9749, 40.7736)"
     */
    toString() {
        return `LngLat(${this.lng}, ${this.lat})`;
    }

    /**
     * 将两个数字的数组转化成一个 `LngLat` 对象。
     *
     * 如果传递的是一个 `LngLat` 对象，该函数将原样将其返回。
     *
     * @param {LngLatLike} input 转化的由两个数字组成的数组，或是待返回的 `LngLat` 对象。
     * @returns {LngLat} 转化之后得到的新 `LngLat`对象，或是原来的 `LngLat` 对象。
     * @example
     * var arr = [-73.9749, 40.7736];
     * var ll = mapboxgl.LngLat.convert(arr);
     * ll;   // = LngLat {lng: -73.9749, lat: 40.7736}
     */
    static convert(input: mixed): LngLat {
        if (input instanceof LngLat) {
            return input;
        }
        if (Array.isArray(input) && input.length === 2) {
            return new LngLat(Number(input[0]), Number(input[1]));
        }
        if (!Array.isArray(input) && typeof input === 'object' && input !== null) {
            return new LngLat(Number(input.lng), Number(input.lat));
        }
        throw new Error("`LngLatLike` argument must be specified as a LngLat instance, an object {lng: <lng>, lat: <lat>}, or an array of [<lng>, <lat>]");
    }
}

/*:: export type LngLatLike = LngLat | {lng: number, lat: number} | [number, number]; */

module.exports = LngLat;
