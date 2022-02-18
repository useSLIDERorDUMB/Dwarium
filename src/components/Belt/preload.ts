import {
    ipcRenderer,
    contextBridge
} from 'electron'
import ConfigService from '../../services/ConfigService'
import '../BaseAPI'
import '../Utils'

contextBridge.exposeInMainWorld('beltPotionAPI', {
    baseUrl: () => {
        return ConfigService.getSettings().baseUrl
    },
    loadItemsData: async (types: string[]) => {
        return await ipcRenderer.invoke('LoadSetItems', types)
    },
    fetchItem: (id: string) => {
        let req = `fetch('${ConfigService.getSettings().baseUrl}/artifact_info.php?artifact_id=${id}').then(resp => resp.text())`
        return ipcRenderer.invoke('MakeWebRequest', req)
    },
    getEquipedPotions: () => {
        let req = '[top[0].canvas.app.leftMenu.model.items, top[0].canvas.app.leftMenu.model.variantItems]'
        return ipcRenderer.invoke('MakeWebRequest', req)
    },
    getEquipedPotionsAlt() {
        let req = 'top[0].art_alt'
        return ipcRenderer.invoke('MakeWebRequest', req)
    },
    updateSlot(num: string, type: string) {
        let req = `top[0].canvas.app.leftMenu.model.${type}[${num}] = null; top[0].canvas.app.leftMenu.model.main.view.update();`
        return ipcRenderer.invoke('MakeWebRequest', req)
    },
    getSlots: async () => {
        let req = '[top[0].canvas.app.leftMenu.model.slotsCount, top[0].canvas.app.leftMenu.model.variantSlotsCount]'
        let res = await ipcRenderer.invoke('MakeWebRequest', req)
        return [res[0], res[1]] as number[]
    },
    refreshLeftMenu: async () => {
        let req = 'top[0].window.location.reload()'
        return ipcRenderer.invoke('MakeWebRequest', req)
    },
    unequipRequest: async (id: string) => {
        var rnd_url = '&_=' + (new Date().getTime() + Math.random())
        let req =
            `fetch('${ConfigService.getSettings().baseUrl}/action_run.php?code=PUT_OFF&url_success=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&url_error=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&artifact_id=${id}&ajax=1${rnd_url}', {
          'headers': {
            'accept': '*/*',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,ru;q=0.7',
            'cache-control': 'no-cache',
            'pragma': 'no-cache'
          },
          'referrerPolicy': 'no-referrer-when-downgrade',
          'body': null,
          'method': 'GET',
          'mode': 'cors',
          'credentials': 'include'
         }).then(resp => resp.text())`
        return ipcRenderer.invoke('MakeWebRequest', req)
    },
    equipPotionRequest: async (id: string, slotNum: string, variantNum: string) => {
        var rnd_url = '&_=' + (new Date().getTime() + Math.random())
        let req = `fetch('${ConfigService.getSettings().baseUrl}/action_run.php?code=PUT_ON&url_success=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&url_error=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&artifact_id=${id}&in[slot_num]=${slotNum}&in[variant_effect]=${variantNum}&ajax=1&_=${rnd_url}', {
          'headers': {
              'accept': '*/*',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,ru;q=0.7',
              'cache-control': 'no-cache',
              'pragma': 'no-cache'
          },
          'referrerPolicy': 'no-referrer-when-downgrade',
          'body': null,
          'method': 'GET',
          'mode': 'cors',
          'credentials': 'include'
          }).then(resp => resp.text())`
          return ipcRenderer.invoke('MakeWebRequest', req)
    }
})

export interface BeltPotionAPI {
    baseUrl: () => string,
    loadItemsData: (types: string[]) => any,
    fetchItem: (id: string) => Promise<any>,
    unequipRequest: (id: string) => Promise <any>,
    equipPotionRequest: (id: string, slotNum: string, variantNum: string) => Promise<any>,
    getEquipedPotions: () => Promise<any>,
    getEquipedPotionsAlt: () => Promise<any>,
    updateSlot: (num: string, type: string) => Promise<any>,
    getSlots: () => Promise<number[]>,
    refreshLeftMenu: () => Promise<any>
}

declare global {
    interface Window {
        beltPotionAPI: BeltPotionAPI
    }
}