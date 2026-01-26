import { useMemo } from 'react';
import { useAppSettingsStore, type EditorFontFamily, type EditorWidth } from '../stores/appSettings';

function getFontFamilyValue(fontFamily: EditorFontFamily): string {
  switch (fontFamily) {
    case 'system':
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    case 'serif':
      return 'Georgia, "Times New Roman", Times, serif';
    case 'sans-serif':
      return 'Helvetica, Arial, sans-serif';
    case 'monospace':
      return '"SF Mono", "Fira Code", Consolas, "Courier New", monospace';
    case 'georgia':
      return 'Georgia, serif';
    default:
      return 'inherit';
  }
}

function getEditorWidthValue(editorWidth: EditorWidth): string {
  switch (editorWidth) {
    case 'narrow':
      return '600px';
    case 'medium':
      return '720px';
    case 'wide':
      return '900px';
    case 'full':
      return '100%';
    default:
      return '720px';
  }
}

export interface EditorStyleVariables {
  '--editor-font-family': string;
  '--editor-font-size': string;
  '--editor-line-height': string;
  '--editor-max-width': string;
}

export function useEditorStyles(): {
  style: React.CSSProperties;
  cssVariables: EditorStyleVariables;
  settings: {
    fontFamily: EditorFontFamily;
    fontSize: number;
    lineHeight: number;
    editorWidth: EditorWidth;
  };
} {
  const fontFamily = useAppSettingsStore((state) => state.settings.editor.fontFamily);
  const fontSize = useAppSettingsStore((state) => state.settings.editor.fontSize);
  const lineHeight = useAppSettingsStore((state) => state.settings.editor.lineHeight);
  const editorWidth = useAppSettingsStore((state) => state.settings.editor.editorWidth);

  const style = useMemo(
    () => ({
      fontFamily: getFontFamilyValue(fontFamily),
      fontSize: `${fontSize}px`,
      lineHeight: lineHeight,
      maxWidth: getEditorWidthValue(editorWidth),
    }),
    [fontFamily, fontSize, lineHeight, editorWidth]
  );

  const cssVariables = useMemo(
    () => ({
      '--editor-font-family': getFontFamilyValue(fontFamily),
      '--editor-font-size': `${fontSize}px`,
      '--editor-line-height': String(lineHeight),
      '--editor-max-width': getEditorWidthValue(editorWidth),
    }),
    [fontFamily, fontSize, lineHeight, editorWidth]
  );

  return {
    style,
    cssVariables,
    settings: {
      fontFamily,
      fontSize,
      lineHeight,
      editorWidth,
    },
  };
}
