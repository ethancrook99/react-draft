import React, { useContext, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { css } from '@emotion/core'
import Components from '../../out/master-exports'
import DemoWrapper from './draft/DemoWrapper'
import canRender from '../lib/can-render'
import SettingsProvider from './contexts/SettingsContext'
import SelectedProvider, { SelectedContext } from './contexts/SelectedContext'
import StorageProvider, { StorageContext } from './contexts/StorageContext'
import EditDrawerProvider from './contexts/EditDrawerContext'
import TabsProvider from './contexts/TabsContext'
import { msg, parseMsg, boolAttr } from '../lib/helpers'
import '../global.css' //eslint-disable-line
import { TABS } from '../constants/STORAGE_KEYS'

const frameCss = css`
  width: 100%;
  border: none;
  display: block;
  height: 100px;
  height: 100%;
`

const { componentTree } = Components

function Page() {
  const iframeRef = useRef(null)
  const { getItem } = useContext(StorageContext)
  const { SelectedComponent, propStates } = useContext(SelectedContext)
  const { meta } = SelectedComponent
  const { props } = meta

  const tabs = getItem(TABS, [])
  const canRenderComponent = propStates && canRender(props, propStates)
  const handleMessage = parseMsg(receiveMessage)

  const messageSelectedComponent = () =>
    msg(iframeRef.current && iframeRef.current.contentWindow, 'SELECTED_COMPONENT', meta)

  const messagePropStates = () =>
    msg(iframeRef.current && iframeRef.current.contentWindow, 'PROP_STATES', propStates)

  function receiveMessage(type) {
    if (process.env.DEBUG) console.log('DRAFT | Message Received: ', type)
    if (type === 'DEMO_INITIALIZED') {
      messageSelectedComponent()
      messagePropStates()
    }
  }

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    messageSelectedComponent()
  }, [SelectedComponent])

  useEffect(() => {
    messagePropStates()
  }, [propStates])

  return (
    <DemoWrapper propObjects={props} componentTree={componentTree}>
      {canRenderComponent && (
        <iframe
          ref={iframeRef}
          css={frameCss}
          onLoad={() => {
            iframeRef.current.height = `${iframeRef.current.contentDocument.body.scrollHeight}px`
          }}
          data-tabsopen={boolAttr(tabs.length > 0)}
          title="demo"
          src={`${process.env.PUBLIC_PATH || '/'}demo`}
        />
      )}
    </DemoWrapper>
  )
}

// Render the demo in the dom
ReactDOM.render(
  <StorageProvider>
    <SelectedProvider components={Components}>
      <EditDrawerProvider>
        <SettingsProvider>
          <TabsProvider>
            <Page />
          </TabsProvider>
        </SettingsProvider>
      </EditDrawerProvider>
    </SelectedProvider>
  </StorageProvider>,
  document.getElementById('app')
)
