// 遊戲核心類
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.minimap = document.getElementById("minimap");
    this.minimapCtx = this.minimap.getContext("2d");

    // 遊戲世界設定
    this.worldWidth = 2048;
    this.worldHeight = 1536;
    this.tileSize = 32;

    // 2.5D視角設定
    this.viewAngle = Math.PI / 6; // 30度俯視角
    this.perspective = {
      scale: 0.8, // 透視縮放
      skewX: 0.3, // X軸傾斜
      skewY: 0.7, // Y軸縮放
    };

    // 攝影機 - 第一人稱視角
    this.camera = {
      x: 0,
      y: 0,
      offsetX: this.canvas.width / 2,
      offsetY: this.canvas.height * 0.7, // 玩家位置在畫面下方70%處
    };

    // 遊戲狀態
    this.isRunning = false;
    this.lastTime = 0;
    this.fps = 60;

    // 遊戲對象
    this.player = null;
    this.players = new Map();
    this.npcs = [];
    this.monsters = [];
    this.pets = [];
    this.items = [];
    this.effects = [];
    this.projectiles = [];

    // 輸入處理
    this.keys = {};
    this.mousePos = { x: 0, y: 0 };
    this.hoveredTarget = null;
    this.selectedTarget = null;

    // UI狀態
    this.inventoryOpen = false;
    this.equipmentOpen = false;
    this.magicOpen = false;
    this.dialogOpen = false;
    this.currentNPC = null;
    this.selectedShopItem = null;

    // 地圖數據
    this.map = this.generateMap();

    this.setupEventListeners();
    this.initializeNPCs();
    this.initializeUI();
  }

  generateMap() {
    const map = [];
    const cols = Math.ceil(this.worldWidth / this.tileSize);
    const rows = Math.ceil(this.worldHeight / this.tileSize);

    for (let y = 0; y < rows; y++) {
      map[y] = [];
      for (let x = 0; x < cols; x++) {
        let tile = "grass";

        if (x === 0 || x === cols - 1 || y === 0 || y === rows - 1) {
          tile = "water";
        } else if (Math.random() < 0.1) {
          tile = "forest";
        } else if (Math.random() < 0.05) {
          tile = "mountain";
        } else if (x > cols * 0.6 && y > rows * 0.6 && Math.random() < 0.3) {
          tile = "desert";
        }

        map[y][x] = tile;
      }
    }

    return map;
  }

  initializeNPCs() {
    this.npcs = [
      new NPC(200, 300, "🧙‍♂️", "魔法師艾德溫", "magic_shop"),
      new NPC(400, 200, "🛡️", "鐵匠哈根", "weapon_shop"),
      new NPC(600, 400, "🧝‍♀️", "精靈莉莉", "pet_trainer"),
      new NPC(300, 500, "👨‍⚕️", "醫師馬庫斯", "healer"),
    ];
  }

  initializeUI() {
    this.initializeInventory();
    this.initializeEquipment();
    this.initializeMagic();
  }

  initializeInventory() {
    const grid = document.getElementById("inventoryGrid");
    grid.innerHTML = "";

    for (let i = 0; i < 40; i++) {
      const slot = document.createElement("div");
      slot.className = "inventory-slot";
      slot.setAttribute("data-slot", i);

      // 單擊顯示說明，雙擊使用道具
      let clickCount = 0;
      let clickTimer = null;

      slot.addEventListener("click", (e) => {
        clickCount++;

        if (clickTimer) {
          clearTimeout(clickTimer);
        }

        if (clickCount === 1) {
          clickTimer = setTimeout(() => {
            this.showItemTooltip(i, e);
            clickCount = 0;
          }, 300);
        } else if (clickCount === 2) {
          this.useInventoryItem(i);
          this.hideItemTooltip();
          clickCount = 0;
        }
      });

      // 滑鼠離開隱藏說明框
      slot.addEventListener("mouseleave", () => {
        this.hideItemTooltip();
      });

      grid.appendChild(slot);
    }

    // 初始道具 (增加新的藥水)
    this.addInventoryItem(0, "🧪", "health_potion", 3, 10);
    this.addInventoryItem(1, "🔵", "mana_potion", 2, 15);
    this.addInventoryItem(2, "📜", "revival_scroll", 1, 50);
    this.addInventoryItem(3, "💨", "speed_potion", 1, 30);
    this.addInventoryItem(4, "⚡", "berserker_potion", 1, 60);
  }

  initializeEquipment() {
    const grid = document.getElementById("equipmentGrid");
    grid.innerHTML = "";

    const slots = ["helmet", "armor", "boots", "weapon", "shield", "accessory"];
    slots.forEach((slot, i) => {
      const slotEl = document.createElement("div");
      slotEl.className = "equipment-slot";
      slotEl.setAttribute("data-slot", slot);
      slotEl.onclick = () => this.useEquipmentItem(slot);
      slotEl.title = this.getSlotName(slot);
      grid.appendChild(slotEl);
    });

    // 初始裝備
    this.addEquipmentItem("weapon", "⚔️", "iron_sword", 1, 30);
  }

  initializeMagic() {
    const grid = document.getElementById("magicGrid");
    grid.innerHTML = "";

    const spells = [
      "fireball",
      "heal",
      "lightning",
      "teleport",
      "shield",
      "summon",
    ];
    spells.forEach((spell, i) => {
      const slot = document.createElement("div");
      slot.className = "magic-slot";
      slot.setAttribute("data-spell", spell);
      slot.onclick = () => this.castSpell(spell);
      slot.title = this.getSpellName(spell);
      grid.appendChild(slot);
    });

    // 初始魔法
    this.addMagicSpell("fireball", "🔥", 10);
    this.addMagicSpell("heal", "✨", 15);
    this.addMagicSpell("lightning", "⚡", 20);
  }

  getSlotName(slot) {
    const names = {
      helmet: "頭盔",
      armor: "盔甲",
      boots: "靴子",
      weapon: "武器",
      shield: "盾牌",
      accessory: "飾品",
    };
    return names[slot] || slot;
  }

  getSpellName(spell) {
    const names = {
      fireball: "火球術",
      heal: "治療術",
      lightning: "閃電術",
      teleport: "傳送術",
      shield: "護盾術",
      summon: "召喚術",
    };
    return names[spell] || spell;
  }

  addInventoryItem(slot, emoji, type, count = 1, value = 0) {
    const slotEl = document.querySelector(
      `#inventoryGrid [data-slot="${slot}"]`
    );
    if (slotEl) {
      slotEl.innerHTML = `${emoji}${
        count > 1 ? `<div class="slot-count">${count}</div>` : ""
      }`;
      slotEl.setAttribute("data-item", type);
      slotEl.setAttribute("data-count", count);
      slotEl.setAttribute("data-value", value);
      slotEl.setAttribute("data-emoji", emoji);
    }
  }

  showItemTooltip(slot, event) {
    const slotEl = document.querySelector(
      `#inventoryGrid [data-slot="${slot}"]`
    );
    const itemType = slotEl.getAttribute("data-item");

    if (!itemType) return;

    const tooltip = document.getElementById("itemTooltip");
    const itemInfo = this.getItemInfo(itemType);

    document.getElementById("tooltipTitle").textContent = itemInfo.name;
    document.getElementById("tooltipDescription").textContent =
      itemInfo.description;
    document.getElementById("tooltipEffect").textContent = itemInfo.effect;
    document.getElementById(
      "tooltipValue"
    ).textContent = `價值: ${slotEl.getAttribute("data-value")} 💰`;

    // 定位說明框
    const rect = slotEl.getBoundingClientRect();
    tooltip.style.left = rect.right + 10 + "px";
    tooltip.style.top = rect.top + "px";
    tooltip.style.display = "block";
  }

  hideItemTooltip() {
    document.getElementById("itemTooltip").style.display = "none";
  }

  getItemInfo(itemType) {
    const itemData = {
      health_potion: {
        name: "生命藥水",
        description: "恢復生命值的基礎藥水",
        effect: "立即恢復 50 HP",
      },
      mana_potion: {
        name: "魔力藥水",
        description: "恢復魔力值的藍色藥水",
        effect: "立即恢復 30 MP",
      },
      speed_potion: {
        name: "疾風藥水",
        description: "提升移動速度的神奇藥水",
        effect: "移動速度 x1.5，持續 30秒",
      },
      berserker_potion: {
        name: "狂戰士藥水",
        description: "激發戰鬥潛能的強力藥水",
        effect: "移動速度 x2.0 + 攻擊速度 x1.2，持續 20秒",
      },
      revival_scroll: {
        name: "復活卷軸",
        description: "珍貴的復活魔法卷軸",
        effect: "死亡時自動復活",
      },
      greater_health_potion: {
        name: "大生命藥水",
        description: "強效的生命恢復藥水",
        effect: "立即恢復 100 HP",
      },
      healing_herb: {
        name: "治療草藥",
        description: "天然的治療植物",
        effect: "緩慢恢復 30 HP",
      },
    };

    return (
      itemData[itemType] || {
        name: "未知道具",
        description: "神秘的道具",
        effect: "效果未知",
      }
    );
  }

  addEquipmentItem(slot, emoji, type, count = 1, value = 0) {
    const slotEl = document.querySelector(
      `#equipmentGrid [data-slot="${slot}"]`
    );
    if (slotEl) {
      slotEl.innerHTML = emoji;
      slotEl.setAttribute("data-item", type);
      slotEl.setAttribute("data-value", value);
    }
  }

  addMagicSpell(spell, emoji, manaCost) {
    const slotEl = document.querySelector(`#magicGrid [data-spell="${spell}"]`);
    if (slotEl) {
      slotEl.innerHTML = `${emoji}<div class="slot-count">${manaCost}</div>`;
      slotEl.setAttribute("data-mana-cost", manaCost);
    }
  }

  setupEventListeners() {
    // 鍵盤事件
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      // 快捷鍵
      if (e.code === "KeyI") {
        e.preventDefault();
        this.toggleInventory();
      } else if (e.code === "KeyE") {
        e.preventDefault();
        this.toggleEquipment();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        this.toggleMagic();
      } else if (e.code === "Escape") {
        e.preventDefault();
        this.closeAllWindows();
      }
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // 滑鼠事件
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener("mousemove", (e) =>
      this.handleCanvasMouseMove(e)
    );
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  handleCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const worldPos = this.screenToWorld(screenPos.x, screenPos.y);

    if (this.hoveredTarget) {
      if (this.hoveredTarget.type === "monster") {
        this.attackTarget(this.hoveredTarget, worldPos.x, worldPos.y);
      } else if (this.hoveredTarget.type === "npc") {
        this.interactWithNPC(this.hoveredTarget);
      }
    } else {
      // 移動到點擊位置
      this.movePlayerTo(worldPos.x, worldPos.y);
    }
  }

  handleCanvasMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;

    const worldPos = this.screenToWorld(this.mousePos.x, this.mousePos.y);

    // 檢查滑鼠是否懸停在目標上
    this.hoveredTarget = this.getTargetAt(worldPos.x, worldPos.y);
    this.updateCursor();
  }

  getTargetAt(x, y) {
    // 檢查怪物
    for (let monster of this.monsters) {
      if (!monster.isDead && this.isPointInTarget(x, y, monster)) {
        return { type: "monster", target: monster };
      }
    }

    // 檢查NPC
    for (let npc of this.npcs) {
      if (this.isPointInTarget(x, y, npc)) {
        return { type: "npc", target: npc };
      }
    }

    return null;
  }

  isPointInTarget(x, y, target) {
    const distance = Math.sqrt(
      Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2)
    );
    return distance < 25;
  }

  updateCursor() {
    if (this.hoveredTarget) {
      if (this.hoveredTarget.type === "monster") {
        const distance = this.getDistanceToPlayer(this.hoveredTarget.target);
        if (distance <= 50) {
          this.canvas.className = "cursor-attack";
        } else if (distance <= 300) {
          this.canvas.className = "cursor-bow";
        } else if (distance <= 500) {
          this.canvas.className = "cursor-magic";
        } else {
          this.canvas.className = "";
        }
      } else if (this.hoveredTarget.type === "npc") {
        this.canvas.className = "cursor-talk";
      }
    } else {
      this.canvas.className = "";
    }
  }

  getDistanceToPlayer(target) {
    if (!this.player) return Infinity;
    return Math.sqrt(
      Math.pow(this.player.x - target.x, 2) +
        Math.pow(this.player.y - target.y, 2)
    );
  }

  attackTarget(targetObj, clickX, clickY) {
    const target = targetObj.target;
    const distance = this.getDistanceToPlayer(target);

    if (distance <= 50) {
      // 近戰攻擊
      this.meleeAttack(target);
    } else if (distance <= 300) {
      // 遠程弓箭攻擊
      this.rangedAttack(target, clickX, clickY);
    } else if (distance <= 500) {
      // 魔法攻擊
      this.magicAttack(target, clickX, clickY);
    } else {
      this.showNotification("目標太遠了！", "error");
    }
  }

  meleeAttack(target) {
    if (!this.player.canAttack()) return;

    const damage = 20 + Math.floor(Math.random() * 15);
    target.takeDamage(damage);
    this.player.lastAttack = Date.now();

    // 添加近戰特效
    this.effects.push(new Effect(target.x, target.y - 20, "💥", 800));
    this.showDamageText(target.x, target.y - 30, damage, "#e74c3c");

    if (target.isDead) {
      this.player.gainExp(target.expReward);
      this.player.gainGold(Math.floor(Math.random() * 20) + 5);
      this.updateUI();
    }
  }

  rangedAttack(target, clickX, clickY) {
    if (!this.player.canAttack()) return;

    // 檢查是否有弓箭
    const hasArrows = this.hasItem("arrow");
    if (!hasArrows) {
      this.showNotification("沒有箭矢！", "error");
      return;
    }

    this.player.lastAttack = Date.now();

    // 創建箭矢投射物
    const arrow = new Projectile(
      this.player.x,
      this.player.y,
      target.x,
      target.y,
      "🏹",
      400,
      () => {
        const damage = 15 + Math.floor(Math.random() * 10);
        target.takeDamage(damage);
        this.showDamageText(target.x, target.y - 30, damage, "#f39c12");

        if (target.isDead) {
          this.player.gainExp(target.expReward);
          this.player.gainGold(Math.floor(Math.random() * 20) + 5);
          this.updateUI();
        }
      }
    );

    this.projectiles.push(arrow);
    this.useItem("arrow", 1);
  }

  magicAttack(target, clickX, clickY) {
    if (!this.player.canAttack()) return;

    const manaCost = 20;
    if (this.player.mp < manaCost) {
      this.showNotification("魔力不足！", "error");
      return;
    }

    this.player.mp -= manaCost;
    this.player.lastAttack = Date.now();

    // 創建火球投射物
    const fireball = new Projectile(
      this.player.x,
      this.player.y,
      target.x,
      target.y,
      "🔥",
      300,
      () => {
        const damage = 25 + Math.floor(Math.random() * 20);
        target.takeDamage(damage);
        this.effects.push(new Effect(target.x, target.y, "💥", 1000));
        this.showDamageText(target.x, target.y - 30, damage, "#e67e22");

        if (target.isDead) {
          this.player.gainExp(target.expReward);
          this.player.gainGold(Math.floor(Math.random() * 30) + 10);
          this.updateUI();
        }
      }
    );

    this.projectiles.push(fireball);
    this.updateUI();
  }

  interactWithNPC(npcObj) {
    const npc = npcObj.target;
    const distance = this.getDistanceToPlayer(npc);

    if (distance <= 50) {
      this.openDialog(npc);
    } else {
      this.showNotification("太遠了，無法與NPC對話！", "error");
    }
  }

  movePlayerTo(x, y) {
    if (this.player) {
      this.player.setTarget(x, y);
    }
  }

  showDamageText(x, y, damage, color) {
    const screenPos = this.worldToScreen(x, y);
    const damageEl = document.createElement("div");
    damageEl.className = "damage-text";
    damageEl.textContent = `-${damage}`;
    damageEl.style.left = screenPos.x + "px";
    damageEl.style.top = screenPos.y - 30 + "px";
    damageEl.style.color = color;
    document.body.appendChild(damageEl);

    setTimeout(() => {
      if (damageEl.parentNode) {
        damageEl.remove();
      }
    }, 1000);
  }

  hasItem(itemType) {
    // 簡化版本，假設有箭矢
    return itemType === "arrow";
  }

  useItem(itemType, amount) {
    // 簡化版本
  }

  openDialog(npc) {
    this.currentNPC = npc;
    this.dialogOpen = true;

    document.getElementById("dialogNPCName").textContent = npc.name;
    document.getElementById("dialogText").textContent = npc.getRandomDialogue();
    document.getElementById("dialogWindow").style.display = "block";
    document.getElementById("shopContent").style.display = "none";
  }

  closeDialog() {
    this.dialogOpen = false;
    this.currentNPC = null;
    document.getElementById("dialogWindow").style.display = "none";
  }

  showShop() {
    if (!this.currentNPC) return;

    document.getElementById("shopContent").style.display = "block";
    this.renderShop();
  }

  renderShop() {
    const shopGrid = document.getElementById("shopGrid");
    shopGrid.innerHTML = "";

    const items = this.currentNPC.getShopItems();

    items.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "shop-item";
      itemEl.onclick = () => this.selectShopItem(item);
      itemEl.innerHTML = `
                <div class="shop-item-emoji">${item.emoji}</div>
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-price">${item.price} 💰</div>
            `;
      shopGrid.appendChild(itemEl);
    });
  }

  selectShopItem(item) {
    this.selectedShopItem = item;
    document.getElementById("purchaseControls").style.display = "flex";
    this.updatePurchasePrice();
  }

  updatePurchasePrice() {
    if (!this.selectedShopItem) return;

    const quantity =
      parseInt(document.getElementById("purchaseQuantity").value) || 1;
    const totalPrice = this.selectedShopItem.price * quantity;
    document.getElementById(
      "totalPrice"
    ).textContent = `總價: ${totalPrice} 💰`;
  }

  confirmPurchase() {
    if (!this.selectedShopItem || !this.player) return;

    const quantity =
      parseInt(document.getElementById("purchaseQuantity").value) || 1;
    const totalPrice = this.selectedShopItem.price * quantity;

    if (this.player.gold < totalPrice) {
      this.showNotification("金錢不足！", "error");
      return;
    }

    this.player.gold -= totalPrice;
    this.addInventoryItem(
      this.findEmptyInventorySlot(),
      this.selectedShopItem.emoji,
      this.selectedShopItem.type,
      quantity,
      this.selectedShopItem.price
    );

    this.updateUI();
    this.showNotification(
      `購買了 ${quantity} 個 ${this.selectedShopItem.name}！`,
      "success"
    );
    document.getElementById("purchaseControls").style.display = "none";
  }

  findEmptyInventorySlot() {
    for (let i = 0; i < 40; i++) {
      const slot = document.querySelector(`#inventoryGrid [data-slot="${i}"]`);
      if (!slot.getAttribute("data-item")) {
        return i;
      }
    }
    return 0; // 如果沒有空格，覆蓋第一格
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    document.getElementById("inventoryWindow").style.display = this
      .inventoryOpen
      ? "block"
      : "none";
  }

  toggleEquipment() {
    this.equipmentOpen = !this.equipmentOpen;
    document.getElementById("equipmentWindow").style.display = this
      .equipmentOpen
      ? "block"
      : "none";
  }

  toggleMagic() {
    this.magicOpen = !this.magicOpen;
    document.getElementById("magicWindow").style.display = this.magicOpen
      ? "block"
      : "none";
  }

  closeAllWindows() {
    this.inventoryOpen = false;
    this.equipmentOpen = false;
    this.magicOpen = false;
    this.dialogOpen = false;

    document.getElementById("inventoryWindow").style.display = "none";
    document.getElementById("equipmentWindow").style.display = "none";
    document.getElementById("magicWindow").style.display = "none";
    document.getElementById("dialogWindow").style.display = "none";
  }

  useInventoryItem(slot) {
    const slotEl = document.querySelector(
      `#inventoryGrid [data-slot="${slot}"]`
    );
    const itemType = slotEl.getAttribute("data-item");
    const count = parseInt(slotEl.getAttribute("data-count") || 0);

    if (!itemType || count <= 0) return;

    switch (itemType) {
      case "health_potion":
        if (this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
          this.updateInventoryItemCount(slot, count - 1);
          this.showNotification("使用生命藥水 +50 HP", "success");
          this.updateUI();
        }
        break;
      case "speed_potion":
        // 疾風藥水：1.5倍移動速度，持續30秒
        this.player.applySpeedBoost(1.5, 30000);
        this.updateInventoryItemCount(slot, count - 1);
        this.updateUI();
        this.showNotification("使用疾風藥水！移動速度大幅提升！", "success");
        break;
      case "berserker_potion":
        // 狂戰士藥水：2倍移動速度 + 1.2倍攻擊速度，持續20秒
        this.player.applyCombinedBoost(2.0, 1.2, 20000);
        this.updateInventoryItemCount(slot, count - 1);
        this.updateUI();
        this.showNotification("使用狂戰士藥水！戰鬥能力全面提升！", "success");
        break;
      case "mana_potion":
        if (this.player.mp < this.player.maxMp) {
          this.player.mp = Math.min(this.player.maxMp, this.player.mp + 30);
          this.updateInventoryItemCount(slot, count - 1);
          this.showNotification("使用魔力藥水 +30 MP", "success");
          this.updateUI();
        }
        break;
    }
  }

  updateInventoryItemCount(slot, newCount) {
    const slotEl = document.querySelector(
      `#inventoryGrid [data-slot="${slot}"]`
    );
    if (newCount <= 0) {
      slotEl.innerHTML = "";
      slotEl.removeAttribute("data-item");
      slotEl.removeAttribute("data-count");
      slotEl.removeAttribute("data-value");
    } else {
      slotEl.setAttribute("data-count", newCount);
      const emoji = slotEl.innerHTML.split("<")[0];
      slotEl.innerHTML = `${emoji}${
        newCount > 1 ? `<div class="slot-count">${newCount}</div>` : ""
      }`;
    }
  }

  castSpell(spell) {
    const slotEl = document.querySelector(`#magicGrid [data-spell="${spell}"]`);
    const manaCost = parseInt(slotEl.getAttribute("data-mana-cost") || 0);

    if (this.player.mp < manaCost) {
      this.showNotification("魔力不足！", "error");
      return;
    }

    this.player.mp -= manaCost;

    switch (spell) {
      case "fireball":
        this.showNotification("選擇火球術目標！", "info");
        break;
      case "heal":
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
        this.effects.push(
          new Effect(this.player.x, this.player.y - 20, "✨", 1000)
        );
        this.showNotification("治療術 +40 HP", "success");
        break;
      case "lightning":
        this.showNotification("選擇閃電術目標！", "info");
        break;
    }

    this.updateUI();
  }

  start(playerName) {
    this.player = new Player(512, 384, playerName);
    this.isRunning = true;
    this.gameLoop();
    this.updateUI();
    this.showNotification(`歡迎 ${playerName} 進入魔法寵物世界！`);

    // 模擬其他玩家
    this.simulateOtherPlayers();
  }

  simulateOtherPlayers() {
    const names = ["艾莉絲", "布萊克", "克里斯", "黛安娜", "艾德華"];
    names.forEach((name, i) => {
      const otherPlayer = new Player(
        300 + i * 100 + Math.random() * 200,
        300 + Math.random() * 200,
        name
      );
      otherPlayer.isAI = true;
      this.players.set(name, otherPlayer);
    });
  }

  gameLoop(currentTime = 0) {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(deltaTime) {
    // 更新玩家
    if (this.player) {
      this.updatePlayerMovement();
      this.player.update(deltaTime);
      this.updateCamera();

      // 定期更新增益狀態顯示
      if (this.lastBuffUpdate === undefined) {
        this.lastBuffUpdate = 0;
      }
      this.lastBuffUpdate += deltaTime;

      if (this.lastBuffUpdate > 100) {
        // 每100ms更新一次
        this.updateBuffStatus();
        this.lastBuffUpdate = 0;
      }
    }

    // 更新其他玩家 (AI)
    this.players.forEach((player) => {
      if (player.isAI) {
        player.updateAI(deltaTime);
      }
      player.update(deltaTime);
    });

    // 更新寵物
    this.pets.forEach((pet) => pet.update(deltaTime));

    // 更新怪物
    this.monsters.forEach((monster) => monster.update(deltaTime));

    // 更新投射物
    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.update(deltaTime);
      return !projectile.isFinished;
    });

    // 更新特效
    this.effects = this.effects.filter((effect) => {
      effect.update(deltaTime);
      return !effect.isFinished;
    });

    // 隨機生成怪物 (增加生成頻率)
    if (Math.random() < 0.003) {
      // 從 0.001 增加到 0.003
      this.spawnRandomMonster();
    }
  }

  updatePlayerMovement() {
    let dx = 0,
      dy = 0;

    // 鍵盤移動
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) dy -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) dy += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) dx -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) dx += 1;

    // 標準化對角線移動
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    if (dx !== 0 || dy !== 0) {
      this.player.move(dx, dy);
    }
  }

  updateCamera() {
    if (!this.player) return;

    // 玩家永遠在畫面中央
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    // 確保攝影機不超出世界邊界
    this.camera.x = Math.max(
      -this.worldWidth / 2,
      Math.min(this.worldWidth, this.camera.x)
    );
    this.camera.y = Math.max(
      -this.worldHeight / 2,
      Math.min(this.worldHeight, this.camera.y)
    );
  }

  // 真正的等距投影轉換（修正版）
  worldToScreen(worldX, worldY) {
    // 相對於攝影機的位置
    const relX = worldX - this.camera.x;
    const relY = worldY - this.camera.y;

    // 等距投影公式
    const isoX = (relX - relY) * Math.cos(Math.PI / 6); // 約 0.866
    const isoY = (relX + relY) * Math.sin(Math.PI / 6); // 約 0.5

    // 放大顯示比例，並確保居中
    const scale = 2.5;
    const screenX = isoX * scale + this.canvas.width / 2;
    const screenY = isoY * scale + this.canvas.height / 2;

    return { x: screenX, y: screenY };
  }

  // 反向等距投影（滑鼠點擊用）
  screenToWorld(screenX, screenY) {
    const scale = 2.5;

    // 反向計算等距座標
    const isoX = (screenX - this.canvas.width / 2) / scale;
    const isoY = (screenY - this.canvas.height / 2) / scale;

    // 等距投影反向公式
    const relX =
      (isoX / Math.cos(Math.PI / 6) + isoY / Math.sin(Math.PI / 6)) / 2;
    const relY =
      (isoY / Math.sin(Math.PI / 6) - isoX / Math.cos(Math.PI / 6)) / 2;

    // 轉換為世界座標
    const worldX = relX + this.camera.x;
    const worldY = relY + this.camera.y;

    return { x: worldX, y: worldY };
  }

  render() {
    // 清空畫布，使用深色背景
    this.ctx.fillStyle = "#0f1419";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 繪製地圖
    this.renderMap();

    // 收集並排序所有遊戲對象
    const allObjects = [
      ...this.npcs,
      ...this.items,
      ...this.monsters.filter((m) => !m.isDead),
      ...this.pets,
      this.player,
      ...this.players.values(),
    ].filter((obj) => obj);

    // 按Y座標排序（從北到南），確保正確的深度排序
    allObjects.sort((a, b) => a.y - b.y);

    // 繪製所有對象
    allObjects.forEach((obj) => this.renderObject2D(obj));

    // 繪製投射物
    this.projectiles.forEach((projectile) => {
      if (!projectile.isFinished) {
        this.renderProjectile2D(projectile);
      }
    });

    // 繪製特效
    this.effects.forEach((effect) => {
      if (!effect.isFinished) {
        this.renderEffect2D(effect);
      }
    });

    // 繪製小地圖
    this.renderMinimap();
  }

  renderObject2D(obj) {
    const screenPos = this.worldToScreen(obj.x, obj.y);

    // 檢查是否在視野內
    if (
      screenPos.x < -100 ||
      screenPos.x > this.canvas.width + 100 ||
      screenPos.y < -100 ||
      screenPos.y > this.canvas.height + 100
    ) {
      return;
    }

    // 所有角色使用統一的比例，不再根據距離縮放
    const scale = 1.0; // 統一比例
    const alpha = 1.0; // 統一透明度

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // 所有物件使用相同的基礎大小
    const baseSize = 32; // 統一大小
    const fontSize = baseSize * scale;

    // 繪製陰影（增強立體感）
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.ctx.fillText(obj.emoji, screenPos.x + 2, screenPos.y + 8); // 陰影偏移

    // 繪製物件
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(obj.emoji, screenPos.x, screenPos.y + 6);

    // 繪製名字
    if (obj.name) {
      const nameSize = 12; // 統一名字大小
      this.ctx.font = `${nameSize}px Arial`;

      let nameColor = "#27ae60"; // NPC
      if (obj === this.player) nameColor = "#e74c3c"; // 玩家
      else if (obj.isAI) nameColor = "#f39c12"; // AI玩家
      else if (obj.damage !== undefined) nameColor = "#e74c3c"; // 怪物

      // 名字陰影
      this.ctx.fillStyle = "rgba(0,0,0,0.7)";
      this.ctx.fillText(
        obj.name,
        screenPos.x + 1,
        screenPos.y + fontSize * 0.9 + 1
      );

      // 名字本體
      this.ctx.fillStyle = nameColor;
      this.ctx.fillText(obj.name, screenPos.x, screenPos.y + fontSize * 0.9);
    }

    // 繪製血量條（3D風格）
    if (obj.hp !== undefined && obj.hp < obj.maxHp) {
      const barWidth = 40; // 統一血量條寬度
      const barHeight = 5; // 統一血量條高度
      const barY = screenPos.y - fontSize * 0.6;

      // 血量條陰影
      this.ctx.fillStyle = "rgba(0,0,0,0.5)";
      this.ctx.fillRect(
        screenPos.x - barWidth / 2 + 1,
        barY + 1,
        barWidth,
        barHeight
      );

      // 血量條背景
      this.ctx.fillStyle = "#2c3e50";
      this.ctx.fillRect(screenPos.x - barWidth / 2, barY, barWidth, barHeight);

      // 血量條邊框
      this.ctx.strokeStyle = "#1a252f";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        screenPos.x - barWidth / 2,
        barY,
        barWidth,
        barHeight
      );

      // 血量
      const hpWidth = (obj.hp / obj.maxHp) * (barWidth - 2);
      this.ctx.fillStyle = "#e74c3c";
      this.ctx.fillRect(
        screenPos.x - barWidth / 2 + 1,
        barY + 1,
        hpWidth,
        barHeight - 2
      );

      // 血量條高光
      const gradient = this.ctx.createLinearGradient(
        0,
        barY,
        0,
        barY + barHeight
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.3)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        screenPos.x - barWidth / 2 + 1,
        barY + 1,
        hpWidth,
        barHeight - 2
      );
    }

    // 繪製增益效果（玩家）
    if (
      obj === this.player &&
      (obj.speedMultiplier > 1 || obj.attackSpeedMultiplier > 1)
    ) {
      let buffText = "";
      if (obj.speedMultiplier > 1) buffText += "💨";
      if (obj.attackSpeedMultiplier > 1) buffText += "⚡";

      this.ctx.font = `16px Arial`; // 統一增益效果大小

      // 增益效果陰影
      this.ctx.fillStyle = "rgba(0,0,0,0.7)";
      this.ctx.fillText(
        buffText,
        screenPos.x + fontSize * 0.7 + 1,
        screenPos.y - fontSize * 0.4 + 1
      );

      // 增益效果本體
      this.ctx.fillStyle = "#f1c40f";
      this.ctx.fillText(
        buffText,
        screenPos.x + fontSize * 0.7,
        screenPos.y - fontSize * 0.4
      );
    }

    // 繪製互動提示（NPC）
    if (obj.type && this.player) {
      const dist = Math.sqrt(
        Math.pow(obj.x - this.player.x, 2) + Math.pow(obj.y - this.player.y, 2)
      );

      if (dist < 60) {
        this.ctx.font = `10px Arial`; // 統一提示文字大小

        // 提示陰影
        this.ctx.fillStyle = "rgba(0,0,0,0.8)";
        this.ctx.fillText(
          "點擊對話",
          screenPos.x + 1,
          screenPos.y - fontSize * 0.8 + 1
        );

        // 提示本體
        this.ctx.fillStyle = "#f1c40f";
        this.ctx.fillText(
          "點擊對話",
          screenPos.x,
          screenPos.y - fontSize * 0.8
        );
      }
    }

    this.ctx.restore();
  }

  renderProjectile2D(projectile) {
    const screenPos = this.worldToScreen(projectile.x, projectile.y);

    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(projectile.emoji, screenPos.x, screenPos.y);
  }

  renderEffect2D(effect) {
    const screenPos = this.worldToScreen(effect.x, effect.y);
    const elapsed = Date.now() - effect.startTime;
    const alpha = 1 - elapsed / effect.duration;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.font = "14px Arial";
    this.ctx.fillStyle = effect.color;
    this.ctx.textAlign = "center";
    this.ctx.fillText(effect.text, screenPos.x, screenPos.y);
    this.ctx.restore();
  }

  isInView2D(obj) {
    const screenPos = this.worldToScreen(obj.x, obj.y);
    return (
      screenPos.x > -100 &&
      screenPos.x < this.canvas.width + 100 &&
      screenPos.y > -100 &&
      screenPos.y < this.canvas.height + 100
    );
  }

  renderMap() {
    // 先繪製一個完整的背景色，確保沒有空隙
    this.ctx.save();
    this.ctx.fillStyle = "#2ecc71"; // 預設草地顏色
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // 計算需要渲染的地磚範圍
    const scale = 2.5;
    const viewRange =
      Math.max(this.canvas.width, this.canvas.height) / scale + 200;

    const startX = Math.floor((this.camera.x - viewRange) / this.tileSize) - 2;
    const startY = Math.floor((this.camera.y - viewRange) / this.tileSize) - 2;
    const endX = Math.ceil((this.camera.x + viewRange) / this.tileSize) + 2;
    const endY = Math.ceil((this.camera.y + viewRange) / this.tileSize) + 2;

    // 確保不超出地圖邊界
    const clampedStartX = Math.max(0, startX);
    const clampedStartY = Math.max(0, startY);
    const clampedEndX = Math.min(this.map[0].length, endX);
    const clampedEndY = Math.min(this.map.length, endY);

    // 使用新的連續渲染方式
    for (let y = clampedStartY; y < clampedEndY; y++) {
      for (let x = clampedStartX; x < clampedEndX; x++) {
        const tile = this.map[y][x];
        const worldX = x * this.tileSize;
        const worldY = y * this.tileSize;
        const screenPos = this.worldToScreen(worldX, worldY);

        this.renderSolidTile(tile, screenPos.x, screenPos.y, worldX, worldY);
      }
    }
  }

  renderSolidTile(tile, screenX, screenY, worldX, worldY) {
    // 跳過不在視野內的磚塊
    if (
      screenX < -200 ||
      screenX > this.canvas.width + 200 ||
      screenY < -200 ||
      screenY > this.canvas.height + 200
    ) {
      return;
    }

    this.ctx.save();

    // 啟用抗鋸齒以獲得平滑邊緣
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    // 使用浮點數座標獲得更平滑的渲染
    const tileW = this.tileSize * 0.866; // 不強制整數
    const tileH = this.tileSize * 0.5; // 不強制整數

    // 設定顏色
    let fillColor;
    switch (tile) {
      case "grass":
        fillColor = "#2ecc71";
        break;
      case "water":
        fillColor = "#3498db";
        break;
      case "forest":
        fillColor = "#27ae60";
        break;
      case "mountain":
        fillColor = "#95a5a6";
        break;
      case "desert":
        fillColor = "#f39c12";
        break;
      default:
        fillColor = "#34495e";
    }

    // 水面動畫
    if (tile === "water") {
      const wave =
        Math.sin(Date.now() * 0.003 + worldX * 0.01 + worldY * 0.01) * 0.1;
      this.ctx.globalAlpha = 0.8 + wave;
    } else {
      this.ctx.globalAlpha = 1.0;
    }

    // 精確計算菱形頂點
    const points = [
      { x: screenX, y: screenY - tileH }, // 上點
      { x: screenX + tileW, y: screenY }, // 右點
      { x: screenX, y: screenY + tileH }, // 下點
      { x: screenX - tileW, y: screenY }, // 左點
    ];

    // 使用更大的菱形確保覆蓋
    const expandedPoints = [
      { x: screenX, y: screenY - tileH - 1 },
      { x: screenX + tileW + 1, y: screenY },
      { x: screenX, y: screenY + tileH + 1 },
      { x: screenX - tileW - 1, y: screenY },
    ];

    // 先繪製擴大的菱形作為底層
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    this.ctx.moveTo(expandedPoints[0].x, expandedPoints[0].y);
    this.ctx.lineTo(expandedPoints[1].x, expandedPoints[1].y);
    this.ctx.lineTo(expandedPoints[2].x, expandedPoints[2].y);
    this.ctx.lineTo(expandedPoints[3].x, expandedPoints[3].y);
    this.ctx.closePath();
    this.ctx.fill();

    // 再繪製精確的菱形
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    this.ctx.lineTo(points[1].x, points[1].y);
    this.ctx.lineTo(points[2].x, points[2].y);
    this.ctx.lineTo(points[3].x, points[3].y);
    this.ctx.closePath();
    this.ctx.fill();

    // 添加平滑的立體效果
    if (tile !== "water") {
      // 創建從上到下的漸變
      const gradient = this.ctx.createLinearGradient(
        screenX,
        screenY - tileH,
        screenX,
        screenY + tileH
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.2)"); // 頂部高光
      gradient.addColorStop(0.4, "rgba(255,255,255,0.1)"); // 中間
      gradient.addColorStop(0.6, "rgba(0,0,0,0.05)"); // 中下
      gradient.addColorStop(1, "rgba(0,0,0,0.15)"); // 底部陰影

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      this.ctx.lineTo(points[1].x, points[1].y);
      this.ctx.lineTo(points[2].x, points[2].y);
      this.ctx.lineTo(points[3].x, points[3].y);
      this.ctx.closePath();
      this.ctx.fill();

      // 添加左右側面的差異化
      // 左側稍微暗一些
      this.ctx.fillStyle = "rgba(0,0,0,0.08)";
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      this.ctx.lineTo(points[3].x, points[3].y);
      this.ctx.lineTo(points[2].x, points[2].y);
      this.ctx.lineTo(screenX, screenY);
      this.ctx.closePath();
      this.ctx.fill();

      // 右側稍微亮一些
      this.ctx.fillStyle = "rgba(255,255,255,0.05)";
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      this.ctx.lineTo(screenX, screenY);
      this.ctx.lineTo(points[2].x, points[2].y);
      this.ctx.lineTo(points[1].x, points[1].y);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // 特殊地形效果
    if (tile === "water") {
      // 水面反光 - 使用更平滑的橢圓
      this.ctx.globalAlpha =
        0.3 + Math.sin(Date.now() * 0.005 + worldX * 0.02) * 0.1;
      this.ctx.fillStyle = "rgba(255,255,255,0.4)";
      this.ctx.beginPath();
      this.ctx.ellipse(
        screenX,
        screenY - tileH * 0.3,
        tileW * 0.4,
        tileH * 0.2,
        0,
        0,
        Math.PI * 2
      );
      this.ctx.fill();

      // 第二層反光
      this.ctx.globalAlpha = 0.2;
      this.ctx.beginPath();
      this.ctx.ellipse(
        screenX + tileW * 0.3,
        screenY + tileH * 0.2,
        tileW * 0.2,
        tileH * 0.1,
        0,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    } else if (tile === "forest") {
      // 森林 - 大型樹木，檢查玩家位置決定透明度
      const playerDistance = this.player
        ? Math.sqrt(
            Math.pow(worldX - this.player.x, 2) +
              Math.pow(worldY - this.player.y, 2)
          )
        : 999;

      // 如果玩家接近樹木，使用半透明效果
      const treeAlpha = playerDistance < this.tileSize * 1.5 ? 0.4 : 0.9;
      this.ctx.globalAlpha = treeAlpha;

      // 使用固定的偽隨機位置
      const seed = Math.sin(worldX * 0.001) * Math.cos(worldY * 0.001);
      const treePositions = [
        {
          x: screenX + seed * tileW * 0.4,
          y: screenY + seed * tileH * 0.3,
          size: 1.2,
        },
        {
          x: screenX - seed * tileW * 0.3,
          y: screenY - seed * tileH * 0.2,
          size: 1.0,
        },
        {
          x: screenX + seed * tileW * 0.1,
          y: screenY + seed * tileH * 0.4,
          size: 0.8,
        },
      ];

      treePositions.forEach((tree) => {
        const treeHeight = 25 * tree.size;
        const trunkWidth = 3 * tree.size;
        const crownRadius = 8 * tree.size;

        // 樹幹 - 更高更粗
        this.ctx.fillStyle = "#654321";
        this.ctx.fillRect(
          tree.x - trunkWidth / 2,
          tree.y - treeHeight / 3,
          trunkWidth,
          treeHeight
        );

        // 樹幹陰影
        this.ctx.fillStyle = "#4a3018";
        this.ctx.fillRect(
          tree.x,
          tree.y - treeHeight / 3,
          trunkWidth / 2,
          treeHeight
        );

        // 樹冠底層陰影
        this.ctx.fillStyle = "#1a5d1a";
        this.ctx.beginPath();
        this.ctx.arc(
          tree.x + 2,
          tree.y - treeHeight / 2 + 2,
          crownRadius,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // 樹冠主體
        this.ctx.fillStyle = "#228B22";
        this.ctx.beginPath();
        this.ctx.arc(
          tree.x,
          tree.y - treeHeight / 2,
          crownRadius,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // 樹冠高光
        this.ctx.fillStyle = "#32CD32";
        this.ctx.beginPath();
        this.ctx.arc(
          tree.x - crownRadius / 3,
          tree.y - treeHeight / 2 - crownRadius / 3,
          crownRadius / 2,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // 頂部亮點
        this.ctx.fillStyle = "#90EE90";
        this.ctx.beginPath();
        this.ctx.arc(
          tree.x - crownRadius / 4,
          tree.y - treeHeight / 2 - crownRadius / 2,
          crownRadius / 4,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      });
    } else if (tile === "mountain") {
      // 山脈 - 更大更自然的岩石
      this.ctx.globalAlpha = 1.0;

      const rockSeed = Math.sin(worldX * 0.001) * Math.cos(worldY * 0.001);
      const rockSize = 1.5; // 放大倍數

      // 主要岩石群
      const rocks = [
        {
          x: screenX + rockSeed * tileW * 0.2,
          y: screenY + rockSeed * tileH * 0.1,
          size: rockSize * 1.2,
          type: "main",
        },
        {
          x: screenX - rockSeed * tileW * 0.3,
          y: screenY - rockSeed * tileH * 0.2,
          size: rockSize * 0.8,
          type: "side",
        },
        {
          x: screenX + rockSeed * tileW * 0.4,
          y: screenY + rockSeed * tileH * 0.3,
          size: rockSize * 0.6,
          type: "small",
        },
      ];

      rocks.forEach((rock) => {
        const rockW = tileW * 0.4 * rock.size;
        const rockH = tileH * 0.8 * rock.size;

        if (rock.type === "main") {
          // 大岩石 - 不規則形狀
          this.ctx.fillStyle = "#8B8B8B";
          this.ctx.beginPath();
          this.ctx.moveTo(rock.x, rock.y - rockH);
          this.ctx.lineTo(rock.x + rockW * 0.7, rock.y - rockH * 0.3);
          this.ctx.lineTo(rock.x + rockW, rock.y + rockH * 0.2);
          this.ctx.lineTo(rock.x + rockW * 0.3, rock.y + rockH);
          this.ctx.lineTo(rock.x - rockW * 0.5, rock.y + rockH * 0.6);
          this.ctx.lineTo(rock.x - rockW * 0.8, rock.y - rockH * 0.2);
          this.ctx.closePath();
          this.ctx.fill();

          // 岩石陰影
          this.ctx.fillStyle = "#5a5a5a";
          this.ctx.beginPath();
          this.ctx.moveTo(rock.x, rock.y - rockH);
          this.ctx.lineTo(rock.x + rockW * 0.7, rock.y - rockH * 0.3);
          this.ctx.lineTo(rock.x + rockW, rock.y + rockH * 0.2);
          this.ctx.lineTo(rock.x + rockW * 0.3, rock.y + rockH);
          this.ctx.lineTo(rock.x, rock.y + rockH * 0.3);
          this.ctx.closePath();
          this.ctx.fill();

          // 岩石高光
          this.ctx.fillStyle = "#C0C0C0";
          this.ctx.beginPath();
          this.ctx.moveTo(rock.x, rock.y - rockH);
          this.ctx.lineTo(rock.x - rockW * 0.8, rock.y - rockH * 0.2);
          this.ctx.lineTo(rock.x - rockW * 0.5, rock.y + rockH * 0.6);
          this.ctx.lineTo(rock.x, rock.y + rockH * 0.3);
          this.ctx.closePath();
          this.ctx.fill();
        } else {
          // 小岩石 - 橢圓形
          this.ctx.fillStyle = rock.type === "side" ? "#A9A9A9" : "#999999";
          this.ctx.beginPath();
          this.ctx.ellipse(
            rock.x,
            rock.y,
            rockW / 2,
            rockH / 3,
            0,
            0,
            Math.PI * 2
          );
          this.ctx.fill();

          // 小岩石高光
          this.ctx.fillStyle = "rgba(192,192,192,0.6)";
          this.ctx.beginPath();
          this.ctx.ellipse(
            rock.x - rockW / 4,
            rock.y - rockH / 6,
            rockW / 4,
            rockH / 6,
            0,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }
      });
    } else if (tile === "desert") {
      // 沙漠 - 更自然的沙丘效果
      this.ctx.globalAlpha = 0.6;

      const desertSeed = Math.sin(worldX * 0.005) * Math.cos(worldY * 0.005);

      // 大沙丘
      this.ctx.fillStyle = "rgba(255,218,185,0.3)";
      this.ctx.beginPath();
      this.ctx.ellipse(
        screenX + desertSeed * tileW * 0.2,
        screenY + desertSeed * tileH * 0.1,
        tileW * 0.8,
        tileH * 0.4,
        0,
        0,
        Math.PI * 2
      );
      this.ctx.fill();

      // 沙丘紋理線
      for (let i = 0; i < 3; i++) {
        const lineY = screenY - tileH * 0.3 + i * tileH * 0.2;
        this.ctx.strokeStyle = "rgba(255,215,0,0.4)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX - tileW * 0.6, lineY);
        this.ctx.quadraticCurveTo(
          screenX,
          lineY - 3,
          screenX + tileW * 0.6,
          lineY
        );
        this.ctx.stroke();
      }
    } else if (tile === "grass") {
      // 草地 - 更自然的草叢
      const grassSeed = Math.sin(worldX * 0.01) * Math.cos(worldY * 0.01);

      if (Math.abs(grassSeed) > 0.2) {
        this.ctx.globalAlpha = 0.6;

        // 草叢
        const grassClusters = [
          {
            x: screenX + grassSeed * tileW * 0.4,
            y: screenY + grassSeed * tileH * 0.3,
          },
          {
            x: screenX - grassSeed * tileW * 0.3,
            y: screenY - grassSeed * tileH * 0.2,
          },
          {
            x: screenX + grassSeed * tileW * 0.1,
            y: screenY + grassSeed * tileH * 0.4,
          },
        ];

        grassClusters.forEach((cluster) => {
          // 草叢底部
          this.ctx.fillStyle = "#228B22";
          this.ctx.beginPath();
          this.ctx.ellipse(cluster.x, cluster.y + 2, 3, 1, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // 草葉
          for (let i = 0; i < 4; i++) {
            this.ctx.strokeStyle = i % 2 === 0 ? "#32CD32" : "#228B22";
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(cluster.x + (i - 2) * 0.5, cluster.y + 2);
            this.ctx.lineTo(cluster.x + (i - 2) * 0.8, cluster.y - 4);
            this.ctx.stroke();
          }
        });
      }
    }

    this.ctx.restore();
  }

  renderMinimap() {
    const scale = 0.1;
    this.minimapCtx.fillStyle = "#1a252f";
    this.minimapCtx.fillRect(0, 0, this.minimap.width, this.minimap.height);

    // 繪製地圖概覽
    for (let y = 0; y < this.map.length; y += 2) {
      for (let x = 0; x < this.map[y].length; x += 2) {
        const tile = this.map[y][x];
        const screenX = x * scale;
        const screenY = y * scale;

        switch (tile) {
          case "water":
            this.minimapCtx.fillStyle = "#2980b9";
            break;
          case "forest":
            this.minimapCtx.fillStyle = "#0f5d5d";
            break;
          case "mountain":
            this.minimapCtx.fillStyle = "#7f8c8d";
            break;
          case "desert":
            this.minimapCtx.fillStyle = "#d68910";
            break;
          default:
            this.minimapCtx.fillStyle = "#196f3d";
        }

        this.minimapCtx.fillRect(screenX, screenY, 2, 2);
      }
    }

    // 繪製玩家位置
    if (this.player) {
      this.minimapCtx.fillStyle = "#e74c3c";
      this.minimapCtx.fillRect(
        this.player.x * scale - 1,
        this.player.y * scale - 1,
        3,
        3
      );
    }

    // 繪製其他玩家
    this.players.forEach((player) => {
      this.minimapCtx.fillStyle = "#f39c12";
      this.minimapCtx.fillRect(
        player.x * scale - 1,
        player.y * scale - 1,
        2,
        2
      );
    });
  }

  isInView(obj) {
    return (
      obj.x + 50 > this.camera.x &&
      obj.x - 50 < this.camera.x + this.canvas.width &&
      obj.y + 50 > this.camera.y &&
      obj.y - 50 < this.camera.y + this.canvas.height
    );
  }

  spawnRandomMonster() {
    const monsters = [
      { emoji: "👹", name: "哥布林", hp: 60, damage: 15, expReward: 25 },
      { emoji: "💀", name: "骷髏", hp: 80, damage: 20, expReward: 30 },
      { emoji: "🐺", name: "野狼", hp: 70, damage: 18, expReward: 28 },
      { emoji: "🧟", name: "殭屍", hp: 90, damage: 12, expReward: 35 },
      { emoji: "🕷️", name: "巨蜘蛛", hp: 50, damage: 25, expReward: 20 },
      { emoji: "🐻", name: "棕熊", hp: 120, damage: 22, expReward: 40 },
      { emoji: "🦅", name: "巨鷹", hp: 40, damage: 30, expReward: 18 },
      { emoji: "🐍", name: "毒蛇", hp: 35, damage: 28, expReward: 15 },
    ];

    const template = monsters[Math.floor(Math.random() * monsters.length)];

    // 增加同時生成多隻怪物的機率
    const spawnCount = Math.random() < 0.3 ? 2 : 1;

    for (let i = 0; i < spawnCount; i++) {
      const x = Math.random() * this.worldWidth;
      const y = Math.random() * this.worldHeight;
      this.monsters.push(new Monster(x, y, template));
    }
  }

  updateUI() {
    if (!this.player) return;

    document.getElementById("currentHp").textContent = this.player.hp;
    document.getElementById("maxHp").textContent = this.player.maxHp;
    document.getElementById("currentMp").textContent = this.player.mp;
    document.getElementById("maxMp").textContent = this.player.maxMp;
    document.getElementById("currentExp").textContent = this.player.exp;
    document.getElementById("maxExp").textContent = this.player.maxExp;
    document.getElementById("playerLevel").textContent = this.player.level;
    document.getElementById("playerGold").textContent = this.player.gold;
    document.getElementById("inventoryGold").textContent = this.player.gold;

    document.getElementById("hpBar").style.width =
      (this.player.hp / this.player.maxHp) * 100 + "%";
    document.getElementById("mpBar").style.width =
      (this.player.mp / this.player.maxMp) * 100 + "%";
    document.getElementById("expBar").style.width =
      (this.player.exp / this.player.maxExp) * 100 + "%";

    // 更新增益效果顯示
    this.updateBuffStatus();
  }

  updateBuffStatus() {
    if (!this.player) return;

    const statusPanel = document.querySelector(".status-panel");
    let existingBuffDiv = statusPanel.querySelector(".buff-status");

    if (!existingBuffDiv) {
      existingBuffDiv = document.createElement("div");
      existingBuffDiv.className = "buff-status";
      existingBuffDiv.style.marginTop = "10px";
      existingBuffDiv.style.fontSize = "11px";
      statusPanel.appendChild(existingBuffDiv);
    }

    let buffText = "";
    const now = Date.now();

    if (this.player.speedBoostEnd > now) {
      const remaining = Math.ceil((this.player.speedBoostEnd - now) / 1000);
      buffText += `💨 移速 x${this.player.speedMultiplier} (${remaining}s)<br>`;
    }

    if (this.player.attackSpeedBoostEnd > now) {
      const remaining = Math.ceil(
        (this.player.attackSpeedBoostEnd - now) / 1000
      );
      buffText += `⚡ 攻速 x${this.player.attackSpeedMultiplier} (${remaining}s)<br>`;
    }

    existingBuffDiv.innerHTML = buffText;
  }

  addChatMessage(message, sender = "System", color = "#bdc3c7") {
    const messages = document.getElementById("chatMessages");
    const div = document.createElement("div");
    div.innerHTML = `<span style="color: ${color};">[${sender}]</span> ${message}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;

    switch (type) {
      case "success":
        notification.style.background = "rgba(39, 174, 96, 0.9)";
        break;
      case "error":
        notification.style.background = "rgba(231, 76, 60, 0.9)";
        break;
      case "warning":
        notification.style.background = "rgba(243, 156, 18, 0.9)";
        break;
      default:
        notification.style.background = "rgba(52, 73, 94, 0.9)";
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}
