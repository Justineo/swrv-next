const STR_UNDEFINED = "undefined";

export const isWindowDefined = () => typeof window !== STR_UNDEFINED;
export const isLegacyDeno = () => isWindowDefined() && "Deno" in window;
export const isServerEnvironment = () => !isWindowDefined() || isLegacyDeno();

type ConnectionInfo = {
  effectiveType?: string;
  saveData?: boolean;
};

function getNavigatorConnection(): ConnectionInfo | undefined {
  if (typeof navigator === STR_UNDEFINED) {
    return undefined;
  }

  return (navigator as Navigator & { connection?: ConnectionInfo }).connection;
}

const connection = isServerEnvironment() ? undefined : getNavigatorConnection();

export const slowConnection =
  connection?.saveData === true ||
  connection?.effectiveType === "slow-2g" ||
  connection?.effectiveType === "2g";
