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

// Bottom Buttons
var btnRvt = document.getElementById("btnRvt");
var btnGh = document.getElementById("btnGh");
btnRvt.addEventListener("click", function() {alert("A Revit template from the design above could be readily downloadable, complete with predefined levels for immediate use.");}); // Revit button
btnGh.addEventListener("click", function() {alert("A readily downloadable Grasshopper file of the design above would be available for users, enabling them to extend and refine their projects with ease.");}); // Revit button


// Corridor Single or Double
// JavaScript to toggle the switch
var toggleCorridor = document.getElementById('toggleCorridor');
var toggleLabels = document.querySelectorAll('.toggle-label');
var dataObject; // Define dataObject in a scope accessible to both event handlers
var btnSend = document.getElementById('btnSend'); // Define btnSend



// Flag to track if the button has been clicked
let btnClicked = false;
const container6 = document.querySelector('.container-6');

// Function to toggle the container's height
function toggleContainerHeight() {
    if (!btnClicked) {
        canvasContainer.style.height = '100%';
        canvasContainer.classList.toggle('hidden');
        container6.classList.toggle('hidden');
        btnClicked = true;
    } else {
        canvasContainer.style.height = '0';
        container6.style.height = '0';
        btnClicked = false;
    }
}


function resetButton() {
    btnSend.removeAttribute('disabled');
    btnSend.querySelector('.btn-text').style.display = 'inline-block';
    btnSend.querySelector('.spinner-border').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    
    var floorsInput = document.getElementById("floorsInput");

    function increment() {
        floorsInput.value = parseInt(floorsInput.value, 10) + 1;
    }
    
    function decrement() {
        if (floorsInput.value > 1) {
            floorsInput.value = parseInt(floorsInput.value, 10) - 1;
        }
    }
    
    // Attach event listeners to buttons
    var incrementButton = document.querySelector(".increment");
    var decrementButton = document.querySelector(".decrement");
    incrementButton.addEventListener("click", increment);
    decrementButton.addEventListener("click", decrement);
    
    // Attach the event listener for the toggleCorridor checkbox
    toggleCorridor.addEventListener('click', function() {
        // Toggle the labels' background colors
        toggleLabels.forEach(function(label) {
            label.classList.toggle('active');
        });
    });

    // Attach the event listener for the btnSend button
    btnSend.addEventListener('click', function () {
        btnSend.setAttribute('disabled', 'true'); // Show the spinner
        btnSend.querySelector('.btn-text').style.display = 'none';
        btnSend.querySelector('.spinner-border').style.display = 'inline-block';
        //setTimeout(function () {resetButton();}, 2000); // Timeout,reset button 2 seconds
    });
    resetButton(); // Initially hide the spinner and enable the button
});

// Create a Javascript Object combining all browser inputs
// Event handler for btnSend button click
document.getElementById('btnSend').addEventListener('click', function () {
    var coordinates = [];
    var geometryType;
    var typology;
    var floorsInput;
    toggleContainerHeight();
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
            alert('Draw a Linear or Courtyard Building before sending data.');
            setTimeout(function () {resetButton();}, 1000); // Timeout button 1 second
            return;
        }
    } else {
        alert('Draw a Linear or Courtyard Building before sending data.');
        setTimeout(function () {resetButton();}, 1000); // Timeout button 1 second
    return;
    }



    // Get the floorsInput value and the toggleCorridor checkbox state
    var floorsInput = parseInt(document.getElementById('floorsInput').value);
    var toggleCorridor = document.getElementById('toggleCorridor').checked;

    // Create the JavaScript object with the collected data
    dataObject = {
        type: "feature",
        geometry: {
            type: geometryType,
            coordinates: JSONCoordinates
        },
        properties: {
            corridorType: toggleCorridor ? "single loaded" : "double loaded",
            typology: typology,
            floorsInput: floorsInput
        }
    };

    // Do something with the dataObject (e.g., send it to the server)
    console.log("JSON from front-end", dataObject);

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


    //fetch("https://graphtestrun.fly.dev/process", requestOptions)
    fetch("https://graphmlwebapp.fly.dev/process", requestOptions)
    //fetch("http://127.0.0.1:8000/process", requestOptions)
    .then(response => response.text())
    .then(result => {
        // Re-enable the button and hide the spinner when the fetch request is completed
        resetButton();

        // Handle the fetch response here
        console.log(result);
        var data = JSON.parse(result);
        console.log(data);


        // Assuming 'data' contains the parsed JSON response
        const coordinates = data.features.map((feature) => {
            if (
            feature &&
            feature.node &&
            feature.node.properties &&
            feature.node.properties.metadata &&
            feature.node.properties.metadata.geometry &&
            feature.node.properties.metadata.geometry.coordinates
            ) {
            const geometry = feature.node.properties.metadata.geometry;
            return geometry.coordinates;
            } else {
            return null; // Or handle the case when data is missing
            }
        });
        
        //console.log(coordinates);

        // Assuming 'data' contains the parsed JSON response
        const predictedClass = data.features.map((feature) => {
            if (
            feature &&
            feature.node &&
            feature.node.properties && 
            feature.node.properties.predictedClass
            ) {
            return parseInt(feature.node.properties.predictedClass, 10); // Convert to an integer if needed
            } else {
            return null; // Or handle the case when data is missing
            }
        });
        
        console.log(predictedClass);

        const source = [];
        data.features.map((feature) => {
            if (
              feature &&
              feature.edge &&
              feature.edge.properties &&
              feature.edge.properties.source !== undefined
            ) {
              const sourceValue = parseInt(feature.edge.properties.source, 10);
              source.push(sourceValue);
            }
          });
          
          //console.log(source);

          const target = [];
          data.features.map((feature) => {
              if (
                feature &&
                feature.edge &&
                feature.edge.properties &&
                feature.edge.properties.target !== undefined
              ) {
                const targetValue = parseInt(feature.edge.properties.target, 10);
                target.push(targetValue);
              }
            });
            
            console.log(target);

    //Sort coordinates by predicted class
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

    var inputGeometry = adjustCoordinates(JSONCoordinates, typology);
    //var inputCoordinates = [[79.604578, 45.09543],[40.422679, -46.102012],[-76.240781, -37.299453],[-43.786476, 36.292871],[79.604578, 45.09543]];
    createInputContext(scene,inputGeometry, 1.2);

    })
    .catch(error => {
        // Re-enable the button and hide the spinner on error
        resetButton();

        // Handle the fetch error here
        console.error('Error:', error);
    });
});

//ThreeJS
const scene = new THREE.Scene();
scene.background = new THREE.Color('navajowhite'); // Set background color to navajowhite

// Setup Camera
const camera = new THREE.PerspectiveCamera(130, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.up.set(0,0,1);
camera.setFocalLength (35)
camera.position.set(0, -200, 100); //setup the right camera to start with!

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

function adjustCoordinates(coordinates, typology) {
    // Check if typology is 'courtyard'
    if (typology === 'courtyard') {
      // Make a copy of the first coordinate and add it to the end of the list
      const firstPoint = coordinates[0];
      coordinates.push(firstPoint);
    }
    return coordinates;
}

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



// Custom class to manage InputContextGeometry
class InputContextGeometry {
    constructor() {
        this.circles = [];
        this.cylinders = [];
    }

    clear(scene) {
        // Remove circles with a specific name or tag
        this.circles.forEach(circle => {
            if (circle.name === 'InputContextCircle') {
                scene.remove(circle);
            }
        });
        this.circles.length = 0;

        // Remove cylinders with a specific name or tag
        this.cylinders.forEach(cylinder => {
            if (cylinder.name === 'InputContextCylinder') {
                scene.remove(cylinder);
            }
        });
        this.cylinders.length = 0;
    }
}

// Create an instance of InputContextGeometry
const inputContextGeometry = new InputContextGeometry();


// Function to create two single-sided circles, one facing up and the other facing down, with different opacity
function createInputContext(scene, coordinates, offsetDistance) {
    // Clear the previous InputContextGeometry
    inputContextGeometry.clear(scene);

    // Calculate the maximum radius
    let maxRadiusSq = 0;
    coordinates.forEach(coord => {
        const radiusSq = coord[0] * coord[0] + coord[1] * coord[1];
        if (radiusSq > maxRadiusSq) {
            maxRadiusSq = radiusSq;
        }
    });
    const maxRadius = Math.sqrt(maxRadiusSq);

    // Find the element with id "max-dimension" and set its text content
    const maxDimension = document.getElementById('max-radius');
    maxDimension.textContent = `Estimated Longest Dimension: ${Math.round(maxRadius*1.6)} meters`;

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

    // Calculate the radius for the third circle (1/10th of maxRadius)
    const circle3Radius = maxRadius / 50;

    // Create the third circle geometry
    const circleGeometry3 = new THREE.CircleGeometry(circle3Radius, 254);
    const circleMaterial3 = new THREE.MeshBasicMaterial({
        color: 0x000080, // Navy
        transparent: true,
        opacity: 1.0, // Adjust opacity for the third circle
        side: THREE.DoubleSide, // Make the third circle single-sided and face up
    });
    const circle3 = new THREE.Mesh(circleGeometry3, circleMaterial3);

    // Position the third circle from the origin by maxRadius * 1.3 in the y-direction
    circle3.position.set(0, maxRadius * 1.3, 0);

    scene.add(circle3);

    // Add circles to the InputContextGeometry with specific names or tags
    circle1.name = 'InputContextCircle';
    circle2.name = 'InputContextCircle';
    circle3.name = 'InputContextCircle';
    inputContextGeometry.circles.push(circle1, circle2, circle3);


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

        // Add cylinders to the InputContextGeometry with specific names or tags
        cylinder.name = 'InputContextCylinder';
        inputContextGeometry.cylinders.push(cylinder);

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








