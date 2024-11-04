import BaseWidget from './BaseWidget'


export default class BaseDynamicWidget extends BaseWidget {

    close() {
        super.close()

        const ui = this.interface

        this.once('destroy', () => ui.removeWidget(this))

        this.destroy()
    }

}
