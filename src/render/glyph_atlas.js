// @flow

import {AlphaImage} from '../util/image';
import {register} from '../util/web_worker_transfer';
import potpack from 'potpack';

import type {GlyphMetrics, StyleGlyph} from '../style/style_glyph';

const padding = 1;

type Rect = {
    x: number,
    y: number,
    w: number,
    h: number
};

export type GlyphPosition = {
    rect: Rect,
    metrics: GlyphMetrics
};

export type GlyphPositionData = {
    glyphPositionMap: { [number]: GlyphPosition },
    ascender: number,
    descender: number
};

export type GlyphPositions = { [string]: GlyphPositionData };

export default class GlyphAtlas {
    image: AlphaImage;
    positions: GlyphPositions;

    constructor(stacks: {[string]: {glyphs: {[number]: ?StyleGlyph}, ascender: number, descender: number}}) {
        const positions = {};
        const bins = [];

        for (const stack in stacks) {
            const glyphData = stacks[stack];
            const stackPositions = positions[stack] = {};
            stackPositions.glyphPositionMap = {};
            stackPositions.ascender = glyphData.ascender;
            stackPositions.descender = glyphData.descender;

            for (const id in glyphData.glyphs) {
                const src = glyphData.glyphs[+id];
                if (!src || src.bitmap.width === 0 || src.bitmap.height === 0) continue;

                const bin = {
                    x: 0,
                    y: 0,
                    w: src.bitmap.width + 2 * padding,
                    h: src.bitmap.height + 2 * padding
                };
                bins.push(bin);
                stackPositions.glyphPositionMap[id] = {rect: bin, metrics: src.metrics};
            }
        }

        const {w, h} = potpack(bins);
        const image = new AlphaImage({width: w || 1, height: h || 1});

        for (const stack in stacks) {
            const glyphData = stacks[stack];

            for (const id in glyphData.glyphs) {
                const src = glyphData.glyphs[+id];
                if (!src || src.bitmap.width === 0 || src.bitmap.height === 0) continue;
                const bin = positions[stack].glyphPositionMap[id].rect;
                AlphaImage.copy(src.bitmap, image, {x: 0, y: 0}, {x: bin.x + padding, y: bin.y + padding}, src.bitmap);
            }
        }

        this.image = image;
        this.positions = positions;
    }
}

register('GlyphAtlas', GlyphAtlas);
