import { createSignal, type Child } from "@kyneticweb/dom";
import { cx } from "./classes.js";

/** One column of a {@link Table}. */
export interface TableColumn<T> {
    /** Property name or stable identifier. */
    readonly key: string;
    readonly header: string;
    /** Custom cell renderer. Defaults to `String(row[key])`. */
    readonly cell?: (row: T, index: number) => Child;
    readonly align?: "start" | "center" | "end";
    readonly width?: string;
    readonly sortable?: boolean;
    /** Custom comparator used while sorting this column. */
    readonly compare?: (left: T, right: T) => number;
}

/** Props accepted by {@link Table}. */
export interface TableProps<T> {
    readonly columns: readonly TableColumn<T>[];
    /** Rows, or an accessor for reactive data. */
    readonly rows: readonly T[] | (() => readonly T[]);
    readonly rowKey?: (row: T, index: number) => string | number;
    /** Rendered when there are no rows. Defaults to "No data". */
    readonly empty?: Child;
    readonly onRowClick?: (row: T) => void;
    readonly striped?: boolean;
    readonly compact?: boolean;
    readonly caption?: string;
    readonly class?: string;
}

/**
 * Data table with optional client-side sorting.
 *
 * Columns marked `sortable` toggle ascending/descending on click. The body is
 * reactive: pass a signal accessor as `rows` to update it in place.
 *
 * @example
 * ```tsx
 * <Table
 *     columns={[
 *         { key: "name", header: "Name", sortable: true },
 *         { key: "role", header: "Role" },
 *     ]}
 *     rows={people}
 * />
 * ```
 */
export function Table<T>(props: TableProps<T>): Child {
    const sortKey = createSignal<string | null>(null);
    const sortDirection = createSignal<1 | -1>(1);

    const source = (): readonly T[] => (typeof props.rows === "function" ? props.rows() : props.rows);

    const sorted = (): readonly T[] => {
        const key = sortKey();
        if (key === null) {
            return source();
        }
        const column = props.columns.find((candidate) => candidate.key === key);
        if (column === undefined) {
            return source();
        }
        const direction = sortDirection();
        return [...source()].sort(
            (left, right) =>
                (column.compare === undefined
                    ? defaultCompare(valueAt(left, key), valueAt(right, key))
                    : column.compare(left, right)) * direction,
        );
    };

    const toggleSort = (key: string): void => {
        if (sortKey() === key) {
            sortDirection.update((direction) => (direction === 1 ? -1 : 1));
        } else {
            sortKey.set(key);
            sortDirection.set(1);
        }
    };

    const ariaSort = (key: string): "ascending" | "descending" | "none" => {
        if (sortKey() !== key) {
            return "none";
        }
        return sortDirection() === 1 ? "ascending" : "descending";
    };

    const sortIcon = (key: string): string => {
        if (sortKey() !== key) {
            return "↕";
        }
        return sortDirection() === 1 ? "↑" : "↓";
    };

    return (
        <div class={cx("kyn-table__wrapper", props.class)}>
            <table
                class={cx("kyn-table", props.striped === true && "is-striped", props.compact === true && "is-compact")}
            >
                {props.caption !== undefined ? <caption class="kyn-table__caption">{props.caption}</caption> : null}
                <thead>
                    <tr>
                        {props.columns.map((column) => (
                            <th
                                scope="col"
                                class={cx("kyn-table__th", `is-${column.align ?? "start"}`)}
                                style={column.width === undefined ? undefined : { width: column.width }}
                                aria-sort={column.sortable === true ? () => ariaSort(column.key) : undefined}
                            >
                                {column.sortable === true ? (
                                    <button
                                        type="button"
                                        class="kyn-table__sort"
                                        onClick={() => toggleSort(column.key)}
                                    >
                                        {column.header}
                                        <span class="kyn-table__sort-icon" aria-hidden="true">
                                            {(): string => sortIcon(column.key)}
                                        </span>
                                    </button>
                                ) : (
                                    column.header
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {(): Child => {
                        const rows = sorted();
                        if (rows.length === 0) {
                            return (
                                <tr>
                                    <td class="kyn-table__empty" colSpan={props.columns.length}>
                                        {props.empty ?? "No data"}
                                    </td>
                                </tr>
                            );
                        }
                        return rows.map((row, index) => (
                            <tr
                                class={props.onRowClick === undefined ? undefined : "is-clickable"}
                                onClick={props.onRowClick === undefined ? undefined : () => props.onRowClick?.(row)}
                            >
                                {props.columns.map((column) => (
                                    <td class={cx("kyn-table__td", `is-${column.align ?? "start"}`)}>
                                        {column.cell === undefined
                                            ? String(valueAt(row, column.key) ?? "")
                                            : column.cell(row, index)}
                                    </td>
                                ))}
                            </tr>
                        ));
                    }}
                </tbody>
            </table>
        </div>
    );
}

/** Reads a column value from a row. */
function valueAt(row: unknown, key: string): unknown {
    if (typeof row !== "object" || row === null) {
        return undefined;
    }
    return (row as Record<string, unknown>)[key];
}

/** Default comparator: text with numeric awareness. */
function defaultCompare(left: unknown, right: unknown): number {
    return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}
