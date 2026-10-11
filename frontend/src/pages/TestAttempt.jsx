import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { saveAnswer, startAttempt, submitAttempt } from "../services/attemptService";
import { getErrorMessage } from "../services/api";

const LETTERS = ["A", "B", "C", "D"];

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export default function TestAttempt() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const attemptIdRef = useRef(null);
  const expiresRef = useRef(0); // expiry time converted to this computer's clock
  const submittedRef = useRef(false);
  const startedRef = useRef(false);

  // ----- start or resume the attempt -----
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    startAttempt(testId)
      .then((data) => {
        const offset = new Date(data.serverTime).getTime() - Date.now();
        expiresRef.current = new Date(data.attempt.expiresAt).getTime() - offset;
        attemptIdRef.current = data.attempt.id;

        const map = {};
        data.answers.forEach((a) => {
          map[a.question] = { selected: a.selected, markedForReview: a.markedForReview };
        });
        setAnswers(map);
        setQuestions(data.questions);
        setReady(true);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [testId]);

  // ----- submit -----
  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await submitAttempt(attemptIdRef.current);
      navigate(`/results/${attemptIdRef.current}`, { replace: true });
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setWarning(`Submit failed: ${getErrorMessage(err)}. Please try again.`);
    }
  }, [navigate]);

  // ----- timer -----
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const left = Math.max(0, Math.round((expiresRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) doSubmit();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [ready, doSubmit]);

  // ----- auto-save -----
  const persist = async (questionId, patch) => {
    try {
      await saveAnswer(attemptIdRef.current, { questionId, ...patch });
      setWarning("");
    } catch (err) {
      if (err.response?.data?.data?.result) {
        navigate(`/results/${attemptIdRef.current}`, { replace: true });
        return;
      }
      setWarning("Could not save your last change. Check your internet connection.");
    }
  };

  const updateLocal = (qid, patch) =>
    setAnswers((prev) => ({
      ...prev,
      [qid]: { selected: null, markedForReview: false, ...prev[qid], ...patch },
    }));

  const selectOption = (qid, index) => {
    updateLocal(qid, { selected: index });
    persist(qid, { selected: index });
  };

  const clearAnswer = (qid) => {
    updateLocal(qid, { selected: null });
    persist(qid, { selected: null });
  };

  const toggleReview = (qid) => {
    const next = !answers[qid]?.markedForReview;
    updateLocal(qid, { markedForReview: next });
    persist(qid, { markedForReview: next });
  };

  const handleManualSubmit = () => {
    const answered = questions.filter((q) => answers[q._id]?.selected !== null && answers[q._id]?.selected !== undefined).length;
    const message = `You answered ${answered} of ${questions.length} questions.\nSubmit the test now? You cannot change answers after submitting.`;
    if (window.confirm(message)) doSubmit();
  };

  // ----- screens -----
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 px-4">
        <div className="rounded bg-red-50 text-red-700 p-3 max-w-md text-center">{error}</div>
        <Link to="/dashboard" className="text-indigo-600">Back to tests</Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">
        Preparing your test...
      </div>
    );
  }

  const q = questions[current];
  const a = answers[q._id] || { selected: null, markedForReview: false };
  const isAnswered = (qid) => answers[qid]?.selected !== null && answers[qid]?.selected !== undefined;
  const lowTime = remaining <= 300;

  const paletteClass = (question, index) => {
    const st = answers[question._id];
    let base = "bg-slate-200 text-slate-700";
    if (isAnswered(question._id)) base = "bg-green-500 text-white";
    if (st?.markedForReview) base = "bg-amber-400 text-white";
    const ring = index === current ? " ring-2 ring-indigo-600 ring-offset-1" : "";
    return `${base}${ring}`;
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-indigo-600">ExamPro</span>
          <div className={`font-mono text-lg font-bold ${lowTime ? "text-red-600" : "text-slate-800"}`}>
            {formatTime(remaining)}
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={submitting}
            className="rounded bg-green-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
        {warning && <div className="bg-amber-100 text-amber-800 text-sm text-center py-1">{warning}</div>}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-xl shadow p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 mb-3">
            <span>
              Question {current + 1} of {questions.length}
            </span>
            <span>
              {q.subject?.name} | {q.marks} mark{q.marks === 1 ? "" : "s"}
              {q.negativeMarks > 0 ? ` | -${q.negativeMarks} for wrong` : ""}
            </span>
          </div>

          <h2 className="text-lg font-medium text-slate-800 whitespace-pre-wrap">{q.text}</h2>

          <div className="mt-5 space-y-3">
            {q.options.map((option, index) => {
              const chosen = a.selected === index;
              return (
                <button
                  key={index}
                  onClick={() => selectOption(q._id, index)}
                  className={`w-full text-left rounded-lg border px-4 py-3 flex gap-3 transition ${
                    chosen
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                      chosen ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {LETTERS[index]}
                  </span>
                  <span className="text-slate-800">{option}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => toggleReview(q._id)}
              className={`rounded px-3 py-2 text-sm border ${
                a.markedForReview
                  ? "bg-amber-400 text-white border-amber-400"
                  : "border-amber-400 text-amber-700 hover:bg-amber-50"
              }`}
            >
              {a.markedForReview ? "Unmark review" : "Mark for review"}
            </button>
            <button
              onClick={() => clearAnswer(q._id)}
              disabled={!isAnswered(q._id)}
              className="rounded px-3 py-2 text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear answer
            </button>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
              className="rounded bg-indigo-600 text-white px-5 py-2 hover:bg-indigo-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>

        <aside className="bg-white rounded-xl shadow p-5 h-fit">
          <h3 className="font-semibold text-slate-800 mb-3">Question palette</h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2">
            {questions.map((question, index) => (
              <button
                key={question._id}
                onClick={() => setCurrent(index)}
                className={`h-9 rounded text-sm font-medium ${paletteClass(question, index)}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <ul className="mt-4 text-xs text-slate-600 space-y-1">
            <li><span className="inline-block w-3 h-3 rounded bg-green-500 mr-2"></span>Answered</li>
            <li><span className="inline-block w-3 h-3 rounded bg-amber-400 mr-2"></span>Marked for review</li>
            <li><span className="inline-block w-3 h-3 rounded bg-slate-200 mr-2"></span>Not answered</li>
          </ul>
        </aside>
      </main>
    </div>
  );
}