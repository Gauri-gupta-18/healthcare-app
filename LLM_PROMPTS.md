# LLM Prompts

The backend uses Google Gemini 1.5 Flash for the following AI generations.

## Pre-Visit Summary Prompt
\`\`\`
You are a medical AI assistant. Based on the following patient symptoms, generate a JSON response with:
1. urgency (Low, Medium, High)
2. chief_complaint (A brief summary of the main issue)
3. suggested_questions (An array of 3 specific questions for the doctor to ask the patient)

Symptoms: "{{symptoms}}"

Return ONLY valid JSON in this exact structure:
{
  "urgency": "Medium",
  "chief_complaint": "Description",
  "suggested_questions": ["Q1", "Q2", "Q3"]
}
\`\`\`

## Post-Visit Summary Prompt
\`\`\`
You are a medical AI assistant. Based on the doctor's clinical notes and prescription, generate a patient-friendly summary in JSON format with:
1. explanation (A simple explanation of the consultation and diagnosis)
2. medication_schedule (An array of objects with 'medication', 'dosage', 'timing')
3. follow_up_steps (An array of strings detailing next steps or lifestyle advice)

Clinical Notes: "{{clinicalNotes}}"
Prescription: "{{prescription}}"

Return ONLY valid JSON in this exact structure:
{
  "explanation": "Simple text...",
  "medication_schedule": [{"medication": "Drug", "dosage": "Amount", "timing": "When to take"}],
  "follow_up_steps": ["Step 1", "Step 2"]
}
\`\`\`
