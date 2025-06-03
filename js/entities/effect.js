// 特效類
class Effect {
  constructor(x, y, text, duration, color = "#ffffff") {
    this.x = x;
    this.y = y;
    this.text = text;
    this.duration = duration;
    this.color = color;
    this.startTime = Date.now();
    this.isFinished = false;
    this.startY = y;
  }

  update(deltaTime) {
    const elapsed = Date.now() - this.startTime;

    if (elapsed >= this.duration) {
      this.isFinished = true;
      return;
    }

    // 向上飄動
    this.y = this.startY - (elapsed / this.duration) * 30;
  }

  render(ctx, camera) {
    // 2.5D渲染已經在Game.js的renderEffect2D中處理
    if (game && game.renderEffect2D) {
      return; // 使用新的2.5D渲染系統
    }

    // 備用渲染
    if (this.isFinished) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    const elapsed = Date.now() - this.startTime;
    const alpha = 1 - elapsed / this.duration;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "14px Arial";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.text, screenX, screenY);
    ctx.restore();
  }
}
