import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

const ZERO_POINTS = 0;

interface Coin {
    xPos: number;
    yPos: number;
    index: number;
}

const inventory: Coin[] = [];
const pitData: Map<string, Coin[]> = new Map<string, Coin[]>();

export const MERRILL_CLASSROOM = leaflet.latLng({
    lat: 36.9995,
    lng: - 122.0533
});

// const NULL_ISLAND = leaflet.latLng({
//     lat: 0,
//     lng: 0
// });

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4; //0.0001 degrees wide
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

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
        const bounds = leaflet.latLngBounds([
            [MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
            MERRILL_CLASSROOM.lng + j * TILE_DEGREES],
            [MERRILL_CLASSROOM.lat + (i + 1) * TILE_DEGREES,
            MERRILL_CLASSROOM.lng + (j + 1) * TILE_DEGREES],
        ]);

        const pit = leaflet.rectangle(bounds) as leaflet.Layer;
        const coinList: Coin[] = [];
        pitData.set(`${i},${j}`, coinList);

        pit.bindPopup(() => {
            const numOfCoins = Number((luck(`${i},${j}`) * 10).toFixed(0));
            for (let k = 0; k < numOfCoins; k++) {
                coinList.push(
                    {
                        xPos: i,
                        yPos: j,
                        index: k
                    });
            }


            const container = document.createElement("div");
            container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has the following: <span id="value">${coinList.toString()}</span>.</div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>`;

            const poke = container.querySelector<HTMLButtonElement>("#poke")!;
            poke.addEventListener("click", () => {
                inventory.push(coinList.pop()!);
                container.querySelector<HTMLSpanElement>("#value")!.innerHTML = coinList.toString();
                statusPanel.innerHTML = `Coins accumulated: ${inventory.toString()}`;
            });
            const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
            deposit.addEventListener("click", () => {
                if (inventory.length == 0) return;
                coinList.push(inventory.pop()!);
                container.querySelector<HTMLSpanElement>("#value")!.innerHTML = coinList.toString();
                statusPanel.innerHTML = `Coins accumulated: ${inventory.toString()}`;

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