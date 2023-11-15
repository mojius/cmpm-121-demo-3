import { Cell } from "./board.ts";
import luck from "./luck";

export interface Geocoin {
    mintingLocation: Cell;
    serialNumber: number;
}

export interface Memento<T> {
    toMemento(): T;
    fromMemento(memento: T): void;
}

export class Geocache implements Memento<string> {
    coins: Geocoin[];
    description: string;

    constructor(cell: Cell) {
        const A = ["gwingy", "observable", "tenuous", "flat-footed", "terrible", "off-brand", "garlupious"];
        const B = ["zone", "spot", "hangout", "cul-de-sac", "twizzler depot", "ten-pennierre", "kava bar", "flat"];

        const selectedA = `The ${A[Math.floor(luck(["descA", cell.i, cell.j].toString()) * A.length)]}`;
        const selectedB = B[Math.floor(luck(["descB", cell.i, cell.j].toString()) * B.length)];
        this.description = `${selectedA} ${selectedB}`;

        const numInitialCoins = Math.floor(luck(["intialCoins", cell.i, cell.j].toString()) * 3);
        this.coins = [];
        for (let i = 0; i < numInitialCoins; i++) {
            this.coins.push({ mintingLocation: cell, serialNumber: i });
        }
    }
    toMemento(): string {
        const stringified = JSON.stringify(this.coins);
        return stringified;
    }

    fromMemento(memento: string) {
        this.coins = JSON.parse(memento) as Geocoin[];
    }
}