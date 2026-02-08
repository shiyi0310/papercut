let currentShape = []; 
let allShapes = [];    
let symmetry = 8;      
let angle;
const socket = io(); // 连接服务器

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  angle = 360 / symmetry;

  socket = io();
  // 【重要】监听服务器广播回来的窗花数据
  socket.on("showOnWall", (data) => {
    allShapes.push(data);
  });
}

function draw() {
  background(240);
  
  // 画个圆点提示中心
  fill(200);
  noStroke();
  ellipse(width/2, height/2, 10, 10);

  translate(width/2, height/2); 

  // 1. 记录当前绘画
  if (mouseIsPressed) {
    let mx = mouseX - width/2;
    let my = mouseY - height/2;
    currentShape.push({x: mx, y: my});
  }

  // 2. 绘制墙上所有的窗花
  for (let s of allShapes) {
    drawSymmetry(s.points, s.color);
  }

  // 3. 实时绘制自己正在画的预览（红色）
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
    
    // 如果闭合了
    if (dist(start.x, start.y, end.x, end.y) < 30) {
      let papercutData = {
        points: currentShape,
        color: [random(255), 50, 50] // 随机红色
      };
      
      // 【关键】发送给服务器
      socket.emit("newPapercut", papercutData);
    }
  }
  currentShape = []; // 清空当前，等待下一次绘制
}
