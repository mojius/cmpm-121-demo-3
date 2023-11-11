import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board.ts";
import { Cell } from "./board.ts";

interface Coin {
    cell: Cell;
    index: number;
}

interface CoinList {
    inventory: Coin[];
}

function displayCoins(coinList: CoinList): string {
    let coinListString = "";
    coinList.inventory.forEach((coin, index) => {
        coinListString += `[${coin.cell.i},${coin.cell.j}]: index ${coin.index}`;
        if (index !== coinList.inventory.length - 1)
            coinListString += `, `;
    });

    return coinListString;
}

export const MERRILL_CLASSROOM = leaflet.latLng({
    lat: 36.9995,
    lng: - 122.0533
});

const masterCoinList: CoinList =
{
    inventory: [],
};
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4; //0.0001 degrees wide
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const board: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const pitData: Map<Cell, Coin[]> = new Map<Cell, Coin[]>();

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const worldMapData = leaflet.map(mapContainer, {
    center: MERRILL_CLASSROOM,
    zoom: GAMEPLAY_ZOOM_LEVEL,
    minZoom: GAMEPLAY_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false
});

const pitMap: Map<string, leaflet.Layer> = new Map<string, leaflet.Layer>();

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
}).addTo(worldMapData);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(worldMapData);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
    navigator.geolocation.watchPosition((position) => {
        playerMarker.setLatLng(leaflet.latLng(position.coords.latitude, position.coords.longitude));
        worldMapData.setView(playerMarker.getLatLng());
    });
});

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function pitFactory(i: number, j: number) {
    // Does this pit already exist at these coordinates?
    if (pitMap.get(`${i},${j}`)) {
        return pitMap.get(`${i}, ${j}`);
    } else {
        const currentCell: Cell = board.createCanonicalCell(i, j);
        if (currentCell == undefined) return;

        const pit = leaflet.rectangle(board.getCellBounds(currentCell));
        const coinList: CoinList =
        {
            inventory: []
        };

        pitData.set(currentCell, coinList.inventory);

        pit.bindPopup(() => {
            const numOfCoins = 5;
            for (let k = 0; k < numOfCoins; k++) {
                coinList.inventory.push(
                    {
                        cell: currentCell,
                        index: k
                    });
            }


            const container = document.createElement("div");
            container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has the following: <span id="value">${displayCoins(coinList)}</span>.</div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>`;

            const poke = container.querySelector<HTMLButtonElement>("#poke")!;
            poke.addEventListener("click", () => {
                masterCoinList.inventory.push(coinList.inventory.pop()!);
                container.querySelector<HTMLSpanElement>("#value")!.innerHTML = displayCoins(coinList);
                statusPanel.innerHTML = `Coins accumulated: ${displayCoins(masterCoinList)}`;
            });
            const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
            deposit.addEventListener("click", () => {
                if (masterCoinList.inventory.length == 0) return;
                coinList.inventory.push(masterCoinList.inventory.pop()!);
                container.querySelector<HTMLSpanElement>("#value")!.innerHTML = displayCoins(coinList);
                statusPanel.innerHTML = `Coins accumulated: ${displayCoins(masterCoinList)}`;

            });

            return container;
        });

        pitMap.set(`${i}, ${j}`, pit);

        pit.addTo(worldMapData);
    }
}


for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = - NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
            pitFactory(i, j);
        }
    }
}