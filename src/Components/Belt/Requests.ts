import { ipcRenderer } from 'electron'
import { Channel } from '../../Models/Channel'
import ConfigService from '../../Services/ConfigService'

async function loadItemsData(types: string[]) {
    return await ipcRenderer.invoke('LoadSetItems', types)
}

async function getEquipedPotionsAlt() {
    const req = 'top[0].art_alt'
    return ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
}
async function updateSlot(num: string, type: string) {
    const req = `top[0].canvas.app.leftMenu.model.${type}[${num}] = null; top[0].canvas.app.leftMenu.model.main.view.update();`
    return ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
}

async function getSlots() {
    const req = '[top[0].canvas.app.leftMenu.model.slotsCount, top[0].canvas.app.leftMenu.model.variantSlotsCount]'
    const res = await ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
    return [res[0], res[1]] as number[]
}

async function refreshLeftMenu() {
    const req = 'top[0].window.location.reload()'
    return ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
}

async function unequipRequest(id: string) {
    const rnd_url = '&_=' + (new Date().getTime() + Math.random())
    const req = `fetch('${
        ConfigService.getSettings().baseUrl
    }/action_run.php?code=PUT_OFF&url_success=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&url_error=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&artifact_id=${id}&ajax=1${rnd_url}', {
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
    return ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
}

async function equipPotionRequest(id: string, slotNum: string, variantNum: string) {
    const rnd_url = '&_=' + (new Date().getTime() + Math.random())
    const req = `fetch('${
        ConfigService.getSettings().baseUrl
    }/action_run.php?code=PUT_ON&url_success=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&url_error=user_iframe.php%3Fgroup%3D1%26update_swf%3D1&artifact_id=${id}&in[slot_num]=${slotNum}&in[variant_effect]=${variantNum}&ajax=1&_=${rnd_url}', {
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
    return ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
}

function fetchItem(id: string) {
    const req = `fetch('${ConfigService.getSettings().baseUrl}/artifact_info.php?artifact_id=${id}').then(resp => resp.text())`
    return ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
}

async function getEquipedPotions() {
    const req = '[top[0].canvas.app.leftMenu.model.items, top[0].canvas.app.leftMenu.model.variantItems]'
    return ipcRenderer.invoke(Channel.MAKE_WEB_REQUEST, req)
}

export default {
    loadItemsData,
    getEquipedPotionsAlt,
    updateSlot,
    getSlots,
    refreshLeftMenu,
    unequipRequest,
    equipPotionRequest,
    fetchItem,
    getEquipedPotions
}
