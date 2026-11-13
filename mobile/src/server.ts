export function normalizeServer(value: string): string {
  // A API PHP é publicada na raiz. Aceitar apenas a origem também impede
  // credenciais embutidas e diferenças entre os parsers web e React Native.
  const match = /^(https?):\/\/([a-z0-9.-]+)(?::([0-9]{1,5}))?\/?$/i.exec(value.trim());
  if (!match) throw new Error("Informe somente o endereço do servidor, como https://api.exemplo.com.");
  const [, protocol, rawHost, port] = match;
  const host = rawHost.toLowerCase();
  if (!host.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
      (port && (+port < 1 || +port > 65535)))
    throw new Error("Nome do servidor ou porta inválidos.");
  const octets = host.split(".").map(Number);
  const ipv4 = octets.length === 4 && octets.join(".") === host && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
  const local = host === "localhost" || (ipv4 && (
    octets[0] === 127 || octets[0] === 10 ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  ));
  if (protocol.toLowerCase() !== "https" && !local)
    throw new Error("Use HTTPS. HTTP é permitido apenas em rede local de demonstração.");
  return `${protocol.toLowerCase()}://${host}${port ? `:${Number(port)}` : ""}`;
}
