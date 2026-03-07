// ═══════════════════════════════════════════
// FormMate — Mock Form Data
// ═══════════════════════════════════════════

export const MOCK_FORMS = {
  'job-application': {
    title: 'Senior Product Designer — Application',
    description: 'Complete this application to be considered for the Senior Product Designer position at CreativeSync.',
    url: 'https://lever.co/creativesync/senior-product-designer',
    questions: [
      { id: 'q1', text: 'Full Name', type: 'short_text', required: true, options: [] },
      { id: 'q2', text: 'Email Address', type: 'short_text', required: true, options: [] },
      { id: 'q3', text: 'Phone Number', type: 'short_text', required: false, options: [] },
      { id: 'q4', text: 'LinkedIn Profile URL', type: 'short_text', required: false, options: [] },
      { id: 'q5', text: 'Years of design experience', type: 'dropdown', required: true, options: ['1-2 years', '3-5 years', '5-8 years', '8-10 years', '10+ years'] },
      { id: 'q6', text: 'What design tools are you proficient in?', type: 'checkbox', required: true, options: ['Figma', 'Sketch', 'Adobe XD', 'Framer', 'Principle', 'After Effects'] },
      { id: 'q7', text: 'Describe your most impactful design project', type: 'long_text', required: true, options: [] },
      { id: 'q8', text: 'Why are you interested in this role?', type: 'long_text', required: true, options: [] },
      { id: 'q9', text: 'What is your expected salary range?', type: 'radio', required: true, options: ['$80k-100k', '$100k-130k', '$130k-160k', '$160k+'] },
      { id: 'q10', text: 'When can you start?', type: 'date', required: true, options: [] },
      { id: 'q11', text: 'Are you willing to relocate?', type: 'radio', required: false, options: ['Yes', 'No', 'Open to discussion'] },
      { id: 'q12', text: 'On a scale of 1-10, how confident are you in leading a design team?', type: 'scale', required: false, options: [] },
    ]
  },

  'customer-feedback': {
    title: 'Customer Feedback Survey',
    description: 'Help us understand how we can improve our service for you.',
    url: 'https://forms.google.com/feedback-survey',
    questions: [
      { id: 'q1', text: 'What is your primary goal using our product?', type: 'radio', required: true, options: ['Improve workflow efficiency', 'Collaborate with team members', 'Track project progress', 'Automate repetitive tasks'] },
      { id: 'q2', text: 'On a scale of 1-10, how likely are you to recommend us?', type: 'scale', required: true, options: [] },
      { id: 'q3', text: 'What features would you like to see improved?', type: 'checkbox', required: false, options: ['Dashboard', 'Reporting', 'Integrations', 'Mobile App', 'API', 'Customer Support'] },
      { id: 'q4', text: 'Please share any additional feedback', type: 'long_text', required: false, options: [] },
      { id: 'q5', text: 'Your email (for follow-up)', type: 'short_text', required: false, options: [] },
    ]
  },

  'travel-visa': {
    title: 'Travel Visa Application Form',
    description: 'Complete this application for your travel visa. All fields marked with * are required.',
    url: 'https://gov.travel/visa-application',
    questions: [
      { id: 'q1', text: 'Passport Number', type: 'short_text', required: true, options: [] },
      { id: 'q2', text: 'Full Legal Name (as it appears on passport)', type: 'short_text', required: true, options: [] },
      { id: 'q3', text: 'Date of Birth', type: 'date', required: true, options: [] },
      { id: 'q4', text: 'Nationality', type: 'short_text', required: true, options: [] },
      { id: 'q5', text: 'Purpose of Travel', type: 'radio', required: true, options: ['Tourism', 'Business', 'Education', 'Medical', 'Transit', 'Other'] },
      { id: 'q6', text: 'Duration of Stay', type: 'dropdown', required: true, options: ['Less than 1 week', '1-2 weeks', '2-4 weeks', '1-3 months', '3-6 months', '6+ months'] },
      { id: 'q7', text: 'Accommodation Address', type: 'long_text', required: true, options: [] },
      { id: 'q8', text: 'Have you previously been denied a visa?', type: 'radio', required: true, options: ['Yes', 'No'] },
      { id: 'q9', text: 'If yes, please provide details', type: 'long_text', required: false, options: [] },
      { id: 'q10', text: 'Travel Insurance Policy Number', type: 'short_text', required: false, options: [] },
    ]
  }
};

export const MOCK_AI_ANSWERS = {
  'job-application': {
    'q1': { text: 'Alexander James Johnson', source: 'ai', confidence: 0.95 },
    'q2': { text: 'alex.johnson@email.com', source: 'ai', confidence: 0.92 },
    'q3': { text: '+1 (555) 000-1234', source: 'ai', confidence: 0.88 },
    'q4': { text: 'https://linkedin.com/in/alexjohnson-design', source: 'ai', confidence: 0.85 },
    'q5': { text: '5-8 years', source: 'ai', confidence: 0.90 },
    'q6': { text: 'Figma, Sketch, Framer', source: 'ai', confidence: 0.87 },
    'q7': { text: 'Led the redesign of our enterprise dashboard serving 50K+ daily users. Reduced task completion time by 40% through iterative user research, design system implementation, and close collaboration with engineering. The project resulted in a 25% increase in user satisfaction scores and was featured as a case study at Config 2024.', source: 'ai', confidence: 0.91 },
    'q8': { text: 'CreativeSync\'s mission to democratize design tools resonates deeply with my professional philosophy. I\'m excited about the opportunity to shape product experiences at scale, working with a team that values user-centric design. Your recent expansion into AI-assisted workflows aligns perfectly with my expertise in designing intelligent interfaces.', source: 'ai', confidence: 0.89 },
    'q9': { text: '$130k-160k', source: 'ai', confidence: 0.75 },
    'q10': { text: '2026-04-15', source: 'ai', confidence: 0.80 },
    'q11': { text: 'Open to discussion', source: 'ai', confidence: 0.82 },
    'q12': { text: '8', source: 'ai', confidence: 0.85 },
  },
  'customer-feedback': {
    'q1': { text: 'Improve workflow efficiency', source: 'ai', confidence: 0.88 },
    'q2': { text: '8', source: 'ai', confidence: 0.82 },
    'q3': { text: 'Dashboard, Integrations, API', source: 'ai', confidence: 0.78 },
    'q4': { text: 'Overall, the product has significantly streamlined our team\'s workflow. The real-time collaboration features are excellent. I\'d love to see deeper integration with tools like Notion and Linear, and a more customizable dashboard layout. The API documentation could also be more comprehensive with more code examples.', source: 'ai', confidence: 0.85 },
    'q5': { text: 'alex.j@formmate.ai', source: 'ai', confidence: 0.90 },
  },
  'travel-visa': {
    'q1': { text: 'N23456789', source: 'ai', confidence: 0.70 },
    'q2': { text: 'Alexander James Johnson', source: 'ai', confidence: 0.95 },
    'q3': { text: '1992-06-15', source: 'ai', confidence: 0.80 },
    'q4': { text: 'United States', source: 'ai', confidence: 0.90 },
    'q5': { text: 'Tourism', source: 'ai', confidence: 0.85 },
    'q6': { text: '1-2 weeks', source: 'ai', confidence: 0.82 },
    'q7': { text: 'Hotel Grand Lisboa\n123 Avenida de Lisboa\nMacau SAR\nRoom reservation confirmed for March 20-April 3, 2026', source: 'ai', confidence: 0.78 },
    'q8': { text: 'No', source: 'ai', confidence: 0.95 },
    'q9': { text: '', source: 'empty', confidence: 0 },
    'q10': { text: 'TI-20260315-AJ4521', source: 'ai', confidence: 0.72 },
  }
};

// Simple AI response simulator for chat
export const MOCK_CHAT_RESPONSES = [
  { trigger: 'shorten', response: 'I\'ve shortened the response to be more concise while keeping the key points. The word count was reduced by about 40%.' },
  { trigger: 'expand', response: 'I\'ve expanded the answer with more specific details and examples to make it more compelling.' },
  { trigger: 'professional', response: 'I\'ve rewritten the response in a more formal, professional tone suitable for corporate applications.' },
  { trigger: 'casual', response: 'Done! I\'ve made the tone more conversational and approachable.' },
  { trigger: 'bullet', response: 'I\'ve restructured the answer into clear bullet points for better readability.' },
  { trigger: 'default', response: 'I\'ve updated the response based on your instructions. Feel free to review and let me know if you\'d like further adjustments!' },
];
