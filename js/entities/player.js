// 玩家類
class Player {
  constructor(x, y, name) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.emoji = "🧙‍♂️";
    this.level = 1;
    this.hp = 100;
    this.maxHp = 100;
    this.mp = 50;
    this.maxMp = 50;
    this.exp = 0;
    this.maxExp = 100;
    this.gold = 100;
    this.baseSpeed = 600; // 從200提升到600 (3倍速度)
    this.speedMultiplier = 1;
    this.attackSpeedMultiplier = 1;
    this.speedBoostEnd = 0;
    this.attackSpeedBoostEnd = 0;
    this.lastAttack = 0;
    this.attackCooldown = 1000;
    this.isAI = false;
    this.aiTarget = null;
    this.aiTimer = 0;
    this.targetX = null;
    this.targetY = null;
  }

  canAttack() {
    const cooldown = this.attackCooldown / this.attackSpeedMultiplier;
    return Date.now() - this.lastAttack >= cooldown;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  move(dx, dy) {
    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    const newX = this.x + dx * currentSpeed * 0.016;
    const newY = this.y + dy * currentSpeed * 0.016;

    // 邊界檢查
    if (newX >= 32 && newX <= game.worldWidth - 32) {
      this.x = newX;
    }
    if (newY >= 32 && newY <= game.worldHeight - 32) {
      this.y = newY;
    }

    // 清除目標點
    this.targetX = null;
    this.targetY = null;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      this.die();
    }

    // 添加受傷特效
    game.effects.push(
      new Effect(this.x, this.y - 30, `-${amount}`, 1000, "#e74c3c")
    );
  }

  die() {
    if (!this.isAI) {
      game.showNotification("你死了！5秒後復活", "error");
      setTimeout(() => {
        this.hp = Math.floor(this.maxHp * 0.5);
        this.x = 512;
        this.y = 384;
        game.showNotification("你已復活！");
        game.updateUI();
      }, 5000);
    } else {
      // AI玩家重新生成
      setTimeout(() => {
        this.hp = this.maxHp;
        this.x = 300 + Math.random() * 400;
        this.y = 300 + Math.random() * 200;
      }, 3000);
    }
  }

  gainExp(amount) {
    this.exp += amount;

    if (this.exp >= this.maxExp) {
      this.levelUp();
    }

    if (!this.isAI) {
      game.updateUI();
    }
  }

  gainGold(amount) {
    this.gold += amount;
    if (!this.isAI) {
      game.updateUI();
    }
  }

  levelUp() {
    this.level++;
    this.exp = 0;
    this.maxExp = this.level * 100;
    this.maxHp += 20;
    this.maxMp += 10;
    this.hp = this.maxHp;
    this.mp = this.maxMp;

    if (!this.isAI) {
      game.showNotification(`恭喜升級！現在是 ${this.level} 級！`, "success");
      game.effects.push(
        new Effect(this.x, this.y - 40, "升級！", 2000, "#f1c40f")
      );
    }
  }

  updateAI(deltaTime) {
    this.aiTimer += deltaTime;

    if (this.aiTimer > 2000) {
      this.aiTimer = 0;

      // 隨機移動
      if (Math.random() < 0.7) {
        this.setTarget(
          this.x + (Math.random() - 0.5) * 200,
          this.y + (Math.random() - 0.5) * 200
        );
      }
    }
  }

  update(deltaTime) {
    // 檢查增益效果是否過期
    const now = Date.now();

    if (this.speedBoostEnd > 0 && now > this.speedBoostEnd) {
      this.speedMultiplier = 1;
      this.speedBoostEnd = 0;
      if (!this.isAI) {
        game.showNotification("移動速度增益效果已結束", "warning");
      }
    }

    if (this.attackSpeedBoostEnd > 0 && now > this.attackSpeedBoostEnd) {
      this.attackSpeedMultiplier = 1;
      this.attackSpeedBoostEnd = 0;
      if (!this.isAI) {
        game.showNotification("攻擊速度增益效果已結束", "warning");
      }
    }

    // 移動到目標點
    if (this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.move(dx / distance, dy / distance);
      } else {
        this.targetX = null;
        this.targetY = null;
      }
    }
  }

  applySpeedBoost(multiplier, duration) {
    this.speedMultiplier = multiplier;
    this.speedBoostEnd = Date.now() + duration;
    if (!this.isAI) {
      game.showNotification(`移動速度提升 ${multiplier}x！`, "success");
    }
  }

  applyAttackSpeedBoost(multiplier, duration) {
    this.attackSpeedMultiplier = multiplier;
    this.attackSpeedBoostEnd = Date.now() + duration;
    if (!this.isAI) {
      game.showNotification(`攻擊速度提升 ${multiplier}x！`, "success");
    }
  }

  applyCombinedBoost(speedMult, attackMult, duration) {
    this.speedMultiplier = speedMult;
    this.attackSpeedMultiplier = attackMult;
    this.speedBoostEnd = Date.now() + duration;
    this.attackSpeedBoostEnd = Date.now() + duration;
    if (!this.isAI) {
      game.showNotification(`戰鬥能力全面提升！`, "success");
    }
  }

  updateBuffDisplay() {
    // 更新UI顯示當前增益狀態
    if (!this.isAI && game) {
      game.updateUI();
    }
  }

  render(ctx, camera) {
    // 2.5D渲染已經在Game.js的renderObject2D中處理
    // 這個方法保留以支援舊的渲染調用
    if (game && game.renderObject2D) {
      return; // 使用新的2.5D渲染系統
    }

    // 備用渲染（如果新系統不可用）
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.emoji, screenX, screenY);

    ctx.font = "12px Arial";
    ctx.fillStyle = this.isAI ? "#f39c12" : "#e74c3c";
    ctx.fillText(this.name, screenX, screenY + 25);

    if (this.hp < this.maxHp) {
      const barWidth = 40;
      const barHeight = 4;

      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(screenX - barWidth / 2, screenY - 25, barWidth, barHeight);

      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(
        screenX - barWidth / 2,
        screenY - 25,
        (this.hp / this.maxHp) * barWidth,
        barHeight
      );
    }

    if (this.speedMultiplier > 1 || this.attackSpeedMultiplier > 1) {
      let buffText = "";
      if (this.speedMultiplier > 1) buffText += "💨";
      if (this.attackSpeedMultiplier > 1) buffText += "⚡";

      ctx.font = "14px Arial";
      ctx.fillStyle = "#f1c40f";
      ctx.fillText(buffText, screenX + 15, screenY - 25);
    }
  }
}
