import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'


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

// Declare JSONCoordinates globally
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
      
                //console.log('Distance between the first and second points: ' + distance.toFixed(2) + ' meters');
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
      
                //console.log('Distance between the first and second points: ' + distance.toFixed(2) + ' meters');
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
        //console.log("List was reversed to ensure counterclockwise order.");
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
    console.log("JSON from front-end", dataObject);
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

    var raw = JSON.stringify(dataObject)

    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json", );

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch("https://graphtestrun.fly.dev/process", requestOptions)
    //fetch("http://127.0.0.1:8000/process", requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
});



//ThreeJS
const scene = new THREE.Scene();
scene.background = new THREE.Color('navajowhite'); // Set background color to navajowhite

// Setup Camera
const camera = new THREE.PerspectiveCamera(130, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.up.set(0,0,1);
camera.setFocalLength (35)
camera.position.set(200, 200, 100); //setup the right camera to start with!

// Setup Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight); // Can add 0.7* by window.innerWidth
//document.body.appendChild(renderer.domElement);

// Attach the canvas to canvasContainer, not to document to prevent three.js being at bottom of page.
const canvasContainer = document.getElementById('canvasContainer');
canvasContainer.appendChild(renderer.domElement);

 // add a directional light
 const directionalLight = new THREE.DirectionalLight(0xffffff, 0);
 scene.add(directionalLight);
 
 const ambientLight = new THREE.AmbientLight();
 scene.add(ambientLight);

 const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 5);
 scene.add( light );

 // Orbit
const controls = new OrbitControls(camera, renderer.domElement);

// Declare the units at high scope
var coordinates = [];
var predictedClass = [];
var source = [];
var target = [];
var unit = [];
var egress = [];
var corridor = [];



// Read the JSON file
fetch('predictedGraph.json')
  .then(response => response.json())
  .then(data => {

    // Debugging: Log the entire JSON data
    //console.log('JSON Data:', data);

    // Extract coordinates from the JSON data and format them


    data.features.forEach(featureGroup => {
        featureGroup.forEach(feature => {
            if (feature && feature.node && feature.node.properties && feature.node.properties.metadata && feature.node.properties.metadata.geometry) {
                const geometry = feature.node.properties.metadata.geometry.coordinates;
                const [x, y, z] = geometry;
                coordinates.push([x, y, z]);
            }
        });
    });

    data.features.forEach(featureGroup => {
        featureGroup.forEach(feature => {
            if (feature && feature.node && feature.node.properties && feature.node.properties.predictedClass) {
                const classValue = feature.node.properties.predictedClass;
                predictedClass.push(parseInt(classValue[0]));
            }
        });
    });

    data.features.forEach(featureGroup => {
    featureGroup.forEach(feature => {
        if (feature && feature.edge && feature.edge.properties && feature.edge.properties.source !== undefined) {
        const sourceValue = feature.edge.properties.source;
        source.push(parseInt(sourceValue));
        }
    });
    });

    data.features.forEach(featureGroup => {
        featureGroup.forEach(feature => {
        if (feature && feature.edge && feature.edge.properties && feature.edge.properties.target !== undefined) {
            const targetValue = feature.edge.properties.target;
            target.push(parseInt(targetValue));
        }
        });
    });

    

    // Debugging: Log the coordinates
    //console.log('Coordinates:', coordinates);

    for (let i = 0; i < predictedClass.length; i++) {
    const currentCoordinate = coordinates[i];
    const currentClass = predictedClass[i];

    switch (currentClass) {
        case 0:
        unit.push(currentCoordinate);
        break;
        case 1:
        egress.push(currentCoordinate);
        break;
        case 2:
        corridor.push(currentCoordinate);
        break;
        // Add more cases if you have more classes
        default:
        // Handle any other cases if needed
        break;
    }
    }


    // Specify the startPt, endPt, color, and thickness you want
    createNode(scene, egress, 0xE0482F, 0.3);
    createNode(scene, unit, 0x3868FF, 0.2);
    createNode(scene, corridor, 0xFF8C7D, 0.2);

    createEdge(scene, coordinates, source, target, predictedClass, 0.1);

    var inputCoordinates = [[79.604578, 45.09543],[40.422679, -46.102012],[-76.240781, -37.299453],[-43.786476, 36.292871],[79.604578, 45.09543]];
    createInputContext(scene,inputCoordinates, 1.2);



})
.catch(error => {
  console.error('Error:', error);
});


// CreateGraph function, takes endPt and color to create a sphere at the endPt
function createNode(scene, coordinate, color, thickness) {
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < coordinate.length; i++) {
        const end = new THREE.Vector3(coordinate[i][0], coordinate[i][1], coordinate[i][2]);
        
        // Add a sphere at the end point
        const sphereGeometry = new THREE.SphereGeometry(thickness * 3, 16, 16);
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(end);
        scene.add(sphere);
    }
}

function createEdge(scene, coordinates, source, target, predictedClass, thickness) {
    // Define colors and their corresponding values
    const colors = {
        0: 0x3868FF, // Blue
        1: 0xE0482F, // Red
        2: 0xFF8C7D, // Pink
        3: 0x000080, // Navy
    };

    // Define thickness values for each class
    const thicknessValues = {
        0: 0.25, // Thickness for class 0
        1: 0.5, // Thickness for class 1
        2: 0.25, // Thickness for class 2
        3: 0.45, // Thickness for class 2
    };

    // Loop through source and target arrays
    for (let i = 0; i < source.length; i++) {
        // Get the predictedClass values at source and target
        const classSource = predictedClass[source[i]];
        const classTarget = predictedClass[target[i]];

        // Determine the color based on the predicted class values
        const color = colors[classSource] || colors[classTarget] || 0xFF8C7D; // Default to pink

        // Determine the thickness based on the predicted class values
        const thicknessValue = thicknessValues[classSource] || thicknessValues[classTarget] || 0.2; // Default thickness

        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: color });

        const start = new THREE.Vector3(
            coordinates[source[i]][0],
            coordinates[source[i]][1],
            coordinates[source[i]][2]
        );

        const end = new THREE.Vector3(
            coordinates[target[i]][0],
            coordinates[target[i]][1],
            coordinates[target[i]][2]
        );

        const direction = end.clone().sub(start);
        const length = direction.length();

        const cylinderGeometry = new THREE.CylinderGeometry(thicknessValue, thicknessValue, length, 8);
        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

        cylinder.position.copy(start.clone().add(end).multiplyScalar(0.5));

        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        cylinder.setRotationFromQuaternion(quaternion);

        scene.add(cylinder);
    }
}

/*
// Function to create a polygon with specified properties
function createPolygon(scene, vertices, scale, opacity) {
    // Convert input coordinates to THREE.Vector3 instances
    const vecPoints = vertices.map(vertex => new THREE.Vector3(...vertex));

    // Create geometry and material
    const color = new THREE.Color(0x000080);
    const geometry = new THREE.BufferGeometry().setFromPoints(vecPoints);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });

    // Create the polygon mesh
    const polygonMesh = new THREE.Mesh(geometry, material);

    // Scale the geometry from the center
    polygonMesh.scale.set(scale, scale, 1);

    scene.add(polygonMesh);
}
*/

// Create a material with the specified color



// Function to create two single-sided circles, one facing up and the other facing down, with different opacity
function createInputContext(scene, coordinates, offsetDistance) {
    // Calculate the maximum radius
    let maxRadiusSq = 0;
    coordinates.forEach(coord => {
        const radiusSq = coord[0] * coord[0] + coord[1] * coord[1];
        if (radiusSq > maxRadiusSq) {
            maxRadiusSq = radiusSq;
        }
    });
    const maxRadius = Math.sqrt(maxRadiusSq);

    // Create the first circle geometry with the calculated radius and opacity
    const circleGeometry1 = new THREE.CircleGeometry(maxRadius * offsetDistance, 254);
    const circleMaterial1 = new THREE.MeshBasicMaterial({
        color: 0x000080,
        transparent: true,
        opacity: 0.05, // Adjust opacity for the first circle
        side: THREE.FrontSide, // Make the first circle single-sided and face up
    });
    const circle1 = new THREE.Mesh(circleGeometry1, circleMaterial1);

    // Position the first circle on the XY plane (centered at 0, 0, 0)
    circle1.position.set(0, 0, 0);

    scene.add(circle1);

    // Create the second circle geometry with the same radius and different opacity
    const circleGeometry2 = new THREE.CircleGeometry(maxRadius * offsetDistance, 254);
    const circleMaterial2 = new THREE.MeshBasicMaterial({
        color: 0x000080,
        transparent: true,
        opacity: 0.8, // Adjust opacity for the second circle
        side: THREE.BackSide, // Make the second circle single-sided and face down (opposite direction)
    });
    const circle2 = new THREE.Mesh(circleGeometry2, circleMaterial2);

    // Position the second circle at the same position but slightly below the first one on the XY plane
    circle2.position.set(0, 0, -1); // Adjust the Z position as needed

    scene.add(circle2);


    // Loop through the list of coordinates
    for (let i = 0; i < coordinates.length - 1; i++) {
        const color = 0x000080; // Default to Navy
        const thicknessValue = 1; // Default thickness
        const opacity = 0.3; // Opacity value

        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity });

        const start = new THREE.Vector3(
            coordinates[i][0],
            coordinates[i][1],
            coordinates[i][2]
        );

        const end = new THREE.Vector3(
            coordinates[i + 1][0],
            coordinates[i + 1][1],
            coordinates[i + 1][2]
        );

        const direction = end.clone().sub(start);
        const length = direction.length();

        const cylinderGeometry = new THREE.CylinderGeometry(thicknessValue, thicknessValue, length, 8);
        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

        cylinder.position.copy(start.clone().add(end).multiplyScalar(0.5));

        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        cylinder.setRotationFromQuaternion(quaternion);

        scene.add(cylinder);
    }
}




// Run
// Animate
const animate = () => {
    requestAnimationFrame(animate);
/*
    lineSegments.rotation.x += 0.001;
    lineSegments.rotation.y += 0.001;
*/
    controls.update();
    renderer.render(scene, camera);
};

animate();








