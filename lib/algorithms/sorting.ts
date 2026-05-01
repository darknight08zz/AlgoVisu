
export interface SortElement {
  value: number
  id: number
  isComparing?: boolean
  isSwapping?: boolean
  isSorted?: boolean
  isPivot?: boolean
  isSelected?: boolean
}

export interface SortStep {
  array: SortElement[]
  description: string
  comparisons: number
  swaps: number
  comparing?: number[]
  swapping?: number[]
  pivot?: number
  codeLine?: number
  callStack?: { left: number; right: number }[]
}

// Helper to deep copy the array of objects to avoid reference issues in snapshots
const copy = (a: SortElement[]): SortElement[] => a.map(el => ({ ...el }))

export const bubbleSort = (arr: SortElement[]): SortStep[] => {
  const steps: SortStep[] = []
  const array = copy(arr)
  let comparisons = 0, swaps = 0

  for (let i = 0; i < array.length - 1; i++) {
    for (let j = 0; j < array.length - i - 1; j++) {
      comparisons++
      steps.push({ array: copy(array), description: `Comparing elements at positions ${j} and ${j + 1}`, comparisons, swaps, comparing: [j, j + 1], codeLine: 2 })

      if (array[j].value > array[j + 1].value) {
        ;[array[j], array[j + 1]] = [array[j + 1], array[j]]
        swaps++
        steps.push({ array: copy(array), description: `Swapped elements at positions ${j} and ${j + 1}`, comparisons, swaps, swapping: [j, j + 1], codeLine: 3 })
      }
    }
    array[array.length - 1 - i].isSorted = true
    steps.push({ array: copy(array), description: `Element at position ${array.length - 1 - i} is now in its final position`, comparisons, swaps, codeLine: 4 })
  }
  array[0].isSorted = true
  steps.push({ array: copy(array), description: "Sorting complete!", comparisons, swaps, codeLine: -1 })
  return steps
}

export const selectionSort = (arr: SortElement[]): SortStep[] => {
  const steps: SortStep[] = []
  const array = copy(arr)
  let comparisons = 0, swaps = 0

  for (let i = 0; i < array.length - 1; i++) {
    let minIndex = i
    steps.push({ array: copy(array), description: `Finding minimum element from position ${i} onwards`, comparisons, swaps, codeLine: 1 })

    for (let j = i + 1; j < array.length; j++) {
      comparisons++
      steps.push({ array: copy(array), description: `Comparing element at position ${j} with current minimum`, comparisons, swaps, comparing: [minIndex, j], codeLine: 3 })

      if (array[j].value < array[minIndex].value) {
        minIndex = j
        steps.push({ array: copy(array), description: `New minimum found at position ${j}`, comparisons, swaps, comparing: [minIndex], codeLine: 4 })
      }
    }

    if (minIndex !== i) {
      ;[array[i], array[minIndex]] = [array[minIndex], array[i]]
      swaps++
      steps.push({ array: copy(array), description: `Swapped minimum element to position ${i}`, comparisons, swaps, swapping: [i, minIndex], codeLine: 6 })
    }

    array[i].isSorted = true
    steps.push({ array: copy(array), description: `Element at position ${i} is now in its final position`, comparisons, swaps, codeLine: 7 })
  }
  array[array.length - 1].isSorted = true
  steps.push({ array: copy(array), description: "Sorting complete!", comparisons, swaps, codeLine: -1 })
  return steps
}

export const insertionSort = (arr: SortElement[]): SortStep[] => {
  const steps: SortStep[] = []
  const array = copy(arr)
  let comparisons = 0, swaps = 0

  array[0].isSorted = true
  steps.push({ array: copy(array), description: "First element is considered sorted", comparisons, swaps, codeLine: -1 })

  for (let i = 1; i < array.length; i++) {
    const key = array[i]
    let j = i - 1
    steps.push({ array: copy(array), description: `Inserting element ${key.value} into sorted portion`, comparisons, swaps, codeLine: 1 })

    while (j >= 0 && array[j].value > key.value) {
      comparisons++
      steps.push({ array: copy(array), description: `Comparing ${key.value} with ${array[j].value}`, comparisons, swaps, comparing: [j, i], codeLine: 3 })

      array[j + 1] = array[j]; swaps++; j--
      steps.push({ array: copy(array), description: `Shifted element to the right`, comparisons, swaps, codeLine: 4 })
    }

    array[j + 1] = key
    steps.push({ array: copy(array), description: `Inserted ${key.value} at position ${j + 1}`, comparisons, swaps, codeLine: 6 })

    for (let k = 0; k <= i; k++) array[k].isSorted = true
    steps.push({ array: copy(array), description: `Marked positions 0 to ${i} as sorted`, comparisons, swaps, codeLine: 7 })
  }
  steps.push({ array: copy(array), description: "Sorting complete!", comparisons, swaps, codeLine: -1 })
  return steps
}

export const mergeSort = (arr: SortElement[]): SortStep[] => {
  const steps: SortStep[] = []
  const array = copy(arr)
  let comparisons = 0, swaps = 0

  // Helper internal function
  const helper = (arrRef: SortElement[], start: number, end: number, idxs: number[], depth = 0): SortElement[] => {
    if (start >= end) return [arrRef[start]]

    const mid = Math.floor((start + end) / 2)
    const highlight = copy(array);
    highlight.forEach((el, i) => { if (i >= start && i <= end) el.isSelected = true })
    steps.push({ array: highlight, description: `Dividing subarray from index ${start} to ${end}`, comparisons, swaps, codeLine: depth === 0 ? 2 : 3 })

    const leftIdx = idxs.slice(0, mid - start + 1), rightIdx = idxs.slice(mid - start + 1)
    const left = helper(arrRef, start, mid, leftIdx, depth + 1)
    const right = helper(arrRef, mid + 1, end, rightIdx, depth + 1)

    const merged: SortElement[] = []; let i = 0, j = 0

    const toMerge = copy(array);
    for (let k = start; k <= end; k++) toMerge[k].isSelected = true
    steps.push({ array: toMerge, description: `Merging subarrays [${start}-${mid}] and [${mid + 1}-${end}]`, comparisons, swaps, codeLine: 5 })

    while (i < left.length && j < right.length) {
      comparisons++
      const cmpArr = copy(array); const li = idxs[i]; const rj = idxs[left.length + j]
      cmpArr[li].isComparing = true; cmpArr[rj].isComparing = true
      steps.push({ array: cmpArr, description: `Comparing ${left[i].value} and ${right[j].value}`, comparisons, swaps, comparing: [li, rj], codeLine: 10 })

      if (left[i].value <= right[j].value) {
        merged.push(left[i]); i++;
        steps.push({ array: copy(array), description: `Taking ${left[i - 1].value} from left array`, comparisons, swaps, codeLine: 11 })
      } else {
        merged.push(right[j]); j++;
        steps.push({ array: copy(array), description: `Taking ${right[j - 1].value} from right array`, comparisons, swaps, codeLine: 14 })
      }
    }

    while (i < left.length) { merged.push(left[i++]) }
    while (j < right.length) { merged.push(right[j++]) }

    // Update the main array
    for (let k = 0; k < merged.length; k++) {
      const oi = idxs[k];
      array[oi] = { ...merged[k] }
    }

    const mergedArr = copy(array);
    for (let k = start; k <= end; k++) mergedArr[k].isSorted = true
    steps.push({ array: mergedArr, description: `Merged subarray from index ${start} to ${end}`, comparisons, swaps, codeLine: 16 })

    return merged
  }

  const idxs = arr.map((_, i) => i)
  helper(arr, 0, arr.length - 1, idxs)

  const final = copy(array);
  final.forEach(e => (e.isSorted = true))
  steps.push({ array: final, description: "Sorting complete!", comparisons, swaps, codeLine: -1 })

  return steps
}

export const quickSort = (arr: SortElement[]): SortStep[] => {
  const steps: SortStep[] = []
  const array = copy(arr)
  let comparisons = 0, swaps = 0
  const activeStack: { left: number, right: number }[] = []

  const qs = (l: number, h: number, d = 0) => {
    if (l < h) {
      activeStack.push({ left: l, right: h })
      const p = part(l, h)
      array[p].isSorted = true
      steps.push({ array: copy(array), description: `Pivot ${array[p].value} is now in its final position`, comparisons, swaps, pivot: p, codeLine: 2, callStack: [...activeStack] })
      qs(l, p - 1, d + 1); qs(p + 1, h, d + 1)
      activeStack.pop()
    }
  }

  const part = (l: number, h: number) => {
    const pivot = array[h]; let i = l - 1
    const pv = copy(array); pv[h].isPivot = true
    steps.push({ array: pv, description: `Selecting pivot: ${pivot.value} at index ${h}`, comparisons, swaps, pivot: h, codeLine: 7, callStack: [...activeStack] })

    for (let j = l; j < h; j++) {
      comparisons++
      const cmp = copy(array); cmp[j].isComparing = true; cmp[h].isPivot = true
      steps.push({ array: cmp, description: `Comparing ${array[j].value} with pivot ${pivot.value}`, comparisons, swaps, comparing: [j], pivot: h, codeLine: 9, callStack: [...activeStack] })

      if (array[j].value <= pivot.value) {
        i++;
        if (i !== j) {
          [array[i], array[j]] = [array[j], array[i]]; swaps++
          const sw = copy(array); sw[i].isSwapping = true; sw[j].isSwapping = true; sw[h].isPivot = true
          steps.push({ array: sw, description: `Swapped ${array[i].value} and ${array[j].value}`, comparisons, swaps, swapping: [i, j], pivot: h, codeLine: 12, callStack: [...activeStack] })
        }
      }
    }

    ;[array[i + 1], array[h]] = [array[h], array[i + 1]]; swaps++
    const fs = copy(array); fs[i + 1].isSwapping = true; fs[h].isSwapping = true
    steps.push({ array: fs, description: `Placed pivot ${pivot.value} at its final position ${i + 1}`, comparisons, swaps, swapping: [i + 1, h], codeLine: 13, callStack: [...activeStack] })

    return i + 1
  }

  qs(0, array.length - 1)
  array.forEach(e => (e.isSorted = true))
  steps.push({ array: copy(array), description: "Sorting complete!", comparisons, swaps, codeLine: -1, callStack: [] })

  return steps
}

export const heapSort = (arr: SortElement[]): SortStep[] => {
  const steps: SortStep[] = []
  const array = copy(arr)
  let comparisons = 0, swaps = 0

  const heapify = (n: number, i: number) => {
    let largest = i, l = 2 * i + 1, r = 2 * i + 2

    if (l < n) {
      comparisons++
      const cmp = copy(array); cmp[i].isComparing = true; cmp[l].isComparing = true
      steps.push({ array: cmp, description: `Comparing parent ${array[i].value} with left child ${array[l].value}`, comparisons, swaps, comparing: [i, l], codeLine: 12 })
      if (array[l].value > array[largest].value) {
        largest = l;
        steps.push({ array: copy(array), description: `Left child is larger`, comparisons, swaps, codeLine: 13 })
      }
    }

    if (r < n) {
      comparisons++
      const cmp2 = copy(array); cmp2[largest].isComparing = true; cmp2[r].isComparing = true
      steps.push({ array: cmp2, description: `Comparing ${array[largest].value} with right child ${array[r].value}`, comparisons, swaps, comparing: [largest, r], codeLine: 14 })
      if (array[r].value > array[largest].value) {
        largest = r;
        steps.push({ array: copy(array), description: `Right child is larger`, comparisons, swaps, codeLine: 15 })
      }
    }

    if (largest !== i) {
      ;[array[i], array[largest]] = [array[largest], array[i]]; swaps++
      const sw = copy(array); sw[i].isSwapping = true; sw[largest].isSwapping = true
      steps.push({ array: sw, description: `Swapped ${array[i].value} and ${array[largest].value} to maintain heap property`, comparisons, swaps, swapping: [i, largest], codeLine: 17 })
      heapify(n, largest)
    }
  }

  const n = array.length

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    const step = copy(array); step[i].isSelected = true
    steps.push({ array: step, description: `Building heap: processing node ${array[i].value} at index ${i}`, comparisons, swaps, codeLine: 3 })
    heapify(n, i)
  }

  for (let i = n - 1; i > 0; i--) {
    ;[array[0], array[i]] = [array[i], array[0]]; swaps++
    const ex = copy(array); ex[0].isSwapping = true; ex[i].isSwapping = true; ex[i].isSorted = true
    steps.push({ array: ex, description: `Extracted max element ${array[i].value} to position ${i}`, comparisons, swaps, swapping: [0, i], codeLine: 5 })
    heapify(i, 0)
  }

  array[0].isSorted = true
  steps.push({ array: copy(array), description: "Sorting complete!", comparisons, swaps, codeLine: -1 })

  return steps
}
