import net from "node:net";
import tls from "node:tls";
import { randomUUID } from "node:crypto";

/*
 * Small SMTP client (no extra packages). Supports SSL (port 465) and
 * STARTTLS (587 / 25), AUTH PLAIN and AUTH LOGIN.
 */

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean; // true = SSL on connect (465), false = STARTTLS
  username: string;
  password: string;
};

type Conn = {
  socket: net.Socket | tls.TLSSocket;
  read: () => Promise<{ code: number; text: string }>;
  write: (line: string) => void;
};

function wrap(socket: net.Socket | tls.TLSSocket): Conn {
  let buffer = "";
  let waiting: ((value: { code: number; text: string }) => void) | null = null;
  let failed: ((error: Error) => void) | null = null;
  const ready: { code: number; text: string }[] = [];

  const parse = () => {
    // A full reply ends with a line "250 text" (space after the code).
    for (;;) {
      const lines = buffer.split("\r\n");
      let end = -1;
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i]) || /^\d{3}$/.test(lines[i])) {
          end = i;
          break;
        }
      }
      if (end < 0) return;
      const reply = lines.slice(0, end + 1);
      buffer = lines.slice(end + 1).join("\r\n");
      const item = { code: Number(reply[end].slice(0, 3)), text: reply.map((l) => l.slice(4)).join("\n") };
      if (waiting) {
        const resolve = waiting;
        waiting = null;
        failed = null;
        resolve(item);
      } else ready.push(item);
    }
  };

  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    parse();
  });
  socket.on("error", (error) => failed?.(error));

  return {
    socket,
    write: (line) => socket.write(`${line}\r\n`),
    read: () =>
      new Promise((resolve, reject) => {
        const next = ready.shift();
        if (next) return resolve(next);
        waiting = resolve;
        failed = reject;
      }),
  };
}

function connectSocket(settings: SmtpSettings): Promise<net.Socket | tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    const socket = settings.secure
      ? tls.connect({ host: settings.host, port: settings.port, servername: settings.host }, () => resolve(socket))
      : net.connect({ host: settings.host, port: settings.port }, () => resolve(socket));
    socket.setTimeout(20000, () => socket.destroy(new Error("The email server took too long to answer.")));
    socket.once("error", onError);
  });
}

async function expect(conn: Conn, codes: number[], step: string) {
  const reply = await conn.read();
  if (!codes.includes(reply.code)) {
    throw new Error(`Email server refused ${step}: ${reply.code} ${reply.text.split("\n")[0]}`);
  }
  return reply;
}

async function open(settings: SmtpSettings) {
  let conn = wrap(await connectSocket(settings));
  await expect(conn, [220], "the connection");
  conn.write("EHLO baselead");
  let ehlo = await expect(conn, [250], "EHLO");

  if (!settings.secure) {
    if (!/STARTTLS/i.test(ehlo.text)) throw new Error("This server does not support a secure connection on that port.");
    conn.write("STARTTLS");
    await expect(conn, [220], "STARTTLS");
    const secured = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const s = tls.connect({ socket: conn.socket as net.Socket, servername: settings.host }, () => resolve(s));
      s.once("error", reject);
    });
    conn = wrap(secured);
    conn.write("EHLO baselead");
    ehlo = await expect(conn, [250], "EHLO");
  }

  if (/AUTH[^\n]*PLAIN/i.test(ehlo.text)) {
    conn.write(`AUTH PLAIN ${Buffer.from(`\0${settings.username}\0${settings.password}`).toString("base64")}`);
    await expect(conn, [235], "the email or password (login)");
  } else {
    conn.write("AUTH LOGIN");
    await expect(conn, [334], "login");
    conn.write(Buffer.from(settings.username).toString("base64"));
    await expect(conn, [334], "the username");
    conn.write(Buffer.from(settings.password).toString("base64"));
    await expect(conn, [235], "the email or password (login)");
  }

  return conn;
}

/** Checks that the SMTP login works. */
export async function verifySmtp(settings: SmtpSettings) {
  const conn = await open(settings);
  conn.write("QUIT");
  conn.socket.end();
}

function encodeHeader(value: string) {
  return /[^\x20-\x7E]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=` : value;
}

export type OutgoingEmail = {
  from: string; // email
  fromName?: string | null;
  to: string;
  subject: string;
  body: string; // plain text
  headers?: string[];
  inReplyTo?: string | null;
  references?: string | null;
};

/** Builds the raw message. Returns it with its Message-ID. */
export function buildMessage(email: OutgoingEmail) {
  const domain = email.from.split("@")[1] || "baselead.app";
  const messageId = `<${randomUUID()}@${domain}>`;
  const from = email.fromName ? `${encodeHeader(email.fromName)} <${email.from}>` : email.from;
  const headers = [
    `From: ${from}`,
    `To: ${email.to}`,
    `Subject: ${encodeHeader(email.subject)}`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    ...(email.inReplyTo ? [`In-Reply-To: ${email.inReplyTo}`, `References: ${email.references || email.inReplyTo}`] : []),
    ...(email.headers ?? []),
  ];
  const body = Buffer.from(email.body, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
  return { messageId, raw: `${headers.join("\r\n")}\r\n\r\n${body}\r\n` };
}

/** Sends one email. Returns the Message-ID and the raw message. */
export async function sendSmtp(settings: SmtpSettings, email: OutgoingEmail) {
  const { messageId, raw } = buildMessage(email);
  const conn = await open(settings);
  try {
    conn.write(`MAIL FROM:<${email.from}>`);
    await expect(conn, [250], "the sender address");
    conn.write(`RCPT TO:<${email.to}>`);
    await expect(conn, [250, 251], "the recipient address");
    conn.write("DATA");
    await expect(conn, [354], "the message");
    // Dot-stuffing: lines starting with "." get an extra dot.
    conn.socket.write(`${raw.replace(/\r\n\./g, "\r\n..")}\r\n.\r\n`);
    await expect(conn, [250], "the message");
    conn.write("QUIT");
  } finally {
    conn.socket.end();
  }
  return { messageId, raw };
}
