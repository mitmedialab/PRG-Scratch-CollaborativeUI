const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const Cast = require('../../util/cast');
const log = require('../../util/log');
const websocketURL = 'ws://127.0.0.1:8765';

class Scratch3NewBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this.isRunning = false;
        this.socketData = "";
        this.roomID = "";
        this.prevLoc = 0
    }

    getInfo () {
        return {
            id: 'newblocks',
            name: 'webrtc testing',
            blocks: [
                {
                    opcode: 'writeRoom',
                    blockType: BlockType.COMMAND,
                    text: 'join [TEXT]',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "room #"
                        }
                    }
                },
                {
                    opcode: 'printLoc',
                    blockType: BlockType.COMMAND,
                    text: 'print loc',
                    arguments: {
                    }
                },
                {
                    opcode: 'broadcastRoom',
                    blockType: BlockType.COMMAND,
                    text: 'broadcast id (check console)',
                    arguments: {
                    }
                },
                {
                	opcode: 'sendData',
                    blockType: BlockType.COMMAND,
                    text: 'send on socket [DATA]',
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: '0101010'
                        }
                    }
                },
                {
                	opcode: 'fetchData',
                  blockType: BlockType.COMMAND,
                    text: 'receive data'
                }
            ],
            menus: {
            }
        };
    }

    getMouseX (args, util) {
        return util.ioQuery('mouse', 'getScratchX');
    }

    getMouseY (args, util) {
        return util.ioQuery('mouse', 'getScratchY');
    }
    printLoc(args, util) {
      //if (this.prevLoc != util.ioQuery('mouse', 'getScratchX') + ", " + util.ioQuery('mouse', 'getScratchY')) {
      log.log(this.getMouseX(args, util), this.getMouseY(args, util))
      //}

    }

    broadcastRoom (args) {
      if (!this.isRunning) {
        this.openSocket();
        this.roomID = "" + Math.floor(Math.random() * 90 + 10)
      }
      log.log("room id " + this.roomID)
    }

    openSocket() {
    		log.log("starting socket");
    		this.ws = new WebSocket(websocketURL);

    		const self = this; // the functions below are out of the scope
    		//check if connnecting to the server fails
    		this.ws.onerror = function(){
    			self.isRunning = false;
    			log.log("failed to connect to the server.");
    		};

    		this.ws.onopen = function(){
    			self.isRunning = true;
    			log.log("successfully connected to the server.");
    		}
    }

    sendData (args) {
   		if (this.isRunning) {
   			this.ws.send("send" + this.roomID + args.DATA);
   			log.log("SENT:", "send" + this.roomID + args.DATA);
   		}
   	}

    fetchData (args) {
      if (this.isRunning) {
       		this.ws.send("recv" + this.roomID);
       		log.log("COMMAND:", args.COMMAND);
       		const self = this; // the function below is out of the scope
       		//Load response
       		var message = this.ws.onmessage = function(event){
       			self.socketData = String(event.data);
       			log.log("RECEIVED:", self.socketData);
       		};
      } else {
       		this.socketData = "";
      }
    }
    writeRoom (args) {
      if (!this.isRunning) {
        this.openSocket();
      }
      this.roomID = args.TEXT;

    }
}

module.exports = Scratch3NewBlocks;
