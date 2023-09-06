 // Get JSON
const fs = require('fs');

// Read the JSON file
const jsonContent = fs.readFileSync('predictedGraph.json', 'utf8');
const data = JSON.parse(jsonContent);

// Extract coordinates from the JSON data and format them
const coordinates = [];
const predictedClass = [];
const source = [];
const target = [];


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
  


const unit = [];
const egress = [];
const corridor = [];

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

console.log(coordinates.length)
console.log(predictedClass.length)

  
console.log(source)

for (let i = 0; i < coordinates.length; i++) {
    if (isNaN(coordinates[i][0]) || isNaN(coordinates[i][1]) || isNaN(coordinates[i][2])) {
        console.error('NaN found in coordinates:', coordinates[i]);
    }
}
  
  
  