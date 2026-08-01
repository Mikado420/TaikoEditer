import React, { useEffect, useMemo, useState } from 'react';
import {
  ChartEvent,
  Note,
  NoteType,
  SnapValue,
  TaikoChart,
  ZoomValue,
} from './types/chart';
import { calculateMeasures } from './utils/timeMath';
import { exportToTja } from './parser/tjaExporter';
import { audioEngine } from './audio/audioEngine';
import {
  deleteChartFromDb,
  getAllChartsFromDb,
  saveChartToDb,
} from './storage/db';
import { initAutoSave, triggerSave } from './storage/autoSave';
import { createBlankChart, SAMPLE_CHARTS } from './utils/sampleCharts';

import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { UnifiedEditorCanvas } from './components/UnifiedEditorCanvas';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { PortraitGuard } from './components/PortraitGuard';

import { ProjectModal } from './components/Modals/ProjectModal';
import { EventEditModal } from './components/Modals/EventEditModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { TutorialModal } from './components/Modals/TutorialModal';
import { TjaSourceModal } from './components/TjaSourceModal';
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

  // Layout Drawers (Default CLOSED for maximum editing space)
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(false);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(false);

  // AutoSave & PWA
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [newSwWorker, setNewSwWorker] = useState<ServiceWorker | null>(null);

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState<boolean>(false);
  const [eventModalOpen, setEventModalOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [tutorialModalOpen, setTutorialModalOpen] = useState<boolean>(false);
  const [tjaModalOpen, setTjaModalOpen] = useState<boolean>(false);

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

  // Screen Wake Lock
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {
        // Ignore wake lock failure
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

  // Recalculate Measure Map
  const measures = useMemo(() => {
    return calculateMeasures(chart.header, chart.events, 64);
  }, [chart.header, chart.events]);

  // Push new state to history stack
  const updateChartWithHistory = (newChart: TaikoChart) => {
    setChart(newChart);
    triggerSave(newChart);

    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(newChart);
    if (newHistory.length > 100) newHistory.shift();
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      setChart(prev);
      triggerSave(prev);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      setChart(next);
      triggerSave(next);
    }
  };

  // Playback Controls
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
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeekTime = (t: number) => {
    setCurrentTime(t);
    if (isPlaying) {
      audioEngine.play(t);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    audioEngine.setPlaybackRate(speed);
  };

  // File Import Handlers
  const handleLoadAudio = async (file: File) => {
    try {
      await audioEngine.loadAudioFile(file);
      setIsAudioLoaded(true);
      setAudioFileName(file.name);
      const peaks = audioEngine.getWaveformPeaks(30000);
      setAudioPeaks(peaks);
      setToastMessage({ text: `音源「${file.name}」を読み込みました！`, isError: false });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      setToastMessage({ text: `音源読込エラー: ${e.message}`, isError: true });
      setTimeout(() => setToastMessage(null), 4000);
    }
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
  const handleAddEvent = (newEv: ChartEvent) => {
    updateChartWithHistory({
      ...chart,
      events: [...chart.events, newEv],
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
      className="w-full h-[100dvh] max-h-[100dvh] bg-[#141414] text-white flex flex-col overflow-hidden select-none touch-none relative overscroll-none"
    >
      {/* Landscape Orientation Enforcement Guard */}
      <PortraitGuard />

      {/* 1. Top Compact Header */}
      <Header
        chart={chart}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onStop={handleStop}
        onOpenProjectModal={() => setProjectModalOpen(true)}
        onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
        onOpenTjaModal={() => setTjaModalOpen(true)}
        onImportFile={handleImportFile}
        onExportTja={handleExportTja}
        onLoadAudio={handleLoadAudio}
        isAudioLoaded={isAudioLoaded}
        audioFileName={audioFileName}
        pwaPrompt={pwaPrompt}
        onInstallPwa={handleInstallPwa}
        leftPanelOpen={leftPanelOpen}
        onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
      />

      {/* 2. Main Workstation Area: Single Unified Editing Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full h-full">
        <UnifiedEditorCanvas
          chart={chart}
          measures={measures}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onSeek={handleSeekTime}
          selectedNoteType={selectedNoteType}
          snap={snap}
          zoom={zoom}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onMoveNote={handleMoveNote}
          selectedNoteIds={selectedNoteIds}
          onSelectNotes={setSelectedNoteIds}
          audioPeaks={audioPeaks}
        />

        {/* Slide-over Drawers */}
        <LeftPanel
          isOpen={leftPanelOpen}
          onClose={() => setLeftPanelOpen(false)}
          events={chart.events}
          onJumpToEvent={handleJumpToEvent}
          onAddEventClick={() => setEventModalOpen(true)}
          onDeleteEvent={handleDeleteEvent}
        />

        <RightPanel
          isOpen={rightPanelOpen}
          onClose={() => setRightPanelOpen(false)}
          header={chart.header}
          onChangeHeader={(newHeader) =>
            updateChartWithHistory({ ...chart, header: newHeader })
          }
        />
      </main>

      {/* 4. Fixed Visual Note Selection Toolbar */}
      <Toolbar
        selectedNoteType={selectedNoteType}
        onSelectNoteType={setSelectedNoteType}
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
        onOpenLeftDrawer={() => setLeftPanelOpen(true)}
        onOpenRightDrawer={() => setRightPanelOpen(true)}
      />

      {/* 5. Minimal Status Bar */}
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

      <TjaSourceModal
        isOpen={tjaModalOpen}
        onClose={() => setTjaModalOpen(false)}
        chart={chart}
        onApplyTja={(newChart) => updateChartWithHistory(newChart)}
        currentMeasureIndex={Math.max(
          0,
          measures.findIndex(
            (m) =>
              currentTime >= m.timeSeconds &&
              currentTime < m.timeSeconds + m.durationSeconds
          )
        )}
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
          className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-2xl border flex items-center gap-2 text-xs font-bold animate-bounce ${
            toastMessage.isError
              ? 'bg-rose-900/90 border-rose-500 text-rose-100'
              : 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
          }`}
        >
          {toastMessage.isError ? (
            <AlertTriangle size={16} className="text-rose-300 shrink-0" />
          ) : (
            <CheckCircle size={16} className="text-emerald-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
