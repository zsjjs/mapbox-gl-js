'use strict';

/**
 * `DoubleClickZoomHandler` 允许用户通过双击
 * 缩放地图。
 *
 * @param {Map} map 需要添加处理程序（handler）的 Mapbox GL JS 地图。
 */
class DoubleClickZoomHandler {
    constructor(map) {
        this._map = map;
        this._onDblClick = this._onDblClick.bind(this);
    }

    /**
     * 返回一个用以指示“双击缩放”交互功能是否激活的布尔值。
     *
     * @returns {boolean} 如果“双击缩放”交互功能已激活，为`true` 。
     */
    isEnabled() {
        return !!this._enabled;
    }

    /**
     * 激活“双击缩放”交互功能。
     *
     * @example
     * map.doubleClickZoom.enable();
     */
    enable() {
        if (this.isEnabled()) return;
        this._map.on('dblclick', this._onDblClick);
        this._enabled = true;
    }

    /**
     * 禁用“双击缩放”交互功能。
     *
     * @example
     * map.doubleClickZoom.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._map.off('dblclick', this._onDblClick);
        this._enabled = false;
    }

    _onDblClick(e) {
        this._map.zoomTo(
            this._map.getZoom() + (e.originalEvent.shiftKey ? -1 : 1),
            {around: e.lngLat},
            e
        );
    }
}

module.exports = DoubleClickZoomHandler;
