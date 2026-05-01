export interface BenchmarkStats {
    comparisons: number;
    swaps: number;
    timeMs: number;
    progress: number;
}

export type ProgressCallback = (stats: BenchmarkStats) => void;

const yieldThread = () => new Promise(resolve => setTimeout(resolve, 0));

export async function runBenchmarkAsync(
    algo: string,
    originalArray: number[],
    onProgress: ProgressCallback
): Promise<BenchmarkStats> {
    const array = [...originalArray];
    let comparisons = 0;
    let swaps = 0;
    const t0 = performance.now();

    let operationsSinceYield = 0;
    const YIELD_THRESHOLD = 20000; // Yield every 20,000 operations to keep UI extremely responsive

    const checkYield = async (progress: number) => {
        onProgress({ comparisons, swaps, timeMs: performance.now() - t0, progress });
        await yieldThread();
        operationsSinceYield = 0;
    };

    const len = array.length;

    try {
        if (algo === "bubble") {
            for (let i = 0; i < len - 1; i++) {
                let swapped = false;
                for (let j = 0; j < len - i - 1; j++) {
                    comparisons++;
                    if (array[j] > array[j + 1]) {
                        const temp = array[j];
                        array[j] = array[j + 1];
                        array[j + 1] = temp;
                        swaps++;
                        swapped = true;
                    }
                    operationsSinceYield++;
                    if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield(i / len);
                }
                if (!swapped) break;
            }

        } else if (algo === "selection") {
            for (let i = 0; i < len - 1; i++) {
                let minIdx = i;
                for (let j = i + 1; j < len; j++) {
                    comparisons++;
                    if (array[j] < array[minIdx]) minIdx = j;
                    operationsSinceYield++;
                    if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield(i / len);
                }
                if (minIdx !== i) {
                    const temp = array[i];
                    array[i] = array[minIdx];
                    array[minIdx] = temp;
                    swaps++;
                }
            }

        } else if (algo === "insertion") {
            for (let i = 1; i < len; i++) {
                const key = array[i];
                let j = i - 1;
                while (j >= 0) {
                    comparisons++;
                    if (array[j] > key) {
                        array[j + 1] = array[j];
                        swaps++;
                        j--;
                        operationsSinceYield++;
                        if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield(i / len);
                    } else {
                        operationsSinceYield++;
                        break;
                    }
                }
                array[j + 1] = key;
            }

        } else if (algo === "merge") {
            const merge = async (start: number, mid: number, end: number) => {
                const left = array.slice(start, mid + 1);
                const right = array.slice(mid + 1, end + 1);
                let i = 0, j = 0, k = start;
                while (i < left.length && j < right.length) {
                    comparisons++;
                    if (left[i] <= right[j]) {
                        array[k++] = left[i++];
                    } else {
                        array[k++] = right[j++];
                        swaps++;
                    }
                    operationsSinceYield++;
                    if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield((start + k) / (2 * len));
                }
                while (i < left.length) {
                    array[k++] = left[i++];
                    operationsSinceYield++;
                    if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield((start + k) / (2 * len));
                }
                while (j < right.length) {
                    array[k++] = right[j++];
                    operationsSinceYield++;
                    if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield((start + k) / (2 * len));
                }
            };
            const mergeSortAsync = async (start: number, end: number) => {
                if (start >= end) return;
                const mid = Math.floor((start + end) / 2);
                await mergeSortAsync(start, mid);
                await mergeSortAsync(mid + 1, end);
                await merge(start, mid, end);
            };
            await mergeSortAsync(0, len - 1);

        } else if (algo === "quick") {
            const partition = async (low: number, high: number) => {
                const pivot = array[high];
                let i = low - 1;
                for (let j = low; j < high; j++) {
                    comparisons++;
                    if (array[j] < pivot) {
                        i++;
                        const t = array[i];
                        array[i] = array[j];
                        array[j] = t;
                        swaps++;
                    }
                    operationsSinceYield++;
                    if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield(j / len);
                }
                const t = array[i + 1];
                array[i + 1] = array[high];
                array[high] = t;
                swaps++;
                return i + 1;
            };
            const quickSortAsync = async (low: number, high: number) => {
                if (low < high) {
                    const pi = await partition(low, high);
                    await quickSortAsync(low, pi - 1);
                    await quickSortAsync(pi + 1, high);
                }
            };
            await quickSortAsync(0, len - 1);

        } else if (algo === "heap") {
            const heapify = async (n: number, i: number) => {
                let largest = i;
                const l = 2 * i + 1;
                const r = 2 * i + 2;

                if (l < n) {
                    comparisons++;
                    if (array[l] > array[largest]) largest = l;
                }
                if (r < n) {
                    comparisons++;
                    if (array[r] > array[largest]) largest = r;
                }
                if (largest !== i) {
                    const t = array[i];
                    array[i] = array[largest];
                    array[largest] = t;
                    swaps++;
                    operationsSinceYield++;
                    if (operationsSinceYield >= YIELD_THRESHOLD) await checkYield(i / len);
                    await heapify(n, largest);
                }
            };
            for (let i = Math.floor(len / 2) - 1; i >= 0; i--) {
                await heapify(len, i);
            }
            for (let i = len - 1; i > 0; i--) {
                const t = array[0];
                array[0] = array[i];
                array[i] = t;
                swaps++;
                await heapify(i, 0);
            }
        }
    } catch (e) {
        console.error("Benchmark error", e);
    }

    const finalTime = performance.now() - t0;
    const finalStats = { comparisons, swaps, timeMs: Number(finalTime.toFixed(2)), progress: 1 };
    onProgress(finalStats);
    return finalStats;
}
