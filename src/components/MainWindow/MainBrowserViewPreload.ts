import { ipcRenderer } from 'electron'
import { Channel } from '../../Models/Channel'
import sendNotification from '../../services/Notifications'
import ChatService from '../../services/ChatService'
import FoodService from '../../services/FoodService'

window.addEventListener('DOMContentLoaded', async () => {
    ChatService.setupShortcut()
})

document.addEventListener('Message', (event) => {
    const message = (<CustomEvent>event).detail
    FoodService.eat(message)
    sendNotification(message)
})

document.addEventListener('MessageDom', (event) => {
    const messageDom = (<CustomEvent>event).detail
    ChatService.logMessage(messageDom)
})

ipcRenderer.on(Channel.USER_PRV, function(event, nick) {
    // @ts-ignore
    userPrvTag(nick)
})

ipcRenderer.on(Channel.FOOD_CHANGED, function(event, nick) {
    FoodService.reset()
})