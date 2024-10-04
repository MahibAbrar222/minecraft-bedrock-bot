const bedrock = require('bedrock-protocol');
const vec3 = require('vec3').Vec3;
const http = require('http');
const zlib = require('zlib');
const registry = require('prismarine-registry')('bedrock_1.20')
const ChunkColumn = require('prismarine-chunk')(registry);
const pako = require('pako');

var chunk = new ChunkColumn();

const HOST = 'Hdvej.aternos.me';
const PORT = 62765;
const USERNAME = 'MalerBot';
var entityId = null;
var inventory = [];
var heartLife = 20;
var fullHeart = 20;
const WebPort = 8000;
var mapOfNearest50Blocks = [];
var PostionOfBot = {
    position: {
        x: 0,
        y: 64,
        z: 0,
    },
    
    yaw: 0,
    pitch: 0,
    head_yaw: 0,
    onGround: true,
    mode: 0,
    tick: 1
};



process.env.DEBUG = 'minecraft-protocol'

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
    version: '1.21.20',
    skipPing: true
});

const getChunks = (position) => {
    const chunkSize = 16;
    const chunkX = Math.floor(position.x / chunkSize);
    const chunkZ = Math.floor(position.z / chunkSize);
    
    client.queue('request_chunk_radius', { chunk_radius: 2 })
};


// Map
const map = {};

client.on('join', () => {
    console.log('Bot Joined to the server.');
});



client.on('text', (packet) => {
    console.log(map)
    console.log(`[${packet.source_name}] ${packet.message}`);
});


// Listen all packets
client.on('packet', (packet) => {
    if(packet.data.name == "start_game"){
        // Get Spwan Position
        console.log(packet.data.params)
        const startPosition = packet.data.params.player_position;
        if (!entityId) entityId = packet.data.params.runtime_entity_id;
        map[entityId] = new vec3(
            Math.max(-30000000, Math.min(startPosition.x, 30000000)), // Constrain X to a reasonable range
            Math.max(0, Math.min(startPosition.y, 100)), // Constrain Y to valid range
            Math.max(-30000000, Math.min(startPosition.z, 30000000)) // Constrain Z to a reasonable range
        );
        PostionOfBot.position.x = startPosition.x;
        PostionOfBot.position.y = startPosition.y;
        PostionOfBot.position.z = startPosition.z;
        
    }
});

client.on('spawn', () => {
    console.log('Bot spawned.');
    
});
client.on('level_chunk', (data) => {
    // console.log('Received chunk data:', data);
    // handleChunkData(data);
    // processChunkPayload(data.payload)
    // Handle the chunk data
    // Process or store it as needed


  });

client.on('move_player', (packet) => {
    // console.log(packet)
    const player = packet.runtime_id;
    let position = packet.position;
    // Vec3
    position = new vec3(position.x, position.y, position.z);
    map[player] = position;
    let distance = map[entityId].distanceTo(position);
    if (distance < 20){
            // console.log("Player is near", distance);
            // lookAtNearestPlayer(player);
        lookAtNearestPlayer(player)
    }
});
client.on('death_info', (packet) => {
    console.log("Bot is Killed.")
    client.queue('respawn', {
        position: {x: map[entityId].x, y: map[entityId].y, z: map[entityId].z},
        state: 2, // Server Ready
        runtime_entity_id: entityId
    });
});

client.on("entity_event", (packet) => {
    if (packet.event_id == 'hurt_animation'){
        // client.queue('text', {
        //     type: 'chat',
        //     needs_translation: false,
        //     source_name: USERNAME,
        //     xuid: '',
        //     platform_chat_id: '', filtered_message: '',
        //     message: "I am under attack, Help Me"
        // });
        console.log("I am under attack.");
        PostionOfBot.position.z += 1;
        movePlayer(PostionOfBot)
    }else if(packet.event_id == 'death_animation'){
        
    }else if(packet.event_id == "respawn"){
        console.log("Bot Respawned.")
    }else if(packet.event_id == "player_check_treasure_hunter_achievement"){
        null;
    }else{
        console.log(packet)
    }
});

client.on("position", (packet) => {
    console.log("Position: ", packet)
})

client.on("event", (packet) => {
    console.log(packet)
})

client.on("inventory_content", (packet) => {
    if(packet.window_id == "inventory"){
        // console.log(packet.input)
    }
});

client.on('disconnect', (packet) => {
    console.log('Bot disconnected:', packet.reason);
})

client.on('respawn', (packet) => {
    console.log('Respawned at', packet.position);
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
function getCurrentTick() {
    // Example: Use a timestamp-based approach (not synced with actual server tick)
    return Math.floor(Date.now() / 50); // Approximate tick rate (20 ticks per second)
}

function movePlayer(data) {
    const packet = {
        runtime_id: Number(client.entityId), // Convert to number for varint
        position: {
            x: Number(data.position.x),
            y: Number(data.position.y),
            z: Number(data.position.z)
        },
        pitch: Number(data.pitch), // 32-bit float
        yaw: Number(data.yaw), // 32-bit float
        head_yaw: Number(data.head_yaw), // 32-bit float
        mode: Number(data.mode), // Ensure it's a number for u8
        on_ground: Boolean(data.onGround), // Boolean
        ridden_runtime_id: Number(data.riding_runtime_entity_id || 0), // varint
        teleport: data.mode === 2 ? {
            cause: Number(data.teleportation_cause), // li32
            source_entity_type: Number(data.entity_type) // LegacyEntityType
        } : undefined, // Include only if mode is 2
        tick: Number(getCurrentTick()) // varint64
    };

    try {
        console.log("Sending move_player packet with data:", packet);
        client.write('move_player', packet);
    } catch (error) {
        console.error("Error sending move_player packet:", error);
    }
}





function calculateLookAtAngles(botPos, playerPos) {
    const dx = playerPos.x - botPos.x;
    const dy = playerPos.y - botPos.y;
    const dz = playerPos.z - botPos.z;

    // Calculate horizontal distance
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate yaw (rotation around the vertical axis)
    let yaw = Math.atan2(dz, dx) * (180 / Math.PI);
    yaw = (yaw + 360) % 360; // Normalize yaw to [0, 360)

    // Calculate pitch (rotation around the horizontal axis)
    const pitch = Math.atan2(dy, distance) * (180 / Math.PI);
    
    return {
        yaw: yaw, // Already normalized
        pitch: Math.max(-90, Math.min(90, pitch)) // Clamp pitch to [-90, 90]
    };
}

function lookAtNearestPlayer(playerId) {
    if (playerId) {
        const botPosition = { x: map[entityId].x, y: map[entityId].y, z: map[entityId].z };
        const playerPosition = map[playerId]; // Assume this has x, y, z properties

        const { yaw, pitch } = calculateLookAtAngles(botPosition, playerPosition);

        // Debugging information
        console.log(`Bot Position: ${JSON.stringify(botPosition)}`);
        console.log(`Player Position: ${JSON.stringify(playerPosition)}`);
        console.log(`Calculated Yaw: ${yaw}`);
        console.log(`Calculated Pitch: ${pitch}`);

        PostionOfBot.yaw = yaw;
        PostionOfBot.pitch = pitch;

        // Send the look direction to the server
        movePlayer(PostionOfBot);

        console.log(`Bot is now looking at player at ${playerPosition.x}, ${playerPosition.y}, ${playerPosition.z}`);
    } else {
        console.error('Player ID is invalid or not provided.');
    }
}
