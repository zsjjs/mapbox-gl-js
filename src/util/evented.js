'use strict';

const util = require('./util');

function _addEventListener(type, listener, listenerList) {
    listenerList[type] = listenerList[type] || [];
    listenerList[type].push(listener);
}

function _removeEventListener(type, listener, listenerList) {
    if (listenerList && listenerList[type]) {
        const index = listenerList[type].indexOf(listener);
        if (index !== -1) {
            listenerList[type].splice(index, 1);
        }
    }
}

/**
 * 根据事件功能被混合到其他类的方法。
 *
 * @mixin Evented
 */
class Evented {

    /**
     * 为指定事件类型添加监听器。
     *
     * @param {string} type 添加监听的事件类型。
     * @param {Function} listener 事件触发后（fired）要调用的函数。
     *   通过传递给 `fire` 的数据对象来调用监听功能，
     *   并使用`target` 和 `type` 属性进行扩展。
     * @returns {Object} `this`
     */
    on(type, listener) {
        this._listeners = this._listeners || {};
        _addEventListener(type, listener, this._listeners);

        return this;
    }

    /**
     * 移除先前注册的事件监听器。
     *
     * @param {string} type  需要移除监听器的事件类型。
     * @param {Function} listener 需要移除的监听器函数。
     * @returns {Object} `this`
     */
    off(type, listener) {
        _removeEventListener(type, listener, this._listeners);
        _removeEventListener(type, listener, this._oneTimeListeners);

        return this;
    }

    /**
     * 为指定事件类型添加一个一次性调用的监听器。
     *
     * 注册之后，该监听器会在事件第一次触发的时候被调用。
     *
     * @param {string} type 需要监听的事件类型。
     * @param {Function} listener 事件第一次启动时要调用的函数。
     * @returns {Object} `this`
     */
    once(type, listener) {
        this._oneTimeListeners = this._oneTimeListeners || {};
        _addEventListener(type, listener, this._oneTimeListeners);

        return this;
    }

    /**
     * 触发特定类型的事件。
     *
     * @param {string} type 需要触发的事件类型。
     * @param {Object} [data] 传递给任意监听器的数据。
     * @returns {Object} `this`
     */
    fire(type, data) {
        if (this.listens(type)) {
            data = util.extend({}, data, {type: type, target: this});

            // make sure adding or removing listeners inside other listeners won't cause an infinite loop
            const listeners = this._listeners && this._listeners[type] ? this._listeners[type].slice() : [];

            for (let i = 0; i < listeners.length; i++) {
                listeners[i].call(this, data);
            }

            const oneTimeListeners = this._oneTimeListeners && this._oneTimeListeners[type] ? this._oneTimeListeners[type].slice() : [];

            for (let i = 0; i < oneTimeListeners.length; i++) {
                oneTimeListeners[i].call(this, data);
                _removeEventListener(type, oneTimeListeners[i], this._oneTimeListeners);
            }

            if (this._eventedParent) {
                this._eventedParent.fire(type, util.extend({}, data, typeof this._eventedParentData === 'function' ? this._eventedParentData() : this._eventedParentData));
            }

        // To ensure that no error events are dropped, print them to the
        // console if they have no listeners.
        } else if (util.endsWith(type, 'error')) {
            console.error((data && data.error) || data || 'Empty error event');
        }

        return this;
    }

    /**
     * 当这个 Evented 实例或任何转递（forwarded）的 Evented 实例有特定类型的监听器时，返回一个 true。
     *
     * @param {string} type 事件类型
     * @returns {boolean} 当指定事件类型拥有至少一个注册过的监听器时，为`true` ，否则为`false`。
     */
    listens(type) {
        return (
            (this._listeners && this._listeners[type] && this._listeners[type].length > 0) ||
            (this._oneTimeListeners && this._oneTimeListeners[type] && this._oneTimeListeners[type].length > 0) ||
            (this._eventedParent && this._eventedParent.listens(type))
        );
    }

    /**
     * Bubble all events fired by this instance of Evented to this parent instance of Evented.
     *
     * @private
     * @param {parent}
     * @param {data}
     * @returns {Object} `this`
     */
    setEventedParent(parent, data) {
        this._eventedParent = parent;
        this._eventedParentData = data;

        return this;
    }
}

module.exports = Evented;
