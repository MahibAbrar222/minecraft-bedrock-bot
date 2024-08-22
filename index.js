const bedrock = require('bedrock-protocol');
const vec3 = require('vec3').Vec3;
const http = require('http');

const HOST = 'Hdvej.aternos.me';
const PORT = 62765;
const USERNAME = 'ServerBot';
var entityId = null;
var inventory = [];
var heartLife = 20;
var fullHeart = 20;
const WebPort = 80;

// Create a server
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'application/json'});
    // Check command
    if (req.url == '/getBotLocation') {
        res.write(JSON.stringify(getBotLocation()));
    }else if(req.url == '/getBotInventory'){
        res.write(JSON.stringify(getBotInventory()));
    }else if(req.url == '/getPlayersXYZ'){
        res.write(JSON.stringify(map));
    }else if(req.url == "/"){
        res.write(JSON.stringify(getBotLocation()));
    }else{
        res.write(JSON.stringify({error: "Invalid command"}));
    }
    res.end(); //end the response
}).listen(WebPort); // The server object listens on port 8080

const client = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    // Microsoft Authenication
    offline: true,
    version: '1.21.0'
});

// Map
const map = {};

client.on('join', () => {
    console.log('Bot Joined to the server.');

    // Get Spwan Position

});


client.on('text', (packet) => {
    console.log(map)
    console.log(`[${packet.source_name}] ${packet.message}`);
});

// Listen all packets
client.on('packet', (packet) => {
    // console.log(packet);
    // DETECT IF KILLED
    if (packet.data.name === 'death_info') {
        console.log('Bot was killed.');

        // Respwan
        client.write('respawn', {
            position: {
                x: 75,
                y: 95,
                z: -25
            },
            state: 0,
            runtime_entity_id: entityId
        });

        console.log("Bot respaw)_ at", map[entityId].x, map[entityId].y, map[entityId].z);

        // Reset Inventory
        inventory = [];
    }else if (packet.data.name == "move_player"){
        // A player moved
        const player = packet.data.params.runtime_id;
        let position = packet.data.params.position;
        // Vec3
        position = new vec3(position.x, position.y, position.z);
        map[player] = position;
        //let distance = getDistanceBetweenBotAndPlayer(player);
        // console.log(distance)
        // console.log(map)
    }else if(packet.data.name == "start_game"){
        // Get Spwan Position
        console.log(packet)
        const startPosition = packet.data.params.player_position;
        if (!entityId) entityId = packet.data.params.runtime_entity_id;
        map[entityId] = new vec3(
            Math.max(-30000000, Math.min(startPosition.x, 30000000)), // Constrain X to a reasonable range
            Math.max(0, Math.min(startPosition.y, 100)), // Constrain Y to valid range
            Math.max(-30000000, Math.min(startPosition.z, 30000000)) // Constrain Z to a reasonable range
        );
        
    }else if(packet.data.name == "respawn"){
        const startPosition = packet.data.params.position;
        map[entityId] = new vec3(
            Math.max(-30000000, Math.min(startPosition.x, 30000000)), // Constrain X to a reasonable range
            Math.max(0, Math.min(startPosition.y, 100)), // Constrain Y to valid range
            Math.max(-30000000, Math.min(startPosition.z, 30000000)) // Constrain Z to a reasonable range
        );
        console.log("Bot respawnn at", map[entityId].x, map[entityId].y, map[entityId].z);
        setHealth(fullHeart);

    }else if(packet.data.name == "set_health"){
        // Set health
        heartLife = packet.data.params.health;
        console.log("Bot health:", heartLife);
    }
    // Get inventory
    else if(packet.data.name == "inventory_content"){
        inventory = packet.data.params.slots;

    }
});

client.on('spawn', () => {
    console.log('Bot spawned.');
    //moveTo(, 126, 18);
});

client.on('error', (error) => {
    console.log('Error:', error);
});

function getBotLocation(){
    if (!map[entityId]) return null;
    return map[entityId];
}

function getBotInventory(){
    return inventory;
}
function getDistanceBetweenBotAndPlayer(player_runtime_id){
    let bot_location = getBotLocation();
    let player_location = map[player_runtime_id];
    if (!bot_location || !player_location) return null;
    return Math.sqrt(Math.pow(player_location.x - bot_location.x, 2) + Math.pow(player_location.y - bot_location.y, 2) + Math.pow(player_location.z - bot_location.z, 2));
}

function moveTo(x, y, z){
    client.write('move_player', {
        runtime_entity_id: entityId,
        position: {x: x, y: y, z: z},
        mode: 0,
        on_ground: true,

    });
}
function breakBlock(x, y, z){
    client.write('player_action', {
        action: 0,
        runtime_entity_id: entityId,
        x, y, z,
        face: 1
    });
}
function getBlockName(x, y, z){
    let block_name = ''
    client.write('get_block_name', {
        x, y, z
    });
    return 
}
function setHealth(health){
    client.write('set_health', {
        health: health
    });
}