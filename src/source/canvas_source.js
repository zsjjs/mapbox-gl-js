'use strict';

const ImageSource = require('./image_source');
const window = require('../util/window');

/**
 * 包含 HTML 画布内容的数据源。
 * （点击 [样式规范Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/#sources-canvas) 查看更详细的选项文档。）
 * @interface CanvasSource
 * @example
 * // add to map
 * map.addSource('some id', {
 *    type: 'canvas',
 *    canvas: 'idOfMyHTMLCanvas',
 *    animate: true,
 *    coordinates: [
 *        [-76.54, 39.18],
 *        [-76.52, 39.18],
 *        [-76.52, 39.17],
 *        [-76.54, 39.17]
 *    ]
 * });
 *
 * // update
 * var mySource = map.getSource('some id');
 * mySource.setCoordinates([
 *     [-76.54335737228394, 39.18579907229748],
 *     [-76.52803659439087, 39.1838364847587],
 *     [-76.5295386314392, 39.17683392507606],
 *     [-76.54520273208618, 39.17876344106642]
 * ]);
 *
 * map.removeSource('some id');  // remove
 */
class CanvasSource extends ImageSource {

    constructor(id, options, dispatcher, eventedParent) {
        super(id, options, dispatcher, eventedParent);
        this.options = options;
        this.animate = options.hasOwnProperty('animate') ? options.animate : true;
    }

    load() {
        this.canvas = this.canvas || window.document.getElementById(this.options.canvas);
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        if (this._hasInvalidDimensions()) return this.fire('error', new Error('Canvas dimensions cannot be less than or equal to zero.'));

        let loopID;

        this.play = function() {
            loopID = this.map.style.animationLoop.set(Infinity);
            this.map._rerender();
        };

        this.pause = function() {
            this.map.style.animationLoop.cancel(loopID);
        };

        this._finishLoading();
    }

    /**
     * 返回 HTML `canvas` 元素。
     *
     * @returns {HTMLCanvasElement} HTML `canvas` 元素。
     */
    getCanvas() {
        return this.canvas;
    }

    onAdd(map) {
        if (this.map) return;
        this.map = map;
        this.load();
        if (this.canvas) {
            if (this.animate) this.play();
        }
    }

    /**
     * 设置画布坐标并重新渲染地图。
     *
     * @method setCoordinates
     * @param {Array<Array<number>>} 以经纬度数组表示的四个地理坐标，
     *   用于定义画布的四角。
     *   四个坐标从画布左上角开始，顺时针进行。
     *   不一定代表矩形。
     * @returns {CanvasSource} this
     */
    // setCoordinates inherited from ImageSource

    prepare() {
        let resize = false;
        if (this.canvas.width !== this.width) {
            this.width = this.canvas.width;
            resize = true;
        }
        if (this.canvas.height !== this.height) {
            this.height = this.canvas.height;
            resize = true;
        }
        if (this._hasInvalidDimensions()) return;

        if (!this.tile) return; // not enough data for current position
        this._prepareImage(this.map.painter.gl, this.canvas, resize);
    }

    serialize() {
        return {
            type: 'canvas',
            canvas: this.canvas,
            coordinates: this.coordinates
        };
    }

    _hasInvalidDimensions() {
        for (const x of [this.canvas.width, this.canvas.height]) {
            if (isNaN(x) || x <= 0) return true;
        }
        return false;
    }
}

module.exports = CanvasSource;
