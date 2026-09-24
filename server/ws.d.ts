declare module "ws" {
  export class WebSocket {
    static OPEN: number;
    binaryType: string;
    readyState: number;
    send(data: any, options?: { binary?: boolean }): void;
    close(): void;
    on(event: "message" | "close" | "error", listener: (...args: any[]) => void): void;
  }
  export const WebSocketServer: new (options: { server: http.Server; path?: string }) => {
    on: (event: "connection", listener: (ws: import("ws").WebSocket, req: http.IncomingMessage) => void) => void;
  };
}
declare module "fs";
declare module "net";
declare module "path";
