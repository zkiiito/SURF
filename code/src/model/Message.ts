import type { AttachmentData, MessageData } from '../types.js';
import { Registry } from '../Registry.js';

export class Message {
  private _id: string | undefined;
  userId: string;
  waveId: string;
  parentId: string | null;
  message: string;
  attachments?: AttachmentData[];
  unread: boolean;
  created_at: number;

  constructor(data?: Partial<MessageData>) {
    this._id = data?._id;
    this.userId = data?.userId ?? '';
    this.waveId = data?.waveId ?? '';
    this.parentId = data?.parentId ?? null;
    this.message = data?.message ?? '';
    this.attachments = data?.attachments;
    this.unread = data?.unread ?? true;
    this.created_at = data?.created_at ?? Date.now();
  }

  get id(): string {
    return this._id ?? '';
  }

  setId(id: string): void {
    this._id = id;
  }

  isNew(): boolean {
    return !this._id;
  }

  validate(): string | undefined {
    const hasAttachments = (this.attachments?.length ?? 0) > 0;
    if (this.message.trim().length === 0 && !hasAttachments) {
      return 'Empty message';
    }
    return undefined;
  }

  isValid(): boolean {
    return this.validate() === undefined;
  }

  toJSON(): MessageData {
    return {
      _id: this._id,
      userId: this.userId,
      waveId: this.waveId,
      parentId: this.parentId,
      message: this.message,
      attachments: this.attachments,
      unread: this.unread,
      created_at: this.created_at,
    };
  }

  async save(): Promise<void> {
    await Registry.dal.saveMessage(this);
  }
}
