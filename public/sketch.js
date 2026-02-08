// Global variables declaration
let currentShape = []; 
let allShapes = [];    
let symmetry = 8;      
let angle;
let socket; 
let myName = "Guest"; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  angle = 360 / symmetry;

  // Ask for name
  myName = prompt("Please enter your name:", "Guest" + int(random(1000)));
  if (!myName) myName = "Anonymous";

  try {
    socket = io();
    console.log("Attempting to connect...");

    socket.on("showOnWall", (data) => {
      allShapes.push(data);
    });
    
    // Listen for history (if server supports it)
    socket.on("history", (historyData) => {
        allShapes = [...allShapes, ...historyData];
    });

    socket.on("connect", () => {
      console.log(">>> Connected! ID:", socket.id);
    });

  } catch (e) {
    console.log("Socket error:", e);
  }
}

function draw() {
  // Background
  if (socket && socket.connected) {
    background(250, 240, 230); 
  } else {
    background(200); 
  }
  
  // --- Step 1: Draw existing artwork on the "Wall" ---
  for (let s of allShapes) {
    push(); 
    
    // 1. Move to position
    translate(s.x, s.y); 
    
    // 2. [New] Apply random rotation (Tilt the papercut)
    rotate(s.rotation); 
    
    // 3. Scale down
    scale(0.5); 
    
    // 4. Draw the shape
    drawSymmetry(s.points, s.color);
    
    // 5. [Trick] Draw Name (Keep it horizontal!)
    // We rotate BACK so the text is always straight, even if the papercut is tilted
    rotate(-s.rotation); 
    
    fill(0);
    noStroke();
    textAlign(CENTER);
    textSize(24); 
    // Adjust Y position slightly because rotation might have moved it
    text(s.author, 0, 120); 
    
    pop(); 
  }

  // --- Step 2: Draw the "Workbench" ---
  push();
  translate(width/2, height/2); 
  
  fill(150);
  noStroke();
  ellipse(0, 0, 10, 10); 
  
  textAlign(CENTER);
  text(myName, 0, 160); 

  if (mouseIsPressed) {
    let mx = mouseX - width/2; 
    let my = mouseY - height/2;
    currentShape.push({x: mx, y: my});
  }

  drawSymmetry(currentShape, [255, 0, 0]); 
  
  pop(); 
}

function drawSymmetry(points, col) {
  if (points.length < 2) return;
  
  stroke(col);
  strokeWeight(2);
  
  // [Design Tip] Add some transparency (Alpha) to fill
  // This makes overlapping look nice instead of messy
  let c = color(col);
  c.setAlpha(50); // Very transparent fill
  fill(c); 
  // If you want outline only, use noFill() and remove the lines above

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
  if (currentShape.length > 5) {
    let start = currentShape[0];
    let end = currentShape[currentShape.length - 1];
    
    if (dist(start.x, start.y, end.x, end.y) < 30) {
      
      let randomX = random(width * 0.1, width * 0.9);
      let randomY = random(height * 0.1, height * 0.9);
      
      // [New] Random rotation angle (between -45 and 45 degrees)
      // This gives a "natural scattered" look without being too chaotic
      let randomRot = random(-45, 45);

      let papercutData = {
        points: [...currentShape], 
        color: [random(255), 100, 100], 
        x: randomX, 
        y: randomY,
        rotation: randomRot, // Save the rotation
        author: myName 
      };
      
      if (socket) {
        socket.emit("newPapercut", papercutData);
      }
      
      allShapes.push(papercutData); 
    }
  }
  currentShape = []; 
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
