// @flow

import {warnOnce, clamp} from '../util/util';
import MercatorCoordinate from '../geo/mercator_coordinate';

import EXTENT from './extent';
import Transform from '../geo/transform';
import assert from 'assert';

import type Point from '@mapbox/point-geometry';

// These bounds define the minimum and maximum supported coordinate values.
// While visible coordinates are within [0, EXTENT], tiles may theoretically
// contain cordinates within [-Infinity, Infinity]. Our range is limited by the
// number of bits used to represent the coordinate.
function createBounds(bits) {
    return {
        min: -1 * Math.pow(2, bits - 1),
        max: Math.pow(2, bits - 1) - 1
    };
}

const bounds = createBounds(15);

const projection = (new Transform()).projection;

function resample(ring) {
    if (ring.length === 0) return;
    const result = [];
    result.push(ring[0]);
    for (let i = 1; i < ring.length; i++) {
        const last = result[result.length - 1];
        const p = ring[i];
        const d = p.dist(last);
        const m = 160;
        for (let i = m; i < d; i += m) {
            result.push(last.add(p.sub(last).mult(i / d)));
        }
        result.push(p);
    }
    return result;
}

/**
 * Loads a geometry from a VectorTileFeature and scales it to the common extent
 * used internally.
 * @param {VectorTileFeature} feature
 * @private
 */
export default function loadGeometry(feature: VectorTileFeature, canonical): Array<Array<Point>> {
    if (!canonical) return [];
    assert(canonical);
    const cs = projection.tileTransform(canonical);
    const reproject = (p, featureExtent) => {
        const s = Math.pow(2, canonical.z)
        const x = (canonical.x + p.x / featureExtent) / s;
        const y = (canonical.y + p.y / featureExtent) / s;
        const l = new MercatorCoordinate(x, y).toLngLat();
        const x_ = projection.projectX(l.lng, l.lat);
        const y_ = projection.projectY(l.lng, l.lat);
        p.x = (x_ * cs.scale - cs.x) * EXTENT;
        p.y = (y_ * cs.scale - cs.y) * EXTENT;
    };
    const scale = EXTENT / EXTENT;
    const geometry = feature.loadGeometry();
    for (let r = 0; r < geometry.length; r++) {
        let ring = geometry[r];

        ring = resample(ring);

        geometry[r] = ring;

        for (let p = 0; p < ring.length; p++) {
            let point = ring[p];
            // round here because mapbox-gl-native uses integers to represent
            // points and we need to do the same to avoid renering differences.
            //point.x = Math.round(point.x * scale, feature.extent);
            //point.y = Math.round(point.y * scale, feature.extent);
            reproject(point, feature.extent);

            if (point.x < bounds.min || point.x > bounds.max || point.y < bounds.min || point.y > bounds.max) {
                warnOnce('Geometry exceeds allowed extent, reduce your vector tile buffer size');
                point.x = clamp(point.x, bounds.min, bounds.max);
                point.y = clamp(point.y, bounds.min, bounds.max);
            }
        }
    }
    return geometry;
}
