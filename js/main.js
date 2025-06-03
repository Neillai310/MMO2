// 全域變數
let game = null;

// 遊戲函數
function startGame() {
  const playerName = document.getElementById("playerName").value.trim();

  if (!playerName) {
    alert("請輸入角色名稱！");
    return;
  }

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("playerInfo").textContent = playerName;

  game = new Game();
  game.start(playerName);
}

function handleChatInput(event) {
  if (event.key === "Enter") {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();

    if (message && game) {
      game.sendChatMessage(message);
      input.value = "";
    }
  }
}

function summonPet() {
  if (!game || !game.player) return;

  const petTypes = ["fire", "water", "earth", "air", "dragon"];
  const randomType = petTypes[Math.floor(Math.random() * petTypes.length)];

  game.sendSummonPet(randomType);
}

function toggleInventory() {
  game.toggleInventory();
}

function toggleEquipment() {
  game.toggleEquipment();
}

function toggleMagic() {
  game.toggleMagic();
}

function closeDialog() {
  game.closeDialog();
}

function showShop() {
  game.showShop();
}

function confirmPurchase() {
  game.confirmPurchase();
}

// 文檔載入完成後的初始化
document.addEventListener("DOMContentLoaded", function () {
  // 監聽購買數量變化
  const quantityInput = document.getElementById("purchaseQuantity");
  if (quantityInput) {
    quantityInput.addEventListener("input", function () {
      if (game) {
        game.updatePurchasePrice();
      }
    });
  }

  // 阻止右鍵選單和空白鍵滾動
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
    }
  });
});
