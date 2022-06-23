let canoe;
let rocks = [];
let explosions = [];
let flowArrows = [];

let isGameOver = false;
let gameOverScreen;
let gameOverScreenBeingActivated = false;
let shake; // integer value for screen shake animation on collision

let date = new Date();
let time = date.getTime();
let secondsBetweenRockSpawns = 1;

const FPS = 60; // frame rate for paddle animation. default to 60 frames per second.

let scoreKeeper;
const restartButton = document.getElementById('restart-button');

const noiseScale = 500; // for perlin noise flow arrow field (to help convey rushing river)

function setup() {
  const h = max(windowHeight, 500);
  const w = min(windowWidth, h * 0.6);
  createCanvas(w, h);

  canoe = new Canoe(width * 0.5, height * 0.8, height * 0.1);

  let rows = 10;let cols = 6;
  setupFlowGrid(rows, cols);

  gameOverScreen = new GameOverScreen();
  shake = height * 0.01; // magnitude of shake translation animation on collision

  scoreKeeper = new ScoreKeeper();
}

function setupFlowGrid(rows, cols) {
  const gridItemWidth = width / cols;
  const gridItemHeight = height / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = col * gridItemWidth;
      if (row % 2 === 0) {x += gridItemWidth * 0.5;}; // stagger even row arrows for visual interest
      let y = row * gridItemHeight + gridItemHeight * 0.5;
      let fl = new FlowArrow(x, y, gridItemHeight);
      flowArrows.push(fl);
    }
  }
}

class ScoreKeeper {
  constructor() {
    this.score = 0;
    this.minScoreLength = 5;
    this.position = createVector(width * 0.7, height * 0.1);
  }

  getTextScore() {
    let s = this.score + "";
    while (s.length < this.minScoreLength) {
      s = "0" + s;
    }
    return s;
  }

  incrementScore() {
    this.score += 1;
  }

  resetScore() {
    this.score = 0;
  }

  render() {
    let textScore = this.getTextScore();
    push();
    textSize(32);
    text(textScore, this.position.x, this.position.y);
    pop();
  }}


class FlowArrow {
  constructor(x, y, h) {
    this.position = createVector(x, y); // centered in grid space
    this.initialY = y + h * 0.5; // bottom of its grid space
    this.height = h; // grid height
    this.arrowSpeed = height * random(0.008, 0.012); // use motion to help convey forward movement
    this.arrowSize = h * 0.06;
    this.lineLength = h * random(0.06, 0.12);
    this.angle = 0;
    this.maxAngle = PI * 0.25;
    this.stroke = random(225, 255);
  }

  update() {
    this.updateY();
    this.updateAngle();
  }

  updateY() {
    if (this.position.y >= this.initialY - this.height) {
      this.position.y -= this.arrowSpeed;
    } else {
      this.position.y = this.initialY;
    }
  }

  updateAngle() {// perlin noise angles
    let { x, y } = this.position;
    let noiseVal = noise(x / noiseScale, y / noiseScale, frameCount / noiseScale);
    let angle = map(noiseVal, 0, 1, -this.maxAngle, this.maxAngle);
    this.angle = angle;
  }

  render() {
    push();
    translate(this.position.x, this.position.y);
    stroke(this.stroke);
    noFill();
    rotate(this.angle);
    line(0, -this.lineLength, 0, this.lineLength);
    triangle(-this.arrowSize * 0.5, -this.lineLength, this.arrowSize * 0.5, -this.lineLength, 0, -this.lineLength - this.arrowSize);
    pop();
  }}


function draw() {
  if (isGameOver && !gameOverScreen.isActivated) {
    translate(random(-shake, shake), random(-shake, shake)); // SHAKE THE CANVAS TO ENHANCE COLLISION EFFECT

    if (!gameOverScreenBeingActivated) {// avoid running setTimeout ~60 times per second
      setTimeout(function () {
        gameOverScreen.activateGameOverScreen();
        restartButton.style.display = 'block';
      }, 1000);
      gameOverScreenBeingActivated = true;
    }
  }

  background(176, 196, 222); // "lightsteelblue" color for water

  flowArrows.forEach(fl => {
    fl.update(); // to help convey illusion of forwards motion on river
    fl.render();
  });

  for (let i = explosions.length - 1; i >= 0; i--) {// for collision animation
    explosions[i].update();
    explosions[i].show();

    if (explosions[i].done()) {
      explosions.splice(i, 1);
    }
  }

  if (!isGameOver) {
    updateGame();
    scoreKeeper.render();
  }

  rocks.forEach(r => r.render());

  if (gameOverScreen.isActivated) {
    const finalScore = scoreKeeper.getTextScore();
    gameOverScreen.render(finalScore);
  }
}

function updateGame() {
  let currentDate = new Date();
  let currentTime = currentDate.getTime();
  if (currentTime > time + secondsBetweenRockSpawns * 1000) {
    time = currentTime;
    spawnRock();
    if (secondsBetweenRockSpawns > 0.4) {// once we pass a threshold the difficulty should plateau
      secondsBetweenRockSpawns -= 0.01;
    } else {
      secondsBetweenRockSpawns -= 0.001;
    }
    secondsBetweenRockSpawns = constrain(secondsBetweenRockSpawns, 0.2, 1);
  }

  for (let i = rocks.length - 1; i >= 0; i--) {
    let rock = rocks[i];
    rock.move();

    // Increment score and delete rock when each rock goes offscreen
    if (rock.position.y > height + rock.radius) {
      scoreKeeper.incrementScore();
      rocks.splice(i, 1);
    }
  }

  canoe.render();
  canoe.move();

  let isCollisionDetected = canoe.detectCollision(rocks);

  if (isCollisionDetected) {
    let { x, y } = canoe.position;
    explosions.push(new Explosion(x, y));
    isGameOver = true;
  }
}

function spawnRock() {
  let rockRadius = width * random(0.05, 0.12);
  let rock = new Rock(random(width), -rockRadius, rockRadius);
  rocks.push(rock);
}

function restartGame() {
  // reset to initial conditions
  isGameOver = false;
  gameOverScreen.deactivateGameOverScreen();
  gameOverScreenBeingActivated = false;

  date = new Date();
  time = date.getTime();
  secondsBetweenRockSpawns = 1;

  rocks = [];
  explosions = [];
  canoe.position.x = width * 0.5;
  canoe.position.y = height * 0.8;

  scoreKeeper.resetScore();
  restartButton.style.display = 'none';
}

restartButton.addEventListener('click', restartGame);

class Rock {
  constructor(x, y, radius) {
    this.position = createVector(x, y);
    this.radius = radius;
    this.fill = random(45, 105); // random gray color
    this.speed = height * 0.01;
    this.shadowSize = height * 0.01;
    this.maxRandomSplashVal = height * 0.005; // for splash illusion
  }

  move() {
    this.position.y += this.speed;
  }

  render() {
    let m = this.maxRandomSplashVal;
    let r = this.radius;
    let { x, y } = this.position;

    push();
    noStroke();
    translate(this.position.x, this.position.y);

    fill(250, 245, 255, 230); // SPLASH ZONE (to help make the rock seem like it's actually in the river)
    ellipse(random(-m, m) - this.shadowSize * 0.5, this.shadowSize + random(-m, m), r * 2.1);

    fill(this.fill * 0.5); // SHADOW
    ellipse(-this.shadowSize, 0, r * 2);

    fill(this.fill); // THE ACTUAL ROCK
    // ellipse(this.position.x, this.position.y, this.radius * 2);
    beginShape(); // draw a shape a little more interesting than a circle
    vertex(0, -r);
    quadraticVertex(r, -r, r, 0);
    quadraticVertex(r, r, 0, r);
    quadraticVertex(-r, r, -r, 0);
    quadraticVertex(-r, -r, 0, -r);
    endShape();

    pop();
  }}


class Canoe {
  constructor(x, y, size) {
    this.position = createVector(x, y);
    this.moveDirection = createVector(0, 0);
    this.size = size;
    this.animationDuration = 1; // in seconds
    this.framesPerAnimationCycle = FPS * this.animationDuration;
    this.angle = 0;
    this.rotationVal = PI * 0.125;
    this.history = []; // for trailing bubbles (to help convey movement)
    this.maxBubbles = 40;
    this.bubbleSize = height * 0.01;
    this.ySpeed = height * 0.005; // for the bubbles
  }

  switchMoveDirectionX(type) {
    switch (type) {
      case 'left':
        this.moveDirection.x = -1;
        this.angle = -this.rotationVal;
        break;
      case 'right':
        this.moveDirection.x = 1;
        this.angle = this.rotationVal;
        break;
      default:
        this.moveDirection.x = 0;
        this.angle = 0;}

  }

  switchMoveDirectionY(type) {
    switch (type) {
      case 'up':
        this.moveDirection.y = -1;
        break;
      case 'down':
        this.moveDirection.y = 1;
        break;
      default:
        this.moveDirection.y = 0;}

  }

  move() {
    const speed = this.size * 0.05;

    this.moveX(speed); // horizontal movement
    this.moveY(speed); // vertical movement

    this.addToHistory(); // for trailing bubbles wake effect
  }

  moveX(speed) {
    const directionX = this.moveDirection.x;
    if (this.position.x < 0) {
      this.position.x = 0;
    } else if (this.position.x > width) {
      this.position.x = width;
    } else {
      this.position.x += speed * directionX;
    }
  }

  moveY(speed) {
    const directionY = this.moveDirection.y;
    if (this.position.y < 0) {
      this.position.y = 0;
    } else if (this.position.y > height) {
      this.position.y = height;
    } else {
      this.position.y += speed * directionY;
    }
  }

  addToHistory() {// for trailing bubbles wake effect
    this.history.push([this.position.x, this.position.y]);
    if (this.history.length > this.maxBubbles) {
      this.history.splice(0, 1);
    }
    this.history = this.history.map(h => [h[0], h[1] + this.ySpeed]);
  }

  detectCollision(rocks) {
    let isCollisionDetected = false;
    for (let i = rocks.length - 1; i >= 0; i--) {
      let rock = rocks[i];
      let rockX = rock.position.x;
      let rockY = rock.position.y;
      let { x, y } = this.position;
      let canoeCollisionRadius = this.size * 0.175;

      let distance = Math.sqrt((rockX - x) * (rockX - x) + (rockY - y) * (rockY - y));
      if (distance < rock.radius + canoeCollisionRadius) {
        // rock-canoe collision detected!
        isCollisionDetected = true;
      }
    };
    return isCollisionDetected;
  }

  renderBubbles() {
    push();
    const lengthOfCanoe = this.size;
    const bubbleSize = this.bubbleSize;
    const maxBubbles = this.maxBubbles;

    this.history.forEach(function (h, i) {
      const [x, y] = h;
      const maxDispersion = map(i, 0, maxBubbles, lengthOfCanoe, lengthOfCanoe * 0.1);
      const alpha = map(i, 0, maxBubbles, 0, 255);
      fill(255, alpha);
      noStroke();
      ellipse(x + random(-maxDispersion, maxDispersion), y + lengthOfCanoe * 0.1, bubbleSize);
    });
    pop();
  }

  render() {
    this.renderBubbles(); // for trailing bubbles wake effect

    let framesPerCyclePercent = frameCount % this.framesPerAnimationCycle / this.framesPerAnimationCycle;

    push();

    translate(this.position.x, this.position.y);
    rotate(this.angle);

    noStroke();
    fill(50, 33, 16); // Shadow for depth illusion
    ellipse(-2, 2, this.size * 0.25, this.size);
    fill(139, 103, 66); // sandy brown canoe body
    ellipse(0, 0, this.size * 0.25, this.size);

    fill(55, 0, 179); // purple paddle
    rectMode(CENTER);

    let paddleAngle = 0; // animate the paddle's angle (always the same movement)
    let maxAngleMag = PI * 0.15;
    if (framesPerCyclePercent < 0.25) {
      paddleAngle = map(framesPerCyclePercent, 0, 0.25, 0, maxAngleMag);
    } else if (framesPerCyclePercent < 0.5) {
      paddleAngle = map(framesPerCyclePercent, 0.25, 0.5, maxAngleMag, 0);
    } else if (framesPerCyclePercent < 0.75) {
      paddleAngle = map(framesPerCyclePercent, 0.5, 0.75, 0, -maxAngleMag);
    } else if (framesPerCyclePercent < 1) {
      paddleAngle = map(framesPerCyclePercent, 0.75, 1, -maxAngleMag, 0);
    }
    rotate(paddleAngle);

    rect(0, 0, this.size * 0.75, this.size * 0.025); // paddle handle/shaft part

    let angleDiffEpsilon = maxAngleMag * 0.5; // this section is for displaying the paddle blade and hiding it when "under water"
    if (maxAngleMag - paddleAngle < angleDiffEpsilon) {
      rect(-this.size * 0.375, 0, this.size * 0.1, this.size * 0.05);
    } else if (maxAngleMag + paddleAngle < angleDiffEpsilon) {
      rect(this.size * 0.375, 0, this.size * 0.1, this.size * 0.05);
    } else {
      rect(-this.size * 0.375, 0, this.size * 0.1, this.size * 0.05);
      rect(this.size * 0.375, 0, this.size * 0.1, this.size * 0.05);
    }

    fill(33);
    ellipse(0, 0, this.size * 0.2); // the brave hero in the canoe

    pop();
  }}


class GameOverScreen {
  constructor() {
    this.isActivated = false;
  }

  deactivateGameOverScreen() {
    this.isActivated = false;
  }

  activateGameOverScreen() {
    this.isActivated = true;
  }

  render(finalScore) {
    push();

    fill(11, 11, 11, 225); // semi-transparent dark overlay
    noStroke();
    rect(0, 0, width, height);

    fill(255); // white text
    textAlign(CENTER, CENTER);

    textSize(24);
    text("Score", width * 0.5, height * 0.4);

    textSize(48);
    text(finalScore, width * 0.5, height * 0.5);

    textSize(48);
    text('GAME OVER', width * 0.5, height * 0.15);

    pop();
  }}


class Explosion {
  constructor(x, y) {
    this.explosion = new Particle(x, y);
    this.particles = [];
    this.numberOfParticles = 100;

    this.explode();
  }

  done() {
    if (this.particles.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();

      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }

  explode() {
    for (let i = 0; i < this.numberOfParticles; i++) {
      const p = new Particle(this.explosion.position.x, this.explosion.position.y);
      this.particles.push(p);
    }
  }

  show() {
    for (var i = 0; i < this.particles.length; i++) {
      this.particles[i].show();
    }
  }}


class Particle {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.lifespan = 255; // particles fade away after a certain amount of time
    this.velocity = p5.Vector.random2D();
    this.velocity.mult(random(5, 15));
    this.size = height * 0.007;
  }

  update() {
    this.velocity.mult(0.9);
    this.lifespan -= 4;
    this.position.add(this.velocity);
  }

  done() {
    if (this.lifespan < 0) {
      return true;
    } else {
      return false;
    }
  }

  show() {
    push();

    strokeWeight(this.size);
    stroke(101, 67, 33);
    point(this.position.x, this.position.y);

    pop();
  }}


// CONTROLS
// 🎮 🕹 ⌨️ 🖱 📱

function keyPressed() {// arrows and 'wasd'
  if (keyCode === LEFT_ARROW || keyCode === 65) {// 65 is the 'a' key
    canoe.switchMoveDirectionX('left');
  } else if (keyCode === RIGHT_ARROW || keyCode === 68) {// 68 is the 'd' key
    canoe.switchMoveDirectionX('right');
  }
  if (keyCode === UP_ARROW || keyCode === 87) {// 87 is the 'w' key
    canoe.switchMoveDirectionY('up');
  } else if (keyCode === DOWN_ARROW || keyCode === 83) {// 83 is the 's' key
    canoe.switchMoveDirectionY('down');
  }
}

function keyReleased() {
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    canoe.switchMoveDirectionX('none');
  } else if (keyCode === 65 || keyCode === 68) {
    canoe.switchMoveDirectionX('none');
  } else if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
    canoe.switchMoveDirectionY('none');
  } else if (keyCode === 87 || keyCode === 83) {
    canoe.switchMoveDirectionY('none');
  }
}

function mousePressed() {// horizontal movement only for mouse and touch
  const canoeX = canoe.position.x;
  if (mouseX < canoeX) {
    canoe.switchMoveDirectionX('left');
  } else if (mouseX > canoeX) {
    canoe.switchMoveDirectionX('right');
  }
  // return false; // prevent default
}

function mouseReleased() {
  canoe.switchMoveDirectionX('none');
  // return false; // prevent default
}