import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene();
scene.background = new THREE.Color('navajowhite'); // Set background color to navajowhite

// Setup Camera
const camera = new THREE.PerspectiveCamera(130, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.up.set(0,0,1);
camera.setFocalLength (45)
camera.position.set(190, 190, 100); //setup the right camera to start with!

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
    };

    // Define thickness values for each class
    const thicknessValues = {
        0: 0.25, // Thickness for class 0
        1: 0.5, // Thickness for class 1
        2: 0.25, // Thickness for class 2
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