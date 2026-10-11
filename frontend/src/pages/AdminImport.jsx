import { useRef, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { confirmImport, previewImport } from "../services/questionService";
import { getErrorMessage } from "../services/api";

const LETTERS = ["A", "B", "C", "D"];

const SAMPLE_CSV = `question,optionA,optionB,optionC,optionD,correctAnswer,subject,topic,difficulty,marks,negativeMarks,explanation
What is 20% of 150?,20,25,30,35,C,Quantitative Aptitude,Percentages,easy,1,0.25,20% of 150 = 30
Choose the correct synonym of HAPPY,Sad,Joyful,Angry,Tired,B,English,Vocabulary,easy,1,0.25,Joyful means happy
`;

export default function AdminImport() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [createMissing, setCreateMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [importedInvalid, setImportedInvalid] = useState([]);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-questions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    setFile(e.target.files[0] || null);
    setPreview(null);
    setError("");
    setMessage("");
    setImportedInvalid([]);
  };

  const handlePreview = async () => {
    if (!file) return setError("Please choose a .csv or .xlsx file first");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      setPreview(await previewImport(file));
    } catch (err) {
      setPreview(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await confirmImport(file, createMissing);
      setMessage(res.message);
      setImportedInvalid(res.data.invalidRows || []);
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Import questions">
      {error && <div className="mb-4 rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}
      {message && <div className="mb-4 rounded bg-green-50 text-green-700 text-sm p-3">{message}</div>}

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <p className="text-sm text-slate-600 mb-3">
          Required columns: <b>question, optionA, optionB, optionC, optionD, correctAnswer, subject</b>. Optional:
          topic, difficulty, marks, negativeMarks, explanation. correctAnswer can be A, B, C, D (or 1-4). Max 1000
          rows and 2 MB per file. Excel files must be .xlsx.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleFile} className="text-sm" />
          <button
            onClick={handlePreview}
            disabled={loading || !file}
            className="rounded bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Preview"}
          </button>
          <button onClick={downloadSample} className="text-indigo-600 text-sm hover:underline">
            Download sample CSV
          </button>
        </div>
      </div>

      {preview && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <Box label="Total rows" value={preview.totalRows} />
            <Box label="Valid" value={preview.validCount} color="text-green-600" />
            <Box label="Invalid" value={preview.invalidCount} color="text-red-600" />
          </div>

          {preview.invalidRows.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800 mb-2">Invalid rows (will be skipped)</h3>
              <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                {preview.invalidRows.map((r) => (
                  <li key={r.row} className="text-red-700">
                    Row {r.row}: {r.errors.join("; ")}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                Rows with a missing subject become valid if you tick the box below. Preview does not create
                subjects; the final import does.
              </p>
            </div>
          )}

          {preview.preview.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <h3 className="font-semibold text-slate-800 mb-2">
                Valid questions preview (first {preview.preview.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">Row</th>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Subject</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((q) => (
                    <tr key={q.row} className="border-b last:border-0">
                      <td className="py-2">{q.row}</td>
                      <td className="pr-3">{q.text.length > 80 ? `${q.text.slice(0, 80)}...` : q.text}</td>
                      <td>{LETTERS[q.correctAnswer]}</td>
                      <td>{q.subject}</td>
                      <td className="capitalize">{q.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
            <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
            Create subjects that do not exist yet
          </label>

          <button
            onClick={handleConfirm}
            disabled={loading || (preview.validCount === 0 && !createMissing)}
            className="rounded bg-green-600 text-white px-5 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Importing..." : "Confirm import"}
          </button>
        </div>
      )}

      {importedInvalid.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-slate-800 mb-2">Skipped rows</h3>
          <ul className="text-sm space-y-1">
            {importedInvalid.map((r) => (
              <li key={r.row} className="text-red-700">Row {r.row}: {r.errors.join("; ")}</li>
            ))}
          </ul>
        </div>
      )}
    </AdminLayout>
  );
}

function Box({ label, value, color = "text-slate-800" }) {
  return (
    <div className="rounded bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}