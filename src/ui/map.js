'use strict';

const util = require('../util/util');
const browser = require('../util/browser');
const window = require('../util/window');
const DOM = require('../util/dom');
const ajax = require('../util/ajax');

const Style = require('../style/style');
const AnimationLoop = require('../style/animation_loop');
const Painter = require('../render/painter');

const Transform = require('../geo/transform');
const Hash = require('./hash');

const bindHandlers = require('./bind_handlers');

const Camera = require('./camera');
const LngLat = require('../geo/lng_lat');
const LngLatBounds = require('../geo/lng_lat_bounds');
const Point = require('point-geometry');
const AttributionControl = require('./control/attribution_control');
const LogoControl = require('./control/logo_control');
const isSupported = require('mapbox-gl-supported');

const defaultMinZoom = 0;
const defaultMaxZoom = 22;
const defaultOptions = {
    center: [0, 0],
    zoom: 0,
    bearing: 0,
    pitch: 0,

    minZoom: defaultMinZoom,
    maxZoom: defaultMaxZoom,

    interactive: true,

    scrollZoom: true,
    boxZoom: true,
    dragRotate: true,
    dragPan: true,
    keyboard: true,
    doubleClickZoom: true,
    touchZoomRotate: true,

    bearingSnap: 7,

    hash: false,

    attributionControl: true,

    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,

    trackResize: true,

    renderWorldCopies: true,

    refreshExpiredTiles: true
};

/**
 * `Map` 对象代表页面上的地图。
 * 它将帮助你以编程的方式，即用方法和属性对地图进行修改，
 * 并在用户发出命令的时候启动事件。
 *
 * 你可以定义 `container` 和其它选项来创建 `Map`。
 * Then Mapbox GL JS 在页面上初始化地图，并返回 `Map`
 * 对象
 *
 * @extends Evented
 * @param {Object} options
 * @param {HTMLElement|string} options.container Mapbox GL JS 将在 HTML 元素中渲染地图，或者元素的字符串 `id`。指定元素不能有子元素。
 * @param {number} [options.minZoom=0] 地图的最小缩放级别（0-22）。
 * @param {number} [options.maxZoom=22] 地图的最大缩放级别（0-22）。
 * @param {Object|string} [options.style] 地图的 Mapbox 样式。必须是一个符合
 * [Mapbox 样式规范](https://mapbox.com/mapbox-gl-style-spec/)描述的 JSON 对象，
 * 或者是一个连接到这类 JSON 的 URL。
 *
 * 你可以使用 URL格式 `mapbox://styles/:owner/:style`，从 Mapbox API 中加载样式，
 * 其中的 `:owner` 是你的 Mapbox 账户名， `:style` 是样式的 ID。 或者使用下列
 * [预定义 Mapbox 样式](https://www.mapbox.com/maps/):
 *
 *  * `mapbox://styles/mapbox/streets-v9`
 *  * `mapbox://styles/mapbox/outdoors-v9`
 *  * `mapbox://styles/mapbox/light-v9`
 *  * `mapbox://styles/mapbox/dark-v9`
 *  * `mapbox://styles/mapbox/satellite-v9`
 *  * `mapbox://styles/mapbox/satellite-streets-v9`
 *
 * 由 Mapbox 托管的瓦片集可以进行样式优化，只需将 `?optimize=true` 添加到样式 URL 的末尾，如 `mapbox://styles/mapbox/streets-v9?optimize=true`。
 * 点击 [API 文档](https://www.mapbox.com/api-documentation/#retrieve-tiles) 解更多关于矢量切片样式优化的信息。
 *
 * @param {boolean} [options.hash=false] 如果为 `true`，地图的位置（如缩放程度、中心纬度、中心经度、方位角和倾斜角）将会与页面 URL 的散列片段（hash fragment）同步。
 *   例如， `http://path/to/my/page.html#2.59/39.26/53.07/-24.1/60`。
 * @param {boolean} [options.interactive=true] 如果为 `false`，无论是鼠标、触碰还是键盘监听器都不会触发地图对互动的响应。
 * @param {number} [options.bearingSnap=7] 该阙值决定地图方向角（bearing）何时对齐正北方，以度计量。
 *   例如，如果  `bearingSnap` of 7为 7 ，用户将地图转动到正北方向 7 度以内的范围时，
 *   地图将自动对准正北方。
 * @param {Array<string>} [options.classes] Mapbox 样式类名称，用于初始化地图。
 *   请记住，这些类是用来控制样式图层的 paint 渲染属性的，因此不会在 HTML 元素的
 *   `class` 属性中反映。欲了解 Mapbox 样式类的更多信息，请查看样式说明中的
 *   [图层 Layers](https://www.mapbox.com/mapbox-gl-style-spec/#layers) 部分。
 * @param {boolean} [options.attributionControl=true] 如果为 `true`, ，将在地图中添加 {@link AttributionControl} 。
 * @param {string} [options.logoPosition='bottom-left'] 该字符串代表地图上 Mapbox 文字商标的位置。 有效选项为 `top-left`，`top-right`， `bottom-left`， `bottom-right`。
 * @param {boolean} [options.failIfMajorPerformanceCaveat=false] 如果为 `true`， Mapbox GL JS 的表现将远远低于预期（即要使用软件渲染器），
 *   那么将无法创建地图。
 * @param {boolean} [options.preserveDrawingBuffer=false] 如果为 `true` ，即可使用 `map.getCanvas().toDataURL()`将地图画布输出到 PNG。出于性能优化的考虑默认设为 `false` 。
 * @param {boolean} [options.refreshExpiredTiles=true] 如果为 `false`，一旦切片根据 HTTP `cacheControl`/`expires` 标题过期，地图将不会尝试再次获取切片。
 * @param {LngLatBoundsLike} [options.maxBounds] 设置之后地图将会受限于给定的范围。
 * @param {boolean|Object} [options.scrollZoom=true] 如果为 `true`，将启用“滚动缩放”交互。 `Object` 值将被作为  {@link ScrollZoomHandler#enable}的选项传递。
 * @param {boolean} [options.boxZoom=true] 如果为 `true`将启用 "box zoom" 交互作用。(点击 {@link BoxZoomHandler}）。
 * @param {boolean} [options.dragRotate=true] 如果为 `true`, 将启用 "drag to rotate" 的功能。（点击 {@link DragRotateHandler}获取更多信息）。
 * @param {boolean} [options.dragPan=true] 如果为 `true`将启动“drag to pan”功能。 （点击  {@link DragPanHandler}）。
 * @param {boolean} [options.keyboard=true] 如果为 `true`，将启用键盘快捷键功能（点击 {@link KeyboardHandler}）。
 * @param {boolean} [options.doubleClickZoom=true] 如果为 `true`，将启用“双击缩放”功能（点击 {@link DoubleClickZoomHandler}）。
 * @param {boolean|Object} [options.touchZoomRotate=true] 如果为 `true`，将启用“捏合旋转和缩放” 交互。 `Object` 值将作为  {@link TouchZoomRotateHandler#enable的选项来传递。
 * @param {boolean} [options.trackResize=true]  如果为 `true`，地图将根据浏览器窗口大小自动调节大小。
 * @param {LngLatLike} [options.center=[0, 0]] 地图的初始地理中心。如果构造函数选项中没有指定 `center` ，Mapbox GL JS 将在地图样式对象中进行查找。 如果样式中也没定义的话，那么它将默认为 `[0, 0]`。
 * @param {number} [options.zoom=0] 地图的初始缩放等级。如果构造函数选项中没有指定 `zoom` ，Mapbox GL JS 将在地图样式对象中进行查找。如果样式中也没定义的话，那么它将默认为 `0`。
 * @param {number} [options.bearing=0] 地图的初始方位角（旋转度），以正北方的逆时针转动度数计量。如果构造函数选项中没有指定 `bearing`  ，Mapbox GL JS 将在地图样式对象中进行查找。如果样式中也没定义的话，那么它将默认为 `0`。
 * @param {number} [options.pitch=0] 地图的初始倾斜度，按偏离屏幕水平面的度数计量（0-60）。如果构造函数选项中没有指定 `pitch` ，Mapbox GL JS 将在地图样式对象中进行查找。如果样式中也没定义的话，那么它将默认为 `0`。
 * @param {boolean} [options.renderWorldCopies=true]  如果为 `true`，缩小状态下，将对全局地图的多个副本进行渲染。
 * @example
 * var map = new mapboxgl.Map({
 *   container: 'map',
 *   center: [-122.420679, 37.772537],
 *   zoom: 13,
 *   style: style_object,
 *   hash: true
 * });
 * @see [显示地图](https://www.mapbox.com/mapbox-gl-js/examples/)
 */
class Map extends Camera {

    constructor(options) {
        options = util.extend({}, defaultOptions, options);

        if (options.minZoom != null && options.maxZoom != null && options.minZoom > options.maxZoom) {
            throw new Error(`maxZoom must be greater than minZoom`);
        }

        const transform = new Transform(options.minZoom, options.maxZoom, options.renderWorldCopies);
        super(transform, options);

        this._interactive = options.interactive;
        this._failIfMajorPerformanceCaveat = options.failIfMajorPerformanceCaveat;
        this._preserveDrawingBuffer = options.preserveDrawingBuffer;
        this._trackResize = options.trackResize;
        this._bearingSnap = options.bearingSnap;
        this._refreshExpiredTiles = options.refreshExpiredTiles;

        if (typeof options.container === 'string') {
            this._container = window.document.getElementById(options.container);
            if (!this._container) throw new Error(`Container '${options.container}' not found.`);
        } else {
            this._container = options.container;
        }

        this.animationLoop = new AnimationLoop();

        if (options.maxBounds) {
            this.setMaxBounds(options.maxBounds);
        }

        util.bindAll([
            '_onWindowOnline',
            '_onWindowResize',
            '_contextLost',
            '_contextRestored',
            '_update',
            '_render',
            '_onData',
            '_onDataLoading'
        ], this);

        this._setupContainer();
        this._setupPainter();

        this.on('move', this._update.bind(this, false));
        this.on('zoom', this._update.bind(this, true));
        this.on('moveend', () => {
            this.animationLoop.set(300); // text fading
            this._rerender();
        });

        if (typeof window !== 'undefined') {
            window.addEventListener('online', this._onWindowOnline, false);
            window.addEventListener('resize', this._onWindowResize, false);
        }

        bindHandlers(this, options);

        this._hash = options.hash && (new Hash()).addTo(this);
        // don't set position from options if set through hash
        if (!this._hash || !this._hash._onHashChange()) {
            this.jumpTo({
                center: options.center,
                zoom: options.zoom,
                bearing: options.bearing,
                pitch: options.pitch
            });
        }

        this._classes = [];

        this.resize();

        if (options.classes) this.setClasses(options.classes);
        if (options.style) this.setStyle(options.style);

        if (options.attributionControl) this.addControl(new AttributionControl());
        this.addControl(new LogoControl(), options.logoPosition);

        this.on('style.load', function() {
            if (this.transform.unmodified) {
                this.jumpTo(this.style.stylesheet);
            }
            this.style.update(this._classes, {transition: false});
        });

        this.on('data', this._onData);
        this.on('dataloading', this._onDataLoading);
    }

    /**
     * 将 {@link IControl} 加入地图，调用 `control.onAdd(this)`。
     *
     * @param {IControl} control 要添加的 {@link IControl} 。
     * @param {string} [position] 地图上将要添加控件的位置。
     * 有效值包括 `'top-left'`, `'top-right'`, `'bottom-left'`, and `'bottom-right'`。默认为  `'top-right'`。
     * @returns {Map} `this`
     * @see [显示地图导航控件](https://www.mapbox.com/mapbox-gl-js/example/navigation/)
     */
    addControl(control, position) {
        if (position === undefined && control.getDefaultPosition) {
            position = control.getDefaultPosition();
        }
        if (position === undefined) {
            position = 'top-right';
        }
        const controlElement = control.onAdd(this);
        const positionContainer = this._controlPositions[position];
        if (position.indexOf('bottom') !== -1) {
            positionContainer.insertBefore(controlElement, positionContainer.firstChild);
        } else {
            positionContainer.appendChild(controlElement);
        }
        return this;
    }

    /**
     * 将控件从地图中移除。
     *
     * @param {IControl} 需要移除的 {@link IControl} 。
     * @returns {Map} `this`
     */
    removeControl(control) {
        control.onRemove(this);
        return this;
    }

    /**
     * 给地图添加 Mapbox 样式类。
     *
     * 请记住，这些类是用来控制样式图层的 paint 渲染属性的，因此不会在 HTML 元素的
     * `class` 属性中反映。欲了解 Mapbox 样式类的更多信息，请查看样式说明中的
     * [Layers](https://www.mapbox.com/mapbox-gl-style-spec/#layers) 部分。
     *
     * **注意：** 样式类已经被弃用，接下来发布的 Mapbox GL JS 版本会将其移除。
     *
     * @param {string} klass 要添加的类。
     * @param {Object} [options]
     * @param {boolean} [options.transition] 如果为 `true`，属性更改将平稳地过渡完成。
     * @fires change
     * @returns {Map} `this`
     */
    addClass(klass, options) {
        util.warnOnce('Style classes are deprecated and will be removed in an upcoming release of Mapbox GL JS.');
        if (this._classes.indexOf(klass) >= 0 || klass === '') return this;
        this._classes.push(klass);
        this._classOptions = options;

        if (this.style) this.style.updateClasses();
        return this._update(true);
    }

    /**
     * 将 Mapbox 样式类从地图中移除。
     *
     * **注意：** 样式类已经被弃用，接下来发布的 Mapbox GL JS 版本会将其移除。
     *
     * @param {string} klass 要除移的类。
     * @param {Object} [options]
     * @param {boolean} [options.transition] 如果为 `true`，属性更改将平稳地过渡完成。
     * @fires change
     * @returns {Map} `this`
     */
    removeClass(klass, options) {
        util.warnOnce('Style classes are deprecated and will be removed in an upcoming release of Mapbox GL JS.');
        const i = this._classes.indexOf(klass);
        if (i < 0 || klass === '') return this;
        this._classes.splice(i, 1);
        this._classOptions = options;

        if (this.style) this.style.updateClasses();
        return this._update(true);
    }

    /**
     * 用一组新的类代替现有的 Mapbox 样式类。
     *
     * **注意：** 样式类已经被弃用，接下来发布的 Mapbox GL JS 版本会将其移除。
     *
     * @param {Array<string>} klasses 要设置的样式类。
     * @param {Object} [options]
     * @param {boolean} [options.transition] 如果为 `true`，属性更改将平稳地过渡完成。
     * @fires change
     * @returns {Map} `this`
     */
    setClasses(klasses, options) {
        util.warnOnce('Style classes are deprecated and will be removed in an upcoming release of Mapbox GL JS.');
        const uniqueClasses = {};
        for (let i = 0; i < klasses.length; i++) {
            if (klasses[i] !== '') uniqueClasses[klasses[i]] = true;
        }
        this._classes = Object.keys(uniqueClasses);
        this._classOptions = options;

        if (this.style) this.style.updateClasses();
        return this._update(true);
    }

    /**
     * 返回一个 Boolean 值，
     * 表明地图是否有指定的 Mapbox 样式类。
     *
     * **注意：** 样式类已经被弃用，接下来发布的 Mapbox GL JS 版本会将其移除。
     *
     * @param {string} klass 需要测试的样式类。
     * @returns {boolean} 如果为`true` 代表地图有指定的样式类。
     */
    hasClass(klass) {
        util.warnOnce('Style classes are deprecated and will be removed in an upcoming release of Mapbox GL JS.');
        return this._classes.indexOf(klass) >= 0;
    }

    /**
     * 返回地图的 Mapbox 样式类
     *
     * **注意：** 样式类已经被弃用，接下来发布的 Mapbox GL JS 版本会将其移除。
     *
     * @returns {Array<string>} 地图的样式类。
     */
    getClasses() {
        util.warnOnce('Style classes are deprecated and will be removed in an upcoming release of Mapbox GL JS.');
        return this._classes;
    }

    /**
     * 根据 `container` 元素的尺寸
     *  调整地图大小。
     *
     * 在地图的`container` 被另一个脚本调整过大小之后，必须调用该方法，
     * 或者在起初用 CSS 隐藏的地图重新显示之后，也必须要调用该方法。
     *
     * @returns {Map} `this`
     */
    resize() {
        const dimensions = this._containerDimensions();
        const width = dimensions[0];
        const height = dimensions[1];

        this._resizeCanvas(width, height);
        this.transform.resize(width, height);
        this.painter.resize(width, height);

        return this
            .fire('movestart')
            .fire('move')
            .fire('resize')
            .fire('moveend');
    }

    /**
     * 返回地图的地理范围。
     *
     * @returns {LngLatBounds} 地图的地理范围。
     */
    getBounds() {
        const bounds = new LngLatBounds(
            this.transform.pointLocation(new Point(0, this.transform.height)),
            this.transform.pointLocation(new Point(this.transform.width, 0)));

        if (this.transform.angle || this.transform.pitch) {
            bounds.extend(this.transform.pointLocation(new Point(this.transform.size.x, 0)));
            bounds.extend(this.transform.pointLocation(new Point(0, this.transform.size.y)));
        }

        return bounds;
    }

    /**
     * 设置或清除地图的地理范围。
     *
     * 平移和缩放都必须在这些范围内进行。
     * 如果平移或缩放的位置超出了范围，
     * 系统将按操作者的请求，
     * 选择范围内
     * 最接近的一个点
     * 或缩放级别显示。
     *
     * @param {LngLatBoundsLike | null | undefined} lnglatbounds 设置的最大范围。如果设为 `null` 或 `undefined` ，将移除地图的最大范围函数。
     * @returns {Map} `this`
     */
    setMaxBounds (lnglatbounds) {
        if (lnglatbounds) {
            const b = LngLatBounds.convert(lnglatbounds);
            this.transform.lngRange = [b.getWest(), b.getEast()];
            this.transform.latRange = [b.getSouth(), b.getNorth()];
            this.transform._constrain();
            this._update();
        } else if (lnglatbounds === null || lnglatbounds === undefined) {
            this.transform.lngRange = [];
            this.transform.latRange = [];
            this._update();
        }
        return this;

    }
    /**
     * 设置或清除地图的最小缩放级别。
     * 如果地图的当前的缩放级别比要设置的新级别更低，
     * 地图将自动设置到新的最级别。
     *
     * @param {?number} minZoom 要设置的最小缩放级别（0-20）。如果设为
     *   If `null` 或 `undefined`，将清除现有的最小缩放级别（亦即将其设为 0）。
     * @returns {Map} `this`
     */
    setMinZoom(minZoom) {

        minZoom = minZoom === null || minZoom === undefined ? defaultMinZoom : minZoom;

        if (minZoom >= defaultMinZoom && minZoom <= this.transform.maxZoom) {
            this.transform.minZoom = minZoom;
            this._update();

            if (this.getZoom() < minZoom) this.setZoom(minZoom);

            return this;

        } else throw new Error(`minZoom must be between ${defaultMinZoom} and the current maxZoom, inclusive`);
    }

    /**
     * 返回地图允许的最小缩放级别。
     *
     * @returns {number} minZoom
     */
    getMinZoom() { return this.transform.minZoom; }

    /**
     * 设置或清除地图的最大缩放级别。
     * 如果地图现有的缩放级别大于将要设置的最大值，
     * 地图将自动调到新的最大缩放级别。
     *
     * @param {?number} maxZoom 要设置的最大缩放级别。设为
     *  `null` 或 `undefined` 的话，将清除现有的最大缩放级别（亦即将其设为 20）。
     * @returns {Map} `this`
     */
    setMaxZoom(maxZoom) {

        maxZoom = maxZoom === null || maxZoom === undefined ? defaultMaxZoom : maxZoom;

        if (maxZoom >= this.transform.minZoom) {
            this.transform.maxZoom = maxZoom;
            this._update();

            if (this.getZoom() > maxZoom) this.setZoom(maxZoom);

            return this;

        } else throw new Error(`maxZoom must be greater than the current minZoom`);
    }

    /**
     * 返回地图允许的最大缩放级别。
     *
     * @returns {number} maxZoom
     */
    getMaxZoom() { return this.transform.maxZoom; }

    /**
     * 返回一个代表像素坐标（pixel coordinates）的 {@link Point} ， 与地图的 `container`保相关，
     * 对应指定的实际地理位置。
     *
     * @param {LngLatLike} lnglat 要投影（project）的地理位置。
     * @returns {Point}  {@link Point} 与`lnglat` 对应，与地图的  `container`相关。
     */
    project(lnglat) {
        return this.transform.locationPoint(LngLat.convert(lnglat));
    }

    /**
     * 返回一个 {@link LngLat} 
     * ，代表与指定像素坐标对应的地理坐标。
     *
     * @param {PointLike} point 反投影（unproject）的像素坐标。
     * @returns {LngLat} {@link LngLat} 与 `point`对应。
     * @see [Show polygon information on click](https://www.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/)
     */
    unproject(point) {
        return this.transform.pointLocation(Point.convert(point));
    }

    /**
     * 添加指定类型的监听事件。
     *
     * @method
     * @name on
     * @memberof Map
     * @instance
     * @param {string} type 
     * @param {Function} listener 事件触发后（fired）要调用的函数。通过传递给
     *   The listener function is called with the data object passed to `fire`的数据对象来调用监听功能，并使用
     *   `target` 与 `type` 属性进行扩展。
     * @returns {Map} `this`
     */

    /**
     * 为发生在特定样式图层要素上的特定事件添加监听器。
     *
     * @param {string} 需要监听的事件类型；one of `'mousedown'`, `'mouseup'`, `'click'`, `'dblclick'`,
     * `'mousemove'`, `'mouseenter'`, `'mouseleave'`, `'mouseover'`, `'mouseout'`, `'contextmenu'`, `'touchstart'`,
     * `'touchend'`, 或者 `'touchcancel'`之一。当光标从指定图层的外面或者从地图画布外面进入指定图层可见区域时，会触发 `mouseenter` and `mouseover` 事件。
     * 当光标离开指定图层的可见区域或者离开地图画布时，会触发 `mouseleave`
     * 和 `mouseout` 
     * 事件。
     * @param {string} layer 样式图层的 ID。
     * 只有事件发生在图层可见要素上时才会触发监听器。事件将会得到一组包含匹配要素（matching features）的 `features` 
     * 属性。
     * @param {Function} listener 事件触发后（fired）要调用的函数。
     * @returns {Map} `this`
     */
    on(type, layer, listener) {
        if (listener === undefined) {
            return super.on(type, layer);
        }

        const delegatedListener = (() => {
            if (type === 'mouseenter' || type === 'mouseover') {
                let mousein = false;
                const mousemove = (e) => {
                    const features = this.queryRenderedFeatures(e.point, {layers: [layer]});
                    if (!features.length) {
                        mousein = false;
                    } else if (!mousein) {
                        mousein = true;
                        listener.call(this, util.extend({features}, e, {type}));
                    }
                };
                const mouseout = () => {
                    mousein = false;
                };
                return {layer, listener, delegates: {mousemove, mouseout}};
            } else if (type === 'mouseleave' || type === 'mouseout') {
                let mousein = false;
                const mousemove = (e) => {
                    const features = this.queryRenderedFeatures(e.point, {layers: [layer]});
                    if (features.length) {
                        mousein = true;
                    } else if (mousein) {
                        mousein = false;
                        listener.call(this, util.extend({}, e, {type}));
                    }
                };
                const mouseout = (e) => {
                    if (mousein) {
                        mousein = false;
                        listener.call(this, util.extend({}, e, {type}));
                    }
                };
                return {layer, listener, delegates: {mousemove, mouseout}};
            } else {
                const delegate = (e) => {
                    const features = this.queryRenderedFeatures(e.point, {layers: [layer]});
                    if (features.length) {
                        listener.call(this, util.extend({features}, e));
                    }
                };
                return {layer, listener, delegates: {[type]: delegate}};
            }
        })();

        this._delegatedListeners = this._delegatedListeners || {};
        this._delegatedListeners[type] = this._delegatedListeners[type] || [];
        this._delegatedListeners[type].push(delegatedListener);

        for (const event in delegatedListener.delegates) {
            this.on(event, delegatedListener.delegates[event]);
        }

        return this;
    }

    /**
     * 移除先前用 `Map#on`添加的事件监听。
     *
     * @method
     * @name off
     * @memberof Map
     * @instance
     * @param {string} type 之前用于安装监听的事件类型。
     * @param {Function} listener 之前安装的监听功能。
     * @returns {Map} `this`
     */

    /**
     * 移除先前用 `Map#on`为指定图层事件添加的监听器。
     *
     * @param {string} type 之前用于安装监听的事件类型。
     * @param {string} layer 之前用于安装监听的图层 ID。
     * @param {Function} listener 之前安装的监听功能。
     * @returns {Map} `this`
     */
    off(type, layer, listener) {
        if (listener === undefined) {
            return super.off(type, layer);
        }

        if (this._delegatedListeners && this._delegatedListeners[type]) {
            const listeners = this._delegatedListeners[type];
            for (let i = 0; i < listeners.length; i++) {
                const delegatedListener = listeners[i];
                if (delegatedListener.layer === layer && delegatedListener.listener === listener) {
                    for (const event in delegatedListener.delegates) {
                        this.off(event, delegatedListener.delegates[event]);
                    }
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }
    }

    /**
     * 返回一个 [GeoJSON](http://geojson.org/)
     * [Feature objects](http://geojson.org/geojson-spec.html#feature-objects)
     * 数组，表明满足查询参数的可见要素。
     *
     * @param {PointLike|Array<PointLike>} [geometry] - 查询区域的几何形状：
     * 单个的点或者是一个通过西北角和东南角的点界定的限位框。
     * 省略该参数（亦即在不带实参（argument）
     * 或只带一个 `parameters`参数的情况下，调用 {@link Map#queryRenderedFeatures}
     * 相当于传递包含整个地图视口的限位框。
     * @param {Object} [parameters]
     * @param {Array<string>} [parameters.layers] 样式图层 ID 数组，供查询器检查。
     *   只有这些图层中的要素会被返回。如果没有指定该参数，将检查所有图层。
     * @param {Array} [parameters.filter] 限定查询结果的 [filter](https://www.mapbox.com/mapbox-gl-style-spec/#types-filter)
     *  。
     *
     * @returns {Array<Object>} [GeoJSON](http://geojson.org/)
     * [feature objects](http://geojson.org/geojson-spec.html#feature-objects)数组。
     *
     * 每个被返回的要素对象的 `properties` 值都包含其源数据要素（source feature）属性。
     * GeoJSON 数据源只支持字符串和数字属性值（也就是说不支持 `null`, `Array`, 和 `Object` 值）。
     *
     * 每个要素都包含一个最高级别的 `layer` 属性，
     * 其值是一个代表着该要素所属样式图层的对象。
     * 该对象中的布局和 paint 属性包含的值已在给定的缩放级别和要素下经过了充分的评估。
     *
     * 不包括来自 `visibility` 属性为 `"none"`的图层的要素，也不包括图层缩放范围超出现有缩放级别的要素。
     * 不包括由于文本或图标冲突而隐藏的符号要素。
     * 包括来自其他所有图层的要素，
     * 甚至是对渲染结果没有明显影响的要素（
     * 例如，因为图层的透明度或 color alpha 组件被设为了 0）。
     *
     * 顶层的被渲染完毕的要素首先出现在返回的数组中，
     * 后续要素按 z-order 降序排列。
     * （在低缩放级别下由于跨过反向子午线）经多次渲染的要素只返回一次（虽然会收到下列警告）。
     *
     * 由于来自切片矢量数据或 GeoJSON 数据（内部转化为切片）的要素，
     * 其几何图形可能被切片边界分开或导致复制，因此查询结果中一个要素可能出现多次。
     * 例如，有一条公路穿过查询边框。即使这条公路也延伸到了其它切片中，
     * 但查询的结果将是边框内的地图切片部分，
     * 而且每一个地图切片中的公路部分都将作为独立的要素被返回。
     * 同样，靠近切片边界的点要素由于切片缓存（tile buffering），
     * 可能出现在多个切片中。
     *
     * @example
     * // Find all features at a point
     * var features = map.queryRenderedFeatures(
     *   [20, 35],
     *   { layers: ['my-layer-name'] }
     * );
     *
     * @example
     * // Find all features within a static bounding box
     * var features = map.queryRenderedFeatures(
     *   [[10, 20], [30, 50]],
     *   { layers: ['my-layer-name'] }
     * );
     *
     * @example
     * // Find all features within a bounding box around a point
     * var width = 10;
     * var height = 20;
     * var features = map.queryRenderedFeatures([
     *   [point.x - width / 2, point.y - height / 2],
     *   [point.x + width / 2, point.y + height / 2]
     * ], { layers: ['my-layer-name'] });
     *
     * @example
     * // Query all rendered features from a single layer
     * var features = map.queryRenderedFeatures({ layers: ['my-layer-name'] });
     * @see [用鼠标指针获取要素](https://www.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures/)
     * @see [在限位框中突出显示要素](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [将地图中心设为被点击到的符号位置](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     */
    queryRenderedFeatures() {
        let params = {};
        let geometry;

        if (arguments.length === 2) {
            geometry = arguments[0];
            params = arguments[1];
        } else if (arguments.length === 1 && isPointLike(arguments[0])) {
            geometry = arguments[0];
        } else if (arguments.length === 1) {
            params = arguments[0];
        }

        if (!this.style) {
            return [];
        }

        return this.style.queryRenderedFeatures(
            this._makeQueryGeometry(geometry),
            params,
            this.transform.zoom,
            this.transform.angle
        );

        function isPointLike(input) {
            return input instanceof Point || Array.isArray(input);
        }
    }

    _makeQueryGeometry(pointOrBox) {
        if (pointOrBox === undefined) {
            // bounds was omitted: use full viewport
            pointOrBox = [
                Point.convert([0, 0]),
                Point.convert([this.transform.width, this.transform.height])
            ];
        }

        let queryGeometry;
        const isPoint = pointOrBox instanceof Point || typeof pointOrBox[0] === 'number';

        if (isPoint) {
            const point = Point.convert(pointOrBox);
            queryGeometry = [point];
        } else {
            const box = [Point.convert(pointOrBox[0]), Point.convert(pointOrBox[1])];
            queryGeometry = [
                box[0],
                new Point(box[1].x, box[0].y),
                box[1],
                new Point(box[0].x, box[1].y),
                box[0]
            ];
        }

        queryGeometry = queryGeometry.map((p) => {
            return this.transform.pointCoordinate(p);
        });

        return queryGeometry;
    }

    /**
     * 返回一个 [GeoJSON](http://geojson.org/)
     * [Feature objects](http://geojson.org/geojson-spec.html#feature-objects)
     * 数组，代表符合查询参数、位于特定矢量切片或 GeoJSON 数据源内的要素。
     *
     * @param {string} sourceID 需要查询的矢量切片 ID 或 GeoJSON 数据源 ID。
     * @param {Object} [parameters]
     * @param {string} [parameters.sourceLayer] 需要查询的矢量切片图层名称。
     *   这个参数对矢量切片数据源来说是必须的。对 GeoJSON 数据源则无需设置。
     * @param {Array} [parameters.filter] 限定查询结果的 [filter](https://www.mapbox.com/mapbox-gl-style-spec/#types-filter)
     *   .
     *
     * @returns {Array<Object>} [GeoJSON](http://geojson.org/)
     * [Feature objects](http://geojson.org/geojson-spec.html#feature-objects)数组。
     *
     * 与 {@link Map#queryRenderedFeatures}不同的是，
     * 该函数返回所有符合查询参数的要素，无它们是否已按照当前样式经过渲染（即无论是否可见）。
     * 查询域包括所有当前载入的矢量切片
     * 和 GeoJSON 数据源切片：
     * 该函数不会检查当前可见视口之外的切片。
     *
     * 由于来自切片矢量数据或 GeoJSON 数据（内部转化为切片）的要素，
     * 其几何图形可能被切片边界分开或导致复制，因此查询结果中一个要素可能出现多次。
     * 例如，有一条公路穿过查询边框。即使这条公路也延伸到了其它切片中，
     * 但查询的结果将是边框内的地图切片部分，而且每一个地图切片中的公路部分都将作为独立的要素被返回。
     * 同样，
     * 靠近切片边界的点要素由于切片缓存（tile buffering），
     * 可能出现在多个切片中。
     * @see [在地图视图（map view）内对要素进行过滤](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     * @see [突出含有类似数据的要素](https://www.mapbox.com/mapbox-gl-js/example/query-similar-features/)
     */
    querySourceFeatures(sourceID, parameters) {
        return this.style.querySourceFeatures(sourceID, parameters);
    }

    /**
     * 用新的值更新地图的 Mapbox 样式对象。
     * 如果给定的值是 style JSON 对象，
     * 那么将它跟地图的当前状态比较，
     * 只应用必要的更改以得到期待的地图样式。
     *
     * @param {Object|string} style 符合
     *   [Mapbox 样式规范](https://mapbox.com/mapbox-gl-style-spec/),规定的 JSON 对象，或者是连接该对象的 URL。
     * @param {Object} [options]
     * @param {boolean} [options.diff=true] 如果为 false，将进行“彻底”更新，
     *   先移除当前样式，然后添加指定样式，而不是只针对不同点更新。
     * @returns {Map} `this`
     * @see [改变地图样式](https://www.mapbox.com/mapbox-gl-js/example/setstyle/)
     */
    setStyle(style, options) {
        const shouldTryDiff = (!options || options.diff !== false) && this.style && style &&
            !(style instanceof Style) && typeof style !== 'string';
        if (shouldTryDiff) {
            try {
                if (this.style.setState(style)) {
                    this._update(true);
                }
                return this;
            } catch (e) {
                util.warnOnce(`Unable to perform style diff: ${e.message || e.error || e}.  Rebuilding the style from scratch.`);
            }
        }

        if (this.style) {
            this.style.setEventedParent(null);
            this.style._remove();
            this.off('rotate', this.style._redoPlacement);
            this.off('pitch', this.style._redoPlacement);
        }

        if (!style) {
            this.style = null;
            return this;
        } else if (style instanceof Style) {
            this.style = style;
        } else {
            this.style = new Style(style, this);
        }

        this.style.setEventedParent(this, {style: this.style});

        this.on('rotate', this.style._redoPlacement);
        this.on('pitch', this.style._redoPlacement);

        return this;
    }

    /**
     * 返回地图的 Mapbox 样式对象，可用于重建地图样式。
     *
     * @returns {Object} 地图的样式对象。
     */
    getStyle() {
        if (this.style) {
            return this.style.serialize();
        }
    }

     /**
      * Returns a Boolean indicating whether the map's style is fully loaded.
      *
      * @returns {boolean} A Boolean indicating whether the style is fully loaded.
      */
    isStyleLoaded() {
        if (!this.style) return util.warnOnce('There is no style added to the map.');
        return this.style.loaded();
    }

    /**
     * 为地图样式添加数据源。
     *
     * @param {string} id 要添加的数据源的 ID。注意不能与现有数据源 ID 冲突。
     * @param {Object} source 数据源对象，符合 Mapbox 样式规范的
     * Mapbox Style Specification's [source definition](https://www.mapbox.com/mapbox-gl-style-spec/#sources)。
     * @param {string} source.type 数据源类型，必须是 style specification 中规定的 Mapbox GL 核心数据源类型之一，或者是使用 {@link Map#addSourceType}添加的自定义类型。
     * @fires source.add
     * @returns {Map} `this`
     * @see [Draw GeoJSON points](https://www.mapbox.com/mapbox-gl-js/example/geojson-markers/)
     * @see [Style circles using data-driven styling](https://www.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/)
     * @see [Set a point after Geocoder result](https://www.mapbox.com/mapbox-gl-js/example/point-from-geocoder-result/)
     */
    addSource(id, source) {
        this.style.addSource(id, source);
        this._update(true);
        return this;
    }

    /**
     * 返回一个布尔值，提示数据源是否已载入。
     *
     * @param {string} id 需要检查的数据源 ID。
     * @returns {boolean} 表示数据源是否载入的布尔值。
     */
    isSourceLoaded(id) {
        const source = this.style && this.style.sourceCaches[id];
        if (source === undefined) {
            this.fire('error', {
                error: new Error(`There is no source with ID '${id}'`)
            });
            return;
        }
        return source.loaded();
    }

    /**
     * Returns a Boolean indicating whether all tiles in the viewport from all sources on
     * the style are loaded.
     *
     * @returns {boolean} A Boolean indicating whether all tiles are loaded.
     */

    areTilesLoaded() {
        const sources = this.style && this.style.sourceCaches;
        for (const id in sources) {
            const source = sources[id];
            const tiles = source._tiles;
            for (const t in tiles) {
                const tile = tiles[t];
                if (!(tile.state === 'loaded' || tile.state === 'errored')) return false;
            }
        }
        return true;
    }

    /**
     * Adds a [custom source type](#Custom Sources), making it available for use with
     * {@link Map#addSource}.
     * @private
     * @param {string} name The name of the source type; source definition objects use this name in the `{type: ...}` field.
     * @param {Function} SourceType A {@link Source} constructor.
     * @param {Function} callback Called when the source type is ready or with an error argument if there is an error.
     */
    addSourceType(name, SourceType, callback) {
        return this.style.addSourceType(name, SourceType, callback);
    }

    /**
     * 从地图样式中移除数据源。
     *
     * @param {string} id 需要移除的数据源 ID。
     * @returns {Map} `this`
     */
    removeSource(id) {
        this.style.removeSource(id);
        this._update(true);
        return this;
    }

    /**
     * 返回地图样式中带指定 ID 的数据源。
     *
     * @param {string} id 需要获得的数据源 ID。
     * @returns {?Object} 指定 ID 的样式数据源，如果没有对应的数据源，则为`undefined`
     *   。
     * @see [创建一个可以拖动的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     * @see [为一个点添加动画效果](https://www.mapbox.com/mapbox-gl-js/example/animate-point-along-line/)
     * @see [添加实时数据](https://www.mapbox.com/mapbox-gl-js/example/live-geojson/)
     */
    getSource(id) {
        return this.style.getSource(id);
    }

    /**
     * 给样式添加图像。图像可用作 `icon-image`,
     * `background-pattern`, `fill-pattern`，和 `line-pattern`。
     * Sprite 中没有足够空间添加该图像时会触发{@link Map#error} 
     * 事件。
     *
     * @see [在地图上添加一个图标](https://www.mapbox.com/mapbox-gl-js/example/add-image/)
     * @see [在地图上生成一个图标](https://www.mapbox.com/mapbox-gl-js/example/add-image-generated/)
     * @param {string} name 图像名称。
     * @param {HTMLImageElement|ArrayBufferView} image 作为  `HTMLImageElement` 或 `ArrayBufferView` 的图像（使用 [`ImageData#data`](https://developer.mozilla.org/en-US/docs/Web/API/ImageData/data)格式）。
     * @param {Object} [options] Required if and only if passing an `ArrayBufferView`
     * @param {number} [options.width] The pixel width of the `ArrayBufferView` image
     * @param {number} [options.height] The pixel height of the `ArrayBufferView` image
     * @param {number} [options.pixelRatio] The ratio of pixels in the `ArrayBufferView` image to physical pixels on the screen
     */
    addImage(name, image, options) {
        this.style.spriteAtlas.addImage(name, image, options);
    }

    /**
     * 从样式中移除图像（例如 `icon-image` 或 `background-pattern` 使用的图像）。
     *
     * @param {string} name 图像名称。
     */
    removeImage(name) {
        this.style.spriteAtlas.removeImage(name);
    }

    /**
     * 使用 `Map#addImage`从外部 URL 载入图像。
     * 外部域必须支持 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS)。
     *
     * @param {string} url 图像的 URL。 图像文件的格式为 png, webp, 或者 jpg 。
     * @param {Function} callback 预期为 `callback(error, data)`。 当图像成功载入或出现错误时调用。

     * @see [给地图添加图标](https://www.mapbox.com/mapbox-gl-js/example/add-image/)
     */
    loadImage(url, callback) {
        ajax.getImage(url, callback);
    }

    /**
     * 给地图样式添加 [Mapbox 样式图层](https://www.mapbox.com/mapbox-gl-style-spec/#layers)
     * 。
     *
     * 图层为来自特定数据源的的数据定义样式。
     *
     * @param {Object} layer 需要添加的样式图层，符合 Mapbox 样式规范的
     *   [图层定义](https://www.mapbox.com/mapbox-gl-style-spec/#layers)。
     * @param {string} [before] 用来插入新图层的现有图层 ID。
     *   如果该参数（argument）被省略，该图层将会被添加到图层数组的末尾。
     * @returns {Map} `this`
     * @see [创建并样式化群组](https://www.mapbox.com/mapbox-gl-js/example/cluster/)
     * @see [添加矢量切片数据源](https://www.mapbox.com/mapbox-gl-js/example/vector-source/)
     * @see [添加 WMS 数据源](https://www.mapbox.com/mapbox-gl-js/example/wms/)
     */
    addLayer(layer, before) {
        this.style.addLayer(layer, before);
        this._update(true);
        return this;
    }

    /**
     * 将图层移动到另一个 z 轴位置（z-position）。
     *
     * @param {string} id 需要移动的图层 ID。
     * @param {string} [beforeId] 用来插入新图层的现有图层 ID。
     *   如果该参数（argument）被省略，该图层将会被添加到图层数组的末尾。
     * @returns {Map} `this`
     */
    moveLayer(id, beforeId) {
        this.style.moveLayer(id, beforeId);
        this._update(true);
        return this;
    }

    /**
     * 从地图样式中移除带指定 ID 的图层。
     *
     * 如果指定图层不存在，将会触发 `error` 事件。
     *
     * @param {string} id  需要移除的图层 ID。
     * @fires error
     */
    removeLayer(id) {
        this.style.removeLayer(id);
        this._update(true);
        return this;
    }

    /**
     * 返回地图样式中带指定 ID 的图层。
     *
     * @param {string} id 需要获得的图层 ID。
     * @returns {?Object} 带指定 ID 的图层，如果没有对应的图层，则为 `undefined`
     *   。
     * @see [通过切换列表过滤符号（symbol）](https://www.mapbox.com/mapbox-gl-js/example/filter-markers/)
     * @see [通过输入文本过滤符号](https://www.mapbox.com/mapbox-gl-js/example/filter-markers-by-input/)
     */
    getLayer(id) {
        return this.style.getLayer(id);
    }

    /**
     * 为指定样式图层设置筛选器。
     *
     * @param {string} layer 需要应用筛选器的图层 ID。
     * @param {Array} filter 筛选器符合 Mapbox 样式规范的
     *   [filter definition](https://www.mapbox.com/mapbox-gl-style-spec/#types-filter).
     * @returns {Map} `this`
     * @example
     * map.setFilter('my-layer', ['==', 'name', 'USA']);
     * @see [在地图视图（map view）内对要素进行过滤](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     * @see [突出含有类似数据的要素](https://www.mapbox.com/mapbox-gl-js/example/query-similar-features/)
     * @see [创建时间轴动画（timeline animation）](https://www.mapbox.com/mapbox-gl-js/example/timeline-animation/)
     */
    setFilter(layer, filter) {
        this.style.setFilter(layer, filter);
        this._update(true);
        return this;
    }

    /**
     * 设置指定样式图层的缩放范围。
     *
     * @param {string} layerId 需要应用缩放范围的图层 ID。
     * @param {number} minzoom 设置的最小缩放值（0-20）。
     * @param {number} maxzoom 设置的最大缩放值（0-20）。
     * @returns {Map} `this`
     * @example
     * map.setLayerZoomRange('my-layer', 2, 5);
     */
    setLayerZoomRange(layerId, minzoom, maxzoom) {
        this.style.setLayerZoomRange(layerId, minzoom, maxzoom);
        this._update(true);
        return this;
    }

    /**
     * 返回应用于指定样式图层的筛选器。
     *
     * @param {string} layer 需要获取筛选器的样式图层 ID。
     * @returns {Array} 图层的筛选器。
     */
    getFilter(layer) {
        return this.style.getFilter(layer);
    }

    /**
     * 设置指定样式图层中 paint 属性的值。
     *
     * @param {string} layer 需要设置 paint 渲染属性的图层 ID。
     * @param {string} name 需要设置的 paint 渲染属性名称。
     * @param {*} value 要设置的 paint 渲染属性值。
     *   必须是符合 [Mapbox Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/)规定，适合该属性的一种类型。
     * @param {string=} klass paint 属性的样式类说明符。
     * @returns {Map} `this`
     * @example
     * map.setPaintProperty('my-layer', 'fill-color', '#faafee');
     * @see [用按钮改变图层颜色](https://www.mapbox.com/mapbox-gl-js/example/color-switcher/)
     * @see [调整图层的透明度](https://www.mapbox.com/mapbox-gl-js/example/adjust-layer-opacity/)
     * @see [创建一个可以拖动的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    setPaintProperty(layer, name, value, klass) {
        this.style.setPaintProperty(layer, name, value, klass);
        this._update(true);
        return this;
    }

    /**
     * 返回指定样式图层中 paint 属性的值。
     *
     * @param {string} layer 从中获取 paint 属性的图层的 ID。
     * @param {string} name 需要获取的 paint 属性名称。
     * @param {string=} klass paint 属性的类说明符。
     * @returns {*} 指定 paint 属性的值。
     */
    getPaintProperty(layer, name, klass) {
        return this.style.getPaintProperty(layer, name, klass);
    }

    /**
     * 设置指定样式图层中布局属性的值。
     *
     * @param {string} layer 需要在其中设置布局（layout）属性的图层 ID。
     * @param {string} name 需要设置的布局属性名称。
     * @param {*} value 布局属性的值。必须是符合 [Mapbox Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/)规定，适合该属性的一种类型。
     * @returns {Map} `this`
     * @example
     * map.setLayoutProperty('my-layer', 'visibility', 'none');
     */
    setLayoutProperty(layer, name, value) {
        this.style.setLayoutProperty(layer, name, value);
        this._update(true);
        return this;
    }

    /**
     * 返回指定样式图层中布局属性的值。
     *
     * @param {string} layer 从中获取布局属性的图层 ID。
     * @param {string} name 需要获取的布局属性名称。
     * @returns {*} 指定布局属性的值。
     */
    getLayoutProperty(layer, name) {
        return this.style.getLayoutProperty(layer, name);
    }

    /**
     * 设置任意光源（light）值组合。
     *
     * @param {Object} options 需要设置的光源属性。必须符合 [Mapbox Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/)。
     * @returns {Map} `this`
     */
    setLight(lightOptions) {
        this.style.setLight(lightOptions);
        this._update(true);
        return this;
    }

    /**
     * 返回光源对象的值。
     *
     * @returns {Object} light 激活样式的光源 Light 属性。
     */
    getLight() {
        return this.style.getLight();
    }

    /**
     * 返回地图的 HTML 嵌套元素。
     *
     * @returns {HTMLElement} 地图容器（container）。
     */
    getContainer() {
        return this._container;
    }

    /**
     * 返回包含地图 `<canvas>` 元素的 HTML 元素。
     *
     * 如果你想给地图上添加非 GL 叠加图层，可以将其附加（append）在这一元素结尾。
     *
     * 该元素用于给地图交互性（如平移和缩放）进行事件绑定。
     * 它接受来自子元素（如 `<canvas>`的起泡事件（bubbled events），
     * 但不接受来自地图控件的起泡事件。
     *
     * @returns {HTMLElement} 地图 `<canvas>`的容器。
     * @see [创建一个可以拖动的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     * @see [在限位框中突出显示要素](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     */
    getCanvasContainer() {
        return this._canvasContainer;
    }

    /**
     * 返回地图的 `<canvas>` 元素。
     *
     * @returns {HTMLCanvasElement} 地图的 `<canvas>` 元素。
     * @see [测量距离](https://www.mapbox.com/mapbox-gl-js/example/measure/)
     * @see [鼠标悬停时弹出对话框](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     * @see [将地图中心设为被点击到的符号位置](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     */
    getCanvas() {
        return this._canvas;
    }

    _containerDimensions() {
        let width = 0;
        let height = 0;

        if (this._container) {
            width = this._container.offsetWidth || 400;
            height = this._container.offsetHeight || 300;
        }

        return [width, height];
    }

    _setupContainer() {
        const container = this._container;
        container.classList.add('mapboxgl-map');

        const canvasContainer = this._canvasContainer = DOM.create('div', 'mapboxgl-canvas-container', container);
        if (this._interactive) {
            canvasContainer.classList.add('mapboxgl-interactive');
        }

        this._canvas = DOM.create('canvas', 'mapboxgl-canvas', canvasContainer);
        this._canvas.style.position = 'absolute';
        this._canvas.addEventListener('webglcontextlost', this._contextLost, false);
        this._canvas.addEventListener('webglcontextrestored', this._contextRestored, false);
        this._canvas.setAttribute('tabindex', 0);
        this._canvas.setAttribute('aria-label', 'Map');

        const dimensions = this._containerDimensions();
        this._resizeCanvas(dimensions[0], dimensions[1]);

        const controlContainer = this._controlContainer = DOM.create('div', 'mapboxgl-control-container', container);
        const positions = this._controlPositions = {};
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((positionName) => {
            positions[positionName] = DOM.create('div', `mapboxgl-ctrl-${positionName}`, controlContainer);
        });
    }

    _resizeCanvas(width, height) {
        const pixelRatio = window.devicePixelRatio || 1;

        // Request the required canvas size taking the pixelratio into account.
        this._canvas.width = pixelRatio * width;
        this._canvas.height = pixelRatio * height;

        // Maintain the same canvas size, potentially downscaling it for HiDPI displays
        this._canvas.style.width = `${width}px`;
        this._canvas.style.height = `${height}px`;
    }

    _setupPainter() {
        const attributes = util.extend({
            failIfMajorPerformanceCaveat: this._failIfMajorPerformanceCaveat,
            preserveDrawingBuffer: this._preserveDrawingBuffer
        }, isSupported.webGLContextAttributes);

        const gl = this._canvas.getContext('webgl', attributes) ||
            this._canvas.getContext('experimental-webgl', attributes);

        if (!gl) {
            this.fire('error', { error: new Error('Failed to initialize WebGL') });
            return;
        }

        this.painter = new Painter(gl, this.transform);
    }

    /**
     * Fired when the WebGL context is lost.
     *
     * @event webglcontextlost
     * @memberof Map
     * @instance
     * @type {Object}
     * @property {WebGLContextEvent} originalEvent The original DOM event.
     */
    _contextLost(event) {
        event.preventDefault();
        if (this._frameId) {
            browser.cancelFrame(this._frameId);
        }
        this.fire('webglcontextlost', {originalEvent: event});
    }

    /**
     * Fired when the WebGL context is restored.
     *
     * @event webglcontextrestored
     * @memberof Map
     * @instance
     * @type {Object}
     * @property {WebGLContextEvent} originalEvent The original DOM event.
     */
    _contextRestored(event) {
        this._setupPainter();
        this.resize();
        this._update();
        this.fire('webglcontextrestored', {originalEvent: event});
    }

    /**
     * 返回一个表示地图是否载入完毕的布尔值（Boolean）。
     *
     * 当样式尚未完全载入，
     * 或者正在载入的数据源或样式的改动尚未完全载入，
     * 返回 `false`。
     *
     * @returns {boolean} 用来表示地图是否完全加载。
     */
    loaded() {
        if (this._styleDirty || this._sourcesDirty)
            return false;
        if (!this.style || !this.style.loaded())
            return false;
        return true;
    }

    /**
     * Update this map's style and sources, and re-render the map.
     *
     * @param {boolean} updateStyle mark the map's style for reprocessing as
     * well as its sources
     * @returns {Map} this
     * @private
     */
    _update(updateStyle) {
        if (!this.style) return this;

        this._styleDirty = this._styleDirty || updateStyle;
        this._sourcesDirty = true;

        this._rerender();

        return this;
    }

    /**
     * Call when a (re-)render of the map is required:
     * - The style has changed (`setPaintProperty()`, etc.)
     * - Source data has changed (e.g. tiles have finished loading)
     * - The map has is moving (or just finished moving)
     * - A transition is in progress
     *
     * @returns {Map} this
     * @private
     */
    _render() {
        // If the style has changed, the map is being zoomed, or a transition
        // is in progress:
        //  - Apply style changes (in a batch)
        //  - Recalculate zoom-dependent paint properties.
        if (this.style && this._styleDirty) {
            this._styleDirty = false;
            this.style.update(this._classes, this._classOptions);
            this._classOptions = null;
            this.style._recalculate(this.transform.zoom);
        }

        // If we are in _render for any reason other than an in-progress paint
        // transition, update source caches to check for and load any tiles we
        // need for the current transform
        if (this.style && this._sourcesDirty) {
            this._sourcesDirty = false;
            this.style._updateSources(this.transform);
        }

        // Actually draw
        this.painter.render(this.style, {
            showTileBoundaries: this.showTileBoundaries,
            showOverdrawInspector: this._showOverdrawInspector,
            rotating: this.rotating,
            zooming: this.zooming
        });

        this.fire('render');

        if (this.loaded() && !this._loaded) {
            this._loaded = true;
            this.fire('load');
        }

        this._frameId = null;

        // Flag an ongoing transition
        if (!this.animationLoop.stopped()) {
            this._styleDirty = true;
        }

        // Schedule another render frame if it's needed.
        //
        // Even though `_styleDirty` and `_sourcesDirty` are reset in this
        // method, synchronous events fired during Style#update or
        // Style#_updateSources could have caused them to be set again.
        if (this._sourcesDirty || this._repaint || this._styleDirty) {
            this._rerender();
        }

        return this;
    }

    /**
     * 清理并释放和地图相关的所有内部数据源。
     *
     * 包括 DOM 元素，事件绑定，工作线程，和 WebGL 资源。
     *
     * 当你使用完地图并希望
     * 不再占用浏览器资源时可以使用该方法。
     * 之后你将不能在地图上调用任何方法。
     */
    remove() {
        if (this._hash) this._hash.remove();
        browser.cancelFrame(this._frameId);
        this.setStyle(null);
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this._onWindowResize, false);
            window.removeEventListener('online', this._onWindowOnline, false);
        }
        const extension = this.painter.gl.getExtension('WEBGL_lose_context');
        if (extension) extension.loseContext();
        removeNode(this._canvasContainer);
        removeNode(this._controlContainer);
        this._container.classList.remove('mapboxgl-map');
        this.fire('remove');
    }

    _rerender() {
        if (this.style && !this._frameId) {
            this._frameId = browser.frame(this._render);
        }
    }

    _onWindowOnline() {
        this._update();
    }

    _onWindowResize() {
        if (this._trackResize) {
            this.stop().resize()._update();
        }
    }

    /**
     * 获取并设置一个布尔值，用以表示地图是否会渲染切片边界 。这些切片边界有助于查错。
     * 这些切片边界有助于查错。
     *
     * @name showTileBoundaries
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get showTileBoundaries() { return !!this._showTileBoundaries; }
    set showTileBoundaries(value) {
        if (this._showTileBoundaries === value) return;
        this._showTileBoundaries = value;
        this._update();
    }

    /**
     * 获取并设置一个布尔值，
     * 指示地图是否会渲染数据源中所有符号周围的框，
     * 以及哪些符号已经被渲染，
     * 哪些因为冲突而被隐藏。这些信息有助于查错。
     *
     * @name showCollisionBoxes
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get showCollisionBoxes() { return !!this._showCollisionBoxes; }
    set showCollisionBoxes(value) {
        if (this._showCollisionBoxes === value) return;
        this._showCollisionBoxes = value;
        this.style._redoPlacement();
    }

    /*
     * Gets and sets a Boolean indicating whether the map should color-code
     * each fragment to show how many times it has been shaded.
     * White fragments have been shaded 8 or more times.
     * Black fragments have been shaded 0 times.
     * This information is useful for debugging.
     *
     * @name showOverdraw
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get showOverdrawInspector() { return !!this._showOverdrawInspector; }
    set showOverdrawInspector(value) {
        if (this._showOverdrawInspector === value) return;
        this._showOverdrawInspector = value;
        this._update();
    }

    /**
     * 获得并设置一个布尔值，
     * 用于指示地图是否将继续再渲染。该信息有助于分析效果。
     *
     * @name repaint
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get repaint() { return !!this._repaint; }
    set repaint(value) { this._repaint = value; this._update(); }

    // show vertices
    get vertices() { return !!this._vertices; }
    set vertices(value) { this._vertices = value; this._update(); }

    _onData(event) {
        this._update(event.dataType === 'style');
        this.fire(`${event.dataType}data`, event);
    }

    _onDataLoading(event) {
        this.fire(`${event.dataType}dataloading`, event);
    }
}

module.exports = Map;

function removeNode(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}

/**
 * 添加到地图上的交互控件界面。
 * 这是执行器（implementers）需要模拟的规范：
 * 不是一个导出的方法或者类。
 *
 * 控件必须执行 `onAdd` and `onRemove`，并且必须拥有一个元素，
 * 通常是 div 元素。
 * 使用 Mapbox GL JS 默认的控件样式需要把 `mapboxgl-ctrl` 
 * 类添加到你的控件节点（node）中。
 *
 * @interface IControl
 * @example
 * // Control implemented as ES6 class
 * class HelloWorldControl {
 *     onAdd(map) {
 *         this._map = map;
 *         this._container = document.createElement('div');
 *         this._container.className = 'mapboxgl-ctrl';
 *         this._container.textContent = 'Hello, world';
 *         return this._container;
 *     }
 *
 *     onRemove() {
 *         this._container.parentNode.removeChild(this._container);
 *         this._map = undefined;
 *     }
 * }
 *
 * // Control implemented as ES5 prototypical class
 * function HelloWorldControl() { }
 *
 * HelloWorldControl.prototype.onAdd = function(map) {
 *     this._map = map;
 *     this._container = document.createElement('div');
 *     this._container.className = 'mapboxgl-ctrl';
 *     this._container.textContent = 'Hello, world';
 *     return this._container;
 * };
 *
 * HelloWorldControl.prototype.onRemove = function () {
 *      this._container.parentNode.removeChild(this._container);
 *      this._map = undefined;
 * };
 */

/**
 * 在地图上注册一个控件，并令其注册事件监听器和数据源。
 * 该方法由 {@link Map#addControl}
 * 内部调用。
 *
 * @function
 * @memberof IControl
 * @instance
 * @name onAdd
 * @param {Map} map 需要添加控件的地图
 * @returns {HTMLElement} 控件的容器元素。
 * 由控件创建，
 * 并由 onAdd 返回（不连接到 DOM）：
 * 必要时地图会将该控件的元素插入到 DOM 中。
 */

/**
 * 注销地图上的一个控件，使其可以从事件监听器和数据源分离。
 * 该方法由 {@link Map#removeControl}
 * 内部调用。
 *
 * @function
 * @memberof IControl
 * @instance
 * @name onRemove
 * @param {Map} map 需要移除控件的地图
 * @returns {undefined} 对该方法不需要返回值
 */

/**
 * 为该控j件提供一个可选的默认位置。
 * 如果该方法被执行，并且在不带 `position` 参数的情况下调用了{@link Map#addControl}，
 * getDefaultPosition 返回的值
 * 将被作为该控件的位置。
 *
 * @function
 * @memberof IControl
 * @instance
 * @name getDefaultPosition
 * @returns {string} 控件位置，addControl 中的有效值之一。
 */

/**
 * 代表经度和纬度的 {@link LngLat} 对象或者两个数字组成的数组。
 *
 * @typedef {(LngLat | Array<number>)} LngLatLike
 * @example
 * var v1 = new mapboxgl.LngLat(-122.420679, 37.772537);
 * var v2 = [-122.420679, 37.772537];
 */

/**
 * 一个 {@link LngLatBounds} 对象，或者一个 包含[sw, ne]的 {@link LngLatLike} 对象的数组。
 *
 * @typedef {(LngLatBounds | Array<LngLatLike>)} LngLatBoundsLike
 * @example
 * var v1 = new mapboxgl.LngLatBounds(
 *   new mapboxgl.LngLat(-73.9876, 40.7661),
 *   new mapboxgl.LngLat(-73.9397, 40.8002)
 * );
 * var v2 = new mapboxgl.LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002])
 * var v3 = [[-73.9876, 40.7661], [-73.9397, 40.8002]];
 */

/**
 * 一个 [`Point` geometry](https://github.com/mapbox/point-geometry) 对象，
 * 具有`x` and `y` 属性，代表屏幕上像素坐标。
 *
 * @typedef {Object} Point
 */

/**
 * 一个 {@link Point} 对象，或者包含两个`x` 和 `y`的像素坐标的数组。
 *
 * @typedef {(Point | Array<number>)} PointLike
 */

/**
 * 当地图由于以下任意操作被拖到屏幕上时触发
 *
 * - 改变地图位置、缩放级别、倾斜度和方位角
 * - 改变地图样式
 * - 改变 GeoJSON 数据源
 * - 载入矢量切片，GeoJSON 文件，glyph 或 sprite
 *
 * @event render
 * @memberof Map
 * @instance
 */

/**
 * 当定位设备（一般是鼠标）离开地图画布时触发。
 *
 * @event mouseout
 * @memberof Map
 * @instance
 * @property {MapMouseEvent} data
 * @see [Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
 */

/**
 * 当定位设备（一般是鼠标）在地图中被按下时触发。
 *
 * @event mousedown
 * @memberof Map
 * @instance
 * @property {MapMouseEvent} data
 * @see [Highlight features within a bounding box](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
 * @see [Create a draggable point](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
 */

/**
 * 当定位设备（一般是鼠标）在地图中被释放时触发。
 *
 * @event mouseup
 * @memberof Map
 * @instance
 * @property {MapMouseEvent} data
 * @see [Highlight features within a bounding box](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
 * @see [Create a draggable point](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
 */

/**
 * 当定位设备（一般是鼠标）在地图中移动时启动。
 *
 * @event mousemove
 * @memberof Map
 * @instance
 * @property {MapMouseEvent} data
 * @see [Get coordinates of the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
 * @see [Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
 * @see [Display a popup on hover](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
 */

/**
 * 当一个触点落在地图上时触发。
 *
 * @event touchstart
 * @memberof Map
 * @instance
 * @property {MapTouchEvent} data
 */

/**
 * 触点从地图中移开时触发。
 *
 * @event touchend
 * @memberof Map
 * @instance
 * @property {MapTouchEvent} data
 */

/**
 * 当触点在地图中移动时触发。
 *
 * @event touchmove
 * @memberof Map
 * @instance
 * @property {MapTouchEvent} data
 */

/**
 * 触点中断时触发。
 *
 * @event touchcancel
 * @memberof Map
 * @instance
 * @property {MapTouchEvent} data
 */

/**
 * 当定位设备（一般是鼠标）在地图上的同一个点被按下又释放时触发。
 *
 * @event click
 * @memberof Map
 * @instance
 * @property {MapMouseEvent} data
 * @see [Measure distances](https://www.mapbox.com/mapbox-gl-js/example/measure/)
 * @see [Center the map on a clicked symbol](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
 */

/**
 * 用定点设备（一般是鼠标）双击地图上同一个点。
 *
 * @event dblclick
 * @memberof Map
 * @instance
 * @property {MapMouseEvent} data
 */

/**
 * 点击鼠标右键或点开地图上的快捷菜单（context menu）时触发。
 *
 * @event contextmenu
 * @memberof Map
 * @instance
 * @property {MapMouseEvent} data
 */

/**
 * 所有需要的数据源下载完毕，
 * 并且第一个可见的地图渲染完成后即刻触发。
 *
 * @event load
 * @memberof Map
 * @instance
 * @type {Object}
 * @see [绘制 GeoJSON 点](https://www.mapbox.com/mapbox-gl-js/example/geojson-markers/)
 * @see [添加实时数据](https://www.mapbox.com/mapbox-gl-js/example/live-geojson/)
 * @see [为一个点添加动画效果](https://www.mapbox.com/mapbox-gl-js/example/animate-point-along-line/)
 */

/**
 * 在用户交互或  {@link Map#jumpTo}
 * 等方法使地图开始从一个视图转换到另一个视图之前触发。
 *
 * @event movestart
 * @memberof Map
 * @instance
 * @property {{originalEvent: DragEvent}} data
 */

/**
 * 在用户交互或 {@link Map#flyTo}
 * 等方法引发视图动态转换期间重复触发。 
 *
 * @event move
 * @memberof Map
 * @instance
 * @property {MapMouseEvent | MapTouchEvent} data
 */

/**
 * 在用户交互或{@link Map#jumpTo} 等方法的作用下，
 * 地图完成从一个视图到另一个视图的转换后启动该事件。
 *
 * @event moveend
 * @memberof Map
 * @instance
 * @property {{originalEvent: DragEvent}} data
 * @see [Play map locations as a slideshow](https://www.mapbox.com/mapbox-gl-js/example/playback-locations/)
 * @see [Filter features within map view](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
 */

 /**
  * 出现错误时启动。
  * 这是 GL JS 的主要报错机制。我们使用事件代替 throw 以更好地适应异步操作。
  * 如果没有监听器和 `error` 事件绑定，
  * 错误将会被打印到控制台（console）。
  *
  * @event error
  * @memberof Map
  * @instance
  * @property {{error: {message: string}}} data
  */

/**
 * 地图数据加载或改变时启动。点击 {@link MapDataEvent}
 * 获取更多信息。
 *
 * @event data
 * @memberof Map
 * @instance
 * @property {MapDataEvent} data
 */

/**
 * 加载或改变地图样式时触发。点击
 * {@link MapDataEvent} 获取更多信息。
 *
 * @event styledata
 * @memberof Map
 * @instance
 * @property {MapDataEvent} data
 */

/**
 * 加载或改变地图数据源时触发，包括加载或改变属于该数据源的一个切片的情况。
 * 点击  {@link MapDataEvent} 获取更多信息。
 *
 * @event sourcedata
 * @memberof Map
 * @instance
 * @property {MapDataEvent} data
 */

/**
 * 任意地图数据（样式、数据源、切片等）开始异步加载或改变时触发。
 * 所有的 `dataloading` 事件后面都跟有一个 `data`
 * 或 `error` 事件。点击 {@link MapDataEvent}  获取更多信息。
 *
 * @event dataloading
 * @memberof Map
 * @instance
 * @property {MapDataEvent} data
 */

/**
 * 地图样式开始异步加载或改变时触发。
 * 所有 `styledataloading` 事件后面都跟有一个 `styledata`
 * 或 `error` 事件。点击 {@link MapDataEvent} 获取更多信息。
 *
 * @event styledataloading
 * @memberof Map
 * @instance
 * @property {MapDataEvent} data
 */

/**
 * 当一个地图数据源开始异步加载或改变时触发。
 * 所有 `sourcedataloading` 事件后面都跟有一个  `sourcedata` 或 `error` 事件。
 * 点击 {@link MapDataEvent} 获取更多信息。
 *
 * @event sourcedataloading
 * @memberof Map
 * @instance
 * @property {MapDataEvent} data
 */

 /**
  * `MapDataEvent` 对象同 {@link Map.event:data}
  * 和 {@link Map.event:dataloading} 事件一起发出。
  * `dataType` 能的值包括：
  *
  * - `'source'`: 与任意数据源相关的非切片数据
  * - `'style'`: 地图使用的 [样式style](https://www.mapbox.com/mapbox-gl-style-spec/)
  *
  * @typedef {Object} MapDataEvent
  * @property {string} type 事件类型。
  * @property {string} dataType 已改变的数据类型。 `'source'`, `'style'`之一。
  * @property {boolean} [isSourceLoaded] 如果事件有 `source` 的 `dataType` ，并且数据源没有未解决的网络请求时，该属性为 true。
  * @property {Object} [source] 如果事件有 `source` 的 `dataType` ，[代表数据源的样式规范style spec representation of the source](https://www.mapbox.com/mapbox-gl-style-spec/#sources) 。
  * @property {string} [sourceDataType] 如果事件有 `source` 的 `dataType` ，并且时间表明内部数据已被接收或改变时，
  * 该属性将被包含在内。可能的值有 `metadata` 和 `content`.
  * @property {Object} [tile] 如果事件有 `source` 的 `dataType` ，
  * 并且事件与加载切片相关时，指正在加载或改变的切片。
  * @property {Coordinate} [coord] 如果事件有 `source` 的 `dataType` ，
  * 并且事件与加载切片相关时，指切片的坐标。
  */

 /**
 * 地图被 {@link Map.event:remove} 移除后立即启动。
 *
 * @event remove
 * @memberof Map
 * @instance
 */

  /**
 * 地图大小调整后立刻启动该事件。
 *
 * @event resize
 * @memberof Map
 * @instance
 */
