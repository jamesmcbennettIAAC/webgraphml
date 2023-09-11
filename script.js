// Initialize the map
const map = L.map('map').setView([41.3973, 2.1925], 18); //coordinates of Barcelona

// Add the tile layer with a different color scheme
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: 'IAAC MaCAD 2022/23',
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

// Declare the scaledCoordinates globally
var JSONCoordinates;

// Function to calculate distance between two points in meters
function calculateDistance(latlng1, latlng2) {
    return latlng1.distanceTo(latlng2);
}

// Event handler for polyline/polygon creation
map.on('draw:created', function(event) {
    // Remove previously drawn items
    drawnItems.clearLayers();
  
    var layer = event.layer;
    drawnItems.addLayer(layer);
  
    var pixelCoordinates = [];
  
    if (layer instanceof L.Polyline || layer instanceof L.Polygon) {

        if (layer instanceof L.Polygon) {
            // Set the type property to 'Courtyard'
            layer.type = 'Courtyard Building';
            
            // Get all rings of the polygon
            var rings = layer.getLatLngs();
  
            // Loop through all rings and extract pixel coordinates
            for (var i = 0; i < rings.length; i++) {
                var ring = rings[i];
                var ringPixelCoords = [];
                for (var j = 0; j < ring.length; j++) {
                    var latlng = ring[j];
                    var pixelPoint = map.latLngToContainerPoint(latlng);
                    ringPixelCoords.push([pixelPoint.x, pixelPoint.y]);
                }
                pixelCoordinates.push(ringPixelCoords);
            }

            // Calulate distance between first and second point
            // note layer.getLatLngs()[0]; for polygon and layer.getLatLngs(); for polylines
            var latlngs = layer.getLatLngs()[0];
        
            if (latlngs.length >= 2) {
                var firstLatLng = latlngs[0];
                var secondLatLng = latlngs[1];
                
                var distance = calculateDistance(firstLatLng, secondLatLng);
      
                console.log('Distance between the first and second points: ' + distance.toFixed(2) + ' meters');
            }
        } else {
            // Set the type property to 'Linear'
            layer.type = 'Linear Building';

            var polylinePixelCoords = layer.getLatLngs().map(function(latlng) {
                var pixelPoint = map.latLngToContainerPoint(latlng);
                return [pixelPoint.x, pixelPoint.y];
            });

            pixelCoordinates.push(polylinePixelCoords);

            // Calulate distance between first and second point
            // note layer.getLatLngs()[0]; for polygon and layer.getLatLngs(); for polylines
            var latlngs = layer.getLatLngs();
        
            if (latlngs.length >= 2) {
                var firstLatLng = latlngs[0];
                var secondLatLng = latlngs[1];
                
                var distance = calculateDistance(firstLatLng, secondLatLng);
      
                console.log('Distance between the first and second points: ' + distance.toFixed(2) + ' meters');
            }
        }
  
        JSONCoordinates = displayPixelCoordinates(pixelCoordinates, layer.type, distance);
        

    }
});

map.on('draw:drawstop', function(event) {
    // Finish drawing the polygon when the user completes it
    var layer = event.layer;
    if (layer instanceof L.Polygon) {
        layer._finishShape();
    }
});



// Function to calculate distance between two points in pixels
function calculatePixelDistance(point1, point2) {
    var dx = point2[0] - point1[0];
    var dy = point2[1] - point1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// Function to scale points by a factor
function scalePoints(points, scaleFactor) {
    var scaledPoints = [];

    for (var i = 0; i < points.length; i++) {
        var scaledX = points[i][0] * scaleFactor;
        var scaledY = points[i][1] * scaleFactor;
        scaledPoints.push([scaledX, scaledY]);
    }

    return scaledPoints;
}

// Function to calculate the centroid of an array of points
function calculateCentroid(points) {
    var sumX = 0;
    var sumY = 0;

    for (var i = 0; i < points.length; i++) {
        sumX += points[i][0];
        sumY += points[i][1];
    }

    var centerX = sumX / points.length;
    var centerY = sumY / points.length;

    return [centerX, centerY];
}

// Function to move points by a vector
function movePointsByVector(points, vector) {
    var movedPoints = [];

    for (var i = 0; i < points.length; i++) {
        var movedX = points[i][0] + vector[0];
        var movedY = points[i][1] + vector[1];
        movedPoints.push([movedX, movedY]);
    }

    return movedPoints;
}

// Function to flip the sign of the y-coordinate
function flipYCoordinates(points) {
    var flippedPoints = [];

    for (var i = 0; i < points.length; i++) {
        var flippedX = points[i][0];
        var flippedY = -points[i][1]; // Flip the y-coordinate
        flippedPoints.push([flippedX, flippedY]);
    }

    return flippedPoints;
}

// Function to check if points are in counterclockwise order
function isCounterclockwise(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        sum += (next[0] - current[0]) * (next[1] + current[1]);
    }
    return sum > 0;
}

// Function to ensure points are in counterclockwise order
function ensureCounterclockwise(points) {
    if (isCounterclockwise(points)) {
        // If not counterclockwise, reverse the order
        console.log("List was reversed to ensure counterclockwise order.");
        return points.reverse();
        
    }
    return points;
}

// Display pixel coordinates function
function displayPixelCoordinates(pixelCoordinates, type, distance) {
    var coordinatesContainer = document.getElementById('coordinates');
    coordinatesContainer.innerHTML = ''; // Clear previous coordinates
  
    if (pixelCoordinates.length) {
        var coordinatesTitle = document.createElement('h5');
        coordinatesTitle.textContent = '' + type; // Change title of popup coordinates
        coordinatesContainer.appendChild(coordinatesTitle);
  
        var centroid = calculateCentroid(pixelCoordinates[0]); // Assuming only the first set of coordinates
        var moveVector = [-centroid[0], -centroid[1]]; // Vector from centroid to origin

        var movedCoordinates = movePointsByVector(pixelCoordinates[0], moveVector);
        var flippedCoordinates = flipYCoordinates(movedCoordinates);

        var pixelPoint1 = flippedCoordinates[0]; // Assuming point 1
        var pixelPoint2 = flippedCoordinates[1]; // Assuming point 2

        var pixelDistance = calculatePixelDistance(pixelPoint1, pixelPoint2);
        var scaleFactor = distance / pixelDistance;
        var scaledCoordinates = scalePoints(flippedCoordinates, scaleFactor);

        var counterclockwisePoints = ensureCounterclockwise(scaledCoordinates);

        var coordinatesList = document.createElement('ul');
  
        counterclockwisePoints.forEach(function(coord) {
            var listItem = document.createElement('li');
            listItem.textContent = '[' + coord.join(', ') + ']'; // Join the coordinates and format them
            coordinatesList.appendChild(listItem);
        });
  
        coordinatesContainer.appendChild(coordinatesList);

        return counterclockwisePoints;
        
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
            coordinates: JSONCoordinates
        },
        properties: {
            corridorType: toggleCorridor ? "double loaded" : "single loaded",
            typology: typology,
            floorsInput: floorsInput
        }
    };

    // Do something with the dataObject (e.g., send it to the server)
    console.log(dataObject);


    /*
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

    */
   

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
    
    // Fetch API
    var requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataObject),
        redirect: 'follow'
    };

    fetch("https://graphtestrun.fly.dev/process", requestOptions)
    //fetch("http://127.0.0.1:8000/process", requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
    
});




