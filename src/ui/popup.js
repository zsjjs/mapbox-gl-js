'use strict';

const util = require('../util/util');
const Evented = require('../util/evented');
const DOM = require('../util/dom');
const LngLat = require('../geo/lng_lat');
const Point = require('point-geometry');
const window = require('../util/window');
const smartWrap = require('../util/smart_wrap');

const defaultOptions = {
    closeButton: true,
    closeOnClick: true
};

/**
 * 弹窗组件。
 *
 * @param {Object} [options]
 * @param {boolean} [options.closeButton=true] 如果为 `true`，弹窗右上角将会
 *   出现一个关闭按键。
 * @param {boolean} [options.closeOnClick=true] 如果为 `true`， 点击地图时
 *   弹窗将关闭。
 * @param {string} [options.anchor] - 表示弹窗位置的字符串，
 *   通过 {@link Popup#setLngLat}与坐标集关联。
 *   选项有 `'top'`, `'bottom'`, `'left'`, `'right'`, `'top-left'`,
 *   `'top-right'`, `'bottom-left'`, 以及 `'bottom-right'`。如未设置，
 *   将对锚点进行动态设置，保证弹窗落入地图容器内，
 *   并偏向 `'bottom'`。
 * @param {number|PointLike|Object} [options.offset] -
 *  对应用到弹窗位置的像素偏移具体为：
 *   - 表示离弹窗位置距离的一个数字
 *   - 表示常数偏移的 {@link PointLike} 
 *   - 表示每个锚点位置偏移程度的 {@link Point}对象 
 *  负偏移表示向左和向上。
 * @example
 * var markerHeight = 50, markerRadius = 10, linearOffset = 25;
 * var popupOffsets = {
 *  'top': [0, 0],
 *  'top-left': [0,0],
 *  'top-right': [0,0],
 *  'bottom': [0, -markerHeight],
 *  'bottom-left': [linearOffset, (markerHeight - markerRadius + linearOffset) * -1],
 *  'bottom-right': [-linearOffset, (markerHeight - markerRadius + linearOffset) * -1],
 *  'left': [markerRadius, (markerHeight - markerRadius) * -1],
 *  'right': [-markerRadius, (markerHeight - markerRadius) * -1]
 *  };
 * var popup = new mapboxgl.Popup({offset:popupOffsets})
 *   .setLngLat(e.lngLat)
 *   .setHTML("<h1>Hello World!</h1>")
 *   .addTo(map);
 * @see [Display a popup](https://www.mapbox.com/mapbox-gl-js/example/popup/)
 * @see [Display a popup on hover](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
 * @see [Display a popup on click](https://www.mapbox.com/mapbox-gl-js/example/popup-on-click/)
 */
class Popup extends Evented {
    constructor(options) {
        super();
        this.options = util.extend(Object.create(defaultOptions), options);
        util.bindAll([
            '_update',
            '_onClickClose'],
            this);
    }

    /**
     * 往地图中添加弹窗。
     *
     * @param {Map} map  需要添加弹窗的 Mapbox GL JS 地图。
     * @returns {Popup} `this`
     */
    addTo(map) {
        this._map = map;
        this._map.on('move', this._update);
        if (this.options.closeOnClick) {
            this._map.on('click', this._onClickClose);
        }
        this._update();
        return this;
    }

    /**
     * @returns {boolean} 弹窗打开时，`true` 弹窗关闭时， `false`。
     */
    isOpen() {
        return !!this._map;
    }

    /**
     * 从地图中移除先前添加的弹窗。
     *
     * @example
     * var popup = new mapboxgl.Popup().addTo(map);
     * popup.remove();
     * @returns {Popup} `this`
     */
    remove() {
        if (this._content && this._content.parentNode) {
            this._content.parentNode.removeChild(this._content);
        }

        if (this._container) {
            this._container.parentNode.removeChild(this._container);
            delete this._container;
        }

        if (this._map) {
            this._map.off('move', this._update);
            this._map.off('click', this._onClickClose);
            delete this._map;
        }

        /**
         * Fired when the popup is closed manually or programatically.
         *
         * @event close
         * @memberof Popup
         * @instance
         * @type {Object}
         * @property {Popup} popup object that was closed
         */
        this.fire('close');

        return this;
    }

    /**
     * 返回弹窗锚点（anchor）的地理位置。
     *
     * The longitude of the result may differ by a multiple of 360 degrees from the longitude previously
     * set by `setLngLat` because `Popup` wraps the anchor longitude across copies of the world to keep
     * the popup on screen.
     *
     * @returns {LngLat} 弹窗锚点的地理位置。
     */
    getLngLat() {
        return this._lngLat;
    }

    /**
     * 设置弹窗锚点的地理位置，并将弹窗移到该处。
     *
     * @param {LngLatLike} lnglat 设置为弹窗锚点的地理位置。
     * @returns {Popup} `this`
     */
    setLngLat(lnglat) {
        this._lngLat = LngLat.convert(lnglat);
        this._pos = null;
        this._update();
        return this;
    }

    /**
     * 将弹窗内容设置为文本字符串。
     *
     * 该函数会在 DOM 中创建一个 [Text](https://developer.mozilla.org/en-US/docs/Web/API/Text) 节点，
     * 因此不能插入原始 HTML。当由用户提供弹窗内容时，
     * 为了安全起见，可使用该方法来抵抗 XSS 攻击。
     *
     * @param {string} text 弹窗的文本内容。
     * @returns {Popup} `this`
     * @example
     * var popup = new mapboxgl.Popup()
     *   .setLngLat(e.lngLat)
     *   .setText('Hello, world!')
     *   .addTo(map);
     */
    setText(text) {
        return this.setDOMContent(window.document.createTextNode(text));
    }

    /**
     * 将弹窗内容输入以字符串方式提供的 HTML 中。
     *
     * 该方法不会进行 HTML 过滤或清理，
     * 因此必须使用可信的文本内容。如果要输入不信任的文本字符串，
     * 应考虑使用 {@link Popup#setText}。
     *
     * @param {string} html 代表弹窗 HTML 内容的字符串。
     * @returns {Popup} `this`
     */
    setHTML(html) {
        const frag = window.document.createDocumentFragment();
        const temp = window.document.createElement('body');
        let child;
        temp.innerHTML = html;
        while (true) {
            child = temp.firstChild;
            if (!child) break;
            frag.appendChild(child);
        }

        return this.setDOMContent(frag);
    }

    /**
     * 将弹窗内容设为 DOM 节点元素。
     *
     * @param {Node} htmlNode 用作弹窗内容的 DOM 节点。
     * @returns {Popup} `this`
     * @example
     * // create an element with the popup content
     * var div = window.document.createElement('div');
     * div.innerHTML = 'Hello, world!';
     * var popup = new mapboxgl.Popup()
     *   .setLngLat(e.lngLat)
     *   .setDOMContent(div)
     *   .addTo(map);
     */
    setDOMContent(htmlNode) {
        this._createContent();
        this._content.appendChild(htmlNode);
        this._update();
        return this;
    }

    _createContent() {
        if (this._content && this._content.parentNode) {
            this._content.parentNode.removeChild(this._content);
        }

        this._content = DOM.create('div', 'mapboxgl-popup-content', this._container);

        if (this.options.closeButton) {
            this._closeButton = DOM.create('button', 'mapboxgl-popup-close-button', this._content);
            this._closeButton.type = 'button';
            this._closeButton.innerHTML = '&#215;';
            this._closeButton.addEventListener('click', this._onClickClose);
        }
    }

    _update() {
        if (!this._map || !this._lngLat || !this._content) { return; }

        if (!this._container) {
            this._container = DOM.create('div', 'mapboxgl-popup', this._map.getContainer());
            this._tip       = DOM.create('div', 'mapboxgl-popup-tip', this._container);
            this._container.appendChild(this._content);
        }

        if (this._map.transform.renderWorldCopies) {
            this._lngLat = smartWrap(this._lngLat, this._pos, this._map.transform);
        }

        this._pos = this._map.project(this._lngLat);

        let anchor = this.options.anchor;
        const offset = normalizeOffset(this.options.offset);

        if (!anchor) {
            const width = this._container.offsetWidth,
                height = this._container.offsetHeight;

            if (this._pos.y + offset.bottom.y < height) {
                anchor = ['top'];
            } else if (this._pos.y > this._map.transform.height - height) {
                anchor = ['bottom'];
            } else {
                anchor = [];
            }

            if (this._pos.x < width / 2) {
                anchor.push('left');
            } else if (this._pos.x > this._map.transform.width - width / 2) {
                anchor.push('right');
            }

            if (anchor.length === 0) {
                anchor = 'bottom';
            } else {
                anchor = anchor.join('-');
            }
        }

        const offsetedPos = this._pos.add(offset[anchor]).round();

        const anchorTranslate = {
            'top': 'translate(-50%,0)',
            'top-left': 'translate(0,0)',
            'top-right': 'translate(-100%,0)',
            'bottom': 'translate(-50%,-100%)',
            'bottom-left': 'translate(0,-100%)',
            'bottom-right': 'translate(-100%,-100%)',
            'left': 'translate(0,-50%)',
            'right': 'translate(-100%,-50%)'
        };

        const classList = this._container.classList;
        for (const key in anchorTranslate) {
            classList.remove(`mapboxgl-popup-anchor-${key}`);
        }
        classList.add(`mapboxgl-popup-anchor-${anchor}`);

        DOM.setTransform(this._container, `${anchorTranslate[anchor]} translate(${offsetedPos.x}px,${offsetedPos.y}px)`);
    }

    _onClickClose() {
        this.remove();
    }
}

function normalizeOffset(offset) {

    if (!offset) {
        return normalizeOffset(new Point(0, 0));

    } else if (typeof offset === 'number') {
        // input specifies a radius from which to calculate offsets at all positions
        const cornerOffset = Math.round(Math.sqrt(0.5 * Math.pow(offset, 2)));
        return {
            'top': new Point(0, offset),
            'top-left': new Point(cornerOffset, cornerOffset),
            'top-right': new Point(-cornerOffset, cornerOffset),
            'bottom': new Point(0, -offset),
            'bottom-left': new Point(cornerOffset, -cornerOffset),
            'bottom-right': new Point(-cornerOffset, -cornerOffset),
            'left': new Point(offset, 0),
            'right': new Point(-offset, 0)
        };

    } else if (isPointLike(offset)) {
        // input specifies a single offset to be applied to all positions
        const convertedOffset = Point.convert(offset);
        return {
            'top': convertedOffset,
            'top-left': convertedOffset,
            'top-right': convertedOffset,
            'bottom': convertedOffset,
            'bottom-left': convertedOffset,
            'bottom-right': convertedOffset,
            'left': convertedOffset,
            'right': convertedOffset
        };

    } else {
        // input specifies an offset per position
        return {
            'top': Point.convert(offset['top'] || [0, 0]),
            'top-left': Point.convert(offset['top-left'] || [0, 0]),
            'top-right': Point.convert(offset['top-right'] || [0, 0]),
            'bottom': Point.convert(offset['bottom'] || [0, 0]),
            'bottom-left': Point.convert(offset['bottom-left'] || [0, 0]),
            'bottom-right': Point.convert(offset['bottom-right'] || [0, 0]),
            'left': Point.convert(offset['left'] || [0, 0]),
            'right': Point.convert(offset['right'] || [0, 0])
        };
    }
}

function isPointLike(input) {
    return input instanceof Point || Array.isArray(input);
}

module.exports = Popup;
