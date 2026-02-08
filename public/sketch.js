// Global variables declaration
let currentShape = []; 
let allShapes = [];    
let symmetry = 8;      
let angle;
let socket; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  angle = 360 / symmetry;

  try {
    // [Important] Initialize connection here to avoid load errors
    socket = io();
    console.log("Attempting to connect to server...");

    // Listen for artwork received from other users
    socket.on("showOnWall", (data) => {
      allShapes.push(data);
    });

    // Log successful connection
    socket.on("connect", () => {
      console.log(">>> Connected! ID:", socket.id);
    });

  } catch (e) {
    console.log("Socket error:", e);
  }
}

function draw() {
  // Set background: Warm white if connected, Grey if disconnected
  if (socket && socket.connected) {
    background(250, 240, 230); 
  } else {
    background(200); 
  }
  
  // --- Step 1: Draw existing artwork on the "Wall" ---
  for (let s of allShapes) {
    push(); // [Important] Save current coordinate system
    
    // Move to the specific random position of this papercut
    translate(s.x, s.y); 
    
    // Scale down existing papercuts (0.5x) for better aesthetics
    scale(0.5); 
    
    drawSymmetry(s.points, s.color);
    
    pop(); // [Important] Restore coordinate system for the next shape
  }

  // --- Step 2: Draw the "Workbench" in the center ---
  push();
  translate(width/2, height/2); // Move origin to screen center
  
  // Draw center indicator
  fill(150);
  noStroke();
  ellipse(0, 0, 10, 10); 

  // 1. Record current drawing trajectory
  if (mouseIsPressed) {
    let mx = mouseX - width/2; // Calculate coordinates relative to center
    let my = mouseY - height/2;
    currentShape.push({x: mx, y: my});
  }

  // 2. Draw the line currently being drawn (Red preview)
  drawSymmetry(currentShape, [255, 0, 0]); 
  
  pop(); // End center drawing context
}

// Generic function to draw symmetrical shapes
function drawSymmetry(points, col) {
  if (points.length < 2) return;
  stroke(col);
  strokeWeight(2);
  noFill();

  for (let i = 0; i < symmetry; i++) {
    rotate(angle);
    beginShape();
    for (let p of points) { vertex(p.x, p.y); }
    endShape();
    
    push();
    scale(1, -1);
    beginShape();
    for (let p of points) { vertex(p.x, p.y); }
    endShape();
    pop();
  }
}

function mouseReleased() {
  // Only process if there are enough points
  if (currentShape.length > 5) {
    let start = currentShape[0];
    let end = currentShape[currentShape.length - 1];
    
    // Check if the shape is closed (start and end points are close)
    if (dist(start.x, start.y, end.x, end.y) < 30) {
      
      // Generate a random position within screen bounds
      let randomX = random(width * 0.1, width * 0.9);
      let randomY = random(height * 0.1, height * 0.9);

      let papercutData = {
        points: [...currentShape], 
        color: [random(255), 100, 100], // Random reddish color
        x: randomX, // [New] Store specific X position
        y: randomY  // [New] Store specific Y position
      };
      
      // Send data to server
      if (socket) {
        socket.emit("newPapercut", papercutData);
      }
      
      // Immediately add to local display
      allShapes.push(papercutData); 
    }
  }
  // Clear the workbench for the next drawing
  currentShape = []; 
}

// Resize canvas when window size changes
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
