export interface Row {
    readonly id: number;
    readonly label: string;
}

export const DATA: readonly Row[] = Array.from({ length: 1000 }, (_, id) => ({
    id,
    label: `row ${id}`,
}));

export const UPDATED: readonly Row[] = DATA.map((row) =>
    row.id % 10 === 0 ? { ...row, label: `updated ${row.id}` } : row,
);

export const ONE: readonly Row[] = DATA.map((row) => (row.id === 500 ? { ...row, label: "one updated" } : row));

export const REPLACED: readonly Row[] = DATA.map((row) => ({ ...row, label: `copy ${row.id}` }));

export const SWAPPED: readonly Row[] = [...DATA].reverse();

export const REMOVED: readonly Row[] = DATA.filter((row) => row.id !== 500);
