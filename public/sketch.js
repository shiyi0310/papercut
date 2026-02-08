let currentShape = []; 
let allShapes = [];    
let symmetry = 8;      
let angle;

// 【修改1】这里只声明变量，千万不要在这里赋值 io()
let socket; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  angle = 360 / symmetry;

  // 【修改2】在 setup 里面才进行连接，这样最安全
  socket = io();

  // 监听别人画的窗花
  socket.on("showOnWall", (data) => {
    allShapes.push(data);
  });
}

function draw() {
  background(240);
  
  // 中心点
  fill(200);
  noStroke();
  ellipse(width/2, height/2, 10, 10);

  translate(width/2, height/2); 

  // 1. 记录轨迹
  if (mouseIsPressed) {
    let mx = mouseX - width/2;
    let my = mouseY - height/2;
    currentShape.push({x: mx, y: my});
  }

  // 2. 画出所有的窗花
  for (let s of allShapes) {
    drawSymmetry(s.points, s.color);
  }

  // 3. 画当前的红色预览
  drawSymmetry(currentShape, [255, 0, 0]); 
}

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
  if (currentShape.length > 5) {
    let start = currentShape[0];
    let end = currentShape[currentShape.length - 1];
    
    if (dist(start.x, start.y, end.x, end.y) < 30) {
      let papercutData = {
        points: [...currentShape], 
        color: [random(255), 50, 50] 
      };
      
      // 发送给服务器
      socket.emit("newPapercut", papercutData);
      
      // 【修改3】把自己画的也存进数组，这样你自己不用刷新也能看到
      allShapes.push(papercutData); 
    }
  }
  currentShape = []; 
}
