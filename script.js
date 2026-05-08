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

  // AJUSTE: Escuchar cuando cambian la ciudad para mover el mapa automáticamente
  document.getElementById('ciudad').addEventListener('change', function() {
    const ciudadDestino = this.value;
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: ciudadDestino + ", Valle del Cauca, Colombia" }, (results, status) => {
      if (status === "OK") {
        map.setCenter(results[0].geometry.location);
        map.setZoom(15);
      }
    });
  });

  activarRastreoGPS();
}

function activarRastreoGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      const miPos = { 
        lat: position.coords.latitude, 
        lng: position.coords.longitude 
      };
      
      if (!marcadorUsuario) {
        map.setCenter(miPos); 
        marcadorUsuario = new google.maps.Marker({
          position: miPos,
          map: map,
          title: "Mi ubicación",
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
        if (position.coords.heading !== null) {
            const icon = marcadorUsuario.getIcon();
            icon.rotation = position.coords.heading;
            marcadorUsuario.setIcon(icon);
        }
      }
    }, (error) => {
        console.warn("Error de GPS: ", error.message);
    }, { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0 
    });
  } else {
    alert("Tu navegador no soporta geolocalización.");
  }
}

function centrarEnUsuario() {
  if (marcadorUsuario) {
    map.setCenter(marcadorUsuario.getPosition());
    map.setZoom(17);
  }
}

function calcularRuta() {
  // AJUSTE: Usar el ID correcto del textarea según tu código
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
  const departamento = "Valle del Cauca"; 

  // Función de blindaje para asegurar que busque en la ciudad y barrio correcto
  const blindar = (d) => `${d}, ${ciudad}, ${departamento}, ${pais}`;

  const origen = salida ? blindar(salida) : marcadorUsuario.getPosition();
  
  // Usamos el mismo punto de origen como destino para que la ruta sea circular (volver al local)
  const destino = origen; 

  const waypoints = direccionesPendientes.map(dir => ({
    location: blindar(dir),
    stopover: true
  }));

  directionsService.route({
    origin: origen,
    destination: destino,
    waypoints: waypoints,
    optimizeWaypoints: true, // ORDEN CONSECUTIVO Y MÁS RÁPIDO
    travelMode: google.maps.TravelMode.DRIVING
  }, (response, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(response);
      
      // AJUSTE: Calcular y mostrar tiempo y distancia total
      mostrarResumen(response);
    } else {
      alert("No pudimos trazar la ruta: " + status);
    }
  });
}

function mostrarResumen(response) {
    const ruta = response.routes[0];
    let tiempoSegundos = 0;
    let distanciaMetros = 0;

    ruta.legs.forEach(tramo => {
        tiempoSegundos += tramo.duration.value;
        distanciaMetros += tramo.distance.value;
    });

    const minutos = Math.round(tiempoSegundos / 60);
    const kilometros = (distanciaMetros / 1000).toFixed(1);

    // Buscamos un lugar donde poner la info, si no existe el panel de indicaciones lo usamos
    const panelIndicaciones = document.getElementById("indicaciones-geometria");
    const resumenHTML = `
        <div style="background: #28a745; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center; font-family: sans-serif;">
            <p style="margin: 0;">⏱️ Tiempo estimado: <b>${minutos} min</b></p>
            <p style="margin: 0;">🛣️ Distancia total: <b>${kilometros} km</b></p>
        </div>
    `;
    panelIndicaciones.innerHTML = resumenHTML + panelIndicaciones.innerHTML;
}

function renderizarLista() {
  const listaUL = document.getElementById("lista-pedidos");
  listaUL.innerHTML = "";

  direccionesPendientes.forEach((dir, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><b>${index + 1}.</b> ${dir}</span>
      <button class="btn-check" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" onclick="marcarEntregado(${index})">✔ Entregado</button>
    `;
    listaUL.appendChild(li);
  });
}

function marcarEntregado(index) {
  direccionesPendientes.splice(index, 1);
  renderizarLista();
  trazarRutaActual();
}