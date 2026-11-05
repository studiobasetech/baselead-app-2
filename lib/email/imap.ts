import tls from "node:tls";

/*
 * Small IMAP client (no extra packages), SSL on port 993.
 * Used to: check the login, read replies from leads, and save sent
 * emails in the account's "Sent" folder.
 */

export type ImapSettings = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export type InboxMessage = {
  uid: number;
  from: string;
  subject: string;
  date: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
  snippet: string;
};

class ImapConnection {
  private socket!: tls.TLSSocket;
  private buffer = Buffer.alloc(0);
  private tag = 0;
  private pending: { tag: string; resolve: (text: string) => void; reject: (error: Error) => void } | null = null;
  private greeting: Promise<void>;

  constructor(private settings: ImapSettings) {
    this.greeting = new Promise((resolve, reject) => {
      this.socket = tls.connect(
        { host: settings.host, port: settings.port, servername: settings.host },
        () => undefined
      );
      this.socket.setTimeout(25000, () => this.socket.destroy(new Error("The email server took too long to answer.")));
      this.socket.on("error", (error) => {
        reject(error);
        this.pending?.reject(error);
      });
      let greeted = false;
      this.socket.on("data", (chunk: Buffer) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (!greeted && this.buffer.includes("\r\n")) {
          greeted = true;
          this.buffer = Buffer.alloc(0);
          resolve();
          return;
        }
        this.check();
      });
    });
  }

  private check() {
    if (!this.pending) return;
    const text = this.buffer.toString("utf8");
    const match = text.match(new RegExp(`(^|\\r\\n)${this.pending.tag} (OK|NO|BAD)([^\\r\\n]*)\\r\\n`));
    if (!match) return;
    const { resolve, reject } = this.pending;
    this.pending = null;
    this.buffer = Buffer.alloc(0);
    if (match[2] === "OK") resolve(text);
    else reject(new Error(match[3].trim() || "The email server refused the request."));
  }

  async command(line: string, literal?: string) {
    await this.greeting;
    const tag = `B${++this.tag}`;
    return new Promise<string>((resolve, reject) => {
      this.pending = { tag, resolve, reject };
      if (literal === undefined) {
        this.socket.write(`${tag} ${line}\r\n`);
        return;
      }
      // APPEND: send the size, wait for "+", then the message.
      const size = Buffer.byteLength(literal);
      this.socket.write(`${tag} ${line} {${size}}\r\n`);
      const waitPlus = () => {
        if (this.buffer.toString("utf8").includes("+ ")) {
          this.buffer = Buffer.alloc(0);
          this.socket.write(`${literal}\r\n`);
        } else setTimeout(waitPlus, 50);
      };
      waitPlus();
    });
  }

  close() {
    try {
      this.socket.write(`B${++this.tag} LOGOUT\r\n`);
      this.socket.end();
    } catch {
      // already closed
    }
  }
}

function quote(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function login(settings: ImapSettings) {
  const conn = new ImapConnection(settings);
  try {
    await conn.command(`LOGIN ${quote(settings.username)} ${quote(settings.password)}`);
  } catch (error) {
    conn.close();
    throw new Error(
      `Inbox login failed: ${error instanceof Error ? error.message : "check the email and password"}`
    );
  }
  return conn;
}

/** Checks that the IMAP login works. */
export async function verifyImap(settings: ImapSettings) {
  const conn = await login(settings);
  conn.close();
}

function header(block: string, name: string) {
  const match = block.match(new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\r\\n[^ \\t]|$)`, "im"));
  return match ? match[1].replace(/\r\n[ \t]+/g, " ").trim() : null;
}

function decodeWords(value: string) {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, _charset, enc, text) => {
    try {
      return enc.toUpperCase() === "B"
        ? Buffer.from(text, "base64").toString("utf8")
        : text.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_x: string, h: string) => String.fromCharCode(parseInt(h, 16)));
    } catch {
      return text;
    }
  });
}

function imapDate(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getUTCDate()}-${months[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

/** Messages received in the inbox since a date (headers + short text). */
export async function fetchInboxSince(settings: ImapSettings, since: Date, max = 200): Promise<InboxMessage[]> {
  const conn = await login(settings);
  try {
    await conn.command("SELECT INBOX");
    const search = await conn.command(`UID SEARCH SINCE ${imapDate(since)}`);
    const uids = (search.match(/\* SEARCH([\d ]*)/)?.[1] ?? "").trim().split(/\s+/).filter(Boolean).slice(-max);
    if (!uids.length) return [];

    const response = await conn.command(
      `UID FETCH ${uids.join(",")} (UID BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)] BODY.PEEK[TEXT]<0.800>)`
    );

    const messages: InboxMessage[] = [];
    for (const part of response.split(/\r\n(?=\* \d+ FETCH)/)) {
      const uid = Number(part.match(/UID (\d+)/)?.[1]);
      if (!uid) continue;
      const headerBlock = part.match(/HEADER\.FIELDS[^\]]*\] \{\d+\}\r\n([\s\S]*?)\r\n\r\n/)?.[1] ?? "";
      const textBlock = part.match(/BODY\[TEXT\]<0> \{\d+\}\r\n([\s\S]*)/)?.[1] ?? "";
      const snippet = textBlock
        .replace(/<[^>]+>/g, " ")
        .replace(/=\r\n/g, "")
        .replace(/^>.*$/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);
      messages.push({
        uid,
        from: decodeWords(header(headerBlock, "From") ?? ""),
        subject: decodeWords(header(headerBlock, "Subject") ?? ""),
        date: header(headerBlock, "Date"),
        messageId: header(headerBlock, "Message-ID"),
        inReplyTo: header(headerBlock, "In-Reply-To"),
        references: header(headerBlock, "References"),
        snippet,
      });
    }
    return messages;
  } finally {
    conn.close();
  }
}

/** Saves a sent message in the account's Sent folder (best effort). */
export async function saveToSent(settings: ImapSettings, raw: string) {
  const conn = await login(settings);
  try {
    const list = await conn.command('LIST "" "*"');
    const lines = list.split("\r\n");
    const flagged = lines.find((line) => /\\Sent\b/i.test(line));
    const named = lines.find((line) => /"?(INBOX[./])?Sent( Items| Messages)?"?\s*$/i.test(line));
    const pick = (flagged || named)?.match(/ ("[^"]+"|[^ ]+)\s*$/)?.[1];
    if (!pick) return false;
    await conn.command(`APPEND ${pick} (\\Seen)`, raw);
    return true;
  } catch {
    return false;
  } finally {
    conn.close();
  }
}
