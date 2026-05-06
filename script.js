let map;
let directionsService;
let directionsRenderer;
let marcadorUsuario;
let autocomplete;
let direccionesPendientes = [];

function initMap() {
  const centroInicial = { lat: 4.4147, lng: -76.1558 }; // Roldanillo

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: centroInicial,
    mapTypeControl: false,
    streetViewControl: false
  });

  // Configurar Autocompletado para el Punto de Salida
  const inputSalida = document.getElementById('autocomplete-salida');
  autocomplete = new google.maps.places.Autocomplete(inputSalida);
  autocomplete.bindTo('bounds', map);

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    panel: document.getElementById("indicaciones-geometria"),
    suppressMarkers: false
  });

  activarRastreoGPS();
}

function activarRastreoGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      const miPos = { lat: position.coords.latitude, lng: position.coords.longitude };
      
      if (!marcadorUsuario) {
        marcadorUsuario = new google.maps.Marker({
          position: miPos,
          map: map,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
            rotation: position.coords.heading || 0
          }
        });
      } else {
        marcadorUsuario.setPosition(miPos);
      }
    }, null, { enableHighAccuracy: true });
  }
}

function centrarEnUsuario() {
  if (marcadorUsuario) map.setCenter(marcadorUsuario.getPosition());
}

function calcularRuta() {
  const textoDirecciones = document.getElementById("direcciones").value;
  direccionesPendientes = textoDirecciones.split("\n").map(l => l.trim()).filter(l => l !== "");

  if (direccionesPendientes.length < 1) {
    alert("Por favor, ingresa al menos una dirección de cliente.");
    return;
  }

  renderizarLista();
  trazarRutaActual();
}

function trazarRutaActual() {
  if (direccionesPendientes.length === 0) {
    directionsRenderer.setDirections({routes: []});
    return;
  }

  const ciudad = document.getElementById("ciudad").value;
  const pais = document.getElementById("pais").value;
  const salida = document.getElementById("autocomplete-salida").value;
  const departamento = "Valle del Cauca"; // Blindaje regional

  const blindar = (d) => `${d}, ${ciudad}, ${departamento}, ${pais}`;

  const origen = blindar(salida);
  const destino = blindar(direccionesPendientes[direccionesPendientes.length - 1]);
  const waypoints = direccionesPendientes.slice(0, -1).map(dir => ({
    location: blindar(dir),
    stopover: true
  }));

  directionsService.route({
    origin: origen,
    destination: destino,
    waypoints: waypoints,
    optimizeWaypoints: true,
    travelMode: google.maps.TravelMode.DRIVING
  }, (response, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(response);
    } else {
      alert("No pudimos trazar la ruta: " + status);
    }
  });
}

function renderizarLista() {
  const listaUL = document.getElementById("lista-pedidos");
  listaUL.innerHTML = "";

  direccionesPendientes.forEach((dir, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><b>${index + 1}.</b> ${dir}</span>
      <button class="btn-check" onclick="marcarEntregado(${index})">✔ Entregado</button>
    `;
    listaUL.appendChild(li);
  });
}

function marcarEntregado(index) {
  direccionesPendientes.splice(index, 1);
  renderizarLista();
  trazarRutaActual();
}