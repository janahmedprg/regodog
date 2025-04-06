import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { Button, useRef } from "react";

const theme = {};

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error) {
  console.error(error);
}

const Editor = (initialEditorState, onSave) => {
  const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError,
    editorState:
      '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
  };

  const editorStateRef = useRef(undefined);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PlainTextPlugin
        contentEditable={
          <ContentEditable
            aria-placeholder={"Enter some text..."}
            placeholder={
              <div className="lexical-placeholder">Enter some text...</div>
            }
            className="form-textarea"
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <OnChangePlugin
        onChange={(editorState) => {
          editorStateRef.current = editorState;
        }}
      />
      <Button
        label="Save"
        className="edit-save-button"
        onPress={() => {
          if (editorStateRef.current) {
            onSave(JSON.stringify(editorStateRef.current));
          }
        }}
      />
    </LexicalComposer>
  );
};

export default Editor;
