import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet, { LatLng } from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board.ts";
import { Cell } from "./board.ts";
import { Geocoin } from "./geocoin.ts";
import { Geocache } from "./geocoin.ts";

const SHIFT_AMOUNT = 8;
const TILE_DEGREES = 1e-4; //0.0001 degrees wide
const NEIGHBORHOOD_SIZE = 8;
const GAMEPLAY_ZOOM_LEVEL = 19;
const CACHE_SPAWN_PROBABILITY = 0.1;
export const MERRILL_CLASSROOM = leaflet.latLng({
    lat: 36.9995,
    lng: - 122.0533
});

const inventory: Geocoin[] = [];
const localCacheData: leaflet.Rectangle[] = [];

const board: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const geoCacheMemento: Map<Cell, string> = new Map<Cell, string>();
const mapContainer = document.querySelector<HTMLElement>("#map")!;

const worldMapData = leaflet.map(mapContainer, {
    center: MERRILL_CLASSROOM,
    zoom: GAMEPLAY_ZOOM_LEVEL,
    minZoom: GAMEPLAY_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false
});

rigButtons();

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
}).addTo(worldMapData);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(worldMapData);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

spawnLocalCaches();






function cacheFactory(i: number, j: number) {
    const currentCell: Cell = board.getCanonicalCell({ i, j });

    // Does this cache already exist at these coordinates?
    let newCache: Geocache;

    if (geoCacheMemento.has(currentCell)) {
        newCache = new Geocache(currentCell);
        newCache.fromMemento(geoCacheMemento.get(currentCell)!);
        console.log(geoCacheMemento.get(currentCell));
    } else {
        if (currentCell == undefined) return;
        newCache = new Geocache(currentCell);
        geoCacheMemento.set(currentCell, newCache.toMemento());
    }

    const displayedCache = leaflet.rectangle(board.getCellBounds(currentCell));

    bindPopupsToCache(displayedCache, newCache, currentCell);

    displayedCache.addTo(worldMapData);
    localCacheData.push(displayedCache);
}

function spawnLocalCaches() {
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
        for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {

            const posX = playerMarker.getLatLng().lat + (i * TILE_DEGREES);
            const posY = playerMarker.getLatLng().lng + (j * TILE_DEGREES);

            if (luck([posX, posY].toString()) < CACHE_SPAWN_PROBABILITY) {
                cacheFactory(posX, posY);
            }
        }
    }
}

function shiftPlayerLocation(x: number, y: number) {

    const plLat = playerMarker.getLatLng().lat + (x * TILE_DEGREES);
    const plLng = playerMarker.getLatLng().lng + (y * TILE_DEGREES);

    playerMarker.setLatLng(new LatLng(plLat, plLng));
    worldMapData.setView(playerMarker.getLatLng());

    clearLocalCaches();
    spawnLocalCaches();
}

function clearLocalCaches() {
    localCacheData.forEach((pit) => {
        pit.remove();
    });
    localCacheData.length = 0;
}

function onPositionChanged(position: GeolocationPosition) {
    playerMarker.setLatLng(leaflet.latLng(position.coords.latitude, position.coords.longitude));
    worldMapData.setView(playerMarker.getLatLng());
    spawnLocalCaches();
}

function rigCardinalButton(button: HTMLButtonElement, x: number, y: number) {
    button.addEventListener("click", () => {
        shiftPlayerLocation(x, y);
    });
}

function rigButtons() {
    const sensorButton = document.querySelector("#sensor")!;
    sensorButton.addEventListener("click", () => {
        navigator.geolocation.watchPosition(onPositionChanged);
    });

    const northButton: HTMLButtonElement = document.querySelector("#north")!;
    rigCardinalButton(northButton, SHIFT_AMOUNT, 0);
    const southButton: HTMLButtonElement = document.querySelector("#south")!;
    rigCardinalButton(southButton, -SHIFT_AMOUNT, 0);
    const eastButton: HTMLButtonElement = document.querySelector("#east")!;
    rigCardinalButton(eastButton, 0, SHIFT_AMOUNT);
    const westButton: HTMLButtonElement = document.querySelector("#west")!;
    rigCardinalButton(westButton, 0, -SHIFT_AMOUNT);

}

function bindPopupsToCache(displayedCache: leaflet.Rectangle, cache: Geocache, cell: Cell) {
    displayedCache.bindPopup(() => {

        const container = document.createElement("div");
        container.innerHTML = `
            <div>There is a cache here at "${cell.i},${cell.j}".It has the following: <span id="value"> ${cache.toMemento()} </span>.</div>
                <button id="withdraw">withdraw</button>
            <div>There is a cache here at "${cell.i},${cell.j}".It has the following: <span id="value"> ${cache.toMemento()} </span>.</div>
                <button id="withdraw">withdraw</button>
                <button id="deposit">deposit</button>`;

        const withdraw = container.querySelector<HTMLButtonElement>("#withdraw")!;
        withdraw.addEventListener("click", () => {
            onCacheWithdraw(cache, cell, container);
        });
        const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
        deposit.addEventListener("click", () => {
            onCacheDeposit(cache, cell, container);
        });

        return container;
    });
}

function onCacheWithdraw(cache: Geocache, cell: Cell, container: HTMLDivElement) {
    if (cache.coins.length == 0) return;
    inventory.push(cache.coins.pop()!);
    container.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache.toMemento();
    geoCacheMemento.set(cell, cache.toMemento());
    geoCacheMemento.set(cell, cache.toMemento());
    statusPanel.innerHTML = `Coins accumulated: ${inventory.length}`;
}

function onCacheDeposit(cache: Geocache, cell: Cell, container: HTMLDivElement) {
    if (inventory.length == 0) return;
    cache.coins.push(inventory.pop()!);
    container.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache.toMemento();
    geoCacheMemento.set(cell, cache.toMemento());
    geoCacheMemento.set(cell, cache.toMemento());
    statusPanel.innerHTML = `Coins accumulated: ${inventory.length}`;
}