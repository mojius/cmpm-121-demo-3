import leaflet from "leaflet";
import { MERRILL_CLASSROOM } from "./main";

export interface Cell {
    readonly i: number;
    readonly j: number;
}

const TILE_DEGREES = 1e-4; //0.0001 degrees wide


export class Board {

    readonly tileWidth: number;
    readonly tileVisibilityRadius: number;

    private readonly knownCells: Map<string, Cell>;

    constructor(tileWidth: number, tileVisibilityRadius: number) {
        this.tileWidth = tileWidth;
        this.tileVisibilityRadius = tileVisibilityRadius;
        this.knownCells = new Map<string, Cell>;
    }

    private getCanonicalCell(cell: Cell): Cell {
        const { i, j } = cell;
        const key = [i, j].toString();

        if (this.knownCells.has(key))
            return this.knownCells.get(key)!;
        else
            return this.createCanonicalCell(i, j);
    }

    createCanonicalCell(i: number, j: number): Cell {
        const cell: Cell = { i: i, j: j };
        this.knownCells.set(`${i},${j}`, cell);
        return cell;

    }

    getCellForPoint(point: leaflet.LatLng): Cell {
        return this.getCanonicalCell({
            i: Math.floor(point.lat / this.tileWidth),
            j: Math.floor(point.lng / this.tileWidth),
        });
    }

    getCellBounds(cell: Cell): leaflet.LatLngBounds {
        const bounds = leaflet.latLngBounds([
            [MERRILL_CLASSROOM.lat + cell.i * TILE_DEGREES,
            MERRILL_CLASSROOM.lng + cell.j * TILE_DEGREES],
            [MERRILL_CLASSROOM.lat + (cell.i + 1) * TILE_DEGREES,
            MERRILL_CLASSROOM.lng + (cell.j + 1) * TILE_DEGREES],
        ]);
        return bounds;
    }

    getCellsNearPoint(point: leaflet.LatLng): Cell[] {
        const resultCells: Cell[] = [];
        const originCell = this.getCellForPoint(point);
        // Search over cell-sized areas?
        for (let i = -this.tileVisibilityRadius; i < this.tileVisibilityRadius; i++) {
            for (let j = -this.tileVisibilityRadius; j < this.tileVisibilityRadius; j++) {
                const cellInRadius: Cell = { i: originCell.i + i, j: originCell.j + j };
                this.getCanonicalCell(cellInRadius);
            }
        }
        return resultCells;
    }
}

