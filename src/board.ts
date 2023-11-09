import leaflet from "leaflet";

interface Cell {
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
        // ...
        return this.knownCells.get(key)!;
    }

    getCellForPoint(point: leaflet.LatLng): Cell {
        return this.getCanonicalCell({
            i: point.lat,
            j: point.lng
        });
    }

    getCellBounds(cell: Cell): leaflet.LatLngBounds {
        // use Merrill.
    }

    getCellsNearPoint(point: leaflet.LatLng): Cell[] {
        const resultCells: Cell[] = [];
        const originCell = this.getCellForPoint(point);
        // Search over cell-sized areas?
        return resultCells;
    }
}

