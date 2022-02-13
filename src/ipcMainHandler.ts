import { BrowserWindow, BrowserView, ipcMain, app } from 'electron'
import configService from './services/ConfigService'
import { TabsController } from './services/TabsController'
import { autoUpdater } from 'electron-updater'
import fs from 'fs'
import path from 'path'
import { Channel } from './Models/Channel'
import { WindowType, Preload, HTMLPath } from './Models/WindowModels'
import { createWindowAndLoad, setupCloseLogic } from './services/WindowCreationHelper'
import setupContextMenu from './services/ContextMenu'

ipcMain.on(Channel.LOAD_URL, (evt, server) => {
    configService.writeData('server', server)
    TabsController.currentTab().webContents.loadURL(`${configService.baseUrl()}/main.php`)
    TabsController.mainWindow?.webContents.setZoomFactor(0.9)
})

ipcMain.on(Channel.RELOAD, () => {
    TabsController.currentTab().webContents.reload()
})

ipcMain.on(Channel.BACK, () => {
    if(TabsController.currentTab().webContents.canGoBack()) {
        TabsController.currentTab().webContents.goBack()
    }
})

ipcMain.on(Channel.FORWARD, () => {
    if(TabsController.currentTab().webContents.canGoForward()) {
        TabsController.currentTab().webContents.goForward()
    }
})

ipcMain.on(Channel.NEW_TAB, (evt, id, url) => {
    createNewTab(url, id)
})

function createNewTab(url: string, id: string) {
    url = url ?? 'https://google.com'
    const browserView = new BrowserView({
        webPreferences: {
            enablePreferredSizeMode: true
        }
    })
    setupContextMenu(browserView)
    const tabId = id
    browserView.webContents.on('did-finish-load', () => {
        const originalTitle = browserView.webContents.getTitle()
        let title = originalTitle.slice(0, 8)
        if(originalTitle.length > 10) {
            title = title.concat('..')
        }
        TabsController.mainWindow?.webContents.send(Channel.FINISH_LOAD_URL, tabId, title)
        TabsController.mainWindow?.webContents.send(Channel.URL, browserView.webContents.getURL(), tabId)
    })
    if(configService.windowOpenNewTab()) {
        browserView.webContents.setWindowOpenHandler(({ url }) => {
            TabsController.mainWindow?.webContents.send(Channel.NEW_TAB, url)
            return {
                action: 'deny'
            }
        })
    }
    TabsController.addTab(tabId, browserView)
    closeFavouriteListBrowserView()
    TabsController.setupCurrent(tabId)
    TabsController.mainWindow?.setBrowserView(browserView)

    browserView.setAutoResize({
        width: true
    })
    TabsController.mainWindowContainer?.setViewContentBounds(TabsController.currentTab())
    browserView.webContents.loadURL(url)
    TabsController.mainWindow?.webContents.send(Channel.URL, url, tabId)
}

ipcMain.on(Channel.MAKE_ACTIVE, (evt, id) => {
    TabsController.setupCurrent(id)
    TabsController.mainWindow?.setBrowserView(TabsController.currentTab())
    TabsController.mainWindowContainer?.setViewContentBounds(TabsController.currentTab(), TabsController.mainWindow?.getBounds())
    TabsController.mainWindow?.webContents.send(Channel.URL, TabsController.currentTab().webContents.getURL(), id)
})

ipcMain.on(Channel.REMOVE_VIEW, (evt, id) => {
    TabsController.deleteTab(id)
    closeFavouriteListBrowserView()
})

ipcMain.on(Channel.CLOSE_TAB, (evt, id) => {
    TabsController.mainWindow?.webContents.send(Channel.CLOSE_TAB, id)
})

ipcMain.handle('MakeWebRequest', async(evt, req) => {
    const result = await TabsController.mainWindowContainer?.browserView?.webContents.executeJavaScript(req)
    return result
})

ipcMain.on(Channel.GO_URL, (evt, url) => {
    if(!url.includes('http')) {
        url = 'http://' + url
    }
    TabsController.currentTab().webContents.loadURL(url)
})

ipcMain.on(Channel.UPDATE_APPLICATION, () => {
    autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('LoadSetItems', async(evt, args: [string]) => {
    const SetRequests = {
        allItems: {
            url: `${configService.baseUrl()}/user_iframe.php?group=2`,
            script: 'art_alt'
        },
        wearedItems: {
            url: `${configService.baseUrl()}/user.php`,
            script: 'art_alt'
        },
        allPotions: {
            url: `${configService.baseUrl()}/user_iframe.php?group=1`,
            script: 'art_alt'
        },
        otherItems: {
            url: `${configService.baseUrl()}/user_iframe.php?group=3`,
            script: 'art_alt'
        }
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const requests = args.map((arg: string) => fetch(SetRequests[arg]))
    const results = await Promise.all(requests)
    const res = {}
    args.forEach((arg, index) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        res[arg] = results[index]
    })
    return res
})

ipcMain.on(Channel.FIND_CHARACTER, (event, nick) => {
    const userInfoBrowserWindow = createWindowAndLoad(WindowType.USER_INFO)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setupCloseLogic(userInfoBrowserWindow, WindowType.USER_INFO, () => {})
    userInfoBrowserWindow.webContents.loadURL(`${configService.baseUrl()}/user_info.php?nick=${nick}`)
})

async function fetch(request: { url: string; script: string }) {
    const bw = new BrowserView()
    await bw.webContents.loadURL(request.url)
    const result = await bw.webContents.executeJavaScript(request.script)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(bw.webContents as any).destroy()
    return result
}

ipcMain.on(Channel.USER_PRV, (event, nick) => {
    TabsController.mainWindowContainer?.browserView?.webContents.send(Channel.USER_PRV, nick)
})

let screenIsMaking = false
ipcMain.on(Channel.TAKE_SCREENSHOT, async() => {
    if(screenIsMaking) {
        return
    }
    screenIsMaking = true
    TabsController.mainWindow?.webContents.send(Channel.OPEN_WINDOW, WindowType.SCREENSHOT, true)
    const basePath = app.getPath('userData') + '/screens'
    if(!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath)
    }
    const page = await TabsController.mainWindowContainer?.browserView?.webContents.capturePage()
    if(!page) {
        TabsController.mainWindow?.webContents.send(Channel.OPEN_WINDOW, WindowType.SCREENSHOT, false)
        screenIsMaking = false
        return
    }
    const resized = page.resize({
        width: 1280,
        height: 1280 / page.getAspectRatio()
    })
    const png = resized.toPNG()
    const path = `${basePath}/${new Date().toLocaleString().replaceAll(' ', '').replaceAll('/', '.').replaceAll(':', '_')}.png`
    fs.writeFile(path, png, () => {
        TabsController.mainWindow?.webContents.send(Channel.OPEN_WINDOW, WindowType.SCREENSHOT, false)
        screenIsMaking = false
    })
})

ipcMain.on(Channel.FIND_EFFECTS, (event, nick) => {
    const effetsInfoBrowserWindow = createWindowAndLoad(WindowType.USER_EFFECTS)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setupCloseLogic(effetsInfoBrowserWindow, WindowType.USER_EFFECTS, () => {})
    effetsInfoBrowserWindow.webContents.loadURL(`${configService.baseUrl()}/effect_info.php?nick=${nick}`)
})

ipcMain.on(Channel.FOOD_CHANGED, () => {
    TabsController.mainWindowContainer?.browserView?.webContents.send(Channel.FOOD_CHANGED)
})

ipcMain.on(Channel.CHAT_SETTINGS_CHANGED, () => {
    TabsController.mainWindowContainer?.browserView?.webContents.send(Channel.CHAT_SETTINGS_CHANGED)
})

ipcMain.handle(Channel.GET_ID, async() => {
    return await TabsController.mainWindowContainer?.browserView?.webContents.executeJavaScript('top._top().myId')
})

ipcMain.on(Channel.SWITCH_MODE, () => {
    favouriteListBrowserView?.webContents.send(Channel.SWITCH_MODE)
})

ipcMain.handle(Channel.GET_URL, () => {
    return TabsController.currentTab().webContents.getURL()
})

ipcMain.handle(Channel.GET_TITLE, () => {
    return TabsController.currentTab().webContents.getTitle()
})

ipcMain.on(Channel.FAVOURITE_UPDATED, () => {
    TabsController.mainWindow?.webContents.send(Channel.FAVOURITE_UPDATED)
    if(favouriteListBrowserView) {
        favouriteListBrowserView.webContents.send(Channel.FAVOURITE_UPDATED)
    }
})

ipcMain.on(Channel.NEW_TAB_WITH_URL, (evt, url) => {
    TabsController.mainWindow?.webContents.send(Channel.NEW_TAB_WITH_URL, url)
})

ipcMain.on(Channel.SWITCH_NEXT_TAB, () => {
    const currentTabIndex = TabsController.tabsList.indexOf(TabsController.current_tab_id)
    if(currentTabIndex != -1 && TabsController.tabsList.length - 1 != currentTabIndex) {
        const nextIndex = currentTabIndex + 1
        const nextTabId = TabsController.tabsList[nextIndex]
        TabsController.mainWindow?.webContents.send(Channel.MAKE_ACTIVE, nextTabId)
    }
})

/// WINDOWS

let settingsWindow: BrowserWindow | null
ipcMain.on(Channel.OPEN_SETTINGS, () => {
    if(settingsWindow) {
        settingsWindow.show()
        return
    }
    settingsWindow = createWindowAndLoad(WindowType.SETTINGS, HTMLPath.SETTINGS, Preload.SETTINGS, true)
    setupCloseLogic(settingsWindow, WindowType.SETTINGS, function() {
        settingsWindow = null
    })
})

let notesWindow: BrowserWindow | null
ipcMain.on(Channel.OPEN_NOTES, () => {
    if(notesWindow) {
        notesWindow.show()
        return
    }
    notesWindow = createWindowAndLoad(WindowType.NOTES, HTMLPath.NOTES, Preload.NOTES, true)
    setupCloseLogic(notesWindow, WindowType.NOTES, function() {
        notesWindow = null
    })
})

let foodWindow: BrowserWindow | null
ipcMain.on(Channel.OPEN_FOOD, () => {
    if(foodWindow) {
        foodWindow.show()
        return
    }
    foodWindow = createWindowAndLoad(WindowType.FOOD, HTMLPath.FOOD, Preload.FOOD, true)
    setupCloseLogic(foodWindow, WindowType.FOOD, function() {
        foodWindow = null
    })
})

let dressingWindow: BrowserWindow | null
ipcMain.on(Channel.OPEN_DRESSING_ROOM, () => {
    if(dressingWindow) {
        dressingWindow.show()
        return
    }
    dressingWindow = createWindowAndLoad(WindowType.DRESSING_ROOM, HTMLPath.DRESSING, Preload.DRESSING, true)
    setupCloseLogic(dressingWindow, WindowType.DRESSING_ROOM, function() {
        dressingWindow = null
    })
})

let beltWindow: BrowserWindow | null
ipcMain.on(Channel.OPEN_BELT_POTION_ROOM, () => {
    if(beltWindow) {
        beltWindow.show()
        return
    }
    beltWindow = createWindowAndLoad(WindowType.BELT_POTION_ROOM, HTMLPath.BELT, Preload.BELT, true)
    setupCloseLogic(beltWindow, WindowType.BELT_POTION_ROOM, function() {
        beltWindow = null
    })
})

let chatLogWindow: BrowserWindow | null
ipcMain.on(Channel.OPEN_CHAT_LOG, () => {
    if(chatLogWindow) {
        chatLogWindow.show()
        return
    }
    chatLogWindow = createWindowAndLoad(WindowType.CHAT_LOG, HTMLPath.CHAT_LOG, Preload.CHAT_LOG, true)
    setupCloseLogic(chatLogWindow, WindowType.CHAT_LOG, function() {
        chatLogWindow = null
    })
})

let chatSettingsWindow: BrowserWindow | null
ipcMain.on(Channel.OPEN_CHAT_SETTINGS, () => {
    if(chatSettingsWindow) {
        chatSettingsWindow.show()
        return
    }
    chatSettingsWindow = createWindowAndLoad(WindowType.CHAT_SETTINGS, HTMLPath.CHAT_SETTINGS, Preload.CHAT_SETTINGS, true)
    setupCloseLogic(chatSettingsWindow, WindowType.CHAT_SETTINGS, function() {
        chatSettingsWindow = null
    })
})

let favouriteListBrowserView: BrowserView | null

function closeFavouriteListBrowserView() {
    if(favouriteListBrowserView) {
        if(!favouriteListBrowserView.webContents.isDestroyed()) {
            TabsController.mainWindow?.removeBrowserView(favouriteListBrowserView)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(favouriteListBrowserView.webContents as any).destroy()
        }
        favouriteListBrowserView = null
    }
}

ipcMain.on(Channel.FAVOURITE_LIST, () => {
    if(!TabsController.mainWindow) {
        alert('Main window creation error')
        return
    }
    if(favouriteListBrowserView) {
        closeFavouriteListBrowserView()
        return
    }
    favouriteListBrowserView = new BrowserView({
        webPreferences: {
            preload: `${path.join(app.getAppPath(), 'out', 'Components', 'FavouriteList', 'preload.js')}`
        }
    })
    TabsController.mainWindow?.addBrowserView(favouriteListBrowserView)
    const marginRight = process.platform == 'darwin' ? 208 : 224
    favouriteListBrowserView.webContents.loadFile(`${path.join(app.getAppPath(), 'gui', 'FavouriteList', 'index.html')}`)
    favouriteListBrowserView.setBounds({
        x: TabsController.mainWindow.getBounds().width - marginRight,
        y: 72,
        width: 208,
        height: 208
    })
    require('@electron/remote/main').enable(favouriteListBrowserView.webContents)

    TabsController.mainWindow.on('resize', function() {
        const frame = TabsController.mainWindow?.getBounds()
        if(frame) {
            favouriteListBrowserView?.setBounds({
                x: frame.width - marginRight,
                y: 72,
                width: 215,
                height: 208
            })
        }
    })
})
