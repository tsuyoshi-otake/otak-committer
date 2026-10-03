/**
 * Bounded page-by-page collection for GitHub list endpoints.
 */

/**
 * Items requested per page (the GitHub REST maximum).
 */
export const GITHUB_PAGE_SIZE = 100;

/**
 * Upper bound on pages fetched for one list, so a huge repository costs at
 * most this many sequential requests (1,000 items at the default page size).
 */
export const GITHUB_MAX_LIST_PAGES = 10;

/**
 * Most changed files GitHub's compare endpoint returns for a comparison; the
 * endpoint cannot page beyond this.
 */
export const GITHUB_COMPARE_FILE_LIMIT = 300;

/**
 * Result of a bounded page walk.
 */
export interface CollectedPages<T> {
    items: T[];
    /** True when the page limit was reached on a full page, so more items may exist */
    truncated: boolean;
}

/**
 * Fetch pages sequentially until a short page or the page limit.
 *
 * @param fetchPage - Fetches one 1-based page; errors propagate unchanged
 * @param pageSize - Items requested per page
 * @param maxPages - Most pages to fetch
 * @returns The collected items and whether the walk stopped at the limit
 */
export async function collectPages<T>(
    fetchPage: (page: number) => Promise<T[]>,
    pageSize: number = GITHUB_PAGE_SIZE,
    maxPages: number = GITHUB_MAX_LIST_PAGES,
): Promise<CollectedPages<T>> {
    const items: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const batch = await fetchPage(page);
        items.push(...batch);
        if (batch.length < pageSize) {
            return { items, truncated: false };
        }
    }
    return { items, truncated: true };
}
