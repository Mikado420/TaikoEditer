import React from 'react';
import {
  X,
  Plus,
  Folder,
  Trash2,
  FileText,
  Sparkles,
  Download,
  Upload,
} from 'lucide-react';
import { TaikoChart } from '../../types/chart';
import { SAMPLE_CHARTS } from '../../utils/sampleCharts';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  charts: TaikoChart[];
  currentChartId: string;
  onSelectChart: (chart: TaikoChart) => void;
  onCreateNewChart: () => void;
  onDeleteChart: (id: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  charts,
  currentChartId,
  onSelectChart,
  onCreateNewChart,
  onDeleteChart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1C1C1C] border border-[#3A3A3A] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#242424] border-b border-[#3A3A3A] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-200 text-sm">
            <Folder size={16} className="text-[#FF5A36]" />
            <span>譜面プロジェクト管理</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#333333] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          {/* Create New Button */}
          <button
            onClick={() => {
              onCreateNewChart();
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-[#FF5A36] hover:bg-[#ff6f4f] text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow transition active:scale-98"
          >
            <Plus size={16} />
            <span>新規譜面を作成</span>
          </button>

          {/* User Saved Charts */}
          <div>
            <h4 className="text-[10px] uppercase font-semibold text-gray-400 mb-2">
              保存済みローカル譜面 ({charts.length})
            </h4>

            {charts.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-[#161616] rounded-lg border border-[#2D2D2D]">
                保存されたローカル譜面はありません
              </div>
            ) : (
              <div className="space-y-1.5">
                {charts.map((chart) => {
                  const isActive = chart.id === currentChartId;
                  return (
                    <div
                      key={chart.id}
                      onClick={() => {
                        onSelectChart(chart);
                        onClose();
                      }}
                      className={`p-2.5 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#2A2A2A] border-[#FF5A36] text-white ring-1 ring-[#FF5A36]/50'
                          : 'bg-[#222222] hover:bg-[#282828] border-[#303030] text-gray-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-sm truncate">
                          {chart.header.title || '無題の譜面'}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>難易度: {chart.header.course}</span>
                          <span>•</span>
                          <span>BPM: {chart.header.bpm}</span>
                          <span>•</span>
                          <span>ノーツ数: {chart.notes.length}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`「${chart.header.title}」を削除しますか？`)) {
                            onDeleteChart(chart.id);
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition shrink-0"
                        title="削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Built-in Sample Charts */}
          <div>
            <h4 className="text-[10px] uppercase font-semibold text-gray-400 mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" />
              <span>サンプル譜面 (動作確認用)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_CHARTS.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => {
                    onSelectChart(sample);
                    onClose();
                  }}
                  className="p-2.5 bg-[#222222] hover:bg-[#282828] border border-[#303030] hover:border-[#FF5A36]/60 rounded-lg cursor-pointer transition flex flex-col justify-between"
                >
                  <div>
                    <div className="font-bold text-gray-200 truncate">
                      {sample.header.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {sample.header.subtitle}
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-400 font-medium mt-2 flex items-center justify-between">
                    <span>{sample.header.course} ★{sample.header.level}</span>
                    <span>読込</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
