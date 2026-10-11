import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchPublishedTest } from "../services/testService";
import { getErrorMessage } from "../services/api";

export default function TestInstructions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublishedTest(id)
      .then(setTest)
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

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <p className="text-center text-slate-500 mt-10">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-bold text-slate-800">{test.title}</h1>
          {test.description && <p className="text-slate-500 mt-1">{test.description}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center">
            <Info label="Questions" value={test.questionCount} />
            <Info label="Duration" value={`${test.durationMinutes} min`} />
            <Info label="Total marks" value={test.totalMarks} />
            <Info label="Passing marks" value={test.passingMarks} />
          </div>

          {test.distribution?.length > 0 && (
            <div className="mt-5">
              <h2 className="font-semibold text-slate-800 mb-2">Sections</h2>
              <ul className="text-sm text-slate-600 space-y-1">
                {test.distribution.map((d) => (
                  <li key={d.subject?._id}>
                    {d.subject?.name}: {d.count} questions
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <h2 className="font-semibold text-slate-800 mb-2">Instructions</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>The timer starts as soon as you press Start Test and cannot be paused.</li>
              <li>Your answers are saved automatically while you attempt the test.</li>
              <li>You can mark questions for review and move between questions freely.</li>
              <li>
                {test.negativeMarking
                  ? "Negative marking is ON: wrong answers lose marks."
                  : "There is no negative marking in this test."}
              </li>
              <li>The test is submitted automatically when time runs out.</li>
              <li>If you close the page, you can resume from the dashboard until time ends.</li>
              <li>Correct answers are shown only after you submit.</li>
            </ul>
          </div>

          <label className="flex items-start gap-2 mt-6 text-sm text-slate-700">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            I have read the instructions and I am ready to begin.
          </label>

          <div className="flex gap-3 mt-5">
            <Link to="/dashboard" className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
              Back
            </Link>
            <button
              disabled={!agreed}
              onClick={() => navigate(`/tests/${test._id}/attempt`)}
              className="rounded bg-indigo-600 text-white px-5 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Start Test
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}