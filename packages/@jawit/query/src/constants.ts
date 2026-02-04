export const TREATY_TYPES = new Set(["function", "object"]);

export const QUERY_METHODS = ["get", "head", "options"] as const;
export const MUTATION_METHODS = ["post", "put", "patch", "delete"] as const;

export const QUERY_HOOKS = [
	"queryOptions",
	"useQuery",
	"useSuspenseQuery",
	"useInfiniteQuery",
	"ensureQueryData",
	"invalidateQuery",
] as const;

export const MUTATION_HOOKS = ["useMutation"] as const;

export const ALL_HOOKS = [...QUERY_HOOKS, ...MUTATION_HOOKS] as const;

export const PROXY_SYMBOL_HANDLERS: Record<string | symbol, unknown> = {
	[Symbol.toPrimitive]: () => "EdenQueryReference",
	[Symbol.toStringTag]: "EdenQueryReference",
	toString: () => "EdenQueryReference",
	valueOf: () => "EdenQueryReference",
	toJSON: () => "EdenQueryReference",
};
