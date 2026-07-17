import type Koa from 'koa';

interface PaginationState {
    _randomSortRequestedPage?: number;
    _randomSortRequestedPageSize?: number;
}

interface StrapiResponseBody {
    data?: unknown[] | Record<string, unknown>;
    meta?: {
        pagination?: {
            page: number;
            pageSize: number;
            pageCount: number;
            total: number;
        };
    };
}

type RandomSortContext = Koa.ParameterizedContext<
    PaginationState,
    Koa.DefaultContext,
    StrapiResponseBody
>;

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Check if random sorting is requested via query params
 */
function isRandomSortRequested(ctx: RandomSortContext): boolean {
    const url = ctx.request?.url ?? '';
    const query = ctx.query as Record<string, unknown>;
    return url.includes('random=true') || query.random === 'true';
}

/**
 * Extract and remove pagination params from context
 * Returns the requested page and pageSize
 */
function extractPagination(ctx: RandomSortContext): { page: number; pageSize: number } {
    let requestedPage = 1;
    let requestedPageSize = 10;

    const query = ctx.query as Record<string, unknown>;

    // Handle object-style pagination
    if (query.pagination && typeof query.pagination === 'object') {
        const pagination = query.pagination as Record<string, string>;
        requestedPage = parseInt(pagination.page, 10) || 1;
        requestedPageSize = parseInt(pagination.pageSize, 10) || 10;
        delete query.pagination;
    }

    // Handle bracket-style pagination params
    if (query['pagination[page]']) {
        requestedPage = parseInt(String(query['pagination[page]']), 10) || 1;
        delete query['pagination[page]'];
    }
    if (query['pagination[pageSize]']) {
        requestedPageSize = parseInt(String(query['pagination[pageSize]']), 10) || 10;
        delete query['pagination[pageSize]'];
    }

    // Remove offset-style pagination params
    delete query.start;
    delete query.limit;

    return { page: requestedPage, pageSize: requestedPageSize };
}

/**
 * Clean pagination params from URL query string
 */
function cleanUrlQueryString(ctx: RandomSortContext): void {
    const url = ctx.request.url;
    const [baseUrl, queryString] = url.split('?');
    if (!queryString) return;

    const paginationPatterns = [
        'pagination[',
        'start=',
        'limit=',
        'page=',
        'pageSize=',
    ];

    const newQueryString = queryString
        .split('&')
        .filter((param: string) => !paginationPatterns.some((pattern) => param.startsWith(pattern)))
        .join('&');

    ctx.request.url = newQueryString ? `${baseUrl}?${newQueryString}` : baseUrl;
}

/**
 * Shuffle+paginate a REST-style response, where body.data is the flat
 * array of records and body.meta.pagination (if present) tracks totals.
 */
function applyRestRandomPagination(
    body: StrapiResponseBody,
    data: unknown[],
    page: number,
    pageSize: number
): void {
    const shuffledData = shuffleArray(data);
    const total = shuffledData.length;
    const pageCount = Math.ceil(total / pageSize);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    body.data = shuffledData.slice(start, end);

    if (body.meta?.pagination) {
        body.meta.pagination = {
            page,
            pageSize,
            pageCount,
            total,
        };
    }
}

/**
 * Shuffle a GraphQL-style response, where body.data is an object keyed by
 * query/operation name (e.g. `{ restaurants: [...] }` for the default
 * flattened Strapi v5 format, or `{ restaurants_connection: { data: [...],
 * meta: {...} } }` for the Relay-style `_connection` variant).
 *
 * Unlike REST, GraphQL resolves its own pagination arguments from the
 * query/variables in the request body, which this middleware has no access
 * to at the Koa layer. So there's no way to force a "fetch everything, then
 * repaginate" pass here — this only shuffles the order of whatever page
 * GraphQL already returned. Callers that want randomness across the full
 * dataset need to request a large pageSize in the GraphQL query itself.
 */
function applyGraphQLShuffle(dataObj: Record<string, unknown>): void {
    for (const key of Object.keys(dataObj)) {
        const value = dataObj[key];
        if (Array.isArray(value)) {
            dataObj[key] = shuffleArray(value);
        } else if (
            value &&
            typeof value === 'object' &&
            Array.isArray((value as { data?: unknown }).data)
        ) {
            (value as { data: unknown[] }).data = shuffleArray(
                (value as { data: unknown[] }).data
            );
        }
    }
}

/**
 * Apply random sorting (and, for REST, pagination) to response data.
 */
function applyRandomPagination(
    ctx: RandomSortContext,
    page: number,
    pageSize: number
): void {
    const body = ctx.body as StrapiResponseBody | undefined;
    if (!body?.data) return;

    if (Array.isArray(body.data)) {
        applyRestRandomPagination(body, body.data, page, pageSize);
        return;
    }

    if (typeof body.data === 'object') {
        applyGraphQLShuffle(body.data as Record<string, unknown>);
    }
}

/**
 * Random sort middleware for Strapi v5
 * Adds ?random=true query param support to randomly shuffle collection results
 */
const randomMiddleware = async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
    const extCtx = ctx as unknown as RandomSortContext;

    try {
        const shouldRandomize = isRandomSortRequested(extCtx);

        if (shouldRandomize) {
            // Extract original pagination values before modifying
            const { page, pageSize } = extractPagination(extCtx);

            // Store for use after response
            extCtx.state._randomSortRequestedPage = page;
            extCtx.state._randomSortRequestedPageSize = pageSize;

            // Clean URL query string
            cleanUrlQueryString(extCtx);

            // Request all records (large pageSize to get everything)
            const query = extCtx.query as Record<string, unknown>;
            query.pagination = {
                pageSize: 100000,
                page: 1,
            };
        }

        await next();

        // Apply random sorting and pagination to response
        const body = extCtx.body as StrapiResponseBody | undefined;
        if (shouldRandomize && body?.data) {
            const page = extCtx.state._randomSortRequestedPage ?? 1;
            const pageSize = extCtx.state._randomSortRequestedPageSize ?? 10;
            applyRandomPagination(extCtx, page, pageSize);
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[random-sort] Middleware error:', error);
        // Continue with request even if randomization fails
        if (!ctx.body) {
            await next();
        }
    }
};

export default randomMiddleware;
