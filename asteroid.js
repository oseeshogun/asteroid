/**
 * Frames per secondes
 */
const FPS = 30;
/**
 * Ship size
 */
const SHIP_SIZE = 30;
/**
 * ROTATION SPEED
 * in degrees per seconds
 */
const TURN_SPEED = 360;
/**
 * ACCELERATION OF THE SHIP
 */
const SHIP_THRUST = 5;
/**
 * duration of the ship explosion
 */
const SHIP_EXPLOSION_DURATION = 0.3;
/**
 * in this time, the ship in invulnerable
 */
const SHIP_INVULNERABILITY_DURATION = 3;
const SHIP_BLINK_DURATION = 0.1;
/**
 * FRICTION OF THE SHIP
 * where 0 is no friction
 * and 1 lost of friction
 */
const FRICTION = 0.7;
/**
 * ASTEROID STARTING NUMBER
 */
const ASTEROIDS_NUM = 3;
/**
 * ASTEROID SPEED
 * max speed in pixels per seconds
 */
const ASTEROIDS_SPEED = 50;
/**
 * ASTEROID SIZE
 * sterting size of asteroids in pixels
 */
const ASTEROIDS_SIZE = 100;
/**
 * ASTEROID VERTICES
 * average number rof vertices on each asteroid
 */
const ASTEROIDS_VERT = 10;
const SMALL_ASTEROIDS_POINT = 100;
const MEDIUM_ASTEROIDS_POINT = 50;
const LARGE_ASTEROIDS_POINT = 20;
/**
 * ASTEROID JAG
 * make asteroid to be less smooth
 * 0 means no jag
 * 1 lots
 */
const ASTEROIDS_JAG = 0.4;
/**
 * maximum number of laser in the screen
 */
const LASER_MAX = 10;
/**
 * laser speed in pixels per second
 */
const LASER_SPEED = 500;
/**
 * maximum distance laser can travel as fraction of screen width
 */
const LASER_DISTANCE = 0.6;
/**
 * duration of the lasers explosion in seconds
 */
const LASER_EXPLODE_DURATION = 0.1;
/**
 * text fade time in seconds
 */
const TEXT_FADE_TIME = 2.5;
/**
 * text font size
 */
const TEXT_SIZE = 40;
const GAME_LIVES = 3;

/** @type {HTMLCanvasElement} */
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

class Sound {
  constructor(src, maxStreams = 1, vol = 1.0) {
    this.maxStreams = maxStreams;
    this.streamNum = 0;
    this.streams = [];
    for (let i = 0; i < maxStreams; i++) {
      this.streams.push(new Audio(src));
      this.streams[i].volume = vol;
    }
  }

  play() {
    this.streamNum = (this.streamNum + 1) % this.maxStreams;
    this.streams[this.streamNum].play();
  }

  stop() {
    this.streams[this.streamNum].pause();
    this.streams[this.streamNum].currentTime = 0;
  }
}

// set up sounds effects
var fxLaser = new Sound("sounds/fire.wav", 2, 0.5);
var fxbangLarge = new Sound("sounds/bangLarge.wav", 2, 0.5);
var fxbangMedium = new Sound("sounds/bangMedium.wav", 2, 0.5);
var fxbangSmall = new Sound("sounds/bangSmall.wav", 2, 0.5);
var fxThrust = new Sound("sounds/thrust.wav", 2, 0.5);

// set up the music
var music = new Audio("sounds/astronomia.mp3");
music.volume = 0.2;
music.loop = true;

// set up game parameters
var level, lives, score, highestScore, ship, asteroids, text, textAlpha;
newGame();

// set up the game loop
setInterval(update, 1000 / FPS);

// set up handlers
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function keyDown(/** @type [KeyboardEvent] */ event) {
  if (ship.dead) return;
  switch (event.keyCode) {
    case 32: // space (shoot laser)
      shoot();
      break;
    case 37: // left arrow (rotate ship left)
      ship.rot = ((TURN_SPEED / 180) * Math.PI) / FPS;
      break;
    case 38: // up arrow (thrust the ship forward)
      ship.thrusting = true;
      break;
    case 39: // right arrow (rotate ship right)
      ship.rot = ((-TURN_SPEED / 180) * Math.PI) / FPS;
      break;

    default:
      break;
  }
}

function keyUp(/** @type [KeyboardEvent] */ event) {
  if (ship.dead) return;
  switch (event.keyCode) {
    case 32: // space (shoot laser)
      ship.canShoot = true;
      break;
    case 37: // left arrow (stop rotating ship left)
      ship.rot = 0;
      break;
    case 38: // up arrow (stop thrusting)
      ship.thrusting = false;
      break;
    case 39: // right arrow (stop rotating ship right)
      ship.rot = 0;
      break;

    default:
      break;
  }
}

function shoot() {
  // create laser
  if (ship.canShoot && ship.lasers.length < LASER_MAX) {
    ship.lasers.push({
      x: ship.x + (4 / 3) * ship.r * Math.cos(ship.a),
      y: ship.y - (4 / 3) * ship.r * Math.sin(ship.a),
      xv: (LASER_SPEED * Math.cos(ship.a)) / FPS,
      yv: -(LASER_SPEED * Math.sin(ship.a)) / FPS,
      distance: 0,
      explodeTime: 0
    });
    fxLaser.play();
  }
  // prevent further shooting
  ship.canShoot = false;
}

function explode() {
  ship.explodeTime = Math.ceil(SHIP_EXPLOSION_DURATION * FPS);
}

function distance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

function createAsteroidBelt() {
  asteroids = [];
  var x, y;
  for (let i = 0; i < ASTEROIDS_NUM + level; i++) {
    do {
      [x, y] = [
        Math.floor(Math.random() * canvas.width),
        Math.floor(Math.random() * canvas.height)
      ];
    } while (distance(ship, { x: x, y: y }) < ASTEROIDS_SIZE * 2 + ship.r);
    asteroids.push(createAsteroid(x, y, Math.ceil(ASTEROIDS_SIZE / 2)));
  }
}

function createAsteroid(x, y, r) {
  var difficulty = 1 + 0.1 * level;
  var asteroid = {
    x: x,
    y: y,
    xv:
      ((Math.random() * ASTEROIDS_SPEED * difficulty) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    yv:
      ((Math.random() * ASTEROIDS_SPEED * difficulty) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    r: r,
    a: Math.random() * Math.PI * 2,
    vert: Math.floor(Math.random() * (ASTEROIDS_VERT * 1) + ASTEROIDS_VERT / 2),
    offset: []
  };
  // create the vertex offset array
  for (let i = 0; i < asteroid.vert; i++) {
    asteroid.offset.push(Math.random() * ASTEROIDS_JAG * 2 + 1 - ASTEROIDS_JAG);
  }

  return asteroid;
}

function destroyAsteroid(index) {
  let asteroid = asteroids[index];

  // split the asteroid if necessary
  if (asteroid.r === Math.ceil(ASTEROIDS_SIZE / 2)) {
    asteroids.push(
      createAsteroid(asteroid.x, asteroid.y, Math.ceil(ASTEROIDS_SIZE / 4))
    );
    asteroids.push(
      createAsteroid(asteroid.x, asteroid.y, Math.ceil(ASTEROIDS_SIZE / 4))
    );
    score += LARGE_ASTEROIDS_POINT;
    fxbangLarge.play();
  } else if (asteroid.r === Math.ceil(ASTEROIDS_SIZE / 4)) {
    asteroids.push(
      createAsteroid(asteroid.x, asteroid.y, Math.ceil(ASTEROIDS_SIZE / 8))
    );
    asteroids.push(
      createAsteroid(asteroid.x, asteroid.y, Math.ceil(ASTEROIDS_SIZE / 8))
    );
    score += MEDIUM_ASTEROIDS_POINT;
    fxbangMedium.play();
  } else {
    score += SMALL_ASTEROIDS_POINT;
    fxbangSmall.play();
  }
  // update hghest score
  if (score > highestScore) {
    highestScore = score;
    localStorage.setItem("highscore", highestScore);
  }
  // remove the main asteroid
  asteroids.splice(index, 1);

  // adding nnew level if no more asteroids left
  if (asteroids.length === 0) {
    level++;
    newLevel();
  }
}

function createShip() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    r: SHIP_SIZE / 2,
    a: (90 / 180) * Math.PI,
    blinkNum: Math.ceil(SHIP_INVULNERABILITY_DURATION / SHIP_BLINK_DURATION),
    blinkTime: Math.ceil(SHIP_BLINK_DURATION * FPS),
    explodeTime: 0,
    rot: 0,
    canShoot: true,
    lasers: [],
    dead: false,
    thrusting: false,
    thrust: {
      x: 0,
      y: 0
    }
  };
}

function drawShip(x, y, a, color = "#fff") {
  ctx.strokeStyle = color;
  ctx.lineWidth = SHIP_SIZE / 20;
  ctx.beginPath();
  ctx.moveTo(
    x + (4 / 3) * ship.r * Math.cos(a),
    y - (4 / 3) * ship.r * Math.sin(a)
  );
  ctx.lineTo(
    x - ship.r * ((2 / 3) * Math.cos(a) + Math.sin(a)),
    y + ship.r * ((2 / 3) * Math.sin(a) - Math.cos(a))
  );
  ctx.lineTo(
    x - ship.r * ((2 / 3) * Math.cos(a) - Math.sin(a)),
    y + ship.r * ((2 / 3) * Math.sin(a) + Math.cos(a))
  );
  ctx.closePath();
  ctx.stroke();
}

function update() {
  var blinkOn = ship.blinkNum % 2 === 0;
  // verify if the ship is exploding
  var exploding = ship.explodeTime > 0;

  // play music
  if (music.paused) music.play();

  // draw space
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // thrust the ship
  if (ship.thrusting && !ship.dead) {
    ship.thrust.x += (SHIP_THRUST * Math.cos(ship.a)) / FPS;
    ship.thrust.y -= (SHIP_THRUST * Math.sin(ship.a)) / FPS;
    fxThrust.play();
    if (!exploding) {
      if (blinkOn) {
        // draw the thruster
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = SHIP_SIZE / 20;
        ctx.beginPath();
        ctx.moveTo(
          ship.x -
            ship.r * ((2 / 3) * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
          ship.y +
            ship.r * ((2 / 3) * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
        );
        ctx.lineTo(
          ship.x - (6 / 3) * ship.r * Math.cos(ship.a),
          ship.y + (6 / 3) * ship.r * Math.sin(ship.a)
        );
        ctx.lineTo(
          ship.x -
            ship.r * ((2 / 3) * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
          ship.y +
            ship.r * ((2 / 3) * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  } else {
    ship.thrust.x -= (FRICTION * ship.thrust.x) / FPS;
    ship.thrust.y -= (FRICTION * ship.thrust.y) / FPS;
    fxThrust.stop();
  }

  if (!exploding) {
    if (blinkOn && !ship.dead) {
      // draw ship
      drawShip(ship.x, ship.y, ship.a);
    }

    // handle blinking
    if (ship.blinkNum > 0) {
      // reduce blink time
      ship.blinkTime--;
      // reduce blink num
      if (ship.blinkTime === 0) {
        ship.blinkTime = Math.ceil(SHIP_BLINK_DURATION * FPS);
        ship.blinkNum--;
      }
    }
  } else {
    // draw explosion
    ctx.fillStyle = "darkred";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.2, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.1, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.6, 0, Math.PI * 2, false);
    ctx.fill();
  }
  // draw steroids
  ctx.strokeStyle = "slategrey";
  ctx.lineWidth = SHIP_SIZE / 20;
  for (let i = 0; i < asteroids.length; i++) {
    const asteroid = asteroids[i];
    // draw a path
    ctx.beginPath();
    ctx.moveTo(
      asteroid.x + asteroid.r * asteroid.offset[0] * Math.cos(asteroid.a),
      asteroid.y + asteroid.r * asteroid.offset[0] * Math.sin(asteroid.a)
    );
    // draw the polygon
    for (let j = 0; j < asteroid.vert; j++) {
      ctx.lineTo(
        asteroid.x +
          asteroid.r *
            asteroid.offset[j] *
            Math.cos(asteroid.a + (j * Math.PI * 2) / asteroid.vert),
        asteroid.y +
          asteroid.r *
            asteroid.offset[j] *
            Math.sin(asteroid.a + (j * Math.PI * 2) / asteroid.vert)
      );
    }
    ctx.closePath();
    ctx.stroke();
  }

  for (let i = 0; i < ship.lasers.length; i++) {
    const laser = ship.lasers[i];
    if (laser.explodeTime === 0) {
      // draw lasers
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(laser.x, laser.y, SHIP_SIZE / 15, 0, Math.PI * 2, false);
      ctx.fill();
    } else {
      // draw explosion
      ctx.fillStyle = "orangered";
      ctx.beginPath();
      ctx.arc(laser.x, laser.y, ship.r - 0.75, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(laser.x, laser.y, ship.r - 0.5, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "pink";
      ctx.beginPath();
      ctx.arc(laser.x, laser.y, ship.r - 0.25, 0, Math.PI * 2, false);
      ctx.fill();
    }
  }

  // detect laser hits on asteroid
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];

    // loop over the lasers
    for (let j = ship.lasers.length - 1; j >= 0; j--) {
      const laser = ship.lasers[j];

      // detect hits
      if (laser.explodeTime === 0 && distance(asteroid, laser) < asteroid.r) {
        // destroy asteroid
        destroyAsteroid(i);
        // activate laser explosion
        ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DURATION * FPS);
        break;
      }
    }
  }

  if (!exploding) {
    if (ship.blinkNum === 0 && !ship.dead) {
      // checking collision
      for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];
        if (distance(ship, asteroid) < ship.r + asteroid.r) {
          explode();
          destroyAsteroid(i);
          break;
        }
      }
    }

    // rotate ship
    ship.a += ship.rot;
    // move the ship
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
  } else {
    ship.explodeTime--;

    if (ship.explodeTime === 0) {
      lives--;
      if (lives == 0) {
        gameOver();
      } else {
        ship = createShip();
      }
    }
  }
  // handle edge of screen
  if (ship.x < 0) {
    ship.x = canvas.width;
  } else if (ship.x > canvas.width) {
    ship.x = 0;
  }
  if (ship.y < 0) {
    ship.y = canvas.height;
  } else if (ship.y > canvas.height) {
    ship.y = 0;
  }

  for (let i = ship.lasers.length - 1; i >= 0; i--) {
    const laser = ship.lasers[i];
    // check distance travelled
    if (laser.distance > LASER_DISTANCE * canvas.width) {
      ship.lasers.splice(i, 1);
      continue;
    }

    // handle explosion
    if (laser.explodeTime > 0) {
      ship.lasers[i].explodeTime--;
      if (ship.lasers[i].explodeTime === 0) {
        ship.lasers.splice(i, 1);
        continue;
      }
    } else {
      // move lasers
      ship.lasers[i].x += laser.xv;
      ship.lasers[i].y += laser.yv;
      // calculate the distance travelled
      ship.lasers[i].distance += distance(
        { x: 0, y: 0 },
        { x: laser.xv, y: laser.yv }
      );
    }

    // handle edge of screen
    if (laser.x < 0) {
      laser.x = canvas.width;
    } else if (laser.x > canvas.width) {
      laser.x = 0;
    }
    if (laser.y < 0) {
      laser.y = canvas.height;
    } else if (laser.y > canvas.height) {
      laser.y = 0;
    }
  }

  for (let i = 0; i < asteroids.length; i++) {
    const asteroid = asteroids[i];

    // move the asteroids
    asteroids[i].x += asteroid.xv;
    asteroids[i].y += asteroid.yv;
    // handle edge of screen for asteroids
    if (asteroids[i].x < 0 - asteroids[i].r) {
      asteroids[i].x = canvas.width + asteroids[i].r;
    } else if (asteroids[i].x > canvas.width + asteroids[i].r) {
      asteroids[i].x = 0 - asteroids[i].r;
    }
    if (asteroids[i].y < 0 - asteroids[i].r) {
      asteroids[i].y = canvas.height + asteroids[i].r;
    } else if (asteroids[i].y > canvas.height + asteroids[i].r) {
      asteroids[i].y = 0 - asteroids[i].r;
    }
  }

  // draw text
  if (textAlpha >= 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,255,255," + textAlpha + ")";
    ctx.font = "small-caps " + TEXT_SIZE + "px dejavu sans mono";
    ctx.fillText(text, canvas.width / 2, canvas.height * 0.75);
    textAlpha -= 1.0 / TEXT_FADE_TIME / FPS;
  } else if (ship.dead) {
    newGame();
  }
  // draw the lives
  for (let i = 0; i < lives; i++) {
    lifeColour = exploding && i == lives - 1 ? "red" : "rgba(255,255,255,0.8)";

    drawShip(
      SHIP_SIZE + i * SHIP_SIZE * 1.2,
      SHIP_SIZE,
      0.5 * Math.PI,
      lifeColour
    );
  }
  // draw the score
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = TEXT_SIZE + "px dejavu sans mono";
  ctx.fillText(score, canvas.width - SHIP_SIZE, SHIP_SIZE);
  textAlpha -= 1.0 / TEXT_FADE_TIME / FPS;

  // draw the highest score
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = TEXT_SIZE * 0.75 + "px dejavu sans mono";
  ctx.fillText("Best score: " + highestScore, canvas.width / 2, SHIP_SIZE);
  textAlpha -= 1.0 / TEXT_FADE_TIME / FPS;

  // center dot
  ctx.fillStyle = "#ff0000";
  // ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
}

function gameOver() {
  ship.dead = true;
  text = "Game Over";
  textAlpha = 1.0;
}

function newLevel() {
  text = "Level " + level;
  textAlpha = 1.0;
  createAsteroidBelt();
}

function newGame() {
  level = 1;
  lives = GAME_LIVES;
  score = 0;
  highestScore = localStorage.getItem("highscore");
  if (highestScore === null) {
    highestScore = 0;
  } else {
    highestScore = parseInt(highestScore);
  }
  ship = createShip();

  newLevel();
}
