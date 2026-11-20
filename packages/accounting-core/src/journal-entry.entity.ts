import { EntryType } from '@platform/shared-types';
import { Money } from './money.vo.js';

export interface JournalEntryProps {
  id?: string;
  voucherId: string;
  ledgerId: string;
  entryType: EntryType;
  amount: Money;
  narration?: string;
  lineIndex: number;
}

export class JournalEntry {
  public readonly id?: string;
  public readonly voucherId: string;
  public readonly ledgerId: string;
  public readonly entryType: EntryType;
  public readonly amount: Money;
  public readonly narration?: string;
  public readonly lineIndex: number;

  constructor(props: JournalEntryProps) {
    this.id = props.id;
    this.voucherId = props.voucherId;
    this.ledgerId = props.ledgerId;
    this.entryType = props.entryType;
    this.amount = props.amount;
    this.narration = props.narration;
    this.lineIndex = props.lineIndex;
  }

  public isDebit(): boolean {
    return this.entryType === EntryType.DEBIT;
  }

  public isCredit(): boolean {
    return this.entryType === EntryType.CREDIT;
  }

  public createReversalEntry(reversalVoucherId: string): JournalEntry {
    return new JournalEntry({
      voucherId: reversalVoucherId,
      ledgerId: this.ledgerId,
      entryType: this.entryType === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT,
      amount: this.amount,
      narration: `Reversal of line ${this.lineIndex}${this.narration ? `: ${this.narration}` : ''}`,
      lineIndex: this.lineIndex,
    });
  }
}

