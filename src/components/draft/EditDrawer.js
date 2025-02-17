import React, { useState, useEffect, useContext, useRef } from 'react'
import { css } from '@emotion/core'
import AceEditor from 'react-ace'
import 'brace/mode/javascript'
import 'brace/mode/jsx'
import 'brace/theme/dracula'
import { serialize, deserialize, boolAttr } from '../../lib/helpers'
import { SelectedContext } from '../contexts/SelectedContext'
import { EditDrawerContext } from '../contexts/EditDrawerContext'
import ErrorIcon from '../../svgs/ErrorIcon'
import IconButton from '../common/IconButton'
import CloseIcon from '../../svgs/CloseIcon'

import { transpile, isJsxString } from '../../lib/transpile-jsx'

const editDrawerCss = css`
  background-color: var(--color-background-primary);

  color: white;
  transition: margin-right 0.2s ease-in-out;
  box-shadow: 0 0 8px #333;
  height: 100%;
  display: none;

  & .ace_editor {
    width: 100% !important;
    max-width: 100% !important;
    height: calc(100% - 48px) !important;
    max-height: calc(100% - 48px) !important;
    background-color: transparent;
    box-sizing: border-box;
    font-family: 'Fira Code', 'Monaco', 'Ubuntu Mono', 'Consolas';
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
    margin-top: 8px;
  }

  &[isopen] {
    display: block;
  }

  /* The highlighted line color was the same color as selected text - this makes them different */
  & .ace_editor .ace_marker-layer .ace_active-line,
  & .ace_editor .ace_gutter .ace_gutter-active-line {
    background: var(--color-background-secondary) !important;
  }

  & .ace_editor .ace_placeholder {
    opacity: 0.6;
  }
`

const headerCss = css`
  padding: 0 16px;
  background-color: var(--color-background-tertiary);
`

const titleBarCss = css`
  font-size: 16px;
  display: flex;
  height: 48px;
  align-items: center;

  & > .title {
    padding: 0;
    margin: 0;
    font-weight: 600;
    display: flex;
    align-items: center;
    min-height: 20px;
    flex-grow: 2;
  }

  & > div.title svg {
    height: 20px;
    width: 20px;
    fill: var(--color-error-text);
    margin-left: 8px;
  }
`

const editItemTypeCss = css`
  font-size: 12px;
  color: #fff9;
  margin-right: 8px;
  flex-grow: 2;
  text-align: right;
`

const modeMap = {
  object: 'javascript',
  array: 'javascript',
  shape: 'javascript',
  exact: 'javascript',
  function: 'javascript',
  jsx: 'jsx',
}

const placeholderMap = {
  object: '{ ... }',
  array: '[ ... ]',
  shape: '{ ... }',
  exact: '{ ... }',
  function: '() => { ... }',
  jsx: '<div> ... </div>',
}

/** A bottom-opening drawer containing an editor. Allows the user to edit the prop state for objects, shapes, and exact shapes. */
export default function EditDrawer() {
  const { editItem, setEditItem, closeEditDrawer } = useContext(EditDrawerContext)
  const [hasError, setHasError] = useState(false)
  const { updatePropState } = useContext(SelectedContext)
  const editorRef = useRef(null)

  /* Close the drawer and remove the current edit item */
  function handleClose() {
    setEditItem(null)
  }

  /* Closes the editDrawer if ESC is pressed */
  function keyboardClose({ keyCode, target }) {
    if (editItem && target.tagName.toLowerCase() !== 'input' && keyCode === 27) {
      closeEditDrawer()
    }
  }

  /* Add ESC key shortcut to close the editor when open */
  useEffect(() => {
    document.addEventListener('keyup', keyboardClose)
    return () => document.removeEventListener('keyup', keyboardClose)
  }, [])

  /* Focus on editor as soon as it opens */
  useEffect(() => {
    if (editItem && document.activeElement !== editorRef.current.editor.textInput.getElement()) {
      editorRef.current.editor.focus()
      editorRef.current.editor.navigateFileEnd()
    }
  }, [editItem])

  const handleChange = newValue => {
    try {
      // this alertHolder wrapping the eval alows for the user to have uninterrupted typing
      // should they type some stupid thing like `window.alert()` inline to their javascript
      const alertHolder = window.alert
      window.alert = undefined

      // We do this to see if the thing the user types breaks, and if it does, we handle that in the catch.
      transpile(newValue)
      window.alert = alertHolder

      const newPropStateValue =
        editItem.valueType === 'jsx' && !isJsxString(newValue)
          ? serialize(newValue, ['STRING'])
          : serialize(newValue, ['TRANSPILE'])

      updatePropState(editItem.propName, newPropStateValue)
      setEditItem({ ...editItem, value: newValue })
      setHasError(false)
    } catch (e) {
      if (process.env.DEBUG) console.error(e)
      setEditItem({ ...editItem, value: newValue })
      setHasError(true)
    }
  }

  return editItem ? (
    <div css={editDrawerCss} isopen={boolAttr(editItem)} className="demo-font">
      <div css={headerCss}>
        {/* TITLE */}
        <div css={titleBarCss}>
          <div title="The current value is not valid" className="title demo-font">
            <div>{editItem.propName}</div>
            {hasError && <ErrorIcon />}
            <div css={editItemTypeCss}>{editItem.valueType}</div>
          </div>

          {/* CLOSE BUTTON */}
          <IconButton Icon={CloseIcon} onClick={handleClose} />
        </div>
      </div>

      {/* EDITOR */}
      <AceEditor
        mode={modeMap[editItem.valueType]}
        placeholder={placeholderMap[editItem.valueType]}
        ref={editorRef}
        showPrintMargin={false}
        setOptions={{
          useWorker: false,
          displayIndentGuides: false,
          wrapBehavioursEnabled: false,
          cursor: 'smooth',
        }}
        value={deserialize(editItem.value, false)}
        theme="dracula"
        name="edit-drawer-editor"
        onChange={handleChange}
      />
    </div>
  ) : null
}
