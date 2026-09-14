/**
 * Degree-of-success helpers, both verified live.
 */

/**
 * "When you roll this save, improve the degree of success by one."
 *
 * A critical failure becomes a failure, a failure a success, and a success a
 * critical success. Elusive, Ironhide and Sovereign Mind each say this for one
 * save.
 *
 * @param {string} save "fortitude", "reflex" or "will".
 */
export const improveSave = (save) => ({
    key: "AdjustDegreeOfSuccess",
    selector: save,
    adjustment: {
        criticalFailure: "one-degree-better",
        failure: "one-degree-better",
        success: "one-degree-better",
    },
});

/** `check:total:natural:N` options for every N in the inclusive range, as one predicate term. */
export function naturals(from, to) {
    const values = [];
    for (let n = from; n <= to; n++) values.push(`check:total:natural:${n}`);
    return values.length === 1 ? values[0] : { or: values };
}
