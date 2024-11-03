import BaseScene from '@scenes/base/BaseScene'


const cleanupDelay = 10000

export default class MemoryManager extends BaseScene {

    registered = {}

    create() {
        this.time.addEvent({
            delay: cleanupDelay,
            callback: () => this.cleanup(),
            loop: true
        })
    }

    cleanup() {
        for (const key in this.registered) {
            this.cleanupCheck(key, this.registered[key])
        }
    }

    cleanupCheck(key, asset) {
        const setStale = asset.staleCheck()

        if (!setStale) {
            return
        }

        if (asset.stale) {
            asset.unload()
            delete this.registered[key]
        } else {
            asset.stale = true
        }
    }

    register(key, staleCheck, unload) {
        if (key in this.registered) {
            this.registered[key].stale = false
            return
        }

        this.registered[key] = {
            stale: false,
            staleCheck,
            unload
        }
    }

    unloadPack(key) {
        const pack = this.cache.json.get(key)

        if (!pack) {
            return
        }

        for (const configKey in pack) {
            const files = pack[configKey]?.files

            if (Array.isArray(files)) {
                this.unloadPackFiles(files)
            }
        }

        this.unloadJson(key)
    }

    unloadPackFiles(files) {
        for (const file of files) {
            switch (file.type) {
                case 'animation':
                    this.unloadAnimFile(file.key)
                    break

                case 'audio:':
                    break

                case 'json':
                    this.unloadJson(file.key)
                    break

                case 'multiatlas':
                    this.unloadMultiatlas(file.key)
                    break
            }
        }
    }

    unloadAnimFile(key) {
        const anims = this.cache.json.get(key)?.anims

        if (Array.isArray(anims)) {
            for (const anim of anims) {
                this.anims.remove(anim.key)
            }
        }

        this.unloadJson(key)
    }

    unloadJson(key) {
        this.cache.json.remove(key)
    }

    unloadMultiatlas(key) {
        this.textures.remove(key)
        this.unloadTextureAnims(key)
    }

    unloadTextureAnims(textureKey) {
        const anims = this.anims.anims.getArray()

        for (const anim of anims) {
            const usesTexture = anim.frames.some(frame =>
                frame.textureKey === textureKey
            )

            if (usesTexture) {
                this.anims.remove(anim.key)
            }
        }
    }

}

