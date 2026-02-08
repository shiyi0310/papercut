// Global variables
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
    socket = io();
    console.log("Connecting...");

    // 1. Listen for new artwork from others
    socket.on("showOnWall", (data) => {
      // Add animation parameters locally
      addAnimParams(data); 
      allShapes.push(data);
    });
    
    // 2. [New] Listen for history when joining
    socket.on("history", (historyData) => {
        // Add animation parameters to all history items
        historyData.forEach(d => addAnimParams(d));
        allShapes = [...historyData]; 
    });

    // 3. [New] Listen for delete commands
    socket.on("removePapercut", (idToRemove) => {
        // Remove the shape with the matching ID
        allShapes = allShapes.filter(s => s.id !== idToRemove);
    });

  } catch (e) {
    console.log("Socket error:", e);
  }
}

// Helper: Add random animation values if they are missing
function addAnimParams(data) {
    if (!data.spinSpeed) data.spinSpeed = random(-0.5, 0.5);
    if (!data.floatOffset) data.floatOffset = random(360);
}

function draw() {
  // Set background color based on connection status
  if (socket && socket.connected) {
    background(250, 240, 230); // Warm white
  } else {
    background(200); // Grey
  }
  
  // --- Draw Title ---
  push();
  resetMatrix(); 
  fill(100);
  noStroke();
  textAlign(CENTER);
  textSize(20);
  textStyle(BOLD);
  text("Cut your papercut! Click existing ones to DELETE.", width/2, 50);
  pop();

  // --- Step 1: Draw Wall Papercuts ---
  for (let s of allShapes) {
    push(); 
    
    // Calculate floating animation
    let floatingY = sin(frameCount + s.floatOffset) * 10; 
    translate(s.x, s.y + floatingY); 
    
    // Calculate rotation animation
    let currentRotation = s.rotation + (frameCount * s.spinSpeed);
    rotate(currentRotation); 
    
    scale(0.5); 
    drawSymmetry(s.points, s.color);
    pop(); 
  }

  // --- Step 2: Draw Workbench (Center) ---
  push();
  translate(width/2, height/2); 
  
  fill(150);
  noStroke();
  ellipse(0, 0, 10, 10); // Center dot

  // Handle Input (Mouse or Touch)
  // Only add points if we are actually dragging (drawing)
  if (mouseIsPressed || touches.length > 0) {
    let mx = mouseX - width/2; 
    let my = mouseY - height/2;
    
    // Avoid adding duplicate points
    if (currentShape.length === 0 || dist(mx, my, currentShape[currentShape.length-1].x, currentShape[currentShape.length-1].y) > 2) {
       currentShape.push({x: mx, y: my});
    }
  }

  // Draw the red preview line
  drawSymmetry(currentShape, [255, 0, 0]); 
  
  // Visual Hint: Green light when close to closing the shape
  if (currentShape.length > 5) {
      let start = currentShape[0];
      let end = currentShape[currentShape.length - 1];
      if (dist(start.x, start.y, end.x, end.y) < 100) {
          fill(0, 255, 0, 100); 
          noStroke();
          ellipse(start.x, start.y, 20, 20); 
      }
  }
  
  pop(); 
}

function drawSymmetry(points, col) {
  if (points.length < 2) return;
  
  stroke(col);
  strokeWeight(2);
  
  let c = color(col);
  c.setAlpha(50); // Transparent fill
  fill(c); 

  for (let i = 0; i < symmetry; i++) {
    rotate(angle);
    beginShape();
    for (let p of points) { vertex(p.x, p.y); }
    // Close shape visually if it's a finished papercut (not red preview)
    if (col[0] !== 255) endShape(CLOSE); else endShape();
    
    push();
    scale(1, -1);
    beginShape();
    for (let p of points) { vertex(p.x, p.y); }
    if (col[0] !== 255) endShape(CLOSE); else endShape();
    pop();
  }
}

// --- Logic to handle Mouse Release / Touch End ---
function handleAction() {
  
  // Case A: Drawing a shape (Lots of points)
  if (currentShape.length > 5) {
    let start = currentShape[0];
    let end = currentShape[currentShape.length - 1];
    
    // Check if the shape is closed (Distance < 100)
    if (dist(start.x, start.y, end.x, end.y) < 100) {
      
      currentShape.push(currentShape[0]); // Force close

      let papercutData = {
        id: Date.now() + Math.random(), // [New] Generate Unique ID
        points: [...currentShape], 
        color: [random(255), 100, 100], 
        x: random(width * 0.1, width * 0.9), 
        y: random(height * 0.1, height * 0.9),
        rotation: random(360),
        // Send initial animation params so everyone sees the same sync
        spinSpeed: random(-0.5, 0.5),
        floatOffset: random(360)
      };
      
      if (socket) {
        socket.emit("newPapercut", papercutData);
      }
      
      // We don't push to allShapes here anymore, 
      // we wait for the server to send it back or handle history logic.
      // But for instant feedback, we can push it:
      allShapes.push(papercutData); 
    }
  } 
  // Case B: Clicking to Delete (Very few points = Click)
  else if (currentShape.length < 5) {
      checkDelete();
  }

  currentShape = []; // Reset
}

// Check if we clicked on an existing papercut
function checkDelete() {
    // Loop backwards to delete the top-most one first
    for (let i = allShapes.length - 1; i >= 0; i--) {
        let s = allShapes[i];
        
        // Calculate the current position (including float animation)
        let floatingY = sin(frameCount + s.floatOffset) * 10;
        let actualY = s.y + floatingY;

        // Simple hit detection: Distance to center < 50px
        if (dist(mouseX, mouseY, s.x, actualY) < 50) {
            // Send delete command to server
            socket.emit("deletePapercut", s.id);
            break; // Delete only one at a time
        }
    }
}

// Mouse Release
function mouseReleased() {
  handleAction();
}

// Touch controls for Mobile
function touchStarted() { return false; }
function touchMoved() { return false; }
function touchEnded() { 
  handleAction();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
