import { app, Notification, getCurrentWindow } from '@electron/remote'
import ConfigService from './ConfigService'

type ChatMessageUserNicks = {
    [key: number]: string
}

export type ChatMessage = {
    channel: number
    msg_text: string | null | undefined
    bonus_text: number | null | undefined
    to_user_nicks: ChatMessageUserNicks | undefined
    user_nick: string | null | undefined
}

const notificationTitle = 'Оповещение!'

export enum NotificationType {
    ATTACKED = 'На вас совершено нападение!',
    BATTLEGROUND = 'Получена сюдашка на поле боя!',
    MESSAGE = 'Получено новое сообщение!',
    MAIL = 'Получено новое письмо!',
    EXPIRING_ITEMS = 'Горят шмотки, посмотри!',
    RESOUCE_FARMING_FINISHED = 'Добыча ресурса завершена!',
    FIGHT_FINISHED = 'Окончен бой!'
}

function getSoundFor(notificationType: NotificationType) {
    switch (notificationType) {
        case NotificationType.ATTACKED:
            return 'attacked.ogg'
        case NotificationType.BATTLEGROUND:
            return 'battleground.ogg'
        case NotificationType.MESSAGE:
            return 'message.ogg'
        case NotificationType.MAIL:
            return 'mail.ogg'
        case NotificationType.EXPIRING_ITEMS:
            return 'expiring_items.ogg'
        case NotificationType.RESOUCE_FARMING_FINISHED:
            return 'resource.ogg'
        case NotificationType.FIGHT_FINISHED:
            return 'fight_finished.ogg'
    }
}

export default function sendNotification(message: ChatMessage | null, type: NotificationType | undefined = undefined) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const nickname = top[0]?.canvas?.app?.avatar?.model?.login ?? ''

    if(message?.channel == 2 && message?.msg_text?.toLocaleLowerCase().includes('на вас совершено') && !message.to_user_nicks) {
        setupBounce('critical')
        setupFlashFlame()
        if(ConfigService.getSettings().fightNotificationsSystem && currentWindowNotFocused()) {
            new Notification({ title: notificationTitle, body: NotificationType.ATTACKED }).show()
        }
        if(ConfigService.getSettings().fightNotificationsIngame) {
            playIngameNotificationSound(NotificationType.ATTACKED)
        }
    }

    if(message?.channel == 2 && message?.msg_text?.toLocaleLowerCase().includes('окончен бой') && !message.to_user_nicks) {
        setupBounce('informational')
        setupFlashFlame()
        if(ConfigService.getSettings().fightFinishedNotificationsSystem && currentWindowNotFocused()) {
            new Notification({ title: notificationTitle, body: NotificationType.FIGHT_FINISHED }).show()
        }
        if(ConfigService.getSettings().fightFinishedNotificationsIngame) {
            playIngameNotificationSound(NotificationType.FIGHT_FINISHED)
        }
    }

    if(message?.channel == 2 && message?.msg_text?.toLocaleLowerCase().includes('у вас новое письмо от игрока') && !message.to_user_nicks) {
        setupBounce('informational')
        setupFlashFlame()
        if(ConfigService.getSettings().mailNotificationsSystem && currentWindowNotFocused()) {
            new Notification({ title: notificationTitle, body: NotificationType.MAIL }).show()
        }
        if(ConfigService.getSettings().mailNotificationsIngame) {
            playIngameNotificationSound(NotificationType.MAIL)
        }
    }

    if(message?.channel == 2 && message?.bonus_text == 1 && message?.msg_text?.includes('<b class="redd">Для того, чтобы подтвердить свое участие ')) {
        setupBounce('critical')
        setupFlashFlame()
        if(ConfigService.getSettings().battlegroundNotificationsSystem && currentWindowNotFocused()) {
            new Notification({ title: notificationTitle, body: NotificationType.BATTLEGROUND }).show()
        }
        if(ConfigService.getSettings().battlegroundNotificationsIngame) {
            playIngameNotificationSound(NotificationType.BATTLEGROUND)
        }
    }

    if(message?.to_user_nicks != undefined && message?.to_user_nicks) {
        if(Object.values(message.to_user_nicks).includes(nickname)) {
            setupFlashFlame()
            setupBounce('informational')
            if(ConfigService.getSettings().messageNotificationsSystem && currentWindowNotFocused()) {
                new Notification({ title: notificationTitle, body: NotificationType.MESSAGE }).show()
            }
            if(ConfigService.getSettings().messageNotificationsIngame) {
                playIngameNotificationSound(NotificationType.MESSAGE)
            }
        }
    }

    if(message == null && type) {
        if(type == NotificationType.EXPIRING_ITEMS) {
            setupBounce('informational')
            if(ConfigService.getSettings().expiringItemsNotificationsSystem && currentWindowNotFocused()) {
                new Notification({ title: notificationTitle, body: type }).show()
            }
            if(ConfigService.getSettings().expiringItemsNotificationsIngame) {
                playIngameNotificationSound(type)
            }
        }
        if(type == NotificationType.RESOUCE_FARMING_FINISHED) {
            setupBounce('informational')
            if(ConfigService.getSettings().resourceFarmingFinishedNotificationSystem && currentWindowNotFocused()) {
                new Notification({ title: notificationTitle, body: type }).show()
            }
            if(ConfigService.getSettings().resourceFarmingFinishedNotificationIngame) {
                playIngameNotificationSound(type)
            }
        }
    }
}

function setupFlashFlame() {
    const currentWindow = getCurrentWindow()
    if(process.platform == 'win32') {
        currentWindow.flashFrame(currentWindowNotFocused())
    }
}

function setupBounce(type: 'critical' | 'informational') {
    if(process.platform == 'darwin') {
        app.dock.bounce(type)
    }
}

function playIngameNotificationSound(type: NotificationType) {
    const audio = new Audio(`file://${app.getAppPath()}/Resources/${getSoundFor(type)}`)
    audio.play()
}

function currentWindowNotFocused(): boolean {
    const currentWindow = getCurrentWindow()
    return !currentWindow.isFocused()
}
