declare module "qrcode" {
  export function toString(
    text: string,
    options?: {
      margin?: number;
      type?: string;
      width?: number;
    }
  ): Promise<string>;

  const QRCode: {
    toString: typeof toString;
  };

  export default QRCode;
}
