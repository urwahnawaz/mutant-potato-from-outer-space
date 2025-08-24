import Phaser from "phaser"; 
 
const  W = 960; 
const H = 540;
const FLOOR_Y = H - 80;


// Tunables 
const GRAV = 1800;     // px/s^2
const SPEED = 300;     // px/s
const JUMP_V = -650;   // px/s
const BULLET_V = 700;  // px/s
const FARMER_SPEED = 120;

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
    this.score = 0;
    this.lastShotTime = 0;
    this.shotCooldown = 90; // ms; replaces the distance trick in pygame
  }

  preload() {
    // No external assets; generate simple textures
    // (potato, farmer, bullet, ground)
    this.createRectTexture("potato", 40, 40, 0xdaad6a);   // tan
    this.createRectTexture("farmer", 40, 40, 0xc85050);    // red
    this.createRectTexture("bullet", 12, 8, 0xfbe678);     // yellow
    this.createRectTexture("ground", W, H - FLOOR_Y, 0x3c4650);
  }

  createRectTexture(key, w, h, color) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  create() {
    // World & physics
    this.physics.world.setBounds(0, 0, W, H);
    this.physics.world.gravity.y = GRAV;

    // Background + ground
    this.add.rectangle(W / 2, H / 2, W, H, 0x14161e);
    const ground = this.add.image(W / 2, FLOOR_Y + (H - FLOOR_Y) / 2, "ground");
    this.physics.add.existing(ground, true); // static body as "floor" collision surface

    // Player (potato)
    this.player = this.physics.add.sprite(100, FLOOR_Y - 20, "potato");
    this.player.setCollideWorldBounds(true);
    // Collide with ground "platform"
    this.physics.add.collider(this.player, ground);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // Bullets group (Arcade Physics)
    this.bullets = this.physics.add.group({
      allowGravity: false
    });

    // Farmer enemy
    this.farmer = this.physics.add.sprite(680, FLOOR_Y - 20, "farmer");
    this.farmer.setCollideWorldBounds(true);
    this.physics.add.collider(this.farmer, ground);
    this.farmerDir = -1;

    // Bullet → farmer overlap
    this.physics.add.overlap(this.bullets, this.farmer, (bullet, farmer) => {
      bullet.destroy();
      this.onFarmerHit();
    });

    // Farmer → player collision (reset)
    this.physics.add.overlap(this.player, this.farmer, () => {
      this.onPlayerHit();
    });

    // UI
    this.scoreText = this.add.text(16, 16,
      "Score: 0   [Arrows] move  [Space] jump  [Z] shoot",
      { fontFamily: "monospace", fontSize: "18px", color: "#E6E6F0" }
    ).setScrollFactor(0);

    // Keep everything pixel-snapped
    this.cameras.main.setRoundPixels(true);
  }

  onFarmerHit() {
    this.score += 1;
    this.scoreText.setText(`Score: ${this.score}   [Arrows] move  [Space] jump  [Z] shoot`);
    // Respawn farmer to original spot & direction
    this.farmer.setPosition(680, FLOOR_Y - 20);
    this.farmerDir = -1;
    this.farmer.setVelocityX(0);
  }

  onPlayerHit() {
    this.score = 0;
    this.scoreText.setText(`Score: ${this.score}   [Arrows] move  [Space] jump  [Z] shoot`);
    // Reset player, bullets, farmer—mirrors your reset()
    this.player.setPosition(100, FLOOR_Y - 20);
    this.player.setVelocity(0, 0);
    this.bullets.clear(true, true);
    this.farmer.setPosition(680, FLOOR_Y - 20);
    this.farmer.setVelocity(0, 0);
    this.farmerDir = -1;
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Horizontal input
    let dir = 0;
    if (this.cursors.left.isDown) dir -= 1;
    if (this.cursors.right.isDown) dir += 1;

    this.player.setVelocityX(dir * SPEED);

    // Jump: only when touching down
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && onGround) {
      this.player.setVelocityY(JUMP_V);
    }

    // Shoot (with a tiny cooldown to avoid a bullet hose)
    if (this.keyZ.isDown && time - this.lastShotTime > this.shotCooldown) {
      const b = this.bullets.create(this.player.x + 20, this.player.y, "bullet");
      b.setVelocityX(BULLET_V);
      // auto-kill when offscreen
      b.setCollideWorldBounds(false);
      this.lastShotTime = time;
    }

    // Cull bullets off the right edge (buffer 50px)
    this.bullets.children.each(b => {
      if (!b.active) return;
      if (b.x > W + 50) b.destroy();
    });

    // Farmer patrol (flip between 520 and 900, like your bounds)
    const vx = FARMER_SPEED * this.farmerDir;
    this.farmer.setVelocityX(vx);

    if (this.farmer.getBounds().left < 520) this.farmerDir = 1;
    if (this.farmer.getBounds().right > 900) this.farmerDir = -1;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#141620",
  physics: {
    default: "arcade",
    arcade: {
      // debug: true,
      gravity: { y: 0 } // we'll set world gravity in the scene (create)
    }
  },
  scene: [MainScene]
});