var ready = false;

var mapdata = { "name": "", "creator": "", "bg": "plains", "void": 120, "spawn": [0, 0], "blocks": [] }

gameWidth = window.innerWidth;
gameHeight = window.innerHeight;

gravity = 0.8;
hovering = null;
gridX = 0;
gridY = 0;
distX = 0;
distY = 0;
action = "none";

inventory = [];
using = 0;

isCreator = false;
menuOpen = false;

playerX = 0;
playerY = 0;
playerVelocityX = 0;
playerVelocityY = 0;
canJump = false;

function showBasicInfo() {
    for (e = 0; e < document.getElementsByClassName("level-id").length; e++) {
        document.getElementsByClassName("level-id").item(e).innerHTML = mapdata["name"];
    }
}

function loadUploadMap(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        const jsonString = e.target.result;
        let jsonData;
        try {
            jsonData = JSON.parse(jsonString);
            mapdata = jsonData;
            ready = true;
            showBasicInfo();
        } catch (error) {
            console.error('Error loading Map File: ' + error);
        }
    };
    reader.readAsText(file);
}

function loadOficialMap(map) {
    fetch('./maps/' + map + ".craftymap")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            mapdata = data;
            playerX = mapdata["spawn"][0];
            playerY = mapdata["spawn"][1];
            ready = true;
            showBasicInfo();
        })
        .catch(error => {
            console.error('Error loading Map File: ' + error);
        });
}

function loadServerMap(map) {
    firebase.database().ref("adventurous_world/maps/" + map).once('value', data => {
        mapdata = data.val();
        ready = true;
        showBasicInfo();
    })
}

function collision(ax, ay, bx, by) {
    if (ax < bx + 50 && ax + 50 > bx && ay < by + 50 && ay + 50 > by) {
        return true;
    }
    return false;
}

function functionalBlock(id) {
    block = mapdata["blocks"][id]
    if (block["type"] == "final") {
        endGame();
    } else if (block["type"] == "teleporter") {
        playerX = block["target"][0] || mapdata["spawn"][0];
        playerY = block["target"][1] || mapdata["spawn"][1];
    } else if (block["type"] == "slime") {
        playerVelocityY = -block["force"] || -10;
    }
}

function preload() {
    bg_empty = loadImage("./background_assets/empty_bg.png");
    bg_islandy = loadImage("./background_assets/islandy_bg.png");
    bg_plains = loadImage("./background_assets/plains_bg.png");
    asset_player = loadImage("./interactor_assets/ExplorerPlayer.png");
    asset_player_flip = loadImage("./interactor_assets/ExplorerPlayer-Flipped.png");
    asset_axe = loadImage("./interactor_assets/axe.png");
    asset_pick = loadImage("./interactor_assets/pickaxe.jpg");
    block_dirt = loadImage("./block_assets/Dirt.jpg");
    block_grass = loadImage("./block_assets/Grass.jpg");
    block_leaves = loadImage("./block_assets/Leaves.jpg");
    block_planks = loadImage("./block_assets/Planks.jpg");
    block_stone = loadImage("./block_assets/stone.png");
    block_wood = loadImage("./block_assets/Wood.jpg");
    block_quartz = loadImage("./block_assets/quartz.png");
    block_glass = loadImage("./block_assets/glass.png");
    block_slime = loadImage("./block_assets/SlimeBlock.png");
    block_final = loadImage("./block_assets/EnderFinish.png");
    block_teleporter = loadImage("./block_assets/EnderTeleporter.png");
    block_chest = loadImage("./block_assets/Chest.png");
    block_spawner = loadImage("./block_assets/spawner.png");
}

function setup() {
    canvas = createCanvas(gameWidth, gameHeight);
    canvas.parent("canvas-holder");
    frameRate(100);
}

lowUpdates = 0;

function draw() {
    if (ready) {
        //data
        hovering = null;
        gridX = Math.floor((mouseX + (camera.x - gameWidth / 2)) / 50) * 50;
        gridY = Math.floor((mouseY + (camera.y + 20 - gameHeight / 2)) / 50) * 50;
        distX = Math.abs(playerX - gridX);
        distY = Math.abs(playerY - gridY);
        //controls
        if (!menuOpen) {
            if (isCreator && (keyDown("s") || keyDown("down"))) {
                playerVelocityY = 5;
            } else if (isCreator) {
                playerVelocityY = 0;
            } else {
                playerVelocityY += gravity;
            }
            if ((keyDown("w") || keyDown("up") || keyDown("space")) && isCreator) {
                playerVelocityY = -5;
            } else if ((keyDown("w") || keyDown("up") || keyDown("space")) && canJump) {
                playerVelocityY = -10;
            }
            if (keyDown("a") || keyDown("left")) {
                playerVelocityX = -5;
            }
            else if (keyDown("d") || keyDown("right")) {
                playerVelocityX = 5;
            } else {
                playerVelocityX = 0;
            }
        }
        //bg
        if (mapdata["bg"] == "plains") {
            image(bg_plains, camera.x - gameWidth / 2, camera.y - gameHeight / 2, gameWidth, gameHeight);
        } else if (mapdata["bg"] == "islandy") {
            image(bg_islandy, camera.x - gameWidth / 2, camera.y - gameHeight / 2, gameWidth, gameHeight);
        } else {
            image(bg_empty, camera.x - gameWidth / 2, camera.y - gameHeight / 2, gameWidth, gameHeight);
        }
        //blocks
        readingBlockId = 0;
        canJump = false;
        for (block of mapdata["blocks"]) {
            if (Math.abs(playerX - (block["x"]+25)) < gameWidth / 2 && Math.abs(playerY - (block["y"]+25)) < gameHeight / 3) {
                if (block["interactive"]) {
                    if (collision(playerX, playerY, block["x"], block["y"]) && !isCreator) {
                        functionalBlock(readingBlockId);
                    }
                } else if (block["solid"]) {
                    if (collision(playerX + playerVelocityX, playerY, block["x"], block["y"]) && !isCreator) {
                        playerVelocityX = 0;
                    }
                    if (collision(playerX, playerY + playerVelocityY, block["x"], block["y"]) && !isCreator) {
                        playerVelocityY = 0;
                    }
                    if (collision(playerX, playerY + 10, block["x"], block["y"]) || isCreator) {
                        canJump = true;
                    }
                }
                if (block["tint"] && block["solid"]) {
                    tint(block["tint"][0], block["tint"][1], block["tint"][2], block["tint"][3]);
                } else if (block["tint"] && !block["solid"]) {
                    tint(block["tint"][0] - 50, block["tint"][1] - 50, block["tint"][2] - 50, block["tint"][3]);
                } else if (!block["solid"]) {
                    tint(150, 150, 150);
                } else {
                    tint(255);
                }
                if (block["type"] == "dirt") {
                    image(block_dirt, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "grass") {
                    image(block_grass, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "leaves") {
                    image(block_leaves, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "planks") {
                    image(block_planks, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "stone") {
                    image(block_stone, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "wood") {
                    image(block_wood, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "quartz") {
                    image(block_quartz, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "glass") {
                    image(block_glass, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "slime") {
                    image(block_slime, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "final") {
                    image(block_final, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "teleporter") {
                    image(block_teleporter, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "spawner") {
                    image(block_spawner, block["x"], block["y"], 50, 50);
                } else if (block["type"] == "chest") {
                    image(block_chest, block["x"], block["y"], 50, 50);
                }
                if (collision(gridX, gridY, block["x"], block["y"])) {
                    hovering = readingBlockId
                }
            }
            readingBlockId += 1;
        }
        //player
        tint(255)
        playerX += playerVelocityX;
        playerY += playerVelocityY;
        if (playerY > mapdata["void"] && !isCreator) {
            playerX = mapdata["spawn"][0];
            playerY = mapdata["spawn"][1];
        }
        camera.x = playerX;
        camera.y = playerY;
        if (playerVelocityX < 0) {
            image(asset_player_flip, playerX, playerY, 50, 50);
        } else {
            image(asset_player, playerX, playerY, 50, 50);
        }
        tint(255, 127)
        if (action == "placing") {
            image(block_planks, gridX, gridY, 50, 50);
        } else if (action == "removing") {
            image(asset_pick, gridX, gridY, 50, 50);
        } else if (action == "editing") {
            image(asset_axe, gridX, gridY, 50, 50);
        } else {
            fill("rgba(0,0,0,0)");
            stroke("white");
            strokeWeight(1);
            rect(gridX, gridY, 50, 50);
        }
        if (isCreator) {
            stroke("red")
            line(camera.x - gameWidth / 2, mapdata["void"], camera.x + gameWidth / 2, mapdata["void"]);
            stroke("green");
            text("X: " + gridX + " Y: " + gridY, camera.x - 10, camera.y - gameHeight / 3 + 10)
        }
        //low upd
        if (lowUpdates >= 15) {
            previousGameWidth = gameWidth;
            previousGameHeight = gameHeight;
            gameWidth = window.innerWidth;
            gameHeight = window.innerHeight;
            if (gameWidth != previousGameWidth || gameHeight != previousGameHeight) {
                console.info("Change Game Window Size");
                resizeCanvas(gameWidth, gameHeight)
            }
            lowUpdates = 0;
        } else {
            lowUpdates += 1
        }
    }
}

function removeBlock(id) {
    newBlocks = [];
    readingBlockId = 0;
    for (block of mapdata["blocks"]) {
        if (!(readingBlockId == id)) {
            newBlocks.push(block);
        }
        readingBlockId += 1;
    }
    mapdata["blocks"] = newBlocks;
}

function selectFromInventory(slot) {
    if (
        inventory[slot]["type"] == "dirt" ||
        inventory[slot]["type"] == "grass" ||
        inventory[slot]["type"] == "leaves" ||
        inventory[slot]["type"] == "planks" ||
        inventory[slot]["type"] == "stone" ||
        inventory[slot]["type"] == "wood" ||
        inventory[slot]["type"] == "quartz" ||
        inventory[slot]["type"] == "glass" ||
        inventory[slot]["type"] == "slime" ||
        inventory[slot]["type"] == "final" ||
        inventory[slot]["type"] == "teleporter" ||
        inventory[slot]["type"] == "spawner" ||
        inventory[slot]["type"] == "chest"
    ) {
        action = "placing";
        using = slot;
    } else if (inventory[slot]["type"] == "pickaxe") {
        action = "removing";
    } else if (inventory[slot]["type"] == "axe") {
        action = "editing";
    } else {
        action = "none";
    }
}

function mouseClicked() {
    if (distY < gameHeight / 3 && !menuOpen) {
        if ((distX < 150 && distY < 150) || isCreator) {
            if (action == "placing") {
                placing = inventory[using];
                mapdata["blocks"].push({ ...placing, "x": gridX, "y": gridY });
            } else if (action == "removing") {
                removeBlock(hovering)
            } else if (action == "editing") {
                editBlock(hovering);
            }
        }
    }
}