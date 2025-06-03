// 怪物類
class Monster {
  constructor(x, y, template) {
    this.x = x;
    this.y = y;
    this.emoji = template.emoji;
    this.name = template.name;
    this.hp = template.hp;
    this.maxHp = template.hp;
    this.damage = template.damage;
    this.expReward = template.expReward;
    this.isDead = false;
    this.lastAttack = 0;
    this.attackCooldown = 2000;
    this.speed = 50;
    this.aggroRange = 100;
    this.target = null;
    this.respawnTime = 30000;
  }

  update(deltaTime) {
    if (this.isDead) return;

    // 尋找最近的玩家
    let nearestPlayer = null;
    let minDistance = this.aggroRange;

    // 檢查主玩家
    if (game.player) {
      const dist = Math.sqrt(
        Math.pow(this.x - game.player.x, 2) +
          Math.pow(this.y - game.player.y, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestPlayer = game.player;
      }
    }

    // 檢查其他玩家
    game.players.forEach((player) => {
      const dist = Math.sqrt(
        Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestPlayer = player;
      }
    });

    this.target = nearestPlayer;

    if (this.target) {
      // 移動向目標
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 30) {
        this.x += (dx / distance) * this.speed * 0.016;
        this.y += (dy / distance) * this.speed * 0.016;
      } else {
        // 攻擊
        this.attackTarget();
      }
    }
  }

  attackTarget() {
    const now = Date.now();
    if (now - this.lastAttack < this.attackCooldown) return;

    this.lastAttack = now;
    this.target.takeDamage(this.damage);

    // 添加攻擊特效
    game.effects.push(new Effect(this.target.x, this.target.y - 20, "💢", 800));
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;

    // 30秒後重生
    setTimeout(() => {
      const index = game.monsters.indexOf(this);
      if (index > -1) {
        game.monsters.splice(index, 1);
      }
    }, this.respawnTime);
  }

  render(ctx, camera) {
    // 2.5D渲染已經在Game.js的renderObject2D中處理
    if (game && game.renderObject2D) {
      return; // 使用新的2.5D渲染系統
    }

    // 備用渲染
    if (this.isDead) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.font = "25px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.emoji, screenX, screenY);

    ctx.font = "10px Arial";
    ctx.fillStyle = "#e74c3c";
    ctx.fillText(this.name, screenX, screenY + 20);

    if (this.hp < this.maxHp) {
      const barWidth = 30;
      const barHeight = 3;

      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(screenX - barWidth / 2, screenY - 20, barWidth, barHeight);

      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(
        screenX - barWidth / 2,
        screenY - 20,
        (this.hp / this.maxHp) * barWidth,
        barHeight
      );
    }
  }
}
