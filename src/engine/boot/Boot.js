import BaseScene from '@scenes/base/BaseScene'

import InterfaceController from '@engine/interface/InterfaceController'
import MemoryManager from '@engine/memory/MemoryManager'
import WorldController from '@engine/world/WorldController'
import RuffleController from '@engine/ruffle/RuffleController'

import Load from '@scenes/interface/menus/load/Load'
import Preload from '@engine/boot/Preload'

import drawFrame from '@engine/interface/frame/drawFrame'


export default class Boot extends BaseScene {

    create() {
        drawFrame(this)

        this.scene.add('InterfaceController', InterfaceController)
        this.scene.add('MemoryManager', MemoryManager)
        this.scene.add('WorldController', WorldController)
        this.scene.add('RuffleController', RuffleController)

        this.scene.add('Load', Load)

        this.interface.showLoading('Loading Content', true)
        this.interface.loading.events.once('create', this.onLoadCreate, this)
    }

    onLoadCreate() {
        this.scene.add('Preload', Preload, true)
        this.scene.bringToTop(this)
    }

}
