import BaseContainer from './BaseContainer'


export default class BaseWidget extends BaseContainer {

    widgetLayer = null

    show() {
        if (this.widgetLayer) {
            this.widgetLayer.bringToTop(this)
        }

        super.show()
    }

}
