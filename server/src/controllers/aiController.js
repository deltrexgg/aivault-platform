const axios = require("axios")

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

const callGroq = async (prompt) => {
  const response = await axios.post(
    GROQ_API_URL,
    {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
    }
  )
  return response.data.choices[0].message.content
}

// Grade a descriptive answer
const gradeAnswer = async (req, res) => {
  try {
    const { question, modelAnswer, studentAnswer, maxMarks } = req.body

    if (!question || !studentAnswer || !maxMarks) {
      return res.status(400).json({ message: "question, studentAnswer and maxMarks are required" })
    }

    const prompt = `You are an academic examiner. Grade the following student answer.

Question: ${question}

Model Answer / Rubric: ${modelAnswer || "Not provided — use your judgment based on the question"}

Student Answer: ${studentAnswer}

Maximum Marks: ${maxMarks}

Instructions:
- Give a score out of ${maxMarks}
- Be fair and academic
- Give a brief justification (2-3 sentences)
- Respond ONLY in this exact JSON format with no extra text:
{"score": <number>, "justification": "<string>", "feedback": "<string>"}`

    const result = await callGroq(prompt)

    let parsed
    try {
      const clean = result.replace(/```json|```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { score: 0, justification: "Could not parse AI response", feedback: result }
    }

    res.json({ success: true, ...parsed })
  } catch (error) {
    console.error("gradeAnswer error:", error.message)
    res.status(500).json({ message: "AI grading failed", error: error.message })
  }
}

// Detect plagiarism between answers
const detectPlagiarism = async (req, res) => {
  try {
    const { question, answers } = req.body

    if (!question || !answers || answers.length < 2) {
      return res.status(400).json({ message: "question and at least 2 answers are required" })
    }

    const answersText = answers.map((a, i) =>
      `Student ${i + 1} (ID: ${a.studentId}): ${a.answer}`
    ).join("\n\n")

    const prompt = `You are an academic integrity checker. Analyze these student answers for plagiarism.

Question: ${question}

Student Answers:
${answersText}

Instructions:
- Compare all answers for semantic similarity
- Flag pairs that are suspiciously similar (above 70% similarity)
- Consider paraphrasing as plagiarism too
- Respond ONLY in this exact JSON format with no extra text:
{
  "flaggedPairs": [
    {
      "student1": "<studentId>",
      "student2": "<studentId>",
      "similarityScore": <0-100>,
      "reason": "<brief explanation>"
    }
  ],
  "summary": "<overall summary of findings>"
}`

    const result = await callGroq(prompt)

    let parsed
    try {
      const clean = result.replace(/```json|```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { flaggedPairs: [], summary: result }
    }

    res.json({ success: true, ...parsed })
  } catch (error) {
    console.error("detectPlagiarism error:", error.message)
    res.status(500).json({ message: "Plagiarism detection failed", error: error.message })
  }
}

// Review code submission
const reviewCode = async (req, res) => {
  try {
    const { code, language, question, testResults } = req.body

    if (!code || !language) {
      return res.status(400).json({ message: "code and language are required" })
    }

    const prompt = `You are a programming instructor reviewing a student's code submission.

Question: ${question || "General code review"}

Language: ${language}

Student Code:
${code}

Test Results: ${testResults ? JSON.stringify(testResults) : "Not available"}

Instructions:
- Review the code for correctness, logic, and style
- Identify any logical errors or inefficiencies
- Give constructive feedback
- Respond ONLY in this exact JSON format with no extra text:
{
  "overallFeedback": "<2-3 sentence overall assessment>",
  "logicalErrors": ["<error 1>", "<error 2>"],
  "improvements": ["<suggestion 1>", "<suggestion 2>"],
  "codeQuality": "<good|average|poor>",
  "timeComplexity": "<if identifiable>",
  "spaceComplexity": "<if identifiable>"
}`

    const result = await callGroq(prompt)

    let parsed
    try {
      const clean = result.replace(/```json|```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { overallFeedback: result, logicalErrors: [], improvements: [], codeQuality: "unknown" }
    }

    res.json({ success: true, ...parsed })
  } catch (error) {
    console.error("reviewCode error:", error.message)
    res.status(500).json({ message: "Code review failed", error: error.message })
  }
}

// Summarise feedback responses
const summariseFeedback = async (req, res) => {
  try {
    const { responses } = req.body

    if (!responses || responses.length === 0) {
      return res.status(400).json({ message: "responses are required" })
    }

    const responsesText = responses.join("\n- ")

    const prompt = `You are analyzing student feedback for a teacher. Summarize these responses.

Student Feedback Responses:
- ${responsesText}

Instructions:
- Identify key themes and patterns
- Note common complaints and positives
- Suggest actionable improvements
- Respond ONLY in this exact JSON format with no extra text:
{
  "keyThemes": ["<theme 1>", "<theme 2>"],
  "commonComplaints": ["<complaint 1>", "<complaint 2>"],
  "positiveHighlights": ["<positive 1>", "<positive 2>"],
  "suggestedActions": ["<action 1>", "<action 2>"],
  "overallSentiment": "<positive|neutral|negative>",
  "summary": "<2-3 sentence overall summary>"
}`

    const result = await callGroq(prompt)

    let parsed
    try {
      const clean = result.replace(/```json|```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { summary: result, keyThemes: [], commonComplaints: [], positiveHighlights: [], suggestedActions: [] }
    }

    res.json({ success: true, ...parsed })
  } catch (error) {
    console.error("summariseFeedback error:", error.message)
    res.status(500).json({ message: "Feedback summarisation failed", error: error.message })
  }
}

// Generate MCQ questions from a topic
const generateQuestions = async (req, res) => {
  try {
    const { topic, subject, count, difficulty } = req.body

    if (!topic || !subject) {
      return res.status(400).json({ message: "topic and subject are required" })
    }

    const prompt = `You are an academic question paper setter. Generate ${count || 5} MCQ questions.

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty || "medium"}

Instructions:
- Generate exactly ${count || 5} multiple choice questions
- Each question must have 4 options
- Mark the correct answer
- Respond ONLY in this exact JSON format with no extra text:
{
  "questions": [
    {
      "text": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctAnswer": "<exact text of correct option>",
      "explanation": "<brief explanation>"
    }
  ]
}`

    const result = await callGroq(prompt)

    let parsed
    try {
      const clean = result.replace(/```json|```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { questions: [] }
    }

    res.json({ success: true, ...parsed })
  } catch (error) {
    console.error("generateQuestions error:", error.message)
    res.status(500).json({ message: "Question generation failed", error: error.message })
  }
}

module.exports = {
  gradeAnswer,
  detectPlagiarism,
  reviewCode,
  summariseFeedback,
  generateQuestions,
}