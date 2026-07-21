import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import { API } from "../config/api"


const STATUS_COLORS = {
  draft:            { bg: "#F1EFE8", color: "#5F5E5A" },
  pending_approval: { bg: "#FAEEDA", color: "#854F0B" },
  approved:         { bg: "#EEEDFE", color: "#534AB7" },
  scheduled:        { bg: "#E6F1FB", color: "#185FA5" },
  live:             { bg: "#EAF3DE", color: "#3B6D11" },
  closed:           { bg: "#FAECE7", color: "#993C1D" },
}

const STATUS_LABELS = {
  draft:            "Draft",
  pending_approval: "Pending Approval",
  approved:         "Approved",
  scheduled:        "Scheduled",
  live:             "Live",
  closed:           "Closed",
}

const EMPTY_FORM = {
  title: "",
  subject: "",
  description: "",
  duration: 60,
  passMark: 0,
  negativeMark: 0,
  assignedBatches: "",
  instructions: "",
  department: "",
  shuffleQuestions: false,
  questions: [],
}

export default function ExamManagement() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const headers = { Authorization: `Bearer ${token}` }

  const [exams, setExams] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showQuestionPicker, setShowQuestionPicker] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [editId, setEditId] = useState(null)
  const [scheduleId, setScheduleId] = useState(null)
  const [scheduleData, setScheduleData] = useState({ scheduledStart: "", scheduledEnd: "" })

  const fetchExams = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API}/exams`, { headers })
      setExams(res.data.exams)
    } catch (err) {
      setError("Failed to load exams")
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`${API}/questions`, { headers })
      setQuestions(res.data.questions)
    } catch (err) {
      console.error("Failed to load questions")
    }
  }

  useEffect(() => {
    fetchExams()
    fetchQuestions()
  }, [])

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError("Exam title is required")
    if (!form.subject.trim()) return setError("Subject is required")
    if (!form.duration) return setError("Duration is required")
    setError("")
    setSaving(true)
    try {
      const payload = {
        ...form,
        assignedBatches: form.assignedBatches
          ? form.assignedBatches.split(",").map(b => b.trim())
          : [],
      }
      if (editId) {
        await axios.put(`${API}/exams/${editId}`, payload, { headers })
      } else {
        await axios.post(`${API}/exams`, payload, { headers })
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
      setEditId(null)
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save exam")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (exam) => {
    setForm({
      title:            exam.title,
      subject:          exam.subject,
      description:      exam.description || "",
      duration:         exam.duration,
      passMark:         exam.passMark,
      negativeMark:     exam.negativeMark,
      assignedBatches:  (exam.assignedBatches || []).join(", "),
      instructions:     exam.instructions || "",
      department:       exam.department || "",
      shuffleQuestions: exam.shuffleQuestions || false,
      questions:        exam.questions || [],
    })
    setEditId(exam._id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this exam?")) return
    try {
      await axios.delete(`${API}/exams/${id}`, { headers })
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete exam")
    }
  }

  const handleSubmitForApproval = async (id) => {
    try {
      await axios.put(`${API}/exams/${id}/submit`, {}, { headers })
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit for approval")
    }
  }

  const handleApprove = async (id) => {
    try {
      await axios.put(`${API}/exams/${id}/approve`, {}, { headers })
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve exam")
    }
  }

  const handleReject = async (id) => {
    try {
      await axios.put(`${API}/exams/${id}/reject`, {}, { headers })
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject exam")
    }
  }

  const handleSchedule = async () => {
    try {
      await axios.put(`${API}/exams/${scheduleId}/schedule`, scheduleData, { headers })
      setScheduleId(null)
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule exam")
    }
  }

  const handleGoLive = async (id) => {
    try {
      await axios.put(`${API}/exams/${id}/live`, {}, { headers })
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to go live")
    }
  }

  const handleClose = async (id) => {
    try {
      await axios.put(`${API}/exams/${id}/close`, {}, { headers })
      fetchExams()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to close exam")
    }
  }

  const addQuestion = (q) => {
    const already = form.questions.find(fq => fq.questionId === q._id)
    if (already) return
    setForm({
      ...form,
      questions: [
        ...form.questions,
        {
          questionId:   q._id,
          marks:        q.marks,
          questionText: q.text,
          questionType: q.type,
        }
      ]
    })
  }

  const removeQuestion = (qId) => {
    setForm({ ...form, questions: form.questions.filter(q => q.questionId !== qId) })
  }

  const totalMarks = form.questions.reduce((sum, q) => sum + (q.marks || 0), 0)

  const card = {
    background: "white",
    border: "1px solid #D3D1C7",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "12px",
  }

  const input = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #D3D1C7",
    background: "#FAFAF8",
    fontSize: "13.5px",
    color: "#2C2C2A",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "10px",
  }

  const label = {
    display: "block",
    fontSize: "12.5px",
    fontWeight: "500",
    color: "#2C2C2A",
    marginBottom: "5px",
  }

  const btn = (bg, color) => ({
    padding: "7px 14px",
    background: bg,
    color: color,
    border: "none",
    borderRadius: "8px",
    fontSize: "12.5px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  })

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "'Lora', serif", fontSize: "24px", fontWeight: "600", color: "#2C2C2A", margin: "0 0 4px" }}>
            {user?.role === "student" ? "My Exams" : "Exam Management"}
          </h1>
          <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
            {exams.length} exams total
          </p>
        </div>
        {(user?.role === "teacher" || user?.role === "hod") && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}
            style={btn("#185FA5", "white")}
          >
            + Create Exam
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#FAECE7", border: "1px solid #F0C4B4", color: "#993C1D", fontSize: "13px", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
          {error}
          <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#993C1D" }}>x</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888780" }}>Loading exams...</div>
      ) : exams.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "48px", color: "#888780" }}>
          <i className="ti ti-file-text" style={{ fontSize: "40px", marginBottom: "12px", display: "block" }}></i>
          {user?.role === "student" ? "No live exams right now." : "No exams yet. Click Create Exam to get started."}
        </div>
      ) : (
        exams.map((exam) => (
          <div key={exam._id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: "500", padding: "2px 9px", borderRadius: "20px",
                    background: STATUS_COLORS[exam.status]?.bg,
                    color: STATUS_COLORS[exam.status]?.color,
                  }}>
                    {STATUS_LABELS[exam.status]}
                  </span>
                  <span style={{ fontSize: "11px", padding: "2px 9px", borderRadius: "20px", background: "#F1EFE8", color: "#5F5E5A" }}>
                    {exam.duration} mins
                  </span>
                  <span style={{ fontSize: "11px", padding: "2px 9px", borderRadius: "20px", background: "#F1EFE8", color: "#5F5E5A" }}>
                    {exam.totalMarks} marks
                  </span>
                  <span style={{ fontSize: "11px", padding: "2px 9px", borderRadius: "20px", background: "#F1EFE8", color: "#5F5E5A" }}>
                    {exam.questions?.length || 0} questions
                  </span>
                </div>

                <div style={{ fontSize: "16px", fontWeight: "600", color: "#2C2C2A", marginBottom: "4px", fontFamily: "'Lora', serif" }}>
                  {exam.title}
                </div>
                <div style={{ fontSize: "13px", color: "#888780", marginBottom: "4px" }}>
                  {exam.subject}
                  {exam.department && ` · ${exam.department}`}
                </div>
                {exam.assignedBatches?.length > 0 && (
                  <div style={{ fontSize: "12px", color: "#888780" }}>
                    Batches: {exam.assignedBatches.join(", ")}
                  </div>
                )}
                {exam.scheduledStart && (
                  <div style={{ fontSize: "12px", color: "#185FA5", marginTop: "4px" }}>
                    Scheduled: {new Date(exam.scheduledStart).toLocaleString()} — {new Date(exam.scheduledEnd).toLocaleString()}
                  </div>
                )}
                <div style={{ fontSize: "11.5px", color: "#B4B2A9", marginTop: "6px" }}>
                  Created by {exam.createdBy?.name}
                  {exam.approvedBy && ` · Approved by ${exam.approvedBy?.name}`}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>

                {/* Student actions */}
                {user?.role === "student" && exam.status === "live" && (
                  <button
                    onClick={() => navigate(`/exam/take/${exam._id}`)}
                    style={btn("#EAF3DE", "#3B6D11")}
                  >
                    Start Exam
                  </button>
                )}

                {user?.role === "teacher" && exam.status === "draft" && (
                  <>
                    <button onClick={() => handleEdit(exam)} style={btn("#F1EFE8", "#2C2C2A", false)}>Edit</button>
                    <button onClick={() => handleSubmitForApproval(exam._id)} style={btn("#EEEDFE", "#534AB7", false)}>Submit</button>
                    <button onClick={() => handleDelete(exam._id)} style={btn("#FAECE7", "#993C1D", false)}>Delete</button>
                  </>
                )}

                {user?.role === "teacher" && exam.status === "closed" && (
                  <button
                    onClick={() => navigate(`/grading/${exam._id}`)}
                    style={btn("#EEEDFE", "#534AB7", false)}
                  >
                    Grade
                  </button>
                )}

                {/* HOD actions */}
                {user?.role === "hod" && exam.status === "pending_approval" && (
                  <>
                    <button onClick={() => handleApprove(exam._id)} style={btn("#EAF3DE", "#3B6D11")}>Approve</button>
                    <button onClick={() => handleReject(exam._id)} style={btn("#FAECE7", "#993C1D")}>Reject</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Schedule modal */}
      {scheduleId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "440px" }}>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: "20px", fontWeight: "600", color: "#2C2C2A", margin: "0 0 20px" }}>
              Schedule Exam
            </h2>
            <label style={label}>Start Date and Time</label>
            <input type="datetime-local" value={scheduleData.scheduledStart} onChange={e => setScheduleData({ ...scheduleData, scheduledStart: e.target.value })} style={input} />
            <label style={label}>End Date and Time</label>
            <input type="datetime-local" value={scheduleData.scheduledEnd} onChange={e => setScheduleData({ ...scheduleData, scheduledEnd: e.target.value })} style={input} />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={() => setScheduleId(null)} style={btn("#F1EFE8", "#5F5E5A")}>Cancel</button>
              <button onClick={handleSchedule} style={btn("#185FA5", "white")}>Confirm Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Exam modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "'Lora', serif", fontSize: "20px", fontWeight: "600", color: "#2C2C2A", margin: 0 }}>
                {editId ? "Edit Exam" : "Create Exam"}
              </h2>
              <button onClick={() => { setShowForm(false); setError("") }} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888780" }}>x</button>
            </div>

            {error && (
              <div style={{ background: "#FAECE7", border: "1px solid #F0C4B4", color: "#993C1D", fontSize: "13px", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={label}>Exam Title</label>
                <input type="text" placeholder="e.g. Data Structures Mid Sem" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Subject</label>
                <input type="text" placeholder="e.g. Data Structures" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} style={input} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={label}>Department</label>
                <input type="text" placeholder="e.g. MCA" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Duration (minutes)</label>
                <input type="number" min="1" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 60 })} style={input} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={label}>Pass Mark</label>
                <input type="number" min="0" value={form.passMark} onChange={e => setForm({ ...form, passMark: parseInt(e.target.value) || 0 })} style={input} />
              </div>
              <div>
                <label style={label}>Negative Mark per wrong MCQ</label>
                <input type="number" min="0" step="0.25" value={form.negativeMark} onChange={e => setForm({ ...form, negativeMark: parseFloat(e.target.value) || 0 })} style={input} />
              </div>
            </div>

            <label style={label}>Assigned Batches (comma separated)</label>
            <input type="text" placeholder="e.g. MCA S3, MCA S5" value={form.assignedBatches} onChange={e => setForm({ ...form, assignedBatches: e.target.value })} style={input} />

            <label style={label}>Instructions for Students</label>
            <textarea placeholder="Enter exam instructions..." value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={3} style={{ ...input, resize: "vertical" }} />

            <label style={label}>Description (optional)</label>
            <textarea placeholder="Brief description of this exam..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...input, resize: "vertical" }} />

            <label style={{ ...label, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.shuffleQuestions} onChange={e => setForm({ ...form, shuffleQuestions: e.target.checked })} />
              Shuffle questions for each student
            </label>

            <div style={{ marginTop: "16px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A" }}>
                  Questions ({form.questions.length}) — Total: {totalMarks} marks
                </div>
                <button onClick={() => setShowQuestionPicker(true)} style={btn("#E6F1FB", "#185FA5")}>
                  + Pick Questions
                </button>
              </div>

              {form.questions.length === 0 ? (
                <div style={{ background: "#F5F3EE", borderRadius: "8px", padding: "16px", textAlign: "center", fontSize: "13px", color: "#888780" }}>
                  No questions added yet. Click Pick Questions to add from the bank.
                </div>
              ) : (
                form.questions.map((q, i) => (
                  <div key={q.questionId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#F5F3EE", borderRadius: "8px", marginBottom: "6px" }}>
                    <div style={{ fontSize: "13px", color: "#2C2C2A", flex: 1, marginRight: "10px" }}>
                      {i + 1}. {q.questionText?.slice(0, 60)}{q.questionText?.length > 60 ? "..." : ""}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#888780" }}>{q.marks} marks</span>
                      <button onClick={() => removeQuestion(q.questionId)} style={{ background: "none", border: "none", color: "#993C1D", cursor: "pointer", fontSize: "14px" }}>x</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={() => { setShowForm(false); setError("") }} style={btn("#F1EFE8", "#5F5E5A")}>Cancel</button>
              <button onClick={handleSubmit} disabled={saving} style={btn(saving ? "#7BAED4" : "#185FA5", "white")}>
                {saving ? "Saving..." : editId ? "Update Exam" : "Save Exam"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question picker modal */}
      {showQuestionPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: "'Lora', serif", fontSize: "18px", fontWeight: "600", color: "#2C2C2A", margin: 0 }}>
                Pick Questions
              </h2>
              <button onClick={() => setShowQuestionPicker(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888780" }}>x</button>
            </div>

            {questions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", color: "#888780" }}>
                No approved questions found. Go to Question Bank and get some questions approved first.
              </div>
            ) : (
              questions.map((q) => {
                const already = form.questions.find(fq => fq.questionId === q._id)
                return (
                  <div key={q._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F1EFE8" }}>
                    <div style={{ flex: 1, marginRight: "12px" }}>
                      <div style={{ fontSize: "13px", color: "#2C2C2A" }}>{q.text?.slice(0, 80)}{q.text?.length > 80 ? "..." : ""}</div>
                      <div style={{ fontSize: "11.5px", color: "#888780", marginTop: "2px" }}>
                        {q.type} · {q.subject} · {q.marks} marks · {q.difficulty}
                      </div>
                    </div>
                    <button
                      onClick={() => addQuestion(q)}
                      disabled={!!already}
                      style={btn(already ? "#F1EFE8" : "#EAF3DE", already ? "#B4B2A9" : "#3B6D11")}
                    >
                      {already ? "Added" : "+ Add"}
                    </button>
                  </div>
                )
              })
            )}

            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button onClick={() => setShowQuestionPicker(false)} style={btn("#185FA5", "white")}>Done</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}