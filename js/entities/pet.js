// 寵物類
class Pet {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.owner = game.player;
    this.speed = 100;
    this.followDistance = 80;
    this.hp = 60;
    this.maxHp = 60;
    this.damage = 15;
    this.lastAttack = 0;
    this.attackCooldown = 1500;

    const types = {
      fire: { emoji: "🔥", name: "火焰精靈" },
      water: { emoji: "💧", name: "水元素" },
      earth: { emoji: "🌱", name: "大地精靈" },
      air: { emoji: "💨", name: "風元素" },
      dragon: { emoji: "🐲", name: "小龍" },
    };

    this.emoji = types[type].emoji;
    this.name = types[type].name;
  }

  update(deltaTime) {
    if (!this.owner) return;

    // 跟隨主人
    const dx = this.owner.x - this.x;
    const dy = this.owner.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.followDistance) {
      this.x += (dx / distance) * this.speed * 0.016;
      this.y += (dy / distance) * this.speed * 0.016;
    }

    // 自動攻擊附近的怪物
    const nearbyMonster = game.monsters.find((monster) => {
      const dist = Math.sqrt(
        Math.pow(this.x - monster.x, 2) + Math.pow(this.y - monster.y, 2)
      );
      return dist < 50 && !monster.isDead;
    });

    if (nearbyMonster) {
      this.attackMonster(nearbyMonster);
    }
  }

  attackMonster(monster) {
    const now = Date.now();
    if (now - this.lastAttack < this.attackCooldown) return;

    this.lastAttack = now;
    monster.takeDamage(this.damage);

    // 添加攻擊特效
    game.effects.push(new Effect(monster.x, monster.y - 15, "✨", 800));
  }

  render(ctx, camera) {
    // 2.5D渲染已經在Game.js的renderObject2D中處理
    if (game && game.renderObject2D) {
      return; // 使用新的2.5D渲染系統
    }

    // 備用渲染
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.emoji, screenX, screenY);

    if (this.hp < this.maxHp) {
      const barWidth = 25;
      const barHeight = 3;

      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(screenX - barWidth / 2, screenY - 15, barWidth, barHeight);

      ctx.fillStyle = "#27ae60";
      ctx.fillRect(
        screenX - barWidth / 2,
        screenY - 15,
        (this.hp / this.maxHp) * barWidth,
        barHeight
      );
    }
  }
}
