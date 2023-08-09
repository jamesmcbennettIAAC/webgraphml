// Initialize the map
const map = L.map('map').setView([41.3973, 2.1925], 18); //coordinates of Barcelona

// Add the tile layer with a different color scheme
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 24
}).addTo(map);

// Enable drawing
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    draw: {polyline: false, polygon: false, rectangle: false, marker: false, circle: false, circlemarker: false},
    polyline: {shapeOptions: {color: 'coral'}, icon: new L.DivIcon({className: 'custom-marker-icon', html: '<div class="custom-marker"></div>',})},
    polygon: {shapeOptions: {color: 'coral', fillColor: 'coral', fillOpacity: .2}, icon: new L.DivIcon({className: 'custom-marker-icon', html: '<div class="custom-marker"></div>',})},
    edit: {featureGroup: drawnItems}
});
map.addControl(drawControl);


// Event handler for polyline/polygon creation
map.on('draw:created', function(event) {
    // Remove previously drawn items
    drawnItems.clearLayers();
  
    var layer = event.layer;
    drawnItems.addLayer(layer);
  
    var coordinates = [];
  
    if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
      if (layer instanceof L.Polygon) {

        // Set the type property to 'Courtyard'
        layer.type = 'Courtyard Building';

        // Get all rings of the polygon
        var rings = layer.getLatLngs();
  
        // Loop through all rings and extract their coordinates
        for (var i = 0; i < rings.length; i++) {
          coordinates = coordinates.concat(rings[i].map(function(latlng) {
            return [latlng.lat, latlng.lng];
          }));
        }
      } else {

        // Set the type property to 'Linear'
        layer.type = 'Linear Building';

        coordinates = layer.getLatLngs().map(function(latlng) {
          return [latlng.lat, latlng.lng];
        });
      }
  
      displayCoordinates(coordinates, layer.type);
    }
  });
  
  map.on('draw:drawstop', function(event) {
    // Finish drawing the polygon when the user completes it
    var layer = event.layer;
    if (layer instanceof L.Polygon) {
      layer._finishShape();
    }
  });
  



// Display coordinates function
function displayCoordinates(coordinates, type) {
    var coordinatesContainer = document.getElementById('coordinates');
    coordinatesContainer.innerHTML = ''; // Clear previous coordinates
  
    if (coordinates.length) {
      var coordinatesTitle = document.createElement('h5');
      coordinatesTitle.textContent = 'Coordinates ' + type;
      coordinatesContainer.appendChild(coordinatesTitle);
  
      var coordinatesList = document.createElement('ul');
  
      coordinates.forEach(function(coord) {
        var listItem = document.createElement('li');
        listItem.textContent = coord[0].toFixed(6) + ', ' + coord[1].toFixed(6);
        coordinatesList.appendChild(listItem);
      });
  
      coordinatesContainer.appendChild(coordinatesList);
    }
  }



// Search button event listener
document.getElementById('search-btn').addEventListener('click', function () {
    var searchQuery = document.getElementById('search-bar').value;
    if (searchQuery !== '') {
    searchLocation(searchQuery);
    }
});

// Search location using Nominatim API
function searchLocation(query) {
    fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + query)
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (data.length > 0) {
        var lat = data[0].lat;
        var lon = data[0].lon;
        map.setView([lat, lon], 18);
        } else {
        alert('Location not found');
        }
    })
    .catch(function (error) {
        //console.log(error);
    });
}





// Buttons below Leaflet Map
// Button1 (Draw Polyline)
document.getElementById('btn1').addEventListener('click', function () {
    const drawHandler = new L.Draw.Polyline(map, drawControl.options.polyline).enable();
    //drawHandler.disable();
});

// Button2 (Draw Polygon)
document.getElementById('btn2').addEventListener('click', function () {
    const drawHandler = new L.Draw.Polygon(map, drawControl.options.polygon).enable();
    //drawHandler.disable();
});

// Button3 (Clear Map)
document.getElementById('btn3').addEventListener('click', function() {
    drawnItems.clearLayers();
    document.getElementById('coordinates').innerHTML = ''; // Clear displayed coordinates
});


// Up down arrows on num input
const floorsInput = document.getElementById("floorsInput");

function increment() {
  floorsInput.value = parseInt(floorsInput.value, 10) + 1;
}

function decrement() {
  if (floorsInput.value > 1) {
    floorsInput.value = parseInt(floorsInput.value, 10) - 1;
  }
}


// Corridor Single or Double
// JavaScript to toggle the switch
var toggleCorridor = document.getElementById('toggleCorridor');
var toggleLabels = document.querySelectorAll('.toggle-label');

document.addEventListener('DOMContentLoaded', function() {
    // Attach the event listener for the toggleCorridor checkbox
    toggleCorridor.addEventListener('click', function() {
        // Toggle the labels' background colors
        toggleLabels.forEach(function(label) {
            label.classList.toggle('active');
        });
    });

    // Attach the event listener for the btnSend button
    document.getElementById('btnSend').addEventListener('click', function () {
        // Rest of the code remains the same...
    });
});


// Define dataObject in a scope accessible to both event handlers
var dataObject;



// Create a Javascript Object combining all browser inputs
// Event handler for btnSend button click
document.getElementById('btnSend').addEventListener('click', function () {
    var coordinates = [];
    var geometryType;
    var typology;
    var floorsInput;

    // Get the drawn layer, if available
    var layers = drawnItems.getLayers();
    if (layers.length > 0) {
        var layer = layers[0]; // Assuming only one layer is drawn

        // Get the coordinates and geometry type of the drawn layer
        if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
            if (layer instanceof L.Polygon) {
                geometryType = 'Polygon';
                typology = 'courtyard';
                var rings = layer.getLatLngs();
                for (var i = 0; i < rings.length; i++) {
                    coordinates.push(rings[i].map(function (latlng) {
                        return [latlng.lng, latlng.lat];
                    }));
                }
            } else {
                geometryType = 'LineString';
                typology = 'linear';
                coordinates = layer.getLatLngs().map(function (latlng) {
                    return [latlng.lng, latlng.lat];
                });
            }
        } else {
            alert('Please draw a polyline or polygon before sending data.');
            return;
        }
    } else {
        alert('Please draw a polyline or polygon before sending data.');
        return;
    }

    // Get the floorsInput value and the toggleCorridor checkbox state
    var floorsInput = parseInt(document.getElementById('floorsInput').value);
    var toggleCorridor = document.getElementById('toggleCorridor').checked;

    // Create the JavaScript object with the collected data
    var dataObject = {
        type: "feature",
        geometry: {
            type: geometryType,
            coordinates: coordinates
        },
        properties: {
            corridorType: toggleCorridor ? "double loaded" : "single loaded",
            typology: typology,
            floorsInput: floorsInput
        }
    };

    // Do something with the dataObject (e.g., send it to the server)
    console.log(dataObject);



    // DownloadJSON of dataObject
    // Convert the dataObject to JSON format
    var jsonContent = JSON.stringify(dataObject, null, 2); // The '2' argument is for indentation

    // Create a Blob with the JSON content
    var blob = new Blob([jsonContent], { type: 'application/json' });

    // Create a download link
    var downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'dataObject.json'; // The filename for the downloaded file
    downloadLink.innerText = 'Download JSON';
    
    // Apply CSS styling to the download link
    downloadLink.style.display = 'block'; // To make the link a block element
    downloadLink.style.textAlign = 'center'; // Center-align the text
    downloadLink.style.fontSize = '38px'; // Make the text bigger
    downloadLink.style.paddingTop = '50px'; // Add padding to the top
    downloadLink.style.paddingBottom = '50px'; // Add padding to the bottom

    // Append the download link to the DOM
    var downloadContainer = document.getElementById('download-container');
    downloadContainer.innerHTML = ''; // Clear previous content
    downloadContainer.appendChild(downloadLink);





    /*
    // Fetch API
    var requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataObject),
        redirect: 'follow'
    };

    //fetch("https://graphpost.fly.dev/process", requestOptions)
    fetch("http://127.0.0.1:8000/process", requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
    */
});

























/*
// Download polyline as a file
document.getElementById('download-btn').addEventListener('click', function () {
    var geoJSON = drawnItems.toGeoJSON();
    var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geoJSON));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'polyline.geojson');
    document.body.appendChild(downloadAnchorNode); // required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});
*/