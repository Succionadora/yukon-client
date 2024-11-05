import BaseLayer from '@scenes/base/BaseLayer'

import PackFileLoader from '@engine/loaders/PackFileLoader'


export default class WidgetManager extends BaseLayer {

    constructor(scene) {
        super(scene)

        this.depth = -1

        this.activeWidgets = {}
        this.loadedPacks = []

        this.lastLoadingKey = null

        this.packLoader = new PackFileLoader(scene)

        this.packLoader.on('progress', progress =>
            this.setLoadingProgress(progress)
        )

        this.packLoader.on('filecomplete', (key, type) =>
            this.onFileComplete(key, type)
        )
    }

    onFileComplete(key, type) {
        if (type === 'packfile') {
            this.loadedPacks.push(key)
        }
    }

    async loadWidget(key, addToWidgetLayer) {
        if (!(this.keyExists(key)) || this.keyActive(key)) {
            return
        }

        this.lastLoadingKey = key

        const widgetClass = await this.loadWidgetClass(key)

        if (!widgetClass) {
            return
        }

        const preload = widgetClass.preload
        const callback = () => this.onWidgetLoaded(key, widgetClass.default, addToWidgetLayer)

        if (!preload) {
            callback()
            return
        }

        this.packLoader.loadPack(preload.key, preload.url, () => callback())
    }

    async loadWidgetClass(key) {
        const { path } = this.crumbs.widgets[key]

        this.showLoading('Loading')

        try {
            const widgetClass = await (import(
                /* webpackInclude: /\.js$/ */
                `@scenes/${path}`
            ))

            return widgetClass

        } catch (error) {
            console.error(error)

            this.closeLoading()

            return null
        }
    }

    onWidgetLoaded(key, widgetClass, addToWidgetLayer) {
        const createWidget = this.isLoadingVisible && key === this.lastLoadingKey

        // Floating widgets skip createWidget check
        if (!addToWidgetLayer && !createWidget) {
            return
        }

        if (key === this.lastLoadingKey) {
            this.closeLoading()
        }

        this.createWidget(key, widgetClass, addToWidgetLayer)
    }

    createWidget(key, widgetClass, addToWidgetLayer) {
        const scene = addToWidgetLayer
            ? this.interface.main
            : this.scene

        const widget = new widgetClass(scene)

        this.activeWidgets[key] = widget

        if (addToWidgetLayer) {
            this.interface.main.addToWidgetLayer(widget)
        } else {
            this.add(widget)
        }
    }

    showLoading(text) {
        this.interface.prompt.showLoading(text)
    }

    closeLoading() {
        this.interface.prompt.loading.close()
    }

    setLoadingProgress(progress) {
        this.interface.prompt.loading.setProgress(progress)
    }

    isLoadingVisible() {
        return this.interface.prompt.loading.visible
    }

    keyExists(key) {
        return key in this.crumbs.widgets
    }

    keyActive(key) {
        return key in this.activeWidgets
    }

    findWidget(filter) {
        return Object.values(this.activeWidgets).filter(filter)
    }

    removeWidget(widget) {
        for (const key in this.activeWidgets) {
            if (this.activeWidgets[key] === widget) {
                delete this.activeWidgets[key]
            }
        }
    }

    unloadWidgets() {
        for (const key of this.loadedPacks) {
            this.memory.unloadPack(key)
        }

        this.loadedPacks = []
    }

}
