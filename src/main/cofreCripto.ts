/**
 * Criptografia do cofre do TAVIR Escritório.
 * AES-256-GCM com chave de máquina protegida por ACLs do Windows (icacls por SID).
 */
import { execFileSync } from 'node:child_process';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const MARCA_V2 = 'v2:';
let chave: Buffer | null = null;

function pastaDaChave(): string {
  const base = process.env.PROGRAMDATA || process.env.LOCALAPPDATA || process.cwd();
  return join(base, 'TAVIR');
}

export function caminhoDaChave(): string {
  return join(pastaDaChave(), 'cofre.key');
}

function restringirAcesso(arquivo: string): void {
  try {
    chmodSync(arquivo, 0o600);
  } catch {
    /* Windows ignora modo POSIX */
  }
  try {
    execFileSync(
      'icacls',
      [
        arquivo,
        '/inheritance:r',
        '/grant:r',
        '*S-1-5-18:(F)',
        '/grant:r',
        '*S-1-5-32-544:(F)',
        '/grant:r',
        '*S-1-3-4:(F)',
      ],
      { stdio: 'ignore', windowsHide: true },
    );
  } catch {
    /* segue em caso de ambiente sem icacls */
  }
}

function obterChave(): Buffer {
  if (chave) return chave;
  const pasta = pastaDaChave();
  const arq = caminhoDaChave();
  if (existsSync(arq)) {
    try {
      const lida = readFileSync(arq);
      if (lida.length === 32) {
        chave = lida;
        return chave;
      }
    } catch {
      /* se falhar ao ler, gera uma nova */
    }
  }
  mkdirSync(pasta, { recursive: true });
  chave = randomBytes(32);
  writeFileSync(arq, chave);
  restringirAcesso(arq);
  return chave;
}

export function cifrar(textoPuro: string): string {
  if (!textoPuro) return '';
  const k = obterChave();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const enc = Buffer.concat([cipher.update(textoPuro, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    MARCA_V2 +
    iv.toString('base64') +
    ':' +
    tag.toString('base64') +
    ':' +
    enc.toString('base64')
  );
}

export function decifrar(textoCifrado: string): string {
  if (!textoCifrado) return '';
  if (!textoCifrado.startsWith(MARCA_V2)) return textoCifrado;
  try {
    const k = obterChave();
    const partes = textoCifrado.slice(MARCA_V2.length).split(':');
    if (partes.length !== 3) return '';
    const iv = Buffer.from(partes[0], 'base64');
    const tag = Buffer.from(partes[1], 'base64');
    const enc = Buffer.from(partes[2], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', k, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc).toString('utf8') + decipher.final('utf8');
  } catch {
    return '';
  }
}
