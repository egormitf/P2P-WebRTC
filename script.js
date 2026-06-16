const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы (включая index.html)
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Хранилище истории сообщений по комнатам прямо в оперативной памяти сервера
const messageHistory = {
    general: [
        { id: 1, room: 'general', sender: 'Сервер', text: 'Добро пожаловать в мессенджер Node.js! Чат готов к работе без сбоев на Android.', time: '14:00' }
    ],
    ideas: [
        { id: 2, room: 'ideas', sender: 'Сервер', text: 'Эта комната предназначена для обсуждения новых проектов.', time: '14:00' }
    ],
    random: [
        { id: 3, room: 'random', sender: 'Сервер', text: 'Свободное общение здесь!', time: '14:00' }
    ]
};

io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    // Переход пользователя в комнату
    socket.on('join room', ({ room, username }) => {
        // Выходим из старых комнат
        Array.from(socket.rooms).forEach(r => {
            if (r !== socket.id) {
                socket.leave(r);
            }
        });

        socket.join(room);
        console.log(`${username} вошел в комнату: ${room}`);

        // Отсылаем историю конкретно этой комнаты
        socket.emit('room history', messageHistory[room] || []);
    });

    // Получено новое сообщение от клиента
    socket.on('new message', (msgData) => {
        const { room } = msgData;
        
        if (!messageHistory[room]) {
            messageHistory[room] = [];
        }

        messageHistory[room].push(msgData);

        // Ограничиваем историю до 60 сообщений
        if (messageHistory[room].length > 60) {
            messageHistory[room].shift();
        }

        // Вещаем всем участникам этой комнаты
        io.to(room).emit('chat message', msgData);
    });

    // Обработка статуса печатания текста
    socket.on('typing', ({ room, username, isTyping }) => {
        socket.to(room).emit('user typing', { username, isTyping });
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

// Запускаем сервер на порту 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=== СЕРВЕР ЗАПУЩЕН ===`);
    console.log(`Ссылка локально: http://localhost:${PORT}`);
});


