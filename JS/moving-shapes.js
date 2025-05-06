const canvas = document.getElementById("movingShapesCanvas")
const context = canvas.getContext("2d")
const startButton = document.getElementById("start-btn");

const card = document.getElementById("card");
const cardScore = document.getElementById("card-score");

var keys = []; //where keyboard keys are stored
// keep a count of how far to move our triangle as a result of arrow key presses
var deltaX = 0;
var deltaY = 0;

//SFX
let scoreSFX = new Audio("https://ia903403.us.archive.org/0/items/classiccoin/classiccoin.mp3")
let gameOverSFX = new Audio("https://ia903407.us.archive.org/20/items/smb_gameover/smb_gameover.mp3")
let jumpSFX = new Audio("https://ia903405.us.archive.org/21/items/jump_20210424/jump.mp3")

let blockGenerationTimeout = null;
//Used for 'setInterval'
let presetTime = 1000;
//Enemy can speed up when player has scored points at intervals of 10
let enemySpeed = 5;
let score = 0;
//Used to see if user has scored another 101 points or not
let scoreIncrement = 0;
//So ball doesn't score more than one poiny at a time
let canScore = true;

window.addEventListener("keydown", e => {
    keys[e.keyCode] = true;
    if (keys[13]) {
        startGame();
    }
    e.preventDefault();

}, false)

//on start-game btn click, allow the event listeners to take effect
function startGame() {
    startButton.style.display = "none";
    window.addEventListener("keydown", keysPressed, false)
    window.addEventListener("keyup", keysReleased, false);

    // Clear previous block generation
    if (blockGenerationTimeout) clearTimeout(blockGenerationTimeout);

    player = new Player(30, 350, 50, "#000");
    arrayBlocks = [];
    score = 0;
    scoreIncrement = 0;
    enemySpeed = 5;
    canScore = true;
    presetTime = 1000;
    
    setTimeout(() => { generateBlocks(); }, randomNumberInterval(presetTime))
}

//Restart Game
function restartGame(button){
    card.style.display = "none";
    button.blur();
    gameOverSFX.pause();
    gameOverSFX.currentTime = 0;
    startGame();
    requestAnimationFrame(animate);
}


function drawBackgroundLine() {
    context.beginPath();
    context.moveTo(0, 400);
    context.lineTo(500, 400);
    context.lineWidth = 1.9;
    context.strokeStyle = "black"
    context.stroke();
}

function drawScore() {
    context.font = "80px Arial";
    context.fillStyle = "black";

    let scoreString = score.toString();
    let xOffset = ((scoreString.length - 1) * 20);
    context.fillText(scoreString, 230 - xOffset, 100);
}
//Both Min and Max are included in this random generation function
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNumberInterval(timeInterval) {
    let returnTime = timeInterval;
    if (Math.random() < 0.5) {
        returnTime += getRandomNumber(presetTime / 3, presetTime * 1.5);
    } else {
        returnTime -= getRandomNumber(presetTime / 5, presetTime / 2);
    }
    return returnTime;
}

//1. player class and functions and its instance
class Player {
    constructor(x, y, size, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;

        this.jumpHeight = 12;

        //for jump configuration
        this.shouldJump = false;
        this.jumpCounter = 0; //increment on each frame and allow us to stop when 32 frames are up.

        //related to spin animation (rotation)
        this.spin = 0;
        //Get a perfect 90 degree rotation over 32 frames
        this.spinIncrement = 90 / 32;
    }

    rotation() {
        let offsetXPostion = this.x + (this.size / 2);
        let offsetYPostion = this.y + (this.size / 2);
        context.translate(offsetXPostion, offsetYPostion);
        //Division is there to convert degrees into radians
        context.rotate(this.spin * Math.PI / 180);
        context.rotate(this.spinIncrement * Math.PI / 180);
        context.translate(-offsetXPostion, -offsetYPostion);
        //4.5 because 90/20 (number of iternations in jump) is 4.5
        this.spin += this.spinIncrement;

        /* note: rotation happen relative to the top left corner of the canvas. which will cause the 
        element not to be rotated correctly. so we need to move the corner to the center of the 
        element to ensure it actually rotate around itself. once the jump is made, return the 
        canvas to its original place alongside the other objects. */
    }

    counterRotation() { //method to unrotate the player
        //this rotates the cube back to its origin so that it can be moved upwards properly
        let offsetXPostion = this.x + (this.size / 2);
        let offsetYPostion = this.y + (this.size / 2);
        context.translate(offsetXPostion, offsetYPostion);
        context.rotate(-this.spin * Math.PI / 180);
        context.translate(-offsetXPostion, -offsetYPostion);
    }

    jump() {
        if (this.shouldJump) {
            this.jumpCounter++;
            if (this.jumpCounter < 15) {
                //go up
                this.y -= this.jumpHeight;
            }
            else if (this.jumpCounter > 14 && this.jumpCounter < 19) {
                this.y += 0;
            }
            else if (this.jumpCounter < 33) {
                //come back down
                this.y += this.jumpHeight
            }
            this.rotation();
            //end the cycle
            if (this.jumpCounter >= 32) {
                this.counterRotation();
                this.spin = 0;
                this.shouldJump = false;
            }
        }
    }

    draw() {
        this.jump();
        context.fillStyle = this.color;
        context.fillRect(this.x + deltaX, this.y + deltaY, this.size, this.size);

        //reset the rotation so the rotation of other elements is unchanged
        if (this.shouldJump)
            this.counterRotation();
    }
}
let player = new Player(30, 350, 50, "#000");

class AvoidBlock {
    constructor(size, speed) {
        this.x = canvas.width + size;
        this.y = 400 - size;
        this.size = size;
        this.color = "red"
        this.slideSpeed = speed; //the higher the user score, the more speed you add
    }
    draw() {
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.size, this.size);
    }
    slide() {
        this.draw();
        this.x -= this.slideSpeed;
    }
}

//Auto generate blocks
function generateBlocks() {
    let timeDelay = randomNumberInterval(presetTime);
    arrayBlocks.push(new AvoidBlock(40, enemySpeed));

    blockGenerationTimeout = setTimeout(generateBlocks, timeDelay);
}

//Returns true if colliding
function squaresColliding(player, block) {
    //copying a reference to the object of each class - Player and Block. used to make some modification to some fields without touching the original object
    let s1 = Object.assign(Object.create(Object.getPrototypeOf(player)), player);
    let s2 = Object.assign(Object.create(Object.getPrototypeOf(block)), block);

    // Don't need pixel perfect collision detection
    s2.size = s2.size - 10;
    s2.x = s2.x + 10;
    s2.y = s2.y + 10;

    //is player not colliding with the obstacle
    return !(
        s1.x > s2.x + s2.size || //R1 is to the right of R2
        s1.x + s1.size < s2.x || //R1 to the left of R2
        s1.y > s2.y + s2.size || //R1 is below R2
        s1.y + s1.size < s2.y //R1 is above R2
    );
}

//Returns true if player is past the block
function isPastBlock(player, block) {
    return (
        player.x + (player.size / 2) > block.x + (block.size / 4) &&
        player.x + (player.size / 2) < block.x + (block.size / 4) * 3
    )
}

//Check to see if game speed should be increased
function shouldIncreaseSpeed() {
    if (scoreIncrement + 10 === score) {
        scoreIncrement = score;
        enemySpeed++;
        presetTime >= 100 ? presetTime -= 100 : presetTimentTime = presetTime / 2;
        //Update speed of existing blocks
        arrayBlocks.forEach(block => {
            block.slideSpeed = enemySpeed;
        })
    }
}

let animationId = null;
function animate() {
    animationId = requestAnimationFrame(animate);
    context.clearRect(0, 0, canvas.width, canvas.height);

    //Canvas Logic
    drawBackgroundLine();
    drawScore();
    //Foregorund
    player.draw();

    //Check to see if game speed should be increased
    shouldIncreaseSpeed();

    arrayBlocks.forEach((arrayBlock, index) => {
        arrayBlock.slide();

        //End game as player and enemy have collided
        if (squaresColliding(player, arrayBlock)) {
            gameOverSFX.play();
            cardScore.textContent = score;
            card.style.display = "block";
            cancelAnimationFrame(animationId);
        }

        //User should score a point if this is the case
        if (isPastBlock(player, arrayBlock) && canScore) {
            canScore = false;
            scoreSFX.currentTime = 0;
            scoreSFX.play();
            score++;
        }

        //Delete block that has left the screen
        if ((arrayBlock.x + arrayBlock.size) <= 0) {
            setTimeout(() => {
                arrayBlocks.splice(index, 1);
            }, 0);
        }
    })
}
//contains all blocks to be displayed in the game
let arrayBlocks = [];

animate();



function keysPressed(e) {
    // store an entry for every key pressed and mark it as true (pressed)
    keys[e.keyCode] = true;

    if (keys[32]) {
        if (!player.shouldJump) {
            jumpSFX.play();
            player.jumpCounter = 0;
            player.shouldJump = true;
            canScore = true;
        }
    }
    if (keys[13]) {
        startGame();
    }
    //change the X or Y values then draw the rect again.

    //left
    // if (keys[37]) {
    //     deltaX -= 2;
    // }
    //up
    // if (keys[38]) {
    //     deltaY -= 2;
    // }
    //right
    // if (keys[39]) {
    //     deltaX += 2;
    // }
    //down
    // if (keys[40]) {
    //     deltaY += 2;
    // }

    e.preventDefault();
    player.draw();
}

function keysReleased(e) {
    // mark keys that were released
    keys[e.keyCode] = false;
}