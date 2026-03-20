const [
  rootModule,
  immutableModule,
  infiniteModule,
  mutationModule,
  subscriptionModule,
  internalModule,
] = await Promise.all([
  import("swrv"),
  import("swrv/immutable"),
  import("swrv/infinite"),
  import("swrv/mutation"),
  import("swrv/subscription"),
  import("swrv/_internal"),
]);

if (typeof rootModule.default !== "function") {
  throw new Error("Expected the root default export to be a function.");
}

if (typeof rootModule.createSWRVClient !== "function") {
  throw new Error("Expected createSWRVClient to exist on the root export.");
}

if (typeof immutableModule.default !== "function") {
  throw new Error("Expected the immutable export to be callable.");
}

if (typeof infiniteModule.default !== "function") {
  throw new Error("Expected the infinite export to be callable.");
}

if (typeof mutationModule.default !== "function") {
  throw new Error("Expected the mutation export to be callable.");
}

if (typeof subscriptionModule.default !== "function") {
  throw new Error("Expected the subscription export to be callable.");
}

if (typeof internalModule.serialize !== "function") {
  throw new Error("Expected the internal serialize export to exist.");
}
