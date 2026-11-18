'use client';
import { useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  Image,
  ImageUpload,
  ImageToolbar,
  ImageCaption,
  ImageTextAlternative,
  GeneralHtmlSupport,
  type Editor,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { uploadImage } from './image-upload';

function imageAdapter(editor: Editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    const controller = new AbortController();
    return {
      upload: async () => {
        const file = await loader.file;
        if (!file) throw new Error('Choose an image.');
        return { default: await uploadImage(file, controller.signal) };
      },
      abort: () => controller.abort(),
    };
  };
}
function asHtml(value: string) {
  if (/<\/?(?:p|h[1-6]|ul|ol|figure|table|blockquote)\b/i.test(value))
    return value;
  return value
    .split(/\n\n+/)
    .map(
      (p) =>
        '<p>' +
        p
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('\n', '<br>') +
        '</p>',
    )
    .join('');
}
export default function ContentEditor({
  name,
  initial,
}: {
  name: string;
  initial: string;
}) {
  const [pending, setPending] = useState(false);
  const [value, setValue] = useState(() => asHtml(initial));
  return (
    <div className="admin-rich-editor" data-uploading={pending}>
      <input type="hidden" name={name} value={value} />
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{
          licenseKey: process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY || 'GPL',
          plugins: [
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            Link,
            List,
            BlockQuote,
            Table,
            TableToolbar,
            Image,
            ImageUpload,
            ImageToolbar,
            ImageCaption,
            ImageTextAlternative,
            GeneralHtmlSupport,
          ],
          extraPlugins: [imageAdapter],
          toolbar: [
            'undo',
            'redo',
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            'strikethrough',
            '|',
            'link',
            'bulletedList',
            'numberedList',
            'blockQuote',
            '|',
            'uploadImage',
            'insertTable',
          ],
          image: { toolbar: ['toggleImageCaption', 'imageTextAlternative'] },
          table: {
            contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
          },
        }}
        onReady={(editor) => {
          const actions = editor.plugins.get('PendingActions');
          actions.on('change:hasAny', () => setPending(actions.hasAny));
        }}
        onChange={(_, editor) => setValue(editor.getData())}
      />
    </div>
  );
}
