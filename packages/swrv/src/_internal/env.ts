const STR_UNDEFINED = "undefined";

export const isWindowDefined = () => typeof window !== STR_UNDEFINED;
export const isLegacyDeno = () => isWindowDefined() && "Deno" in window;
export const isServerEnvironment = () => !isWindowDefined() || isLegacyDeno();
