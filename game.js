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
let scoreText;
let score = 0;
let healthBar;
let healthBarBg;
let health = 100; // Начальный уровень здоровья
const spectators = [];
const spectatorRadius = 10;
const gridSize = 50; // Размер клетки сетки
const rows = 20; // Количество рядов
const cols = 20; // Количество колонок
const seatWidth = 15;
const seatHeight = 15;
const seatGap = 5; // Промежуток между сидениями
const rowGap = seatHeight; // Промежуток между рядами
let seats = []; // Массив мест для зрителей
let availableSeats = []; // Доступные места
let lastEnemyCollisionTime = 0; // Время последней коллизии с врагом
const collisionCooldown = 1000; // Задержка в миллисекундах между уменьшением здоровья

function preload() {
  if (!this.textures.exists("empty")) {
    const canvas = this.textures.createCanvas("empty", 1, 1).context;
    canvas.fillStyle = "rgba(0,0,0,0)";
    canvas.fillRect(0, 0, 1, 1);
    this.textures.get("empty").refresh();
  }
}

function updateEnemy1Position() {
  if (enemy1.active) {
    const targetX = Phaser.Math.Between(0, config.width);
    const targetY = Phaser.Math.Between(0, config.height);
    this.physics.moveTo(enemy1, targetX, targetY, enemy1.speed);
  }
}

// Функция для обновления позиции врага 2
function updateEnemy2Position() {
  if (enemy2.active) {
    const targetX = Phaser.Math.Between(0, config.width);
    const targetY = Phaser.Math.Between(0, config.height);
    this.physics.moveTo(enemy2, targetX, targetY, enemy2.speed);
  }
}

function create() {
  graphics = this.add.graphics({ fillStyle: { color: 0xffffff } });

  hero = this.physics.add.image(400, 300, "empty");
  hero.radius = spectatorRadius;
  hero.color = 0x0000ff;
  hero.speed = 200;
  hero.setCollideWorldBounds(true);

  enemy1 = this.physics.add.image(100, 100, "empty");
  enemy1.radius = spectatorRadius;
  enemy1.color = 0x000000;
  enemy1.speed = 100;
  enemy1.setCollideWorldBounds(true);

  enemy2 = this.physics.add.image(700, 500, "empty");
  enemy2.radius = spectatorRadius;
  enemy2.color = 0xff0000;
  enemy2.speed = 60;
  enemy2.setCollideWorldBounds(true);

  // Создание группы зрителей для обработки коллизий
  this.spectatorGroup = this.physics.add.group();

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

  // Создание текста для счётчика
  scoreText = this.add.text(config.width - 100, 20, "Score: 0", {
    fontSize: "20px",
    fill: "#000",
  });
  scoreText.setScrollFactor(0);

  // Создание фона для шкалы здоровья
  healthBarBg = this.add.graphics();
  healthBarBg.fillStyle(0x000000, 1);
  healthBarBg.fillRect(config.width - 200, 50, 150, 20);
  healthBarBg.setScrollFactor(0);

  // Создание шкалы здоровья
  healthBar = this.add.graphics();
  healthBar.setScrollFactor(0);
  updateHealthBar();

  // Обработка коллизий
  this.physics.add.overlap(
    hero,
    this.spectatorGroup,
    handleHeroSpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(hero, enemy1, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy2, handleHeroEnemyCollision, null, this);

  // Обработка коллизий между врагами и зрителями
  this.physics.add.overlap(
    enemy1,
    this.spectatorGroup,
    handleEnemy1SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy2,
    this.spectatorGroup,
    handleEnemy2SpectatorCollision,
    null,
    this
  );
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

  // updateHeroPosition.call(this);
  updateEnemyPosition.call(this, enemy1);
  updateEnemyPosition.call(this, enemy2);
  updateHeroPosition.call(this);
  // updateEnemy1Position.call(this);
  // updateEnemy2Position.call(this);

  // Обновление позиции счётчика и шкалы здоровья при изменении размера окна
  scoreText.setPosition(config.width - 100, 20);
  healthBarBg.setPosition(config.width - 200, 50);
  updateHealthBar();
}

function drawCircle(x, y, radius, color) {
  graphics.fillStyle(color, 1);
  graphics.fillCircle(x, y, radius);
}

function updateHeroPosition() {
  if (hero.targetX !== undefined && hero.targetY !== undefined) {
    this.physics.moveTo(hero, hero.targetX, hero.targetY, hero.speed);
    // Проверяем, достиг ли герой цели
    if (
      Phaser.Math.Distance.Between(hero.x, hero.y, hero.targetX, hero.targetY) <
      10
    ) {
      hero.body.setVelocity(0, 0); // Останавливаем героя
      hero.body.reset(hero.targetX, hero.targetY); // Фиксируем позицию героя
    }
  }
}

function updateEnemyPosition(enemy) {
  if (hero && enemy) {
    if (enemy.targetSpectator && !enemy.targetSpectator.moving) {
      enemy.targetSpectator = null;
    }

    if (enemy.targetSpectator) {
      this.physics.moveToObject(enemy, enemy.targetSpectator, enemy.speed);
    } else {
      this.physics.moveToObject(enemy, hero, enemy.speed);
    }
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

  spectators.length = 0; // Очищаем массив зрителей
  availableSeats.length = 0; // Очищаем массив доступных мест

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const seat = {
        x: startX + j * (seatWidth + seatGap),
        y: startY + i * (seatHeight + rowGap + seatGap),
        occupied: false,
      };
      spectators.push(seat);
      availableSeats.push(seat);
    }
  }
}

// Функция для добавления зрителя
function addSpectator() {
  if (availableSeats.length > 0) {
    const y = Phaser.Math.Between(0, config.height);
    const x = config.width + spectatorRadius; // Начальная позиция за пределами правой стороны холста
    const targetIndex = Phaser.Math.Between(0, availableSeats.length - 1);
    const target = availableSeats.splice(targetIndex, 1)[0]; // Удаляем место из доступных и получаем его

    if (target) {
      target.occupied = true;
      const randomSpeed = Phaser.Math.Between(40, 100); // Случайная скорость от 40 до 100
      const spectator = {
        x,
        y,
        targetX: target.x,
        targetY: target.y,
        speed: randomSpeed,
        color: 0x000000,
        moving: true,
        scored: false, // Флаг для проверки начисления очков
      };
      spectators.push(spectator);
      const spectatorSprite = game.scene.scenes[0].spectatorGroup.create(
        spectator.x,
        spectator.y,
        "empty"
      );
      spectatorSprite.radius = spectatorRadius;
      spectatorSprite.setCircle(spectatorRadius); // Установим круглый коллайдер для спрайта
      spectatorSprite.setCollideWorldBounds(true);
      spectator.sprite = spectatorSprite;
    }
  }
}

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
        (Math.cos(angle) * spectator.speed * game.loop.delta) / 1000;
      spectator.y +=
        (Math.sin(angle) * spectator.speed * game.loop.delta) / 1000;

      if (
        Phaser.Math.Distance.Between(
          spectator.x,
          spectator.y,
          spectator.targetX,
          spectator.targetY
        ) < 1
      ) {
        spectator.moving = false;
        spectator.color = 0x008800;
        spectator.sprite.setPosition(spectator.targetX, spectator.targetY); // Обновляем позицию спрайта
        if (spectator.inCollisionWithEnemy1) {
          spectator.inCollisionWithEnemy1 = false;
          enemy1.targetSpectator = null; // Враг 1 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy2) {
          spectator.inCollisionWithEnemy2 = false;
          enemy2.targetSpectator = null; // Враг 2 больше не преследует этого зрителя
        }
      }
    }
    drawCircle(spectator.x, spectator.y, spectatorRadius, spectator.color);

    // Обновляем позицию спрайта зрителя
    if (spectator.sprite) {
      spectator.sprite.setPosition(spectator.x, spectator.y); // Обновляем позицию спрайта
    }
  });
}

// Обработчик коллизий героя со зрителями
function handleHeroSpectatorCollision(hero, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);
  if (spectator && !spectator.scored) {
    spectator.color = 0x0000ff; // Перекрашиваем зрителя в голубой цвет
    score += 1;
    scoreText.setText("Score: " + score);
    spectator.scored = true;
    spectator.inCollisionWithHero = true; // Флаг, что зритель был в коллизии с героем

    // Увеличение здоровья героя на 10%
    health += 10;
    if (health > 100) {
      health = 100; // Ограничиваем здоровье максимумом в 100%
    }
    updateHealthBar();
  }
}

// Функция для обработки коллизий героя с врагами
function handleHeroEnemyCollision(hero, enemy) {
  const currentTime = this.time.now;

  if (currentTime - lastEnemyCollisionTime > collisionCooldown) {
    if (health > 0) {
      health -= 10;
      if (health <= 0) {
        health = 0;
        restartGame();
      }
      updateHealthBar();
      enemy.body.setVelocity(0, 0); // Останавливаем врага при коллизии
      enemy.body.reset(enemy.x, enemy.y); // Фиксируем позицию врага

      // Обновляем время последней коллизии
      lastEnemyCollisionTime = currentTime;
    }
  }
}

// Обработчик коллизий врага 1 со зрителями
function handleEnemy1SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);
  if (spectator && !spectator.scored) {
    if (!spectator.inCollisionWithHero) {
      spectator.color = 0xffa500; // Оранжевый цвет при коллизии с врагом 1
    }
    // Враг 1 продолжает преследовать героя
    this.physics.moveToObject(enemy1, hero, enemy1.speed);
  }
}

// Обработчик коллизий врага 2 со зрителями
function handleEnemy2SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);
  if (spectator && !spectator.scored && !spectator.inCollisionWithEnemy2) {
    if (!spectator.inCollisionWithHero && !spectator.inCollisionWithEnemy1) {
      spectator.color = 0x8a2be2; // Фиолетовый цвет при коллизии с врагом 2
      spectator.inCollisionWithEnemy2 = true;
      enemy2.targetSpectator = spectator;
    }
  }
}

// Функция для обновления шкалы здоровья
function updateHealthBar() {
  healthBar.clear();
  const healthBarWidth = 150 * (health / 100);
  const healthBarColor = health <= 20 ? 0xff0000 : 0x00ff00; // Красный цвет при <= 20%, иначе зелёный
  healthBar.fillStyle(healthBarColor, 1);
  healthBar.fillRect(config.width - 200, 50, healthBarWidth, 20);
}

// Функция для перезапуска игры
function restartGame() {
  score = 0;
  health = 100;
  spectators.length = 0;
  availableSeats.length = 0;
  game.scene.scenes[0].scene.restart();
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
