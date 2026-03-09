declare module 'y-websocket/bin/utils' {
  import * as Y from 'yjs';
  import type { IncomingMessage } from 'http';
  import type { WebSocket } from 'ws';

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: {
      docName?: string;
      gc?: boolean;
    }
  ): void;

  export function setPersistence(persistence: {
    bindState: (docName: string, ydoc: Y.Doc) => Promise<void>;
    writeState: (docName: string, ydoc: Y.Doc) => Promise<void>;
  } | null): void;

  export function getYDoc(docname: string, gc?: boolean): Y.Doc;
  export const docs: Map<string, Y.Doc>;
}
