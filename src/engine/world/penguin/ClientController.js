import PathEngine from './pathfinding/PathEngine'

export default class ClientController {
    // Constants
    THROTTLE_DELAY = 100
    ONE_DAY_MS = 86400000

    constructor(world, args) {
        this.world = world
        this.interface = world.interface
        this.network = world.network
        this.crumbs = world.crumbs
        this.getString = world.getString

        // User attributes
        const { user, ...attributes } = args
        Object.assign(this, attributes)
        
        this.id = user.id
        this.joinTime = Date.parse(user.joinTime)  // Store as timestamp

        // State management
        this.iglooOpen = false
        this.lastRoom = null
        this.activeSeat = null
        this.lastSledId = null
        this.emoteKeyPressed = false
        this.lockRotation = false
        this.lastBalloon = Date.now()

        // Inventory system
        this.slots = ['color', 'head', 'face', 'neck', 'body', 'hand', 'feet', 'flag', 'photo', 'award']
        this.inventory = this.initInventory()
        this.sortPostcards()

        // Input handling
        this.keys = this.crumbs.quick_keys.keys
        this.emotes = this.crumbs.quick_keys.emotes
        this.setupInputHandlers()
    }

    // Getters
    get isActionAllowed() {
        return this.penguin?.visible && !this.penguin?.isTweening
    }

    get input() {
        return this.interface.main.input
    }

    get isModerator() {
        return this.rank > 1
    }

    get isTourGuide() {
        return this.inventory.head.includes(428)
    }

    get isSecretAgent() {
        return this.inventory.award.includes(800)
    }

    get daysOld() {
        return Math.floor((Date.now() - this.joinTime) / this.ONE_DAY_MS)
    }

    get mailCount() {
        return this.postcards.length
    }

    get unreadMailCount() {
        return this.postcards.filter(postcard => !postcard.hasRead).length
    }

    // Initialization
    initInventory() {
        const inventory = Object.fromEntries(this.slots.map(slot => [slot, []]))
        
        this.inventory.forEach(itemStr => {
            const itemId = parseInt(itemStr)
            const itemData = this.crumbs.items[itemId]
            
            if (itemData) {
                const slotIndex = itemData.type - 1
                const slot = this.slots[slotIndex]
                if (slot) inventory[slot].push(itemId)
            }
        })

        return inventory
    }

    setupInputHandlers() {
        this.input.on('pointermove', pointer => this.handlePointerMove(pointer))
        this.input.on('pointerup', (pointer, target) => this.handlePointerUp(pointer, target))
        this.input.keyboard.on('keydown', event => this.handleKeyDown(event))
    }

    // Input handling
    handlePointerMove(pointer) {
        if (this.interface.main.crosshair?.visible) {
            this.interface.main.onCrosshairMove(pointer)
        }

        if (this.isActionAllowed && !this.lockRotation) {
            this.penguin.rotate(pointer.x, pointer.y)
        }
    }

    handlePointerUp(pointer, target) {
        if (pointer.button === 0 && this.isActionAllowed && !this.activeSeat) {
            if (!target[0]?.isButton) {
                this.sendMove(pointer.x, pointer.y)
            }
        }
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase()
        this.emoteKeyPressed ? this.handleEmoteKey(key) : this.handleActionKey(key)
    }

    handleEmoteKey(key) {
        this.emoteKeyPressed = false
        if (key in this.emotes) {
            this.sendEmote(this.emotes[key])
        }
    }

    handleActionKey(key) {
        const keyConfig = this.keys[key]
        if (keyConfig) {
            const action = this.keyActions[keyConfig.action]
            action(keyConfig.value)
        }
    }

    // Network actions
    sendMove(x, y, frame = null) {
        if (this.isActionAllowed) {
            this.penguin.move(x, y, frame)
        }
    }

    sendFrame(frame, set = true) {
        if (this.isActionAllowed) {
            this.lockRotation = true
            this.penguin.playFrame(frame, set)
            this.network.send('send_frame', { set, frame })
        }
    }

    sendSit(pointer) {
        if (this.isActionAllowed) {
            this.lockRotation = true
            this.penguin.sit(pointer.x, pointer.y)
        }
    }

    sendSnowball(x, y) {
        if (this.isActionAllowed) {
            this.lockRotation = true
            this.interface.main.snowballFactory.throwBall(this.id, x, y)
            this.network.send('snowball', { x, y })
        }
    }

    sendEmote(emote) {
        if (this.isBalloonThrottled || !this.isActionAllowed) return
        
        this.interface.showEmoteBalloon(this.id, emote)
        this.network.send('send_emote', { emote })
    }

    sendJoinRequest(type, messageKey, roomName, data) {
        if (this.activeSeat) {
            this.interface.prompt.showError('Please exit your game before leaving the room')
            return
        }

        this.interface.showLoading(this.getString(messageKey, roomName))
        this.lockRotation = false
        this.network.send(type, data)
    }

    sendJoinRoom(id, name, x = 0, y = 0, randomRange = 40) {
        const randomPos = PathEngine.getRandomPos(x, y, randomRange)
        this.sendJoinRequest('join_room', 'joining', name, {
            room: id,
            x: randomPos.x,
            y: randomPos.y
        })
    }

    sendJoinIgloo(id) {
        if (!this.world.room.isIgloo || this.world.room.id !== id) {
            this.sendJoinRequest('join_igloo', 'joining', 'igloo', {
                igloo: id,
                x: 0,
                y: 0
            })
        }
    }

    // Postcard management
    sortPostcards() {
        this.postcards.sort((a, b) => b.sendDateTimestamp - a.sendDateTimestamp)
    }

    refreshPostcards() {
        this.sortPostcards()
        if (this.interface.main.mail?.visible) {
            this.interface.main.mail.goToFirstPage()
        }
        this.interface.main.updateMailCount()
    }

    // Seat management
    getSeatWorldPos(seat) {
        const matrix = seat.getWorldTransformMatrix()
        return { x: matrix.getX(0, 0), y: matrix.getY(0, 0) }
    }

    sendMoveToSeat(id, seatNumber, type = 'table') {
        const container = type === 'table' 
            ? this.world.room.getTable(id) 
            : this.world.room.getWaddle(id)

        if (!container) return

        const seat = container[`seat${seatNumber}`]
        if (seat) {
            this.activeSeat = seat
            const pos = this.getSeatWorldPos(seat)
            this.sendMove(pos.x, pos.y, seat.sitFrame)
        } else {
            this.activeSeat = true
        }
    }

    // Helper methods
    get isBalloonThrottled() {
        const now = Date.now()
        const throttled = now - this.lastBalloon < this.THROTTLE_DELAY
        if (!throttled) this.lastBalloon = now
        return throttled
    }

    // Key actions (moved to object literal for clarity)
    keyActions = {
        send_frame: (id) => this.sendFrame(id),
        send_wave: () => this.sendFrame(25, false),
        send_sit: () => this.sendSit(this.input.mousePointer),
        show_crosshair: () => this.interface.main.onSnowballClick(),
        emote_key: () => this.emoteKeyPressed = true,
        send_emote: (id) => this.sendEmote(id),
        send_safe: (id) => {
            if (!this.isBalloonThrottled && this.isActionAllowed) {
                const message = this.interface.main.safe.safeMessagesMap[id]
                this.interface.showTextBalloon(this.id, message)
                this.network.send('send_safe', { safe: id })
            }
        },
        send_joke: () => {
            if (this.crumbs.jokes.length) {
                const jokeId = Phaser.Math.Between(0, this.crumbs.jokes.length - 1)
                this.interface.showTextBalloon(this.id, this.crumbs.jokes[jokeId], false)
                this.network.send('send_joke', { joke: jokeId })
            }
        }
    }
}
