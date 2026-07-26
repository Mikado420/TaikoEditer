import React, { useEffect, useMemo, useState } from 'react';
import {
  ChartEvent,
  ChartHeader,
  Note,
  NoteType,
  SnapValue,
  TaikoChart,
  ZoomValue,
} from './types/chart';
import { calculateMeasures } from './utils/timeMath';
import { parseTja } from './parser/tjaParser';
import { exportToTja } from './parser/tjaExporter';
import { audioEngine } from './audio/audioEngine';
import {
  deleteChartFromDb,
  getAllChartsFromDb,
  loadChartFromDb,
  saveChartToDb,
} from './storage/db';
import { initAutoSave, triggerSave } from './storage/autoSave';
import { createBlankChart, SAMPLE_CHARTS } from './utils/sampleCharts';

import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { CentralCanvas } from './components/CentralCanvas';
import { TimelineCanvas } from './components/Timeline/TimelineCanvas';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';

import { ProjectModal } from './components/Modals/ProjectModal';
import { EventEditModal } from './components/Modals/EventEditModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { TutorialModal } from './components/Modals/TutorialModal';
import { UpdateBanner } from './components/PWA/UpdateBanner';

import { processImportedFile } from './utils/fileImporter';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';

export default function App() {
  // Chart State
  const [chart, setChart] = useState<TaikoChart>(SAMPLE_CHARTS[0]);

  // Toast / File Dragging State
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Undo / Redo History Stack (up to 100 history items)
  const [history, setHistory] = useState<TaikoChart[]>([SAMPLE_CHARTS[0]]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // Saved Charts from IndexedDB
  const [dbCharts, setDbCharts] = useState<TaikoChart[]>([]);

  // Editor UI State
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType>(1);
  const [activeTool, setActiveTool] = useState<'place' | 'select' | 'delete'>('place');
  const [snap, setSnap] = useState<SnapValue>(16);
  const [zoom, setZoom] = useState<ZoomValue>(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Playback & Audio State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isAudioLoaded, setIsAudioLoaded] = useState<boolean>(false);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [audioPeaks, setAudioPeaks] = useState<Float32Array | null>(null);

  // Selection
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Layout Panels
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);

  // AutoSave & PWA
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [newSwWorker, setNewSwWorker] = useState<ServiceWorker | null>(null);

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState<boolean>(false);
  const [eventModalOpen, setEventModalOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [tutorialModalOpen, setTutorialModalOpen] = useState<boolean>(false);

  // First-time tutorial check
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('taiko_editor_tutorial_seen');
    if (!hasSeenTutorial) {
      setTutorialModalOpen(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    localStorage.setItem('taiko_editor_tutorial_seen', 'true');
    setTutorialModalOpen(false);
  };

  // Screen Wake Lock while editing/playing
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {
        // Ignore if wakeLock fails or permission denied
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // SW Update Listener
  useEffect(() => {
    const handleSwUpdate = (e: any) => {
      if (e.detail) {
        setNewSwWorker(e.detail);
      }
    };
    window.addEventListener('swUpdateAvailable', handleSwUpdate);
    return () => window.removeEventListener('swUpdateAvailable', handleSwUpdate);
  }, []);

  // Load IndexedDB charts on boot
  useEffect(() => {
    getAllChartsFromDb().then((charts) => {
      setDbCharts(charts);
      if (charts.length > 0) {
        setChart(charts[0]);
        setHistory([charts[0]]);
        setHistoryIdx(0);
      }
    });

    // PWA Install prompt listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Initialize AutoSave
  useEffect(() => {
    initAutoSave(
      () => chart,
      (status) => setAutoSaveStatus(status)
    );
  }, [chart]);

  // Subscribe to Audio Engine Time Updates
  useEffect(() => {
    const unsub = audioEngine.subscribeTimeUpdate((t) => {
      setCurrentTime(t);
    });
    return unsub;
  }, []);

  // Recalculate Measure Map whenever Chart Header or Events change
  const measures = useMemo(() => {
    return calculateMeasures(chart.header, chart.events, 64);
  }, [chart.header, chart.events]);

  // Push new state to history stack
  const updateChartWithHistory = (newChart: TaikoChart) => {
    setChart(newChart);
    triggerSave(newChart);

    // Slice redo history if we made a new action
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(newChart);
    if (newHistory.length > 100) newHistory.shift();

    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setChart(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setChart(history[nextIdx]);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // ignore typing in inputs
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          const newNotes = chart.notes.filter((n) => !selectedNoteIds.includes(n.id));
          updateChartWithHistory({ ...chart, notes: newNotes });
          setSelectedNoteIds([]);
        }
      } else if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.code === 'KeyY') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedNoteIds, chart, historyIdx, history]);

  // Audio & Playback Handlers
  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play(currentTime);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioEngine.pause();
    setIsPlaying(false);
    audioEngine.seek(0);
    setCurrentTime(0);
  };

  const handleSeekTime = (seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    audioEngine.setSpeed(speed);
  };

  // File Import / Export Handlers
  const handleLoadAudio = async (file: File) => {
    setAudioFileName(file.name);
    const duration = await audioEngine.loadAudioFile(file);
    setIsAudioLoaded(true);
    setAudioPeaks(audioEngine.getPeaks());
    // Update header wave name
    updateChartWithHistory({
      ...chart,
      header: { ...chart.header, wave: file.name },
    });
  };

  const handleImportFile = async (file: File) => {
    const result = await processImportedFile(file);

    if (result.error) {
      setToastMessage({ text: result.error, isError: true });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    if (result.chart) {
      updateChartWithHistory(result.chart);
      saveChartToDb(result.chart);
      getAllChartsFromDb().then(setDbCharts);
    }

    if (result.audioFile) {
      await handleLoadAudio(result.audioFile);
    }

    const message =
      result.chart && result.audioFile
        ? '譜面と音源を読み込みました！'
        : result.chart
        ? '譜面データを読み込みました！'
        : '音源ファイルを読み込みました！';

    setToastMessage({ text: message, isError: false });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportTja = () => {
    const tjaString = exportToTja(chart);
    const blob = new Blob([tjaString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chart.header.title || 'chart'}.tja`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.relatedTarget === null) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleImportFile(e.dataTransfer.files[0]);
    }
  };

  // Note Edits
  const handleAddNote = (newNote: Note) => {
    // Remove existing note at same position if any
    const filteredNotes = chart.notes.filter(
      (n) =>
        !(
          n.measureIndex === newNote.measureIndex &&
          Math.abs(n.positionInMeasure - newNote.positionInMeasure) < 0.001
        )
    );
    updateChartWithHistory({
      ...chart,
      notes: [...filteredNotes, newNote],
    });
  };

  const handleDeleteNote = (id: string) => {
    const newNotes = chart.notes.filter((n) => n.id !== id);
    updateChartWithHistory({ ...chart, notes: newNotes });
    setSelectedNoteIds((ids) => ids.filter((i) => i !== id));
  };

  const handleMoveNote = (id: string, newMeasure: number, newPos: number) => {
    const newNotes = chart.notes.map((n) => {
      if (n.id === id) {
        return {
          ...n,
          measureIndex: newMeasure,
          positionInMeasure: newPos,
        };
      }
      return n;
    });
    updateChartWithHistory({ ...chart, notes: newNotes });
  };

  // Event Edits
  const handleAddEvent = (ev: ChartEvent) => {
    updateChartWithHistory({
      ...chart,
      events: [...chart.events, ev],
    });
  };

  const handleDeleteEvent = (id: string) => {
    const newEvents = chart.events.filter((e) => e.id !== id);
    updateChartWithHistory({ ...chart, events: newEvents });
  };

  const handleJumpToEvent = (ev: ChartEvent) => {
    const time = measures[ev.measureIndex]?.timeSeconds || 0;
    handleSeekTime(time);
  };

  // PWA Install Action
  const handleInstallPwa = () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then(() => setPwaPrompt(null));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full h-[100dvh] max-h-[100dvh] bg-[#1B1B1B] text-white flex flex-col overflow-hidden select-none touch-none relative overscroll-none"
    >
      {/* 1. Top Header */}
      <Header
        chart={chart}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onStop={handleStop}
        onOpenProjectModal={() => setProjectModalOpen(true)}
        onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
        onImportFile={handleImportFile}
        onExportTja={handleExportTja}
        onLoadAudio={handleLoadAudio}
        isAudioLoaded={isAudioLoaded}
        audioFileName={audioFileName}
        pwaPrompt={pwaPrompt}
        onInstallPwa={handleInstallPwa}
      />

      {/* 2. Main Workstation Area (Left Panel | Central Preview | Right Panel) */}
      <main className="flex-1 flex overflow-hidden relative">
        <LeftPanel
          isOpen={leftPanelOpen}
          onToggleOpen={() => setLeftPanelOpen(!leftPanelOpen)}
          events={chart.events}
          onJumpToEvent={handleJumpToEvent}
          onAddEventClick={() => setEventModalOpen(true)}
          onDeleteEvent={handleDeleteEvent}
        />

        <CentralCanvas
          chart={chart}
          measures={measures}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />

        <RightPanel
          isOpen={rightPanelOpen}
          onToggleOpen={() => setRightPanelOpen(!rightPanelOpen)}
          header={chart.header}
          onChangeHeader={(newHeader) =>
            updateChartWithHistory({ ...chart, header: newHeader })
          }
        />
      </main>

      {/* 3. Bottom Timeline (35% height) */}
      <TimelineCanvas
        chart={chart}
        measures={measures}
        currentTime={currentTime}
        snap={snap}
        zoom={zoom}
        selectedNoteType={selectedNoteType}
        activeTool={activeTool}
        selectedNoteIds={selectedNoteIds}
        onSelectNotes={setSelectedNoteIds}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onMoveNote={handleMoveNote}
        onSeekTime={handleSeekTime}
        audioPeaks={audioPeaks}
      />

      {/* 4. Edit Toolbar (10% height) */}
      <Toolbar
        selectedNoteType={selectedNoteType}
        onSelectNoteType={setSelectedNoteType}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        canUndo={historyIdx > 0}
        canRedo={historyIdx < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        snap={snap}
        onChangeSnap={setSnap}
        zoom={zoom}
        onChangeZoom={setZoom}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={handleSpeedChange}
      />

      {/* 5. Status Bar */}
      <StatusBar
        currentTime={currentTime}
        measures={measures}
        snap={snap}
        zoom={zoom}
        selectedCount={selectedNoteIds.length}
        autoSaveStatus={autoSaveStatus}
      />

      {/* Modals */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        charts={dbCharts}
        currentChartId={chart.id}
        onSelectChart={(selected) => {
          setChart(selected);
          setHistory([selected]);
          setHistoryIdx(0);
        }}
        onCreateNewChart={() => {
          const newChart = createBlankChart();
          setChart(newChart);
          setHistory([newChart]);
          setHistoryIdx(0);
          saveChartToDb(newChart);
          getAllChartsFromDb().then(setDbCharts);
        }}
        onDeleteChart={(id) => {
          deleteChartFromDb(id).then(() => getAllChartsFromDb().then(setDbCharts));
        }}
      />

      <EventEditModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        currentMeasureIndex={Math.floor(currentTime / (measures[0]?.durationSeconds || 2))}
        currentPositionInMeasure={0}
        onSaveEvent={handleAddEvent}
      />

      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      <TutorialModal
        isOpen={tutorialModalOpen}
        onClose={handleCloseTutorial}
      />

      <UpdateBanner
        newWorker={newSwWorker}
        onDismiss={() => setNewSwWorker(null)}
      />

      {/* Drag & Drop File Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-[#FF5A36]/80 backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-none animate-fade-in border-4 border-dashed border-white m-2 rounded-2xl">
          <Upload size={64} className="animate-bounce mb-3" />
          <h2 className="text-xl font-bold">ファイルをドロップして読み込み</h2>
          <p className="text-sm opacity-90 mt-1">.tja / .zip / .ogg / .mp3 / .wav に対応しています</p>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-bounce ${
            toastMessage.isError
              ? 'bg-rose-900/90 border-rose-500 text-rose-100'
              : 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
          }`}
        >
          {toastMessage.isError ? (
            <AlertTriangle size={18} className="text-rose-300 shrink-0" />
          ) : (
            <CheckCircle size={18} className="text-emerald-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
