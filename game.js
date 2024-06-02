const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#ffffff",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

let hero;
let enemy1;
let enemy2;
let graphics;
const spectators = [];
const spectatorRadius = 10;
const spectatorSpeed = 50;
const gridSize = 50; // Размер клетки сетки
const rows = 20; // Количество рядов
const cols = 20; // Количество колонок
const seatWidth = 15;
const seatHeight = 15;
const seatGap = 5; // Промежуток между сидениями
const rowGap = seatHeight; // Промежуток между рядами
let seats = []; // Массив мест для зрителей

function preload() {
  // No assets to load for this example
}

function create() {
  graphics = this.add.graphics({ fillStyle: { color: 0xffffff } });

  hero = this.physics.add.image(400, 300, null);
  hero.radius = 20;
  hero.color = 0x0000ff;
  hero.speed = 200;
  hero.setCollideWorldBounds(true);

  enemy1 = this.physics.add.image(100, 100, null);
  enemy1.radius = 20;
  enemy1.color = 0x000000;
  enemy1.speed = 100;
  enemy1.setCollideWorldBounds(true);

  enemy2 = this.physics.add.image(700, 500, null);
  enemy2.radius = 20;
  enemy2.color = 0xff0000;
  enemy2.speed = 100;
  enemy2.setCollideWorldBounds(true);

  // Создание зрителей
  createSpectatorPositions();
  this.time.addEvent({
    delay: 1000,
    callback: addSpectator,
    callbackScope: this,
    loop: true,
  });

  this.input.on("pointermove", function (pointer) {
    hero.targetX = pointer.worldX;
    hero.targetY = pointer.worldY;
  });

  window.addEventListener("resize", resizeGame);

  // Рисуем места для зрителей
  drawSeats(50, 50, rows, cols); // Пример параметров: начальная позиция (50, 50), 20 рядов, 20 колонок
}

function update() {
  graphics.clear();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(0, 0, config.width, config.height);

  drawCircle(hero.x, hero.y, hero.radius, hero.color);
  drawCircle(enemy1.x, enemy1.y, enemy1.radius, enemy1.color);
  drawCircle(enemy2.x, enemy2.y, enemy2.radius, enemy2.color);

  // Обновление позиций зрителей
  updateSpectators();

  updateHeroPosition.call(this);
  updateEnemyPosition.call(this, enemy1);
  updateEnemyPosition.call(this, enemy2);
}

function drawCircle(x, y, radius, color) {
  graphics.fillStyle(color, 1);
  graphics.fillCircle(x, y, radius);
}

function updateHeroPosition() {
  if (hero.targetX !== undefined && hero.targetY !== undefined) {
    this.physics.moveTo(hero, hero.targetX, hero.targetY, hero.speed);
  }
}

function updateEnemyPosition(enemy) {
  if (hero && enemy) {
    this.physics.moveToObject(enemy, hero, enemy.speed);
  }
}

function resizeGame() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  game.scale.resize(width, height);
}

// Функция для создания позиций зрителей в виде сетки
function createSpectatorPositions() {
  const startX = 50; // Начальная позиция X для сетки мест
  const startY = 50; // Начальная позиция Y для сетки мест

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      spectators.push({
        x: startX + j * (seatWidth + seatGap),
        y: startY + i * (seatHeight + rowGap + seatGap),
        occupied: false,
      });
    }
  }
}

// Функция для добавления зрителя
function addSpectator() {
  const y = Phaser.Math.Between(0, config.height);
  const x = config.width + spectatorRadius; // Начальная позиция за пределами правой стороны холста
  const target = spectators.find((pos) => !pos.occupied);
  if (target) {
    target.occupied = true;
    spectators.push({
      x,
      y,
      targetX: target.x,
      targetY: target.y,
      color: 0x000000,
      moving: true,
    });
  }
}

// Функция для обновления позиций зрителей
function updateSpectators() {
  spectators.forEach((spectator) => {
    if (spectator.moving) {
      const angle = Phaser.Math.Angle.Between(
        spectator.x,
        spectator.y,
        spectator.targetX,
        spectator.targetY
      );
      spectator.x +=
        (Math.cos(angle) * spectatorSpeed * game.loop.delta) / 1000;
      spectator.y +=
        (Math.sin(angle) * spectatorSpeed * game.loop.delta) / 1000;

      if (
        Phaser.Math.Distance.Between(
          spectator.x,
          spectator.y,
          spectator.targetX,
          spectator.targetY
        ) < 1
      ) {
        spectator.moving = false;
      }
    }
    drawCircle(spectator.x, spectator.y, spectatorRadius, spectator.color);
  });
}

// Функция для рисования мест для зрителей
function drawSeats(startX, startY, rows, cols) {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let x = startX + j * (seatWidth + seatGap);
      let y = startY + i * (seatHeight + seatGap + rowGap);
      graphics.fillStyle(0xc0c0c0, 1);
      graphics.fillRect(x, y, seatWidth, seatHeight);
    }
  }
}
