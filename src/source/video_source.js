'use strict';

const ajax = require('../util/ajax');
const ImageSource = require('./image_source');

/**
 * 包含视频的数据源。
 * （点击 [样式规范Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/#sources-video) 查看更详细的选项文档。）
 * @interface VideoSource
 * @example
 * // add to map
 * map.addSource('some id', {
 *    type: 'video',
 *    url: [
 *        'https://www.mapbox.com/blog/assets/baltimore-smoke.mp4',
 *        'https://www.mapbox.com/blog/assets/baltimore-smoke.webm'
 *    ],
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
 * @see [添加视频](https://www.mapbox.com/mapbox-gl-js/example/video-on-a-map/)
 */
class VideoSource extends ImageSource {

    constructor(id, options, dispatcher, eventedParent) {
        super(id, options, dispatcher, eventedParent);
        this.roundZoom = true;
        this.type = 'video';
        this.options = options;
    }

    load() {
        const options = this.options;
        this.urls = options.urls;

        ajax.getVideo(options.urls, (err, video) => {
            if (err) return this.fire('error', {error: err});

            this.video = video;
            this.video.loop = true;

            let loopID;

            // start repainting when video starts playing
            this.video.addEventListener('playing', () => {
                loopID = this.map.style.animationLoop.set(Infinity);
                this.map._rerender();
            });

            // stop repainting when video stops
            this.video.addEventListener('pause', () => {
                this.map.style.animationLoop.cancel(loopID);
            });

            if (this.map) {
                this.video.play();
            }

            this._finishLoading();
        });
    }

    /**
     * 返回一个 HTML `video` 元素。
     *
     * @returns {HTMLVideoElement} HTML `video` 元素。
     */
    getVideo() {
        return this.video;
    }

    onAdd(map) {
        if (this.map) return;
        this.load();
        this.map = map;
        if (this.video) {
            this.video.play();
            this.setCoordinates(this.coordinates);
        }
    }

    /**
     * 设置视频坐标并重新渲染地图。
     *
     * @method setCoordinates
     * @param {Array<Array<number>>} coordinates 以经纬度数组表示的四个地理坐标，
     *   用于定义视频的四角。
     *   四个坐标从左上角开始，顺时针进行。
     *   不一定代表矩形。
     * @returns {VideoSource} this
     */
    // setCoordinates inherited from ImageSource

    prepare() {
        if (!this.tile || this.video.readyState < 2) return; // not enough data for current position
        this._prepareImage(this.map.painter.gl, this.video);
    }

    serialize() {
        return {
            type: 'video',
            urls: this.urls,
            coordinates: this.coordinates
        };
    }
}

module.exports = VideoSource;
