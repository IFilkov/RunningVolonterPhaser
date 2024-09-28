// window.localStorage.clear();
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
  input: {
    gamepad: true, // Включаем поддержку геймпадов
  },
};

const game = new Phaser.Game(config);

let hero;
let enemy1;
let enemy2;
let enemy3;
let enemy4;
let enemy5;
let enemy6;
let graphics;
let scoreText;
let score = 0;
let healthBar;
let healthBarBg;
let health = 100; // Начальный уровень здоровья

let cursors;
let pointer;
let gamepad;

let gridWidth, gridHeight; // Количество ячеек по ширине и высоте

let isAutoPlay = false;
let targetSpectator = null;

// Инициализация текста для TopScore
let topScore = localStorage.getItem("topScore")
  ? parseInt(localStorage.getItem("topScore"))
  : 0;
let topScoreText;
let newRecordText;
let gameOver = false;

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
let isMoving = false; // Флаг, показывающий, что герой в движении

const collisionCooldown = 1000; // Задержка в миллисекундах между уменьшением здоровья

let autoPlayEnabled = false; // Флаг для режима AutoPlay
let randomPoints = []; // Массив для хранения случайных точек
let currentPointIndex = 0; // Индекс текущей точки

let heroDirectionX = 0;
let heroDirectionY = 0;
let movingRandomly = false;

let direction = { x: 1, y: 1 };
let speed = 100; // скорость передвижения
let changeDirectionTime = 2000; // смена направления каждые 8 секунд
let lastDirectionChange = 0;
let controlMode = "autopilot"; // Режим управления: 'autopilot', 'mouse', 'gamepad'
let mousePos = { x: 0, y: 0 }; // Позиция курсора

function preload() {
  if (!this.textures.exists("empty")) {
    const canvas = this.textures.createCanvas("empty", 1, 1).context;
    canvas.fillStyle = "rgba(0,0,0,0)";
    canvas.fillRect(0, 0, 1, 1);
    this.textures.get("empty").refresh();
  }
}

// Функция смены направления
function changeDirection() {
  direction.x = Phaser.Math.Between(-1, 1);
  direction.y = Phaser.Math.Between(-1, 1);

  // Убедимся, что направление не равно нулю по обеим осям
  if (direction.x === 0 && direction.y === 0) {
    direction.x = 1;
  }
}
// Функция случайного перемещения
function moveRandomly(time, delta) {
  if (time - lastDirectionChange > changeDirectionTime) {
    changeDirection();
    lastDirectionChange = time;
  }

  // Обновление позиции круга на экране
  hero.x += direction.x * speed * (delta / 1000);
  hero.y += direction.y * speed * (delta / 1000);

  // Проверка границ экрана и отражение
  if (hero.x <= 0 || hero.x >= config.width) {
    direction.x *= -1;
  }
  if (hero.y <= 0 || hero.y >= config.height) {
    direction.y *= -1;
  }
}

// Функция, которая генерирует несколько случайных точек
function generateRandomPoints() {
  randomPoints = [];
  for (let i = 0; i < 5; i++) {
    // Генерируем 5 случайных точек
    const randomX = Phaser.Math.Between(100, 700); // Координаты в пределах экрана
    const randomY = Phaser.Math.Between(100, 500);
    randomPoints.push({ x: randomX, y: randomY });
  }
}

// Функция, которая перемещает героя к следующей точке
function moveToNextPoint() {
  if (currentPointIndex >= randomPoints.length || !autoPlayEnabled) {
    // Если все точки пройдены или режим AutoPlay отключен, остановим движение
    hero.body.velocity.set(0, 0);
    return;
  }

  // Берем следующую точку
  const targetPoint = randomPoints[currentPointIndex];

  // Плавно перемещаем героя к следующей точке
  scene.physics.moveTo(hero, targetPoint.x, targetPoint.y, 150); // Скорость - 150

  // Проверяем, достиг ли герой этой точки
  const distance = Phaser.Math.Distance.Between(
    hero.x,
    hero.y,
    targetPoint.x,
    targetPoint.y
  );
  if (distance < 10) {
    // Останавливаем героя
    hero.body.velocity.set(0, 0);
    currentPointIndex++; // Переходим к следующей точке

    // Двигаем героя к следующей точке через небольшой таймаут
    scene.time.delayedCall(500, moveToNextPoint); // Задержка перед движением к следующей точке
  } else {
    // Если не достиг, продолжаем двигаться в следующем update
    scene.time.delayedCall(50, moveToNextPoint); // Продолжаем проверять каждые 50ms
  }
}

function toggleHeroVisibility() {
  if (hero.visible) {
    hero.body.enable = false; // Отключаем физику героя
    // scene.physics.moveToObject(hero, currentTarget, 100);
    // Переместить героя за пределы видимой области
    // hero.x = -1000;
    // hero.y = -1000;
    generateRandomPoints(); // Генерируем случайные точки
    moveToNextPoint(); // Начинаем движение к первой точке
    hero.color = "white";
    hero.setVelocity(0, 0);
    hero.visible = false;
    console.log("Hero is now hidden");
  } else {
    // Вернуть героя на изначальное место
    hero.body.enable = true;
    hero.x = 400;
    hero.y = 300;
    hero.visible = true;
    console.log("Hero is now visible");
  }
}

function moveHeroToTarget(targetSpectator) {
  if (hero.target) {
    this.physics.moveToObject(hero, target, hero.speed); // Убедитесь, что this указывает на объект сцены
    console.log("ВЫВОД В АВТОПЛЕЙ");
  }
}

if (isAutoPlay && targetSpectator) {
  moveHeroToTarget.call(this, targetSpectator); // Привязываем this
}

function toggleAutoPlay() {
  isAutoPlay = !isAutoPlay;

  if (isAutoPlay) {
    toggleHeroVisibility();
    moveHeroToTarget();
    // Найти ближайшего зрителя
    targetSpectator = findClosestSpectator();
    autoPlayText.setVisible(true);

    console.log("AutoPlay activated. Target spectator:", targetSpectator);

    if (targetSpectator) {
      moveToTarget(targetSpectator);
    }
  } else {
    // Сброс скорости героя при деактивации автопилота
    hero.body.enable = true;
    hero.x = 400;
    hero.y = 300;
    hero.visible = true;
    // hero.setVelocity(0, 0);
    autoPlayText.setVisible(false);
    hero.setVisible(true); // Показать героя
    console.log("AutoPlay deactivated. Manual control restored.");
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
  enemy2.speed = 160;
  enemy2.setCollideWorldBounds(true);

  enemy3 = this.physics.add.image(400, 500, "empty");
  enemy3.radius = spectatorRadius;
  enemy3.color = 0x663300;
  enemy3.speed = 110;
  enemy3.setCollideWorldBounds(true);

  enemy4 = this.physics.add.image(50, 150, "empty");
  enemy4.radius = spectatorRadius;
  enemy4.color = 0xcccc00;
  enemy4.speed = 90;
  enemy4.setCollideWorldBounds(true);

  enemy5 = this.physics.add.image(150, 150, "empty");
  enemy5.radius = spectatorRadius;
  enemy5.color = 0x99ffff;
  enemy5.speed = 190;
  enemy5.setCollideWorldBounds(true);

  enemy6 = this.physics.add.image(250, 250, "empty");
  enemy6.radius = spectatorRadius;
  enemy6.color = 0xff3300;
  enemy6.speed = 180;
  enemy6.setCollideWorldBounds(true);

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

  // Установка начальных координат цели
  hero.targetX = hero.x;
  hero.targetY = hero.y;

  // Вычисляем количество ячеек по горизонтали и вертикали
  gridWidth = this.sys.game.config.width / gridSize;
  gridHeight = this.sys.game.config.height / gridSize;

  // Настройка управления с клавиатуры
  // cursors = this.input.keyboard.createCursorKeys();

  // Настройка управления с сенсорного экрана и мыши
  this.input.on("pointermove", function (pointer) {
    hero.targetX = pointer.worldX;
    hero.targetY = pointer.worldY;
  });

  // // Настройка управления с геймпада
  // if (this.input.gamepad) {
  //   this.input.gamepad.once("connected", function (pad) {
  //     console.log("Gamepad connected:", pad.id);
  //     gamepad = pad;
  //   });

  //   this.input.gamepad.once("disconnected", function (pad) {
  //     console.log("Gamepad disconnected:", pad.id);
  //     gamepad = null;
  //   });
  // } else {
  //   console.log("Gamepad input is not supported or not initialized.");
  // }

  // this.input.gamepad.once("connected", function (pad) {
  //   console.log("Gamepad connected:", pad.id);
  // });
  // // Проверка наличия подключенных геймпадов
  // if (this.input.gamepad && this.input.gamepad.total > 0) {
  //   let pad = this.input.gamepad.getPad(0); // Получаем первый подключенный геймпад
  //   if (pad) {
  //     pad.removeAllListeners(); // Безопасно удаляем всех слушателей
  //   }
  // } else {
  //   console.error("No gamepad detected or not initialized.");
  // }

  // if (this.scene && this.scene.isActive()) {
  //   this.scene.removeAllListeners();
  // } else {
  //   console.warn("Scene is not active or does not exist.");
  // }

  // this.input.gamepad.once("connected", function (pad) {
  //   console.log("Gamepad connected:", pad.id);
  // });

  // this.input.keyboard.on("keydown-SPACE", () => toggleAutoPlay(this), this);
  this.input.keyboard.on("keydown-SPACE", () => {
    console.log("AutoMode");
    if (controlMode === "autopilot") {
      controlMode = "mouse";
    } else {
      controlMode = "autopilot";
    }
  });

  // Отслеживание позиции мыши
  this.input.on("pointermove", (pointer) => {
    mousePos.x = pointer.x;
    mousePos.y = pointer.y;
  });

  // Отслеживание события подключения геймпада
  this.input.gamepad.on("connected", (pad) => {
    gamepad = pad;
    console.log("Gamepad connected:", gamepad);
  });

  // Проверка на наличие геймпада (если подключен заранее)
  if (this.input.gamepad.total > 0) {
    gamepad = this.input.gamepad.getPad(0);
  }

  window.addEventListener("resize", resizeGame);

  // Рисуем места для зрителей
  drawSeats(50, 50, rows, cols); // Пример параметров: начальная позиция (50, 50), 20 рядов, 20 колонок

  // Создание текста для счётчика
  scoreText = this.add.text(config.width - 100, 20, "Score: 0", {
    fontSize: "20px",
    fill: "#000",
  });
  scoreText.setScrollFactor(0);

  topScoreText = this.add.text(
    config.width - 200,
    20,
    "Top Score: " + topScore,
    {
      fontSize: "20px",
      fill: "#000",
    }
  );
  topScoreText.setScrollFactor(0);

  autoPlayText = this.add
    .text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "AutoPlay",
      {
        fontSize: "48px",
        fill: "#f00",
      }
    )
    .setOrigin(0.5);
  autoPlayText.setVisible(false);

  // Инициализация текста New record!
  newRecordText = this.add.text(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    "New record!",
    { fontSize: "48px", fill: "#f00" }
  );
  newRecordText.setOrigin(0.5);
  newRecordText.setVisible(false);

  // Проверка, был ли установлен новый рекорд
  if (localStorage.getItem("newRecord") === "true") {
    localStorage.setItem("newRecord", "false");
    showNewRecordText();
  }

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
  this.physics.add.overlap(hero, enemy3, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy4, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy5, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy6, handleHeroEnemyCollision, null, this);
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
  this.physics.add.overlap(
    enemy3,
    this.spectatorGroup,
    handleEnemy3SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy4,
    this.spectatorGroup,
    handleEnemy4SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy5,
    this.spectatorGroup,
    handleEnemy5SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy6,
    this.spectatorGroup,
    handleEnemy6SpectatorCollision,
    null,
    this
  );
}

// let currentInput = "mouse"; // Текущий источник ввода: 'mouse' или 'gamepad'

// Основная функция обновления игры
function update(time, delta) {
  if (controlMode === "mouse") {
    moveToMouse(delta);
  } else if (controlMode === "gamepad" && gamepad) {
    moveWithGamepad(delta);
  } else {
    moveRandomly(time, delta);
  }

  // Проверяем нажатие кнопки A на геймпаде для переключения между геймпадом и автопилотом
  if (gamepad && gamepad.buttons[0].pressed && !isButtonPressed) {
    // Кнопка A на геймпаде
    isButtonPressed = true; // Отмечаем, что кнопка нажата
    if (controlMode === "autopilot") {
      controlMode = "gamepad";
    } else {
      controlMode = "autopilot";
    }
  }

  // Сбрасываем флаг, если кнопка A отпущена
  if (gamepad && !gamepad.buttons[0].pressed) {
    isButtonPressed = false;
  }

  graphics.clear();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(0, 0, config.width, config.height);

  drawCircle(hero.x, hero.y, hero.radius, hero.color);
  drawCircle(enemy1.x, enemy1.y, enemy1.radius, enemy1.color);
  drawCircle(enemy2.x, enemy2.y, enemy2.radius, enemy2.color);
  drawCircle(enemy3.x, enemy3.y, enemy3.radius, enemy3.color);
  drawCircle(enemy4.x, enemy4.y, enemy4.radius, enemy4.color);
  drawCircle(enemy5.x, enemy5.y, enemy5.radius, enemy5.color);
  drawCircle(enemy6.x, enemy6.y, enemy6.radius, enemy6.color);

  // Обновление позиций зрителей
  updateSpectators();

  // // Логика автопилота
  // if (isAutoPlay && targetSpectator) {
  //   moveHeroToTarget(targetSpectator);
  // }

  // // Логика ручного управления
  // if (!isAutoPlay && !isMoving) {
  //   updateHeroPosition.call(this);
  // }

  updateHeroPosition.call(this);
  updateEnemyPosition.call(this, enemy1);
  updateEnemyPosition.call(this, enemy2);
  updateEnemyPosition.call(this, enemy3);
  updateEnemyPosition.call(this, enemy4);
  updateEnemyPosition.call(this, enemy5);
  updateEnemyPosition.call(this, enemy6);
  // updateHeroPosition.call(this);
  // updateEnemy1Position.call(this);
  // updateEnemy2Position.call(this);

  // Обновление позиции счётчика и шкалы здоровья при изменении размера окна
  scoreText.setPosition(config.width / 2 - 50, 20);
  topScoreText.setPosition(config.width / 2 - 80, 600);
  healthBarBg.setPosition(config.width / 2 - 75, 50);
  updateHealthBar();

  let speed = 200;

  // Управление с клавиатуры
  // if (cursors.left.isDown) {
  //   hero.targetX = hero.x - speed;
  // } else if (cursors.right.isDown) {
  //   hero.targetX = hero.x + speed;
  // }

  // if (cursors.up.isDown) {
  //   hero.targetY = hero.y - speed;
  // } else if (cursors.down.isDown) {
  //   hero.targetY = hero.y + speed;
  // }

  // if (this.input.gamepad && this.input.gamepad.total > 0) {
  //   let pad = this.input.gamepad.getPad(0);

  //   if (pad) {
  //     // Управление левым стиком
  //     let leftStickX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
  //     let leftStickY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;

  //     // Управление правым стиком
  //     let rightStickX = pad.axes.length > 2 ? pad.axes[2].getValue() : 0;
  //     let rightStickY = pad.axes.length > 3 ? pad.axes[3].getValue() : 0;

  //     // Движение героя левым стиком
  //     if (Math.abs(leftStickX) > 0.1 || Math.abs(leftStickY) > 0.1) {
  //       hero.x += leftStickX * 10;
  //       hero.y += leftStickY * 10;
  //     }

  //     // Движение героя правым стиком
  //     if (Math.abs(rightStickX) > 0.1 || Math.abs(rightStickY) > 0.1) {
  //       hero.x += rightStickX * 10;
  //       hero.y += rightStickY * 10;
  //     }

  //     // Проверка кнопок D-Pad (если поддерживается)
  //     if (pad.left) {
  //       hero.x -= 10; // Двигаем героя влево
  //     }
  //     if (pad.right) {
  //       hero.x += 10; // Двигаем героя вправо
  //     }
  //     if (pad.up) {
  //       hero.y -= 10; // Двигаем героя вверх
  //     }
  //     if (pad.down) {
  //       hero.y += 10; // Двигаем героя вниз
  //     }

  //     // Обработка нажатия кнопок
  //     if (pad.buttons[0].pressed) {
  //       console.log("Button A pressed");
  //       // Добавьте действие при нажатии на кнопку A
  //       toggleHeroVisibility();
  //     }
  //     if (pad.buttons[1].pressed) {
  //       console.log("Button B pressed");
  //       // Добавьте действие при нажатии на кнопку B
  //     }
  //     if (pad.buttons[2].pressed) {
  //       console.log("Button X pressed");
  //       // Добавьте действие при нажатии на кнопку X
  //     }
  //     if (pad.buttons[3].pressed) {
  //       console.log("Button Y pressed");
  //       // Добавьте действие при нажатии на кнопку Y
  //     }
  //   }
  // }
  // // Управление мышью только если текущий ввод — мышь
  // if (currentInput === "mouse") {
  //   this.input.on("pointermove", function (pointer) {
  //     hero.targetX = pointer.worldX;
  //     hero.targetY = pointer.worldY;
  //   });

  // Движение героя к цели
  // if (hero.targetX !== undefined && hero.targetY !== undefined) {
  //   let dx = hero.targetX - hero.x;
  //   let dy = hero.targetY - hero.y;
  //   let distance = Math.sqrt(dx * dx + dy * dy);

  //   if (distance > 1) {
  //     hero.x += (dx / distance) * 5;
  //     hero.y += (dy / distance) * 5;
  //   }
  // }
  // }

  // // Управление с геймпада
  // if (gamepad) {
  //   vx = gamepad.axes[0].getValue() * speed; // Левый стик по оси X
  //   vy = gamepad.axes[1].getValue() * speed; // Левый стик по оси Y

  //   if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
  //     hero.targetX = hero.x + vx;
  //     hero.targetY = hero.y + vy;
  //   }

  //   // Если нужна поддержка кнопок, например, прыжок
  //   if (gamepad.buttons[0].pressed) {
  //     // Кнопка A на геймпаде
  //     hero.setVelocityY(-300); // Прыжок
  //   }
  // }
  // Проверяем наличие геймпада
  // if (this.input.gamepad && this.input.gamepad.total > 0) {
  //   let pad = this.input.gamepad.getPad(0); // Получаем первый подключенный геймпад

  //   if (pad) {
  //     // Проверка кнопок D-Pad (если поддерживается)
  //     if (pad.left) {
  //       hero.x -= 5; // Двигаем героя влево
  //     }
  //     if (pad.right) {
  //       hero.x += 5; // Двигаем героя вправо
  //     }
  //     if (pad.up) {
  //       hero.y -= 5; // Двигаем героя вверх
  //     }
  //     if (pad.down) {
  //       hero.y += 5; // Двигаем героя вниз
  //     }

  //     // Проверка аналоговых стиков
  //     let leftStickX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
  //     let leftStickY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;

  //     if (leftStickX < -0.1) {
  //       hero.x -= 5;
  //     } else if (leftStickX > 0.1) {
  //       hero.x += 5;
  //     }

  //     if (leftStickY < -0.1) {
  //       hero.y -= 5;
  //     } else if (leftStickY > 0.1) {
  //       hero.y += 5;
  //     }

  //     // Выводим данные в консоль для отладки
  //     console.log("Left Stick X:", leftStickX);
  //     console.log("Left Stick Y:", leftStickY);
  //   }
  // } else {
  //   console.log("No gamepad detected or not initialized.");
  // }

  // Движение героя к цели
  // if (hero.targetX !== undefined && hero.targetY !== undefined) {
  //   let dx = hero.targetX - hero.x;
  //   let dy = hero.targetY - hero.y;
  //   let distance = Math.sqrt(dx * dx + dy * dy);

  //   if (distance > 5) {
  //     // Если нужно, регулируйте значение, чтобы определить, когда герой остановится
  //     hero.setVelocity((dx / distance) * speed, (dy / distance) * speed);
  //   } else {
  //     hero.setVelocity(0, 0); // Остановите героя, когда он достигнет цели
  //   }
  // }
}

// Переключение на управление мышью, когда пользователь использует мышь
// this.input.on("pointermove", function (pointer) {
//   currentInput = "mouse";
// });

// Функция перемещения к мыши
function moveToMouse(delta) {
  const dx = mousePos.x - hero.x;
  const dy = mousePos.y - hero.y;
  const angle = Math.atan2(dy, dx);

  hero.x += Math.cos(angle) * speed * (delta / 1000);
  hero.y += Math.sin(angle) * speed * (delta / 1000);
}

// Функция перемещения с геймпада
function moveWithGamepad(delta) {
  const axisX = gamepad.axes[0].getValue(); // Горизонтальная ось (левый стик)
  const axisY = gamepad.axes[1].getValue(); // Вертикальная ось (левый стик)

  hero.x += axisX * speed * (delta / 1000);
  hero.y += axisY * speed * (delta / 1000);

  // Проверка границ экрана и отражение
  if (hero.x <= 0 || hero.x >= config.width) {
    direction.x *= -1;
  }
  if (hero.y <= 0 || hero.y >= config.height) {
    direction.y *= -1;
  }
}

function drawCircle(x, y, radius, color) {
  graphics.fillStyle(color, 1);
  graphics.fillCircle(x, y, radius);
}

function updateHeroPosition() {
  if (isAutoPlay && targetSpectator) {
    moveHeroToTarget(targetSpectator);
  } else {
    if (hero.targetX !== undefined && hero.targetY !== undefined) {
      this.physics.moveTo(hero, hero.targetX, hero.targetY, hero.speed);
      // Проверяем, достиг ли герой цели
      if (
        Phaser.Math.Distance.Between(
          hero.x,
          hero.y,
          hero.targetX,
          hero.targetY
        ) < 10
      ) {
        hero.body.setVelocity(0, 0); // Останавливаем героя
        hero.body.reset(hero.targetX, hero.targetY); // Фиксируем позицию героя
      }
    }
  }
}
// function updateHeroPosition() {
//   if (isAutoPlay && targetSpectator) {
//     moveHeroToTarget(targetSpectator);
//   } else {
//     // Логика перемещения героя вручную или по клавишам
//     if (this.cursors.left.isDown) {
//       hero.setVelocityX(-hero.speed);
//     } else if (this.cursors.right.isDown) {
//       hero.setVelocityX(hero.speed);
//     } else {
//       hero.setVelocityX(0);
//     }

//     if (this.cursors.up.isDown) {
//       hero.setVelocityY(-hero.speed);
//     } else if (this.cursors.down.isDown) {
//       hero.setVelocityY(hero.speed);
//     } else {
//       hero.setVelocityY(0);
//     }
//   }
// }

function updateEnemyPosition(enemy) {
  if (hero && enemy) {
    if (enemy === enemy3) {
      const targetSpectator = findClosestSpectatorToEnemy3();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }
    if (enemy === enemy1) {
      const targetSpectator = findClosestSpectatorForEnemy1();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy2) {
      const targetSpectator = handleEnemy2Behavior.call(this);
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy4) {
      const targetSpectator = findClosestSpectatorToEnemy4();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy5) {
      const targetSpectator = findClosestSpectatorToEnemy5();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy6) {
      const targetSpectator = findClosestSpectatorToEnemy6();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

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

      const isYellow = (spectators.length + 1) % 10 === 0; // Логика для каждого десятого зрителя
      const spectator = {
        x,
        y,
        targetX: target.x,
        targetY: target.y,
        speed: randomSpeed,
        color: isYellow ? 0xffff00 : 0x000000, // Устанавливаем желтый цвет для каждого десятого зрителя
        moving: true,
        scored: false, // Флаг для проверки начисления очков
        // новые свойства
        inCollisionWithHero: false, // Флаг коллизии с героем
        inCollisionWithEnemy1: false, // Флаг коллизии с врагом1
        inCollisionWithEnemy2: false, // Флаг коллизии с врагом2
        inCollisionWithEnemy3: false, // Флаг коллизии с врагом3
        targetedByEnemy3: false, // Флаг преследования врагом3
        inCollisionWithEnemy4: false,
        targetedByEnemy4: false,
        inCollisionWithEnemy5: false,
        targetedByEnemy5: false,
        inCollisionWithEnemy6: false,
        targetedByEnemy6: false,
        isYellow: isYellow, // Флаг для желтого зрителя
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

      // Устанавливаем цвет зрителя
      spectator.sprite.setTint(spectator.color);
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
        if (spectator.inCollisionWithEnemy3) {
          spectator.inCollisionWithEnemy3 = false;
          enemy3.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy4) {
          spectator.inCollisionWithEnemy4 = false;
          enemy4.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy5) {
          spectator.inCollisionWithEnemy5 = false;
          enemy5.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy6) {
          spectator.inCollisionWithEnemy6 = false;
          enemy6.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
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

function handleHeroSpectatorCollision(hero, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  if (spectator && !spectator.inCollisionWithHero) {
    // Устанавливаем флаг коллизии зрителя с героем
    spectator.inCollisionWithHero = true;

    // Перекрашиваем зрителя в синий цвет
    spectator.color = 0x0000ff;
    spectator.sprite.setTint(spectator.color);
    // Обработка желтых зрителей
    if (spectator.isYellow) {
      // Прибавка к здоровью на 10%, но не больше максимума
      health = Math.min(health + 10, 100); // Прибавляем 10% здоровья
      updateHealthBar();
    }

    // Герой получает очки за зрителя, если он не желтый
    if (!spectator.isYellow) {
      score += 1;
      scoreText.setText("Score: " + score);
    }

    // Сбрасываем флаги коллизий зрителя с врагами
    spectator.inCollisionWithEnemy1 = false;
    spectator.inCollisionWithEnemy2 = false;
    spectator.inCollisionWithEnemy3 = false;
    spectator.inCollisionWithEnemy4 = false;
    spectator.inCollisionWithEnemy5 = false;
    spectator.inCollisionWithEnemy6 = false;

    // Если зрителя преследует враг, сбрасываем targetSpectator у врага
    if (enemy1.targetSpectator === spectator) {
      enemy1.targetSpectator = null;
    }
    if (enemy2.targetSpectator === spectator) {
      enemy2.targetSpectator = null;
    }
    if (enemy3.targetSpectator === spectator) {
      enemy3.targetSpectator = null;
    }
    if (enemy4.targetSpectator === spectator) {
      enemy4.targetSpectator = null;
    }
    if (enemy5.targetSpectator === spectator) {
      enemy5.targetSpectator = null;
    }
    if (enemy6.targetSpectator === spectator) {
      enemy6.targetSpectator = null;
    }
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

function handleEnemy1SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);
  if (
    spectator &&
    !spectator.inCollisionWithHero &&
    !spectator.inCollisionWithEnemy1
  ) {
    spectator.color = 0xffa500; // Перекрашиваем зрителя в оранжевый цвет
    spectator.inCollisionWithEnemy1 = true;
    enemy.targetSpectator = spectator; // Враг1 переключается на этого зрителя
    console.log("Set inCollisionWithEnemy1 to true for spectator:", spectator);
    score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
    scoreText.setText("Score: " + score);
  }
}

function handleEnemy2SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);
  if (
    spectator &&
    !spectator.inCollisionWithHero &&
    !spectator.inCollisionWithEnemy2
  ) {
    spectator.color = 0x800080; // Перекрашиваем зрителя в фиолетовый цвет
    spectator.inCollisionWithEnemy2 = true;
    enemy.targetSpectator = spectator; // Враг2 переключается на этого зрителя
    console.log("Set inCollisionWithEnemy2 to true for spectator:", spectator);
    score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
    scoreText.setText("Score: " + score);
  }
}

function handleEnemy3SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  console.log("Enemy3 collision detected:");
  console.log("Spectator found:", spectator);
  console.log(
    "Spectator in collision with hero:",
    spectator?.inCollisionWithHero
  );
  console.log(
    "Spectator in collision with enemy3:",
    spectator?.inCollisionWithEnemy3
  );

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy3) {
      console.log("Spectator was already in collision with enemy3.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy3
    ) {
      console.log("Updating spectator color and score.");
      spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет
      spectator.inCollisionWithEnemy3 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy3 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy3:",
        spectator.inCollisionWithEnemy3
      );
      console.log("Hero's score:", score);
    }
  }
}

function handleEnemy4SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy4) {
      console.log("Spectator was already in collision with enemy4.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy4
    ) {
      console.log("Updating spectator color and score.");
      spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет
      spectator.inCollisionWithEnemy4 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy4 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      // score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      score = Math.max(score + 1);
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy4:",
        spectator.inCollisionWithEnemy4
      );
      console.log("Hero's score:", score);
    }
  }
}

function handleEnemy5SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy5) {
      console.log("Spectator was already in collision with enemy5.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy5
    ) {
      console.log("Updating spectator color and score.");
      spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет
      spectator.inCollisionWithEnemy5 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy5 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      // score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      score = Math.max(score + 1);
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy5:",
        spectator.inCollisionWithEnemy5
      );
      console.log("Hero's score:", score);
    }
  }
}

function handleEnemy6SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy6) {
      console.log("Spectator was already in collision with enemy6.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy6
    ) {
      console.log("Updating spectator color and score.");
      // spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет

      const randomColor = Phaser.Display.Color.RandomRGB().color;

      spectator.color = randomColor;
      hero.color = randomColor;
      spectator.inCollisionWithEnemy6 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy6 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      // score = Math.max(score + 1);
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy6:",
        spectator.inCollisionWithEnemy6
      );
      console.log("Hero's score:", score);
    }
  }
}
// Функция для обновления шкалы здоровья
function updateHealthBar() {
  healthBar.clear();
  const healthBarWidth = 150 * (health / 100);
  const healthBarColor = health <= 20 ? 0xff0000 : 0x00ff00; // Красный цвет при <= 20%, иначе зелёный
  healthBar.fillStyle(healthBarColor, 1);
  healthBar.fillRect(config.width / 2 - 75, 50, (health / 100) * 150, 20);
}

// Движение героя к целевому зрителю
function moveToTarget(scene, targetSpectator) {
  if (targetSpectator) {
    scene.physics.moveToObject(scene.hero, targetSpectator, heroSpeed); // heroSpeed - скорость героя
  }
}

function moveHeroRandomly() {
  hero.setVelocityX(heroDirectionX * hero.speed);
  hero.setVelocityY(heroDirectionY * hero.speed);
  console.log("Я ТУТ!");
}

function findClosestSpectator() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  moveHeroRandomly();

  spectators.forEach((spectator) => {
    const distance = Phaser.Math.Distance.Between(
      hero.x,
      hero.y,
      spectator.x,
      spectator.y
    );
    if (distance < closestDistance && !spectator.inCollisionWithHero) {
      closestDistance = distance;
      closestSpectator = spectator;
    }
  });

  return closestSpectator;
}

function findClosestSpectatorForEnemy1() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator ||
      spectator === enemy4.targetSpectator ||
      spectator === enemy5.targetSpectator ||
      spectator === enemy6.targetSpectator;

    if (!spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy1.x,
        enemy1.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function findClosestSpectatorToEnemy3() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy1.targetSpectator ||
      spectator === enemy2.targetSpectator;

    if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy3.x,
        enemy3.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function findClosestSpectatorToEnemy4() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy1.targetSpectator ||
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator;

    if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy4.x,
        enemy4.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function findClosestSpectatorToEnemy5() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy1.targetSpectator ||
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator ||
      spectator === enemy4.targetSpectator ||
      spectator === enemy6.targetSpectator;

    if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy5.x,
        enemy5.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function findClosestSpectatorToEnemy6() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy1.targetSpectator ||
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator ||
      spectator === enemy4.targetSpectator ||
      spectator === enemy5.targetSpectator;

    if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy6.x,
        enemy6.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}
function findClosestSpectatorForEnemy2() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    if (
      !spectator.inCollisionWithEnemy2 &&
      !spectator.inCollisionWithEnemy1 &&
      !spectator.inCollisionWithEnemy3 &&
      !spectator.inCollisionWithEnemy4 &&
      !spectator.inCollisionWithEnemy5 &&
      !spectator.inCollisionWithEnemy6
    ) {
      const distance = Phaser.Math.Distance.Between(
        enemy2.x,
        enemy2.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function handleEnemy2Behavior() {
  const closestSpectator = findClosestSpectatorForEnemy2();
  if (closestSpectator) {
    enemy2.targetSpectator = closestSpectator;
    this.physics.moveToObject(enemy2, closestSpectator, enemy2.speed);
  } else {
    this.physics.moveToObject(enemy2, hero, enemy2.speed);
  }
}

function showNewRecordText(scene) {
  newRecordText.setVisible(true);
  game.scene.scenes[0].time.delayedCall(4000, () => {
    newRecordText.setVisible(false);
  });
}

function restartGame() {
  // Обновление Top Score
  if (score > topScore) {
    topScore = score;
    localStorage.setItem("topScore", topScore);
    localStorage.setItem("newRecord", "true"); // Установка флага нового рекорда
    topScoreText.setText("Top Score: " + topScore);

    // Показать текст нового рекорда
    // showNewRecordText();
  }

  // Сброс текущих очков
  score = 0;
  scoreText.setText("Score: " + score);

  // Сброс здоровья
  health = 100;
  updateHealthBar();

  // Очистка зрителей и врагов
  spectators.forEach((spectator) => {
    if (spectator.sprite) {
      spectator.sprite.destroy();
    }
  });
  spectators.length = 0;

  enemy1.targetSpectator = null;
  enemy2.targetSpectator = null;
  enemy3.targetSpectator = null;

  // Перезапуск игры (перезапуск сцены)

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
