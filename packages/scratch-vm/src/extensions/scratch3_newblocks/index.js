const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const Cast = require('../../util/cast');
const log = require('../../util/log');
const websocketURL = 'ws://127.0.0.1:8765';
const io = require("socket.io-client");
const Blocks = require('../../engine/blocks');
//const Blocks = require('../../src/engine/blocks');

class Scratch3NewBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this.isRunning = false;
        this.socketData = "";
        this.roomID = "";
        this.clientID = generateUUID();
        this.UUID = 0;
        this.prevLoc = 0
        this.connectButton = null;
        this.localConnection = null;   // RTCPeerConnection for our "local" connection
        this.remoteConnection = null;  // RTCPeerConnection for the "remote"
        this.sendChannel = null;       // RTCDataChannel for the local (sender)
        this.receiveChannel = null;    // RTCDataChannel for the remote (receiver)
        this.receivedData = []
        this.lastCoords = null;
        this.numClients = 0;
        this.mouseLocs = {};
        var canv = document.createElement('canvas');
        canv.style.margin = 0;
        canv.style.padding = 0;
        canv.style.position = "absolute";
        canv.style.top = 0;
        canv.style.left = 0;
        canv.style.zIndex = "1000";
        canv.width  = document.body.clientWidth;
        canv.height = document.body.clientHeight;
        canv.style["pointer-events"] = "none";
        canv.id = 'someId';
        document.body.appendChild(canv);
        // joining room
        this.socket = io("http://localhost:8080");
        this.socket.on('created', function(room) {
          log.log('Created room ' + room);
          isInitiator = true;
        });
        this.event = null;
        this.socket.on('full', function(room) {
          log.log('Room ' + room + ' is full');
        });

        this.socket.on('join', function (room){
          log.log('Another peer made a request to join room ' + room);
          log.log('This peer is the initiator of room ' + room + '!');
        });

        this.socket.on('joined', function(return_obj) {
          log.log('joined: ' + return_obj["room"]);
          var dim = return_obj['dim']
          log.log(return_obj)
          window.open(window.location.origin + "?roomid=" + return_obj["room"], '_blank', 'location=yes,height=' + dim["height"] + ',width=' + dim["width"] + ',scrollbars=yes,status=yes');
          isChannelReady = true;
        });

        this.socket.on('joinednew', function(room) {
          log.log('joined new: ' + room);
          this.isRunning = true;
        });

        this.socket.on('log', function(array) {
          log.log(array)
        });
        ////////////////////////////////////////////////
        document.addEventListener('mousemove', e => {
            const coordinates = {
                x: e.clientX/document.body.clientWidth,
                y: e.clientY/document.body.clientWidth
            };
            this.setMouseCoords(coordinates);
        });

        // This client receives a message
        this.socket.on('message', function(message) {
          message = JSON.parse(message)
          if (this.clientID != message.clientID) {
            console.log(message.message)
            if (typeof(message.message) == "string") message.message = JSON.parse(message.message)
            if (message.message["x"]) {
              if (!this.mouseLocs) {
                this.mouseLocs = {}
              }
              this.mouseLocs[message.clientID] = {"x": message.message["x"]*document.body.clientWidth, "y": message.message["y"]*document.body.clientWidth}
              var canv = document.getElementById('someId')
              console.log("received drawing")
              console.log(message.message["x"])
              var ctx = canv.getContext("2d");
              drawACircle(message.message["x"]*document.body.clientWidth, message.message["y"]*document.body.clientWidth, this);
            }
            log.log('Client received message: ' + message.message + ' from clientID ' + message.clientID + ' in room ' + message.roomID);
          }
        });
        initStuff(this);

    }
    setMouseCoords(coords) {
      this.mouseX = coords.x;
      this.mouseY = coords.y;
    }
    sendMessage(message) {
      log.log('Client sending message: ', message);
      var data = {
        "message": message,
        "roomID": this.roomID,
        "clientID": this.clientID
      }
      this.socket.emit('message', JSON.stringify(data));
    }
    getInfo () {
        return {
            id: 'newblocks',
            name: 'PRG Collaborative UI Blocks',
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
                    text: 'send mouse location to other clients',
                    arguments: {
                    }
                },
                {
                    opcode: 'setNumClients',
                    blockType: BlockType.COMMAND,
                    text: 'set [TEXT] of clients!',
                    arguments: {
                      TEXT: {
                          type: ArgumentType.STRING,
                          defaultValue: "#"
                      }
                    }
                },
                {
                    opcode: 'broadcastRoom',
                    blockType: BlockType.COMMAND,
                    text: 'broadcast id (check URL)',
                    arguments: {
                    }
                }/*,
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
                    text: 'print block data'
                },
                {
                	opcode: 'disconnectRTC',
                  blockType: BlockType.COMMAND,
                    text: 'disconnect connection'
                }*/
            ],
            menus: {
            }
        };
    }
    drawCircle(args, util) {
      log.log("drawing circle");
       window.open(window.location.origin + "?roomid=" + this.roomID, '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');
    }
    resizeWindow(args, util) {
      window.resizeTo(500, 500);
    }
    getMouseX (args, util) {
        return this.mouseX//util.ioQuery('mouse', 'getClientX');
    }

    getMouseY (args, util) {
        return this.mouseY//util.ioQuery('mouse', 'getClientY');
    }
    printLoc(args, util) {
      //if (this.prevLoc != util.ioQuery('mouse', 'getScratchX') + ", " + util.ioQuery('mouse', 'getScratchY')) {
      let mousex = this.getMouseX(args, util);
      let mousey = this.getMouseY(args, util);
      log.log("sending mouse data");
      if (this.isRunning) {
        log.log("sending that data");
        let mouse_data = {
          "x": mousex,
          "y": mousey,
        }
        this.sendMessage(JSON.stringify(mouse_data));
      }
      //}

    }

    disconnectRTC(args, util) {
    // Close the RTCDataChannels if they're open.

      sendChannel.close();
      receiveChannel.close();

      // Close the RTCPeerConnections

      localConnection.close();
      remoteConnection.close();

      sendChannel = null;
      receiveChannel = null;
      localConnection = null;
      remoteConnection = null;
      log.log("channel closed")
    }

    broadcastRoom (args) {
      if (!this.isRunning) {
        this.roomID = generateUUID();
        this.socket.emit('create or join', this.roomID, {"width": document.body.clientWidth, "height": document.body.clientHeight});
        this.isRunning = true;
        window.history.pushState('', '', '/?roomid='+this.roomID);
        /*
        localConnection = new RTCPeerConnection({iceServers: [
          {
            urls: "stun:stun.l.google.com:19302"
          }
        ]});
        sendChannel = localConnection.createDataChannel(this.roomID);
        sendChannel.onopen = handleSendChannelStatusChange;
        sendChannel.onclose = handleSendChannelStatusChange;


        remoteConnection = new RTCPeerConnection({iceServers: [
          {
            urls: "stun:stun.1.google.com:19302"
          }
        ]});
        remoteConnection.ondatachannel = receiveChannelCallback;

        localConnection.onicecandidate = e => {
          onIceCandidate(localConnection, e)
        };

        remoteConnection.onicecandidate = e => {
          onIceCandidate(remoteConnection, e);
        };

        localConnection.createOffer()
        .then(offer => localConnection.setLocalDescription(offer))
        .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
        .then(() => remoteConnection.createAnswer())
        .then(answer => remoteConnection.setLocalDescription(answer))
        .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
        .then(() => this.isRunning = true)
        .then(() => this.UUID = generateUUID())
        .catch(handleCreateDescriptionError);
        */
      }
      log.log("room id " + this.roomID)
    }

    sendData (args) {
   		if (this.isRunning) {
   			//sendChannel.send(args.DATA);
        var data_to_send = JSON.stringify(args.DATA);
        this.sendMessage(data_to_send);
   		}
   	}

    fetchData (args) {
      //log.log(this.runtime.targets[1].blocks);
      this.runtime.vm.blockListener({"type": "create", "test": true, "workspaceId":"71C$xI}sE0g%aEd)m|d3","group":"Wr?tEj}2E+cYX3AXw,E6","recordUndo":true,"blockId":"jTmJwYD#}:Iw4j!-)[LE","xml":{},"ids":["jTmJwYD#}:Iw4j!-)[LE"]})
      this.runtime.vm.blockListener({"type": "move", "test": true, "workspaceId":"IzTr0{d|*{CtJc6HH9cF","group":")C[QL%|6LYe~dg)-$^0k","recordUndo":true,"blockId":"JndK.n|l7ntqWa$VB!2m","oldCoordinate":{"x":120.14814814814811,"y":379.40740740740745},"newCoordinate":{"x":120.14814814814811,"y":530.5185185185186}})
    }
    writeRoom (args) {
      this.clientID = generateUUID();
      if (this.roomID.length > 0) {
        this.socket.emit('leave', this.roomID)
      }
      this.roomID = args.TEXT;
      this.socket.emit('create or join', this.roomID);
      this.isRunning = true;
      /*
      var configuration = {
         "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
      };
      localConnection = new RTCPeerConnection({iceServers: [
        {
          urls: "stun:stun.1.google.com:19302"
        }
      ]});
      sendChannel = localConnection.createDataChannel(this.roomID);
      sendChannel.onopen = handleSendChannelStatusChange;
      sendChannel.onclose = handleSendChannelStatusChange;


      remoteConnection = new RTCPeerConnection({iceServers: [
        {
          urls: "stun:stun.1.google.com:19302"
        }
      ]});
      remoteConnection.ondatachannel = receiveChannelCallback;

      localConnection.onicecandidate = e => {
        onIceCandidate(localConnection, e)
      };

      remoteConnection.onicecandidate = e => {
        onIceCandidate(remoteConnection, e);
      };

      localConnection.createOffer()
      .then(offer => localConnection.setLocalDescription(offer))
      .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
      .then(() => remoteConnection.createAnswer())
      .then(answer => remoteConnection.setLocalDescription(answer))
      .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
      .then(() => this.isRunning = true)
      .then(() => this.UUID = generateUUID())
      .catch(handleCreateDescriptionError);
      log.log("joined room " + this.roomID)
      */

    }
    setNumClients (args) {
      this.numClients = parseInt(args.TEXT)
      this.socket.emit('set num clients', this.roomID, this.numClients)
    }
}
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function drawACircle(x, y, self) {
    var canv = document.getElementById('someId')
    var ctx = canv.getContext("2d");
    ctx.clearRect(0, 0, canv.width, canv.height);
    for (var clientID in self.mouseLocs) {
      if (self.mouseLocs.hasOwnProperty(clientID)) {
        ctx.beginPath()
        ctx.arc(self.mouseLocs[clientID]["x"], self.mouseLocs[clientID]["y"], 5, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

function initStuff(self) {
  self.roomID = window.location.href.substring(window.location.href.indexOf("=")+1, window.location.href.length);
  log.log("this.roomID")
  log.log(self.roomID)
  log.log(window.location.search)
  if (self.roomID == null || self.roomID == "null" || self.roomID == window.location.href) {
    self.roomID = ""
  } else {
    self.clientID = generateUUID();
    self.socket.emit('joinnew', self.roomID);
    self.isRunning = true;
  }
}
/*
function handleCreateDescriptionError(error) {
  console.log("Unable to create an offer: " + error.toString());
}

// Handle successful addition of the ICE candidate
// on the "local" end of the connection.

function handleLocalAddCandidateSuccess() {
}

function getOtherPc(pc) {
  return (pc === localConnection) ? remoteConnection : localConnection;
}

function getName(pc) {
  return (pc === localConnection) ? 'localPeerConnection' : 'remotePeerConnection';
}
function onIceCandidate(pc, event) {
  getOtherPc(pc)
      .addIceCandidate(event.candidate)
      .then(onAddIceCandidateSuccess)
      .catch(onAddIceCandidateError);
  console.log(`${getName(pc)} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}
// Handle successful addition of the ICE candidate
// on the "remote" end of the connection.

function handleRemoteAddCandidateSuccess() {
}

function handleSendChannelStatusChange(event) {
    if (sendChannel) {
      var state = sendChannel.readyState;
      log.log(state);
    }
}

function receiveChannelCallback(event) {
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleReceiveMessage;
  receiveChannel.onopen = handleReceiveChannelStatusChange;
  receiveChannel.onclose = handleReceiveChannelStatusChange;
}

function handleReceiveMessage(event) {
   log.log("ive received msg")
   log.log(event.data);
   let data_obj = JSON.parse(event.data)
   doSomething(data_obj)
 }

 function doSomething(data) {
   console.log(data)
 }
// Handle an error that occurs during addition of ICE candidate.
function handleReceiveChannelStatusChange(event) {
  if (receiveChannel) {
    console.log("Receive channel's status has changed to " +
                receiveChannel.readyState);
  }

  // Here you would do stuff that needs to be done
  // when the channel's status changes.
}

function handleAddCandidateError() {
  console.log("Oh noes! addICECandidate failed!");
}
*/
module.exports = Scratch3NewBlocks;
