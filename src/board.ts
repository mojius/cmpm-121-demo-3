//
// Board is all about cells.
//

import leaflet from "leaflet";

export interface Cell {
    readonly i: number;
    readonly j: number;
}

export class Board {

    readonly tileWidth: number;
    readonly tileVisibilityRadius: number;

    private readonly knownCells: Map<string, Cell>;

    constructor(tileWidth: number, tileVisibilityRadius: number) {
        this.tileWidth = tileWidth;
        this.tileVisibilityRadius = tileVisibilityRadius;
        this.knownCells = new Map<string, Cell>;
    }

    getCanonicalCell(cell: Cell): Cell {
        const { i, j } = cell;
        const key = `${i},${j}`;

        if (this.knownCells.has(key)) {
            return this.knownCells.get(key)!;
        } else {
            return this.createCanonicalCell(i, j);
        }
    }

    private createCanonicalCell(i: number, j: number): Cell {
        const cell: Cell = { i: i, j: j };
        this.knownCells.set(`${i},${j}`, cell);
        return cell;

    }

    getCellForPoint(point: leaflet.LatLng): Cell {
        return this.getCanonicalCell({
            i: point.lat,
            j: point.lng
        });
    }

    // Pass in current player's position
    getCellBounds(cell: Cell): leaflet.LatLngBounds {
        const bounds = leaflet.latLngBounds([
            [cell.i, cell.j],
            [cell.i + (this.tileWidth),
            cell.j + (this.tileWidth)],
        ]);
        return bounds;
    }

    getCellsNearPoint(point: leaflet.LatLng): Cell[] {
        const resultCells: Cell[] = [];
        const originCell = this.getCellForPoint(point);
        // Search over cell-sized areas?
        for (let i = -this.tileVisibilityRadius; i < this.tileVisibilityRadius; i++) {
            for (let j = -this.tileVisibilityRadius; j < this.tileVisibilityRadius; j++) {
                const cellInRadius: Cell = { i: originCell.i + (i * this.tileWidth), j: originCell.j + (j * this.tileWidth) };
                this.getCanonicalCell(cellInRadius);
            }
        }
        return resultCells;
    }
}

