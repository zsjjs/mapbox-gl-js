'use strict';

const panStep = 100,
    bearingStep = 15,
    pitchStep = 10;

/**
 * `KeyboardHandler` 允许用户使用以下键盘快捷键
 * 进行缩放、旋转和平移操作：
 *
 * - `=` / `+`: 缩放级别增加 1 级。
 * - `Shift-=` / `Shift-+`: 缩放级别增加 2 级。
 * - `-`: 缩放级别减小 1 级。
 * - `Shift--`: 缩放级别减小 2 级。
 * - Arrow keys: 平移（pan） 100 像素。
 * - `Shift+⇢`: 增加 15 度旋转（rotation）。
 * - `Shift+⇠`: 减少 15 度旋转。
 * - `Shift+⇡`: 增加 10 度倾斜角。
 * - `Shift+⇣`: 减少 10 度倾斜角。
 *
 * @param {Map} map 需要添加处理程序（handler）的 Mapbox GL JS 地图。
 */
class KeyboardHandler {
    constructor(map) {
        this._map = map;
        this._el = map.getCanvasContainer();

        this._onKeyDown = this._onKeyDown.bind(this);
    }

    /**
     * 返回一个指示键盘交互功能是否激活的布尔值。
     *
     * @returns {boolean} 如果键盘交互功能已激活，为`true` 。
     */
    isEnabled() {
        return !!this._enabled;
    }

    /**
     * 激活键盘交互功能。
     *
     * @example
     * map.keyboard.enable();
     */
    enable() {
        if (this.isEnabled()) return;
        this._el.addEventListener('keydown', this._onKeyDown, false);
        this._enabled = true;
    }

    /**
     * 禁用键盘交互功能。
     *
     * @example
     * map.keyboard.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._el.removeEventListener('keydown', this._onKeyDown);
        this._enabled = false;
    }

    _onKeyDown(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;

        let zoomDir = 0;
        let bearingDir = 0;
        let pitchDir = 0;
        let xDir = 0;
        let yDir = 0;

        switch (e.keyCode) {
        case 61:
        case 107:
        case 171:
        case 187:
            zoomDir = 1;
            break;

        case 189:
        case 109:
        case 173:
            zoomDir = -1;
            break;

        case 37:
            if (e.shiftKey) {
                bearingDir = -1;
            } else {
                e.preventDefault();
                xDir = -1;
            }
            break;

        case 39:
            if (e.shiftKey) {
                bearingDir = 1;
            } else {
                e.preventDefault();
                xDir = 1;
            }
            break;

        case 38:
            if (e.shiftKey) {
                pitchDir = 1;
            } else {
                e.preventDefault();
                yDir = -1;
            }
            break;

        case 40:
            if (e.shiftKey) {
                pitchDir = -1;
            } else {
                yDir = 1;
                e.preventDefault();
            }
            break;

        default:
            return;
        }

        const map = this._map;
        const zoom = map.getZoom();

        const easeOptions = {
            duration: 300,
            delayEndEvents: 500,
            easing: easeOut,

            zoom: zoomDir ? Math.round(zoom) + zoomDir * (e.shiftKey ? 2 : 1) : zoom,
            bearing: map.getBearing() + bearingDir * bearingStep,
            pitch: map.getPitch() + pitchDir * pitchStep,
            offset: [-xDir * panStep, -yDir * panStep],
            center: map.getCenter()
        };

        map.easeTo(easeOptions, {originalEvent: e});
    }
}

function easeOut(t) {
    return t * (2 - t);
}

module.exports = KeyboardHandler;
