// NPC類
class NPC {
  constructor(x, y, emoji, name, type) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
    this.name = name;
    this.type = type;
    this.dialogues = this.getDialogues();
    this.shopItems = this.getShopItems();
  }

  getDialogues() {
    switch (this.type) {
      case "magic_shop":
        return [
          "歡迎來到魔法商店！我這裡有各種法術卷軸。",
          "需要魔力藥水嗎？對冒險很有用的！",
          "小心那些邪惡的怪物，它們越來越活躍了。",
        ];
      case "weapon_shop":
        return [
          "需要武器嗎？我有最好的裝備！",
          "這把劍曾經屬於一位傳奇英雄。",
          "記住，好的武器能救你一命。",
        ];
      case "pet_trainer":
        return [
          "你想學習如何訓練寵物嗎？",
          "寵物是冒險者最好的夥伴！",
          "我可以教你一些馴服怪物的技巧。",
        ];
      case "healer":
        return [
          "你看起來需要治療。",
          "健康是最重要的財富。",
          "這瓶藥水能幫助你恢復體力。",
        ];
      default:
        return ["你好，冒險者！"];
    }
  }

  getShopItems() {
    switch (this.type) {
      case "magic_shop":
        return [
          { emoji: "🔵", name: "魔力藥水", type: "mana_potion", price: 15 },
          { emoji: "📜", name: "火球卷軸", type: "fireball_scroll", price: 25 },
          { emoji: "🔮", name: "魔法石", type: "magic_stone", price: 50 },
          {
            emoji: "⚡",
            name: "閃電卷軸",
            type: "lightning_scroll",
            price: 30,
          },
        ];
      case "weapon_shop":
        return [
          { emoji: "⚔️", name: "鐵劍", type: "iron_sword", price: 40 },
          { emoji: "🛡️", name: "木盾", type: "wooden_shield", price: 30 },
          { emoji: "🏹", name: "弓箭", type: "bow", price: 35 },
          { emoji: "🗡️", name: "鋼劍", type: "steel_sword", price: 80 },
        ];
      case "healer":
        return [
          { emoji: "🧪", name: "生命藥水", type: "health_potion", price: 10 },
          {
            emoji: "💚",
            name: "大生命藥水",
            type: "greater_health_potion",
            price: 25,
          },
          { emoji: "📜", name: "復活卷軸", type: "revival_scroll", price: 50 },
          { emoji: "🍄", name: "治療草藥", type: "healing_herb", price: 5 },
          { emoji: "💨", name: "疾風藥水", type: "speed_potion", price: 30 },
          {
            emoji: "⚡",
            name: "狂戰士藥水",
            type: "berserker_potion",
            price: 60,
          },
        ];
      case "pet_trainer":
        return [
          { emoji: "🥩", name: "寵物食物", type: "pet_food", price: 8 },
          { emoji: "🎾", name: "寵物玩具", type: "pet_toy", price: 12 },
          { emoji: "📖", name: "訓練手冊", type: "training_book", price: 20 },
          { emoji: "🔗", name: "寵物項圈", type: "pet_collar", price: 15 },
        ];
      default:
        return [];
    }
  }

  getRandomDialogue() {
    return this.dialogues[Math.floor(Math.random() * this.dialogues.length)];
  }

  render(ctx, camera) {
    // 2.5D渲染已經在Game.js的renderObject2D中處理
    if (game && game.renderObject2D) {
      return; // 使用新的2.5D渲染系統
    }

    // 備用渲染
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.emoji, screenX, screenY);

    ctx.font = "12px Arial";
    ctx.fillStyle = "#27ae60";
    ctx.fillText(this.name, screenX, screenY + 25);

    if (game.player) {
      const dist = Math.sqrt(
        Math.pow(this.x - game.player.x, 2) +
          Math.pow(this.y - game.player.y, 2)
      );

      if (dist < 50) {
        ctx.font = "10px Arial";
        ctx.fillStyle = "#f1c40f";
        ctx.fillText("點擊對話", screenX, screenY - 25);
      }
    }
  }
}
