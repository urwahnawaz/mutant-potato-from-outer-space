import Phaser from "phaser";

const W = 960;
const H = 540;
const FLOOR_Y = H - 80;

const GRAV = 1800;
const SPEED = 300;
const JUMP_V = -650;
const BULLET_V = 700;
const FARMER_SPEED = 120;

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
    this.score = 0;
    this.lastShotTime = 0;
    this.shotCooldown = 120; // ms
  }

  preload() {
    // served from /public (put your PNG at public/assets/sprites/mutantpotato.png)
    this.load.image("potato", "/assets/sprites/mutantpotato.png");

    // placeholder textures
    this._rect("farmer", 40, 40, 0xc85050);
    this._rect("bullet", 12, 8, 0xfbe678);
    this._rect("ground", W, H - FLOOR_Y, 0x3c4650);
  }

  _rect(key, w, h, color) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Fit Arcade Physics body to the DISPLAY size (after setScale)
  fitBodyToDisplay(sprite, wFrac = 1, hFrac = 1) {
    const dw = sprite.displayWidth * wFrac;
    const dh = sprite.displayHeight * hFrac;
    sprite.body.setSize(dw, dh);

    // center the body within the displayed sprite; anchor hitbox to bottom
    const oxDisplay = (sprite.displayWidth - dw) / 2;
    const oyDisplay = (sprite.displayHeight - dh);

    // Arcade offsets use frame pixels, so convert display -> frame
    const sx = sprite.displayWidth / sprite.width;
    const sy = sprite.displayHeight / sprite.height;
    sprite.body.setOffset(oxDisplay / sx, oyDisplay / sy);
  }

  create() {
    // world
    this.physics.world.setBounds(0, 0, W, H);
    this.physics.world.gravity.y = GRAV;

    // background + ground (top edge = FLOOR_Y)
    this.add.rectangle(W / 2, H / 2, W, H, 0x14161e);
    const ground = this.add.image(W / 2, FLOOR_Y, "ground").setOrigin(0.5, 0);
    this.physics.add.existing(ground, true);

    // player (potato)
    const POTATO_SCALE = 0.25;
    this.player = this.physics.add.sprite(100, FLOOR_Y, "potato")
      .setOrigin(0.5, 1)         // stand on floor
      .setScale(POTATO_SCALE)
      .setDepth(10)
      .setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);

    // make hitbox match the displayed sprite
    this.fitBodyToDisplay(this.player, 0.8, 0.9);

    // controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // bullets
    this.bullets = this.physics.add.group({ allowGravity: false });

    // farmer (uses origin 0.5,1 so y=FLOOR_Y stands on floor like player)
    this.farmer = this.physics.add.sprite(680, FLOOR_Y, "farmer")
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true);
    this.physics.add.collider(this.farmer, ground);
    this.farmerDir = -1;

    // bullet → farmer (safe: disable bodies, respawn after physics step)
    this.physics.add.overlap(this.bullets, this.farmer, (bullet, farmer) => {
      if (!bullet.active || !farmer.active) return;  // handle once
      bullet.disableBody(true, true);
      farmer.disableBody(true, true);

      this.time.delayedCall(60, () => {
        this.score += 1;
        this.scoreText.setText(this._uiText());
        farmer.enableBody(true, 680, FLOOR_Y, true, true);
        farmer.setOrigin(0.5, 1);
        farmer.setVelocity(0, 0);
        this.farmerDir = -1;
      });
    });

    // player → farmer (reset round)
    this.physics.add.overlap(this.player, this.farmer, () => this._resetRound());

    // UI
    this.scoreText = this.add.text(16, 16, this._uiText(), {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#E6E6F0"
    });

    this.cameras.main.setRoundPixels(true);
  }

  _uiText() {
    return `Score: ${this.score}   [Arrows] move  [Space] jump  [Z] shoot`;
  }

  _resetRound() {
    this.score = 0;
    this.scoreText.setText(this._uiText());
    // reset player
    this.player.setPosition(100, FLOOR_Y);
    this.player.setVelocity(0, 0);
    // clear bullets
    this.bullets.clear(true, true);
    // reset farmer
    this.farmer.enableBody(true, 680, FLOOR_Y, true, true);
    this.farmer.setOrigin(0.5, 1);
    this.farmer.setVelocity(0, 0);
    this.farmerDir = -1;
  }

  update(time, delta) {
    // movement
    let dir = 0;
    if (this.cursors.left.isDown) dir -= 1;
    if (this.cursors.right.isDown) dir += 1;
    this.player.setVelocityX(dir * SPEED);

    // jump when grounded
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && onGround) {
      this.player.setVelocityY(JUMP_V);
    }

    // shoot with cooldown
    if (this.keyZ.isDown && time - this.lastShotTime > this.shotCooldown) {
      const bx = this.player.x + this.player.displayWidth * 0.45;
      const by = this.player.y - this.player.displayHeight * 0.65;
      const b = this.bullets.create(bx, by, "bullet");
      b.setVelocityX(BULLET_V);
      this.lastShotTime = time;
    }

    // cull bullets safely
    this.bullets.getChildren().forEach(b => {
      if (b.active && (b.x > W + 50 || b.x < -50)) b.disableBody(true, true);
    });

    // farmer patrol only when active
    if (this.farmer.active) {
      this.farmer.setVelocityX(FARMER_SPEED * this.farmerDir);
      const fb = this.farmer.getBounds();
      if (fb.left < 520) this.farmerDir = 1;
      if (fb.right > 900) this.farmerDir = -1;
    }
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
      debug: false,     // set true to see physics bodies
      gravity: { y: 0 } // scene sets gravity in create()
    }
  },
  scene: [MainScene]
});
