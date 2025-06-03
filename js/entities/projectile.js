// 投射物類
class Projectile {
  constructor(startX, startY, targetX, targetY, emoji, speed, onHit) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.emoji = emoji;
    this.speed = speed;
    this.onHit = onHit;
    this.isFinished = false;

    // 計算方向
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.velocityX = (dx / distance) * speed;
    this.velocityY = (dy / distance) * speed;
  }

  update(deltaTime) {
    if (this.isFinished) return;

    // 移動投射物
    this.x += this.velocityX * (deltaTime / 1000);
    this.y += this.velocityY * (deltaTime / 1000);

    // 檢查是否到達目標
    const distanceToTarget = Math.sqrt(
      Math.pow(this.x - this.targetX, 2) + Math.pow(this.y - this.targetY, 2)
    );

    if (distanceToTarget < 10) {
      this.onHit();
      this.isFinished = true;
    }

    // 檢查是否超出邊界
    if (
      this.x < 0 ||
      this.x > game.worldWidth ||
      this.y < 0 ||
      this.y > game.worldHeight
    ) {
      this.isFinished = true;
    }
  }

  render(ctx, camera) {
    // 2.5D渲染已經在Game.js的renderProjectile2D中處理
    if (game && game.renderProjectile2D) {
      return; // 使用新的2.5D渲染系統
    }

    // 備用渲染
    if (this.isFinished) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.emoji, screenX, screenY);
  }
}
