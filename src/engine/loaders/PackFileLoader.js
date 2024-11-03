import BaseLoader from './BaseLoader'


export default class PackFileLoader extends BaseLoader {

    constructor(scene) {
        super(scene)

        this.loadingPacks = []

        this.on('filecomplete', () => this.checkLoadingPacks())
    }

    loadPack(key, url, callback) {
        if (this.checkPackComplete(key)) {
            callback()
            return
        }

        this.once(`filecomplete-packfile-${key}`, key =>
            this.addLoadingPack(key)
        )

        this.once(`packcomplete-${key}`, () => callback())

        this.pack(key, url)
        this.start()
    }

    addLoadingPack(key) {
        this.loadingPacks.push(key)
    }

    removeLoadingPack(key) {
        this.loadingPacks = this.loadingPacks.filter(packKey => packKey !== key)
    }

    checkLoadingPacks() {
        for (const key of this.loadingPacks) {
            if (this.checkPackComplete(key)) {
                this.removeLoadingPack(key)

                this.emit(`packcomplete-${key}`)
            }
        }
    }

    checkPackComplete(key) {
        if (!this.jsonExists(key)) {
            return false
        }

        const pack = this.scene.cache.json.get(key)

        for (const configKey in pack) {
            const files = pack[configKey]?.files

            if (Array.isArray(files) && !this.checkFilesComplete(files)) {
                return false
            }
        }

        return true
    }

    checkFilesComplete(files) {
        for (const file of files) {
            let exists = false

            switch (file.type) {
                case 'animation':
                case 'json':
                    exists = this.jsonExists(file.key)
                    break

                case 'audio':
                    exists = this.audioExists(file.key)
                    break

                case 'multiatlas':
                    exists = this.textureExists(file.key)
                    break
            }

            if (!exists) {
                return false
            }
        }

        return true
    }

}
