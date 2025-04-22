// TODO: This is a hack to support string payloads.
// Needs to update MultiPayload to support correct payload type
export type MultiPayload =
  | {
      standard: string;
      payload: string;
      signature: string;
      public_key?: string;
    }
  | string;
