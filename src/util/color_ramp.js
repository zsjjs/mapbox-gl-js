// @flow

import {RGBAImage} from './image';
import config from './config';
import type {StylePropertyExpression} from '../style-spec/expression/index';

/**
 * Given an expression that should evaluate to a color ramp, return
 * a 256x1 px RGBA image representing that ramp expression.
 *
 * @private
 */
export default function renderColorRamp(expression: StylePropertyExpression, colorRampEvaluationParameter: string): RGBAImage {
    const txSize = config.COLOR_RAMP_SIZE;
    const colorRampData = new Uint8Array(txSize * 4);
    const evaluationGlobals = {};
    for (let i = 0, j = 0; i < txSize; i++, j += 4) {
        evaluationGlobals[colorRampEvaluationParameter] = i / (txSize - 1);
        const pxColor = expression.evaluate((evaluationGlobals: any));
        // the colors are being unpremultiplied because Color uses
        // premultiplied values, and the Texture class expects unpremultiplied ones
        colorRampData[j + 0] = Math.floor(pxColor.r * 255 / pxColor.a);
        colorRampData[j + 1] = Math.floor(pxColor.g * 255 / pxColor.a);
        colorRampData[j + 2] = Math.floor(pxColor.b * 255 / pxColor.a);
        colorRampData[j + 3] = Math.floor(pxColor.a * 255);
    }

    return new RGBAImage({width: txSize, height: 1}, colorRampData);
}
