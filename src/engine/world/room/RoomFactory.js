export default class RoomFactory {

    constructor(world) {
        this.world = world

        this.scene = world.scene

        this.rooms = world.crumbs.rooms
        this.igloos = world.crumbs.scenes.igloos
        this.games = world.crumbs.games
    }

    create(args) {
        if (args.room) {
            return this.createRoom(args)

        } else if (args.igloo) {
            return this.createIgloo(args)

        } else if (args.game) {
            return this.createGame(args)
        }
    }

    createRoom({ room }) {
        const config = this.rooms[room]

        return this.createScene(config.key, `rooms/${config.path}`, { id: room })
    }

    createIgloo(args) {
        const config = this.igloos[args.type]

        if (config.key in this.scene.manager.keys) {
            this.scene.start(config.key, { args: args })

            return this.scene.get(config.key)

        } else {
            return this.scene.add(config.key, config.scene, true, { args: args })
        }
    }

    createGame({ game }) {
        const config = this.games[game]

        const isFlash = config.path.endsWith('.swf')

        if (!isFlash) {
            return this.createScene(config.key, `games/${config.path}`, { id: game })
        }

        this.scene.run(this.world.ruffle)

        this.world.ruffle.events.once('update', () => {
            this.world.ruffle.bootGame(config)
        })

        return null
    }

    async createScene(key, path, data) {
        try {
            const sceneClass = (await import(
                /* webpackInclude: /\.js$/ */
                `@scenes/${path}`
            )).default

            return this.scene.add(key, sceneClass, true, data)

        } catch (error) {
            console.error(error)

            return null
        }
    }

}
