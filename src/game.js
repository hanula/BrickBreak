;(function() {

function randomInt(min, max) {
    return min + Math.round(((max - min) * Math.random()));
}

function loadImage(url, callback) {
    var image = new Image();
    image.onload = callback
    image.onerror = function() {
        log("IMAGE LOAD ERROR");
    }
    image.src = url;
    return image;
}


function isMobile() {
 if( navigator.userAgent.match(/Android/i)
 || navigator.userAgent.match(/webOS/i)
 || navigator.userAgent.match(/iPhone/i)
 || navigator.userAgent.match(/iPad/i)
 || navigator.userAgent.match(/iPod/i)
 || navigator.userAgent.match(/BlackBerry/i)
 || navigator.userAgent.match(/Windows Phone/i)
 ){
    return true;
  }
 else {
    return false;
  }
}

// logging.
function log(){
    var el = document.getElementById('log');
    if(el) {
        for(var i=0;i<arguments.length; i++) {
            el.innerHTML += arguments[i] + ' ';
        }
        el.innerHTML += '<br>';
        el.scrollTop = 999999;
    }
    if(window.console && console.log) {
        console.log.apply(console, arguments);
    }
}


function drawTextCentered(context, text, x, y, xCentered, yCentered) {
    var size = context.measureText(text);
    xCentered = xCentered === undefined ? true : xCentered;
    yCentered = yCentered === undefined ? true: yCentered;

    if(xCentered) x -= size.width / 2;
    if(yCentered) {
        context.save();
        context.textBaseline = 'middle';
    }
    context.fillText(text, x, y);
    if(yCentered) {
        context.restore();
    }
}

function Class() { }
Class.prototype.init = function() {};
Class.extend = function(def) {
    var classDef = function() {
        if (arguments[0] !== Class) { this.init.apply(this, arguments); }
    };

    var proto = new this(Class);
    var superClass = this.prototype;

    proto.$ = superClass;

    for (var n in def) {
        var item = def[n];
        //if (item instanceof Function) item.$ = superClass;
        proto[n] = item;
    }

    classDef.prototype = proto;

    //Give this new class the same static extend method
    classDef.extend = this.extend;
    return classDef;
};


var Keyboard = function() {
    this.down = {};
    var self = this;

    window.onkeydown = function(e) {
        self.down[e.keyCode] = true;
    }
    window.onkeyup = function(e) {
        self.down[e.keyCode] = false;
    }
};

Keyboard.LEFT = 37;
Keyboard.RIGHT = 39;
Keyboard.SPACE = 32;


var Mouse = function(canvas) {
    this.pos = {x: 0, y: 0};
    this.button = 0;

    var self = this;

    this.addListener(canvas, 'mousedown', function(e) {
        self.button = self.getPointerEvent(e).buttons;
    });

    this.addListener(canvas, 'touchstart', function(e) {
        e.preventDefault();
        self.button = self.getPointerEvent(e).buttons || Mouse.LEFT;
        //log("CLICK", self.getPointerEvent(e), e);
    });

    this.addListener(canvas, 'touchend mouseup touchcancel', function(e) {
        e.preventDefault();
        self.button = 0;
    });

    this.addListener(canvas, 'touchmove mousemove', function(e) {
        e.preventDefault();

        var pointer = self.getPointerEvent(e);
        self.pos = {x: pointer.pageX - canvas.offsetLeft,
                    y: pointer.pageY - canvas.offsetTop};
    });
};

Mouse.prototype = {
    addListener: function(elm, events,callback) {
        var eventsArray = events.split(' '),
            i = eventsArray.length;
        while(i--){
            elm.addEventListener( eventsArray[i], callback, false );
        }
    },

    getPointerEvent: function(event) {
        return event.targetTouches ? event.targetTouches[0] : event;
    }
};

Mouse.LEFT = 1;
Mouse.RIGHT = 2;



var Game = Class.extend({
    init: function(screenId) {
        this.canvas = document.getElementById(screenId);
        this.screen = this.canvas.getContext('2d');

        if(this.canvas.width > screen.width) {
            this.canvas.width = screen.width;
        }

        this.size = {x: this.canvas.clientWidth,
                     y: this.canvas.height};
        log("SIZE", this.size.x, this.size.y);

        this.actors = [];
        this.keys = new Keyboard();
        this.mouse = new Mouse(this.canvas);
    },

    run: function() {
        var self = this;
        function tick() {
            self.update();
            self.draw();
            requestAnimationFrame(tick);
        }

        tick();
    },

    update: function() {
        for(var i=0; i<this.actors.length; i++) {
            this.actors[i].update();
        }
    },

    draw: function() {

        for(var i=0; i<this.actors.length; i++) {
            this.actors[i].draw(this.screen);
        }
    },

    drawImageScaled: function(img, scale) {


        scale = 'all';

        if(scale == 'width') {
            scaleX = this.size.x / img.width;
            scaleY = img.height / img.width;
        } else if (scale == 'all') {
            scaleX = this.size.x / img.width;
            scaleY = this.size.y / img.height;
        } else {
            throw new Error("Unkown scale type");
        }

        this.screen.save();
        this.screen.scale(scaleX, scaleY);
        this.screen.drawImage(img, 0, 0);
        this.screen.restore();
    },

    drawImageFit: function(img) {
        this.screen.save();
        //this.screen.scale(scaleX, scaleY);
        this.screen.drawImage(img, 0, 0);
        this.screen.restore();
    },

    removeActors: function(cause) {
        for(var i=0; i<this.actors.length; i++) {
            this.actors[i].onActorRemove(cause);
        }
        this.actors = [];
    },
    removeActor: function(actor, cause) {
        var index = this.actors.indexOf(actor);
        if (index > -1) {
            this.actors.splice(index, 1);
            actor.onActorRemove(cause);
        }
    },

    getCollisions: function(actor, otherType) {
        var collided = [];
        for(var i=0;i<this.actors.length; i++) {
            if(otherType && !(this.actors[i] instanceof otherType)) continue;
            if(actor.colliding(this.actors[i])) {
                collided.push(this.actors[i]);
            }
        }
        return collided;
    },

    addActor: function(actor) {
        this.removeActor(actor);
        this.actors.push(actor);
    },

    getActors: function(type) {
        var actors = [];
        for(var i=0;i<this.actors.length; i++) {
            if(this.actors[i] instanceof type) actors.push(this.actors[i]);
        }
        return actors;
    }

});

var Actor = Class.extend({
    init: function(game) {
        this.game = game;
        this.size = {x: 200, y: 40};
        this.pos = {x: 10, y: this.game.size.y - this.size.y - 10};
        this.vel = {x: 0, y: 0};
        this.color = "#ff0000";
    },

    colliding: function(other) {
        return !(this === other ||
                 this.pos.x + this.size.x < other.pos.x ||
                 this.pos.y + this.size.y < other.pos.y ||
                 this.pos.x > other.pos.x + other.size.x ||
                 this.pos.y > other.pos.y + other.size.y);
    },

    loaded: function() {},
    onActorRemove: function(cause) {},

    update: function() {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
    },
    draw: function(screen) {
        if(this.hasImage) {
            screen.drawImage(this.image, this.pos.x, this.pos.y);
        }
    },

    loadImage: function(filename) {
        var self = this;
        this.image = loadImage('assets/png/' + filename + '.png', function() {
            self.hasImage = true;
            self.size = {x: self.image.width, y: self.image.height};
            self.loaded();
        });
    }
});


var Player = Actor.extend({
    init: function(game) {
        //Actor.call(this, game);
        this.$.init.call(this, game);
        this.loadImage('paddleRed');
        this.speed = 16;

        var self = this;
        var mouse = this.game.mouse;
        mouse.addListener(this.game.canvas,
                          'click touchstart',
                          function() {
                                self.ball.free = true;
                                self.moveToMouse();
                          });
    },

    loaded: function() {
        this.addBall();
    },

    addBall: function() {
        if(!this.ball) {
            this.ball = new Ball(this);
            this.game.addActor(this.ball);
        }
        this.ball.moveToPlayer();
    },


    moveToMouse: function() {
        new_x = this.game.mouse.pos.x - this.size.x / 2;
        //this.pos.x = new_x;

        if((new_x < this.game.size.x - this.size.x) &&
           (new_x >= 0))  {
            this.pos.x = new_x;
        }
    },

    update: function() {
        var new_x = this.pos.x,
            keys = this.game.keys,
            mouse = this.game.mouse;

        if (keys.down[Keyboard.LEFT]) {
            new_x -= this.speed;
        } else if (keys.down[Keyboard.RIGHT]) {
            new_x += this.speed;
        }

        if(keys.down[Keyboard.SPACE]) {
            this.ball.free = true;
        }


        if((new_x < this.game.size.x - this.size.x) &&
           (new_x >= 0))  {
            this.pos.x = new_x;
        }

        if(mouse.pos) {
            this.moveToMouse();
        }

    },

    onBallLost: function() {
        this.game.onPlayerDie();
        this.addBall();
    },

    onActorRemove: function(cause) {
        this.game.removeActor(this.ball);
    }
});

var Brick = Actor.extend({
    init: function(game, pos, version) {
        this.$.init.call(this, game);
        this.color = 'blue';
        this.pos = pos;
        this.size.x = Brick.WIDTH;
        var name = Brick.names[version % Brick.names.length];
        this.loadImage('element_' + name + '_rectangle');
    },

    onActorRemove: function(cause) {
        if(cause == 'shot') {
           this.game.addScore(Brick.SCORE_VALUE);
        }
    }
});
Brick.names = ['blue', 'green', 'grey', 'purple', 'red', 'yellow'];
Brick.versions = Brick.names.length;
Brick.WIDTH = 64;
Brick.HEIGHT = 32;
Brick.SCORE_VALUE = 50;


var Ball = Actor.extend({

    init: function(player) {
        this.player = player;
        this.$.init.call(this, player.game);
        this.loadImage('ballGrey');
        this.free = false;
        this.speed = 7;
    },

    moveToPlayer: function() {
        this.vel = {x: this.speed, y: -this.speed};
        this.pos = {x: this.player.pos.x + this.player.size.x / 2 - this.size.x / 2,
                    y: this.player.pos.y - this.player.size.y};
    },

    loaded: function() {
        this.moveToPlayer();
    },

    update: function() {
        if(!this.free) {
            this.moveToPlayer();
        } else {
            var collided = this.game.getCollisions(this, Brick);

            if(collided.length > 0) {
                for(var i=0;i<collided.length; i++) {
                    this.game.removeActor(collided[i], 'shot');
                }
                this.vel.y *= -1;

            } else {

                var pos = {x: this.pos.x + this.vel.x,
                           y: this.pos.y + this.vel.y};

                if(pos.x < 0) {
                    pos.x = 0;
                    this.vel.x *= -1;
                }
                else if(pos.x + this.size.x > this.game.size.x) {
                    pos.x = this.game.size.y - this.size.x;
                    this.vel.x *= -1;
                }

                if(pos.y < 0) {
                    this.pos.y = 0;
                    this.vel.y *= -1;
                } else if(pos.y + this.size.y > this.game.size.y) {
                    this.free = false;
                    this.player.onBallLost();
                }

                var player = this.player.pos;
                var paddleSize = this.player.size.x;
                if(pos.y > player.y && pos.x > player.x && pos.x < player.x + paddleSize) {
                    this.vel.y *= -1;
                    var dist = (pos.x - player.x - paddleSize / 2) / paddleSize;
                    this.vel.x = this.speed * 2 * dist
                    log(dist);
                }

            }
            this.$.update.call(this);
        }
    }
})

var BrickBreak = Game.extend({

    init: function(screenId) {
        //Game.call(this, screenId);
        this.$.init.call(this, screenId);
        this.gameBg = loadImage('assets/png/bg2.png');
        this.bgWin = loadImage('assets/png/win.png');
        this.bgLost = loadImage('assets/png/lose.png');
        this.initialLifes = 3;
        this.newGame();
    },

    addBricks: function() {

        for(var x=10; x<this.size.x - Brick.WIDTH; x+= Brick.WIDTH + 5) {
            for(var y=40; y<this.size.y/3; y += Brick.HEIGHT + 5) {
                var pos = new Object({x: x, y: y});
                this.addActor(new Brick(this, pos, randomInt(0, Brick.versions)));
            }
        }
    },

    addScore: function(amount) {
        this.score += amount;
    },

    newGame: function() {
        this.addBricks();
        this.score = 0;
        this.lifes = this.initialLifes;
        this.player = new Player(this);
        this.addActor(this.player);
        this.gameOver = false;
    },
    endGame: function() {
        this.gameOver = true;
        delete this.player;
        this.removeActors();
        this.mouse.button = 0;
    },

    update: function() {
        if(this.gameOver) {
            if(this.mouse.button == Mouse.LEFT) {
                this.newGame();
            }
        } else {
            this.$.update.call(this);
            if(this.getActors(Brick).length == 0) {
                this.endGame();
            }
        }
    },

    draw: function() {

        if(this.gameOver) {
            this.drawGameOver();
        } else {
            this.drawImageScaled(this.gameBg, 1);
            this.$.draw.call(this);
            this.drawGame();
        }
    },

    drawGame: function() {
        var status = "Lifes: " + this.lifes;
        var score = "Score: " + this.score;

        this.screen.textBaseline = 'top';
        this.screen.fillStyle = 'blue';
        this.screen.font = "bold 14px sans-serif";
        this.screen.fillText(status, 10, 4);
        this.screen.fillText(score, 10, 20);
    },

    drawGameOver: function() {
        var status = "";
        var score = "Score: " + this.score;

        this.screen.fillStyle = 'white';
        this.screen.fillRect(0, 0, this.size.x, this.size.y);
        if(this.lifes > 0) {
            //status = "YOU WIN!";
            this.drawImageScaled(this.bgWin);
        } else {
            status = "YOU LOST!";
            this.drawImageScaled(this.bgLost);
        }

        this.screen.textBaseline = 'top';
        this.screen.fillStyle = 'white';
        this.screen.font = "bold 54px sans-serif";
        drawTextCentered(this.screen, status, this.size.x / 2, this.size.y / 2 - 20);
        drawTextCentered(this.screen, score, this.size.x / 2, this.size.y / 2 + 40);
    },

    onPlayerDie: function() {
        this.lifes -= 1;
        if(this.lifes == 0) {
            this.endGame();
        }
    }
});

window.onload = function() {
    window.onerror = function(e) {
        log("ERROR:", e);
    }

    var canvas = document.getElementById('screen');
    if(isMobile()) {
        canvas.height = screen.height - 80;
        log(screen.height);
    }

    var game = new BrickBreak("screen");
    game.run();
};

})();
