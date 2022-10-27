const { Server } = require("socket.io");
let userOnlineArr = []
let userOnlineNumber = 0
const io = new Server(7000, {
    cors: {
        origin: "https://gsocial.onrender.com",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 2e8,
    pingTimeout: 40000
})
 
io.on("connection", (socket) => {
    userOnlineNumber = userOnlineNumber + 1
    console.log("1 user connected, total user online: ", userOnlineNumber)
    
    socket.on('addUserOnline', ({ userId, friend }) => {
        addUserOnline(userId, socket.id, friend)
        console.log(userOnlineArr)
    })

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId)
        console.log(io.sockets.adapter.rooms)
    })

    socket.on('clientTypingMessage', (payload) => {
        socket.to(payload.roomId).emit('serverSendUserTyping', payload)
    })

    socket.on('clientStopTypingMessage', (payload) => {
        socket.to(payload.roomId).emit('serverSendUserStopTyping', payload)
    })

    socket.on('clientSendMessage', (payload) => {
        const socketIdUserSending = socket.id
        let userOnline = []
        io.sockets.adapter.rooms.get(payload.roomId).forEach(socketId => {
            const user = userOnlineArr.find(user => user.socketId === socketId)
            userOnline.push(user.userId)
        })
        const payloadBack = {
            userOnline: userOnline,
            ...payload
        }
        io.to(socketIdUserSending).emit('serverSendBackUserOnline', payloadBack)
        socket.to(payload.roomId).emit('serverSendMessage', payload)
    })

    socket.on('clientSendUserFocusChatBox', (payload) => {
        socket.to(payload.roomId).emit('serverSendUserFocusChatBox', payload)
    })

    socket.on('clientSendUserBlurChatBox', (payload) => {
        socket.to(payload.roomId).emit('serverSendUserBlurChatBox', payload)
    })

    socket.on('clientSendFirstMessage', (payload) => {
        const user = userOnlineArr.find(userOnline => userOnline.userId === payload.toUserId)
        if (user) {
            io.to(user.socketId).emit('serverSendFirstMessage', payload)
        }
    })

    socket.on('clientSendNewFriendRequest', ({ toUserId }) => {
        const user = userOnlineArr.find(userOnline => userOnline.userId === toUserId)
        if (user) {
            socket.broadcast.to(user.socketId).emit('serverSendNewFriendRequest')
        }
    })

    socket.on('disconnect', () => {
        removeUserOnline(socket.id)
        console.log('------------------------------------------------------------------------------')
        console.log("1 user disconnect, total user online: ", userOnlineNumber)
        console.log(userOnlineArr)
        console.log(io.sockets.adapter.rooms)
    })
})


const removeUserOnline = (socketId) => {
    const userDisconnect = userOnlineArr.find(user => user.socketId === socketId)
    if (userDisconnect) {
        const index = userOnlineArr.indexOf(userDisconnect)
        userOnlineArr.splice(index, 1)
        io.emit('serverSendUserDisconnect', { userId: userDisconnect.userId })
        userOnlineNumber = userOnlineNumber - 1
    }
}

const addUserOnline = (userId, socketId, friendArr) => {
    const user = { userId, socketId }
    userOnlineArr.push(user)
    if (friendArr.length > 0) {
        let friendOnlineReturn = []
        friendArr.forEach(friend => {
            const friendOnline = userOnlineArr.find(userOnline => userOnline.userId === friend)
            if (friendOnline) {
                const payload = { userId: userId }
                io.to(friendOnline.socketId).emit('serverSendFriendOnline', payload)
                if (!friendOnlineReturn.includes(friendOnline.userId)) {
                    friendOnlineReturn.push(friendOnline.userId)
                }
            }
        })
        if (friendOnlineReturn.length > 0) {
            io.to(socketId).emit('serverResponseAllFriendOnline', friendOnlineReturn)
        }

    }
}
