import pygame, sys

W, H = 960, 540
pygame.init()
screen = pygame.display.set_mode((W, H))
clock = pygame.time.Clock()

# --- game state ---
GRAV = 1800.0          # px/s^2
SPEED = 300.0          # px/s
JUMP_V = -650.0
BULLET_V = 700.0


player = pygame.Rect(100, H-120, 40, 40)
py_vel_y = 0.0
on_ground = False

bullets = []  # list of rects
farmer = pygame.Rect(680, H-120, 40, 40)
farmer_dir = -1
score = 0

def reset():
    global player, py_vel_y, on_ground, bullets, farmer, farmer_dir
    player.topleft = (100, H-120)
    py_vel_y = 0.0
    on_ground = False
    bullets = []
    farmer.topleft = (680, H-120)
    farmer_dir = -1

def rect_overlap(a, b):
    return a.colliderect(b)

reset()

floor_y = H - 80  # simple ground line

while True:
    dt = clock.tick(60) / 1000.0

    for e in pygame.event.get():
        if e.type == pygame.QUIT:
            pygame.quit(); sys.exit()

    keys = pygame.key.get_pressed()

    # --- horizontal movement ---
    dx = (keys[pygame.K_RIGHT] - keys[pygame.K_LEFT]) * SPEED * dt
    player.x += int(dx)

    # clamp to screen
    player.x = max(0, min(W - player.width, player.x))

    # --- gravity + jump ---
    py_vel_y += GRAV * dt
    if keys[pygame.K_SPACE] and on_ground:
        py_vel_y = JUMP_V; on_ground = False

    player.y += int(py_vel_y * dt)

    # ground collision
    if player.bottom >= floor_y:
        player.bottom = floor_y
        py_vel_y = 0.0
        on_ground = True

    # --- shoot ---
    if keys[pygame.K_z]:  # hold-to-fire: simple, no cooldown for the prototype
        if not bullets or bullets[-1].x - player.centerx > 20:
            b = pygame.Rect(player.centerx+10, player.centery-4, 12, 8)
            bullets.append(b)

    # move bullets and cull offscreen
    for b in bullets:
        b.x += int(BULLET_V * dt)
    bullets = [b for b in bullets if b.x < W+50]

    # --- farmer patrol ---
    farmer.x += int(120 * farmer_dir * dt)
    if farmer.left < 520: farmer_dir = 1
    if farmer.right > 900: farmer_dir = -1

    # bullet → farmer collisions
    hit_any = False
    keep = []
    for b in bullets:
        if b.colliderect(farmer):
            hit_any = True
        else:
            keep.append(b)
    bullets = keep
    if hit_any:
        score += 1
        # respawn farmer
        farmer.topleft = (680, H-120)
        farmer_dir = -1

    # farmer → player collision
    if rect_overlap(player, farmer):
        score = 0
        reset()

    # --- render ---
    screen.fill((20, 22, 30))
    # ground
    pygame.draw.rect(screen, (60, 70, 80), (0, floor_y, W, H-floor_y))
    # player (potato placeholder)
    pygame.draw.rect(screen, (218, 173, 106), player)
    # farmer
    pygame.draw.rect(screen, (200, 80, 80), farmer)
    # bullets
    for b in bullets:
        pygame.draw.rect(screen, (250, 230, 120), b)
    # UI
    font = pygame.font.SysFont(None, 28)
    txt = font.render(f"Score: {score}   [Arrows] move  [Space] jump  [Z] shoot", True, (230, 230, 240))
    screen.blit(txt, (16, 16))

    pygame.display.flip()