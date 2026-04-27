/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  Pause, 
  Settings2, 
  ChevronDown, 
  Zap, 
  BarChart3,
  Info
} from 'lucide-react';

// --- Types ---

type Algorithm = 'bubble' | 'selection' | 'insertion' | 'quick' | 'merge';

interface BarState {
  id: string;
  value: number;
  status: 'idle' | 'comparing' | 'swapping' | 'sorted' | 'pivot';
}

// --- Constants ---

const ALGORITHMS: { id: Algorithm; name: string; complexity: string }[] = [
  { id: 'bubble', name: 'Bubble Sort', complexity: 'O(n²)' },
  { id: 'selection', name: 'Selection Sort', complexity: 'O(n²)' },
  { id: 'insertion', name: 'Insertion Sort', complexity: 'O(n²)' },
  { id: 'quick', name: 'Quick Sort', complexity: 'O(n log n)' },
  { id: 'merge', name: 'Merge Sort', complexity: 'O(n log n)' },
];

export default function App() {
  const [array, setArray] = useState<BarState[]>([]);
  const [arraySize, setArraySize] = useState(30);
  const [speed, setSpeed] = useState(50);
  const [algorithm, setAlgorithm] = useState<Algorithm>('bubble');
  const [isSorting, setIsSorting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStepMode, setIsStepMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  
  const isPausedRef = useRef(false);
  const stopSortingRef = useRef(false);
  const stepTriggerRef = useRef<(() => void) | null>(null);

  // --- Initialization ---

  const generateArray = useCallback((size: number = arraySize) => {
    const newArray: BarState[] = Array.from({ length: size }, () => ({
      id: Math.random().toString(36).substr(2, 9),
      value: Math.floor(Math.random() * 90) + 10,
      status: 'idle',
    }));
    setArray(newArray);
    setIsSorting(false);
    setIsPaused(false);
    isPausedRef.current = false;
    stopSortingRef.current = false;
  }, [arraySize]);

  useEffect(() => {
    generateArray();
  }, [generateArray]);

  // --- Helper Functions ---

  const sleep = (ms: number) => {
    // Adjust MS to be much slower at low speeds
    // Speed 1 -> ~2000ms, Speed 100 -> ~10ms
    const adjustedMs = Math.max(10, (101 - speed) * 20);

    return new Promise((resolve) => {
      const check = () => {
        if (stopSortingRef.current) {
          resolve(null);
          return;
        }

        if (isStepMode) {
          stepTriggerRef.current = () => resolve(null);
          return;
        }

        if (isPausedRef.current) {
          setTimeout(check, 100);
        } else {
          setTimeout(resolve, adjustedMs);
        }
      };
      check();
    });
  };

  const updateStatus = (indices: number[], status: BarState['status']) => {
    setArray((prev) => {
      const newArray = [...prev];
      indices.forEach((idx) => {
        if (newArray[idx]) newArray[idx] = { ...newArray[idx], status };
      });
      return newArray;
    });
  };

  const resetStatuses = () => {
    setArray((prev) => prev.map(item => ({ ...item, status: item.status === 'sorted' ? 'sorted' : 'idle' })));
  };

  // --- Sorting Algorithms ---

  const bubbleSort = async () => {
    const arr = [...array];
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (stopSortingRef.current) return;
        
        updateStatus([j, j + 1], 'comparing');
        await sleep(101 - speed);

        if (arr[j].value > arr[j + 1].value) {
          updateStatus([j, j + 1], 'swapping');
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          setArray([...arr]);
          await sleep(101 - speed);
        }
        updateStatus([j, j + 1], 'idle');
      }
      updateStatus([n - i - 1], 'sorted');
    }
  };

  const selectionSort = async () => {
    const arr = [...array];
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      let minIdx = i;
      updateStatus([i], 'pivot');
      for (let j = i + 1; j < n; j++) {
        if (stopSortingRef.current) return;
        updateStatus([j], 'comparing');
        await sleep(101 - speed);
        if (arr[j].value < arr[minIdx].value) {
          updateStatus([minIdx], 'idle');
          minIdx = j;
          updateStatus([minIdx], 'pivot');
        } else {
          updateStatus([j], 'idle');
        }
      }
      if (minIdx !== i) {
        updateStatus([i, minIdx], 'swapping');
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        setArray([...arr]);
        await sleep(101 - speed);
      }
      updateStatus([i], 'sorted');
      if (minIdx !== i) updateStatus([minIdx], 'idle');
    }
  };

  const insertionSort = async () => {
    const arr = [...array];
    const n = arr.length;
    updateStatus([0], 'sorted');
    for (let i = 1; i < n; i++) {
      let key = arr[i];
      let j = i - 1;
      updateStatus([i], 'comparing');
      await sleep(101 - speed);

      while (j >= 0 && arr[j].value > key.value) {
        if (stopSortingRef.current) return;
        updateStatus([j, j + 1], 'swapping');
        arr[j + 1] = arr[j];
        setArray([...arr]);
        await sleep(101 - speed);
        updateStatus([j + 1], 'sorted');
        j = j - 1;
      }
      arr[j + 1] = key;
      setArray([...arr]);
      updateStatus([j + 1], 'sorted');
    }
  };

  const quickSort = async () => {
    const arr = [...array];
    const sort = async (low: number, high: number) => {
      if (low < high) {
        const pivotIdx = await partition(low, high);
        await sort(low, pivotIdx - 1);
        await sort(pivotIdx + 1, high);
      } else if (low === high) {
        updateStatus([low], 'sorted');
      }
    };

    const partition = async (low: number, high: number) => {
      let pivot = arr[high].value;
      updateStatus([high], 'pivot');
      let i = low - 1;
      for (let j = low; j < high; j++) {
        if (stopSortingRef.current) return i + 1;
        updateStatus([j], 'comparing');
        await sleep(101 - speed);
        if (arr[j].value < pivot) {
          i++;
          updateStatus([i, j], 'swapping');
          [arr[i], arr[j]] = [arr[j], arr[i]];
          setArray([...arr]);
          await sleep(101 - speed);
          updateStatus([i, j], 'idle');
        } else {
          updateStatus([j], 'idle');
        }
      }
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
      setArray([...arr]);
      updateStatus([i + 1], 'sorted');
      updateStatus([high], 'idle');
      return i + 1;
    };

    await sort(0, arr.length - 1);
    setArray(arr.map(item => ({ ...item, status: 'sorted' })));
  };

  const mergeSort = async () => {
    const arr = [...array];
    const sort = async (l: number, r: number) => {
      if (l >= r) return;
      const m = l + Math.floor((r - l) / 2);
      await sort(l, m);
      await sort(m + 1, r);
      await merge(l, m, r);
    };

    const merge = async (l: number, m: number, r: number) => {
      const n1 = m - l + 1;
      const n2 = r - m;
      const L = arr.slice(l, m + 1);
      const R = arr.slice(m + 1, r + 1);

      let i = 0, j = 0, k = l;
      while (i < n1 && j < n2) {
        if (stopSortingRef.current) return;
        updateStatus([l + i, m + 1 + j], 'comparing');
        await sleep(101 - speed);
        if (L[i].value <= R[j].value) {
          arr[k] = L[i];
          i++;
        } else {
          arr[k] = R[j];
          j++;
        }
        setArray([...arr]);
        updateStatus([k], 'swapping');
        await sleep(101 - speed);
        updateStatus([k], 'idle');
        k++;
      }
      while (i < n1) {
        if (stopSortingRef.current) return;
        arr[k] = L[i];
        setArray([...arr]);
        updateStatus([k], 'swapping');
        await sleep(101 - speed);
        updateStatus([k], 'idle');
        i++; k++;
      }
      while (j < n2) {
        if (stopSortingRef.current) return;
        arr[k] = R[j];
        setArray([...arr]);
        updateStatus([k], 'swapping');
        await sleep(101 - speed);
        updateStatus([k], 'idle');
        j++; k++;
      }
      // Mark as sorted for visual feedback
      for (let x = l; x <= r; x++) updateStatus([x], 'sorted');
    };

    await sort(0, arr.length - 1);
  };

  // --- Controls ---

  const handleStart = async () => {
    if (isSorting && isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
      return;
    }

    setIsSorting(true);
    setIsPaused(false);
    isPausedRef.current = false;
    stopSortingRef.current = false;

    // Reset statuses to idle before starting
    setArray(prev => prev.map(item => ({ ...item, status: 'idle' })));

    switch (algorithm) {
      case 'bubble': await bubbleSort(); break;
      case 'selection': await selectionSort(); break;
      case 'insertion': await insertionSort(); break;
      case 'quick': await quickSort(); break;
      case 'merge': await mergeSort(); break;
    }

    if (!stopSortingRef.current) {
      setIsSorting(false);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  const handleNextStep = () => {
    if (stepTriggerRef.current) {
      const trigger = stepTriggerRef.current;
      stepTriggerRef.current = null;
      trigger();
    }
  };

  const handleReset = () => {
    stopSortingRef.current = true;
    generateArray();
  };

  const applyManualInput = () => {
    const values = manualInput
      .split(',')
      .map(v => v.trim())
      .filter(v => v !== '')
      .map(Number);

    if (values.some(isNaN)) {
      setInputError('Please enter valid numbers separated by commas.');
      return;
    }

    if (values.length < 2) {
      setInputError('Please enter at least 2 numbers.');
      return;
    }

    if (values.length > 100) {
      setInputError('Maximum 100 numbers allowed.');
      return;
    }

    if (values.some(v => v < 1 || v > 100)) {
      setInputError('Numbers must be between 1 and 100.');
      return;
    }

    const newArray: BarState[] = values.map(v => ({
      id: Math.random().toString(36).substr(2, 9),
      value: v,
      status: 'idle',
    }));

    stopSortingRef.current = true;
    setArray(newArray);
    setArraySize(values.length);
    setIsSorting(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setInputError(null);
  };

  // --- Render Helpers ---

  const getBarColor = (status: BarState['status']) => {
    switch (status) {
      case 'comparing': return 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]';
      case 'swapping': return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      case 'sorted': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
      case 'pivot': return 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]';
      default: return 'bg-slate-300 dark:bg-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BarChart3 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SortFlow</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Visualizer</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            {ALGORITHMS.map((algo) => (
              <button
                key={algo.id}
                onClick={() => !isSorting && setAlgorithm(algo.id)}
                disabled={isSorting}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  algorithm === algo.id
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {algo.name}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
          >
            <Settings2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Visualization Area */}
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8 h-[500px] flex items-end justify-center gap-1 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {array.map((bar) => (
              <motion.div
                key={bar.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: `${bar.value}%` }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 500, 
                  damping: 30,
                  opacity: { duration: 0.2 }
                }}
                className={`flex-1 rounded-t-sm md:rounded-t-lg transition-colors duration-200 ${getBarColor(bar.status)} flex items-start justify-center pt-2 overflow-hidden`}
                style={{ originY: 1 }}
              >
                {arraySize <= 40 && (
                  <span className="text-[10px] md:text-xs font-bold text-white drop-shadow-md select-none">
                    {bar.value}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Legend */}
          <div className="absolute top-6 left-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <div className="w-3 h-3 rounded-full bg-amber-400" /> Comparing
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <div className="w-3 h-3 rounded-full bg-rose-500" /> Swapping
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <div className="w-3 h-3 rounded-full bg-indigo-500" /> Pivot
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <div className="w-3 h-3 rounded-full bg-emerald-500" /> Sorted
            </div>
          </div>

          {/* Current Algo Info */}
          <div className="absolute top-6 right-6 text-right">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {ALGORITHMS.find(a => a.id === algorithm)?.name}
            </h2>
            <p className="text-sm text-indigo-500 font-mono font-bold">
              {ALGORITHMS.find(a => a.id === algorithm)?.complexity}
            </p>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Actions */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {!isSorting || isPaused ? (
                  <button
                    onClick={handleStart}
                    className="group relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>{isPaused ? 'Resume' : 'Start Sorting'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/25"
                  >
                    <Pause className="w-5 h-5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                {isSorting && isStepMode && (
                  <button
                    onClick={handleNextStep}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25 animate-pulse"
                  >
                    <ChevronDown className="w-5 h-5 rotate-270" />
                    <span>Next Step</span>
                  </button>
                )}
                
                <button
                  onClick={handleReset}
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl transition-all hover:rotate-180 duration-500"
                  title="Reset Array"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-6">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mr-2">Step Mode</label>
                  <button 
                    onClick={() => setIsStepMode(!isStepMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isStepMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isStepMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Speed</label>
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={speed}
                      onChange={(e) => setSpeed(parseInt(e.target.value))}
                      className="w-32 accent-indigo-600"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Size</label>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={arraySize}
                      disabled={isSorting}
                      onChange={(e) => setArraySize(parseInt(e.target.value))}
                      className="w-32 accent-indigo-600 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Input Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Custom Array Input</h3>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Comma separated (1-100)</span>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g. 45, 22, 89, 12, 67"
                    disabled={isSorting}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                  />
                  {inputError && (
                    <p className="absolute -bottom-5 left-0 text-[10px] text-rose-500 font-bold">{inputError}</p>
                  )}
                </div>
                <button
                  onClick={applyManualInput}
                  disabled={isSorting || !manualInput.trim()}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-6 flex items-start gap-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-1">Algorithm Tip</h3>
              <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                {algorithm === 'bubble' && "Bubble sort is simple but inefficient for large datasets. It repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order."}
                {algorithm === 'selection' && "Selection sort divides the input list into two parts: a sorted sublist and an unsorted sublist. It repeatedly finds the minimum element from the unsorted part and moves it to the sorted part."}
                {algorithm === 'insertion' && "Insertion sort builds the final sorted array one item at a time. It is much less efficient on large lists than more advanced algorithms such as quicksort or heapsort."}
                {algorithm === 'quick' && "Quicksort is a divide-and-conquer algorithm. It works by selecting a 'pivot' element and partitioning the other elements into two sub-arrays, according to whether they are less than or greater than the pivot."}
                {algorithm === 'merge' && "Merge sort is an efficient, stable, comparison-based, divide and conquer sorting algorithm. Most implementations produce a stable sort, meaning that the order of equal elements is the same in the input and output."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-8 z-[70] shadow-2xl border-t border-slate-200 dark:border-slate-800"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8" />
              <h2 className="text-2xl font-bold mb-6">Settings</h2>
              
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Algorithm</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALGORITHMS.map((algo) => (
                      <button
                        key={algo.id}
                        onClick={() => {
                          if (!isSorting) setAlgorithm(algo.id);
                        }}
                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                          algorithm === algo.id
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800'
                            : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        {algo.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Step-by-Step Mode</label>
                    <button 
                      onClick={() => setIsStepMode(!isStepMode)}
                      className={`w-14 h-7 rounded-full transition-colors relative ${isStepMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isStepMode ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Speed</label>
                    <span className="text-indigo-600 font-bold">{speed}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Array Size</label>
                    <span className="text-indigo-600 font-bold">{arraySize}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={arraySize}
                    disabled={isSorting}
                    onChange={(e) => setArraySize(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Custom Array Input</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="e.g. 10, 20, 30"
                      disabled={isSorting}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={applyManualInput}
                      disabled={isSorting || !manualInput.trim()}
                      className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {inputError && (
                    <p className="text-[10px] text-rose-500 font-bold">{inputError}</p>
                  )}
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold mt-4"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2026 SortFlow Visualizer. Built for learning algorithms.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-indigo-600 transition-colors">Documentation</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">GitHub</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
