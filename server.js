import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const server = http.Server(app);
const io = new Server(server, { cors: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/', express.static(__dirname + '/public/'));

io.on('connection', (socket) => {
  let userRoom;
  socket.on('join', (room) => {
    userRoom = room;
    socket.join(room);
  });

  socket.on('offer', (room, desc) => {
    socket.to(room).emit('offer', desc, socket.id);
  });

  socket.on('answer', (room, desc) => {
    socket.to(room).emit('answer', desc);
  });

  socket.on('ice_candidate', (room, data) => {
    socket.to(room).emit('ice_candidate', data, socket.id)
  });

  socket.on('disconnect', () => {
    console.log(userRoom, socket.id, 'disconnect')
    socket.to(userRoom).emit('bye', socket.id)
  });
});

server.listen(8088, () => {
  console.log(`Server running in 8088`);
});
