function required(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} is required`);
  return value.trim();
}

export function buildBrowserLaunchSpec({ platform, url }) {
  const target = required(url, 'url');
  const currentPlatform = required(platform, 'platform');

  if (currentPlatform === 'win32') {
    return {
      command: 'rundll32.exe',
      args: ['url.dll,FileProtocolHandler', target]
    };
  }

  if (currentPlatform === 'darwin') {
    return { command: 'open', args: [target] };
  }

  return { command: 'xdg-open', args: [target] };
}
