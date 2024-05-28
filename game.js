const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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
};

const game = new Phaser.Game(config);

let hero;
let enemy1;
let enemy2;

function preload() {
  // Загрузите ресурсы здесь, если они есть
}

function create() {
  // Создание героя
  hero = this.add.circle(400, 300, 10, 0x0000ff);
  this.physics.add.existing(hero);
  hero.body.setCollideWorldBounds(true);
  hero.speed = 200;

  // Создание первого врага
  enemy1 = this.add.circle(100, 100, 10, 0xff0000);
  this.physics.add.existing(enemy1);
  enemy1.body.setCollideWorldBounds(true);
  enemy1.speed = 100;

  // Создание второго врага
  enemy2 = this.add.circle(700, 500, 10, 0xff0000);
  this.physics.add.existing(enemy2);
  enemy2.body.setCollideWorldBounds(true);
  enemy2.speed = 50;

  // Включение физики пересечения
  this.physics.add.collider(hero, enemy1);
  this.physics.add.collider(hero, enemy2);
  this.physics.add.collider(enemy1, enemy2);

  // Отслеживание курсора мыши
  this.input.on("pointermove", function (pointer) {
    hero.targetX = pointer.worldX;
    hero.targetY = pointer.worldY;
  });
}

function update(time, delta) {
  // Движение героя к курсору
  if (hero.targetX !== undefined && hero.targetY !== undefined) {
    this.physics.moveTo(hero, hero.targetX, hero.targetY, hero.speed);
  }

  // Движение врага1 к герою
  this.physics.moveToObject(enemy1, hero, enemy1.speed);

  // Движение врага2 к герою
  this.physics.moveToObject(enemy2, hero, enemy2.speed);
}
