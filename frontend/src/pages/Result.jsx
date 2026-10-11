import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchResult } from "../services/attemptService";
import { getErrorMessage } from "../services/api";

const LETTERS = ["A", "B", "C", "D"];

export default function Result() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResult(id)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="rounded bg-red-50 text-red-700 p-3">{error}</div>
          <Link to="/dashboard" className="text-indigo-600 mt-4 inline-block">Back to tests</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <p className="text-center text-slate-500 mt-10">Loading result...</p>
      </div>
    );
  }

  const { result, review } = data;

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className={`text-sm font-semibold ${result.passed ? "text-green-600" : "text-red-600"}`}>
            {result.passed ? "PASSED" : "NOT PASSED"}
            {result.autoSubmitted ? " (auto-submitted when time ended)" : ""}
          </p>
          <p className="text-4xl font-bold text-indigo-600 mt-2">
            {result.score} / {result.maxScore}
          </p>
          <p className="text-slate-500">{result.percentage}%</p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <Box label="Correct" value={result.correctCount} color="text-green-600" />
            <Box label="Wrong" value={result.wrongCount} color="text-red-600" />
            <Box label="Skipped" value={result.unattemptedCount} color="text-slate-600" />
          </div>
        </div>

        {result.subjectStats?.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mt-6 overflow-x-auto">
            <h2 className="font-semibold text-slate-800 mb-3">Subject-wise performance</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2">Subject</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Skipped</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {result.subjectStats.map((s) => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="py-2 font-medium text-slate-800">{s.name}</td>
                    <td>{s.correct}</td>
                    <td>{s.wrong}</td>
                    <td>{s.unattempted}</td>
                    <td>{s.score} / {s.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="font-semibold text-slate-800 mt-8 mb-3">Answer review</h2>
        <div className="space-y-4">
          {review.map((q, i) => (
            <div key={q._id} className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-slate-500 mb-1">
                Q{i + 1} | {q.subject} | {q.topic}
              </p>
              <p className="font-medium text-slate-800 whitespace-pre-wrap">{q.text}</p>
              <div className="mt-3 space-y-2">
                {q.options.map((option, index) => {
                  const isCorrect = index === q.correctAnswer;
                  const isChosen = index === q.selected;
                  let style = "border-slate-200";
                  if (isCorrect) style = "border-green-500 bg-green-50";
                  else if (isChosen) style = "border-red-500 bg-red-50";
                  return (
                    <div key={index} className={`rounded border px-3 py-2 text-sm ${style}`}>
                      <span className="font-semibold mr-2">{LETTERS[index]}.</span>
                      {option}
                      {isCorrect && <span className="ml-2 text-green-700 text-xs">(Correct)</span>}
                      {isChosen && !isCorrect && <span className="ml-2 text-red-700 text-xs">(Your answer)</span>}
                    </div>
                  );
                })}
              </div>
              {q.selected === null && <p className="text-xs text-slate-500 mt-2">You skipped this question.</p>}
              {q.explanation && (
                <p className="text-sm text-slate-600 mt-3">
                  <span className="font-semibold">Explanation:</span> {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        <Link to="/dashboard" className="inline-block mt-6 rounded bg-indigo-600 text-white px-5 py-2 hover:bg-indigo-700">
          Back to tests
        </Link>
      </main>
    </div>
  );
}

function Box({ label, value, color }) {
  return (
    <div className="rounded bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}