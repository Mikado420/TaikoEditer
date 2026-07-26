import React, { useState } from 'react';
import { X, Plus, Activity } from 'lucide-react';
import { ChartEvent, EventType } from '../../types/chart';
import { BufferedNumberInput } from '../BufferedNumberInput';

interface EventEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMeasureIndex: number;
  currentPositionInMeasure: number;
  onSaveEvent: (event: ChartEvent) => void;
}

export const EventEditModal: React.FC<EventEditModalProps> = ({
  isOpen,
  onClose,
  currentMeasureIndex,
  currentPositionInMeasure,
  onSaveEvent,
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<EventType>('BPMCHANGE');
  const [value, setValue] = useState<number>(140);
  const [numerator, setNumerator] = useState<number>(4);
  const [denominator, setDenominator] = useState<number>(4);
  const [text, setText] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: ChartEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      measureIndex: currentMeasureIndex,
      positionInMeasure: currentPositionInMeasure,
      timeSeconds: 0,
      value: type === 'BPMCHANGE' || type === 'SCROLL' || type === 'DELAY' ? value : undefined,
      numerator: type === 'MEASURE' ? numerator : undefined,
      denominator: type === 'MEASURE' ? denominator : undefined,
      text: type === 'LYRIC' ? text : undefined,
    };

    onSaveEvent(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1C1C1C] border border-[#3A3A3A] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 bg-[#242424] border-b border-[#3A3A3A] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-200 text-sm">
            <Activity size={16} className="text-[#FF5A36]" />
            <span>イベント追加 (小節 {currentMeasureIndex + 1})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#333333] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-gray-400 mb-1 block">
              イベント種別
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            >
              <option value="BPMCHANGE">BPMCHANGE (BPM変更)</option>
              <option value="SCROLL">SCROLL (スクロール速度)</option>
              <option value="MEASURE">MEASURE (拍子変更)</option>
              <option value="GOGOSTART">GOGOSTART (ゴーゴー開始)</option>
              <option value="GOGOEND">GOGOEND (ゴーゴー終了)</option>
              <option value="DELAY">DELAY (停止/遅延)</option>
              <option value="BARLINEON">BARLINEON (小節線ON)</option>
              <option value="BARLINEOFF">BARLINEOFF (小節線OFF)</option>
              <option value="LYRIC">LYRIC (歌詞)</option>
            </select>
          </div>

          {(type === 'BPMCHANGE' || type === 'SCROLL' || type === 'DELAY') && (
            <div>
              <label className="text-[10px] uppercase font-semibold text-gray-400 mb-1 block">
                {type === 'BPMCHANGE' && '新BPM値 (例: 150)'}
                {type === 'SCROLL' && 'スクロール倍率 (例: 1.5)'}
                {type === 'DELAY' && '停止時間 [秒] (例: 0.5)'}
              </label>
              <BufferedNumberInput
                step="0.01"
                defaultValue={type === 'BPMCHANGE' ? 140 : 1.0}
                value={value}
                onChange={(val) => setValue(val)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
          )}

          {type === 'MEASURE' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-semibold text-gray-400 mb-1 block">
                  分子 (Numerator)
                </label>
                <BufferedNumberInput
                  min={1}
                  defaultValue={4}
                  value={numerator}
                  onChange={(val) => setNumerator(val)}
                  className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-gray-400 mb-1 block">
                  分母 (Denominator)
                </label>
                <BufferedNumberInput
                  min={1}
                  defaultValue={4}
                  value={denominator}
                  onChange={(val) => setDenominator(val)}
                  className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
                />
              </div>
            </div>
          )}

          {type === 'LYRIC' && (
            <div>
              <label className="text-[10px] uppercase font-semibold text-gray-400 mb-1 block">
                歌詞テキスト
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
                placeholder="歌詞を入力..."
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-2 bg-[#FF5A36] hover:bg-[#ff6f4f] text-white font-bold rounded flex items-center justify-center gap-1.5 transition"
          >
            <Plus size={14} />
            <span>追加する</span>
          </button>
        </form>
      </div>
    </div>
  );
};
