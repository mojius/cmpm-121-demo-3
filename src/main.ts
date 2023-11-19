import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet, { LatLng, polyline } from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board.ts";
import { Cell } from "./board.ts";
import { Geocoin } from "./geocoin.ts";
import { Geocache } from "./geocoin.ts";

const SHIFT_AMOUNT = 8;
const TILE_DEGREES = 1e-4; //0.0001 degrees wide
const NEIGHBORHOOD_SIZE = 8;
const GAMEPLAY_MIN_ZOOM_LEVEL = 19;
const GAMEPLAY_MAX_ZOOM_LEVEL = 0.02;
const CACHE_SPAWN_PROBABILITY = 0.1;
export const MERRILL_CLASSROOM = leaflet.latLng({
    lat: 36.9995,
    lng: - 122.0533
});

const localCacheData: leaflet.Rectangle[] = [];

let geoCacheMemento: Map<string, string> = new Map<string, string>();
let inventory: Geocoin[] = [];
let playerPosHistory: leaflet.LatLng[] = [];

// eslint-disable-next-line no-unused-vars
let pl: leaflet.Polyline;

const board: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const mapContainer = document.querySelector<HTMLElement>("#map")!;

const worldMapData = leaflet.map(mapContainer, {
    center: MERRILL_CLASSROOM,
    zoom: GAMEPLAY_MIN_ZOOM_LEVEL,
    minZoom: GAMEPLAY_MIN_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_MAX_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false
});

rigButtons();

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
}).addTo(worldMapData);


interface SaveData {
    inventoryData: Geocoin[];
    geocacheData: [string, string][];
    playerLocationData: leaflet.LatLng;
    playerLocationHistory: leaflet.LatLng[];
}

const defaultSaveData: SaveData =
{
    inventoryData: [],
    geocacheData: [],
    playerLocationData: MERRILL_CLASSROOM,
    playerLocationHistory: [],
};

let loadedData: SaveData = defaultSaveData;

function saveToLocal() {
    const dataToSave: SaveData = {
        inventoryData: inventory,
        geocacheData: Array.from(geoCacheMemento),
        playerLocationData: playerMarker.getLatLng(),
        playerLocationHistory: playerPosHistory
    };
    localStorage.setItem("playerData", JSON.stringify(dataToSave));
}

function loadFromLocal() {
    const savedData = localStorage.getItem("playerData");

    if (savedData) {
        loadedData = JSON.parse(savedData) as SaveData;
        assignLoadedToValues();
    } else {
        loadedData = defaultSaveData;
    }

}

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(worldMapData);

loadFromLocal();

worldMapData.setView(playerMarker.getLatLng());

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = `Coins accumulated: ${inventory.length}`;

spawnLocalCaches();

updatePolyline(playerMarker.getLatLng());


function cacheFactory(i: number, j: number) {
    const currentCell: Cell = board.getCanonicalCell({ i, j });

    // Does this cache already exist at these coordinates?
    let newCache: Geocache;
    const currentCellString = `${currentCell.i},${currentCell.j}`;

    if (geoCacheMemento.has(currentCellString)) {
        console.log(`Found currently existing cell.`);
        newCache = new Geocache(currentCell);
        newCache.fromMemento(geoCacheMemento.get(currentCellString)!);
    } else {
        if (currentCell == undefined) return;
        newCache = new Geocache(currentCell);
        geoCacheMemento.set(currentCellString, newCache.toMemento());
        console.log(`Making new cell.`);
    }

    const displayedCache = leaflet.rectangle(board.getCellBounds(currentCell));

    bindPopupsToCache(displayedCache, newCache, currentCellString);

    displayedCache.addTo(worldMapData);
    localCacheData.push(displayedCache);
}

function spawnLocalCaches() {
    clearLocalCaches();

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
    const plLatLng = new LatLng(plLat, plLng);

    playerMarker.setLatLng(plLatLng);
    worldMapData.setView(playerMarker.getLatLng());

    updatePolyline(plLatLng);
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
    updatePolyline(leaflet.latLng(position.coords.latitude, position.coords.longitude));
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

    const trashButton = document.querySelector("#reset")!;
    trashButton.addEventListener("click", () => {
        wipeData();
    });

    // const eyeButton = document.querySelector("#eye")!;
    // eyeButton.addEventListener("click", () => {
    //     worldMapData.fitBounds(polyLine.getBounds())
    // });

    const northButton: HTMLButtonElement = document.querySelector("#north")!;
    rigCardinalButton(northButton, SHIFT_AMOUNT, 0);
    const southButton: HTMLButtonElement = document.querySelector("#south")!;
    rigCardinalButton(southButton, -SHIFT_AMOUNT, 0);
    const eastButton: HTMLButtonElement = document.querySelector("#east")!;
    rigCardinalButton(eastButton, 0, SHIFT_AMOUNT);
    const westButton: HTMLButtonElement = document.querySelector("#west")!;
    rigCardinalButton(westButton, 0, -SHIFT_AMOUNT);

}

function bindPopupsToCache(displayedCache: leaflet.Rectangle, cache: Geocache, cell: string) {
    displayedCache.bindPopup(() => {

        const container = document.createElement("div");
        container.innerHTML = `
            <div>There is a cache here at "${cell}".It has the following: <span id="value"> ${cache.toMemento()} </span>.</div>
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

function onCacheWithdraw(cache: Geocache, cell: string, container: HTMLDivElement) {
    if (cache.coins.length == 0) return;
    inventory.push(cache.coins.pop()!);
    container.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache.toMemento();
    geoCacheMemento.set(cell, cache.toMemento());
    statusPanel.innerHTML = `Coins accumulated: ${inventory.length}`;
}

function onCacheDeposit(cache: Geocache, cell: string, container: HTMLDivElement) {
    if (inventory.length == 0) return;
    cache.coins.push(inventory.pop()!);
    container.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache.toMemento();
    geoCacheMemento.set(cell, cache.toMemento());
    statusPanel.innerHTML = `Coins accumulated: ${inventory.length}`;
}

function updatePolyline(latLng: leaflet.LatLng) {
    playerPosHistory.push(latLng);
    pl = polyline(playerPosHistory, { color: "red" }).addTo(worldMapData);
    console.log(pl);
}

function wipeData() {
    const finalPrompt = prompt(`Are you sure you want to clear all of your data: This cannot be undone.
    Type "yes" to continue.`);
    if (finalPrompt == "yes") {
        localStorage.clear();
        inventory.length = 0;
        clearLocalCaches();
        playerPosHistory.length = 0;
        geoCacheMemento.clear();
        playerMarker.setLatLng(MERRILL_CLASSROOM);

        location.reload();
    }

}

function assignLoadedToValues() {
    inventory = loadedData.inventoryData;
    geoCacheMemento = new Map(loadedData.geocacheData);
    playerMarker.setLatLng(loadedData.playerLocationData);
    playerPosHistory = loadedData.playerLocationHistory;
    console.log(geoCacheMemento);
}

addEventListener("visibilitychange", () => {
    saveToLocal();
});