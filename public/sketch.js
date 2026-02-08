// -----------------------------
// Global variables
// -----------------------------
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
    console.log("Attempting to connect to server...");

    // Receive a newly created papercut from other users
    socket.on("showOnWall", (data) => {
      // Assign random animation parameters for visual liveliness
      data.spinSpeed = random(-0.5, 0.5); 
      data.floatOffset = random(360); 
      allShapes.push(data);
    });
    
    // Receive historical papercuts when entering the space
    socket.on("history", (historyData) => {
      historyData.forEach(d => {
        d.spinSpeed = random(-0.5, 0.5);
        d.floatOffset = random(360);
      });
      allShapes = [...allShapes, ...historyData];
    });

  } catch (e) {
    console.log("Socket connection error:", e);
  }
}

function draw() {
  // -----------------------------
  // Background feedback
  // -----------------------------
  if (socket && socket.connected) {
    background(250, 240, 230); // Connected state
  } else {
    background(200); // Disconnected / offline state
  }
  
  // -----------------------------
  // Title & Instruction (UI Layer)
  // -----------------------------
  push();
  resetMatrix(); // Ensure UI text is not affected by transforms
  fill(100);
  noStroke();
  textAlign(CENTER);
  textSize(20);
  textStyle(BOLD);
  text(
    "Cut your papercut — draw a closed shape to place it on the wall",
    width / 2,
    50
  );
  pop();

  // -----------------------------
  // Shared Wall: existing papercuts
  // -----------------------------
  for (let s of allShapes) {
    push(); 

    // Floating motion
    let floatingY = sin(frameCount + s.floatOffset) * 10; 
    translate(s.x, s.y + floatingY); 
    
    // Rotation animation
    let currentRotation = s.rotation + (frameCount * s.spinSpeed);
    rotate(currentRotation); 
    
    scale(0.5); 
    drawSymmetry(s.points, s.color);
    pop(); 
  }

  // -----------------------------
  // Workbench (drawing area)
  // -----------------------------
  push();
  translate(width / 2, height / 2); 
  
  // Center reference point
  fill(150);
  noStroke();
  ellipse(0, 0, 10, 10); 

  // Record current drawing gesture
  if (mouseIsPressed) {
    let mx = mouseX - width / 2; 
    let my = mouseY - height / 2;
    currentShape.push({ x: mx, y: my });
  }

  // Live preview of the current cut (red)
  drawSymmetry(currentShape, [255, 0, 0]); 
  
  // Visual hint: show a green cue when the shape is close to closing
  if (currentShape.length > 5) {
    let start = currentShape[0];
    let end = currentShape[currentShape.length - 1];
    if (dist(start.x, start.y, end.x, end.y) < 100) {
      fill(0, 255, 0, 100); // Semi-transparent green
      noStroke();
      ellipse(start.x, start.y, 20, 20); // "You can release now" indicator
    }
  }
  
  pop(); 
}

// -----------------------------
// Symmetry drawing function
// -----------------------------
function drawSymmetry(points, col) {
  if (points.length < 2) return;
  
  stroke(col);
  strokeWeight(2);
  
  let c = color(col);
  c.setAlpha(50); 
  fill(c); 

  for (let i = 0; i < symmetry; i++) {
    rotate(angle);

    beginShape();
    for (let p of points) vertex(p.x, p.y);

    // Force visual closure for completed papercuts
    if (col[0] !== 255) endShape(CLOSE); 
    else endShape();
    
    // Mirrored half for traditional papercut symmetry
    push();
    scale(1, -1);
    beginShape();
    for (let p of points) vertex(p.x, p.y);
    if (col[0] !== 255) endShape(CLOSE);
    else endShape();
    pop();
  }
}

function mouseReleased() {
  if (currentShape.length > 5) {
    let start = currentShape[0];
    let end = currentShape[currentShape.length - 1];
    
    // A generous threshold for considering the shape "closed"
    if (dist(start.x, start.y, end.x, end.y) < 100) {
      
      // Snap the final point to the start to avoid visible gaps
      currentShape.push(currentShape[0]);

      let papercutData = {
        points: [...currentShape], 
        color: [random(255), 100, 100], 
        x: random(width * 0.1, width * 0.9), 
        y: random(height * 0.1, height * 0.9),
        rotation: random(360),
        spinSpeed: random(-0.5, 0.5),
        floatOffset: random(360)
      };
      
      // Send the new papercut to the shared wall
      if (socket) {
        socket.emit("newPapercut", papercutData);
      }

      // Local optimistic update (immediate feedback)
      allShapes.push(papercutData); 
    }
  }

  // Reset for the next cut
  currentShape = []; 
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
