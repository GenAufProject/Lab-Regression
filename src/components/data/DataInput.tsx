import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { DataPoint, DatasetPreset } from '../../types';
import { SAMPLE_DATASETS } from '../../lib/data/sampleDatasets';

interface DataInputProps {
  data: DataPoint[];
  onChange: (newData: DataPoint[]) => void;
  onPresetSelect?: (preset: DatasetPreset) => void;
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
  onLabelChange?: (xLabel: string, yLabel: string, xUnit: string, yUnit: string) => void;
  minPointsWarning?: number;
}

export const DataInput: React.FC<DataInputProps> = ({
  data,
  onChange,
  onPresetSelect,
  xLabel = 'X',
  yLabel = 'Y',
  xUnit = '',
  yUnit = '',
  onLabelChange,
  minPointsWarning = 2,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [selectedXCol, setSelectedXCol] = useState(0);
  const [selectedYCol, setSelectedYCol] = useState(1);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Row update
  const handleUpdateRow = (id: string, field: 'x' | 'y', value: string) => {
    const num = parseFloat(value);
    const updated = data.map((pt) => {
      if (pt.id === id) {
        return {
          ...pt,
          [field]: isNaN(num) ? 0 : num,
        };
      }
      return pt;
    });
    onChange(updated);
  };

  // Add row
  const handleAddRow = () => {
    const lastX = data.length > 0 ? data[data.length - 1].x : 0;
    const newId = `pt-${Date.now()}-${data.length + 1}`;
    onChange([...data, { id: newId, x: lastX + 1, y: 0 }]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    if (data.length <= 2) {
      alert('Regression requires at least 2 data points.');
      return;
    }
    onChange(data.filter((pt) => pt.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm('Clear all data points? You can reload a sample dataset anytime.')) {
      onChange([
        { id: 'pt-1', x: 1, y: 0 },
        { id: 'pt-2', x: 2, y: 0 },
      ]);
    }
  };

  // Preset selection
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = SAMPLE_DATASETS.find((p) => p.id === presetId);
    if (!preset) return;

    const formattedPoints: DataPoint[] = preset.data.map((d, i) => ({
      id: `pt-${i + 1}`,
      x: d.x,
      y: d.y,
    }));

    onChange(formattedPoints);
    if (onLabelChange) {
      onLabelChange(preset.xLabel, preset.yLabel, preset.xUnit || '', preset.yUnit || '');
    }
    if (onPresetSelect) {
      onPresetSelect(preset);
    }
  };

  // Paste handler (supports Excel TSV or comma separated text)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const lines = pastedText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: DataPoint[] = [];
    for (let i = 0; i < lines.length; i++) {
      // Split by tab, semicolon, or comma
      const parts = lines[i].split(/[\t,;]+/).map((s) => s.trim());
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) {
          parsed.push({
            id: `pt-pasted-${i + 1}`,
            x,
            y,
          });
        }
      }
    }

    if (parsed.length >= 2) {
      e.preventDefault();
      onChange(parsed);
    }
  };

  // File upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      setCsvRawText(content);
      parseCsvPreview(content);
      setShowCsvModal(true);
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Parse CSV Preview
  const parseCsvPreview = (text: string) => {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    // Detect delimiter: check comma, semicolon, tab
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

    const parsedRows = lines.map((line) =>
      line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim())
    );

    if (parsedRows.length > 0) {
      const colCount = parsedRows[0].length;
      const headers = parsedRows[0].map((h, i) => h || `Column ${i + 1}`);
      setCsvHeaders(headers);
      setCsvRows(parsedRows.slice(1, 10)); // preview first 10
      setSelectedXCol(0);
      setSelectedYCol(colCount > 1 ? 1 : 0);
    }
  };

  // Apply CSV data from modal
  const handleApplyCsv = () => {
    const lines = csvRawText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

    const startIdx = hasHeaderRow ? 1 : 0;
    const newPoints: DataPoint[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i]
        .split(delimiter)
        .map((c) => c.replace(/^["']|["']$/g, '').trim());
      const x = parseFloat(parts[selectedXCol]);
      const y = parseFloat(parts[selectedYCol]);
      if (!isNaN(x) && !isNaN(y)) {
        newPoints.push({
          id: `csv-${i}`,
          x,
          y,
        });
      }
    }

    if (newPoints.length < 2) {
      alert('CSV did not contain at least 2 valid numeric pairs in the selected columns.');
      return;
    }

    onChange(newPoints);
    if (hasHeaderRow && onLabelChange && csvHeaders[selectedXCol] && csvHeaders[selectedYCol]) {
      onLabelChange(csvHeaders[selectedXCol], csvHeaders[selectedYCol], '', '');
    }
    setShowCsvModal(false);
  };

  // Export current data as CSV
  const handleExportCsv = () => {
    const header = `${xLabel || 'X'},${yLabel || 'Y'}\n`;
    const rows = data.map((pt) => `${pt.x},${pt.y}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'regression-data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Validation checks
  const allXIdentical =
    data.length >= 2 && data.every((pt) => Math.abs(pt.x - data[0].x) < 1e-10);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
      {/* Header with Dataset Preset selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-neutral-100">
        <div>
          <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
            <FileSpreadsheet size={16} className="text-teal-700" />
            <span>Paired Data Input</span>
          </h3>
          <p className="text-neutral-500 text-xs mt-0.5">
            Enter or paste paired (X, Y) data points. Changes reflect immediately.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Preset dropdown */}
          <select
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium max-w-[200px] truncate"
          >
            <option value="" disabled>
              Load Sample Dataset...
            </option>
            {SAMPLE_DATASETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white font-medium px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
          >
            <Plus size={14} />
            <span>Add Row</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Import CSV or TSV file"
          >
            <Upload size={13} />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Export data as CSV"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
          title="Clear data points"
        >
          <Trash2 size={13} />
          <span>Clear</span>
        </button>
      </div>

      {/* Warnings */}
      {allXIdentical && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>
            <strong>Zero Variance in X:</strong> All X values are identical. OLS regression cannot compute a slope for a vertical line. Please provide at least two different X values.
          </span>
        </div>
      )}

      {data.length < minPointsWarning && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>Enter at least 2 valid paired data points to calculate regression.</span>
        </div>
      )}

      {/* Editable Table */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-[340px] overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200 sticky top-0 z-10">
            <tr>
              <th className="py-2 px-2.5 w-10 text-neutral-400 text-center font-mono">#</th>
              <th className="py-2 px-2.5 font-medium">
                {xLabel} {xUnit ? <span className="text-neutral-400">({xUnit})</span> : ''}
              </th>
              <th className="py-2 px-2.5 font-medium">
                {yLabel} {yUnit ? <span className="text-neutral-400">({yUnit})</span> : ''}
              </th>
              <th className="py-2 px-2 text-center w-12 text-neutral-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.map((pt, idx) => (
              <tr key={pt.id} className="hover:bg-teal-50/40 transition-colors">
                <td className="py-1.5 px-2 text-center font-mono text-neutral-400">{idx + 1}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="any"
                    value={pt.x}
                    onChange={(e) => handleUpdateRow(pt.id, 'x', e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-neutral-200 rounded font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="any"
                    value={pt.y}
                    onChange={(e) => handleUpdateRow(pt.id, 'y', e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-neutral-200 rounded font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </td>
                <td className="py-1.5 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(pt.id)}
                    className="text-neutral-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Delete row"
                    disabled={data.length <= 2}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Direct Paste Area Hint */}
      <div className="mt-3">
        <details className="text-xs text-neutral-600">
          <summary className="cursor-pointer font-medium text-teal-700 hover:text-teal-800 select-none">
            Paste from Excel or Google Sheets...
          </summary>
          <div className="mt-2 p-2 bg-neutral-50 border border-neutral-200 rounded-lg">
            <p className="text-[11px] text-neutral-500 mb-1.5">
              Copy two columns from Excel/Sheets and paste into the box below:
            </p>
            <textarea
              rows={3}
              onPaste={handlePaste}
              placeholder="Paste columns here (X in 1st column, Y in 2nd column)..."
              className="w-full text-xs font-mono p-2 border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
            />
          </div>
        </details>
      </div>

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-neutral-200">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Configure CSV Import</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Map which columns correspond to the independent variable (X) and dependent variable (Y).
            </p>

            <div className="space-y-3 text-xs mb-4">
              <label className="flex items-center gap-2 text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHeaderRow}
                  onChange={(e) => setHasHeaderRow(e.target.checked)}
                  className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                />
                <span>First row contains column headers</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">X Variable Column</label>
                  <select
                    value={selectedXCol}
                    onChange={(e) => setSelectedXCol(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {csvHeaders.map((h, idx) => (
                      <option key={`xcol-${idx}`} value={idx}>
                        Col {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Y Variable Column</label>
                  <select
                    value={selectedYCol}
                    onChange={(e) => setSelectedYCol(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {csvHeaders.map((h, idx) => (
                      <option key={`ycol-${idx}`} value={idx}>
                        Col {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data preview table */}
              <div className="mt-3">
                <div className="font-medium text-neutral-700 mb-1 text-[11px]">Preview First Rows:</div>
                <div className="max-h-32 overflow-auto border border-neutral-200 rounded">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="bg-neutral-100">
                      <tr>
                        {csvHeaders.map((h, i) => (
                          <th
                            key={`prev-h-${i}`}
                            className={`p-1 text-left ${
                              i === selectedXCol
                                ? 'bg-teal-100 text-teal-900 font-bold'
                                : i === selectedYCol
                                ? 'bg-amber-100 text-amber-900 font-bold'
                                : 'text-neutral-500'
                            }`}
                          >
                            {h} {i === selectedXCol ? '(X)' : i === selectedYCol ? '(Y)' : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row, rIdx) => (
                        <tr key={`prev-row-${rIdx}`} className="border-t border-neutral-100">
                          {row.map((cell, cIdx) => (
                            <td
                              key={`prev-cell-${cIdx}`}
                              className={`p-1 ${
                                cIdx === selectedXCol
                                  ? 'bg-teal-50/60 font-semibold'
                                  : cIdx === selectedYCol
                                  ? 'bg-amber-50/60 font-semibold'
                                  : ''
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCsv}
                className="px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-xs"
              >
                Apply Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
