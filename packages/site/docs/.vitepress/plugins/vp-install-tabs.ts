import { npmCommandsMarkdownPlugin } from "vitepress-plugin-npm-commands";

const commandMarkerPattern = new RegExp(
  String.raw`(?://\s*\[!=npm\s+((?:npm|yarn|pnpm|bun|auto))\])+$`,
  "m",
);
const installCommandPattern = new RegExp(String.raw`^npm\s+(?:i|install)\b`);

function stripCommandMarker(line: string): string {
  return line.replace(commandMarkerPattern, "").trimEnd();
}

function toVpInstallCommand(command: string): string | null {
  const match = command.trim().match(/^npm\s+(?:i|install)\s+(.+)$/);
  if (!match) {
    return null;
  }

  let args = match[1].trim();
  let isDevDependency = false;

  args = args
    .replace(/\s+(?:-D|--save-dev)\b/g, () => {
      isDevDependency = true;
      return "";
    })
    .replace(/\s+(?:-P|--save-prod)\b/g, "")
    .trim();

  return `vp add${isDevDependency ? " -D" : ""}${args ? ` ${args}` : ""}`;
}

function buildVpInstallCode(input: string): string | null {
  const lines: string[] = [];
  let hasConvertedInstallCommand = false;

  for (const line of input.split("\n")) {
    const trimmedLine = line.trim();
    const marker = line.match(commandMarkerPattern)?.[1] ?? null;
    const strippedLine = stripCommandMarker(line);

    if (!trimmedLine) {
      lines.push(line);
      continue;
    }

    if (marker && marker !== "auto" && marker !== "npm") {
      continue;
    }

    if (!installCommandPattern.test(strippedLine.trim())) {
      lines.push(strippedLine);
      continue;
    }

    const vpCommand = toVpInstallCommand(strippedLine);
    if (!vpCommand) {
      return null;
    }

    hasConvertedInstallCommand = true;
    lines.push(vpCommand);
  }

  return hasConvertedInstallCommand ? lines.join("\n") : null;
}

function formatFenceAttributes(attrs: Array<[string, string | null]> | null | undefined): string {
  if (!attrs?.length) {
    return "";
  }

  return `{${attrs.map(([key, value]) => (value ? `${key}=${value}` : key)).join(" ")}}`;
}

export function vpInstallCommandsMarkdownPlugin(
  md: Parameters<typeof npmCommandsMarkdownPlugin>[0],
): void {
  const previousFenceRenderer = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const rendered = previousFenceRenderer
      ? previousFenceRenderer(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options);

    if (!rendered.startsWith("<PluginTabs") || !commandMarkerPattern.test(token.content)) {
      return rendered;
    }

    const vpCode = buildVpInstallCode(token.content);
    if (!vpCode) {
      return rendered;
    }

    const attrString = formatFenceAttributes(token.attrs);
    const codeFence = `${token.markup}${token.info}${attrString}\n${vpCode}\n${token.markup}`;
    const vpTab = `<PluginTabsTab label="vp">${md.render(codeFence, env ?? {})}</PluginTabsTab>`;

    return rendered.replace(/^(<PluginTabs[^>]*>)/, `$1${vpTab}`);
  };
}
