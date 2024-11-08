import BaseWidget from './BaseWidget'


export default class BaseDynamicWidget extends BaseWidget {

    close() {
        super.close()

        this.once('destroy', () => this.interface.removeWidget(this))

        this.destroy()
    }

}
