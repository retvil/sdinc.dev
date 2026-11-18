// «Связь» screen data: three user-confirmed contact channels, in the fixed
// order Email → Telegram → GitHub. No demo markers, no unconfirmed promises
// (no status, no response time). Display values and links are verbatim.

export interface ContactChannel {
  /** Stable key: 'email' | 'telegram' | 'github'. */
  readonly key: string;
  /** Channel label shown as the item title. */
  readonly channel: string;
  /** User-facing address / handle (verbatim). */
  readonly display: string;
  /** Primary action link (native anchor, exact user-confirmed URL). */
  readonly href: string;
  /** https links open in a new tab; mailto uses the protocol handler. */
  readonly external: boolean;
  /** Visible label of the primary action. */
  readonly actionLabel: string;
  /** Accessible name of the primary action link. */
  readonly actionAria: string;
  /** Visible label of the copy button. */
  readonly copyLabel: string;
  /** Accessible name of the copy button. */
  readonly copyAria: string;
  /** Exact value copied to the clipboard. */
  readonly copyValue: string;
  /** Noun for the manual-copy hint («адрес» / «имя»). */
  readonly valueNoun: string;
}

export const CONTACTS: readonly ContactChannel[] = [
  {
    key: 'email',
    channel: 'Email',
    display: 'Hello@sdinc.dev',
    href: 'mailto:Hello@sdinc.dev',
    external: false,
    actionLabel: 'Написать',
    actionAria: 'Написать на Hello@sdinc.dev',
    copyLabel: 'Скопировать адрес',
    copyAria: 'Скопировать адрес Hello@sdinc.dev',
    copyValue: 'Hello@sdinc.dev',
    valueNoun: 'адрес',
  },
  {
    key: 'telegram',
    channel: 'Telegram',
    display: '@Nod33Eset',
    href: 'https://t.me/Nod33Eset',
    external: true,
    actionLabel: 'Открыть Telegram',
    actionAria: 'Открыть Telegram',
    copyLabel: 'Скопировать имя',
    copyAria: 'Скопировать имя @Nod33Eset',
    copyValue: '@Nod33Eset',
    valueNoun: 'имя',
  },
  {
    key: 'github',
    channel: 'GitHub',
    display: 'retvil',
    href: 'https://github.com/retvil',
    external: true,
    actionLabel: 'Открыть GitHub',
    actionAria: 'Открыть GitHub',
    copyLabel: 'Скопировать имя',
    copyAria: 'Скопировать имя retvil',
    copyValue: 'retvil',
    valueNoun: 'имя',
  },
] as const;
