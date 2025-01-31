import setupMode from '../../Services/DarkModeHandler'
import { EffectSetsWindowActions } from './Actions'
import { EffectSetsWindowState } from './EffectSetsWindowState'
import reduce from './Reducer'
import { render, setupView, setupFilters } from './Renderer'

let initialState: EffectSetsWindowState = {
    allItems: [],
    currentItems: [],
    currentSet: null,
    sets: [],
    userConfig: null,
    activeFilters: [],
    searchEffect: ''
}

export default async function dispatch(action: EffectSetsWindowActions, data?: any) {
    initialState = await reduce(initialState, action, data)
    render(initialState)
}

window.addEventListener('DOMContentLoaded', async() => {
    setupMode()
    setupView()
    setupFilters()
    dispatch(EffectSetsWindowActions.LOAD_CONTENT)
})
